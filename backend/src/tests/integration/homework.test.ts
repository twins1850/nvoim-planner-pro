import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import bcrypt from 'bcrypt';
import app from '../../server';
import Homework from '../../models/Homework';
import User from '../../models/User';
import Lesson from '../../models/Lesson';
import jwt from 'jsonwebtoken';

describe('Homework API Integration Tests', () => {
  let mongoServer: MongoMemoryServer;
  let plannerToken: string;
  let studentToken: string;
  let plannerId: string;
  let studentId: string;
  let homeworkId: string;
  let lessonId: string;

  beforeAll(async () => {
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

    // Create a test lesson with analysis
    const lesson = await Lesson.create({
      plannerId,
      studentId,
      originalVideoFile: {
        filename: 'test.mp4',
        originalName: 'test.mp4',
        size: 1000,
        mimeType: 'video/mp4',
        s3Key: 'test.mp4',
        s3Url: 'https://test.com/test.mp4',
        uploadedAt: new Date()
      },
      extractedAudioFile: {
        filename: 'test.mp3',
        originalName: 'test.mp3',
        size: 500,
        mimeType: 'audio/mp3',
        s3Key: 'test.mp3',
        s3Url: 'https://test.com/test.mp3',
        uploadedAt: new Date()
      },
      lessonDate: new Date(),
      duration: 1800,
      status: 'analyzed',
      metadata: {
        studentName: 'Test Student',
        extractedFromFilename: true,
        originalFileSize: 1000,
        extractedFileSize: 500,
        compressionRatio: 0.5
      },
      analysisResult: {
        speakerSegments: [
          {
            speaker: 'teacher',
            startTime: 0,
            endTime: 10,
            transcript: 'How are you today?',
            confidence: 0.9
          },
          {
            speaker: 'student',
            startTime: 10,
            endTime: 15,
            transcript: 'I am fine, thank you.',
            confidence: 0.8
          }
        ],
        studentMetrics: {
          speakingTime: 15,
          pronunciationAccuracy: 80,
          fluencyScore: 70,
          vocabularyUsage: [
            { word: 'fine', frequency: 1, correctUsage: true }
          ],
          grammarAccuracy: 90
        },
        pronunciationScores: [
          { word: 'fine', score: 90, feedback: 'Good pronunciation' }
        ],
        participationLevel: 60,
        improvementAreas: ['Fluency', 'Vocabulary'],
        lessonInsights: ['Student is making progress', 'Needs more practice with questions'],
        generatedNotes: 'The student performed well but needs more practice.',
        analysisCompletedAt: new Date()
      }
    });

    lessonId = lesson._id.toString();
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  describe('POST /api/homework', () => {
    it('should create a new homework assignment', async () => {
      const homeworkData = {
        title: 'Test Homework',
        description: 'This is a test homework',
        studentIds: [studentId],
        type: 'mixed',
        content: {
          instructions: 'Please complete the following tasks',
          attachments: [],
          questions: [
            {
              id: new mongoose.Types.ObjectId().toString(),
              type: 'text_input',
              question: 'Write a paragraph about your day'
            }
          ]
        },
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      };

      const response = await request(app)
        .post('/api/homework')
        .set('Authorization', `Bearer ${plannerToken}`)
        .send(homeworkData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.title).toBe(homeworkData.title);
      expect(response.body.data.plannerId).toBe(plannerId);
      expect(response.body.data.studentIds).toContain(studentId);

      homeworkId = response.body.data._id;
    });
  });

  describe('GET /api/homework/:id', () => {
    it('should retrieve homework by ID', async () => {
      const response = await request(app)
        .get(`/api/homework/${homeworkId}`)
        .set('Authorization', `Bearer ${plannerToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data._id).toBe(homeworkId);
    });

    it('should return 404 for non-existent homework', async () => {
      const nonExistentId = new mongoose.Types.ObjectId().toString();
      
      await request(app)
        .get(`/api/homework/${nonExistentId}`)
        .set('Authorization', `Bearer ${plannerToken}`)
        .expect(404);
    });
  });

  describe('GET /api/homework/planner', () => {
    it('should retrieve all homework for a planner', async () => {
      const response = await request(app)
        .get('/api/homework/planner')
        .set('Authorization', `Bearer ${plannerToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
      expect(response.body.data[0].plannerId).toBe(plannerId);
    });
  });

  describe('GET /api/homework/student', () => {
    it('should retrieve all homework for a student', async () => {
      // First update the homework status to 'sent'
      await Homework.findByIdAndUpdate(homeworkId, { status: 'sent' });

      const response = await request(app)
        .get('/api/homework/student')
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
      expect(response.body.data[0].studentIds).toContain(studentId);
    });
  });

  describe('PUT /api/homework/:id', () => {
    it('should update homework properties', async () => {
      const updates = {
        title: 'Updated Homework Title',
        description: 'Updated description'
      };

      const response = await request(app)
        .put(`/api/homework/${homeworkId}`)
        .set('Authorization', `Bearer ${plannerToken}`)
        .send(updates)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.title).toBe(updates.title);
      expect(response.body.data.description).toBe(updates.description);
    });
  });

  describe('POST /api/homework/personalized', () => {
    it('should generate personalized homework based on lesson analysis', async () => {
      const requestData = {
        lessonId,
        studentId
      };

      const response = await request(app)
        .post('/api/homework/personalized')
        .set('Authorization', `Bearer ${plannerToken}`)
        .send(requestData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.isPersonalized).toBe(true);
      expect(response.body.data.basedOnLessonId).toBe(lessonId);
      expect(response.body.data.personalizedData).toBeDefined();
    });
  });

  describe('POST /api/homework/:id/save-as-template', () => {
    it('should save homework as a template', async () => {
      const templateData = {
        templateName: 'Test Template',
        templateCategory: 'Grammar'
      };

      const response = await request(app)
        .post(`/api/homework/${homeworkId}/save-as-template`)
        .set('Authorization', `Bearer ${plannerToken}`)
        .send(templateData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.isTemplate).toBe(true);
      expect(response.body.data.templateName).toBe(templateData.templateName);
      expect(response.body.data.templateCategory).toBe(templateData.templateCategory);
    });
  });

  describe('GET /api/homework/templates', () => {
    it('should retrieve all templates for a planner', async () => {
      const response = await request(app)
        .get('/api/homework/templates')
        .set('Authorization', `Bearer ${plannerToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
      expect(response.body.data[0].isTemplate).toBe(true);
    });
  });

  describe('POST /api/homework/from-template', () => {
    it('should create homework from a template', async () => {
      // First get a template ID
      const templatesResponse = await request(app)
        .get('/api/homework/templates')
        .set('Authorization', `Bearer ${plannerToken}`);
      
      const templateId = templatesResponse.body.data[0]._id;

      const requestData = {
        templateId,
        studentIds: [studentId],
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      };

      const response = await request(app)
        .post('/api/homework/from-template')
        .set('Authorization', `Bearer ${plannerToken}`)
        .send(requestData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.isTemplate).toBe(false);
      expect(response.body.data.studentIds).toContain(studentId);
    });
  });

  describe('POST /api/homework/bulk-assign', () => {
    it('should assign homework to multiple students', async () => {
      // Create another student
      const anotherStudent = await User.create({
        email: 'student2@test.com',
        password: await bcrypt.hash('password123', 10),
        role: 'student',
        profile: {
          name: 'Another Student',
          learningLevel: 'beginner',
          preferences: {
            language: 'ko',
            notifications: true,
            timezone: 'Asia/Seoul'
          }
        }
      });

      const anotherStudentId = anotherStudent._id.toString();

      const requestData = {
        homeworkData: {
          title: 'Bulk Assigned Homework',
          description: 'This homework is assigned to multiple students',
          type: 'text',
          content: {
            instructions: 'Please complete the following tasks',
            attachments: [],
            questions: [
              {
                id: new mongoose.Types.ObjectId().toString(),
                type: 'text_input',
                question: 'Write a paragraph about your day'
              }
            ]
          },
          dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
        },
        studentIds: [studentId, anotherStudentId]
      };

      const response = await request(app)
        .post('/api/homework/bulk-assign')
        .set('Authorization', `Bearer ${plannerToken}`)
        .send(requestData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.studentIds.length).toBe(2);
      expect(response.body.data.studentIds).toContain(studentId);
      expect(response.body.data.studentIds).toContain(anotherStudentId);
    });
  });

  describe('DELETE /api/homework/:id', () => {
    it('should delete homework', async () => {
      await request(app)
        .delete(`/api/homework/${homeworkId}`)
        .set('Authorization', `Bearer ${plannerToken}`)
        .expect(200);

      // Verify it's deleted
      await request(app)
        .get(`/api/homework/${homeworkId}`)
        .set('Authorization', `Bearer ${plannerToken}`)
        .expect(404);
    });
  });
});