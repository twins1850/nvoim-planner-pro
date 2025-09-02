import request from 'supertest';
import mongoose from 'mongoose';
import app from '../../server';
import Feedback from '../../models/Feedback';
import HomeworkSubmission from '../../models/HomeworkSubmission';
import User from '../../models/User';
import Homework from '../../models/Homework';
import { generateToken } from '../../utils/jwt';

describe('Feedback API Integration Tests', () => {
  let plannerToken: string;
  let studentToken: string;
  let plannerId: string;
  let studentId: string;
  let homeworkId: string;
  let submissionId: string;
  let feedbackId: string;

  // Setup test data before running tests
  beforeAll(async () => {
    // Clear relevant collections
    await Feedback.deleteMany({});
    await HomeworkSubmission.deleteMany({});
    await Homework.deleteMany({});
    
    // Create test users
    const planner = await User.create({
      email: 'planner.feedback@test.com',
      password: 'password123',
      role: 'planner',
      profile: {
        name: 'Test Planner',
        preferences: {}
      }
    });
    
    const student = await User.create({
      email: 'student.feedback@test.com',
      password: 'password123',
      role: 'student',
      profile: {
        name: 'Test Student',
        preferences: {}
      }
    });
    
    plannerId = planner._id.toString();
    studentId = student._id.toString();
    
    // Generate tokens
    plannerToken = generateToken(plannerId, 'planner');
    studentToken = generateToken(studentId, 'student');
    
    // Create test homework
    const homework = await Homework.create({
      plannerId: plannerId,
      studentIds: [studentId],
      title: 'Test Homework for Feedback',
      description: 'This is a test homework for feedback testing',
      type: 'mixed',
      content: {
        instructions: 'Complete the following tasks',
        attachments: [],
        questions: [
          {
            id: 'q1',
            type: 'text_input',
            question: 'Write a paragraph about your day',
            targetAnswer: 'A sample paragraph about a day'
          },
          {
            id: 'q2',
            type: 'audio_recording',
            question: 'Record yourself reading the following text',
            targetAnswer: 'This is a sample text for pronunciation practice'
          }
        ]
      },
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
      status: 'sent'
    });
    
    homeworkId = homework._id.toString();
    
    // Create test submission
    const submission = await HomeworkSubmission.create({
      homeworkId: homeworkId,
      studentId: studentId,
      answers: [
        {
          questionId: 'q1',
          type: 'text',
          content: 'Today I went to the park and had a great time with my friends.'
        },
        {
          questionId: 'q2',
          type: 'audio',
          content: 'https://example.com/test-audio.mp3'
        }
      ],
      submittedAt: new Date(),
      status: 'submitted'
    });
    
    submissionId = submission._id.toString();
    
    // Mock the AI evaluation service
    jest.spyOn(global, 'fetch').mockImplementation((url: string) => {
      if (url.includes('azure') || url.includes('openai')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            pronunciationScore: 85,
            completenessScore: 90,
            fluencyScore: 80,
            prosodyScore: 75,
            grammarScore: 4,
            vocabularyScore: 4,
            grammarFeedback: 'Good grammar with minor issues',
            vocabularyFeedback: 'Good vocabulary usage',
            strengths: ['Good pronunciation', 'Clear speech'],
            improvementAreas: ['Work on fluency', 'Practice intonation'],
            detailedFeedback: 'Overall good performance with some areas to improve'
          })
        } as Response);
      }
      return Promise.reject(new Error('Unexpected URL'));
    });
  });
  
  afterAll(async () => {
    // Clean up
    await Feedback.deleteMany({});
    await HomeworkSubmission.deleteMany({});
    await Homework.deleteMany({});
    await User.deleteMany({ email: { $in: ['planner.feedback@test.com', 'student.feedback@test.com'] } });
    
    // Close MongoDB connection
    await mongoose.connection.close();
    
    // Restore mocks
    jest.restoreAllMocks();
  });
  
  describe('AI Evaluation Generation', () => {
    it('should generate AI evaluation for a homework submission', async () => {
      const response = await request(app)
        .post(`/api/feedback/submissions/${submissionId}/evaluate`)
        .set('Authorization', `Bearer ${plannerToken}`)
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('aiEvaluation');
      expect(response.body.data.aiEvaluation).toHaveProperty('overallScore');
      expect(response.body.data.aiEvaluation).toHaveProperty('strengths');
      expect(response.body.data.aiEvaluation).toHaveProperty('improvementAreas');
      
      feedbackId = response.body.data._id;
      
      // Check if submission status was updated
      const updatedSubmission = await HomeworkSubmission.findById(submissionId);
      expect(updatedSubmission?.status).toBe('ai_evaluated');
    });
    
    it('should not allow generating evaluation for non-existent submission', async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();
      
      await request(app)
        .post(`/api/feedback/submissions/${fakeId}/evaluate`)
        .set('Authorization', `Bearer ${plannerToken}`)
        .expect(404);
    });
  });
  
  describe('Planner Feedback Management', () => {
    it('should allow planner to add feedback to AI evaluation', async () => {
      const plannerFeedback = {
        overallScore: 4,
        comments: 'Good job overall, but there are some areas to improve.',
        textAttachments: ['This is a text attachment with additional feedback.'],
        assessmentCriteria: [
          {
            criteriaId: 'pronunciation',
            name: 'Pronunciation Accuracy',
            score: 4,
            maxScore: 5,
            comments: 'Good pronunciation with minor issues.'
          },
          {
            criteriaId: 'grammar',
            name: 'Grammar Accuracy',
            score: 3,
            maxScore: 5,
            comments: 'Some grammar mistakes that need attention.'
          }
        ]
      };
      
      const response = await request(app)
        .post(`/api/feedback/${feedbackId}/planner-review`)
        .set('Authorization', `Bearer ${plannerToken}`)
        .send(plannerFeedback)
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('plannerFeedback');
      expect(response.body.data.plannerFeedback.overallScore).toBe(4);
      expect(response.body.data.status).toBe('planner_reviewed');
      
      // Check if submission status was updated
      const updatedSubmission = await HomeworkSubmission.findById(submissionId);
      expect(updatedSubmission?.status).toBe('reviewed');
    });
    
    it('should send feedback to student', async () => {
      const response = await request(app)
        .post(`/api/feedback/${feedbackId}/send`)
        .set('Authorization', `Bearer ${plannerToken}`)
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('sent_to_student');
      
      // Check if submission status was updated
      const updatedSubmission = await HomeworkSubmission.findById(submissionId);
      expect(updatedSubmission?.status).toBe('completed');
    });
  });
  
  describe('Student Feedback Access', () => {
    it('should allow student to view their feedback', async () => {
      const response = await request(app)
        .get(`/api/feedback/student`)
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.data.length).toBeGreaterThan(0);
      expect(response.body.data[0].status).toBe('sent_to_student');
    });
    
    it('should allow student to mark feedback as viewed', async () => {
      const response = await request(app)
        .post(`/api/feedback/${feedbackId}/mark-viewed`)
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.data.studentViewed).toBe(true);
      expect(response.body.data.studentViewedAt).toBeDefined();
    });
    
    it('should provide feedback analytics for student', async () => {
      const response = await request(app)
        .get(`/api/feedback/analytics/student`)
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('averageScore');
      expect(response.body.data).toHaveProperty('feedbackCount');
      expect(response.body.data).toHaveProperty('criteriaAverages');
      expect(response.body.data).toHaveProperty('improvementTrend');
    });
  });
  
  describe('Planner Feedback Management', () => {
    it('should allow planner to get pending feedback', async () => {
      const response = await request(app)
        .get(`/api/feedback/pending`)
        .set('Authorization', `Bearer ${plannerToken}`)
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
    });
    
    it('should allow planner to get all feedback they created', async () => {
      const response = await request(app)
        .get(`/api/feedback/planner`)
        .set('Authorization', `Bearer ${plannerToken}`)
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.data.length).toBeGreaterThan(0);
    });
  });
  
  describe('Feedback Access Control', () => {
    it('should not allow unauthorized access to feedback', async () => {
      await request(app)
        .get(`/api/feedback/${feedbackId}`)
        .expect(401);
    });
    
    it('should not allow student to access another student\'s feedback', async () => {
      // Create another student
      const anotherStudent = await User.create({
        email: 'another.student@test.com',
        password: 'password123',
        role: 'student',
        profile: {
          name: 'Another Student',
          preferences: {}
        }
      });
      
      const anotherStudentToken = generateToken(anotherStudent._id.toString(), 'student');
      
      // Try to access feedback that doesn't belong to this student
      await request(app)
        .get(`/api/feedback/${feedbackId}`)
        .set('Authorization', `Bearer ${anotherStudentToken}`)
        .expect(403);
      
      // Clean up
      await User.deleteOne({ _id: anotherStudent._id });
    });
  });
});