import { SocketService } from '../../services/socketService';
import { createServer } from 'http';

// Mock dependencies
jest.mock('../../models/User');
jest.mock('../../utils/logger');
jest.mock('../../config/redis');

describe('SocketService Basic Tests', () => {
  let httpServer: any;

  beforeAll(() => {
    httpServer = createServer();
  });

  afterAll(() => {
    if (httpServer) {
      httpServer.close();
    }
  });

  describe('Initialization', () => {
    it('should initialize SocketService without errors', () => {
      expect(() => {
        SocketService.initialize(httpServer);
      }).not.toThrow();
    });

    it('should return Socket.io instance after initialization', () => {
      SocketService.initialize(httpServer);
      const io = SocketService.getIO();
      expect(io).toBeDefined();
    });

    it('should throw error if trying to get IO before initialization', () => {
      // Create new service instance without initialization
      const SocketServiceTest = require('../../services/socketService').SocketService;
      
      // Reset the static property by re-importing
      jest.resetModules();
      const { SocketService: FreshSocketService } = require('../../services/socketService');
      
      expect(() => {
        FreshSocketService.getIO();
      }).toThrow('Socket.io가 초기화되지 않았습니다.');
    });
  });

  describe('Utility Methods', () => {
    beforeAll(() => {
      SocketService.initialize(httpServer);
    });

    it('should have sendToUser method', () => {
      expect(typeof SocketService.sendToUser).toBe('function');
    });

    it('should have sendToRoom method', () => {
      expect(typeof SocketService.sendToRoom).toBe('function');
    });

    it('should have broadcast method', () => {
      expect(typeof SocketService.broadcast).toBe('function');
    });

    it('should have getActiveRooms method', () => {
      expect(typeof SocketService.getActiveRooms).toBe('function');
      const rooms = SocketService.getActiveRooms();
      expect(Array.isArray(rooms)).toBe(true);
    });

    it('should have getOnlineUserCount method', () => {
      expect(typeof SocketService.getOnlineUserCount).toBe('function');
      const count = SocketService.getOnlineUserCount();
      expect(typeof count).toBe('number');
      expect(count).toBeGreaterThanOrEqual(0);
    });

    it('should have isUserOnline method', () => {
      expect(typeof SocketService.isUserOnline).toBe('function');
      const isOnline = SocketService.isUserOnline('test-user');
      expect(typeof isOnline).toBe('boolean');
    });

    it('should have emitHomeworkEvent method', () => {
      expect(typeof SocketService.emitHomeworkEvent).toBe('function');
    });

    it('should have emitAnalysisProgress method', () => {
      expect(typeof SocketService.emitAnalysisProgress).toBe('function');
    });

    it('should have emitNotification method', () => {
      expect(typeof SocketService.emitNotification).toBe('function');
    });
  });

  describe('Event Data Validation', () => {
    beforeAll(() => {
      SocketService.initialize(httpServer);
    });

    it('should handle homework event data structure', () => {
      const homeworkEventData = {
        homeworkId: 'hw123',
        plannerId: 'planner123',
        action: 'assigned' as const,
        timestamp: new Date(),
        data: {
          studentIds: ['student1', 'student2'],
          dueDate: new Date()
        }
      };

      expect(() => {
        SocketService.emitHomeworkEvent(homeworkEventData);
      }).not.toThrow();
    });

    it('should handle analysis event data structure', () => {
      const analysisEventData = {
        analysisId: 'analysis123',
        fileId: 'file123',
        userId: 'user123',
        type: 'pronunciation' as const,
        stage: 'processing' as const,
        progress: 50,
        timestamp: new Date()
      };

      expect(() => {
        SocketService.emitAnalysisProgress(analysisEventData);
      }).not.toThrow();
    });

    it('should handle notification event data structure', () => {
      const notificationEventData = {
        notificationId: 'notif123',
        recipientId: 'user123',
        type: 'lesson' as const,
        title: 'Test Notification',
        message: 'This is a test notification',
        priority: 'medium' as const,
        timestamp: new Date()
      };

      expect(() => {
        SocketService.emitNotification(notificationEventData);
      }).not.toThrow();
    });
  });

  describe('Room Management', () => {
    beforeAll(() => {
      SocketService.initialize(httpServer);
    });

    it('should initialize with empty active rooms', () => {
      const rooms = SocketService.getActiveRooms();
      expect(rooms).toEqual([]);
    });

    it('should initialize with zero online users', () => {
      const count = SocketService.getOnlineUserCount();
      expect(count).toBe(0);
    });

    it('should return false for non-existent user online status', () => {
      const isOnline = SocketService.isUserOnline('non-existent-user');
      expect(isOnline).toBe(false);
    });
  });
});