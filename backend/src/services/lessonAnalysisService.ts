import { AzureSpeechService } from './azureSpeechService';
import { OpenAIService } from './openaiService';
import { IntegratedAIService } from './integratedAIService';
import { AppError, ErrorType } from '../middleware/errorHandler';
import { Lesson, ILesson } from '../models/Lesson';
import { FileService } from './fileService';
import { SpeakerSegment, StudentMetrics } from '../../../shared/types';
import * as notificationService from './notificationService';
import { User } from '../models/User';
import { SocketService } from './socketService';
import { AnalysisEventData } from '../types/socket';
import { logWithContext } from '../utils/logger';
import { performanceOptimizationService } from './performanceOptimizationService';
import { cacheStrategyService } from './cacheStrategyService';

/**
 * 수업 분석 서비스
 */
export class LessonAnalysisService {
  /**
   * Redis Pub/Sub를 통한 분석 이벤트 전송 (백업으로 직접 Socket.io 전송)
   */
  private static async emitAnalysisEvent(eventData: AnalysisEventData): Promise<void> {
    try {
      const { RedisPubSubService } = await import('./redisPubSubService');
      if (RedisPubSubService.isReady()) {
        await RedisPubSubService.publishAnalysisEvent(eventData);
      } else {
        SocketService.emitAnalysisProgress(eventData);
      }
    } catch (error) {
      SocketService.emitAnalysisProgress(eventData);
    }
  }
  /**
   * 성능 최적화된 수업 조회 (고급 캐싱 전략 적용)
   */
  static async getLessonOptimized(lessonId: string): Promise<ILesson | null> {
    return cacheStrategyService.getWithL1L2Cache(
      `lesson:${lessonId}`,
      async () => {
        return Lesson.findById(lessonId)
          .populate('plannerId', 'profile.name email')
          .populate('studentId', 'profile.name email profile.preferences')
          .lean()
          .exec();
      },
      {
        l1TTL: 60000, // 1분 로컬 캐시
        l2TTL: 300000, // 5분 Redis 캐시
        strategy: 'write-through'
      }
    );
  }

  /**
   * 성능 최적화된 플래너별 수업 목록 조회
   */
  static async getLessonsByPlannerOptimized(
    plannerId: string,
    page: number = 1,
    limit: number = 10,
    status?: string,
    studentId?: string
  ): Promise<{
    data: ILesson[];
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
    
    if (studentId) {
      query.studentId = studentId;
    }

    return performanceOptimizationService.optimizedPagination(
      Lesson,
      query,
      {
        page,
        limit,
        sort: { lessonDate: -1, createdAt: -1 },
        populate: ['studentId'],
        select: 'studentId lessonDate duration status metadata.studentName analysisResult.participationLevel'
      },
      `lessons:planner:${plannerId}:${status || 'all'}:${studentId || 'all'}`
    );
  }

  /**
   * 성능 최적화된 학생별 수업 목록 조회
   */
  static async getLessonsByStudentOptimized(
    studentId: string,
    page: number = 1,
    limit: number = 10
  ): Promise<{
    data: ILesson[];
    totalCount: number;
    totalPages: number;
    currentPage: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  }> {
    const query = { studentId };

    return performanceOptimizationService.optimizedPagination(
      Lesson,
      query,
      {
        page,
        limit,
        sort: { lessonDate: -1 },
        populate: ['plannerId'],
        select: 'plannerId lessonDate duration status analysisResult'
      },
      `lessons:student:${studentId}`
    );
  }

  /**
   * 성능 최적화된 수업 통계 조회
   */
  static async getLessonStatsOptimized(plannerId: string, period: 'week' | 'month' | 'year' = 'month'): Promise<{
    totalLessons: number;
    analyzedLessons: number;
    averageParticipationLevel: number;
    statusBreakdown: Record<string, number>;
    recentAnalyzedLessons: number;
  }> {
    const cacheKey = `lesson:stats:${plannerId}:${period}`;
    
    return performanceOptimizationService.optimizedQuery(
      cacheKey,
      async () => {
        const now = new Date();
        let startDate: Date;
        
        switch (period) {
          case 'week':
            startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            break;
          case 'year':
            startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
            break;
          default: // month
            startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        }

        const pipeline = [
          {
            $match: {
              plannerId: new (Lesson as any).base.Types.ObjectId(plannerId),
              lessonDate: { $gte: startDate }
            }
          },
          {
            $group: {
              _id: null,
              totalLessons: { $sum: 1 },
              analyzedLessons: {
                $sum: {
                  $cond: [{ $in: ['$status', ['analyzed', 'completed']] }, 1, 0]
                }
              },
              averageParticipationLevel: {
                $avg: '$analysisResult.participationLevel'
              },
              statusBreakdown: {
                $push: '$status'
              },
              recentAnalyzedLessons: {
                $sum: {
                  $cond: [
                    {
                      $and: [
                        { $in: ['$status', ['analyzed', 'completed']] },
                        { $gte: ['$updatedAt', new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)] }
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
          Lesson,
          pipeline,
          cacheKey,
          600000 // 10분 캐시
        );

        if (!result) {
          return {
            totalLessons: 0,
            analyzedLessons: 0,
            averageParticipationLevel: 0,
            statusBreakdown: {},
            recentAnalyzedLessons: 0
          };
        }

        // 상태별 개수 계산
        const statusBreakdown: Record<string, number> = {};
        (result.statusBreakdown || []).forEach((status: string) => {
          statusBreakdown[status] = (statusBreakdown[status] || 0) + 1;
        });

        return {
          totalLessons: result.totalLessons || 0,
          analyzedLessons: result.analyzedLessons || 0,
          averageParticipationLevel: Math.round((result.averageParticipationLevel || 0) * 100) / 100,
          statusBreakdown,
          recentAnalyzedLessons: result.recentAnalyzedLessons || 0
        };
      },
      600000 // 10분 캐시
    );
  }

  /**
   * 통합 AI 서비스를 사용한 고도화된 수업 분석 실행
   */
  static async analyzeLessonAudio(lessonId: string): Promise<ILesson> {
    const startTime = Date.now();
    
    try {
      // 성능 최적화된 수업 정보 조회
      const lesson = await this.getLessonOptimized(lessonId);
      if (!lesson) {
        throw new AppError(
          '수업을 찾을 수 없습니다.',
          ErrorType.VALIDATION_ERROR,
          404
        );
      }

      // lean() 쿼리 결과를 Document로 변환 (save() 메서드 사용을 위해)
      const lessonDoc = await Lesson.findById(lessonId);
      if (!lessonDoc) {
        throw new AppError(
          '수업을 찾을 수 없습니다.',
          ErrorType.VALIDATION_ERROR,
          404
        );
      }

      // 오디오 파일이 없는 경우 에러
      if (!lessonDoc.extractedAudioFile) {
        throw new AppError(
          '추출된 오디오 파일이 없습니다.',
          ErrorType.VALIDATION_ERROR,
          400
        );
      }

      // 수업 상태 업데이트
      lessonDoc.status = 'analyzing';
      await lessonDoc.save();

      // 해당 수업 관련 캐시 무효화 (태그 기반)
      await cacheStrategyService.invalidateByTag(`lesson:${lessonId}`);
      await cacheStrategyService.invalidateByTag(`planner:${lessonDoc.plannerId}`);
      await cacheStrategyService.invalidateByTag(`student:${lessonDoc.studentId}`);

      logWithContext('info', '고도화된 수업 분석 시작', {
        lessonId,
        fileId: lesson.extractedAudioFile.s3Key,
        plannerId: lesson.plannerId.toString()
      });

      // 통합 AI 서비스로 종합 분석 실행
      const analysisOptions = {
        plannerId: lesson.plannerId.toString(),
        studentId: lesson.studentId.toString(),
        lessonId: lessonId,
        analysisType: 'comprehensive' as const,
        realTimeUpdates: true
      };

      const comprehensiveResult = await IntegratedAIService.analyzeLesson(
        lesson.extractedAudioFile.s3Key,
        analysisOptions
      );

      // 분석 결과를 기존 Lesson 모델 구조에 맞게 변환
      lessonDoc.analysisResult = {
        speakerSegments: comprehensiveResult.speakerSegments,
        studentMetrics: comprehensiveResult.studentMetrics,
        pronunciationScores: comprehensiveResult.pronunciationAssessment?.wordLevelScores || [],
        participationLevel: LessonAnalysisService.calculateParticipationLevel(comprehensiveResult.speakerSegments),
        improvementAreas: comprehensiveResult.conversationAnalysis.improvementAreas,
        lessonInsights: comprehensiveResult.conversationAnalysis.lessonInsights,
        generatedNotes: LessonAnalysisService.generateEnhancedNotes(
          comprehensiveResult.conversationAnalysis.generatedNotes,
          comprehensiveResult.structuredSummary,
          comprehensiveResult.teacherFeedback,
          comprehensiveResult.contentCategorization
          ),
          analysisCompletedAt: new Date()
        };
        
        // 메타데이터 추가 (통합 AI 서비스 결과 활용)
        lessonDoc.metadata = {
          ...lessonDoc.metadata,
          analysisMetadata: {
            keyExpressions: comprehensiveResult.structuredSummary.keyExpressions,
            pronunciationPoints: comprehensiveResult.structuredSummary.pronunciationPoints,
            homeworkSuggestions: comprehensiveResult.structuredSummary.homeworkSuggestions,
            teacherCorrections: comprehensiveResult.teacherFeedback.corrections,
            teacherSuggestions: comprehensiveResult.teacherFeedback.suggestions,
            teacherPraises: comprehensiveResult.teacherFeedback.praises,
            topics: comprehensiveResult.contentCategorization.topics,
            vocabulary: comprehensiveResult.contentCategorization.vocabulary,
            grammar: comprehensiveResult.contentCategorization.grammar,
            culturalNotes: comprehensiveResult.contentCategorization.culturalNotes
          }
        };
        
        // 수업 상태 업데이트
        lessonDoc.status = 'analyzed';
        await lessonDoc.save();
        
        // 분석 완료 후 캐시 무효화
        await performanceOptimizationService.invalidateCache(`lesson:${lessonId}`);
        await performanceOptimizationService.invalidateCache(`lessons:planner:${lessonDoc.plannerId}`);
        await performanceOptimizationService.invalidateCache(`lessons:student:${lessonDoc.studentId}`);
        await performanceOptimizationService.invalidateCache(`lesson:stats:${lessonDoc.plannerId}`);
        
        // 10. 학생에게 수업 분석 알림 전송
        try {
          // 학생에게 알림 전송
          if (lessonDoc.studentId) {
            const studentId = lessonDoc.studentId;
            try {
              const student = await User.findById(studentId);
                if (student && student.profile?.preferences?.notifications) {
                  // 학생의 알림 설정이 활성화된 경우에만 알림 전송
                // Convert analysisResult to match shared types (Date to string)
                const compatibleAnalysisResult = {
                  ...lessonDoc.analysisResult!,
                  analysisCompletedAt: lessonDoc.analysisResult!.analysisCompletedAt.toISOString()
                };
                
                await notificationService.sendLessonAnalysisNotification(
                  (lessonDoc._id as any).toString(),
                  studentId.toString(),
                  lessonDoc.lessonDate,
                  compatibleAnalysisResult,
                  'immediate' // 기본값은 즉시 전송
                );
                  
                logWithContext('info', `수업 분석 알림 전송 완료`, {
                  lessonId,
                  studentId: studentId.toString()
                });
              }
            } catch (studentNotificationError) {
              // 학생 알림 실패는 로그만 남기고 계속 진행
              logWithContext('warn', '학생 알림 전송 실패', {
                lessonId,
                studentId: studentId.toString(),
                error: studentNotificationError instanceof Error ? studentNotificationError.message : '알 수 없는 오류'
              });
            }
          }
        } catch (notificationError) {
          // 알림 전송 실패해도 분석 결과는 성공으로 처리
          logWithContext('error', '학생 알림 전송 중 오류 발생', {
            lessonId,
            error: notificationError instanceof Error ? notificationError.message : '알 수 없는 오류'
          });
        }
        
        // Socket.io 이벤트 전송 - 분석 완료
        const eventData: AnalysisEventData = {
          analysisId: `lesson_${lessonId}_${Date.now()}`,
          fileId: lesson.extractedAudioFile.s3Key,
          userId: lesson.plannerId.toString(),
          type: 'pronunciation',
          stage: 'completed',
          progress: 100,
          results: lesson.analysisResult,
          timestamp: new Date()
        };
        await this.emitAnalysisEvent(eventData);
        
        const endTime = Date.now();
        logWithContext('info', '고도화된 수업 분석 완료', {
          lessonId,
          processingTime: endTime - startTime,
          analysisQuality: 'comprehensive',
          totalCost: comprehensiveResult.metadata.totalCost,
          qualityScore: comprehensiveResult.metadata.qualityScore
        });
        
        return lessonDoc;
        
    } catch (error) {
      // 분석 실패 시 상태 업데이트
      const failedLesson = await Lesson.findById(lessonId);
      if (failedLesson) {
        failedLesson.status = 'failed';
        failedLesson.errorMessage = error instanceof Error ? error.message : '알 수 없는 오류';
        await failedLesson.save();

        // Socket.io 이벤트 전송 - 분석 실패
        if (failedLesson.extractedAudioFile) {
          const failureEventData: AnalysisEventData = {
            analysisId: `lesson_${lessonId}_${Date.now()}`,
            fileId: failedLesson.extractedAudioFile.s3Key,
            userId: failedLesson.plannerId.toString(),
            type: 'pronunciation',
            stage: 'failed',
            progress: 0,
            error: error instanceof Error ? error.message : '알 수 없는 오류',
            timestamp: new Date()
          };
          await this.emitAnalysisEvent(failureEventData);
        }
      }
      logWithContext('error', '수업 분석 서비스 최종 오류', {
        lessonId,
        error: error instanceof Error ? error.message : '알 수 없는 오류',
        processingTime: Date.now() - startTime
      });
      
      throw new AppError(
        '수업 분석 중 오류가 발생했습니다.',
        ErrorType.AI_SERVICE_ERROR,
        500,
        true,
        error
      );
    }
  }

  /**
   * 참여도 계산
   */
  private static calculateParticipationLevel(speakerSegments: SpeakerSegment[]): number {
    // 학생 발화 세그먼트만 필터링
    const studentSegments = speakerSegments.filter(segment => segment.speaker === 'student');
    
    // 교사 발화 세그먼트만 필터링
    const teacherSegments = speakerSegments.filter(segment => segment.speaker === 'teacher');
    
    // 학생 발화 시간 계산
    const studentSpeakingTime = studentSegments.reduce((total, segment) => {
      return total + (segment.endTime - segment.startTime);
    }, 0);
    
    // 교사 발화 시간 계산
    const teacherSpeakingTime = teacherSegments.reduce((total, segment) => {
      return total + (segment.endTime - segment.startTime);
    }, 0);
    
    // 총 발화 시간
    const totalSpeakingTime = studentSpeakingTime + teacherSpeakingTime;
    
    // 학생 발화 비율 계산
    const studentRatio = totalSpeakingTime > 0 ? (studentSpeakingTime / totalSpeakingTime) : 0;
    
    // 참여도 점수 계산 (0-100)
    // 이상적인 학생 발화 비율은 약 40-60%로 가정
    let participationLevel = 0;
    
    if (studentRatio <= 0.2) {
      // 20% 이하: 낮은 참여도
      participationLevel = studentRatio * 250; // 0-50점
    } else if (studentRatio <= 0.6) {
      // 20-60%: 이상적인 참여도
      participationLevel = 50 + ((studentRatio - 0.2) * 125); // 50-100점
    } else {
      // 60% 이상: 너무 높은 참여도 (교사 발화 부족)
      participationLevel = 100 - ((studentRatio - 0.6) * 125); // 100-50점
    }
    
    // 0-100 범위로 제한
    return Math.min(100, Math.max(0, participationLevel));
  }

  /**
   * 향상된 수업 노트 생성
   */
  private static generateEnhancedNotes(
    baseNotes: string,
    structuredSummary: {
      keyExpressions: string[];
      pronunciationPoints: string[];
      homeworkSuggestions: string[];
    },
    teacherFeedback: {
      corrections: { original: string; corrected: string; explanation: string }[];
      suggestions: string[];
      praises: string[];
    },
    contentCategories: {
      topics: string[];
      vocabulary: { word: string; meaning: string; example: string }[];
      grammar: { pattern: string; explanation: string; example: string }[];
      culturalNotes: string[];
    }
  ): string {
    // 기본 노트
    let enhancedNotes = baseNotes;
    
    // 구조화된 요약 추가
    enhancedNotes += '\n\n## 오늘 배운 주요 표현\n';
    structuredSummary.keyExpressions.forEach(expression => {
      enhancedNotes += `- ${expression}\n`;
    });
    
    enhancedNotes += '\n## 발음 교정 포인트\n';
    structuredSummary.pronunciationPoints.forEach(point => {
      enhancedNotes += `- ${point}\n`;
    });
    
    enhancedNotes += '\n## 숙제 연결 내용\n';
    structuredSummary.homeworkSuggestions.forEach(suggestion => {
      enhancedNotes += `- ${suggestion}\n`;
    });
    
    // 교사 피드백 추가
    enhancedNotes += '\n## 교사 피드백\n';
    
    if (teacherFeedback.corrections.length > 0) {
      enhancedNotes += '\n### 교정 사항\n';
      teacherFeedback.corrections.forEach(correction => {
        enhancedNotes += `- 원문: ${correction.original}\n  교정: ${correction.corrected}\n  설명: ${correction.explanation}\n\n`;
      });
    }
    
    if (teacherFeedback.suggestions.length > 0) {
      enhancedNotes += '\n### 제안 사항\n';
      teacherFeedback.suggestions.forEach(suggestion => {
        enhancedNotes += `- ${suggestion}\n`;
      });
    }
    
    if (teacherFeedback.praises.length > 0) {
      enhancedNotes += '\n### 칭찬 사항\n';
      teacherFeedback.praises.forEach(praise => {
        enhancedNotes += `- ${praise}\n`;
      });
    }
    
    // 수업 내용 분류 추가
    enhancedNotes += '\n## 수업 내용 분류\n';
    
    if (contentCategories.topics.length > 0) {
      enhancedNotes += '\n### 주요 주제\n';
      contentCategories.topics.forEach(topic => {
        enhancedNotes += `- ${topic}\n`;
      });
    }
    
    if (contentCategories.vocabulary.length > 0) {
      enhancedNotes += '\n### 핵심 어휘\n';
      contentCategories.vocabulary.forEach(vocab => {
        enhancedNotes += `- 단어: ${vocab.word}\n  의미: ${vocab.meaning}\n  예문: ${vocab.example}\n\n`;
      });
    }
    
    if (contentCategories.grammar.length > 0) {
      enhancedNotes += '\n### 문법 패턴\n';
      contentCategories.grammar.forEach(grammar => {
        enhancedNotes += `- 패턴: ${grammar.pattern}\n  설명: ${grammar.explanation}\n  예문: ${grammar.example}\n\n`;
      });
    }
    
    if (contentCategories.culturalNotes.length > 0) {
      enhancedNotes += '\n### 문화적 요소\n';
      contentCategories.culturalNotes.forEach(note => {
        enhancedNotes += `- ${note}\n`;
      });
    }
    
    return enhancedNotes;
  }
}