import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import * as notificationService from '../../services/notificationService';
import Notification from '../../models/Notification';
import DeviceToken from '../../models/DeviceToken';
import User from '../../models/User';
import { messaging } from '../../config/firebase';

// Mock Firebase messaging
jest.mock('../../config/firebase', () => ({
  messaging: {
    sendMulticast: jest.fn().mockResolvedValue({
      successCount: 1,
      failureCount: 0,
      responses: [{ success: true }]
    })
  }
}));

// Mock User service
jest.mock('../../services/userService', () => ({
  getUserById: jest.fn().mockResolvedValue({
    _id: 'student123',
    profile: {
      name: 'Test Student',
      preferences: {
        notifications: true
      }
    }
  })
}));

describe('Notification Service', () => {
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
    // Clear collections before each test
    await Notification.deleteMany({});
    await DeviceToken.deleteMany({});
  });

  describe('createNotification', () => {
    it('should create a notification in the database', async () => {
      const userId = 'user123';
      const type = 'homework_assigned';
      const data = {
        homeworkId: 'homework123',
        homeworkTitle: 'Test Homework',
        dueDate: '2025-07-30'
      };

      const notification = await notificationService.createNotification(userId, type, data);

      expect(notification).toBeDefined();
      expect(notification.userId.toString()).toBe(userId);
      expect(notification.type).toBe(type);
      expect(notification.title).toBeDefined();
      expect(notification.message).toBeDefined();
      expect(notification.data).toEqual(data);
      expect(notification.isRead).toBe(false);
      expect(notification.deliveryStatus).toBe('pending');
    });

    it('should schedule a notification for future delivery', async () => {
      const userId = 'user123';
      const type = 'homework_due';
      const data = { homeworkTitle: 'Test Homework', timeRemaining: '24시간' };
      const scheduledFor = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours from now

      const notification = await notificationService.createNotification(userId, type, data, scheduledFor);

      expect(notification).toBeDefined();
      expect(notification.scheduledFor).toEqual(scheduledFor);
      expect(notification.deliveryStatus).toBe('pending');
    });
  });

  describe('registerDeviceToken', () => {
    it('should register a new device token', async () => {
      const userId = 'user123';
      const token = 'device-token-123';
      const deviceInfo = {
        platform: 'ios' as const,
        model: 'iPhone 13',
        osVersion: '15.0',
        appVersion: '1.0.0'
      };

      await notificationService.registerDeviceToken(userId, token, deviceInfo);

      const savedToken = await DeviceToken.findOne({ token });
      expect(savedToken).toBeDefined();
      expect(savedToken!.userId.toString()).toBe(userId);
      expect(savedToken!.device).toEqual(deviceInfo);
      expect(savedToken!.isActive).toBe(true);
    });

    it('should update an existing device token', async () => {
      // Create initial token
      const initialUserId = 'user123';
      const token = 'device-token-123';
      await DeviceToken.create({
        userId: new mongoose.Types.ObjectId(initialUserId),
        token,
        device: {
          platform: 'ios',
          model: 'iPhone 12'
        },
        isActive: true
      });

      // Update token with new user and device info
      const newUserId = 'user456';
      const newDeviceInfo = {
        platform: 'ios' as const,
        model: 'iPhone 13',
        osVersion: '15.0',
        appVersion: '1.0.0'
      };

      await notificationService.registerDeviceToken(newUserId, token, newDeviceInfo);

      const updatedToken = await DeviceToken.findOne({ token });
      expect(updatedToken).toBeDefined();
      expect(updatedToken!.userId.toString()).toBe(newUserId);
      expect(updatedToken!.device).toEqual(newDeviceInfo);
    });
  });

  describe('sendPushNotification', () => {
    it('should send a push notification and update delivery status', async () => {
      // Create a notification with device tokens
      const notification = new Notification({
        userId: new mongoose.Types.ObjectId('user123'),
        type: 'homework_assigned',
        title: 'New Homework',
        message: 'You have a new homework assignment',
        data: { homeworkId: 'homework123' },
        deviceTokens: ['device-token-1', 'device-token-2']
      });

      await notificationService.sendPushNotification(notification);

      expect(messaging.sendMulticast).toHaveBeenCalled();
      expect(notification.deliveryStatus).toBe('sent');
      expect(notification.analytics?.deliveredAt).toBeDefined();
    });

    it('should handle notifications with no device tokens', async () => {
      const notification = new Notification({
        userId: new mongoose.Types.ObjectId('user123'),
        type: 'homework_assigned',
        title: 'New Homework',
        message: 'You have a new homework assignment',
        data: { homeworkId: 'homework123' },
        deviceTokens: []
      });

      await notificationService.sendPushNotification(notification);

      expect(messaging.sendMulticast).not.toHaveBeenCalled();
      expect(notification.deliveryStatus).toBe('failed');
    });
  });

  describe('generateLessonSummary', () => {
    it('should generate a structured lesson summary from analysis data', () => {
      const analysisData = {
        speakerSegments: [],
        studentMetrics: {
          speakingTime: 300,
          pronunciationAccuracy: 0.75,
          fluencyScore: 0.8,
          vocabularyUsage: [],
          grammarAccuracy: 0.7
        },
        pronunciationScores: [
          { word: 'difficult', score: 0.6, feedback: 'Work on the "cult" sound' },
          { word: 'opportunity', score: 0.5, feedback: 'Practice the rhythm' }
        ],
        participationLevel: 70,
        improvementAreas: [
          'Practice past tense verbs',
          'Work on question formation',
          'Improve vocabulary related to business'
        ],
        lessonInsights: [
          'Good use of present perfect tense',
          'Effective use of the expression "in terms of"',
          'Needs practice with conditional sentences'
        ],
        generatedNotes: 'Sample notes',
        analysisCompletedAt: new Date().toISOString()
      };

      const summary = notificationService.generateLessonSummary(analysisData);

      expect(summary).toBeDefined();
      expect(summary.title).toBe('수업 요약');
      expect(summary.sections).toHaveLength(3);
      expect(summary.sections[0].title).toBe('오늘 배운 주요 표현');
      expect(summary.sections[1].title).toBe('발음 교정 포인트');
      expect(summary.sections[2].title).toBe('개선이 필요한 영역');
    });
  });

  describe('sendLessonAnalysisNotification', () => {
    it('should send a lesson analysis notification with immediate delivery', async () => {
      const lessonId = 'lesson123';
      const studentId = 'student123';
      const lessonDate = new Date();
      const analysis = {
        speakerSegments: [],
        studentMetrics: {
          speakingTime: 300,
          pronunciationAccuracy: 0.75,
          fluencyScore: 0.8,
          vocabularyUsage: [],
          grammarAccuracy: 0.7
        },
        pronunciationScores: [
          { word: 'difficult', score: 0.6, feedback: 'Work on the "cult" sound' }
        ],
        participationLevel: 70,
        improvementAreas: ['Practice past tense verbs'],
        lessonInsights: ['Good use of present perfect tense'],
        generatedNotes: 'Sample notes',
        analysisCompletedAt: new Date().toISOString()
      };

      // Create a spy on createNotification
      const createNotificationSpy = jest.spyOn(notificationService, 'createNotification');

      await notificationService.sendLessonAnalysisNotification(
        lessonId,
        studentId,
        lessonDate,
        analysis,
        'immediate'
      );

      expect(createNotificationSpy).toHaveBeenCalledWith(
        studentId,
        'lesson_analyzed',
        expect.objectContaining({
          lessonId,
          summary: expect.any(String)
        }),
        undefined // immediate delivery
      );

      createNotificationSpy.mockRestore();
    });

    it('should schedule a lesson analysis notification for later delivery', async () => {
      const lessonId = 'lesson123';
      const studentId = 'student123';
      const lessonDate = new Date();
      const analysis = {
        speakerSegments: [],
        studentMetrics: {
          speakingTime: 300,
          pronunciationAccuracy: 0.75,
          fluencyScore: 0.8,
          vocabularyUsage: [],
          grammarAccuracy: 0.7
        },
        pronunciationScores: [],
        participationLevel: 70,
        improvementAreas: [],
        lessonInsights: [],
        generatedNotes: 'Sample notes',
        analysisCompletedAt: new Date().toISOString()
      };

      // Create a spy on createNotification
      const createNotificationSpy = jest.spyOn(notificationService, 'createNotification');

      await notificationService.sendLessonAnalysisNotification(
        lessonId,
        studentId,
        lessonDate,
        analysis,
        'one_hour'
      );

      expect(createNotificationSpy).toHaveBeenCalledWith(
        studentId,
        'lesson_analyzed',
        expect.objectContaining({
          lessonId,
          summary: expect.any(String)
        }),
        expect.any(Date) // scheduled for later
      );

      createNotificationSpy.mockRestore();
    });
  });

  describe('scheduleHomeworkReminder', () => {
    it('should schedule reminder notifications for homework deadlines', async () => {
      const homeworkId = 'homework123';
      const studentId = 'student123';
      const homeworkTitle = 'Test Homework';
      const dueDate = new Date(Date.now() + 48 * 60 * 60 * 1000); // 48 hours from now

      // Create a spy on createNotification
      const createNotificationSpy = jest.spyOn(notificationService, 'createNotification');

      await notificationService.scheduleHomeworkReminder(
        homeworkId,
        studentId,
        homeworkTitle,
        dueDate
      );

      // Should create two notifications (24h and 1h before deadline)
      expect(createNotificationSpy).toHaveBeenCalledTimes(2);
      expect(createNotificationSpy).toHaveBeenCalledWith(
        studentId,
        'homework_due',
        expect.objectContaining({
          homeworkId,
          homeworkTitle
        }),
        expect.any(Date)
      );

      createNotificationSpy.mockRestore();
    });
  });
});