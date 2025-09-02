import { HomeworkEventData, AnalysisEventData } from '../../types/socket';

// Redis 클라이언트 모킹
const mockClient = {
  connect: jest.fn().mockResolvedValue(undefined),
  quit: jest.fn().mockResolvedValue(undefined),
  publish: jest.fn().mockResolvedValue(1),
  subscribe: jest.fn().mockResolvedValue(undefined),
  ping: jest.fn().mockResolvedValue('PONG'),
  on: jest.fn(),
  isReady: true
};

jest.mock('redis', () => ({
  createClient: jest.fn(() => mockClient)
}));

// 로거 모킹
jest.mock('../../utils/logger', () => ({
  logWithContext: jest.fn()
}));

// SocketService 모킹
jest.mock('../../services/socketService', () => ({
  SocketService: {
    emitHomeworkEvent: jest.fn(),
    emitAnalysisProgress: jest.fn(),
    emitNotification: jest.fn(),
    sendToRoom: jest.fn(),
    sendToUser: jest.fn(),
    broadcast: jest.fn()
  }
}));

describe('RedisPubSubService Basic Tests', () => {
  let RedisPubSubService: any;

  beforeEach(async () => {
    jest.clearAllMocks();
    jest.resetModules();
    
    // 동적 import를 사용하여 매번 새로 로드
    const module = await import('../../services/redisPubSubService');
    RedisPubSubService = module.RedisPubSubService;
    
    // 초기화 상태 리셋
    (RedisPubSubService as any).isInitialized = false;
  });

  describe('Initialization', () => {
    it('should have static methods defined', () => {
      expect(typeof RedisPubSubService.initialize).toBe('function');
      expect(typeof RedisPubSubService.shutdown).toBe('function');
      expect(typeof RedisPubSubService.isReady).toBe('function');
      expect(typeof RedisPubSubService.publishHomeworkEvent).toBe('function');
      expect(typeof RedisPubSubService.publishAnalysisEvent).toBe('function');
    });

    it('should initialize without throwing errors', async () => {
      await expect(RedisPubSubService.initialize()).resolves.not.toThrow();
    });

    it('should return connection status', () => {
      const status = RedisPubSubService.getConnectionStatus();
      expect(status).toHaveProperty('initialized');
      expect(status).toHaveProperty('publisherReady');
      expect(status).toHaveProperty('subscriberReady');
    });
  });

  describe('Event Publishing', () => {
    beforeEach(async () => {
      await RedisPubSubService.initialize();
    });

    it('should publish homework events without errors', async () => {
      const homeworkEvent: HomeworkEventData = {
        homeworkId: 'hw123',
        plannerId: 'planner123',
        action: 'assigned',
        timestamp: new Date(),
        data: {
          studentIds: ['student1', 'student2'],
          dueDate: new Date()
        }
      };

      await expect(RedisPubSubService.publishHomeworkEvent(homeworkEvent)).resolves.not.toThrow();
    });

    it('should publish analysis events without errors', async () => {
      const analysisEvent: AnalysisEventData = {
        analysisId: 'analysis123',
        fileId: 'file123',
        userId: 'user123',
        type: 'pronunciation',
        stage: 'processing',
        progress: 50,
        timestamp: new Date()
      };

      await expect(RedisPubSubService.publishAnalysisEvent(analysisEvent)).resolves.not.toThrow();
    });

    it('should publish system events without errors', async () => {
      const systemEvent = {
        type: 'maintenance' as const,
        message: 'System maintenance',
        priority: 'high' as const
      };

      await expect(RedisPubSubService.publishSystemEvent(systemEvent)).resolves.not.toThrow();
    });
  });

  describe('Utility Methods', () => {
    beforeEach(async () => {
      await RedisPubSubService.initialize();
    });

    it('should return ready status', () => {
      const isReady = RedisPubSubService.isReady();
      expect(typeof isReady).toBe('boolean');
    });

    it('should handle ping operation', async () => {
      const result = await RedisPubSubService.ping();
      expect(typeof result).toBe('boolean');
    });
  });

  describe('Error Handling', () => {
    it('should handle shutdown gracefully', async () => {
      await RedisPubSubService.initialize();
      await expect(RedisPubSubService.shutdown()).resolves.not.toThrow();
    });

    it('should handle multiple initialization calls', async () => {
      await RedisPubSubService.initialize();
      await expect(RedisPubSubService.initialize()).resolves.not.toThrow();
    });
  });
});