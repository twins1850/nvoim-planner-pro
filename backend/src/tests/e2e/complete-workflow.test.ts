import request from 'supertest';
import mongoose from 'mongoose';
import app from '../../server';
import * as dbSetup from '../utils/setupTestDB';
import { User } from '../../models/User';
import { Lesson } from '../../models/Lesson';
import { Homework } from '../../models/Homework';
import { HomeworkSubmission } from '../../models/HomeworkSubmission';
import { Feedback } from '../../models/Feedback';
import { createTestUser, createTestLesson, createTestHomework } from '../utils/testDataGenerator';
import path from 'path';
import fs from 'fs';

describe('End-to-End Workflow Tests', () => {
  let mongoServer: any;
  let plannerToken: string;
  let studentToken: string;
  let plannerId: string;
  let studentId: string;
  let lessonId: string;
  let homeworkId: string;
  let submissionId: string;

  beforeAll(async () => {
    // Setup in-memory database
    const result = await dbSetup.connect();
    mongoServer = result.mongoServer;
  });

  afterAll(async () => {
    // Close database connection
    await dbSetup.closeDatabase(mongoServer);
  });

  beforeEach(async () => {
    // Clear database collections before each test
    await dbSetup.clearDatabase();
  });

  describe('Complete User Workflow', () => {
    it('should execute the complete planner-student workflow', async () => {
      // Step 1: Create test users (planner and student)
      const plannerData = await createTestUser({ role: 'planner' });
      const studentData = await createTestUser({ role: 'student' });
      
      plannerId = plannerData.user._id.toString();
      studentId = studentData.user._id.toString();

      // Step 2: Login as planner
      const plannerLoginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: plannerData.email,
          password: plannerData.password
        });
      
      expect(plannerLoginResponse.status).toBe(200);
      expect(plannerLoginResponse.body).toHaveProperty('data.token');
      plannerToken = plannerLoginResponse.body.data.token;

      // Step 3: Login as student
      const studentLoginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: studentData.email,
          password: studentData.password
        });
      
      expect(studentLoginResponse.status).toBe(200);
      expect(studentLoginResponse.body).toHaveProperty('data.token');
      studentToken = studentLoginResponse.body.data.token;

      // Step 4: Planner uploads a lesson recording
      const testAudioPath = path.join(__dirname, '../fixtures/test-audio.mp3');
      
      // Create test audio file if it doesn't exist
      if (!fs.existsSync(testAudioPath)) {
        const testDir = path.dirname(testAudioPath);
        if (!fs.existsSync(testDir)) {
          fs.mkdirSync(testDir, { recursive: true });
        }
        // Create a simple MP3 file for testing
        fs.writeFileSync(testAudioPath, Buffer.from('test audio data'));
      }

      const uploadResponse = await request(app)
        .post('/api/files/upload')
        .set('Authorization', `Bearer ${plannerToken}`)
        .attach('file', testAudioPath)
        .field('studentName', studentData.user.profile.name)
        .field('lessonDate', new Date().toISOString());
      
      expect(uploadResponse.status).toBe(200);
      expect(uploadResponse.body).toHaveProperty('data.fileId');
      
      // Step 5: Create a lesson with the uploaded file
      const lessonData = await createTestLesson({
        plannerId: mongoose.Types.ObjectId(plannerId),
        studentId: mongoose.Types.ObjectId(studentId),
        audioFileId: uploadResponse.body.data.fileId
      });
      
      lessonId = lessonData._id.toString();

      // Step 6: Analyze the lesson
      const analyzeResponse = await request(app)
        .post(`/api/lessons/${lessonId}/analyze`)
        .set('Authorization', `Bearer ${plannerToken}`);
      
      expect(analyzeResponse.status).toBe(200);
      expect(analyzeResponse.body).toHaveProperty('success', true);

      // Step 7: Create homework based on lesson analysis
      const homeworkResponse = await request(app)
        .post('/api/homework')
        .set('Authorization', `Bearer ${plannerToken}`)
        .send({
          title: 'Test Homework',
          description: 'Homework based on lesson analysis',
          type: 'mixed',
          content: {
            instructions: 'Please complete the following exercises',
            questions: [
              {
                type: 'audio_recording',
                question: 'Record yourself saying the following sentence'
              },
              {
                type: 'text_input',
                question: 'Write a short paragraph about your day'
              }
            ]
          },
          studentIds: [studentId],
          dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          basedOnLessonId: lessonId
        });
      
      expect(homeworkResponse.status).toBe(201);
      expect(homeworkResponse.body).toHaveProperty('data.id');
      homeworkId = homeworkResponse.body.data.id;

      // Step 8: Student views assigned homework
      const studentHomeworkResponse = await request(app)
        .get('/api/homework/assigned')
        .set('Authorization', `Bearer ${studentToken}`);
      
      expect(studentHomeworkResponse.status).toBe(200);
      expect(studentHomeworkResponse.body).toHaveProperty('data');
      expect(Array.isArray(studentHomeworkResponse.body.data)).toBe(true);
      expect(studentHomeworkResponse.body.data.length).toBeGreaterThan(0);
      
      // Find the homework we just created
      const assignedHomework = studentHomeworkResponse.body.data.find(
        (hw: any) => hw.id === homeworkId
      );
      expect(assignedHomework).toBeDefined();

      // Step 9: Student submits homework
      const submissionResponse = await request(app)
        .post(`/api/homework/${homeworkId}/submit`)
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          answers: [
            {
              questionId: assignedHomework.content.questions[0].id,
              type: 'audio',
              content: uploadResponse.body.data.fileId // Reuse the audio file for simplicity
            },
            {
              questionId: assignedHomework.content.questions[1].id,
              type: 'text',
              content: 'This is my homework submission text.'
            }
          ]
        });
      
      expect(submissionResponse.status).toBe(201);
      expect(submissionResponse.body).toHaveProperty('data.id');
      submissionId = submissionResponse.body.data.id;

      // Step 10: AI evaluates the submission
      const evaluationResponse = await request(app)
        .post(`/api/homework/submissions/${submissionId}/evaluate`)
        .set('Authorization', `Bearer ${plannerToken}`);
      
      expect(evaluationResponse.status).toBe(200);
      expect(evaluationResponse.body).toHaveProperty('success', true);

      // Step 11: Planner reviews and provides feedback
      const feedbackResponse = await request(app)
        .post(`/api/feedback`)
        .set('Authorization', `Bearer ${plannerToken}`)
        .send({
          submissionId,
          content: 'Great job on your homework submission!',
          rating: 4,
          improvementAreas: ['Work on pronunciation of certain words'],
          strengths: ['Good vocabulary usage']
        });
      
      expect(feedbackResponse.status).toBe(201);
      expect(feedbackResponse.body).toHaveProperty('data.id');
      const feedbackId = feedbackResponse.body.data.id;

      // Step 12: Student views feedback
      const studentFeedbackResponse = await request(app)
        .get(`/api/feedback/received`)
        .set('Authorization', `Bearer ${studentToken}`);
      
      expect(studentFeedbackResponse.status).toBe(200);
      expect(studentFeedbackResponse.body).toHaveProperty('data');
      expect(Array.isArray(studentFeedbackResponse.body.data)).toBe(true);
      expect(studentFeedbackResponse.body.data.length).toBeGreaterThan(0);
      
      // Find the feedback we just created
      const receivedFeedback = studentFeedbackResponse.body.data.find(
        (fb: any) => fb.id === feedbackId
      );
      expect(receivedFeedback).toBeDefined();

      // Step 13: Student checks progress
      const progressResponse = await request(app)
        .get('/api/progress')
        .set('Authorization', `Bearer ${studentToken}`);
      
      expect(progressResponse.status).toBe(200);
      expect(progressResponse.body).toHaveProperty('data');
      expect(progressResponse.body.data).toHaveProperty('completedHomework');
      expect(progressResponse.body.data).toHaveProperty('averageRating');

      // Step 14: Planner generates a report
      const reportResponse = await request(app)
        .post('/api/reporting/generate')
        .set('Authorization', `Bearer ${plannerToken}`)
        .send({
          studentId,
          period: 'monthly',
          includeDetails: true
        });
      
      expect(reportResponse.status).toBe(200);
      expect(reportResponse.body).toHaveProperty('data.report');
      expect(reportResponse.body.data.report).toHaveProperty('studentName');
      expect(reportResponse.body.data.report).toHaveProperty('lessonCount');
      expect(reportResponse.body.data.report).toHaveProperty('homeworkCompletionRate');
    });
  });
});