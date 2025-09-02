import { Types } from 'mongoose';
import { AzureSpeechService } from './azureSpeechService';
import { openaiService } from './openaiService';
import { fileService } from './fileService';
import { homeworkSubmissionService } from './homeworkSubmissionService';
import HomeworkSubmission from '../models/HomeworkSubmission';
import Homework from '../models/Homework';
import { AppError, ErrorType } from '../middleware/errorHandler';
import { AIEvaluation, SubmissionAnswer } from '../../../shared/types';
import path from 'path';
import fs from 'fs';
import { promisify } from 'util';
import * as sdk from 'microsoft-cognitiveservices-speech-sdk';
import { AZURE_SPEECH_CONFIG } from '../config/azure';

const mkdirAsync = promisify(fs.mkdir);
const unlinkAsync = promisify(fs.unlink);

/**
 * Service for AI-based homework evaluation
 */
export class HomeworkEvaluationService {
  /**
   * Evaluate a homework submission using AI services
   * @param submissionId The ID of the submission to evaluate
   */
  async evaluateSubmission(submissionId: string): Promise<AIEvaluation> {
    try {
      // Get the submission
      const submission = await HomeworkSubmission.findById(submissionId);
      if (!submission) {
        throw new AppError(
          '제출물을 찾을 수 없습니다.',
          ErrorType.VALIDATION_ERROR,
          404
        );
      }

      // Get the homework
      const homework = await Homework.findById(submission.homeworkId);
      if (!homework) {
        throw new AppError(
          '숙제를 찾을 수 없습니다.',
          ErrorType.VALIDATION_ERROR,
          404
        );
      }

      // Initialize evaluation result
      const evaluation: AIEvaluation = {
        overallScore: 0,
        strengths: [],
        improvementAreas: [],
        generatedAt: new Date().toISOString()
      };

      // Process each answer
      const evaluationPromises = submission.answers.map(async (answer) => {
        const question = homework.content.questions.find(q => q.id === answer.questionId);
        if (!question) return null;

        // Evaluate based on answer type
        if (answer.type === 'audio') {
          return this.evaluateAudioAnswer(answer, question, evaluation);
        } else if (answer.type === 'text') {
          return this.evaluateTextAnswer(answer, question, evaluation);
        } else if (answer.type === 'choice') {
          return this.evaluateChoiceAnswer(answer, question, evaluation);
        }
        return null;
      });

      // Wait for all evaluations to complete
      await Promise.all(evaluationPromises.filter(Boolean));

      // Calculate overall score (average of all scores)
      let totalScore = 0;
      let scoreCount = 0;

      if (evaluation.pronunciationScore) {
        totalScore += evaluation.pronunciationScore.overallScore;
        scoreCount++;
      }

      if (evaluation.grammarCorrections && evaluation.grammarCorrections.length > 0) {
        // Calculate grammar score based on number of corrections
        const grammarScore = Math.max(0, 100 - (evaluation.grammarCorrections.length * 5));
        totalScore += grammarScore;
        scoreCount++;
      }

      evaluation.overallScore = scoreCount > 0 ? Math.round(totalScore / scoreCount) : 70;

      // Update submission with evaluation
      submission.aiEvaluation = evaluation;
      submission.status = 'ai_evaluated';
      await submission.save();

      return evaluation;
    } catch (error) {
      console.error('Error evaluating submission:', error);
      throw new AppError(
        '제출물 평가 중 오류가 발생했습니다.',
        ErrorType.AI_SERVICE_ERROR,
        500,
        true,
        error
      );
    }
  }

  /**
   * Evaluate an audio answer using Azure Speech Service
   */
  private async evaluateAudioAnswer(
    answer: SubmissionAnswer,
    question: any,
    evaluation: AIEvaluation
  ): Promise<void> {
    try {
      const fileRef = answer.content as any;
      if (!fileRef || !fileRef.s3Key) {
        throw new Error('오디오 파일 정보가 없습니다.');
      }

      // Create temp directory if it doesn't exist
      const tempDir = path.join(process.cwd(), 'temp');
      if (!fs.existsSync(tempDir)) {
        await mkdirAsync(tempDir, { recursive: true });
      }

      // Download file from S3
      const tempFilePath = path.join(tempDir, fileRef.filename);
      await fileService.downloadFileFromS3(fileRef.s3Key, tempFilePath);

      // Get reference text from question
      const referenceText = question.targetAnswer || '';

      try {
        // Use Azure Speech Service for pronunciation assessment
        const pronunciationResult = await this.evaluatePronunciationFromFile(
          tempFilePath,
          referenceText
        );

        // Map Azure result to our format
        evaluation.pronunciationScore = {
          overallScore: pronunciationResult.overallScore,
          wordScores: pronunciationResult.wordLevelScores.map(item => ({
            word: item.word,
            score: item.score
          })),
          feedback: this.generatePronunciationFeedback(pronunciationResult)
        };

        // Add strengths and improvement areas based on pronunciation scores
        if (pronunciationResult.overallScore >= 80) {
          evaluation.strengths.push('발음이 정확하고 자연스럽습니다.');
        } else if (pronunciationResult.overallScore >= 60) {
          evaluation.strengths.push('전반적인 발음이 이해하기 쉽습니다.');
          evaluation.improvementAreas.push('일부 단어의 발음을 개선하면 더 자연스러워질 것입니다.');
        } else {
          evaluation.improvementAreas.push('발음 정확도를 높이기 위한 연습이 필요합니다.');
        }

        // Add fluency-related feedback
        if (pronunciationResult.fluencyScore >= 80) {
          evaluation.strengths.push('말의 흐름이 자연스럽고 유창합니다.');
        } else if (pronunciationResult.fluencyScore >= 60) {
          evaluation.improvementAreas.push('더 자연스러운 말의 흐름을 위해 연습이 필요합니다.');
        } else {
          evaluation.improvementAreas.push('문장 사이의 끊김 없이 더 유창하게 말하는 연습이 필요합니다.');
        }
      } catch (error) {
        console.error('Azure Speech Service error:', error);
        // Fallback to basic evaluation
        evaluation.pronunciationScore = {
          overallScore: 70, // Default score
          wordScores: [],
          feedback: '발음 평가 중 오류가 발생했습니다. 기본 점수가 적용되었습니다.'
        };
        evaluation.improvementAreas.push('발음 평가를 위해 다시 제출해 주세요.');
      }

      // Clean up temp file
      if (fs.existsSync(tempFilePath)) {
        await unlinkAsync(tempFilePath);
      }
    } catch (error) {
      console.error('Error evaluating audio answer:', error);
      throw error;
    }
  }

  /**
   * Evaluate pronunciation directly from a file path
   * This is a simplified version of AzureSpeechService.evaluatePronunciation
   * that works directly with file paths
   */
  private async evaluatePronunciationFromFile(
    filePath: string,
    referenceText: string
  ): Promise<{
    overallScore: number;
    pronunciationScore: number;
    completenessScore: number;
    fluencyScore: number;
    wordLevelScores: Array<{
      word: string;
      score: number;
      errorType?: string;
    }>;
  }> {
    try {
      if (!fs.existsSync(filePath)) {
        throw new Error(`File not found: ${filePath}`);
      }

      // Azure Speech SDK 설정
      const speechConfig = sdk.SpeechConfig.fromSubscription(
        AZURE_SPEECH_CONFIG.SUBSCRIPTION_KEY,
        AZURE_SPEECH_CONFIG.REGION
      );
      
      // 언어 설정
      speechConfig.speechRecognitionLanguage = AZURE_SPEECH_CONFIG.LANGUAGE;
      
      // 오디오 설정
      const audioConfig = sdk.AudioConfig.fromWavFileInput(fs.readFileSync(filePath));
      
      // 발음 평가 설정
      const pronunciationAssessmentConfig = new sdk.PronunciationAssessmentConfig(
        referenceText,
        sdk.PronunciationAssessmentGradingSystem.HundredMark,
        sdk.PronunciationAssessmentGranularity.Word,
        true
      );
      
      // 음성 인식기 생성
      const recognizer = new sdk.SpeechRecognizer(speechConfig, audioConfig);
      
      // 발음 평가 적용
      pronunciationAssessmentConfig.applyTo(recognizer);
      
      // 발음 평가 실행
      return await this.assessPronunciation(recognizer);
    } catch (error) {
      console.error('Error evaluating pronunciation from file:', error);
      throw new AppError(
        '발음 평가 중 오류가 발생했습니다.',
        ErrorType.AI_SERVICE_ERROR,
        500,
        true,
        error
      );
    }
  }

  /**
   * Execute pronunciation assessment
   */
  private assessPronunciation(recognizer: sdk.SpeechRecognizer): Promise<{
    overallScore: number;
    pronunciationScore: number;
    completenessScore: number;
    fluencyScore: number;
    wordLevelScores: Array<{
      word: string;
      score: number;
      errorType?: string;
    }>;
  }> {
    return new Promise((resolve, reject) => {
      recognizer.recognizeOnceAsync(
        (result) => {
          if (result.reason === sdk.ResultReason.RecognizedSpeech) {
            const pronunciationAssessmentResult = sdk.PronunciationAssessmentResult.fromResult(result);
            
            // 단어 수준 점수 추출
            const wordLevelScores = pronunciationAssessmentResult.detailResult.Words.map(word => ({
              word: word.Word,
              score: word.PronunciationAssessment.AccuracyScore,
              errorType: word.PronunciationAssessment.ErrorType
            }));
            
            resolve({
              overallScore: pronunciationAssessmentResult.accuracyScore,
              pronunciationScore: pronunciationAssessmentResult.pronunciationScore,
              completenessScore: pronunciationAssessmentResult.completenessScore,
              fluencyScore: pronunciationAssessmentResult.fluencyScore,
              wordLevelScores
            });
          } else {
            reject(new Error(`발음 평가 실패: ${result.reason}`));
          }
        },
        (err) => reject(err)
      );
    });
  }

  /**
   * Evaluate a text answer using OpenAI
   */
  private async evaluateTextAnswer(
    answer: SubmissionAnswer,
    question: any,
    evaluation: AIEvaluation
  ): Promise<void> {
    try {
      const text = answer.content as string;
      if (!text || typeof text !== 'string') {
        throw new Error('텍스트 내용이 없습니다.');
      }

      // Get reference text from question if available
      const referenceText = question.targetAnswer || '';

      try {
        // Use OpenAI for grammar correction and vocabulary assessment
        const prompt = `
다음 영어 텍스트를 평가해주세요. 문법 오류를 찾고, 어휘 사용을 평가하고, 개선점을 제안해주세요.

${referenceText ? `참고 답변: ${referenceText}` : ''}

학생 답변: ${text}

다음 형식으로 응답해주세요:

# 문법 교정
- 원문: [원래 표현]
  교정: [교정된 표현]
  설명: [교정 이유]

# 어휘 평가
- 사용된 단어: [주요 단어 목록]
- 추천 단어: [대체 가능한 더 적절한 단어들]
- 수준: [beginner/intermediate/advanced]

# 강점
- [강점 1]
- [강점 2]

# 개선점
- [개선점 1]
- [개선점 2]
`;

        const response = await openaiService.generateText(prompt);
        
        // Parse the response
        const grammarMatch = response.match(/# 문법 교정\s+([\s\S]*?)(?=# 어휘 평가|$)/);
        const vocabMatch = response.match(/# 어휘 평가\s+([\s\S]*?)(?=# 강점|$)/);
        const strengthsMatch = response.match(/# 강점\s+([\s\S]*?)(?=# 개선점|$)/);
        const improvementsMatch = response.match(/# 개선점\s+([\s\S]*?)$/);
        
        // Extract grammar corrections
        const grammarText = grammarMatch ? grammarMatch[1] : '';
        const grammarItems = grammarText.split(/\n\s*-\s*/).filter(Boolean);
        
        const grammarCorrections = grammarItems.map(item => {
          const originalMatch = item.match(/원문:\s*(.+?)(?=\s*교정:|$)/);
          const correctedMatch = item.match(/교정:\s*(.+?)(?=\s*설명:|$)/);
          const explanationMatch = item.match(/설명:\s*(.+?)$/);
          
          return {
            original: originalMatch ? originalMatch[1].trim() : '',
            corrected: correctedMatch ? correctedMatch[1].trim() : '',
            explanation: explanationMatch ? explanationMatch[1].trim() : ''
          };
        }).filter(c => c.original && c.corrected);
        
        evaluation.grammarCorrections = grammarCorrections;
        
        // Extract vocabulary feedback
        const vocabText = vocabMatch ? vocabMatch[1] : '';
        const usedWordsMatch = vocabText.match(/사용된 단어:\s*(.+?)(?=\s*-|$)/);
        const suggestionsMatch = vocabText.match(/추천 단어:\s*(.+?)(?=\s*-|$)/);
        const levelMatch = vocabText.match(/수준:\s*(.+?)(?=\s*$)/);
        
        evaluation.vocabularyFeedback = {
          usedWords: usedWordsMatch ? 
            usedWordsMatch[1].split(',').map(w => w.trim()) : [],
          suggestions: suggestionsMatch ? 
            suggestionsMatch[1].split(',').map(w => w.trim()) : [],
          level: this.parseLevel(levelMatch ? levelMatch[1].trim() : 'intermediate')
        };
        
        // Extract strengths
        if (strengthsMatch) {
          const strengths = strengthsMatch[1]
            .split('\n')
            .filter(line => line.trim().startsWith('-'))
            .map(line => line.trim().substring(1).trim());
          
          evaluation.strengths.push(...strengths);
        }
        
        // Extract improvement areas
        if (improvementsMatch) {
          const improvements = improvementsMatch[1]
            .split('\n')
            .filter(line => line.trim().startsWith('-'))
            .map(line => line.trim().substring(1).trim());
          
          evaluation.improvementAreas.push(...improvements);
        }
      } catch (error) {
        console.error('OpenAI evaluation error:', error);
        // Fallback to basic evaluation
        evaluation.grammarCorrections = [];
        evaluation.vocabularyFeedback = {
          usedWords: [],
          suggestions: [],
          level: 'intermediate'
        };
        evaluation.strengths.push('답변을 제출해 주셔서 감사합니다.');
        evaluation.improvementAreas.push('텍스트 평가 중 오류가 발생했습니다. 다시 시도해 주세요.');
      }
    } catch (error) {
      console.error('Error evaluating text answer:', error);
      throw error;
    }
  }

  /**
   * Evaluate a multiple choice answer
   */
  private evaluateChoiceAnswer(
    answer: SubmissionAnswer,
    question: any,
    evaluation: AIEvaluation
  ): Promise<void> {
    return new Promise((resolve) => {
      const selectedChoice = answer.content as string;
      const correctChoice = question.targetAnswer;
      
      // Simple evaluation for multiple choice
      if (selectedChoice === correctChoice) {
        evaluation.strengths.push('객관식 문제를 정확하게 맞추셨습니다.');
      } else {
        evaluation.improvementAreas.push(`객관식 문제의 정답은 "${correctChoice}"입니다.`);
      }
      
      resolve();
    });
  }

  /**
   * Generate feedback for pronunciation assessment
   */
  private generatePronunciationFeedback(pronunciationResult: any): string {
    // Find words with low scores
    const lowScoreWords = pronunciationResult.wordLevelScores
      .filter((word: any) => word.score < 70)
      .map((word: any) => word.word);
    
    let feedback = '';
    
    // Overall feedback
    if (pronunciationResult.overallScore >= 90) {
      feedback = '발음이 매우 정확하고 자연스럽습니다. 원어민과 유사한 발음을 가지고 있습니다.';
    } else if (pronunciationResult.overallScore >= 80) {
      feedback = '발음이 정확하고 이해하기 쉽습니다. 약간의 개선 여지가 있습니다.';
    } else if (pronunciationResult.overallScore >= 70) {
      feedback = '발음이 대체로 좋으나, 일부 단어에서 개선이 필요합니다.';
    } else if (pronunciationResult.overallScore >= 60) {
      feedback = '발음이 이해 가능하지만, 여러 단어에서 개선이 필요합니다.';
    } else {
      feedback = '발음 향상을 위한 연습이 필요합니다. 특히 강세와 리듬에 주의하세요.';
    }
    
    // Add specific word feedback
    if (lowScoreWords.length > 0) {
      feedback += ` 특히 다음 단어들의 발음에 주의하세요: ${lowScoreWords.join(', ')}.`;
    }
    
    // Add fluency feedback
    if (pronunciationResult.fluencyScore >= 80) {
      feedback += ' 말의 흐름이 자연스럽고 유창합니다.';
    } else if (pronunciationResult.fluencyScore >= 60) {
      feedback += ' 말의 흐름을 더 자연스럽게 하기 위해 연습하세요.';
    } else {
      feedback += ' 문장 사이의 끊김 없이 더 유창하게 말하는 연습이 필요합니다.';
    }
    
    return feedback;
  }

  /**
   * Parse vocabulary level from string
   */
  private parseLevel(level: string): 'beginner' | 'intermediate' | 'advanced' {
    level = level.toLowerCase();
    
    if (level.includes('beginner') || level.includes('초급')) {
      return 'beginner';
    } else if (level.includes('advanced') || level.includes('고급')) {
      return 'advanced';
    } else {
      return 'intermediate';
    }
  }

  /**
   * Calculate confidence score for the evaluation
   * This helps identify when AI evaluation might be unreliable
   */
  async calculateConfidenceScore(evaluation: AIEvaluation): Promise<number> {
    let confidenceScore = 100;
    
    // Reduce confidence if pronunciation score is missing
    if (!evaluation.pronunciationScore) {
      confidenceScore -= 30;
    }
    
    // Reduce confidence if grammar corrections are missing
    if (!evaluation.grammarCorrections || evaluation.grammarCorrections.length === 0) {
      confidenceScore -= 20;
    }
    
    // Reduce confidence if vocabulary feedback is missing
    if (!evaluation.vocabularyFeedback) {
      confidenceScore -= 20;
    }
    
    // Reduce confidence if strengths or improvement areas are missing
    if (evaluation.strengths.length === 0) {
      confidenceScore -= 15;
    }
    
    if (evaluation.improvementAreas.length === 0) {
      confidenceScore -= 15;
    }
    
    return Math.max(0, confidenceScore);
  }

  /**
   * Batch evaluate multiple submissions
   * @param submissionIds Array of submission IDs to evaluate
   */
  async batchEvaluateSubmissions(submissionIds: string[]): Promise<{
    successful: string[];
    failed: { id: string; error: string }[];
  }> {
    const successful: string[] = [];
    const failed: { id: string; error: string }[] = [];
    
    for (const id of submissionIds) {
      try {
        await this.evaluateSubmission(id);
        successful.push(id);
      } catch (error) {
        failed.push({
          id,
          error: error instanceof Error ? error.message : '알 수 없는 오류'
        });
      }
    }
    
    return { successful, failed };
  }
}

export const homeworkEvaluationService = new HomeworkEvaluationService();