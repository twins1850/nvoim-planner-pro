import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import bcrypt from 'bcrypt';
import app from '../../server';
import Homework from '../../models/Homework';
import HomeworkSubmission from '../../models/HomeworkSubmission';
import User from '../../models/User';
import jwt from 'jsonwebtoken';
import path from 'path';
import fs from 'fs';

describe('Homework Submission API Integration Tests', () => {
  let mongoServer: MongoMemoryServer;
  let studentToken: string;
  let plannerToken: string;
  let studentId: string;
  let plannerId: string;
  let homeworkId: string;
  let submissionId: string;
  let tempAudioFile: string;
  let tempImageFile: string;

  beforeAll(async () => {
    // 임시 테스트 파일 생성
    const tempDir = path.join(process.cwd(), 'temp', 'test');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    
    // 임시 오디오 파일 생성
    tempAudioFile = path.join(tempDir, 'test-audio.mp3');
    fs.writeFileSync(tempAudioFile, Buffer.from('dummy audio content'));
    
    // 임시 이미지 파일 생성
    tempImageFile = path.join(tempDir, 'test-image.png');
    fs.writeFileSync(tempImageFile, Buffer.from('dummy image content'));

    // Start in-memory MongoDB server
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await mongoose.connect(uri);

    // Create test users
    const planner = await User.create({
      email: 'planner@test.com',
      password: await bcrypt.hash('password123', 10),
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
      email: 'student@test.com',
      password: await bcrypt.hash('password123', 10),
      role: 'student',
      profile: {
        name: 'Test Student',
        learningLevel: 'intermediate',
        preferences: {
          language: 'ko',
          notifications: true,
          timezone: 'Asia/Seoul'
        }
      }
    });

    plannerId = planner._id.toString();
    studentId = student._id.toString();

    // Create JWT tokens
    plannerToken = jwt.sign(
      { userId: plannerId, role: 'planner' },
      process.env.JWT_SECRET || 'test-secret',
      { expiresIn: '1h' }
    );

    studentToken = jwt.sign(
      { userId: studentId, role: 'student' },
      process.env.JWT_SECRET || 'test-secret',
      { expiresIn: '1h' }
    );

    // Create a test homework
    const homework = await Homework.create({
      plannerId,
      studentIds: [studentId],
      title: 'Test Homework',
      description: 'This is a test homework',
      type: 'mixed',
      content: {
        instructions: 'Please complete the following tasks',
        attachments: [],
        questions: [
          {
            id: new mongoose.Types.ObjectId().toString(),
            type: 'text_input',
            question: 'Write a paragraph about your day'
          },
          {
            id: new mongoose.Types.ObjectId().toString(),
            type: 'audio_recording',
            question: 'Record yourself saying these phrases'
          },
          {
            id: new mongoose.Types.ObjectId().toString(),
            type: 'multiple_choice',
            question: 'Choose the correct answer',
            options: ['Option A', 'Option B', 'Option C']
          }
        ]
      },
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      status: 'sent'
    });

    homeworkId = homework._id.toString();
  });

  afterAll(async () => {
    // 임시 파일 삭제
    if (fs.existsSync(tempAudioFile)) {
      fs.unlinkSync(tempAudioFile);
    }
    if (fs.existsSync(tempImageFile)) {
      fs.unlinkSync(tempImageFile);
    }
    
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  describe('POST /api/homework-submissions/text', () => {
    it('should submit a text answer', async () => {
      const questionId = (await Homework.findById(homeworkId))?.content.questions[0].id;
      
      const response = await request(app)
        .post('/api/homework-submissions/text')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          questionId,
          text: 'This is my answer to the text question.'
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.questionId).toBe(questionId);
      expect(response.body.data.type).toBe('text');
      expect(response.body.data.content).toBe('This is my answer to the text question.');
    });
  });

  describe('POST /api/homework-submissions', () => {
    it('should submit complete homework answers', async () => {
      const homework = await Homework.findById(homeworkId);
      const questions = homework?.content.questions || [];
      
      const answers = [
        {
          questionId: questions[0].id,
          type: 'text',
          content: 'This is my answer to the text question.',
          metadata: {
            submittedAt: new Date().toISOString()
          }
        },
        {
          questionId: questions[2].id,
          type: 'choice',
          content: 'Option B',
          metadata: {
            submittedAt: new Date().toISOString()
          }
        }
      ];
      
      const response = await request(app)
        .post('/api/homework-submissions')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          homeworkId,
          answers
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.homeworkId).toBe(homeworkId);
      expect(response.body.data.studentId).toBe(studentId);
      expect(response.body.data.answers.length).toBe(2);
      expect(response.body.data.status).toBe('submitted');
      
      submissionId = response.body.data._id;
    });
    
    it('should reject submission with invalid question ID', async () => {
      const invalidQuestionId = new mongoose.Types.ObjectId().toString();
      
      await request(app)
        .post('/api/homework-submissions')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          homeworkId,
          answers: [
            {
              questionId: invalidQuestionId,
              type: 'text',
              content: 'This is an invalid answer.'
            }
          ]
        })
        .expect(422); // Validation error
    });
    
    it('should reject submission with mismatched answer type', async () => {
      const homework = await Homework.findById(homeworkId);
      const textQuestion = homework?.content.questions.find(q => q.type === 'text_input');
      
      await request(app)
        .post('/api/homework-submissions')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          homeworkId,
          answers: [
            {
              questionId: textQuestion?.id,
              type: 'audio', // Wrong type for a text question
              content: 'This is an invalid answer type.'
            }
          ]
        })
        .expect(422); // Validation error
    });
  });

  describe('GET /api/homework-submissions/:id', () => {
    it('should retrieve submission by ID', async () => {
      const response = await request(app)
        .get(`/api/homework-submissions/${submissionId}`)
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data._id).toBe(submissionId);
    });

    it('should return 404 for non-existent submission', async () => {
      const nonExistentId = new mongoose.Types.ObjectId().toString();
      
      await request(app)
        .get(`/api/homework-submissions/${nonExistentId}`)
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(404);
    });
  });

  describe('GET /api/homework-submissions/homework/:homeworkId', () => {
    it('should retrieve submissions by homework ID', async () => {
      const response = await request(app)
        .get(`/api/homework-submissions/homework/${homeworkId}`)
        .set('Authorization', `Bearer ${plannerToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
      expect(response.body.data[0].homeworkId).toBe(homeworkId);
    });
  });

  describe('GET /api/homework-submissions/student/:studentId', () => {
    it('should retrieve submissions by student ID', async () => {
      const response = await request(app)
        .get(`/api/homework-submissions/student/${studentId}`)
        .set('Authorization', `Bearer ${plannerToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
      expect(response.body.data[0].studentId).toBe(studentId);
    });
  });

  describe('GET /api/homework-submissions/status/:homeworkId', () => {
    it('should retrieve submission status and deadline information', async () => {
      const response = await request(app)
        .get(`/api/homework-submissions/status/${homeworkId}`)
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.isSubmitted).toBe(true);
      expect(response.body.data.submission).toBeDefined();
      expect(response.body.data.homework).toBeDefined();
      expect(response.body.data.dueDate).toBeDefined();
      expect(response.body.data.isLate).toBeDefined();
      expect(response.body.data.timeRemaining).toBeDefined();
    });
  });

  describe('POST /api/homework-submissions/sync', () => {
    it('should sync offline submissions', async () => {
      const homework = await Homework.findById(homeworkId);
      const questions = homework?.content.questions || [];
      
      const offlineSubmissions = [
        {
          homeworkId,
          studentId,
          answers: [
            {
              questionId: questions[0].id,
              type: 'text',
              content: 'This is an offline answer.',
              metadata: {
                submittedAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString() // 1 day ago
              }
            }
          ],
          submittedAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString() // 1 day ago
        }
      ];
      
      const response = await request(app)
        .post('/api/homework-submissions/sync')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          submissions: offlineSubmissions
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.synced).toBeDefined();
      expect(Array.isArray(response.body.data.synced)).toBe(true);
      expect(response.body.data.failed).toBeDefined();
      expect(Array.isArray(response.body.data.failed)).toBe(true);
    });
  });
});