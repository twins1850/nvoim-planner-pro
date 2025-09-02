import { AzureSpeechService } from './azureSpeechService';
import { OpenAIService } from './openaiService';
import { SocketService } from './socketService';
import { RedisPubSubService } from './redisPubSubService';
import { AppError, ErrorType } from '../middleware/errorHandler';
import { SpeakerSegment, StudentMetrics } from '../../../shared/types';
import { AnalysisEventData } from '../types/socket';
import { costMonitoringService } from './costMonitoringService';
import { logWithContext } from '../utils/logger';

/**
 * Azure Speech Service와 OpenAI를 통합한 고도화된 AI 분석 서비스
 * 
 * 주요 기능:
 * - 음성을 텍스트로 변환하고 발음 평가
 * - AI 기반 대화 분석 및 교육적 인사이트 제공
 * - 실시간 진행률 업데이트 (Socket.io)
 * - 개인화된 피드백 및 학습 제안
 * - 비용 모니터링 및 최적화
 */
export class IntegratedAIService {
  /**
   * 종합 수업 분석 (Comprehensive Lesson Analysis)
   * 
   * Azure Speech Service + OpenAI를 활용한 완전한 수업 분석
   */
  static async analyzeLesson(
    fileId: string,
    options: {
      plannerId: string;
      studentId?: string;
      lessonId?: string;
      referenceText?: string;
      analysisType?: 'basic' | 'advanced' | 'comprehensive';
      realTimeUpdates?: boolean;
    }
  ): Promise<{
    // 기본 음성 분석 결과
    transcript: string;
    speakerSegments: SpeakerSegment[];
    pronunciationAssessment?: any;
    
    // AI 기반 교육 분석
    conversationAnalysis: {
      lessonInsights: string[];
      improvementAreas: string[];
      generatedNotes: string;
    };
    
    // 학생 성과 지표
    studentMetrics: StudentMetrics;
    
    // 구조화된 수업 요약
    structuredSummary: {
      keyExpressions: string[];
      pronunciationPoints: string[];
      homeworkSuggestions: string[];
    };
    
    // 교사 피드백 분석
    teacherFeedback: {
      corrections: { original: string; corrected: string; explanation: string }[];
      suggestions: string[];
      praises: string[];
    };
    
    // 수업 내용 분류
    contentCategorization: {
      topics: string[];
      vocabulary: { word: string; meaning: string; example: string }[];
      grammar: { pattern: string; explanation: string; example: string }[];
      culturalNotes: string[];
    };
    
    // 메타데이터
    metadata: {
      processingTime: number;
      totalCost: number;
      analysisTimestamp: Date;
      qualityScore: number;
    };
  }> {
    const startTime = Date.now();
    const analysisId = `analysis_${fileId}_${Date.now()}`;
    
    try {
      // 분석 시작 이벤트 발송
      if (options.realTimeUpdates) {
        await this.sendAnalysisProgress(analysisId, fileId, options.plannerId, 'processing', 0, '음성 분석 시작');
      }
      
      logWithContext('info', '종합 수업 분석 시작', {
        fileId,
        analysisId,
        plannerId: options.plannerId,
        analysisType: options.analysisType
      });

      // 1단계: Azure Speech Service - 음성 분석 (30% 진행률)
      logWithContext('info', '1단계: Azure Speech Service 음성 분석 시작');
      
      if (options.realTimeUpdates) {
        await this.sendAnalysisProgress(analysisId, fileId, options.plannerId, 'processing', 10, '음성을 텍스트로 변환 중');
      }
      
      const speechOptions = {
        separateSpeakers: true,
        evaluatePronunciation: !!options.referenceText,
        referenceText: options.referenceText,
        identifySpeaker: false
      };
      
      const audioAnalysisResult = await AzureSpeechService.analyzeAudio(fileId, speechOptions);
      
      if (options.realTimeUpdates) {
        await this.sendAnalysisProgress(analysisId, fileId, options.plannerId, 'processing', 30, '음성 분석 완료, AI 분석 시작');
      }
      
      logWithContext('info', '1단계 완료: 음성 분석 결과', {
        transcriptLength: audioAnalysisResult.transcript.length,
        speakerSegmentsCount: audioAnalysisResult.speakerSegments?.length || 0
      });

      // 2단계: OpenAI 대화 분석 (50% 진행률)
      logWithContext('info', '2단계: OpenAI 대화 분석 시작');
      
      if (options.realTimeUpdates) {
        await this.sendAnalysisProgress(analysisId, fileId, options.plannerId, 'processing', 40, '대화 내용 분석 중');
      }
      
      const speakerSegments = audioAnalysisResult.speakerSegments || [];
      
      const conversationAnalysis = await OpenAIService.analyzeConversation(speakerSegments);
      
      if (options.realTimeUpdates) {
        await this.sendAnalysisProgress(analysisId, fileId, options.plannerId, 'processing', 50, '대화 분석 완료, 성과 지표 계산 중');
      }
      
      logWithContext('info', '2단계 완료: 대화 분석 결과', {
        insightsCount: conversationAnalysis.lessonInsights.length,
        improvementAreasCount: conversationAnalysis.improvementAreas.length
      });

      // 3단계: 학생 성과 지표 계산 (60% 진행률)
      logWithContext('info', '3단계: 학생 성과 지표 계산 시작');
      
      const pronunciationScores = audioAnalysisResult.pronunciationAssessment?.wordLevelScores?.map((word: any) => ({
        word: word.word,
        score: word.score,
        feedback: word.errorType || 'good'
      }));
      
      const studentMetrics = await OpenAIService.calculateStudentMetrics(speakerSegments, pronunciationScores);
      
      if (options.realTimeUpdates) {
        await this.sendAnalysisProgress(analysisId, fileId, options.plannerId, 'processing', 60, '성과 지표 계산 완료, 구조화된 요약 생성 중');
      }
      
      logWithContext('info', '3단계 완료: 학생 성과 지표', {
        speakingTime: studentMetrics.speakingTime,
        pronunciationAccuracy: studentMetrics.pronunciationAccuracy,
        fluencyScore: studentMetrics.fluencyScore
      });

      // 4단계: 구조화된 수업 요약 생성 (70% 진행률)
      logWithContext('info', '4단계: 구조화된 수업 요약 생성 시작');
      
      const structuredSummary = await OpenAIService.generateStructuredSummary(
        speakerSegments,
        studentMetrics,
        conversationAnalysis.lessonInsights,
        conversationAnalysis.improvementAreas
      );
      
      if (options.realTimeUpdates) {
        await this.sendAnalysisProgress(analysisId, fileId, options.plannerId, 'processing', 70, '구조화된 요약 완료, 교사 피드백 추출 중');
      }
      
      logWithContext('info', '4단계 완료: 구조화된 요약', {
        keyExpressionsCount: structuredSummary.keyExpressions.length,
        pronunciationPointsCount: structuredSummary.pronunciationPoints.length,
        homeworkSuggestionsCount: structuredSummary.homeworkSuggestions.length
      });

      // 5단계: 교사 피드백 추출 (80% 진행률)
      logWithContext('info', '5단계: 교사 피드백 추출 시작');
      
      const teacherFeedback = await OpenAIService.extractTeacherFeedback(speakerSegments);
      
      if (options.realTimeUpdates) {
        await this.sendAnalysisProgress(analysisId, fileId, options.plannerId, 'processing', 80, '교사 피드백 추출 완료, 수업 내용 분류 중');
      }
      
      logWithContext('info', '5단계 완료: 교사 피드백', {
        correctionsCount: teacherFeedback.corrections.length,
        suggestionsCount: teacherFeedback.suggestions.length,
        praisesCount: teacherFeedback.praises.length
      });

      // 6단계: 수업 내용 분류 (90% 진행률)
      logWithContext('info', '6단계: 수업 내용 분류 시작');
      
      const contentCategorization = await OpenAIService.categorizeContent(speakerSegments);
      
      if (options.realTimeUpdates) {
        await this.sendAnalysisProgress(analysisId, fileId, options.plannerId, 'processing', 90, '수업 내용 분류 완료, 최종 결과 정리 중');
      }
      
      logWithContext('info', '6단계 완료: 수업 내용 분류', {
        topicsCount: contentCategorization.topics.length,
        vocabularyCount: contentCategorization.vocabulary.length,
        grammarCount: contentCategorization.grammar.length,
        culturalNotesCount: contentCategorization.culturalNotes.length
      });

      // 7단계: 결과 정리 및 품질 평가 (100% 진행률)
      const endTime = Date.now();
      const processingTime = endTime - startTime;
      
      // 품질 점수 계산 (간단한 휴리스틱)
      const qualityScore = this.calculateQualityScore({
        transcriptLength: audioAnalysisResult.transcript.length,
        speakerSegmentsCount: speakerSegments.length,
        pronunciationAvailable: !!audioAnalysisResult.pronunciationAssessment,
        insightsCount: conversationAnalysis.lessonInsights.length,
        vocabularyCount: contentCategorization.vocabulary.length
      });
      
      // 총 비용 계산 (추정)
      const estimatedTotalCost = await this.estimateTotalCost(audioAnalysisResult, options.plannerId);
      
      const result = {
        transcript: audioAnalysisResult.transcript,
        speakerSegments,
        pronunciationAssessment: audioAnalysisResult.pronunciationAssessment,
        conversationAnalysis,
        studentMetrics,
        structuredSummary,
        teacherFeedback,
        contentCategorization,
        metadata: {
          processingTime,
          totalCost: estimatedTotalCost,
          analysisTimestamp: new Date(),
          qualityScore
        }
      };
      
      if (options.realTimeUpdates) {
        await this.sendAnalysisProgress(analysisId, fileId, options.plannerId, 'completed', 100, '종합 분석 완료', result);
      }
      
      logWithContext('info', '종합 수업 분석 완료', {
        analysisId,
        processingTime,
        qualityScore,
        estimatedTotalCost
      });
      
      return result;
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류';
      
      if (options.realTimeUpdates) {
        await this.sendAnalysisProgress(analysisId, fileId, options.plannerId, 'failed', 0, `분석 실패: ${errorMessage}`);
      }
      
      logWithContext('error', '종합 수업 분석 실패', {
        analysisId,
        fileId,
        error: errorMessage
      });
      
      throw new AppError(
        '종합 수업 분석 중 오류가 발생했습니다.',
        ErrorType.AI_SERVICE_ERROR,
        500,
        true,
        error
      );
    }
  }

  /**
   * 실시간 발음 평가 (Real-time Pronunciation Assessment)
   * 
   * 실시간으로 발음을 평가하고 즉시 피드백 제공
   */
  static async evaluateRealTimePronunciation(
    audioFilePath: string,
    referenceText: string,
    options: {
      plannerId: string;
      studentId: string;
      sessionId?: string;
      realTimeUpdates?: boolean;
    }
  ): Promise<{
    pronunciationResult: any;
    aiInsights: {
      strengths: string[];
      weaknesses: string[];
      recommendations: string[];
    };
    improvementTips: string[];
    nextSteps: string[];
  }> {
    const analysisId = `realtime_${options.studentId}_${Date.now()}`;
    
    try {
      logWithContext('info', '실시간 발음 평가 시작', {
        analysisId,
        studentId: options.studentId,
        referenceText: referenceText.substring(0, 100)
      });

      if (options.realTimeUpdates) {
        await this.sendAnalysisProgress(analysisId, 'realtime', options.plannerId, 'processing', 20, '발음 분석 중');
      }

      // 1. Azure Speech Service로 발음 평가
      const pronunciationResult = await AzureSpeechService.evaluatePronunciation(
        audioFilePath,
        referenceText,
        options.plannerId
      );

      if (options.realTimeUpdates) {
        await this.sendAnalysisProgress(analysisId, 'realtime', options.plannerId, 'processing', 60, 'AI 피드백 생성 중');
      }

      // 2. OpenAI로 상세 피드백 생성
      const feedbackPrompt = `다음은 학생의 영어 발음 평가 결과입니다. 상세한 피드백을 제공해주세요.

참조 텍스트: "${referenceText}"

발음 평가 결과:
- 전체 점수: ${pronunciationResult.overallScore}/100
- 발음 점수: ${pronunciationResult.pronunciationScore}/100
- 완성도 점수: ${pronunciationResult.completenessScore}/100
- 유창성 점수: ${pronunciationResult.fluencyScore}/100

단어별 점수:
${pronunciationResult.wordLevelScores.map((word: any) => 
  `- "${word.word}": ${word.score}/100 ${word.errorType ? `(${word.errorType})` : ''}`
).join('\n')}

다음 형식으로 피드백을 제공해주세요:

# 강점
- [강점 1]
- [강점 2]

# 개선점
- [개선점 1]
- [개선점 2]

# 구체적 개선 방법
- [방법 1]
- [방법 2]

# 다음 연습 제안
- [제안 1]
- [제안 2]`;

      const aiResponse = await OpenAIService.generateText(feedbackPrompt, 1000);

      // 응답 파싱
      const strengthsMatch = aiResponse.match(/# 강점\s+([\s\S]*?)(?=# 개선점|$)/);
      const weaknessesMatch = aiResponse.match(/# 개선점\s+([\s\S]*?)(?=# 구체적 개선 방법|$)/);
      const recommendationsMatch = aiResponse.match(/# 구체적 개선 방법\s+([\s\S]*?)(?=# 다음 연습 제안|$)/);
      const nextStepsMatch = aiResponse.match(/# 다음 연습 제안\s+([\s\S]*?)$/);

      const aiInsights = {
        strengths: strengthsMatch ? 
          strengthsMatch[1].split('\n').filter(line => line.trim().startsWith('-')).map(line => line.trim().substring(1).trim()) : 
          [],
        weaknesses: weaknessesMatch ? 
          weaknessesMatch[1].split('\n').filter(line => line.trim().startsWith('-')).map(line => line.trim().substring(1).trim()) : 
          [],
        recommendations: recommendationsMatch ? 
          recommendationsMatch[1].split('\n').filter(line => line.trim().startsWith('-')).map(line => line.trim().substring(1).trim()) : 
          []
      };

      const nextSteps = nextStepsMatch ? 
        nextStepsMatch[1].split('\n').filter(line => line.trim().startsWith('-')).map(line => line.trim().substring(1).trim()) : 
        [];

      // 개선 팁 생성
      const improvementTips = this.generateImprovementTips(pronunciationResult);

      if (options.realTimeUpdates) {
        const result = {
          pronunciationResult,
          aiInsights,
          improvementTips,
          nextSteps
        };
        await this.sendAnalysisProgress(analysisId, 'realtime', options.plannerId, 'completed', 100, '실시간 발음 평가 완료', result);
      }

      logWithContext('info', '실시간 발음 평가 완료', {
        analysisId,
        overallScore: pronunciationResult.overallScore,
        strengthsCount: aiInsights.strengths.length,
        weaknessesCount: aiInsights.weaknesses.length
      });

      return {
        pronunciationResult,
        aiInsights,
        improvementTips,
        nextSteps
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류';
      
      if (options.realTimeUpdates) {
        await this.sendAnalysisProgress(analysisId, 'realtime', options.plannerId, 'failed', 0, `실시간 발음 평가 실패: ${errorMessage}`);
      }
      
      logWithContext('error', '실시간 발음 평가 실패', {
        analysisId,
        error: errorMessage
      });
      
      throw new AppError(
        '실시간 발음 평가 중 오류가 발생했습니다.',
        ErrorType.AI_SERVICE_ERROR,
        500,
        true,
        error
      );
    }
  }

  /**
   * 개인화된 학습 추천 (Personalized Learning Recommendations)
   * 
   * 학생의 과거 성과를 바탕으로 개인화된 학습 계획 생성
   */
  static async generatePersonalizedRecommendations(
    studentId: string,
    options: {
      plannerId: string;
      recentAnalyses?: any[];
      learningGoals?: string[];
      difficultyLevel?: 'beginner' | 'intermediate' | 'advanced';
      focusAreas?: string[];
    }
  ): Promise<{
    learningPlan: {
      weeklyGoals: string[];
      dailyActivities: { day: string; activities: string[] }[];
      milestones: { week: number; goal: string; metrics: string[] }[];
    };
    resourceRecommendations: {
      pronunciationPractice: string[];
      vocabularyBuilding: string[];
      grammarExercises: string[];
      conversationTopics: string[];
    };
    weaknessAddressing: {
      identifiedWeaknesses: string[];
      targetedExercises: string[];
      progressTracking: string[];
    };
  }> {
    try {
      logWithContext('info', '개인화된 학습 추천 생성 시작', {
        studentId,
        plannerId: options.plannerId,
        difficultyLevel: options.difficultyLevel
      });

      // 학생의 과거 분석 결과 요약
      const analysisHistory = options.recentAnalyses || [];
      const historyContext = analysisHistory.length > 0 ? 
        `최근 분석 결과:\n${analysisHistory.map((analysis, index) => 
          `${index + 1}. 발음 정확도: ${analysis.pronunciationAccuracy || 'N/A'}%, 유창성: ${analysis.fluencyScore || 'N/A'}%`
        ).join('\n')}` : 
        '과거 분석 결과가 없습니다.';

      const recommendationPrompt = `영어 학습자를 위한 개인화된 학습 계획을 생성해주세요.

학생 정보:
- 학습자 ID: ${studentId}
- 난이도 수준: ${options.difficultyLevel || 'intermediate'}
- 학습 목표: ${options.learningGoals?.join(', ') || '전반적인 영어 실력 향상'}
- 집중 영역: ${options.focusAreas?.join(', ') || '발음, 어휘, 문법'}

${historyContext}

다음 형식으로 개인화된 학습 계획을 제공해주세요:

# 주간 학습 목표
- [1주차 목표]
- [2주차 목표]
- [3주차 목표]
- [4주차 목표]

# 일일 학습 활동
## 월요일
- [활동 1]
- [활동 2]

## 화요일
- [활동 1]
- [활동 2]

## 수요일
- [활동 1]
- [활동 2]

## 목요일
- [활동 1]
- [활동 2]

## 금요일
- [활동 1]
- [활동 2]

# 마일스톤 (4주간)
- 1주차: [목표] - 측정 지표: [지표1, 지표2]
- 2주차: [목표] - 측정 지표: [지표1, 지표2]
- 3주차: [목표] - 측정 지표: [지표1, 지표2]
- 4주차: [목표] - 측정 지표: [지표1, 지표2]

# 발음 연습 리소스
- [리소스 1]
- [리소스 2]
- [리소스 3]

# 어휘 확장 리소스
- [리소스 1]
- [리소스 2]
- [리소스 3]

# 문법 연습 리소스
- [리소스 1]
- [리소스 2]
- [리소스 3]

# 회화 주제 추천
- [주제 1]
- [주제 2]
- [주제 3]

# 개선이 필요한 영역
- [약점 1]
- [약점 2]
- [약점 3]

# 맞춤형 연습 방법
- [방법 1]
- [방법 2]
- [방법 3]

# 진도 추적 방법
- [추적 방법 1]
- [추적 방법 2]
- [추적 방법 3]`;

      const aiResponse = await OpenAIService.generateText(recommendationPrompt, 2000);

      // 응답 파싱
      const weeklyGoalsMatch = aiResponse.match(/# 주간 학습 목표\s+([\s\S]*?)(?=# 일일 학습 활동|$)/);
      const dailyActivitiesMatch = aiResponse.match(/# 일일 학습 활동\s+([\s\S]*?)(?=# 마일스톤|$)/);
      const milestonesMatch = aiResponse.match(/# 마일스톤[^\n]*\s+([\s\S]*?)(?=# 발음 연습 리소스|$)/);
      
      const pronunciationMatch = aiResponse.match(/# 발음 연습 리소스\s+([\s\S]*?)(?=# 어휘 확장 리소스|$)/);
      const vocabularyMatch = aiResponse.match(/# 어휘 확장 리소스\s+([\s\S]*?)(?=# 문법 연습 리소스|$)/);
      const grammarMatch = aiResponse.match(/# 문법 연습 리소스\s+([\s\S]*?)(?=# 회화 주제 추천|$)/);
      const conversationMatch = aiResponse.match(/# 회화 주제 추천\s+([\s\S]*?)(?=# 개선이 필요한 영역|$)/);
      
      const weaknessesMatch = aiResponse.match(/# 개선이 필요한 영역\s+([\s\S]*?)(?=# 맞춤형 연습 방법|$)/);
      const exercisesMatch = aiResponse.match(/# 맞춤형 연습 방법\s+([\s\S]*?)(?=# 진도 추적 방법|$)/);
      const trackingMatch = aiResponse.match(/# 진도 추적 방법\s+([\s\S]*?)$/);

      // 파싱 결과 구조화
      const weeklyGoals = weeklyGoalsMatch ? 
        weeklyGoalsMatch[1].split('\n').filter(line => line.trim().startsWith('-')).map(line => line.trim().substring(1).trim()) : 
        [];

      // 일일 활동 파싱
      const dailyActivities = [];
      const days = ['월요일', '화요일', '수요일', '목요일', '금요일'];
      for (const day of days) {
        const dayMatch = aiResponse.match(new RegExp(`## ${day}\\s+([\\s\\S]*?)(?=## |# |$)`));
        if (dayMatch) {
          const activities = dayMatch[1].split('\n').filter(line => line.trim().startsWith('-')).map(line => line.trim().substring(1).trim());
          dailyActivities.push({ day, activities });
        }
      }

      // 마일스톤 파싱
      const milestones: { week: number; goal: string; metrics: string[] }[] = [];
      if (milestonesMatch) {
        const milestoneLines = milestonesMatch[1].split('\n').filter(line => line.trim().startsWith('-'));
        milestoneLines.forEach(line => {
          const match = line.match(/(\d+)주차:\s*(.+?)\s*-\s*측정 지표:\s*(.+)/);
          if (match) {
            milestones.push({
              week: parseInt(match[1]),
              goal: match[2].trim(),
              metrics: match[3].split(',').map(m => m.trim().replace(/[\[\]]/g, ''))
            });
          }
        });
      }

      const result = {
        learningPlan: {
          weeklyGoals,
          dailyActivities,
          milestones
        },
        resourceRecommendations: {
          pronunciationPractice: pronunciationMatch ? 
            pronunciationMatch[1].split('\n').filter(line => line.trim().startsWith('-')).map(line => line.trim().substring(1).trim()) : 
            [],
          vocabularyBuilding: vocabularyMatch ? 
            vocabularyMatch[1].split('\n').filter(line => line.trim().startsWith('-')).map(line => line.trim().substring(1).trim()) : 
            [],
          grammarExercises: grammarMatch ? 
            grammarMatch[1].split('\n').filter(line => line.trim().startsWith('-')).map(line => line.trim().substring(1).trim()) : 
            [],
          conversationTopics: conversationMatch ? 
            conversationMatch[1].split('\n').filter(line => line.trim().startsWith('-')).map(line => line.trim().substring(1).trim()) : 
            []
        },
        weaknessAddressing: {
          identifiedWeaknesses: weaknessesMatch ? 
            weaknessesMatch[1].split('\n').filter(line => line.trim().startsWith('-')).map(line => line.trim().substring(1).trim()) : 
            [],
          targetedExercises: exercisesMatch ? 
            exercisesMatch[1].split('\n').filter(line => line.trim().startsWith('-')).map(line => line.trim().substring(1).trim()) : 
            [],
          progressTracking: trackingMatch ? 
            trackingMatch[1].split('\n').filter(line => line.trim().startsWith('-')).map(line => line.trim().substring(1).trim()) : 
            []
        }
      };

      logWithContext('info', '개인화된 학습 추천 생성 완료', {
        studentId,
        weeklyGoalsCount: weeklyGoals.length,
        dailyActivitiesCount: dailyActivities.length,
        milestonesCount: milestones.length
      });

      return result;

    } catch (error) {
      logWithContext('error', '개인화된 학습 추천 생성 실패', {
        studentId,
        error: error instanceof Error ? error.message : '알 수 없는 오류'
      });
      
      throw new AppError(
        '개인화된 학습 추천 생성 중 오류가 발생했습니다.',
        ErrorType.AI_SERVICE_ERROR,
        500,
        true,
        error
      );
    }
  }

  /**
   * 분석 진행률 업데이트 전송
   */
  private static async sendAnalysisProgress(
    analysisId: string,
    fileId: string,
    userId: string,
    stage: 'queued' | 'processing' | 'completed' | 'failed',
    progress: number,
    message: string,
    results?: any
  ): Promise<void> {
    try {
      const eventData: AnalysisEventData = {
        analysisId,
        fileId,
        userId,
        type: 'pronunciation',
        stage,
        progress,
        results,
        timestamp: new Date()
      };

      // Socket.io로 실시간 업데이트 전송
      SocketService.emitAnalysisProgress(eventData);

      // Redis Pub/Sub으로 다중 서버 동기화
      if (process.env.REDIS_URL || process.env.NODE_ENV === 'production') {
        try {
          await RedisPubSubService.publishAnalysisEvent(eventData);
        } catch (redisError) {
          logWithContext('warn', 'Redis Pub/Sub 분석 이벤트 발송 실패', { redisError });
        }
      }

      logWithContext('info', '분석 진행률 업데이트 전송', {
        analysisId,
        stage,
        progress,
        message
      });

    } catch (error) {
      logWithContext('error', '분석 진행률 업데이트 전송 실패', {
        analysisId,
        error: error instanceof Error ? error.message : '알 수 없는 오류'
      });
    }
  }

  /**
   * 품질 점수 계산
   */
  private static calculateQualityScore(metrics: {
    transcriptLength: number;
    speakerSegmentsCount: number;
    pronunciationAvailable: boolean;
    insightsCount: number;
    vocabularyCount: number;
  }): number {
    let score = 0;

    // 전사 품질 (30점)
    if (metrics.transcriptLength > 100) score += 30;
    else if (metrics.transcriptLength > 50) score += 20;
    else if (metrics.transcriptLength > 20) score += 10;

    // 화자 분리 품질 (20점)
    if (metrics.speakerSegmentsCount > 10) score += 20;
    else if (metrics.speakerSegmentsCount > 5) score += 15;
    else if (metrics.speakerSegmentsCount > 0) score += 10;

    // 발음 평가 가용성 (20점)
    if (metrics.pronunciationAvailable) score += 20;

    // AI 인사이트 품질 (20점)
    if (metrics.insightsCount > 5) score += 20;
    else if (metrics.insightsCount > 3) score += 15;
    else if (metrics.insightsCount > 0) score += 10;

    // 어휘 분석 품질 (10점)
    if (metrics.vocabularyCount > 10) score += 10;
    else if (metrics.vocabularyCount > 5) score += 7;
    else if (metrics.vocabularyCount > 0) score += 5;

    return Math.min(100, score);
  }

  /**
   * 총 비용 추정
   */
  private static async estimateTotalCost(
    audioAnalysisResult: any,
    plannerId: string
  ): Promise<number> {
    try {
      // 실제 비용은 costMonitoringService에서 추적되므로
      // 여기서는 간단한 추정만 수행
      let estimatedCost = 0;

      // Azure Speech Service 비용 추정
      if (audioAnalysisResult.transcript) {
        const audioMinutes = Math.ceil(audioAnalysisResult.transcript.length / 150); // 대략적인 추정
        estimatedCost += audioMinutes * 50; // 분당 50원 추정
      }

      // OpenAI 비용 추정
      const estimatedTokens = 5000; // 평균 토큰 수
      estimatedCost += Math.ceil(estimatedTokens * 0.01); // 토큰당 0.01원 추정

      return estimatedCost;

    } catch (error) {
      logWithContext('warn', '비용 추정 실패', { error });
      return 0;
    }
  }

  /**
   * 개선 팁 생성
   */
  private static generateImprovementTips(pronunciationResult: any): string[] {
    const tips: string[] = [];

    if (pronunciationResult.pronunciationScore < 70) {
      tips.push('발음 연습: 모음과 자음의 정확한 발음에 집중하세요');
      tips.push('거울 보기: 거울을 보며 입모양을 확인하면서 연습하세요');
    }

    if (pronunciationResult.fluencyScore < 70) {
      tips.push('유창성 향상: 천천히 말하되 자연스러운 리듬을 유지하세요');
      tips.push('쉐도잉 연습: 원어민 오디오를 따라 말하는 연습을 하세요');
    }

    if (pronunciationResult.completenessScore < 70) {
      tips.push('완성도 향상: 문장의 마지막까지 명확하게 발음하세요');
      tips.push('호흡 연습: 충분한 호흡으로 문장을 완성하세요');
    }

    // 단어별 개선 팁
    if (pronunciationResult.wordLevelScores) {
      const lowScoreWords = pronunciationResult.wordLevelScores.filter((word: any) => word.score < 60);
      if (lowScoreWords.length > 0) {
        tips.push(`특별 연습 필요 단어: ${lowScoreWords.map((w: any) => w.word).slice(0, 3).join(', ')}`);
      }
    }

    return tips.length > 0 ? tips : ['전반적으로 좋은 발음입니다. 꾸준한 연습을 계속하세요!'];
  }
}

// 인스턴스 생성 및 내보내기
export const integratedAIService = {
  analyzeLesson: IntegratedAIService.analyzeLesson,
  evaluateRealTimePronunciation: IntegratedAIService.evaluateRealTimePronunciation,
  generatePersonalizedRecommendations: IntegratedAIService.generatePersonalizedRecommendations
};