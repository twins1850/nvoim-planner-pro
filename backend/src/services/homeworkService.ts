import { Types } from 'mongoose';
import Homework, { HomeworkDocument } from '../models/Homework';
import Lesson from '../models/Lesson';
import { Homework as HomeworkType, HomeworkContent } from '../../../shared/types';
import { openaiService } from './openaiService';
import { NotFoundError, ValidationError } from '../utils/errors';
import { scheduleCronJob, cancelCronJob } from '../config/cron';
import * as notificationService from './notificationService';
import { SocketService } from './socketService';
import { HomeworkEventData } from '../types/socket';
import { performanceOptimizationService } from './performanceOptimizationService';

/**
 * Service for managing homework
 */
export class HomeworkService {
  /**
   * Create a new homework assignment
   */
  async createHomework(homeworkData: Partial<HomeworkType>): Promise<HomeworkDocument> {
    try {
      const homework = new Homework(homeworkData);
      
      // If scheduled, set up the cron job
      if (homework.scheduledSendTime && homework.status === 'scheduled') {
        await this.scheduleHomeworkDelivery(homework);
      }
      
      const savedHomework = await homework.save();

      // Socket.io 이벤트 전송 - 숙제 배정
      if (savedHomework.studentIds && savedHomework.studentIds.length > 0) {
        const eventData: HomeworkEventData = {
          homeworkId: savedHomework._id.toString(),
          plannerId: savedHomework.plannerId.toString(),
          action: 'assigned',
          timestamp: new Date(),
          data: {
            studentIds: savedHomework.studentIds.map(id => id.toString()),
            dueDate: savedHomework.dueDate
          }
        };
        
        // Redis Pub/Sub를 통해 멀티 서버 동기화
        try {
          const { RedisPubSubService } = await import('./redisPubSubService');
          if (RedisPubSubService.isReady()) {
            await RedisPubSubService.publishHomeworkEvent(eventData);
          } else {
            // Redis가 비활성화된 경우 직접 Socket.io 이벤트 전송
            SocketService.emitHomeworkEvent(eventData);
          }
        } catch (error) {
          // Redis 실패 시 백업으로 직접 Socket.io 이벤트 전송
          SocketService.emitHomeworkEvent(eventData);
        }
      }
      
      return savedHomework;
    } catch (error) {
      console.error('Error creating homework:', error);
      throw error;
    }
  }

  /**
   * Get homework by ID (성능 최적화)
   */
  async getHomeworkById(id: string): Promise<HomeworkDocument> {
    try {
      const homework = await performanceOptimizationService.optimizedQuery(
        `homework:${id}`,
        async () => {
          return Homework.findById(id)
            .populate('plannerId', 'profile.name email')
            .populate('studentIds', 'profile.name email profile.preferences')
            .lean()
            .exec();
        },
        300000 // 5분 캐시
      );
      
      if (!homework) {
        throw new NotFoundError('Homework not found');
      }
      return homework as HomeworkDocument;
    } catch (error) {
      console.error('Error getting homework:', error);
      throw error;
    }
  }

  /**
   * 성능 최적화된 플래너별 숙제 목록 조회
   */
  async getHomeworksByPlannerOptimized(
    plannerId: string,
    page: number = 1,
    limit: number = 10,
    status?: string
  ): Promise<{
    data: HomeworkDocument[];
    totalCount: number;
    totalPages: number;
    currentPage: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  }> {
    const query: any = { plannerId };
    
    if (status) {
      query.status = status;
    }

    return performanceOptimizationService.optimizedPagination(
      Homework,
      query,
      {
        page,
        limit,
        sort: { createdAt: -1, dueDate: 1 },
        populate: ['studentIds'],
        select: 'title description type status dueDate studentIds isPersonalized'
      },
      `homework:planner:${plannerId}:${status || 'all'}`
    );
  }

  /**
   * 성능 최적화된 학생별 숙제 목록 조회
   */
  async getHomeworksByStudentOptimized(
    studentId: string,
    page: number = 1,
    limit: number = 10,
    status?: string
  ): Promise<{
    data: HomeworkDocument[];
    totalCount: number;
    totalPages: number;
    currentPage: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  }> {
    const query: any = { studentIds: { $in: [studentId] } };
    
    if (status) {
      query.status = status;
    }

    return performanceOptimizationService.optimizedPagination(
      Homework,
      query,
      {
        page,
        limit,
        sort: { dueDate: 1, createdAt: -1 },
        populate: ['plannerId'],
        select: 'title description type status dueDate plannerId isPersonalized'
      },
      `homework:student:${studentId}:${status || 'all'}`
    );
  }

  /**
   * 성능 최적화된 숙제 통계 조회
   */
  async getHomeworkStatsOptimized(plannerId: string): Promise<{
    totalHomework: number;
    sentHomework: number;
    completedHomework: number;
    statusBreakdown: Record<string, number>;
    overdueHomework: number;
  }> {
    const cacheKey = `homework:stats:${plannerId}`;
    
    return performanceOptimizationService.optimizedQuery(
      cacheKey,
      async () => {
        const now = new Date();
        
        const pipeline = [
          {
            $match: {
              plannerId: new Types.ObjectId(plannerId)
            }
          },
          {
            $group: {
              _id: null,
              totalHomework: { $sum: 1 },
              sentHomework: {
                $sum: {
                  $cond: [{ $in: ['$status', ['sent', 'completed']] }, 1, 0]
                }
              },
              completedHomework: {
                $sum: {
                  $cond: [{ $eq: ['$status', 'completed'] }, 1, 0]
                }
              },
              statusBreakdown: {
                $push: '$status'
              },
              overdueHomework: {
                $sum: {
                  $cond: [
                    {
                      $and: [
                        { $ne: ['$status', 'completed'] },
                        { $lt: ['$dueDate', now] }
                      ]
                    },
                    1,
                    0
                  ]
                }
              }
            }
          }
        ];

        const [result] = await performanceOptimizationService.optimizedAggregate(
          Homework,
          pipeline,
          cacheKey,
          600000 // 10분 캐시
        );

        if (!result) {
          return {
            totalHomework: 0,
            sentHomework: 0,
            completedHomework: 0,
            statusBreakdown: {},
            overdueHomework: 0
          };
        }

        // 상태별 개수 계산
        const statusBreakdown: Record<string, number> = {};
        (result.statusBreakdown || []).forEach((status: string) => {
          statusBreakdown[status] = (statusBreakdown[status] || 0) + 1;
        });

        return {
          totalHomework: result.totalHomework || 0,
          sentHomework: result.sentHomework || 0,
          completedHomework: result.completedHomework || 0,
          statusBreakdown,
          overdueHomework: result.overdueHomework || 0
        };
      },
      600000 // 10분 캐시
    );
  }

  /**
   * Get all homework for a planner
   */
  async getHomeworkByPlannerId(plannerId: string, filters: any = {}): Promise<HomeworkDocument[]> {
    try {
      const query = { plannerId, ...filters };
      return await Homework.find(query).sort({ createdAt: -1 });
    } catch (error) {
      console.error('Error getting homework by planner ID:', error);
      throw error;
    }
  }

  /**
   * Get all homework for a student
   */
  async getHomeworkByStudentId(studentId: string, filters: any = {}): Promise<HomeworkDocument[]> {
    try {
      const query = { 
        studentIds: studentId,
        status: { $in: ['sent', 'completed'] },
        ...filters
      };
      return await Homework.find(query).sort({ dueDate: 1 });
    } catch (error) {
      console.error('Error getting homework by student ID:', error);
      throw error;
    }
  }

  /**
   * Update homework
   */
  async updateHomework(id: string, updates: Partial<HomeworkType>): Promise<HomeworkDocument> {
    try {
      const homework = await Homework.findById(id);
      if (!homework) {
        throw new NotFoundError('Homework not found');
      }

      // If scheduled time is updated, update the cron job
      if (updates.scheduledSendTime && updates.scheduledSendTime !== homework.scheduledSendTime?.toISOString()) {
        // Cancel existing job if any
        if (homework.scheduledSendTime) {
          await cancelCronJob(`homework-${homework._id}`);
        }
        
        // Schedule new job if status is scheduled
        if (updates.status === 'scheduled' || (homework.status === 'scheduled' && updates.status === undefined)) {
          const updatedHomework = { ...homework.toObject(), ...updates };
          await this.scheduleHomeworkDelivery(updatedHomework as HomeworkDocument);
        }
      }

      // Update the homework
      Object.assign(homework, updates);
      return await homework.save();
    } catch (error) {
      console.error('Error updating homework:', error);
      throw error;
    }
  }

  /**
   * Delete homework
   */
  async deleteHomework(id: string): Promise<void> {
    try {
      const homework = await Homework.findById(id);
      if (!homework) {
        throw new NotFoundError('Homework not found');
      }

      // Cancel scheduled job if any
      if (homework.scheduledSendTime && homework.status === 'scheduled') {
        await cancelCronJob(`homework-${homework._id}`);
      }

      await Homework.deleteOne({ _id: id });
    } catch (error) {
      console.error('Error deleting homework:', error);
      throw error;
    }
  }

  /**
   * Schedule homework delivery using node-cron
   */
  async scheduleHomeworkDelivery(homework: HomeworkDocument): Promise<void> {
    try {
      if (!homework.scheduledSendTime) {
        throw new ValidationError('Scheduled send time is required');
      }

      const scheduledTime = new Date(homework.scheduledSendTime);
      
      // Schedule the job
      await scheduleCronJob(
        `homework-${homework._id}`,
        scheduledTime,
        async () => {
          // Update status to sent
          const updatedHomework = await Homework.findByIdAndUpdate(
            homework._id, 
            { status: 'sent' },
            { new: true }
          ).populate('studentIds', 'profile');
          
          if (updatedHomework) {
            // Send notifications to all assigned students
            for (const studentId of updatedHomework.studentIds) {
              try {
                // Create notification for homework assignment
                await notificationService.createNotification(
                  studentId.toString(),
                  'homework_assigned',
                  {
                    homeworkId: updatedHomework._id.toString(),
                    homeworkTitle: updatedHomework.title,
                    dueDate: new Date(updatedHomework.dueDate).toLocaleDateString()
                  }
                );
                
                // Schedule reminder notifications for the homework deadline
                await notificationService.scheduleHomeworkReminder(
                  updatedHomework._id.toString(),
                  studentId.toString(),
                  updatedHomework.title,
                  new Date(updatedHomework.dueDate)
                );
              } catch (notificationError) {
                console.error(`Failed to send notification to student ${studentId}:`, notificationError);
              }
            }
          }
          
          console.log(`Homework ${homework._id} delivered to students at ${new Date()}`);
        }
      );
      
      console.log(`Homework ${homework._id} scheduled for delivery at ${scheduledTime}`);
    } catch (error) {
      console.error('Error scheduling homework delivery:', error);
      throw error;
    }
  }

  /**
   * Create personalized homework based on lesson analysis
   */
  async generatePersonalizedHomework(
    lessonId: string, 
    plannerId: string,
    studentId: string,
    baseTemplate?: Partial<HomeworkType>
  ): Promise<HomeworkDocument> {
    try {
      // Get the lesson with analysis data
      const lesson = await Lesson.findById(lessonId);
      if (!lesson) {
        throw new NotFoundError('Lesson not found');
      }
      
      if (!lesson.analysisResult) {
        throw new ValidationError('Lesson analysis not available');
      }

      // Generate personalized content based on lesson analysis
      const personalizedData = await this.generatePersonalizedContent(lesson);
      
      // Create homework content
      const homeworkContent: HomeworkContent = baseTemplate?.content || {
        instructions: `This homework is personalized based on your lesson on ${new Date(lesson.lessonDate).toLocaleDateString()}.`,
        attachments: [],
        questions: [
          {
            id: new Types.ObjectId().toString(),
            type: 'text_input',
            question: 'Practice using the expressions from your lesson in new sentences:',
          },
          {
            id: new Types.ObjectId().toString(),
            type: 'audio_recording',
            question: 'Record yourself practicing the pronunciation points from your lesson:',
          }
        ]
      };
      
      // Create the homework
      const homework = new Homework({
        plannerId,
        studentIds: [studentId],
        title: baseTemplate?.title || `Personalized homework for lesson on ${new Date(lesson.lessonDate).toLocaleDateString()}`,
        description: baseTemplate?.description || 'This homework is personalized based on your recent lesson analysis.',
        type: baseTemplate?.type || 'mixed',
        content: homeworkContent,
        dueDate: baseTemplate?.dueDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Default: 1 week from now
        isPersonalized: true,
        basedOnLessonId: lessonId,
        status: 'draft',
        personalizedData
      });
      
      return await homework.save();
    } catch (error) {
      console.error('Error generating personalized homework:', error);
      throw error;
    }
  }

  /**
   * Generate personalized content based on lesson analysis
   */
  private async generatePersonalizedContent(lesson: any): Promise<any> {
    try {
      // Extract relevant data from lesson analysis
      const { analysisResult, studentId } = lesson;
      const { speakerSegments, studentMetrics, improvementAreas, lessonInsights } = analysisResult;
      
      // Generate student-specific summary
      const studentSpecificSummary = await this.generateStudentSpecificSummary(lesson);
      
      // Extract vocabulary and expressions from speaker segments
      const vocabularyList = await this.extractVocabularyList(speakerSegments, studentMetrics);
      
      // Extract expressions from speaker segments
      const expressionList = await this.extractExpressionList(speakerSegments, lessonInsights);
      
      // Generate improvement recommendations
      const improvementRecommendations = await this.generateImprovementRecommendations(lesson);
      
      return {
        studentSpecificSummary,
        improvementRecommendations,
        vocabularyList,
        expressionList
      };
    } catch (error) {
      console.error('Error generating personalized content:', error);
      throw error;
    }
  }

  /**
   * Generate student-specific lesson summary
   */
  async generateStudentSpecificSummary(lesson: any): Promise<string> {
    try {
      const { analysisResult, metadata } = lesson;
      const studentName = metadata?.studentName || 'Student';
      
      // Use OpenAI to generate a personalized summary
      const prompt = `
        Generate a personalized lesson summary for ${studentName} based on their English conversation lesson.
        
        Lesson analysis:
        - Speaking time: ${analysisResult.studentMetrics.speakingTime} seconds
        - Pronunciation accuracy: ${analysisResult.studentMetrics.pronunciationAccuracy}
        - Fluency score: ${analysisResult.studentMetrics.fluencyScore}
        - Participation level: ${analysisResult.participationLevel}
        - Improvement areas: ${analysisResult.improvementAreas.join(', ')}
        - Lesson insights: ${analysisResult.lessonInsights.join(', ')}
        
        The summary should:
        1. Be personalized and address the student directly
        2. Highlight their achievements in this lesson
        3. Mention specific mistakes they made and how to improve
        4. Be encouraging and motivational
        5. Be concise (around 200 words)
        6. Be written in both English and Korean
      `;
      
      const summary = await openaiService.generateText(prompt);
      return summary;
    } catch (error) {
      console.error('Error generating student-specific summary:', error);
      return 'Unable to generate personalized summary. Please check the lesson analysis.';
    }
  }

  /**
   * Generate personalized improvement recommendations
   */
  async generateImprovementRecommendations(lesson: any): Promise<string[]> {
    try {
      const { analysisResult, metadata } = lesson;
      const studentName = metadata?.studentName || 'Student';
      
      // Use OpenAI to generate personalized recommendations
      const prompt = `
        Generate 5 specific, actionable improvement recommendations for ${studentName} based on their English conversation lesson.
        
        Lesson analysis:
        - Speaking time: ${analysisResult.studentMetrics.speakingTime} seconds
        - Pronunciation accuracy: ${analysisResult.studentMetrics.pronunciationAccuracy}
        - Fluency score: ${analysisResult.studentMetrics.fluencyScore}
        - Participation level: ${analysisResult.participationLevel}
        - Improvement areas: ${analysisResult.improvementAreas.join(', ')}
        - Pronunciation issues: ${analysisResult.pronunciationScores.filter(p => p.score < 0.7).map(p => p.word).join(', ')}
        
        Each recommendation should:
        1. Address a specific issue identified in the lesson
        2. Provide a concrete exercise or practice method
        3. Be actionable and specific
        4. Include both English and Korean explanation
        
        Format each recommendation as a single string with no bullet points or numbers.
      `;
      
      const recommendationsText = await openaiService.generateText(prompt);
      
      // Split into individual recommendations
      const recommendations = recommendationsText
        .split('\n')
        .filter(line => line.trim().length > 0)
        .slice(0, 5); // Ensure we have at most 5 recommendations
      
      return recommendations;
    } catch (error) {
      console.error('Error generating improvement recommendations:', error);
      return ['Practice pronunciation regularly', 'Review vocabulary from the lesson'];
    }
  }

  /**
   * Extract vocabulary list from speaker segments
   */
  async extractVocabularyList(speakerSegments: any[], studentMetrics: any): Promise<any[]> {
    try {
      // Combine all student segments
      const studentTranscript = speakerSegments
        .filter(segment => segment.speaker === 'student')
        .map(segment => segment.transcript)
        .join(' ');
      
      // Use OpenAI to extract vocabulary
      const prompt = `
        Extract important vocabulary words from this student's speech in an English conversation lesson.
        
        Student's speech: "${studentTranscript}"
        
        For each word:
        1. Identify words that are important for the student's learning
        2. Provide a Korean translation
        3. Extract a context sentence from the original speech
        4. Assign a priority (1-3, where 1 is highest priority)
        
        Return the result as a JSON array with objects containing:
        {
          "word": "example",
          "translation": "예시",
          "context": "This is an example sentence.",
          "priority": 1
        }
        
        Limit to 10 most important words.
      `;
      
      const vocabularyJson = await openaiService.generateText(prompt);
      
      try {
        // Parse the JSON response
        const vocabularyList = JSON.parse(vocabularyJson);
        return Array.isArray(vocabularyList) ? vocabularyList.slice(0, 10) : [];
      } catch (parseError) {
        console.error('Error parsing vocabulary JSON:', parseError);
        return [];
      }
    } catch (error) {
      console.error('Error extracting vocabulary list:', error);
      return [];
    }
  }

  /**
   * Extract expression list from speaker segments
   */
  async extractExpressionList(speakerSegments: any[], lessonInsights: string[]): Promise<any[]> {
    try {
      // Combine all teacher segments
      const teacherTranscript = speakerSegments
        .filter(segment => segment.speaker === 'teacher')
        .map(segment => segment.transcript)
        .join(' ');
      
      // Use OpenAI to extract expressions
      const prompt = `
        Extract important expressions or phrases from this teacher's speech in an English conversation lesson.
        
        Teacher's speech: "${teacherTranscript}"
        Lesson insights: ${lessonInsights.join(', ')}
        
        For each expression:
        1. Identify useful expressions or phrases that would be valuable for the student to learn
        2. Provide a Korean translation
        3. Extract a context sentence from the original speech
        4. Assign a priority (1-3, where 1 is highest priority)
        
        Return the result as a JSON array with objects containing:
        {
          "expression": "for example",
          "translation": "예를 들어",
          "context": "For example, you can use this phrase in many situations.",
          "priority": 1
        }
        
        Limit to 8 most important expressions.
      `;
      
      const expressionsJson = await openaiService.generateText(prompt);
      
      try {
        // Parse the JSON response
        const expressionList = JSON.parse(expressionsJson);
        return Array.isArray(expressionList) ? expressionList.slice(0, 8) : [];
      } catch (parseError) {
        console.error('Error parsing expressions JSON:', parseError);
        return [];
      }
    } catch (error) {
      console.error('Error extracting expression list:', error);
      return [];
    }
  }

  /**
   * Create homework from template
   */
  async createHomeworkFromTemplate(templateId: string, studentIds: string[], dueDate: Date, scheduledSendTime?: Date): Promise<HomeworkDocument> {
    try {
      // Get the template
      const template = await Homework.findOne({ _id: templateId, isTemplate: true });
      if (!template) {
        throw new NotFoundError('Homework template not found');
      }
      
      // Create new homework based on template
      const homeworkData = {
        ...template.toObject(),
        _id: undefined, // Remove template ID
        isTemplate: false,
        templateName: undefined,
        templateCategory: undefined,
        studentIds,
        dueDate,
        scheduledSendTime,
        status: scheduledSendTime ? 'scheduled' : 'draft',
        createdAt: undefined,
        updatedAt: undefined
      };
      
      return await this.createHomework(homeworkData);
    } catch (error) {
      console.error('Error creating homework from template:', error);
      throw error;
    }
  }

  /**
   * Save homework as template
   */
  async saveAsTemplate(homeworkId: string, templateName: string, templateCategory?: string): Promise<HomeworkDocument> {
    try {
      // Get the homework
      const homework = await Homework.findById(homeworkId);
      if (!homework) {
        throw new NotFoundError('Homework not found');
      }
      
      // Create template from homework
      const templateData = {
        ...homework.toObject(),
        _id: undefined, // Create new ID
        isTemplate: true,
        templateName,
        templateCategory,
        studentIds: [], // Templates don't have assigned students
        dueDate: undefined,
        scheduledSendTime: undefined,
        status: 'draft',
        createdAt: undefined,
        updatedAt: undefined
      };
      
      const template = new Homework(templateData);
      return await template.save();
    } catch (error) {
      console.error('Error saving homework as template:', error);
      throw error;
    }
  }

  /**
   * Get all homework templates for a planner
   */
  async getHomeworkTemplates(plannerId: string, category?: string): Promise<HomeworkDocument[]> {
    try {
      const query: any = { plannerId, isTemplate: true };
      if (category) {
        query.templateCategory = category;
      }
      
      return await Homework.find(query).sort({ templateName: 1 });
    } catch (error) {
      console.error('Error getting homework templates:', error);
      throw error;
    }
  }

  /**
   * Assign homework to multiple students
   */
  async assignHomeworkToMultipleStudents(
    homeworkData: Partial<HomeworkType>,
    studentIds: string[]
  ): Promise<HomeworkDocument> {
    try {
      if (!studentIds.length) {
        throw new ValidationError('At least one student must be selected');
      }
      
      // Create homework with multiple student IDs
      const homework = await this.createHomework({
        ...homeworkData,
        studentIds
      });
      
      return homework;
    } catch (error) {
      console.error('Error assigning homework to multiple students:', error);
      throw error;
    }
  }
}

export const homeworkService = new HomeworkService();