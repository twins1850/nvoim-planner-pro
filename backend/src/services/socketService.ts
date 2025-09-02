import { Server as SocketIOServer } from 'socket.io';
import { Server as HTTPServer } from 'http';
import jwt from 'jsonwebtoken';
import { 
  ServerToClientEvents, 
  ClientToServerEvents, 
  InterServerEvents, 
  SocketData,
  RoomData,
  AuthenticationData,
  SocketError,
  LessonEventData,
  HomeworkEventData,
  AnalysisEventData,
  NotificationEventData
} from '../types/socket';
import { logWithContext } from '../utils/logger';
import { RedisCache } from '../config/redis';
import { User } from '../models/User';

/**
 * Socket.io 서버 관리 클래스
 */
export class SocketService {
  private static io: SocketIOServer<
    ClientToServerEvents,
    ServerToClientEvents,
    InterServerEvents,
    SocketData
  >;
  
  private static activeRooms = new Map<string, RoomData>();
  private static userSockets = new Map<string, string[]>(); // userId -> socketIds[]

  /**
   * Socket.io 서버 초기화
   */
  static initialize(httpServer: HTTPServer): void {
    this.io = new SocketIOServer(httpServer, {
      cors: {
        origin: process.env.FRONTEND_URL || "http://localhost:3000",
        methods: ["GET", "POST"],
        credentials: true
      },
      pingTimeout: 60000,
      pingInterval: 25000,
      transports: ['websocket', 'polling']
    });

    // 인증 미들웨어
    this.io.use(this.authenticationMiddleware);

    // 연결 이벤트 핸들러
    this.io.on('connection', this.handleConnection.bind(this));

    logWithContext('info', 'Socket.io 서버 초기화 완료', {
      pingTimeout: 60000,
      pingInterval: 25000
    });
  }

  /**
   * Socket.io 인스턴스 반환
   */
  static getIO(): SocketIOServer<
    ClientToServerEvents,
    ServerToClientEvents,
    InterServerEvents,
    SocketData
  > {
    if (!this.io) {
      throw new Error('Socket.io가 초기화되지 않았습니다.');
    }
    return this.io;
  }

  /**
   * 인증 미들웨어
   */
  private static async authenticationMiddleware(
    socket: any,
    next: (err?: Error) => void
  ): Promise<void> {
    try {
      const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];
      
      if (!token) {
        return next(new Error('인증 토큰이 필요합니다.'));
      }

      // JWT 토큰 검증
      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
      
      // 사용자 정보 조회
      const user = await User.findById(decoded.id);
      if (!user) {
        return next(new Error('유효하지 않은 사용자입니다.'));
      }

      // 소켓 데이터 설정
      socket.data = {
        userId: (user._id as any).toString(),
        userType: user.role as 'planner' | 'student' | 'admin',
        authenticatedAt: new Date(),
        lastActivity: new Date(),
        rooms: [],
        metadata: {
          userAgent: socket.handshake.headers['user-agent'],
          ipAddress: socket.handshake.address,
          deviceType: this.detectDeviceType(socket.handshake.headers['user-agent'])
        }
      } as SocketData;

      next();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류';
      logWithContext('error', 'Socket 인증 실패', { error: errorMessage });
      next(new Error('인증에 실패했습니다.'));
    }
  }

  /**
   * 디바이스 타입 감지
   */
  private static detectDeviceType(userAgent?: string): 'web' | 'mobile' | 'tablet' {
    if (!userAgent) return 'web';
    
    const ua = userAgent.toLowerCase();
    if (ua.includes('mobile')) return 'mobile';
    if (ua.includes('tablet') || ua.includes('ipad')) return 'tablet';
    return 'web';
  }

  /**
   * 연결 핸들러
   */
  private static handleConnection(socket: any): void {
    const { userId, userType } = socket.data;
    
    logWithContext('info', '새로운 Socket 연결', {
      socketId: socket.id,
      userId,
      userType,
      metadata: socket.data.metadata
    });

    // 사용자 소켓 매핑 추가
    if (!this.userSockets.has(userId)) {
      this.userSockets.set(userId, []);
    }
    this.userSockets.get(userId)!.push(socket.id);

    // 연결 확인 이벤트 전송
    socket.emit('connection_established', {
      userId,
      timestamp: new Date()
    });

    // 다른 사용자들에게 온라인 상태 알림
    socket.broadcast.emit('user_online', {
      userId,
      userType
    });

    // 이벤트 핸들러 등록
    this.registerEventHandlers(socket);

    // 연결 해제 핸들러
    socket.on('disconnect', () => {
      this.handleDisconnection(socket);
    });

    // 하트비트 핸들러
    socket.on('heartbeat', () => {
      socket.data.lastActivity = new Date();
    });
  }

  /**
   * 이벤트 핸들러 등록
   */
  private static registerEventHandlers(socket: any): void {
    // 인증 이벤트
    socket.on('authenticate', (data: { token: string }) => {
      // 재인증 로직 (필요시)
      logWithContext('info', '소켓 재인증 요청', { userId: socket.data.userId });
    });

    // 방 관리 이벤트
    socket.on('join_room', (data: { roomId: string; roomType: 'lesson' | 'homework' | 'user' }) => {
      this.handleJoinRoom(socket, data);
    });

    socket.on('leave_room', (data: { roomId: string }) => {
      this.handleLeaveRoom(socket, data);
    });

    // 수업 관리 이벤트
    socket.on('start_lesson', (data: { lessonId: string; studentIds: string[] }) => {
      this.handleStartLesson(socket, data);
    });

    socket.on('end_lesson', (data: { lessonId: string }) => {
      this.handleEndLesson(socket, data);
    });

    socket.on('pause_lesson', (data: { lessonId: string }) => {
      this.handlePauseLesson(socket, data);
    });

    socket.on('resume_lesson', (data: { lessonId: string }) => {
      this.handleResumeLesson(socket, data);
    });

    // 실시간 상호작용 이벤트
    socket.on('typing_indicator', (data: { roomId: string; isTyping: boolean }) => {
      socket.to(data.roomId).emit('typing_indicator', { 
        ...data, 
        userId: socket.data.userId 
      });
    });

    socket.on('live_audio_data', (data: { roomId: string; audioChunk: Buffer; timestamp: number }) => {
      socket.to(data.roomId).emit('live_audio_data', {
        ...data,
        userId: socket.data.userId
      });
    });

    socket.on('screen_share_start', (data: { roomId: string; streamId: string }) => {
      socket.to(data.roomId).emit('screen_share_start', {
        ...data,
        userId: socket.data.userId
      });
    });

    socket.on('screen_share_stop', (data: { roomId: string }) => {
      socket.to(data.roomId).emit('screen_share_stop', {
        ...data,
        userId: socket.data.userId
      });
    });

    // 상태 업데이트
    socket.on('update_status', (data: { status: 'online' | 'away' | 'busy' | 'offline' }) => {
      socket.broadcast.emit('user_status_updated', {
        userId: socket.data.userId,
        status: data.status,
        timestamp: new Date()
      });
    });
  }

  /**
   * 방 참가 처리
   */
  private static handleJoinRoom(socket: any, data: { roomId: string; roomType: 'lesson' | 'homework' | 'user' }): void {
    const { userId } = socket.data;
    const { roomId, roomType } = data;

    try {
      // 방 참가
      socket.join(roomId);
      socket.data.rooms.push(roomId);

      // 방 데이터 업데이트
      if (!this.activeRooms.has(roomId)) {
        this.activeRooms.set(roomId, {
          roomId,
          roomType,
          participants: [userId],
          createdAt: new Date()
        });
      } else {
        const room = this.activeRooms.get(roomId)!;
        if (!room.participants.includes(userId)) {
          room.participants.push(userId);
        }
      }

      logWithContext('info', '방 참가 성공', { userId, roomId, roomType });

      // 방의 다른 참가자들에게 알림
      socket.to(roomId).emit('user_joined_room', {
        userId,
        roomId,
        timestamp: new Date()
      });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류';
      logWithContext('error', '방 참가 실패', { userId, roomId, error: errorMessage });
      socket.emit('error', {
        code: 'JOIN_ROOM_FAILED',
        message: '방 참가에 실패했습니다.',
        details: { roomId }
      } as SocketError);
    }
  }

  /**
   * 방 나가기 처리
   */
  private static handleLeaveRoom(socket: any, data: { roomId: string }): void {
    const { userId } = socket.data;
    const { roomId } = data;

    try {
      socket.leave(roomId);
      socket.data.rooms = socket.data.rooms.filter((room: string) => room !== roomId);

      // 방 데이터 업데이트
      const room = this.activeRooms.get(roomId);
      if (room) {
        room.participants = room.participants.filter(id => id !== userId);
        if (room.participants.length === 0) {
          this.activeRooms.delete(roomId);
        }
      }

      logWithContext('info', '방 나가기 성공', { userId, roomId });

      // 방의 다른 참가자들에게 알림
      socket.to(roomId).emit('user_left_room', {
        userId,
        roomId,
        timestamp: new Date()
      });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류';
      logWithContext('error', '방 나가기 실패', { userId, roomId, error: errorMessage });
    }
  }

  /**
   * 수업 시작 처리
   */
  private static handleStartLesson(socket: any, data: { lessonId: string; studentIds: string[] }): void {
    const { userId, userType } = socket.data;
    const { lessonId, studentIds } = data;

    // 권한 확인 (플래너만 수업 시작 가능)
    if (userType !== 'planner') {
      socket.emit('error', {
        code: 'PERMISSION_DENIED',
        message: '수업을 시작할 권한이 없습니다.',
        details: { lessonId }
      } as SocketError);
      return;
    }

    try {
      const roomId = `lesson_${lessonId}`;

      // 수업 시작 이벤트 전송
      this.io.to(roomId).emit('lesson_started', {
        lessonId,
        plannerId: userId,
        studentIds
      });

      // 학생들에게 개별 알림
      studentIds.forEach(studentId => {
        this.sendToUser(studentId, 'lesson_started', {
          lessonId,
          plannerId: userId,
          studentIds
        });
      });

      logWithContext('info', '수업 시작', {
        lessonId,
        plannerId: userId,
        studentIds,
        roomId
      });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류';
      logWithContext('error', '수업 시작 실패', { lessonId, error: errorMessage });
      socket.emit('error', {
        code: 'START_LESSON_FAILED',
        message: '수업 시작에 실패했습니다.',
        details: { lessonId }
      } as SocketError);
    }
  }

  /**
   * 수업 종료 처리
   */
  private static handleEndLesson(socket: any, data: { lessonId: string }): void {
    const { userId, userType } = socket.data;
    const { lessonId } = data;

    if (userType !== 'planner') {
      socket.emit('error', {
        code: 'PERMISSION_DENIED',
        message: '수업을 종료할 권한이 없습니다.',
        details: { lessonId }
      } as SocketError);
      return;
    }

    try {
      const roomId = `lesson_${lessonId}`;
      const duration = Date.now(); // 실제로는 수업 시작 시간과의 차이를 계산

      this.io.to(roomId).emit('lesson_ended', {
        lessonId,
        duration
      });

      logWithContext('info', '수업 종료', { lessonId, duration });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류';
      logWithContext('error', '수업 종료 실패', { lessonId, error: errorMessage });
    }
  }

  /**
   * 수업 일시정지 처리
   */
  private static handlePauseLesson(socket: any, data: { lessonId: string }): void {
    const { userId, userType } = socket.data;
    const { lessonId } = data;

    if (userType !== 'planner') {
      socket.emit('error', {
        code: 'PERMISSION_DENIED',
        message: '수업을 일시정지할 권한이 없습니다.'
      } as SocketError);
      return;
    }

    const roomId = `lesson_${lessonId}`;
    this.io.to(roomId).emit('lesson_paused', {
      lessonId,
      timestamp: Date.now()
    });

    logWithContext('info', '수업 일시정지', { lessonId });
  }

  /**
   * 수업 재개 처리
   */
  private static handleResumeLesson(socket: any, data: { lessonId: string }): void {
    const { userId, userType } = socket.data;
    const { lessonId } = data;

    if (userType !== 'planner') {
      socket.emit('error', {
        code: 'PERMISSION_DENIED',
        message: '수업을 재개할 권한이 없습니다.'
      } as SocketError);
      return;
    }

    const roomId = `lesson_${lessonId}`;
    this.io.to(roomId).emit('lesson_resumed', {
      lessonId,
      timestamp: Date.now()
    });

    logWithContext('info', '수업 재개', { lessonId });
  }

  /**
   * 연결 해제 처리
   */
  private static handleDisconnection(socket: any): void {
    const { userId, userType } = socket.data;

    // 사용자 소켓 매핑에서 제거
    const userSocketIds = this.userSockets.get(userId);
    if (userSocketIds) {
      const updatedSocketIds = userSocketIds.filter(id => id !== socket.id);
      if (updatedSocketIds.length === 0) {
        this.userSockets.delete(userId);
        
        // 마지막 소켓이 끊어진 경우 오프라인 상태 알림
        socket.broadcast.emit('user_offline', {
          userId,
          userType
        });
      } else {
        this.userSockets.set(userId, updatedSocketIds);
      }
    }

    // 활성 방에서 사용자 제거
    socket.data.rooms.forEach((roomId: string) => {
      const room = this.activeRooms.get(roomId);
      if (room) {
        room.participants = room.participants.filter(id => id !== userId);
        if (room.participants.length === 0) {
          this.activeRooms.delete(roomId);
        }
      }
    });

    logWithContext('info', 'Socket 연결 해제', {
      socketId: socket.id,
      userId,
      userType
    });
  }

  /**
   * 특정 사용자에게 메시지 전송
   */
  static sendToUser(userId: string, event: keyof ServerToClientEvents, data: any): void {
    const socketIds = this.userSockets.get(userId);
    if (socketIds) {
      socketIds.forEach(socketId => {
        this.io.to(socketId).emit(event, data);
      });
    }
  }

  /**
   * 특정 방에 메시지 전송
   */
  static sendToRoom(roomId: string, event: keyof ServerToClientEvents, data: any): void {
    this.io.to(roomId).emit(event, data);
  }

  /**
   * 모든 연결된 클라이언트에게 브로드캐스트
   */
  static broadcast(event: keyof ServerToClientEvents, data: any): void {
    this.io.emit(event, data);
  }

  /**
   * 현재 활성 방 목록 조회
   */
  static getActiveRooms(): RoomData[] {
    return Array.from(this.activeRooms.values());
  }

  /**
   * 현재 온라인 사용자 수 조회
   */
  static getOnlineUserCount(): number {
    return this.userSockets.size;
  }

  /**
   * 특정 사용자의 온라인 상태 확인
   */
  static isUserOnline(userId: string): boolean {
    return this.userSockets.has(userId);
  }

  /**
   * 숙제 관련 이벤트 전송
   */
  static emitHomeworkEvent(eventData: HomeworkEventData): void {
    const { action, studentId, plannerId } = eventData;

    switch (action) {
      case 'assigned':
        if (eventData.data?.studentIds) {
          eventData.data.studentIds.forEach((studentId: string) => {
            this.sendToUser(studentId, 'homework_assigned', {
              homeworkId: eventData.homeworkId,
              studentIds: eventData.data.studentIds,
              dueDate: eventData.data.dueDate
            });
          });
        }
        break;

      case 'submitted':
        if (studentId) {
          this.sendToUser(plannerId, 'homework_submitted', {
            submissionId: eventData.submissionId!,
            homeworkId: eventData.homeworkId,
            studentId
          });
        }
        break;

      case 'graded':
        if (studentId) {
          this.sendToUser(studentId, 'homework_graded', {
            submissionId: eventData.submissionId!,
            score: eventData.data?.score,
            feedback: eventData.data?.feedback
          });
        }
        break;
    }

    logWithContext('info', '숙제 이벤트 전송', eventData);
  }

  /**
   * AI 분석 진행 상황 업데이트
   */
  static emitAnalysisProgress(eventData: AnalysisEventData): void {
    const { userId, stage, progress } = eventData;

    switch (stage) {
      case 'queued':
        this.sendToUser(userId, 'analysis_started', {
          analysisId: eventData.analysisId,
          type: eventData.type
        });
        break;

      case 'processing':
        this.sendToUser(userId, 'analysis_progress', {
          analysisId: eventData.analysisId,
          progress: progress || 0,
          stage: 'processing'
        });
        break;

      case 'completed':
        this.sendToUser(userId, 'analysis_completed', {
          analysisId: eventData.analysisId,
          results: eventData.results
        });
        break;

      case 'failed':
        this.sendToUser(userId, 'analysis_failed', {
          analysisId: eventData.analysisId,
          error: eventData.error || 'Unknown error'
        });
        break;
    }

    logWithContext('info', 'AI 분석 이벤트 전송', eventData);
  }

  /**
   * 알림 전송
   */
  static emitNotification(eventData: NotificationEventData): void {
    const { recipientId, type, title, message, priority } = eventData;

    // 사용자별 알림 전송
    this.sendToUser(recipientId, 'user_notification', {
      userId: recipientId,
      type,
      title,
      message
    });

    // 시스템 전체 알림인 경우 브로드캐스트
    if (type === 'system') {
      this.broadcast('system_notification', {
        type: priority === 'urgent' ? 'error' : 'info',
        message: title,
        timestamp: eventData.timestamp
      });
    }

    logWithContext('info', '알림 전송', eventData);
  }
}