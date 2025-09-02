import { Server as HTTPServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { SocketService } from '../../services/socketService';
import { createServer } from 'http';
import { AddressInfo } from 'net';
import { io } from 'socket.io-client';
import jwt from 'jsonwebtoken';
import { User } from '../../models/User';

// Mock dependencies
jest.mock('../../models/User');
jest.mock('../../utils/logger');
jest.mock('../../config/redis');

describe('SocketService', () => {
  let httpServer: HTTPServer;
  let port: number;
  let clientSocket: any;

  beforeAll((done) => {
    httpServer = createServer();
    httpServer.listen(() => {
      port = (httpServer.address() as AddressInfo).port;
      
      // Initialize SocketService
      SocketService.initialize(httpServer);
      
      done();
    });
  });

  afterAll((done) => {
    httpServer.close();
    done();
  });

  beforeEach((done) => {
    // Mock user for authentication
    const mockUser = {
      _id: 'user123',
      userType: 'planner',
      profile: {
        name: 'Test User'
      }
    };

    (User.findById as jest.Mock).mockResolvedValue(mockUser);

    // Generate valid JWT token
    const token = jwt.sign(
      { id: 'user123' },
      process.env.JWT_SECRET || 'test-secret',
      { expiresIn: '1h' }
    );

    // Create client socket
    clientSocket = io(`http://localhost:${port}`, {
      auth: {
        token
      },
      transports: ['websocket'],
      forceNew: true
    });

    clientSocket.on('connect', done);
  });

  afterEach(() => {
    if (clientSocket.connected) {
      clientSocket.disconnect();
    }
    jest.clearAllMocks();
  });

  describe('Socket Authentication', () => {
    it('should authenticate user with valid token', (done) => {
      clientSocket.on('connection_established', (data: any) => {
        expect(data.userId).toBe('user123');
        expect(data.timestamp).toBeDefined();
        done();
      });
    });

    it('should reject connection with invalid token', (done) => {
      const invalidClient = io(`http://localhost:${port}`, {
        auth: {
          token: 'invalid-token'
        },
        transports: ['websocket'],
        forceNew: true
      });

      invalidClient.on('connect_error', (error: any) => {
        expect(error.message).toContain('인증에 실패했습니다');
        invalidClient.disconnect();
        done();
      });
    });

    it('should reject connection without token', (done) => {
      const noTokenClient = io(`http://localhost:${port}`, {
        transports: ['websocket'],
        forceNew: true
      });

      noTokenClient.on('connect_error', (error: any) => {
        expect(error.message).toContain('인증 토큰이 필요합니다');
        noTokenClient.disconnect();
        done();
      });
    });
  });

  describe('Room Management', () => {
    it('should allow user to join a room', (done) => {
      clientSocket.emit('join_room', {
        roomId: 'lesson_123',
        roomType: 'lesson'
      });

      // Wait a bit for the room join to process
      setTimeout(() => {
        const activeRooms = SocketService.getActiveRooms();
        const lessonRoom = activeRooms.find(room => room.roomId === 'lesson_123');
        
        expect(lessonRoom).toBeDefined();
        expect(lessonRoom?.participants).toContain('user123');
        done();
      }, 100);
    });

    it('should allow user to leave a room', (done) => {
      // First join a room
      clientSocket.emit('join_room', {
        roomId: 'lesson_123',
        roomType: 'lesson'
      });

      setTimeout(() => {
        // Then leave the room
        clientSocket.emit('leave_room', {
          roomId: 'lesson_123'
        });

        setTimeout(() => {
          const activeRooms = SocketService.getActiveRooms();
          const lessonRoom = activeRooms.find(room => room.roomId === 'lesson_123');
          
          // Room should be deleted when no participants
          expect(lessonRoom).toBeUndefined();
          done();
        }, 100);
      }, 100);
    });
  });

  describe('Lesson Management', () => {
    beforeEach((done) => {
      // Join lesson room first
      clientSocket.emit('join_room', {
        roomId: 'lesson_123',
        roomType: 'lesson'
      });
      setTimeout(done, 100);
    });

    it('should allow planner to start a lesson', (done) => {
      clientSocket.on('lesson_started', (data: any) => {
        expect(data.lessonId).toBe('123');
        expect(data.plannerId).toBe('user123');
        expect(data.studentIds).toEqual(['student1', 'student2']);
        done();
      });

      clientSocket.emit('start_lesson', {
        lessonId: '123',
        studentIds: ['student1', 'student2']
      });
    });

    it('should allow planner to end a lesson', (done) => {
      clientSocket.on('lesson_ended', (data: any) => {
        expect(data.lessonId).toBe('123');
        expect(data.duration).toBeDefined();
        done();
      });

      clientSocket.emit('end_lesson', {
        lessonId: '123'
      });
    });

    it('should allow planner to pause a lesson', (done) => {
      clientSocket.on('lesson_paused', (data: any) => {
        expect(data.lessonId).toBe('123');
        expect(data.timestamp).toBeDefined();
        done();
      });

      clientSocket.emit('pause_lesson', {
        lessonId: '123'
      });
    });

    it('should allow planner to resume a lesson', (done) => {
      clientSocket.on('lesson_resumed', (data: any) => {
        expect(data.lessonId).toBe('123');
        expect(data.timestamp).toBeDefined();
        done();
      });

      clientSocket.emit('resume_lesson', {
        lessonId: '123'
      });
    });

    it('should reject lesson management from non-planner', (done) => {
      // Mock a student user
      const studentUser = {
        _id: 'student123',
        userType: 'student',
        profile: { name: 'Student User' }
      };

      (User.findById as jest.Mock).mockResolvedValue(studentUser);

      const studentToken = jwt.sign(
        { id: 'student123' },
        process.env.JWT_SECRET || 'test-secret',
        { expiresIn: '1h' }
      );

      const studentSocket = io(`http://localhost:${port}`, {
        auth: { token: studentToken },
        transports: ['websocket'],
        forceNew: true
      });

      studentSocket.on('connect', () => {
        studentSocket.on('error', (error: any) => {
          expect(error.code).toBe('PERMISSION_DENIED');
          expect(error.message).toContain('수업을 시작할 권한이 없습니다');
          studentSocket.disconnect();
          done();
        });

        studentSocket.emit('start_lesson', {
          lessonId: '123',
          studentIds: ['student1']
        });
      });
    });
  });

  describe('Real-time Communication', () => {
    let secondClient: any;

    beforeEach((done) => {
      // Create second client for testing real-time communication
      const token = jwt.sign(
        { id: 'user456' },
        process.env.JWT_SECRET || 'test-secret',
        { expiresIn: '1h' }
      );

      const mockUser2 = {
        _id: 'user456',
        userType: 'student',
        profile: { name: 'Test Student' }
      };

      (User.findById as jest.Mock).mockImplementation((id) => {
        if (id === 'user123') {
          return Promise.resolve({
            _id: 'user123',
            userType: 'planner',
            profile: { name: 'Test User' }
          });
        }
        if (id === 'user456') {
          return Promise.resolve(mockUser2);
        }
        return Promise.resolve(null);
      });

      secondClient = io(`http://localhost:${port}`, {
        auth: { token },
        transports: ['websocket'],
        forceNew: true
      });

      secondClient.on('connect', () => {
        // Both clients join the same room
        clientSocket.emit('join_room', {
          roomId: 'lesson_123',
          roomType: 'lesson'
        });
        
        secondClient.emit('join_room', {
          roomId: 'lesson_123',
          roomType: 'lesson'
        });

        setTimeout(done, 100);
      });
    });

    afterEach(() => {
      if (secondClient) {
        secondClient.disconnect();
      }
    });

    it('should broadcast typing indicator to room members', (done) => {
      secondClient.on('typing_indicator', (data: any) => {
        expect(data.roomId).toBe('lesson_123');
        expect(data.isTyping).toBe(true);
        expect(data.userId).toBe('user123');
        done();
      });

      clientSocket.emit('typing_indicator', {
        roomId: 'lesson_123',
        isTyping: true
      });
    });

    it('should broadcast screen share events to room members', (done) => {
      secondClient.on('screen_share_start', (data: any) => {
        expect(data.roomId).toBe('lesson_123');
        expect(data.streamId).toBe('stream123');
        expect(data.userId).toBe('user123');
        done();
      });

      clientSocket.emit('screen_share_start', {
        roomId: 'lesson_123',
        streamId: 'stream123'
      });
    });
  });

  describe('Service Methods', () => {
    it('should send message to specific user', () => {
      const sendToUserSpy = jest.spyOn(SocketService, 'sendToUser');
      
      SocketService.sendToUser('user123', 'system_notification', {
        type: 'info',
        message: 'Test notification',
        timestamp: new Date()
      });

      expect(sendToUserSpy).toHaveBeenCalledWith('user123', 'system_notification', {
        type: 'info',
        message: 'Test notification',
        timestamp: expect.any(Date)
      });
    });

    it('should send message to specific room', () => {
      const sendToRoomSpy = jest.spyOn(SocketService, 'sendToRoom');
      
      SocketService.sendToRoom('lesson_123', 'lesson_started', {
        lessonId: '123',
        plannerId: 'user123',
        studentIds: ['student1']
      });

      expect(sendToRoomSpy).toHaveBeenCalledWith('lesson_123', 'lesson_started', {
        lessonId: '123',
        plannerId: 'user123',
        studentIds: ['student1']
      });
    });

    it('should broadcast message to all clients', () => {
      const broadcastSpy = jest.spyOn(SocketService, 'broadcast');
      
      SocketService.broadcast('system_notification', {
        type: 'warning',
        message: 'System maintenance',
        timestamp: new Date()
      });

      expect(broadcastSpy).toHaveBeenCalledWith('system_notification', {
        type: 'warning',
        message: 'System maintenance',
        timestamp: expect.any(Date)
      });
    });

    it('should get online user count', () => {
      // User is connected, so count should be > 0
      const count = SocketService.getOnlineUserCount();
      expect(count).toBeGreaterThanOrEqual(1);
    });

    it('should check if user is online', () => {
      const isOnline = SocketService.isUserOnline('user123');
      expect(isOnline).toBe(true);
      
      const isOffline = SocketService.isUserOnline('nonexistent');
      expect(isOffline).toBe(false);
    });
  });

  describe('Event Emission Methods', () => {
    it('should emit homework assignment event', () => {
      const emitSpy = jest.spyOn(SocketService, 'sendToUser');
      
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

      SocketService.emitHomeworkEvent(homeworkEventData);

      expect(emitSpy).toHaveBeenCalledTimes(2); // Called for each student
    });

    it('should emit analysis progress event', () => {
      const emitSpy = jest.spyOn(SocketService, 'sendToUser');
      
      const analysisEventData = {
        analysisId: 'analysis123',
        fileId: 'file123',
        userId: 'user123',
        type: 'pronunciation' as const,
        stage: 'processing' as const,
        progress: 50,
        timestamp: new Date()
      };

      SocketService.emitAnalysisProgress(analysisEventData);

      expect(emitSpy).toHaveBeenCalledWith('user123', 'analysis_progress', {
        analysisId: 'analysis123',
        progress: 50,
        stage: 'processing'
      });
    });

    it('should emit notification event', () => {
      const emitSpy = jest.spyOn(SocketService, 'sendToUser');
      
      const notificationEventData = {
        notificationId: 'notif123',
        recipientId: 'user123',
        type: 'lesson' as const,
        title: 'Test Notification',
        message: 'This is a test notification',
        priority: 'medium' as const,
        timestamp: new Date()
      };

      SocketService.emitNotification(notificationEventData);

      expect(emitSpy).toHaveBeenCalledWith('user123', 'user_notification', {
        userId: 'user123',
        type: 'lesson',
        title: 'Test Notification',
        message: 'This is a test notification'
      });
    });
  });
});