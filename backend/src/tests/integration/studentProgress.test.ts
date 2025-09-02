import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import app from '../../server';
import { User } from '../../models/User';
import { StudentProgress } from '../../models/StudentProgress';
import { generateToken } from '../../utils/jwt';

let mongoServer: MongoMemoryServer;
let studentUser: any;
let plannerUser: any;
let studentToken: string;
let plannerToken: string;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);
  
  // Create test users
  studentUser = await User.create({
    email: 'student@test.com',
    password: 'password123',
    role: 'student',
    profile: {
      name: 'Test Student',
      preferences: {
        language: 'ko',
        notifications: true,
        timezone: 'Asia/Seoul'
      },
      learningLevel: 'intermediate'
    }
  });
  
  plannerUser = await User.create({
    email: 'planner@test.com',
    password: 'password123',
    role: 'planner',
    profile: {
      name: 'Test Planner',
      preferences: {
        language: 'ko',
        notifications: true,
        timezone: 'Asia/Seoul'
      },
      managedStudents: [studentUser._id]
    }
  });
  
  // Update student with assigned planner
  studentUser.profile.assignedPlanner = plannerUser._id;
  await studentUser.save();
  
  // Generate tokens
  studentToken = generateToken(studentUser);
  plannerToken = generateToken(plannerUser);
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

beforeEach(async () => {
  await StudentProgress.deleteMany({});
});

describe('Student Progress API', () => {
  describe('GET /api/progress/my-progress', () => {
    it('should get student progress for authenticated student', async () => {
      const response = await request(app)
        .get('/api/progress/my-progress')
        .set('Authorization', `Bearer ${studentToken}`);
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.studentId).toBe(studentUser._id.toString());
      expect(response.body.data.overallScore).toBe(0);
      expect(response.body.data.completedHomework).toBe(0);
    });
    
    it('should return 401 for unauthenticated request', async () => {
      const response = await request(app)
        .get('/api/progress/my-progress');
      
      expect(response.status).toBe(401);
    });
  });
  
  describe('GET /api/progress/student/:studentId', () => {
    it('should get student progress for planner', async () => {
      const response = await request(app)
        .get(`/api/progress/student/${studentUser._id}`)
        .set('Authorization', `Bearer ${plannerToken}`);
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.studentId).toBe(studentUser._id.toString());
    });
    
    it('should return 403 if planner does not manage the student', async () => {
      // Create another student not managed by the planner
      const otherStudent = await User.create({
        email: 'other@test.com',
        password: 'password123',
        role: 'student',
        profile: {
          name: 'Other Student',
          preferences: {
            language: 'ko',
            notifications: true,
            timezone: 'Asia/Seoul'
          },
          learningLevel: 'beginner'
        }
      });
      
      const response = await request(app)
        .get(`/api/progress/student/${otherStudent._id}`)
        .set('Authorization', `Bearer ${plannerToken}`);
      
      expect(response.status).toBe(403);
    });
  });
  
  describe('GET /api/progress/all-students', () => {
    it('should get progress for all students managed by planner', async () => {
      // Create progress for the student
      await request(app)
        .get('/api/progress/my-progress')
        .set('Authorization', `Bearer ${studentToken}`);
      
      const response = await request(app)
        .get('/api/progress/all-students')
        .set('Authorization', `Bearer ${plannerToken}`);
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBe(1);
      expect(response.body.data[0].studentId).toBe(studentUser._id.toString());
    });
  });
  
  describe('POST /api/progress/goals', () => {
    it('should add a new goal for student', async () => {
      const goal = {
        id: 'test-goal',
        title: 'Complete 5 homework assignments',
        description: 'Submit 5 homework assignments by the end of the month',
        targetValue: 5,
        currentValue: 0,
        deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        isCompleted: false
      };
      
      const response = await request(app)
        .post('/api/progress/goals')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ goal });
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.goals).toBeDefined();
      expect(response.body.data.goals.length).toBe(1);
      expect(response.body.data.goals[0].id).toBe(goal.id);
      expect(response.body.data.goals[0].title).toBe(goal.title);
    });
    
    it('should return 400 for invalid goal data', async () => {
      const invalidGoal = {
        // Missing required fields
        id: 'test-goal',
        title: 'Incomplete goal'
      };
      
      const response = await request(app)
        .post('/api/progress/goals')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ goal: invalidGoal });
      
      expect(response.status).toBe(400);
    });
  });
  
  describe('POST /api/progress/share', () => {
    it('should share progress with another user', async () => {
      // Create another user to share with
      const parentUser = await User.create({
        email: 'parent@test.com',
        password: 'password123',
        role: 'planner', // Using planner role for parent
        profile: {
          name: 'Test Parent',
          preferences: {
            language: 'ko',
            notifications: true,
            timezone: 'Asia/Seoul'
          }
        }
      });
      
      const response = await request(app)
        .post('/api/progress/share')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ shareWithEmail: parentUser.email });
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.message).toContain('성공적으로 공유');
      expect(response.body.data.sharedWith).toBe(parentUser.profile.name);
    });
    
    it('should return 404 for non-existent user', async () => {
      const response = await request(app)
        .post('/api/progress/share')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ shareWithEmail: 'nonexistent@test.com' });
      
      expect(response.status).toBe(404);
    });
  });
  
  describe('GET /api/progress/shared', () => {
    it('should get shared progress for a user', async () => {
      // Create another user
      const parentUser = await User.create({
        email: 'parent2@test.com',
        password: 'password123',
        role: 'planner', // Using planner role for parent
        profile: {
          name: 'Test Parent 2',
          preferences: {
            language: 'ko',
            notifications: true,
            timezone: 'Asia/Seoul'
          }
        }
      });
      
      const parentToken = generateToken(parentUser);
      
      // Create progress for student
      await request(app)
        .get('/api/progress/my-progress')
        .set('Authorization', `Bearer ${studentToken}`);
      
      // Share progress with parent
      await request(app)
        .post('/api/progress/share')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ shareWithEmail: parentUser.email });
      
      // Get shared progress
      const response = await request(app)
        .get('/api/progress/shared')
        .set('Authorization', `Bearer ${parentToken}`);
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBe(1);
      expect(response.body.data[0].studentId).toBe(studentUser._id.toString());
      expect(response.body.data[0].studentName).toBe(studentUser.profile.name);
    });
  });
});