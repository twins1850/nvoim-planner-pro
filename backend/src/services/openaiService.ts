import { OPENAI_CONFIG } from '../config/openai';
import { AppError, ErrorType } from '../middleware/errorHandler';
import { SpeakerSegment, StudentMetrics } from '../../../shared/types';
import { costMonitoringService } from './costMonitoringService';

/**
 * OpenAI API 통합 클래스
 */
export class OpenAIService {
  /**
   * 텍스트 생성 (Text Generation)
   */
  static async generateText(prompt: string, maxTokens: number = 1000): Promise<string> {
    try {
      const response = await OpenAIService.callOpenAI({
        model: OPENAI_CONFIG.MODEL,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: maxTokens
      });

      return response.choices[0]?.message?.content || '';
    } catch (error) {
      throw new AppError(
        '텍스트 생성 중 오류가 발생했습니다.',
        ErrorType.AI_SERVICE_ERROR,
        500,
        true,
        error
      );
    }
  }
  /**
   * 대화 분석 (Conversation Analysis)
   */
  static async analyzeConversation(
    speakerSegments: SpeakerSegment[]
  ): Promise<{
    lessonInsights: string[];
    improvementAreas: string[];
    generatedNotes: string;
  }> {
    try {
      // 대화 내용 추출
      const conversation = speakerSegments.map(segment => {
        return `${segment.speaker === 'teacher' ? '선생님' : '학생'}: ${segment.transcript}`;
      }).join('\n\n');

      // OpenAI API 요청
      const response = await this.callOpenAI({
        model: OPENAI_CONFIG.MODEL,
        messages: [
          {
            role: 'system',
            content: `당신은 영어 교육 전문가입니다. 영어 회화 수업의 대화를 분석하여 학생의 영어 실력, 강점, 개선점을 파악하고 유용한 인사이트를 제공해주세요.
            
            다음 형식으로 응답해주세요:
            
            # 수업 인사이트
            - 인사이트 1
            - 인사이트 2
            - 인사이트 3
            
            # 개선이 필요한 영역
            - 개선점 1
            - 개선점 2
            - 개선점 3
            
            # 수업 노트
            [수업 내용을 요약하고 중요 포인트를 정리한 노트]`
          },
          {
            role: 'user',
            content: `다음은 영어 회화 수업의 대화 내용입니다. 분석해주세요:\n\n${conversation}`
          }
        ],
        temperature: 0.7,
        max_tokens: 2000
      });

      // 응답 파싱
      const content = response.choices[0]?.message?.content || '';
      
      // 인사이트, 개선점, 노트 추출
      const insightsMatch = content.match(/# 수업 인사이트\s+([\s\S]*?)(?=# 개선이 필요한 영역|$)/);
      const areasMatch = content.match(/# 개선이 필요한 영역\s+([\s\S]*?)(?=# 수업 노트|$)/);
      const notesMatch = content.match(/# 수업 노트\s+([\s\S]*?)$/);
      
      const lessonInsights = insightsMatch ? 
        insightsMatch[1].split('\n').filter((line: string) => line.trim().startsWith('-')).map((line: string) => line.trim().substring(1).trim()) : 
        [];
      
      const improvementAreas = areasMatch ? 
        areasMatch[1].split('\n').filter((line: string) => line.trim().startsWith('-')).map((line: string) => line.trim().substring(1).trim()) : 
        [];
      
      const generatedNotes = notesMatch ? notesMatch[1].trim() : '';

      return {
        lessonInsights,
        improvementAreas,
        generatedNotes
      };
    } catch (error) {
      throw new AppError(
        '대화 분석 중 오류가 발생했습니다.',
        ErrorType.AI_SERVICE_ERROR,
        500,
        true,
        error
      );
    }
  }

  /**
   * 학생 성과 지표 계산 (Student Performance Metrics)
   */
  static async calculateStudentMetrics(
    speakerSegments: SpeakerSegment[],
    pronunciationScores?: { word: string; score: number; feedback: string }[]
  ): Promise<StudentMetrics> {
    try {
      // 학생 발화 세그먼트만 필터링
      const studentSegments = speakerSegments.filter(segment => segment.speaker === 'student');
      
      // 총 발화 시간 계산 (초 단위)
      const speakingTime = studentSegments.reduce((total, segment) => {
        return total + (segment.endTime - segment.startTime);
      }, 0);
      
      // 학생 발화 텍스트 추출
      const studentSpeech = studentSegments.map(segment => segment.transcript).join(' ');
      
      // 단어 사용 분석
      const words = studentSpeech.toLowerCase().match(/\b\w+\b/g) || [];
      const wordFrequency: Record<string, number> = {};
      
      words.forEach(word => {
        if (word.length > 1) { // 한 글자 단어 제외
          wordFrequency[word] = (wordFrequency[word] || 0) + 1;
        }
      });
      
      // 상위 사용 단어 추출
      const topWords = Object.entries(wordFrequency)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 20)
        .map(([word, frequency]) => ({
          word,
          frequency,
          correctUsage: true // 기본값, 실제로는 문맥 분석이 필요
        }));
      
      // 발음 정확도 계산 (제공된 경우)
      let pronunciationAccuracy = 0;
      if (pronunciationScores && pronunciationScores.length > 0) {
        pronunciationAccuracy = pronunciationScores.reduce((sum, item) => sum + item.score, 0) / pronunciationScores.length;
      } else {
        // 발음 점수가 없는 경우 신뢰도 기반으로 추정
        pronunciationAccuracy = studentSegments.reduce((sum, segment) => sum + segment.confidence * 100, 0) / studentSegments.length;
      }
      
      // 유창성 점수 추정 (발화 길이, 속도 등 기반)
      const wordsPerMinute = words.length / (speakingTime / 60);
      const fluencyScore = Math.min(100, Math.max(0, wordsPerMinute / 2)); // 간단한 추정, 실제로는 더 복잡한 계산 필요
      
      // 문법 정확도 추정 (실제로는 더 정교한 분석 필요)
      const grammarAccuracy = 70; // 기본값, 실제로는 문법 분석 필요
      
      return {
        speakingTime,
        pronunciationAccuracy,
        fluencyScore,
        vocabularyUsage: topWords,
        grammarAccuracy
      };
    } catch (error) {
      throw new AppError(
        '학생 성과 지표 계산 중 오류가 발생했습니다.',
        ErrorType.AI_SERVICE_ERROR,
        500,
        true,
        error
      );
    }
  }

  /**
   * 구조화된 수업 요약 생성 (Structured Lesson Summary)
   */
  static async generateStructuredSummary(
    speakerSegments: SpeakerSegment[],
    studentMetrics: StudentMetrics,
    lessonInsights: string[],
    improvementAreas: string[]
  ): Promise<{
    keyExpressions: string[];
    pronunciationPoints: string[];
    homeworkSuggestions: string[];
  }> {
    try {
      // 대화 내용 추출
      const conversation = speakerSegments.map(segment => {
        return `${segment.speaker === 'teacher' ? '선생님' : '학생'}: ${segment.transcript}`;
      }).join('\n\n');

      // 학생 메트릭 정보 추출
      const metricsInfo = `
      - 발화 시간: ${studentMetrics.speakingTime}초
      - 발음 정확도: ${studentMetrics.pronunciationAccuracy.toFixed(1)}점
      - 유창성 점수: ${studentMetrics.fluencyScore.toFixed(1)}점
      - 문법 정확도: ${studentMetrics.grammarAccuracy.toFixed(1)}점
      `;

      // OpenAI API 요청
      const response = await this.callOpenAI({
        model: OPENAI_CONFIG.MODEL,
        messages: [
          {
            role: 'system',
            content: `당신은 영어 교육 전문가입니다. 영어 회화 수업의 대화를 분석하여 구조화된 수업 요약을 생성해주세요.
            
            다음 형식으로 응답해주세요:
            
            # 오늘 배운 주요 표현
            - 표현 1 (한국어 의미)
            - 표현 2 (한국어 의미)
            - 표현 3 (한국어 의미)
            
            # 발음 교정 포인트
            - 발음 포인트 1
            - 발음 포인트 2
            - 발음 포인트 3
            
            # 숙제 연결 내용
            - 숙제 제안 1
            - 숙제 제안 2
            - 숙제 제안 3`
          },
          {
            role: 'user',
            content: `다음은 영어 회화 수업의 대화 내용과 학생 성과 지표, 수업 인사이트, 개선 영역입니다. 구조화된 수업 요약을 생성해주세요:
            
            ## 대화 내용
            ${conversation}
            
            ## 학생 성과 지표
            ${metricsInfo}
            
            ## 수업 인사이트
            ${lessonInsights.map(insight => `- ${insight}`).join('\n')}
            
            ## 개선 영역
            ${improvementAreas.map(area => `- ${area}`).join('\n')}`
          }
        ],
        temperature: 0.7,
        max_tokens: 1500
      });

      // 응답 파싱
      const content = response.choices[0]?.message?.content || '';
      
      // 주요 표현, 발음 포인트, 숙제 제안 추출
      const expressionsMatch = content.match(/# 오늘 배운 주요 표현\s+([\s\S]*?)(?=# 발음 교정 포인트|$)/);
      const pronunciationMatch = content.match(/# 발음 교정 포인트\s+([\s\S]*?)(?=# 숙제 연결 내용|$)/);
      const homeworkMatch = content.match(/# 숙제 연결 내용\s+([\s\S]*?)$/);
      
      const keyExpressions = expressionsMatch ? 
        expressionsMatch[1].split('\n').filter((line: string) => line.trim().startsWith('-')).map((line: string) => line.trim().substring(1).trim()) : 
        [];
      
      const pronunciationPoints = pronunciationMatch ? 
        pronunciationMatch[1].split('\n').filter((line: string) => line.trim().startsWith('-')).map((line: string) => line.trim().substring(1).trim()) : 
        [];
      
      const homeworkSuggestions = homeworkMatch ? 
        homeworkMatch[1].split('\n').filter((line: string) => line.trim().startsWith('-')).map((line: string) => line.trim().substring(1).trim()) : 
        [];

      return {
        keyExpressions,
        pronunciationPoints,
        homeworkSuggestions
      };
    } catch (error) {
      throw new AppError(
        '구조화된 수업 요약 생성 중 오류가 발생했습니다.',
        ErrorType.AI_SERVICE_ERROR,
        500,
        true,
        error
      );
    }
  }

  /**
   * 교사 피드백 추출 (Teacher Feedback Extraction)
   */
  static async extractTeacherFeedback(
    speakerSegments: SpeakerSegment[]
  ): Promise<{
    corrections: { original: string; corrected: string; explanation: string }[];
    suggestions: string[];
    praises: string[];
  }> {
    try {
      // 교사 발화 세그먼트만 필터링
      const teacherSegments = speakerSegments.filter(segment => segment.speaker === 'teacher');
      
      // 교사 발화 텍스트 추출
      const teacherSpeech = teacherSegments.map(segment => segment.transcript).join('\n\n');
      
      // 학생 발화 세그먼트만 필터링
      const studentSegments = speakerSegments.filter(segment => segment.speaker === 'student');
      
      // 학생 발화 텍스트 추출
      const studentSpeech = studentSegments.map(segment => segment.transcript).join('\n\n');
      
      // 대화 컨텍스트 구성
      const conversationContext = speakerSegments.map((segment, index) => {
        const prevSegment = index > 0 ? speakerSegments[index - 1] : null;
        
        // 학생 발화 후 교사 발화인 경우 (교정 가능성 높음)
        if (segment.speaker === 'teacher' && prevSegment && prevSegment.speaker === 'student') {
          return `[학생] ${prevSegment.transcript}\n[선생님] ${segment.transcript}`;
        }
        
        return null;
      }).filter(Boolean).join('\n\n');

      // OpenAI API 요청
      const response = await this.callOpenAI({
        model: OPENAI_CONFIG.MODEL,
        messages: [
          {
            role: 'system',
            content: `당신은 영어 교육 전문가입니다. 영어 회화 수업에서 교사가 제공한 피드백을 분석하여 교정, 제안, 칭찬으로 분류해주세요.
            
            다음 형식으로 응답해주세요:
            
            # 교정 사항
            - 원문: [학생이 말한 원래 표현]
              교정: [교사가 교정한 표현]
              설명: [교정에 대한 설명]
            
            # 제안 사항
            - [교사가 제안한 내용]
            
            # 칭찬 사항
            - [교사가 칭찬한 내용]`
          },
          {
            role: 'user',
            content: `다음은 영어 회화 수업의 대화 컨텍스트입니다. 교사의 피드백을 분석해주세요:
            
            ## 학생 발화
            ${studentSpeech}
            
            ## 교사 발화
            ${teacherSpeech}
            
            ## 대화 컨텍스트 (학생 발화 후 교사 응답)
            ${conversationContext}`
          }
        ],
        temperature: 0.7,
        max_tokens: 1500
      });

      // 응답 파싱
      const content = response.choices[0]?.message?.content || '';
      
      // 교정, 제안, 칭찬 추출
      const correctionsMatch = content.match(/# 교정 사항\s+([\s\S]*?)(?=# 제안 사항|$)/);
      const suggestionsMatch = content.match(/# 제안 사항\s+([\s\S]*?)(?=# 칭찬 사항|$)/);
      const praisesMatch = content.match(/# 칭찬 사항\s+([\s\S]*?)$/);
      
      // 교정 사항 파싱
      const correctionsText = correctionsMatch ? correctionsMatch[1] : '';
      const correctionItems = correctionsText.split(/\n\s*-\s*/).filter(Boolean);
      
      const corrections = correctionItems.map((item: string) => {
        const originalMatch = item.match(/원문:\s*(.+?)(?=\s*교정:|$)/);
        const correctedMatch = item.match(/교정:\s*(.+?)(?=\s*설명:|$)/);
        const explanationMatch = item.match(/설명:\s*(.+?)$/);
        
        return {
          original: originalMatch ? originalMatch[1].trim() : '',
          corrected: correctedMatch ? correctedMatch[1].trim() : '',
          explanation: explanationMatch ? explanationMatch[1].trim() : ''
        };
      }).filter((c: any) => c.original && c.corrected);
      
      // 제안 사항 파싱
      const suggestions = suggestionsMatch ? 
        suggestionsMatch[1].split('\n').filter((line: string) => line.trim().startsWith('-')).map((line: string) => line.trim().substring(1).trim()) : 
        [];
      
      // 칭찬 사항 파싱
      const praises = praisesMatch ? 
        praisesMatch[1].split('\n').filter((line: string) => line.trim().startsWith('-')).map((line: string) => line.trim().substring(1).trim()) : 
        [];

      return {
        corrections,
        suggestions,
        praises
      };
    } catch (error) {
      throw new AppError(
        '교사 피드백 추출 중 오류가 발생했습니다.',
        ErrorType.AI_SERVICE_ERROR,
        500,
        true,
        error
      );
    }
  }

  /**
   * 수업 내용 분류 (Lesson Content Categorization)
   */
  static async categorizeContent(
    speakerSegments: SpeakerSegment[]
  ): Promise<{
    topics: string[];
    vocabulary: { word: string; meaning: string; example: string }[];
    grammar: { pattern: string; explanation: string; example: string }[];
    culturalNotes: string[];
  }> {
    try {
      // 대화 내용 추출
      const conversation = speakerSegments.map(segment => {
        return `${segment.speaker === 'teacher' ? '선생님' : '학생'}: ${segment.transcript}`;
      }).join('\n\n');

      // OpenAI API 요청
      const response = await this.callOpenAI({
        model: OPENAI_CONFIG.MODEL,
        messages: [
          {
            role: 'system',
            content: `당신은 영어 교육 전문가입니다. 영어 회화 수업의 대화를 분석하여 주제, 어휘, 문법, 문화적 요소로 분류해주세요.
            
            다음 형식으로 응답해주세요:
            
            # 주요 주제
            - 주제 1
            - 주제 2
            
            # 핵심 어휘
            - 단어: [영어 단어]
              의미: [한국어 의미]
              예문: [예문]
            
            # 문법 패턴
            - 패턴: [문법 패턴]
              설명: [설명]
              예문: [예문]
            
            # 문화적 요소
            - [문화적 요소에 대한 설명]`
          },
          {
            role: 'user',
            content: `다음은 영어 회화 수업의 대화 내용입니다. 분석해주세요:\n\n${conversation}`
          }
        ],
        temperature: 0.7,
        max_tokens: 2000
      });

      // 응답 파싱
      const content = response.choices[0]?.message?.content || '';
      
      // 주제, 어휘, 문법, 문화적 요소 추출
      const topicsMatch = content.match(/# 주요 주제\s+([\s\S]*?)(?=# 핵심 어휘|$)/);
      const vocabularyMatch = content.match(/# 핵심 어휘\s+([\s\S]*?)(?=# 문법 패턴|$)/);
      const grammarMatch = content.match(/# 문법 패턴\s+([\s\S]*?)(?=# 문화적 요소|$)/);
      const culturalMatch = content.match(/# 문화적 요소\s+([\s\S]*?)$/);
      
      // 주제 파싱
      const topics = topicsMatch ? 
        topicsMatch[1].split('\n').filter((line: string) => line.trim().startsWith('-')).map((line: string) => line.trim().substring(1).trim()) : 
        [];
      
      // 어휘 파싱
      const vocabularyText = vocabularyMatch ? vocabularyMatch[1] : '';
      const vocabularyItems = vocabularyText.split(/\n\s*-\s*/).filter(Boolean);
      
      const vocabulary = vocabularyItems.map((item: string) => {
        const wordMatch = item.match(/단어:\s*(.+?)(?=\s*의미:|$)/);
        const meaningMatch = item.match(/의미:\s*(.+?)(?=\s*예문:|$)/);
        const exampleMatch = item.match(/예문:\s*(.+?)$/);
        
        return {
          word: wordMatch ? wordMatch[1].trim() : '',
          meaning: meaningMatch ? meaningMatch[1].trim() : '',
          example: exampleMatch ? exampleMatch[1].trim() : ''
        };
      }).filter((v: any) => v.word && v.meaning);
      
      // 문법 파싱
      const grammarText = grammarMatch ? grammarMatch[1] : '';
      const grammarItems = grammarText.split(/\n\s*-\s*/).filter(Boolean);
      
      const grammar = grammarItems.map((item: string) => {
        const patternMatch = item.match(/패턴:\s*(.+?)(?=\s*설명:|$)/);
        const explanationMatch = item.match(/설명:\s*(.+?)(?=\s*예문:|$)/);
        const exampleMatch = item.match(/예문:\s*(.+?)$/);
        
        return {
          pattern: patternMatch ? patternMatch[1].trim() : '',
          explanation: explanationMatch ? explanationMatch[1].trim() : '',
          example: exampleMatch ? exampleMatch[1].trim() : ''
        };
      }).filter((g: any) => g.pattern && g.explanation);
      
      // 문화적 요소 파싱
      const culturalNotes = culturalMatch ? 
        culturalMatch[1].split('\n').filter((line: string) => line.trim().startsWith('-')).map((line: string) => line.trim().substring(1).trim()) : 
        [];

      return {
        topics,
        vocabulary,
        grammar,
        culturalNotes
      };
    } catch (error) {
      throw new AppError(
        '수업 내용 분류 중 오류가 발생했습니다.',
        ErrorType.AI_SERVICE_ERROR,
        500,
        true,
        error
      );
    }
  }

  /**
   * OpenAI API 호출 함수
   */
  private static async callOpenAI(params: {
    model: string;
    messages: Array<{ role: string; content: string }>;
    temperature?: number;
    max_tokens?: number;
    plannerId?: string;
  }): Promise<any> {
    try {
      // API 요청 시작 시간 기록
      const startTime = Date.now();
      
      // 토큰 수 추정 (입력)
      const inputTokens = params.messages.reduce((total, msg) => {
        // 대략적인 토큰 수 추정: 영어 기준 1토큰 ≈ 4자, 한국어 기준 1토큰 ≈ 2자
        return total + Math.ceil(msg.content.length / 3);
      }, 0);
      
      const response = await fetch(OPENAI_CONFIG.ENDPOINTS.CHAT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${OPENAI_CONFIG.API_KEY}`
        },
        body: JSON.stringify({
          model: params.model,
          messages: params.messages,
          temperature: params.temperature || OPENAI_CONFIG.LIMITS.TEMPERATURE,
          max_tokens: params.max_tokens || OPENAI_CONFIG.LIMITS.MAX_TOKENS
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`OpenAI API 오류: ${response.status} - ${JSON.stringify(errorData)}`);
      }
      
      const responseData = await response.json();
      
      // API 요청 완료 시간 기록
      const endTime = Date.now();
      const requestDuration = endTime - startTime;
      
      // 실제 사용된 토큰 수 (응답에서 제공되는 경우)
      const promptTokens = (responseData as any).usage?.prompt_tokens || inputTokens;
      const completionTokens = (responseData as any).usage?.completion_tokens || Math.ceil((responseData as any).choices[0]?.message?.content?.length / 3) || 0;
      const totalTokens = promptTokens + completionTokens;
      
      // 비용 계산 (모델별 가격 적용)
      let costPerInputToken = 0;
      let costPerOutputToken = 0;
      
      // GPT-4o 모델 가격 (2024년 7월 기준)
      if (params.model.includes('gpt-4o')) {
        costPerInputToken = 5 / 1000000; // $5 per 1M tokens
        costPerOutputToken = 15 / 1000000; // $15 per 1M tokens
      } 
      // GPT-4 모델 가격
      else if (params.model.includes('gpt-4')) {
        costPerInputToken = 30 / 1000000; // $30 per 1M tokens
        costPerOutputToken = 60 / 1000000; // $60 per 1M tokens
      } 
      // GPT-3.5 모델 가격
      else if (params.model.includes('gpt-3.5')) {
        costPerInputToken = 0.5 / 1000000; // $0.5 per 1M tokens
        costPerOutputToken = 1.5 / 1000000; // $1.5 per 1M tokens
      }
      
      // 달러 기준 비용 계산
      const inputCost = promptTokens * costPerInputToken;
      const outputCost = completionTokens * costPerOutputToken;
      const totalCostUSD = inputCost + outputCost;
      
      // 원화 환산 (대략 1 USD = 1,300 KRW로 계산)
      const exchangeRate = 1300;
      const totalCostKRW = Math.round(totalCostUSD * exchangeRate);
      
      // 사용량 추적 (plannerId가 제공된 경우)
      if (params.plannerId) {
        try {
          await costMonitoringService.trackOpenAIUsage(
            params.plannerId,
            'chat-completion',
            totalTokens,
            totalCostKRW,
            {
              model: params.model,
              promptTokens,
              completionTokens,
              requestDuration,
              endpoint: 'chat/completions'
            }
          );
        } catch (trackingError) {
          // 사용량 추적 실패는 API 응답에 영향을 주지 않도록 함
          console.error('API 사용량 추적 실패:', trackingError);
        }
      }
      
      return responseData;
    } catch (error) {
      throw new AppError(
        'OpenAI API 호출 중 오류가 발생했습니다.',
        ErrorType.EXTERNAL_API_ERROR,
        500,
        true,
        error
      );
    }
  }

  /**
   * 재시도 로직이 포함된 API 호출
   */
  static async callWithRetry<T>(
    apiCall: () => Promise<T>,
    maxRetries: number = OPENAI_CONFIG.RETRY.MAX_RETRIES
  ): Promise<T> {
    // 서킷 브레이커 가져오기
    const { CircuitBreakerRegistry } = await import('../utils/circuitBreaker');
    const breaker = CircuitBreakerRegistry.getBreaker('openai', {
      failureThreshold: 3,
      resetTimeout: 60000, // 1분
      monitoringPeriod: 300000 // 5분
    });
    
    // 재시도 유틸리티 가져오기
    const { retry } = await import('../utils/retry');
    const { logWithContext } = await import('../utils/logger');
    
    try {
      // 서킷 브레이커로 API 호출 래핑
      return await breaker.execute(async () => {
        // 재시도 로직으로 API 호출 래핑
        return await retry(apiCall, {
          maxRetries,
          initialDelayMs: OPENAI_CONFIG.RETRY.INITIAL_DELAY_MS,
          maxDelayMs: OPENAI_CONFIG.RETRY.MAX_DELAY_MS,
          backoffFactor: 2,
          retryableErrors: [
            /rate limit/i,
            /timeout/i,
            /connection/i,
            /network/i,
            /5\d\d/,  // 5xx 에러
            /too many requests/i
          ],
          onRetry: (error, attempt, delay) => {
            logWithContext('warn', `OpenAI API 호출 실패, ${attempt}번째 재시도 (${Math.round(delay)}ms 후)`, {
              error: error.message,
              attempt,
              delay: Math.round(delay)
            });
          }
        });
      });
    } catch (error) {
      // 폴백 서비스 가져오기
      const { fallbackService } = await import('./fallbackService');
      
      logWithContext('error', 'OpenAI API 호출 최종 실패, 폴백 서비스로 전환', {
        error: error instanceof Error ? error.message : String(error)
      });
      
      throw new AppError(
        `OpenAI API 호출 실패: ${error instanceof Error ? error.message : String(error)}`,
        ErrorType.EXTERNAL_API_ERROR,
        500,
        true,
        error
      );
    }
  }
}

// Create an instance of the OpenAI service for export
export const openaiService = {
  generateText: OpenAIService.generateText,
  analyzeConversation: OpenAIService.analyzeConversation,
  calculateStudentMetrics: OpenAIService.calculateStudentMetrics,
  generateStructuredSummary: OpenAIService.generateStructuredSummary,
  extractTeacherFeedback: OpenAIService.extractTeacherFeedback,
  categorizeContent: OpenAIService.categorizeContent,
  callWithRetry: OpenAIService.callWithRetry
};