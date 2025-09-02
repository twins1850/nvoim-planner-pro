import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { app } from '../../server';
import HomeworkSubmission from '../../models/HomeworkSubmission';
import Homework from '../../models/Homework';
import User from '../../models/User';
import { generateToken } from '../../utils/jwt';
import { AzureSpeechService } from '../../services/azureSpeechService';
import { openaiService } from '../../services/openaiService';
import { fileService } from '../../services/fileService';
import path from 'path';
import fs from 'fs';

// Mock external services
vi.mock('../../services/azureSpeechService', () => ({
  AzureSpeechService: {
    evaluatePronunciation: vi.fn().mockResolvedValue({
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
    })
  }
}));

vi.mock('../../services/openaiService', () => ({
  openaiService: {
    generateText: vi.fn().mockResolvedValue(`
# 문법 교정
- 원문: I go to school yesterday.
  교정: I went to school yesterday.
  설명: 과거 시제를 사용해야 합니다.

# 어휘 평가
- 사용된 단어: go, school, yesterday
- 추천 단어: attend, institution, previous day
- 수준: intermediate

# 강점
- 기본 문장 구조가 명확합니다.
- 핵심 메시지가 전달됩니다.

# 개선점
- 시제 사용에 주의하세요.
- 더 다양한 어휘를 사용하면 좋을 것 같습니다.
`)
  }
}));

vi.mock('../../services/fileService', () => ({
  fileService: {
    downloadFileFromS3: vi.fn().mockResolvedValue(true)
  }
}));

describe('Homework Evaluation Integration Tests', () => {
  let plannerToken: string;
  let studentToken: string;
  let plannerId: string;
  let studentId: string;
  let homeworkId: string;
  let submissionId: string;
  
  beforeAll(async () => {
    // Connect to test database
    await mongoose.connect(process.env.MONGODB_URI_TEST || 'mongodb://localhost:27017/test_db');
    
    // Create test users
    const planner = await User.create({
      email: 'test-planner@example.com',
      password: 'hashedpassword',
      role: 'planner',
      profile: {
        name: 'Test Planner',
        preferences: {
          language: 'ko',
          notifications: true,
          timezone: 'Asia/Seoul'
        }
      }
    });
    
    const student = await User.create({
      email: 'test-student@example.com',
      password: 'hashedpassword',
      role: 'student',
      profile: {
        name: 'Test Student',
        preferences: {
          language: 'ko',
          notifications: true,
          timezone: 'Asia/Seoul'
        },
        assignedPlanner: planner._id,
        learningLevel: 'intermediate'
      }
    });
    
    plannerId = planner._id.toString();
    studentId = student._id.toString();
    
    // Generate tokens
    plannerToken = generateToken({ _id: plannerId, role: 'planner' });
    studentToken = generateToken({ _id: studentId, role: 'student' });
    
    // Create test homework
    const homework = await Homework.create({
      plannerId,
      studentIds: [studentId],
      title: 'Test Homework',
      description: 'This is a test homework',
      type: 'mixed',
      content: {
        instructions: 'Please complete the following questions',
        attachments: [],
        questions: [
          {
            id: 'q1',
            type: 'audio_recording',
            question: 'Read the following sentence: "This is a test sentence."',
            targetAnswer: 'This is a test sentence.'
          },
          {
            id: 'q2',
            type: 'text_input',
            question: 'Write a sentence about your day yesterday.',
            targetAnswer: 'I went to school yesterday.'
          },
          {
            id: 'q3',
            type: 'multiple_choice',
            question: 'Choose the correct answer',
            options: ['A', 'B', 'C', 'D'],
            targetAnswer: 'B'
          }
        ]
      },
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      isPersonalized: false,
      status: 'sent'
    });
    
    homeworkId = homework._id.toString();
    
    // Create test submission
    const submission = await HomeworkSubmission.create({
      homeworkId,
      studentId,
      answers: [
        {
          questionId: 'q1',
          type: 'audio',
          content: {
            filename: 'test-audio.mp3',
            originalName: 'test-audio.mp3',
            size: 1024,
            mimeType: 'audio/mp3',
            s3Key: 'homework-submissions/test-audio.mp3',
            s3Url: 'https://example.com/test-audio.mp3',
            uploadedAt: new Date().toISOString()
          },
          metadata: {
            recordingDuration: 5,
            submittedAt: new Date().toISOString()
          }
        },
        {
          questionId: 'q2',
          type: 'text',
          content: 'I go to school yesterday.',
          metadata: {
            wordCount: 5,
            submittedAt: new Date().toISOString()
          }
        },
        {
          questionId: 'q3',
          type: 'choice',
          content: 'B',
          metadata: {
            submittedAt: new Date().toISOString()
          }
        }
      ],
      status: 'submitted',
      submittedAt: new Date().toISOString()
    });
    
    submissionId = submission._id.toString();
  });
  
  afterAll(async () => {
    // Clean up
    await User.deleteMany({});
    await Homework.deleteMany({});
    await HomeworkSubmission.deleteMany({});
    
    // Disconnect from test database
    await mongoose.disconnect();
  });
  
  describe('POST /api/homework-submissions/:id/evaluate', () => {
    it('should evaluate a submission successfully', async () => {
      const response = await request(app)
        .post(`/api/homework-submissions/${submissionId}/evaluate`)
        .set('Authorization', `Bearer ${plannerToken}`)
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      
      // Check evaluation result
      const evaluation = response.body.data;
      expect(evaluation.overallScore).toBeGreaterThan(0);
      expect(evaluation.pronunciationScore).toBeDefined();
      expect(evaluation.grammarCorrections).toBeDefined();
      expect(evaluation.strengths.length).toBeGreaterThan(0);
      expect(evaluation.improvementAreas.length).toBeGreaterThan(0);
      
      // Check submission status update
      const updatedSubmission = await HomeworkSubmission.findById(submissionId);
      expect(updatedSubmission?.status).toBe('ai_evaluated');
    });
    
    it('should return 404 for non-existent submission', async () => {
      const nonExistentId = new mongoose.Types.ObjectId().toString();
      
      await request(app)
        .post(`/api/homework-submissions/${nonExistentId}/evaluate`)
        .set('Authorization', `Bearer ${plannerToken}`)
        .expect(404);
    });
    
    it('should require authentication', async () => {
      await request(app)
        .post(`/api/homework-submissions/${submissionId}/evaluate`)
        .expect(401);
    });
  });
  
  describe('POST /api/homework-submissions/batch-evaluate', () => {
    it('should batch evaluate multiple submissions', async () => {
      // Create another test submission
      const submission2 = await HomeworkSubmission.create({
        homeworkId,
        studentId,
        answers: [
          {
            questionId: 'q2',
            type: 'text',
            content: 'I studied English yesterday.',
            metadata: {
              wordCount: 4,
              submittedAt: new Date().toISOString()
            }
          }
        ],
        status: 'submitted',
        submittedAt: new Date().toISOString()
      });
      
      const response = await request(app)
        .post('/api/homework-submissions/batch-evaluate')
        .set('Authorization', `Bearer ${plannerToken}`)
        .send({
          submissionIds: [submissionId, submission2._id.toString()]
        })
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.successful.length).toBe(2);
      expect(response.body.data.failed.length).toBe(0);
      
      // Clean up
      await HomeworkSubmission.findByIdAndDelete(submission2._id);
    });
    
    it('should handle partial failures in batch evaluation', async () => {
      const nonExistentId = new mongoose.Types.ObjectId().toString();
      
      const response = await request(app)
        .post('/api/homework-submissions/batch-evaluate')
        .set('Authorization', `Bearer ${plannerToken}`)
        .send({
          submissionIds: [submissionId, nonExistentId]
        })
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.successful.length).toBe(1);
      expect(response.body.data.successful[0]).toBe(submissionId);
      expect(response.body.data.failed.length).toBe(1);
      expect(response.body.data.failed[0].id).toBe(nonExistentId);
    });
    
    it('should require authentication', async () => {
      await request(app)
        .post('/api/homework-submissions/batch-evaluate')
        .send({
          submissionIds: [submissionId]
        })
        .expect(401);
    });
  });
});