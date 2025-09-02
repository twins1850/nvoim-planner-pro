import { logWithContext } from '../utils/logger';
import { SpeakerSegment, StudentMetrics } from '../../shared/types';

/**
 * 폴백 서비스 - AI 서비스 장애 시 기본 분석 제공
 */
export class FallbackService {
  /**
   * 기본 대화 분석 제공
   * OpenAI 서비스 장애 시 사용
   */
  static generateBasicConversationAnalysis(speakerSegments: SpeakerSegment[]): {
    lessonInsights: string[];
    improvementAreas: string[];
    generatedNotes: string;
  } {
    logWithContext('info', '폴백 서비스: 기본 대화 분석 생성');
    
    // 학생 발화 세그먼트만 필터링
    const studentSegments = speakerSegments.filter(segment => segment.speaker === 'student');
    
    // 교사 발화 세그먼트만 필터링
    const teacherSegments = speakerSegments.filter(segment => segment.speaker === 'teacher');
    
    // 학생 발화 시간 계산
    const studentSpeakingTime = studentSegments.reduce((total, segment) => {
      return total + (segment.endTime - segment.startTime);
    }, 0);
    
    // 총 대화 시간 계산
    const totalConversationTime = speakerSegments.reduce((total, segment) => {
      return total + (segment.endTime - segment.startTime);
    }, 0);
    
    // 학생 참여도 계산 (%)
    const participationRate = totalConversationTime > 0 
      ? (studentSpeakingTime / totalConversationTime) * 100 
      : 0;
    
    // 학생 발화 텍스트 추출
    const studentSpeech = studentSegments.map(segment => segment.transcript).join(' ');
    
    // 단어 수 계산
    const wordCount = studentSpeech.split(/\s+/).filter(Boolean).length;
    
    // 평균 신뢰도 계산
    const avgConfidence = studentSegments.length > 0
      ? studentSegments.reduce((sum, segment) => sum + segment.confidence, 0) / studentSegments.length
      : 0;
    
    // 기본 인사이트 생성
    const lessonInsights = [
      `학생 발화 시간: ${Math.round(studentSpeakingTime)} 초 (전체 대화의 ${Math.round(participationRate)}%)`,
      `학생이 사용한 단어 수: ${wordCount} 단어`,
      `평균 발화 신뢰도: ${Math.round(avgConfidence * 100)}%`
    ];
    
    // 기본 개선 영역 생성
    const improvementAreas = [
      '발화 신뢰도 향상을 위한 발음 연습 필요',
      '더 많은 대화 참여 권장',
      '다양한 어휘 사용 연습 필요'
    ];
    
    // 기본 수업 노트 생성
    const generatedNotes = `
# 기본 수업 요약 (AI 서비스 장애로 인한 기본 분석)

## 학생 참여 정보
- 총 대화 시간: ${Math.round(totalConversationTime)} 초
- 학생 발화 시간: ${Math.round(studentSpeakingTime)} 초 (${Math.round(participationRate)}%)
- 교사 발화 시간: ${Math.round(totalConversationTime - studentSpeakingTime)} 초
- 학생 발화 횟수: ${studentSegments.length} 회
- 교사 발화 횟수: ${teacherSegments.length} 회

## 학생 발화 분석
- 사용 단어 수: ${wordCount} 단어
- 평균 발화 신뢰도: ${Math.round(avgConfidence * 100)}%

## 권장 사항
- 발음 연습을 통한 발화 신뢰도 향상
- 더 많은 대화 참여 유도
- 다양한 어휘 사용 연습
    `;
    
    return {
      lessonInsights,
      improvementAreas,
      generatedNotes
    };
  }

  /**
   * 기본 구조화된 수업 요약 생성
   * OpenAI 서비스 장애 시 사용
   */
  static generateBasicStructuredSummary(
    speakerSegments: SpeakerSegment[],
    studentMetrics: StudentMetrics
  ): {
    keyExpressions: string[];
    pronunciationPoints: string[];
    homeworkSuggestions: string[];
  } {
    logWithContext('info', '폴백 서비스: 기본 구조화된 수업 요약 생성');
    
    // 교사 발화 세그먼트만 필터링
    const teacherSegments = speakerSegments.filter(segment => segment.speaker === 'teacher');
    
    // 교사 발화 텍스트 추출
    const teacherSpeech = teacherSegments.map(segment => segment.transcript).join(' ');
    
    // 단어 추출 (4글자 이상 단어만)
    const words = teacherSpeech.match(/\b\w{4,}\b/g) || [];
    
    // 단어 빈도 계산
    const wordFrequency: Record<string, number> = {};
    words.forEach(word => {
      wordFrequency[word] = (wordFrequency[word] || 0) + 1;
    });
    
    // 가장 많이 사용된 단어 추출 (최대 5개)
    const topWords = Object.entries(wordFrequency)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([word]) => word);
    
    // 기본 주요 표현 생성
    const keyExpressions = [
      '기본 표현 1 (AI 서비스 장애로 인한 기본 분석)',
      '기본 표현 2 (AI 서비스 장애로 인한 기본 분석)',
      ...topWords.map(word => `"${word}" 관련 표현 (자주 사용된 단어)`),
    ];
    
    // 기본 발음 포인트 생성
    const pronunciationPoints = [
      '발음 정확도 향상을 위한 연습 필요',
      '문장의 강세와 억양에 주의',
      '유사한 발음의 단어 구분 연습'
    ];
    
    // 기본 숙제 제안 생성
    const homeworkSuggestions = [
      '오늘 배운 표현을 활용한 문장 5개 만들기',
      '주요 단어의 발음 연습하고 녹음하기',
      '관련 주제로 1분 스피치 준비하기'
    ];
    
    return {
      keyExpressions,
      pronunciationPoints,
      homeworkSuggestions
    };
  }

  /**
   * 기본 발음 평가 결과 생성
   * Azure Speech Service 장애 시 사용
   */
  static generateBasicPronunciationAssessment(audioLength: number): {
    overallScore: number;
    pronunciationScore: number;
    completenessScore: number;
    fluencyScore: number;
    wordLevelScores: Array<{
      word: string;
      score: number;
      errorType?: string;
    }>;
  } {
    logWithContext('info', '폴백 서비스: 기본 발음 평가 생성');
    
    // 기본 점수 (중간 점수)
    const baseScore = 70;
    
    // 오디오 길이에 따른 완성도 점수 조정 (길수록 높게)
    const completenessAdjustment = Math.min(15, Math.max(-15, (audioLength - 30) / 2));
    
    return {
      overallScore: baseScore,
      pronunciationScore: baseScore - 5,
      completenessScore: baseScore + completenessAdjustment,
      fluencyScore: baseScore - 10,
      wordLevelScores: [
        { word: '(기본 평가)', score: baseScore, errorType: 'None' }
      ]
    };
  }

  /**
   * 기본 학생 메트릭스 계산
   * AI 서비스 장애 시 사용
   */
  static calculateBasicStudentMetrics(
    speakerSegments: SpeakerSegment[]
  ): StudentMetrics {
    logWithContext('info', '폴백 서비스: 기본 학생 메트릭스 계산');
    
    // 학생 발화 세그먼트만 필터링
    const studentSegments = speakerSegments.filter(segment => segment.speaker === 'student');
    
    // 총 발화 시간 계산 (초 단위)
    const speakingTime = studentSegments.reduce((total, segment) => {
      return total + (segment.endTime - segment.startTime);
    }, 0);
    
    // 학생 발화 텍스트 추출
    const studentSpeech = studentSegments.map(segment => segment.transcript).join(' ');
    
    // 단어 추출
    const words = studentSpeech.toLowerCase().match(/\b\w+\b/g) || [];
    
    // 단어 빈도 계산
    const wordFrequency: Record<string, number> = {};
    words.forEach(word => {
      if (word.length > 1) { // 한 글자 단어 제외
        wordFrequency[word] = (wordFrequency[word] || 0) + 1;
      }
    });
    
    // 상위 사용 단어 추출
    const topWords = Object.entries(wordFrequency)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([word, frequency]) => ({
        word,
        frequency,
        correctUsage: true // 기본값
      }));
    
    // 평균 신뢰도 기반 발음 정확도 추정
    const pronunciationAccuracy = studentSegments.length > 0
      ? studentSegments.reduce((sum, segment) => sum + segment.confidence * 100, 0) / studentSegments.length
      : 70; // 기본값
    
    // 유창성 점수 추정 (발화 길이, 속도 등 기반)
    const wordsPerMinute = words.length / (speakingTime / 60 || 1);
    const fluencyScore = Math.min(100, Math.max(0, wordsPerMinute / 2)); // 간단한 추정
    
    // 문법 정확도 추정 (기본값)
    const grammarAccuracy = 70;
    
    return {
      speakingTime,
      pronunciationAccuracy,
      fluencyScore,
      vocabularyUsage: topWords,
      grammarAccuracy
    };
  }
}

// Export singleton instance
export const fallbackService = {
  generateBasicConversationAnalysis: FallbackService.generateBasicConversationAnalysis,
  generateBasicStructuredSummary: FallbackService.generateBasicStructuredSummary,
  generateBasicPronunciationAssessment: FallbackService.generateBasicPronunciationAssessment,
  calculateBasicStudentMetrics: FallbackService.calculateBasicStudentMetrics
};