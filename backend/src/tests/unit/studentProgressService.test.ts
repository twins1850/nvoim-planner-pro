import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import studentProgressService from '../../services/studentProgressService';
import { StudentProgress } from '../../models/StudentProgress';

let mongoServer: MongoMemoryServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

beforeEach(async () => {
  await StudentProgress.deleteMany({});
});

describe('Student Progress Service', () => {
  const studentId = new mongoose.Types.ObjectId().toString();
  
  describe('createStudentProgress', () => {
    it('should create a new student progress record', async () => {
      const progress = await studentProgressService.createStudentProgress(studentId);
      
      expect(progress).toBeDefined();
      expect(progress.studentId.toString()).toBe(studentId);
      expect(progress.overallScore).toBe(0);
      expect(progress.completedHomework).toBe(0);
      expect(progress.totalHomework).toBe(0);
      expect(progress.streakDays).toBe(0);
      expect(progress.achievements).toHaveLength(0);
      expect(progress.weeklyProgress).toHaveLength(0);
      expect(progress.goals).toHaveLength(0);
    });
  });
  
  describe('getStudentProgressById', () => {
    it('should get existing student progress', async () => {
      // Create progress first
      await studentProgressService.createStudentProgress(studentId);
      
      // Then get it
      const progress = await studentProgressService.getStudentProgressById(studentId);
      
      expect(progress).toBeDefined();
      expect(progress.studentId.toString()).toBe(studentId);
    });
    
    it('should create new progress if none exists', async () => {
      const newStudentId = new mongoose.Types.ObjectId().toString();
      const progress = await studentProgressService.getStudentProgressById(newStudentId);
      
      expect(progress).toBeDefined();
      expect(progress.studentId.toString()).toBe(newStudentId);
    });
  });
  
  describe('updateProgressAfterSubmission', () => {
    it('should update progress after homework submission', async () => {
      // Create initial progress
      await studentProgressService.createStudentProgress(studentId);
      
      // Update after submission
      const submissionId = new mongoose.Types.ObjectId().toString();
      const score = 85;
      const updatedProgress = await studentProgressService.updateProgressAfterSubmission(
        studentId,
        submissionId,
        score
      );
      
      expect(updatedProgress).toBeDefined();
      expect(updatedProgress.overallScore).toBe(score);
      expect(updatedProgress.completedHomework).toBe(1);
      expect(updatedProgress.streakDays).toBe(1);
      expect(updatedProgress.weeklyProgress).toHaveLength(1);
      expect(updatedProgress.weeklyProgress[0].score).toBe(score);
      expect(updatedProgress.weeklyProgress[0].homeworkCount).toBe(1);
    });
    
    it('should update streak correctly for consecutive days', async () => {
      // Create initial progress with streak of 2
      const progress = await studentProgressService.createStudentProgress(studentId);
      progress.streakDays = 2;
      progress.lastActivityDate = new Date(Date.now() - 24 * 60 * 60 * 1000); // Yesterday
      await progress.save();
      
      // Update after submission
      const submissionId = new mongoose.Types.ObjectId().toString();
      const updatedProgress = await studentProgressService.updateProgressAfterSubmission(
        studentId,
        submissionId,
        90
      );
      
      expect(updatedProgress.streakDays).toBe(3);
    });
    
    it('should reset streak for non-consecutive days', async () => {
      // Create initial progress with streak of 5
      const progress = await studentProgressService.createStudentProgress(studentId);
      progress.streakDays = 5;
      progress.lastActivityDate = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000); // 3 days ago
      await progress.save();
      
      // Update after submission
      const submissionId = new mongoose.Types.ObjectId().toString();
      const updatedProgress = await studentProgressService.updateProgressAfterSubmission(
        studentId,
        submissionId,
        90
      );
      
      expect(updatedProgress.streakDays).toBe(1);
    });
  });
  
  describe('addAchievement', () => {
    it('should add a new achievement', async () => {
      // Create initial progress
      await studentProgressService.createStudentProgress(studentId);
      
      // Add achievement
      const achievement = {
        id: 'test-achievement',
        name: 'Test Achievement',
        description: 'This is a test achievement'
      };
      
      const updatedProgress = await studentProgressService.addAchievement(studentId, achievement);
      
      expect(updatedProgress.achievements).toHaveLength(1);
      expect(updatedProgress.achievements[0].id).toBe(achievement.id);
      expect(updatedProgress.achievements[0].name).toBe(achievement.name);
      expect(updatedProgress.achievements[0].description).toBe(achievement.description);
      expect(updatedProgress.achievements[0].unlockedAt).toBeDefined();
    });
    
    it('should not add duplicate achievements', async () => {
      // Create initial progress with an achievement
      const progress = await studentProgressService.createStudentProgress(studentId);
      progress.achievements.push({
        id: 'test-achievement',
        name: 'Test Achievement',
        description: 'This is a test achievement',
        unlockedAt: new Date()
      });
      await progress.save();
      
      // Try to add the same achievement
      const achievement = {
        id: 'test-achievement',
        name: 'Test Achievement',
        description: 'This is a test achievement'
      };
      
      const updatedProgress = await studentProgressService.addAchievement(studentId, achievement);
      
      expect(updatedProgress.achievements).toHaveLength(1);
    });
  });
  
  describe('addOrUpdateGoal', () => {
    it('should add a new goal', async () => {
      // Create initial progress
      await studentProgressService.createStudentProgress(studentId);
      
      // Add goal
      const goal = {
        id: 'test-goal',
        title: 'Test Goal',
        description: 'This is a test goal',
        targetValue: 10,
        currentValue: 0,
        isCompleted: false
      };
      
      const updatedProgress = await studentProgressService.addOrUpdateGoal(studentId, goal);
      
      expect(updatedProgress.goals).toHaveLength(1);
      expect(updatedProgress.goals[0].id).toBe(goal.id);
      expect(updatedProgress.goals[0].title).toBe(goal.title);
      expect(updatedProgress.goals[0].targetValue).toBe(goal.targetValue);
      expect(updatedProgress.goals[0].createdAt).toBeDefined();
    });
    
    it('should update an existing goal', async () => {
      // Create initial progress with a goal
      const progress = await studentProgressService.createStudentProgress(studentId);
      const createdAt = new Date();
      progress.goals.push({
        id: 'test-goal',
        title: 'Test Goal',
        description: 'This is a test goal',
        targetValue: 10,
        currentValue: 0,
        isCompleted: false,
        createdAt
      });
      await progress.save();
      
      // Update the goal
      const updatedGoal = {
        id: 'test-goal',
        title: 'Updated Goal',
        description: 'This is an updated goal',
        targetValue: 20,
        currentValue: 5,
        isCompleted: false
      };
      
      const updatedProgress = await studentProgressService.addOrUpdateGoal(studentId, updatedGoal);
      
      expect(updatedProgress.goals).toHaveLength(1);
      expect(updatedProgress.goals[0].id).toBe(updatedGoal.id);
      expect(updatedProgress.goals[0].title).toBe(updatedGoal.title);
      expect(updatedProgress.goals[0].targetValue).toBe(updatedGoal.targetValue);
      expect(updatedProgress.goals[0].currentValue).toBe(updatedGoal.currentValue);
      expect(updatedProgress.goals[0].createdAt.getTime()).toBe(createdAt.getTime());
    });
  });
  
  describe('shareProgressWith', () => {
    it('should share progress with another user', async () => {
      // Create initial progress
      await studentProgressService.createStudentProgress(studentId);
      
      // Share with another user
      const userId = new mongoose.Types.ObjectId().toString();
      const updatedProgress = await studentProgressService.shareProgressWith(studentId, userId);
      
      expect(updatedProgress.sharedWith).toHaveLength(1);
      expect(updatedProgress.sharedWith[0].toString()).toBe(userId);
    });
    
    it('should not add duplicate shares', async () => {
      // Create initial progress with a shared user
      const progress = await studentProgressService.createStudentProgress(studentId);
      const userId = new mongoose.Types.ObjectId();
      progress.sharedWith.push(userId);
      await progress.save();
      
      // Try to share with the same user
      const updatedProgress = await studentProgressService.shareProgressWith(studentId, userId.toString());
      
      expect(updatedProgress.sharedWith).toHaveLength(1);
      expect(updatedProgress.sharedWith[0].toString()).toBe(userId.toString());
    });
  });
  
  describe('unshareProgressWith', () => {
    it('should unshare progress with a user', async () => {
      // Create initial progress with two shared users
      const progress = await studentProgressService.createStudentProgress(studentId);
      const userId1 = new mongoose.Types.ObjectId();
      const userId2 = new mongoose.Types.ObjectId();
      progress.sharedWith.push(userId1, userId2);
      await progress.save();
      
      // Unshare with one user
      const updatedProgress = await studentProgressService.unshareProgressWith(studentId, userId1.toString());
      
      expect(updatedProgress.sharedWith).toHaveLength(1);
      expect(updatedProgress.sharedWith[0].toString()).toBe(userId2.toString());
    });
  });
});