import { Server as SocketIOServer, Socket } from 'socket.io';
import { Server as HttpServer } from 'http';
import { performanceMonitoringService } from './performanceMonitoringService';
import { logWithContext } from '../utils/logger';
import jwt from 'jsonwebtoken';
import { User } from '../models/User';

interface AuthenticatedSocket extends Socket {
  userId?: string;
  userRole?: string;
}

/**
 * 실시간 성능 모니터링을 위한 Socket.io 서비스
 */
export class PerformanceSocketService {
  private static instance: PerformanceSocketService;
  private io: SocketIOServer | null = null;
  private connectedClients: Map<string, AuthenticatedSocket> = new Map();
  private roomSubscriptions: Map<string, Set<string>> = new Map(); // room -> client IDs

  private constructor() {}

  static getInstance(): PerformanceSocketService {
    if (!PerformanceSocketService.instance) {
      PerformanceSocketService.instance = new PerformanceSocketService();
    }
    return PerformanceSocketService.instance;
  }

  /**
   * Socket.io 서버 초기화
   */
  initialize(server: HttpServer): void {
    this.io = new SocketIOServer(server, {
      cors: {
        origin: process.env.FRONTEND_URL || "http://localhost:3000",
        methods: ["GET", "POST"],
        credentials: true
      },
      transports: ['websocket', 'polling'],
      pingTimeout: 60000,
      pingInterval: 25000
    });

    this.setupMiddleware();
    this.setupEventHandlers();
    this.setupPerformanceEventListeners();

    logWithContext('info', 'Performance Socket.io 서버가 초기화되었습니다.');
  }

  /**
   * 인증 미들웨어 설정
   */
  private setupMiddleware(): void {
    if (!this.io) return;

    this.io.use(async (socket: AuthenticatedSocket, next) => {
      try {
        const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];
        
        if (!token) {
          return next(new Error('Authentication token required'));
        }

        // JWT 토큰 검증
        const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
        
        // 사용자 정보 조회
        const user = await User.findById(decoded.userId).select('profile.role');
        if (!user) {
          return next(new Error('User not found'));
        }

        // 관리자 또는 플래너 권한만 허용
        if (!['admin', 'planner'].includes(user.profile?.role)) {
          return next(new Error('Insufficient permissions for performance monitoring'));
        }

        socket.userId = decoded.userId;
        socket.userRole = user.profile?.role;
        
        next();
      } catch (error) {
        logWithContext('error', 'Socket 인증 실패:', error);
        next(new Error('Authentication failed'));
      }
    });
  }

  /**
   * 이벤트 핸들러 설정
   */
  private setupEventHandlers(): void {
    if (!this.io) return;

    this.io.on('connection', (socket: AuthenticatedSocket) => {
      logWithContext('info', 'Performance monitoring client connected', {
        socketId: socket.id,
        userId: socket.userId,
        userRole: socket.userRole
      });

      this.connectedClients.set(socket.id, socket);

      // 연결 시 현재 성능 지표 전송
      this.sendCurrentMetrics(socket);

      // 클라이언트 이벤트 리스너
      this.setupClientEventListeners(socket);

      // 연결 해제 처리
      socket.on('disconnect', (reason) => {
        this.handleDisconnect(socket, reason);
      });

      // 에러 처리
      socket.on('error', (error) => {
        logWithContext('error', 'Socket error:', error);
      });
    });
  }

  /**
   * 클라이언트별 이벤트 리스너 설정
   */
  private setupClientEventListeners(socket: AuthenticatedSocket): void {
    // 실시간 모니터링 구독
    socket.on('subscribe:metrics', () => {
      socket.join('performance-metrics');
      this.addToRoomSubscription('performance-metrics', socket.id);
      
      logWithContext('debug', 'Client subscribed to performance metrics', {
        socketId: socket.id,
        userId: socket.userId
      });
      
      socket.emit('subscribed', { room: 'performance-metrics', status: 'success' });
    });

    // 알림 구독
    socket.on('subscribe:alerts', () => {
      socket.join('performance-alerts');
      this.addToRoomSubscription('performance-alerts', socket.id);
      
      logWithContext('debug', 'Client subscribed to performance alerts', {
        socketId: socket.id,
        userId: socket.userId
      });
      
      socket.emit('subscribed', { room: 'performance-alerts', status: 'success' });
    });

    // 구독 해제
    socket.on('unsubscribe:metrics', () => {
      socket.leave('performance-metrics');
      this.removeFromRoomSubscription('performance-metrics', socket.id);
      socket.emit('unsubscribed', { room: 'performance-metrics', status: 'success' });
    });

    socket.on('unsubscribe:alerts', () => {
      socket.leave('performance-alerts');
      this.removeFromRoomSubscription('performance-alerts', socket.id);
      socket.emit('unsubscribed', { room: 'performance-alerts', status: 'success' });
    });

    // 히스토리 데이터 요청
    socket.on('request:history', async (data) => {
      try {
        const { period = 'hourly' } = data;
        const history = performanceMonitoringService.getMetricsHistory(period);
        
        socket.emit('history:data', {
          period,
          data: history,
          timestamp: new Date()
        });
      } catch (error) {
        socket.emit('error', {
          message: '히스토리 데이터 조회 실패',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    });

    // 대시보드 데이터 요청
    socket.on('request:dashboard', async () => {
      try {
        const dashboardData = await performanceMonitoringService.getDashboardData();
        
        socket.emit('dashboard:data', {
          data: dashboardData,
          timestamp: new Date()
        });
      } catch (error) {
        socket.emit('error', {
          message: '대시보드 데이터 조회 실패',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    });

    // 임계값 변경 (관리자만)
    socket.on('update:thresholds', (data) => {
      if (socket.userRole !== 'admin') {
        socket.emit('error', { message: '관리자 권한이 필요합니다.' });
        return;
      }

      try {
        performanceMonitoringService.setThresholds(data.thresholds);
        
        // 모든 클라이언트에게 임계값 변경 알림
        this.io?.emit('thresholds:updated', {
          thresholds: data.thresholds,
          updatedBy: socket.userId,
          timestamp: new Date()
        });
        
        logWithContext('info', '성능 임계값이 업데이트되었습니다.', {
          updatedBy: socket.userId,
          thresholds: data.thresholds
        });
      } catch (error) {
        socket.emit('error', {
          message: '임계값 업데이트 실패',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    });

    // 성능 최적화 실행 (관리자만)
    socket.on('execute:optimization', async (data) => {
      if (socket.userRole !== 'admin') {
        socket.emit('error', { message: '관리자 권한이 필요합니다.' });
        return;
      }

      try {
        const { type = 'all' } = data;
        
        // 최적화 시작 알림
        socket.emit('optimization:started', { type, timestamp: new Date() });
        
        // 실제 최적화 로직은 controller에서 처리하므로 여기서는 이벤트만 처리
        socket.emit('optimization:completed', {
          type,
          message: '성능 최적화 요청이 처리되었습니다.',
          timestamp: new Date()
        });
        
        logWithContext('info', '성능 최적화가 실행되었습니다.', {
          type,
          executedBy: socket.userId
        });
      } catch (error) {
        socket.emit('optimization:failed', {
          type: data.type,
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date()
        });
      }
    });

    // Ping/Pong for connection health
    socket.on('ping', () => {
      socket.emit('pong', { timestamp: new Date() });
    });
  }

  /**
   * 성능 모니터링 서비스 이벤트 리스너 설정
   */
  private setupPerformanceEventListeners(): void {
    // 실시간 메트릭 데이터
    performanceMonitoringService.on('metrics', (metrics) => {
      this.broadcastToRoom('performance-metrics', 'metrics:update', {
        data: metrics,
        timestamp: new Date()
      });
    });

    // 성능 알림
    performanceMonitoringService.on('alert', (alertData) => {
      this.broadcastToRoom('performance-alerts', 'alert:new', {
        alert: alertData,
        timestamp: new Date()
      });
      
      logWithContext('info', '성능 알림이 클라이언트들에게 전송되었습니다.', alertData);
    });

    // 크리티컬 알림 (모든 클라이언트에게)
    performanceMonitoringService.on('criticalAlert', (alertData) => {
      this.broadcastToAll('alert:critical', {
        alert: alertData,
        timestamp: new Date()
      });
      
      logWithContext('warn', '크리티컬 알림이 모든 클라이언트에게 전송되었습니다.', alertData);
    });

    // 성능 보고서
    performanceMonitoringService.on('report', (reportData) => {
      this.broadcastToAll('report:new', {
        report: reportData,
        timestamp: new Date()
      });
    });
  }

  /**
   * 현재 성능 지표 전송
   */
  private async sendCurrentMetrics(socket: AuthenticatedSocket): Promise<void> {
    try {
      const currentMetrics = await performanceMonitoringService.getCurrentMetrics();
      
      socket.emit('metrics:current', {
        data: currentMetrics,
        timestamp: new Date()
      });
    } catch (error) {
      logWithContext('error', '현재 메트릭 전송 실패:', error);
      socket.emit('error', {
        message: '현재 성능 지표 조회 실패',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * 특정 룸에 메시지 브로드캐스트
   */
  private broadcastToRoom(room: string, event: string, data: any): void {
    if (!this.io) return;
    
    this.io.to(room).emit(event, data);
    
    const subscriberCount = this.roomSubscriptions.get(room)?.size || 0;
    if (subscriberCount > 0) {
      logWithContext('debug', `${room} 룸에 이벤트 전송: ${event}`, {
        subscriberCount,
        event,
        dataSize: JSON.stringify(data).length
      });
    }
  }

  /**
   * 모든 클라이언트에게 메시지 브로드캐스트
   */
  private broadcastToAll(event: string, data: any): void {
    if (!this.io) return;
    
    this.io.emit(event, data);
    
    logWithContext('debug', `모든 클라이언트에게 이벤트 전송: ${event}`, {
      connectedClients: this.connectedClients.size,
      event
    });
  }

  /**
   * 룸 구독 관리
   */
  private addToRoomSubscription(room: string, socketId: string): void {
    if (!this.roomSubscriptions.has(room)) {
      this.roomSubscriptions.set(room, new Set());
    }
    this.roomSubscriptions.get(room)!.add(socketId);
  }

  private removeFromRoomSubscription(room: string, socketId: string): void {
    if (this.roomSubscriptions.has(room)) {
      this.roomSubscriptions.get(room)!.delete(socketId);
      
      // 구독자가 없으면 룸 정보 삭제
      if (this.roomSubscriptions.get(room)!.size === 0) {
        this.roomSubscriptions.delete(room);
      }
    }
  }

  /**
   * 연결 해제 처리
   */
  private handleDisconnect(socket: AuthenticatedSocket, reason: string): void {
    logWithContext('info', 'Performance monitoring client disconnected', {
      socketId: socket.id,
      userId: socket.userId,
      reason
    });

    // 클라이언트 정보 제거
    this.connectedClients.delete(socket.id);
    
    // 모든 룸 구독에서 제거
    for (const room of this.roomSubscriptions.keys()) {
      this.removeFromRoomSubscription(room, socket.id);
    }
  }

  /**
   * 연결된 클라이언트 통계
   */
  getConnectionStats(): {
    totalConnections: number;
    roomSubscriptions: { [room: string]: number };
    connectedUsers: string[];
  } {
    const roomStats: { [room: string]: number } = {};
    for (const [room, subscribers] of this.roomSubscriptions) {
      roomStats[room] = subscribers.size;
    }

    const connectedUsers = Array.from(this.connectedClients.values())
      .map(socket => socket.userId)
      .filter((userId): userId is string => userId !== undefined);

    return {
      totalConnections: this.connectedClients.size,
      roomSubscriptions: roomStats,
      connectedUsers: [...new Set(connectedUsers)] // 중복 제거
    };
  }

  /**
   * 서비스 종료
   */
  shutdown(): void {
    if (this.io) {
      this.io.close();
      this.io = null;
    }
    
    this.connectedClients.clear();
    this.roomSubscriptions.clear();
    
    logWithContext('info', 'Performance Socket.io 서비스가 종료되었습니다.');
  }
}

// 싱글톤 인스턴스 export
export const performanceSocketService = PerformanceSocketService.getInstance();