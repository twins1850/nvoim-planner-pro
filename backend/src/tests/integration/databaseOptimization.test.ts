import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { User } from '../../models/User';
import { Lesson } from '../../models/Lesson';
import { Homework } from '../../models/Homework';
import { HomeworkSubmission } from '../../models/HomeworkSubmission';
import { Feedback } from '../../models/Feedback';
import { createTestUser, createTestLesson, createTestHomework } from '../utils/testDataGenerator';
import * as dbSetup from '../utils/setupTestDB';

describe('Database Query Optimization Tests', () => {
  let mongoServer: MongoMemoryServer;
  let plannerId: mongoose.Types.ObjectId;
  let studentIds: mongoose.Types.ObjectId[] = [];
  
  beforeAll(async () => {
    // Setup in-memory database
    const result = await dbSetup.connect();
    mongoServer = result.mongoServer;
    
    // Create test users
    const plannerData = await createTestUser({ role: 'planner' });
    plannerId = plannerData.user._id;
    
    // Create multiple students
    for (let i = 0; i < 10; i++) {
      const studentData = await createTestUser({ 
        role: 'student',
        email: `student${i}@example.com`,
        name: `Student ${i}`
      });
      studentIds.push(studentData.user._id);
    }
    
    // Create test data
    await createTestData(plannerId, studentIds);
  });
  
  afterAll(async () => {
    await dbSetup.closeDatabase(mongoServer);
  });
  
  describe('Query Performance Tests', () => {
    it('should efficiently query lessons with pagination', async () => {
      const startTime = Date.now();
      
      // Execute paginated query
      const page = 1;
      const limit = 5;
      const skip = (page - 1) * limit;
      
      const lessons = await Lesson.find({ plannerId })
        .sort({ lessonDate: -1 })
        .skip(skip)
        .limit(limit)
        .select('studentId lessonDate title status')
        .lean();
      
      const endTime = Date.now();
      const queryTime = endTime - startTime;
      
      // Verify results
      expect(lessons).toHaveLength(5);
      expect(queryTime).toBeLessThan(100); // Query should be fast (< 100ms)
    });
    
    it('should efficiently query lessons with student data using aggregation', async () => {
      const startTime = Date.now();
      
      // Execute aggregation query
      const lessons = await Lesson.aggregate([
        { $match: { plannerId: mongoose.Types.ObjectId(plannerId.toString()) } },
        { $sort: { lessonDate: -1 } },
        { $limit: 5 },
        { $lookup: {
            from: 'users',
            localField: 'studentId',
            foreignField: '_id',
            as: 'student'
          }
        },
        { $unwind: '$student' },
        { $project: {
            _id: 1,
            lessonDate: 1,
            title: 1,
            status: 1,
            'student.profile.name': 1
          }
        }
      ]);
      
      const endTime = Date.now();
      const queryTime = endTime - startTime;
      
      // Verify results
      expect(lessons).toHaveLength(5);
      expect(lessons[0]).toHaveProperty('student.profile.name');
      expect(queryTime).toBeLessThan(150); // Aggregation should be reasonably fast
    });
    
    it('should efficiently query homework submissions with filtering', async () => {
      const startTime = Date.now();
      
      // Execute filtered query
      const submissions = await HomeworkSubmission.find({
        plannerId,
        status: 'submitted',
        submittedAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
      })
        .sort({ submittedAt: -1 })
        .select('homeworkId studentId submittedAt status')
        .lean();
      
      const endTime = Date.now();
      const queryTime = endTime - startTime;
      
      // Verify results
      expect(submissions.length).toBeGreaterThan(0);
      expect(queryTime).toBeLessThan(100); // Query should be fast
    });
    
    it('should efficiently count documents by status', async () => {
      const startTime = Date.now();
      
      // Execute count query
      const counts = await HomeworkSubmission.aggregate([
        { $match: { plannerId: mongoose.Types.ObjectId(plannerId.toString()) } },
        { $group: {
            _id: '$status',
            count: { $sum: 1 }
          }
        },
        { $sort: { _id: 1 } }
      ]);
      
      const endTime = Date.now();
      const queryTime = endTime - startTime;
      
      // Verify results
      expect(counts.length).toBeGreaterThan(0);
      expect(queryTime).toBeLessThan(100); // Aggregation should be fast
    });
    
    it('should efficiently query student progress data', async () => {
      const startTime = Date.now();
      
      // Execute complex aggregation
      const studentProgress = await HomeworkSubmission.aggregate([
        { $match: { 
            plannerId: mongoose.Types.ObjectId(plannerId.toString()),
            status: { $in: ['submitted', 'evaluated'] }
          }
        },
        { $group: {
            _id: '$studentId',
            submissionCount: { $sum: 1 },
            lastSubmission: { $max: '$submittedAt' }
          }
        },
        { $lookup: {
            from: 'users',
            localField: '_id',
            foreignField: '_id',
            as: 'student'
          }
        },
        { $unwind: '$student' },
        { $lookup: {
            from: 'feedback',
            let: { studentId: '$_id' },
            pipeline: [
              { $match: { 
                  $expr: { $eq: ['$studentId', '$$studentId'] } 
                }
              },
              { $sort: { createdAt: -1 } },
              { $limit: 1 }
            ],
            as: 'latestFeedback'
          }
        },
        { $project: {
            _id: 1,
            studentName: '$student.profile.name',
            submissionCount: 1,
            lastSubmission: 1,
            latestFeedback: { $arrayElemAt: ['$latestFeedback', 0] }
          }
        },
        { $sort: { lastSubmission: -1 } }
      ]);
      
      const endTime = Date.now();
      const queryTime = endTime - startTime;
      
      // Verify results
      expect(studentProgress.length).toBeGreaterThan(0);
      expect(queryTime).toBeLessThan(200); // Complex aggregation should be reasonably fast
    });
  });
});

// Helper function to create test data
async function createTestData(plannerId: mongoose.Types.ObjectId, studentIds: mongoose.Types.ObjectId[]) {
  // Create lessons
  const lessons = [];
  for (let i = 0; i < 20; i++) {
    const studentId = studentIds[i % studentIds.length];
    const lessonDate = new Date();
    lessonDate.setDate(lessonDate.getDate() - i);
    
    const lesson = await createTestLesson({
      plannerId,
      studentId,
      lessonDate,
      title: `Lesson ${i + 1}`
    });
    
    lessons.push(lesson);
  }
  
  // Create homework assignments
  const homeworks = [];
  for (let i = 0; i < 15; i++) {
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 7 - i);
    
    const homework = await createTestHomework({
      plannerId,
      title: `Homework ${i + 1}`,
      description: `Description for homework ${i + 1}`,
      studentIds: i % 3 === 0 ? studentIds : [studentIds[i % studentIds.length]],
      dueDate
    });
    
    homeworks.push(homework);
  }
  
  // Create homework submissions
  for (let i = 0; i < 30; i++) {
    const homeworkIndex = i % homeworks.length;
    const studentIndex = i % studentIds.length;
    const submittedAt = new Date();
    submittedAt.setDate(submittedAt.getDate() - (i % 14));
    
    const submission = new HomeworkSubmission({
      homeworkId: homeworks[homeworkIndex]._id,
      studentId: studentIds[studentIndex],
      plannerId,
      submittedAt,
      status: i % 5 === 0 ? 'pending' : (i % 3 === 0 ? 'submitted' : 'evaluated'),
      answers: [
        {
          questionId: `q${i}`,
          type: 'text',
          content: `Answer for question ${i}`
        }
      ]
    });
    
    await submission.save();
    
    // Create feedback for evaluated submissions
    if (submission.status === 'evaluated') {
      const feedback = new Feedback({
        submissionId: submission._id,
        studentId: studentIds[studentIndex],
        plannerId,
        content: `Feedback for submission ${i}`,
        rating: (i % 5) + 1,
        createdAt: new Date(submittedAt.getTime() + 24 * 60 * 60 * 1000)
      });
      
      await feedback.save();
    }
  }
}