import { Types } from 'mongoose';
import HomeworkSubmission, { HomeworkSubmissionDocument } from '../models/HomeworkSubmission';
import Homework from '../models/Homework';
import { fileService } from './fileService';
import { NotFoundError, ValidationError, BadRequestError } from '../utils/errors';
import { SubmissionAnswer } from '../../../shared/types';

/**
 * Service for managing homework submissions
 */
export class HomeworkSubmissionService {
  /**
   * Submit homework answers
   * @param homeworkId Homework ID
   * @param studentId Student ID
   * @param answers Array of answers
   * @param isOffline Whether the submission was made offline
   * @param originalSubmissionTime Original submission time for offline submissions
   */
  async submitHomework(
    homeworkId: string,
    studentId: string,
    answers: SubmissionAnswer[],
    isOffline: boolean = false,
    originalSubmissionTime?: Date
  ): Promise<HomeworkSubmissionDocument> {
    try {
      // Validate homework exists
      const homework = await Homework.findById(homeworkId);
      if (!homework) {
        throw new NotFoundError('Homework not found');
      }

      // Check if student is assigned to this homework
      if (!homework.studentIds.includes(new Types.ObjectId(studentId))) {
        throw new ValidationError('Student is not assigned to this homework');
      }

      // Check if homework is in a submittable state
      if (homework.status !== 'sent' && homework.status !== 'completed') {
        throw new ValidationError('Homework is not available for submission');
      }

      // Check if answers match the questions
      this.validateAnswers(answers, homework.content.questions);

      // Check if submission already exists
      let submission = await HomeworkSubmission.findOne({
        homeworkId,
        studentId
      });

      if (submission) {
        // Update existing submission
        submission.answers = answers;
        submission.submissionAttempts += 1;
        submission.lastModifiedAt = new Date();
        
        // Handle offline submission
        if (isOffline && originalSubmissionTime) {
          submission.offlineSubmission = {
            isOffline: true,
            syncedAt: new Date(),
            originalSubmissionTime
          };
          submission.submittedAt = originalSubmissionTime;
        } else {
          submission.submittedAt = new Date();
        }
        
        await submission.save();
      } else {
        // Create new submission
        const submissionData: any = {
          homeworkId,
          studentId,
          answers,
          status: 'submitted'
        };
        
        // Handle offline submission
        if (isOffline && originalSubmissionTime) {
          submissionData.offlineSubmission = {
            isOffline: true,
            syncedAt: new Date(),
            originalSubmissionTime
          };
          submissionData.submittedAt = originalSubmissionTime;
        }
        
        submission = await HomeworkSubmission.create(submissionData);
      }

      return submission;
    } catch (error) {
      console.error('Error submitting homework:', error);
      throw error;
    }
  }

  /**
   * Validate that answers match the questions
   */
  private validateAnswers(answers: SubmissionAnswer[], questions: any[]): void {
    // Check if all required questions are answered
    const questionIds = questions.map(q => q.id);
    const answerIds = answers.map(a => a.questionId);
    
    // Check for missing answers
    const missingAnswers = questionIds.filter(id => !answerIds.includes(id));
    if (missingAnswers.length > 0) {
      throw new ValidationError(`Missing answers for questions: ${missingAnswers.join(', ')}`);
    }
    
    // Check for extra answers
    const extraAnswers = answerIds.filter(id => !questionIds.includes(id));
    if (extraAnswers.length > 0) {
      throw new ValidationError(`Answers provided for non-existent questions: ${extraAnswers.join(', ')}`);
    }
    
    // Check answer types match question types
    for (const answer of answers) {
      const question = questions.find(q => q.id === answer.questionId);
      
      if (!question) {
        continue; // Already checked above
      }
      
      // Validate answer type matches question type
      if (
        (question.type === 'audio_recording' && answer.type !== 'audio') ||
        (question.type === 'text_input' && answer.type !== 'text') ||
        (question.type === 'multiple_choice' && answer.type !== 'choice')
      ) {
        throw new ValidationError(`Answer type '${answer.type}' does not match question type '${question.type}' for question ${question.id}`);
      }
      
      // Validate multiple choice answers
      if (question.type === 'multiple_choice' && question.options) {
        const answerContent = answer.content as string;
        if (!question.options.includes(answerContent)) {
          throw new ValidationError(`Invalid choice '${answerContent}' for question ${question.id}. Valid options are: ${question.options.join(', ')}`);
        }
      }
    }
  }

  /**
   * Get submission by ID
   */
  async getSubmissionById(id: string): Promise<HomeworkSubmissionDocument> {
    try {
      const submission = await HomeworkSubmission.findById(id);
      if (!submission) {
        throw new NotFoundError('Submission not found');
      }
      return submission;
    } catch (error) {
      console.error('Error getting submission:', error);
      throw error;
    }
  }

  /**
   * Get submissions by homework ID
   */
  async getSubmissionsByHomeworkId(homeworkId: string): Promise<HomeworkSubmissionDocument[]> {
    try {
      return await HomeworkSubmission.find({ homeworkId }).sort({ submittedAt: -1 });
    } catch (error) {
      console.error('Error getting submissions by homework ID:', error);
      throw error;
    }
  }

  /**
   * Get submissions by student ID
   */
  async getSubmissionsByStudentId(studentId: string): Promise<HomeworkSubmissionDocument[]> {
    try {
      return await HomeworkSubmission.find({ studentId }).sort({ submittedAt: -1 });
    } catch (error) {
      console.error('Error getting submissions by student ID:', error);
      throw error;
    }
  }

  /**
   * Update submission status
   */
  async updateSubmissionStatus(id: string, status: 'submitted' | 'ai_evaluated' | 'reviewed' | 'completed'): Promise<HomeworkSubmissionDocument> {
    try {
      const submission = await HomeworkSubmission.findById(id);
      if (!submission) {
        throw new NotFoundError('Submission not found');
      }
      
      submission.status = status;
      await submission.save();
      
      return submission;
    } catch (error) {
      console.error('Error updating submission status:', error);
      throw error;
    }
  }

  /**
   * Process audio submission
   * This method handles audio file processing for submissions
   */
  async processAudioSubmission(
    audioFile: Express.Multer.File,
    questionId: string,
    metadata: { recordingDuration?: number }
  ): Promise<SubmissionAnswer> {
    try {
      // Upload file to S3
      const fileResult = await fileService.uploadFile(audioFile, {
        folder: 'homework-submissions',
        allowedTypes: ['audio/mp3', 'audio/wav', 'audio/mpeg', 'audio/webm'],
        maxSize: 20 * 1024 * 1024 // 20MB
      });
      
      // Create submission answer
      const answer: SubmissionAnswer = {
        questionId,
        type: 'audio',
        content: fileResult,
        metadata: {
          recordingDuration: metadata.recordingDuration || 0,
          submittedAt: new Date().toISOString()
        }
      };
      
      return answer;
    } catch (error) {
      console.error('Error processing audio submission:', error);
      throw error;
    }
  }

  /**
   * Process text submission
   */
  async processTextSubmission(
    text: string,
    questionId: string
  ): Promise<SubmissionAnswer> {
    try {
      // Validate text
      if (!text || text.trim().length === 0) {
        throw new ValidationError('Text submission cannot be empty');
      }
      
      // Create submission answer
      const answer: SubmissionAnswer = {
        questionId,
        type: 'text',
        content: text,
        metadata: {
          wordCount: text.split(/\s+/).filter(Boolean).length,
          submittedAt: new Date().toISOString()
        }
      };
      
      return answer;
    } catch (error) {
      console.error('Error processing text submission:', error);
      throw error;
    }
  }

  /**
   * Process image submission with OCR
   * This method handles image uploads and extracts text using OCR
   */
  async processImageSubmission(
    imageFile: Express.Multer.File,
    questionId: string
  ): Promise<SubmissionAnswer> {
    try {
      // Upload file to S3
      const fileResult = await fileService.uploadFile(imageFile, {
        folder: 'homework-submissions',
        allowedTypes: ['image/jpeg', 'image/png', 'image/webp'],
        maxSize: 10 * 1024 * 1024 // 10MB
      });
      
      // TODO: Implement OCR processing
      // For now, we'll just store the image reference
      
      // Create submission answer
      const answer: SubmissionAnswer = {
        questionId,
        type: 'text', // We'll treat OCR results as text
        content: fileResult,
        metadata: {
          submittedAt: new Date().toISOString()
        }
      };
      
      return answer;
    } catch (error) {
      console.error('Error processing image submission:', error);
      throw error;
    }
  }

  /**
   * Get submission status and deadline information
   */
  async getSubmissionStatus(homeworkId: string, studentId: string): Promise<{
    isSubmitted: boolean;
    submission?: HomeworkSubmissionDocument;
    homework?: any;
    dueDate?: Date;
    isLate?: boolean;
    timeRemaining?: number; // in milliseconds
  }> {
    try {
      // Get homework
      const homework = await Homework.findById(homeworkId);
      if (!homework) {
        throw new NotFoundError('Homework not found');
      }
      
      // Get submission if exists
      const submission = await HomeworkSubmission.findOne({
        homeworkId,
        studentId
      });
      
      // Calculate deadline information
      const dueDate = new Date(homework.dueDate);
      const now = new Date();
      const isLate = now > dueDate;
      const timeRemaining = isLate ? 0 : dueDate.getTime() - now.getTime();
      
      return {
        isSubmitted: !!submission,
        submission,
        homework,
        dueDate,
        isLate,
        timeRemaining
      };
    } catch (error) {
      console.error('Error getting submission status:', error);
      throw error;
    }
  }

  /**
   * Sync offline submissions
   * This method handles syncing submissions that were created offline
   */
  async syncOfflineSubmissions(submissions: any[]): Promise<{
    synced: HomeworkSubmissionDocument[];
    failed: any[];
  }> {
    const synced: HomeworkSubmissionDocument[] = [];
    const failed: any[] = [];
    
    for (const submission of submissions) {
      try {
        const { homeworkId, studentId, answers, submittedAt } = submission;
        
        if (!homeworkId || !studentId || !answers || !submittedAt) {
          failed.push({
            submission,
            error: 'Missing required fields'
          });
          continue;
        }
        
        const result = await this.submitHomework(
          homeworkId,
          studentId,
          answers,
          true,
          new Date(submittedAt)
        );
        
        synced.push(result);
      } catch (error) {
        failed.push({
          submission,
          error: error.message || 'Unknown error'
        });
      }
    }
    
    return { synced, failed };
  }
}

export const homeworkSubmissionService = new HomeworkSubmissionService();