import { createClient, RedisClientType } from 'redis';
import { logWithContext } from '../utils/logger';
import { SocketService } from './socketService';
import { 
  HomeworkEventData, 
  AnalysisEventData, 
  NotificationEventData,
  LessonEventData 
} from '../types/socket';

/**
 * Redis Pub/Sub 서비스
 * Socket.io와 Redis를 연동하여 다중 서버 인스턴스 간 실시간 메시지 동기화
 */
export class RedisPubSubService {
  private static publisherClient: RedisClientType;
  private static subscriberClient: RedisClientType;
  private static isInitialized = false;

  // 채널 이름 상수
  private static readonly CHANNELS = {
    HOMEWORK: 'homework_events',
    ANALYSIS: 'analysis_events', 
    NOTIFICATION: 'notification_events',
    LESSON: 'lesson_events',
    SYSTEM: 'system_events',
    USER_STATUS: 'user_status_events'
  } as const;

  /**
   * Redis Pub/Sub 서비스 초기화
   */
  static async initialize(): Promise<void> {
    if (this.isInitialized) {
      logWithContext('warn', 'Redis Pub/Sub 서비스가 이미 초기화되었습니다.');
      return;
    }

    try {
      const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

      // Publisher 클라이언트 생성
      this.publisherClient = createClient({
        url: redisUrl,
        socket: {
          connectTimeout: 5000,
          reconnectStrategy: (retries) => {
            if (retries > 10) {
              logWithContext('error', 'Redis Publisher 재연결 시도 횟수 초과');
              return false;
            }
            return Math.min(retries * 100, 3000);
          }
        }
      });

      // Subscriber 클라이언트 생성 (별도 연결)
      this.subscriberClient = createClient({
        url: redisUrl,
        socket: {
          connectTimeout: 5000,
          reconnectStrategy: (retries) => {
            if (retries > 10) {
              logWithContext('error', 'Redis Subscriber 재연결 시도 횟수 초과');
              return false;
            }
            return Math.min(retries * 100, 3000);
          }
        }
      });

      // 에러 핸들링
      this.publisherClient.on('error', (error) => {
        logWithContext('error', 'Redis Publisher 오류', { error: error.message });
      });

      this.subscriberClient.on('error', (error) => {
        logWithContext('error', 'Redis Subscriber 오류', { error: error.message });
      });

      // 연결
      await Promise.all([
        this.publisherClient.connect(),
        this.subscriberClient.connect()
      ]);

      // 구독 설정
      await this.setupSubscriptions();

      this.isInitialized = true;
      logWithContext('info', 'Redis Pub/Sub 서비스 초기화 완료');

    } catch (error) {
      logWithContext('error', 'Redis Pub/Sub 초기화 실패', { 
        error: error instanceof Error ? error.message : '알 수 없는 오류' 
      });
      throw error;
    }
  }

  /**
   * 구독 채널 설정
   */
  private static async setupSubscriptions(): Promise<void> {
    try {
      // 모든 채널 구독
      const channels = Object.values(this.CHANNELS);
      
      for (const channel of channels) {
        await this.subscriberClient.subscribe(channel, (message, channel) => {
          this.handleMessage(channel, message);
        });
      }

      logWithContext('info', 'Redis 채널 구독 설정 완료', { 
        channels: channels 
      });

    } catch (error) {
      logWithContext('error', 'Redis 구독 설정 실패', { 
        error: error instanceof Error ? error.message : '알 수 없는 오류' 
      });
      throw error;
    }
  }

  /**
   * 메시지 처리 핸들러
   */
  private static handleMessage(channel: string, message: string): void {
    try {
      const data = JSON.parse(message);
      
      logWithContext('debug', 'Redis 메시지 수신', { channel, data });

      switch (channel) {
        case this.CHANNELS.HOMEWORK:
          this.handleHomeworkEvent(data as HomeworkEventData);
          break;
          
        case this.CHANNELS.ANALYSIS:
          this.handleAnalysisEvent(data as AnalysisEventData);
          break;
          
        case this.CHANNELS.NOTIFICATION:
          this.handleNotificationEvent(data as NotificationEventData);
          break;
          
        case this.CHANNELS.LESSON:
          this.handleLessonEvent(data as LessonEventData);
          break;
          
        case this.CHANNELS.SYSTEM:
          this.handleSystemEvent(data);
          break;
          
        case this.CHANNELS.USER_STATUS:
          this.handleUserStatusEvent(data);
          break;
          
        default:
          logWithContext('warn', '알 수 없는 Redis 채널', { channel });
      }

    } catch (error) {
      logWithContext('error', 'Redis 메시지 처리 실패', { 
        channel, 
        message, 
        error: error instanceof Error ? error.message : '알 수 없는 오류' 
      });
    }
  }

  /**
   * 숙제 이벤트 처리
   */
  private static handleHomeworkEvent(data: HomeworkEventData): void {
    // 현재 서버 인스턴스에서 Socket.io 이벤트 전송
    // Redis에서 받은 이벤트는 다른 서버 인스턴스에서 발생한 것이므로
    // 현재 서버의 클라이언트들에게 전파
    SocketService.emitHomeworkEvent(data);
    
    logWithContext('info', 'Redis 숙제 이벤트 처리', { 
      homeworkId: data.homeworkId, 
      action: data.action 
    });
  }

  /**
   * 분석 이벤트 처리  
   */
  private static handleAnalysisEvent(data: AnalysisEventData): void {
    SocketService.emitAnalysisProgress(data);
    
    logWithContext('info', 'Redis 분석 이벤트 처리', { 
      analysisId: data.analysisId, 
      stage: data.stage 
    });
  }

  /**
   * 알림 이벤트 처리
   */
  private static handleNotificationEvent(data: NotificationEventData): void {
    SocketService.emitNotification(data);
    
    logWithContext('info', 'Redis 알림 이벤트 처리', { 
      notificationId: data.notificationId, 
      type: data.type 
    });
  }

  /**
   * 수업 이벤트 처리
   */
  private static handleLessonEvent(data: LessonEventData): void {
    const { action, lessonId, plannerId, studentIds } = data;
    
    switch (action) {
      case 'start':
        SocketService.sendToRoom(`lesson_${lessonId}`, 'lesson_started', {
          lessonId,
          plannerId,
          studentIds
        });
        break;
        
      case 'end':
        SocketService.sendToRoom(`lesson_${lessonId}`, 'lesson_ended', {
          lessonId,
          duration: data.metadata?.duration || 0
        });
        break;
        
      case 'pause':
        SocketService.sendToRoom(`lesson_${lessonId}`, 'lesson_paused', {
          lessonId,
          timestamp: data.timestamp.getTime()
        });
        break;
        
      case 'resume':
        SocketService.sendToRoom(`lesson_${lessonId}`, 'lesson_resumed', {
          lessonId,
          timestamp: data.timestamp.getTime()
        });
        break;
    }
    
    logWithContext('info', 'Redis 수업 이벤트 처리', { 
      lessonId, 
      action 
    });
  }

  /**
   * 시스템 이벤트 처리
   */
  private static handleSystemEvent(data: any): void {
    const { type, message, priority, targetUsers } = data;
    
    if (targetUsers && Array.isArray(targetUsers)) {
      // 특정 사용자들에게만 전송
      targetUsers.forEach((userId: string) => {
        SocketService.sendToUser(userId, 'system_notification', {
          type: priority === 'urgent' ? 'error' : 'info',
          message,
          timestamp: new Date()
        });
      });
    } else {
      // 전체 브로드캐스트
      SocketService.broadcast('system_notification', {
        type: priority === 'urgent' ? 'error' : 'info',
        message,
        timestamp: new Date()
      });
    }
    
    logWithContext('info', 'Redis 시스템 이벤트 처리', { type, priority });
  }

  /**
   * 사용자 상태 이벤트 처리
   */
  private static handleUserStatusEvent(data: any): void {
    const { userId, status, userType } = data;
    
    switch (status) {
      case 'online':
        SocketService.broadcast('user_online', { userId, userType });
        break;
        
      case 'offline':
        SocketService.broadcast('user_offline', { userId, userType });
        break;
        
      default:
        SocketService.broadcast('user_status_updated', {
          userId,
          status,
          timestamp: new Date()
        });
    }
    
    logWithContext('info', 'Redis 사용자 상태 이벤트 처리', { userId, status });
  }

  /**
   * 숙제 이벤트 발행
   */
  static async publishHomeworkEvent(data: HomeworkEventData): Promise<void> {
    await this.publish(this.CHANNELS.HOMEWORK, data);
  }

  /**
   * 분석 이벤트 발행
   */
  static async publishAnalysisEvent(data: AnalysisEventData): Promise<void> {
    await this.publish(this.CHANNELS.ANALYSIS, data);
  }

  /**
   * 알림 이벤트 발행
   */
  static async publishNotificationEvent(data: NotificationEventData): Promise<void> {
    await this.publish(this.CHANNELS.NOTIFICATION, data);
  }

  /**
   * 수업 이벤트 발행
   */
  static async publishLessonEvent(data: LessonEventData): Promise<void> {
    await this.publish(this.CHANNELS.LESSON, data);
  }

  /**
   * 시스템 이벤트 발행
   */
  static async publishSystemEvent(data: {
    type: 'maintenance' | 'announcement' | 'alert';
    message: string;
    priority: 'low' | 'medium' | 'high' | 'urgent';
    targetUsers?: string[];
    expiresAt?: Date;
  }): Promise<void> {
    await this.publish(this.CHANNELS.SYSTEM, data);
  }

  /**
   * 사용자 상태 이벤트 발행
   */
  static async publishUserStatusEvent(data: {
    userId: string;
    userType: 'planner' | 'student';
    status: 'online' | 'offline' | 'away' | 'busy';
    timestamp: Date;
  }): Promise<void> {
    await this.publish(this.CHANNELS.USER_STATUS, data);
  }

  /**
   * 메시지 발행 (내부 메서드)
   */
  private static async publish(channel: string, data: any): Promise<void> {
    if (!this.isInitialized || !this.publisherClient) {
      logWithContext('error', 'Redis Pub/Sub이 초기화되지 않았습니다.');
      return;
    }

    try {
      const message = JSON.stringify(data);
      await this.publisherClient.publish(channel, message);
      
      logWithContext('debug', 'Redis 메시지 발행', { channel, data });
      
    } catch (error) {
      logWithContext('error', 'Redis 메시지 발행 실패', { 
        channel, 
        data, 
        error: error instanceof Error ? error.message : '알 수 없는 오류' 
      });
    }
  }

  /**
   * 서비스 종료
   */
  static async shutdown(): Promise<void> {
    try {
      if (this.publisherClient) {
        await this.publisherClient.quit();
      }
      
      if (this.subscriberClient) {
        await this.subscriberClient.quit();
      }
      
      this.isInitialized = false;
      logWithContext('info', 'Redis Pub/Sub 서비스 종료 완료');
      
    } catch (error) {
      logWithContext('error', 'Redis Pub/Sub 서비스 종료 실패', { 
        error: error instanceof Error ? error.message : '알 수 없는 오류' 
      });
    }
  }

  /**
   * 서비스 상태 확인
   */
  static isReady(): boolean {
    return this.isInitialized && 
           this.publisherClient?.isReady && 
           this.subscriberClient?.isReady;
  }

  /**
   * 연결 상태 확인
   */
  static getConnectionStatus(): {
    initialized: boolean;
    publisherReady: boolean;
    subscriberReady: boolean;
  } {
    return {
      initialized: this.isInitialized,
      publisherReady: this.publisherClient?.isReady || false,
      subscriberReady: this.subscriberClient?.isReady || false
    };
  }

  /**
   * 헬스체크용 ping 테스트
   */
  static async ping(): Promise<boolean> {
    try {
      if (!this.publisherClient?.isReady) {
        return false;
      }
      
      const result = await this.publisherClient.ping();
      return result === 'PONG';
      
    } catch (error) {
      logWithContext('error', 'Redis ping 실패', { 
        error: error instanceof Error ? error.message : '알 수 없는 오류' 
      });
      return false;
    }
  }
}