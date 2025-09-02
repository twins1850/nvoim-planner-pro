import { ObjectId } from 'mongodb';
import Feedback, { AssessmentCriteria, FeedbackAttachment, FeedbackDocument } from '../models/Feedback';
import HomeworkSubmission from '../models/HomeworkSubmission';
import { NotFoundError, ValidationError } from '../utils/errors';
import { openaiService } from './openaiService';
import { azureSpeechService } from './azureSpeechService';
import { fileService } from './fileService';
import * as notificationService from './notificationService';

interface AIEvaluationResult {
  overallScore: number;
  strengths: string[];
  improvementAreas: string[];
  detailedFeedback: string;
  assessmentCriteria: AssessmentCriteria[];
}

interface PlannerFeedbackInput {
  overallScore: number;
  comments: string;
  attachments: FeedbackAttachment[];
  assessmentCriteria: AssessmentCriteria[];
}

interface FeedbackAnalytics {
  averageScore: number;
  feedbackCount: number;
  criteriaAverages: {
    criteriaId: string;
    name: string;
    averageScore: number;
  }[];
  improvementTrend: {
    date: Date;
    score: number;
  }[];
}

class FeedbackService {
  /**
   * Generate AI evaluation for a homework submission
   */
  async generateAIEvaluation(submissionId: string): Promise<FeedbackDocument> {
    const submission = await HomeworkSubmission.findById(submissionId)
      .populate('homeworkId')
      .populate('studentId');
    
    if (!submission) {
      throw new NotFoundError('Homework submission not found');
    }
    
    if (submission.status !== 'submitted') {
      throw new ValidationError('Submission is not in the correct state for evaluation');
    }
    
    // Check if feedback already exists
    const existingFeedback = await Feedback.findOne({ submissionId: submission._id });
    if (existingFeedback) {
      return existingFeedback;
    }
    
    // Process different types of submissions
    const evaluationResults: AIEvaluationResult = {
      overallScore: 0,
      strengths: [],
      improvementAreas: [],
      detailedFeedback: '',
      assessmentCriteria: []
    };
    
    // Process each answer in the submission
    for (const answer of submission.answers) {
      if (answer.type === 'audio') {
        // Process audio submission with Azure Speech Service
        const fileUrl = typeof answer.content === 'string' ? answer.content : answer.content.toString();
        const audioBuffer = await fileService.getFileBuffer(fileUrl);
        
        // Get reference text from the homework question if available
        const homework = submission.homeworkId as any;
        const question = homework.content.questions.find(q => q.id === answer.questionId);
        const referenceText = question?.targetAnswer || '';
        
        if (referenceText) {
          const pronunciationAssessment = await azureSpeechService.pronunciationAssessment(audioBuffer, referenceText);
          
          // Add pronunciation criteria
          evaluationResults.assessmentCriteria.push({
            criteriaId: 'pronunciation',
            name: 'Pronunciation Accuracy',
            score: Math.round(pronunciationAssessment.pronunciationScore * 5 / 100), // Convert to 0-5 scale
            maxScore: 5,
            comments: this.generatePronunciationFeedback(pronunciationAssessment)
          });
        }
      } else if (answer.type === 'text') {
        // Process text submission with OpenAI
        const textContent = answer.content as string;
        const writingEvaluation = await openaiService.evaluateWriting(textContent);
        
        // Add grammar and vocabulary criteria
        evaluationResults.assessmentCriteria.push({
          criteriaId: 'grammar',
          name: 'Grammar Accuracy',
          score: writingEvaluation.grammarScore,
          maxScore: 5,
          comments: writingEvaluation.grammarFeedback
        });
        
        evaluationResults.assessmentCriteria.push({
          criteriaId: 'vocabulary',
          name: 'Vocabulary Usage',
          score: writingEvaluation.vocabularyScore,
          maxScore: 5,
          comments: writingEvaluation.vocabularyFeedback
        });
      }
    }
    
    // Generate overall evaluation using OpenAI
    const submissionData = {
      studentName: (submission.studentId as any).profile.name,
      homeworkTitle: (submission.homeworkId as any).title,
      answers: submission.answers.map(a => ({
        questionId: a.questionId,
        type: a.type,
        content: a.type === 'text' ? a.content : 'Audio submission'
      })),
      criteria: evaluationResults.assessmentCriteria
    };
    
    const overallEvaluation = await openaiService.generateFeedback(submissionData);
    
    // Update evaluation results with overall feedback
    evaluationResults.overallScore = Math.round(
      evaluationResults.assessmentCriteria.reduce((sum, c) => sum + c.score, 0) / 
      evaluationResults.assessmentCriteria.length
    );
    evaluationResults.strengths = overallEvaluation.strengths;
    evaluationResults.improvementAreas = overallEvaluation.improvementAreas;
    evaluationResults.detailedFeedback = overallEvaluation.detailedFeedback;
    
    // Create feedback document
    const feedback = await Feedback.create({
      submissionId: submission._id,
      studentId: submission.studentId,
      plannerId: (submission.homeworkId as any).plannerId,
      homeworkId: submission.homeworkId,
      aiEvaluation: {
        overallScore: evaluationResults.overallScore,
        strengths: evaluationResults.strengths,
        improvementAreas: evaluationResults.improvementAreas,
        detailedFeedback: evaluationResults.detailedFeedback,
        assessmentCriteria: evaluationResults.assessmentCriteria,
        generatedAt: new Date()
      },
      status: 'ai_generated'
    });
    
    // Update submission status
    submission.status = 'ai_evaluated';
    await submission.save();
    
    return feedback;
  }
  
  /**
   * Add planner feedback to an existing AI evaluation
   */
  async addPlannerFeedback(feedbackId: string, plannerFeedback: PlannerFeedbackInput): Promise<FeedbackDocument> {
    const feedback = await Feedback.findById(feedbackId);
    
    if (!feedback) {
      throw new NotFoundError('Feedback not found');
    }
    
    if (feedback.status !== 'ai_generated') {
      throw new ValidationError('Feedback has already been reviewed by planner');
    }
    
    // Update with planner feedback
    feedback.plannerFeedback = {
      overallScore: plannerFeedback.overallScore,
      comments: plannerFeedback.comments,
      attachments: plannerFeedback.attachments,
      assessmentCriteria: plannerFeedback.assessmentCriteria,
      providedAt: new Date()
    };
    
    feedback.status = 'planner_reviewed';
    await feedback.save();
    
    // Update the submission status
    await HomeworkSubmission.findByIdAndUpdate(feedback.submissionId, {
      status: 'reviewed',
      plannerFeedback: {
        overallScore: plannerFeedback.overallScore,
        comments: plannerFeedback.comments
      }
    });
    
    return feedback;
  }
  
  /**
   * Send feedback to student
   */
  async sendFeedbackToStudent(feedbackId: string): Promise<FeedbackDocument> {
    const feedback = await Feedback.findById(feedbackId);
    
    if (!feedback) {
      throw new NotFoundError('Feedback not found');
    }
    
    if (feedback.status !== 'planner_reviewed') {
      throw new ValidationError('Feedback must be reviewed by planner before sending to student');
    }
    
    feedback.status = 'sent_to_student';
    await feedback.save();
    
    // Update the submission status
    const submission = await HomeworkSubmission.findByIdAndUpdate(
      feedback.submissionId, 
      { status: 'completed' },
      { new: true }
    ).populate('homeworkId', 'title');
    
    // Send notification to student
    try {
      if (submission) {
        const homeworkTitle = (submission.homeworkId as any)?.title || 'Homework';
        
        await notificationService.createNotification(
          feedback.studentId.toString(),
          'feedback_available',
          {
            feedbackId: feedback._id.toString(),
            homeworkId: feedback.homeworkId.toString(),
            homeworkTitle: homeworkTitle,
            score: feedback.plannerFeedback.overallScore
          }
        );
        
        console.log(`Feedback notification sent to student ${feedback.studentId}`);
      }
    } catch (notificationError) {
      console.error('Failed to send feedback notification:', notificationError);
    }
    
    return feedback;
  }
  
  /**
   * Mark feedback as viewed by student
   */
  async markFeedbackAsViewed(feedbackId: string): Promise<FeedbackDocument> {
    const feedback = await Feedback.findById(feedbackId);
    
    if (!feedback) {
      throw new NotFoundError('Feedback not found');
    }
    
    feedback.studentViewed = true;
    feedback.studentViewedAt = new Date();
    await feedback.save();
    
    return feedback;
  }
  
  /**
   * Get feedback by ID
   */
  async getFeedbackById(feedbackId: string): Promise<FeedbackDocument> {
    const feedback = await Feedback.findById(feedbackId)
      .populate('submissionId')
      .populate('studentId', 'profile.name')
      .populate('plannerId', 'profile.name')
      .populate('homeworkId', 'title');
    
    if (!feedback) {
      throw new NotFoundError('Feedback not found');
    }
    
    return feedback;
  }
  
  /**
   * Get all feedback for a student
   */
  async getStudentFeedback(studentId: string): Promise<FeedbackDocument[]> {
    return Feedback.find({ studentId, status: 'sent_to_student' })
      .sort({ createdAt: -1 })
      .populate('homeworkId', 'title')
      .populate('plannerId', 'profile.name');
  }
  
  /**
   * Get all feedback created by a planner
   */
  async getPlannerFeedback(plannerId: string): Promise<FeedbackDocument[]> {
    return Feedback.find({ plannerId })
      .sort({ createdAt: -1 })
      .populate('studentId', 'profile.name')
      .populate('homeworkId', 'title');
  }
  
  /**
   * Get feedback pending planner review
   */
  async getPendingFeedback(plannerId: string): Promise<FeedbackDocument[]> {
    return Feedback.find({ plannerId, status: 'ai_generated' })
      .sort({ createdAt: -1 })
      .populate('studentId', 'profile.name')
      .populate('homeworkId', 'title')
      .populate('submissionId');
  }
  
  /**
   * Get feedback analytics for a student
   */
  async getStudentFeedbackAnalytics(studentId: string): Promise<FeedbackAnalytics> {
    const feedbacks = await Feedback.find({ 
      studentId, 
      status: 'sent_to_student',
      'plannerFeedback.overallScore': { $exists: true }
    }).sort({ createdAt: 1 });
    
    if (feedbacks.length === 0) {
      return {
        averageScore: 0,
        feedbackCount: 0,
        criteriaAverages: [],
        improvementTrend: []
      };
    }
    
    // Calculate average score
    const totalScore = feedbacks.reduce((sum, feedback) => sum + feedback.plannerFeedback.overallScore, 0);
    const averageScore = totalScore / feedbacks.length;
    
    // Calculate criteria averages
    const criteriaMap = new Map<string, { total: number, count: number, name: string }>();
    
    feedbacks.forEach(feedback => {
      feedback.plannerFeedback.assessmentCriteria.forEach(criteria => {
        const existing = criteriaMap.get(criteria.criteriaId);
        if (existing) {
          existing.total += criteria.score;
          existing.count += 1;
        } else {
          criteriaMap.set(criteria.criteriaId, {
            total: criteria.score,
            count: 1,
            name: criteria.name
          });
        }
      });
    });
    
    const criteriaAverages = Array.from(criteriaMap.entries()).map(([criteriaId, data]) => ({
      criteriaId,
      name: data.name,
      averageScore: data.total / data.count
    }));
    
    // Calculate improvement trend
    const improvementTrend = feedbacks.map(feedback => ({
      date: feedback.createdAt,
      score: feedback.plannerFeedback.overallScore
    }));
    
    return {
      averageScore,
      feedbackCount: feedbacks.length,
      criteriaAverages,
      improvementTrend
    };
  }
  
  /**
   * Helper method to generate pronunciation feedback
   */
  private generatePronunciationFeedback(assessment: any): string {
    const { pronunciationScore, completenessScore, fluencyScore, prosodyScore } = assessment;
    
    let feedback = `Overall pronunciation score: ${pronunciationScore}/100. `;
    
    if (pronunciationScore < 60) {
      feedback += 'Your pronunciation needs significant improvement. Focus on the sounds marked as incorrect. ';
    } else if (pronunciationScore < 80) {
      feedback += 'Your pronunciation is developing well but needs more practice on specific sounds. ';
    } else {
      feedback += 'Your pronunciation is very good! Continue practicing to maintain this level. ';
    }
    
    feedback += `Completeness: ${completenessScore}/100. `;
    feedback += `Fluency: ${fluencyScore}/100. `;
    feedback += `Prosody: ${prosodyScore}/100.`;
    
    return feedback;
  }
}

export const feedbackService = new FeedbackService();