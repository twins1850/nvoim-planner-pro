import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { HomeworkEvaluationService } from '../../services/homeworkEvaluationService';
import { AzureSpeechService } from '../../services/azureSpeechService';
import { openaiService } from '../../services/openaiService';
import { fileService } from '../../services/fileService';
import HomeworkSubmission from '../../models/HomeworkSubmission';
import Homework from '../../models/Homework';
import { Types } from 'mongoose';
import fs from 'fs';
import path from 'path';

// Mock dependencies
vi.mock('../../services/azureSpeechService', () => ({
  AzureSpeechService: {
    evaluatePronunciation: vi.fn()
  }
}));

vi.mock('../../services/openaiService', () => ({
  openaiService: {
    generateText: vi.fn()
  }
}));

vi.mock('../../services/fileService', () => ({
  fileService: {
    downloadFileFromS3: vi.fn()
  }
}));

vi.mock('../../models/HomeworkSubmission', () => ({
  default: {
    findById: vi.fn()
  }
}));

vi.mock('../../models/Homework', () => ({
  default: {
    findById: vi.fn()
  }
}));

vi.mock('fs', () => ({
  existsSync: vi.fn(),
  promises: {
    unlink: vi.fn()
  }
}));

describe('HomeworkEvaluationService', () => {
  let homeworkEvaluationService: HomeworkEvaluationService;
  
  beforeEach(() => {
    homeworkEvaluationService = new HomeworkEvaluationService();
    vi.clearAllMocks();
  });
  
  afterEach(() => {
    vi.resetAllMocks();
  });
  
  describe('evaluateSubmission', () => {
    it('should evaluate an audio submission successfully', async () => {
      // Mock data
      const submissionId = new Types.ObjectId().toString();
      const homeworkId = new Types.ObjectId().toString();
      
      // Mock submission with audio answer
      const mockSubmission = {
        _id: submissionId,
        homeworkId,
        studentId: new Types.ObjectId().toString(),
        answers: [
          {
            questionId: '1',
            type: 'audio',
            content: {
              s3Key: 'test-audio.mp3',
              filename: 'test-audio.mp3'
            }
          }
        ],
        status: 'submitted',
        save: vi.fn().mockResolvedValue(true)
      };
      
      // Mock homework
      const mockHomework = {
        _id: homeworkId,
        content: {
          questions: [
            {
              id: '1',
              type: 'audio_recording',
              targetAnswer: 'This is a test sentence.'
            }
          ]
        }
      };
      
      // Mock Azure Speech Service response
      const mockPronunciationResult = {
        overallScore: 85,
        pronunciationScore: 82,
        fluencyScore: 88,
        completenessScore: 90,
        wordLevelScores: [
          { word: 'This', score: 90 },
          { word: 'is', score: 85 },
          { word: 'a', score: 95 },
          { word: 'test', score: 75 },
          { word: 'sentence', score: 80 }
        ]
      };
      
      // Setup mocks
      (HomeworkSubmission.findById as any).mockResolvedValue(mockSubmission);
      (Homework.findById as any).mockResolvedValue(mockHomework);
      (fs.existsSync as any).mockReturnValue(true);
      (AzureSpeechService.evaluatePronunciation as any).mockResolvedValue(mockPronunciationResult);
      
      // Execute
      const result = await homeworkEvaluationService.evaluateSubmission(submissionId);
      
      // Assertions
      expect(HomeworkSubmission.findById).toHaveBeenCalledWith(submissionId);
      expect(Homework.findById).toHaveBeenCalledWith(homeworkId);
      expect(AzureSpeechService.evaluatePronunciation).toHaveBeenCalled();
      expect(mockSubmission.save).toHaveBeenCalled();
      
      // Check evaluation result
      expect(result).toBeDefined();
      expect(result.overallScore).toBeGreaterThan(0);
      expect(result.pronunciationScore).toBeDefined();
      expect(result.pronunciationScore?.overallScore).toBe(85);
      expect(result.strengths.length).toBeGreaterThan(0);
    });
    
    it('should evaluate a text submission successfully', async () => {
      // Mock data
      const submissionId = new Types.ObjectId().toString();
      const homeworkId = new Types.ObjectId().toString();
      
      // Mock submission with text answer
      const mockSubmission = {
        _id: submissionId,
        homeworkId,
        studentId: new Types.ObjectId().toString(),
        answers: [
          {
            questionId: '1',
            type: 'text',
            content: 'This is my answer to the question.'
          }
        ],
        status: 'submitted',
        save: vi.fn().mockResolvedValue(true)
      };
      
      // Mock homework
      const mockHomework = {
        _id: homeworkId,
        content: {
          questions: [
            {
              id: '1',
              type: 'text_input',
              targetAnswer: 'This is the expected answer.'
            }
          ]
        }
      };
      
      // Mock OpenAI response
      const mockOpenAIResponse = `
# 문법 교정
- 원문: This is my answer to the question.
  교정: This is my answer to the question.
  설명: 문법적으로 정확합니다.

# 어휘 평가
- 사용된 단어: answer, question
- 추천 단어: response, inquiry
- 수준: intermediate

# 강점
- 문장 구조가 명확합니다.
- 기본적인 영어 표현을 잘 사용했습니다.

# 개선점
- 더 다양한 어휘를 사용하면 좋을 것 같습니다.
- 좀 더 구체적인 표현을 사용하면 좋을 것 같습니다.
`;
      
      // Setup mocks
      (HomeworkSubmission.findById as any).mockResolvedValue(mockSubmission);
      (Homework.findById as any).mockResolvedValue(mockHomework);
      (openaiService.generateText as any).mockResolvedValue(mockOpenAIResponse);
      
      // Execute
      const result = await homeworkEvaluationService.evaluateSubmission(submissionId);
      
      // Assertions
      expect(HomeworkSubmission.findById).toHaveBeenCalledWith(submissionId);
      expect(Homework.findById).toHaveBeenCalledWith(homeworkId);
      expect(openaiService.generateText).toHaveBeenCalled();
      expect(mockSubmission.save).toHaveBeenCalled();
      
      // Check evaluation result
      expect(result).toBeDefined();
      expect(result.overallScore).toBeGreaterThan(0);
      expect(result.grammarCorrections).toBeDefined();
      expect(result.vocabularyFeedback).toBeDefined();
      expect(result.strengths.length).toBeGreaterThan(0);
      expect(result.improvementAreas.length).toBeGreaterThan(0);
    });
    
    it('should evaluate a multiple choice answer successfully', async () => {
      // Mock data
      const submissionId = new Types.ObjectId().toString();
      const homeworkId = new Types.ObjectId().toString();
      
      // Mock submission with choice answer
      const mockSubmission = {
        _id: submissionId,
        homeworkId,
        studentId: new Types.ObjectId().toString(),
        answers: [
          {
            questionId: '1',
            type: 'choice',
            content: 'B'
          }
        ],
        status: 'submitted',
        save: vi.fn().mockResolvedValue(true)
      };
      
      // Mock homework
      const mockHomework = {
        _id: homeworkId,
        content: {
          questions: [
            {
              id: '1',
              type: 'multiple_choice',
              options: ['A', 'B', 'C', 'D'],
              targetAnswer: 'B'
            }
          ]
        }
      };
      
      // Setup mocks
      (HomeworkSubmission.findById as any).mockResolvedValue(mockSubmission);
      (Homework.findById as any).mockResolvedValue(mockHomework);
      
      // Execute
      const result = await homeworkEvaluationService.evaluateSubmission(submissionId);
      
      // Assertions
      expect(HomeworkSubmission.findById).toHaveBeenCalledWith(submissionId);
      expect(Homework.findById).toHaveBeenCalledWith(homeworkId);
      expect(mockSubmission.save).toHaveBeenCalled();
      
      // Check evaluation result
      expect(result).toBeDefined();
      expect(result.overallScore).toBeGreaterThan(0);
      expect(result.strengths.length).toBeGreaterThan(0);
      expect(result.strengths[0]).toContain('객관식 문제를 정확하게 맞추셨습니다');
    });
    
    it('should handle AI service failures with fallback mechanisms', async () => {
      // Mock data
      const submissionId = new Types.ObjectId().toString();
      const homeworkId = new Types.ObjectId().toString();
      
      // Mock submission with audio answer
      const mockSubmission = {
        _id: submissionId,
        homeworkId,
        studentId: new Types.ObjectId().toString(),
        answers: [
          {
            questionId: '1',
            type: 'audio',
            content: {
              s3Key: 'test-audio.mp3',
              filename: 'test-audio.mp3'
            }
          }
        ],
        status: 'submitted',
        save: vi.fn().mockResolvedValue(true)
      };
      
      // Mock homework
      const mockHomework = {
        _id: homeworkId,
        content: {
          questions: [
            {
              id: '1',
              type: 'audio_recording',
              targetAnswer: 'This is a test sentence.'
            }
          ]
        }
      };
      
      // Setup mocks
      (HomeworkSubmission.findById as any).mockResolvedValue(mockSubmission);
      (Homework.findById as any).mockResolvedValue(mockHomework);
      (fs.existsSync as any).mockReturnValue(true);
      (AzureSpeechService.evaluatePronunciation as any).mockRejectedValue(new Error('Azure API error'));
      
      // Execute
      const result = await homeworkEvaluationService.evaluateSubmission(submissionId);
      
      // Assertions
      expect(HomeworkSubmission.findById).toHaveBeenCalledWith(submissionId);
      expect(Homework.findById).toHaveBeenCalledWith(homeworkId);
      expect(AzureSpeechService.evaluatePronunciation).toHaveBeenCalled();
      expect(mockSubmission.save).toHaveBeenCalled();
      
      // Check evaluation result - should have fallback values
      expect(result).toBeDefined();
      expect(result.overallScore).toBe(70); // Default fallback score
      expect(result.pronunciationScore).toBeDefined();
      expect(result.pronunciationScore?.overallScore).toBe(70);
      expect(result.improvementAreas.length).toBeGreaterThan(0);
      expect(result.improvementAreas[0]).toContain('발음 평가를 위해 다시 제출해 주세요');
    });
  });
  
  describe('calculateConfidenceScore', () => {
    it('should calculate high confidence for complete evaluations', async () => {
      const evaluation = {
        pronunciationScore: {
          overallScore: 85,
          wordScores: [{ word: 'test', score: 85 }],
          feedback: 'Good pronunciation'
        },
        grammarCorrections: [
          { original: 'test', corrected: 'test', explanation: 'correct' }
        ],
        vocabularyFeedback: {
          usedWords: ['test'],
          suggestions: ['examination'],
          level: 'intermediate' as const
        },
        overallScore: 85,
        strengths: ['Good grammar'],
        improvementAreas: ['Work on vocabulary'],
        generatedAt: new Date().toISOString()
      };
      
      const score = await homeworkEvaluationService.calculateConfidenceScore(evaluation);
      expect(score).toBe(100);
    });
    
    it('should calculate lower confidence for incomplete evaluations', async () => {
      const evaluation = {
        overallScore: 70,
        strengths: ['Good effort'],
        improvementAreas: [],
        generatedAt: new Date().toISOString()
      };
      
      const score = await homeworkEvaluationService.calculateConfidenceScore(evaluation);
      expect(score).toBeLessThan(100);
    });
  });
  
  describe('batchEvaluateSubmissions', () => {
    it('should process multiple submissions and track success/failure', async () => {
      // Mock successful and failed evaluations
      const mockEvaluateSubmission = vi.spyOn(homeworkEvaluationService, 'evaluateSubmission')
        .mockImplementation((id: string) => {
          if (id === 'success1' || id === 'success2') {
            return Promise.resolve({
              overallScore: 85,
              strengths: ['Good work'],
              improvementAreas: ['Keep practicing'],
              generatedAt: new Date().toISOString()
            });
          } else {
            return Promise.reject(new Error('Evaluation failed'));
          }
        });
      
      const submissionIds = ['success1', 'fail1', 'success2'];
      
      const result = await homeworkEvaluationService.batchEvaluateSubmissions(submissionIds);
      
      expect(mockEvaluateSubmission).toHaveBeenCalledTimes(3);
      expect(result.successful).toContain('success1');
      expect(result.successful).toContain('success2');
      expect(result.successful.length).toBe(2);
      expect(result.failed.length).toBe(1);
      expect(result.failed[0].id).toBe('fail1');
      expect(result.failed[0].error).toBe('Evaluation failed');
    });
  });
});