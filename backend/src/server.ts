import express from 'express';
import { createServer } from 'http';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import { connectDatabase } from './config/database';
import { connectRedis, RedisCache } from './config/redis';
import { initializeQueues } from './config/queue';
import { configureAWS, ensureS3BucketExists } from './config/aws';
import { validateAzureConfig, checkAzureServiceStatus } from './config/azure';
import { initializeWorkers } from './workers';
import { errorHandler } from './middleware/errorHandler';
import { notFoundHandler } from './middleware/notFoundHandler';
import { 
  requestIdMiddleware, 
  requestLoggerMiddleware, 
  performanceMonitorMiddleware 
} from './middleware/requestLogger';
import { 
  initializeSentry, 
  sentryRequestHandler, 
  sentryErrorHandler, 
  sentryTracingHandler,
  sentryUserMiddleware
} from './config/sentry';
import logger, { logWithContext } from './utils/logger';
import { applySecurityConfig, Encryption, csrfProtection } from './config/security';
import { BackupService } from './services/backupService';
import { SocketService } from './services/socketService';
import { RedisPubSubService } from './services/redisPubSubService';
import authRoutes from './routes/authRoutes';
import userRoutes from './routes/userRoutes';
import fileRoutes from './routes/fileRoutes';
import speechRoutes from './routes/speechRoutes';
import lessonAnalysisRoutes from './routes/lessonAnalysisRoutes';
import homeworkRoutes from './routes/homeworkRoutes';
import homeworkSubmissionRoutes from './routes/homeworkSubmissionRoutes';
import feedbackRoutes from './routes/feedbackRoutes';
import notificationRoutes from './routes/notificationRoutes';
import studentProgressRoutes from './routes/studentProgressRoutes';
import reportingRoutes from './routes/reportingRoutes';
import costMonitoringRoutes from './routes/costMonitoringRoutes';
import performanceRoutes from './routes/performanceRoutes';
import { ResponseTimeOptimizer } from './middleware/responseTimeOptimizer';
import { performanceMonitoringService } from './services/performanceMonitoringService';
import { performanceSocketService } from './services/performanceSocketService';
import { performanceOptimizationService } from './services/performanceOptimizationService';
import { cacheStrategyService } from './services/cacheStrategyService';
import { memoryOptimizationService } from './services/memoryOptimizationService';

// 환경 변수 로드
dotenv.config();

// Sentry 초기화 (에러 모니터링)
initializeSentry();

const app = express();
const httpServer = createServer(app);
const PORT = process.env.PORT || 3000;

// 기본 미들웨어 설정
app.use(compression()); // 응답 압축
app.use(requestIdMiddleware); // 요청 ID 생성

// 성능 모니터링 미들웨어
app.use(ResponseTimeOptimizer.trackResponseTime());
app.use(ResponseTimeOptimizer.compressionOptimizer());

// Sentry 미들웨어 (에러 모니터링)
app.use(sentryRequestHandler());
app.use(sentryTracingHandler());

// 로깅 미들웨어
app.use(requestLoggerMiddleware);
app.use(performanceMonitorMiddleware);

// 요청 본문 파싱
app.use(express.json({ limit: '100mb' })); // JSON 파싱 (대용량 파일 지원)
app.use(express.urlencoded({ extended: true, limit: '100mb' }));

// 보안 설정 적용 (Helmet, CORS, Rate Limiting)
applySecurityConfig(app);

// CSRF 보호 미들웨어 적용 (POST, PUT, DELETE 요청에 대해)
app.use(csrfProtection);

// Sentry 사용자 정보 미들웨어
app.use(sentryUserMiddleware);

// 헬스 체크 엔드포인트
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    message: '앤보임 영어회화 관리 시스템 백엔드 서버가 정상 작동 중입니다.',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
    requestId: req.headers['x-request-id'] || '',
  });
});

// API 라우트
app.get('/api', (req, res) => {
  res.json({
    message: '앤보임 API 서버',
    version: process.env.npm_package_version || '1.0.0',
    endpoints: {
      auth: '/api/auth',
      users: '/api/users',
      lessons: '/api/lessons',
      homework: '/api/homework',
      files: '/api/files',
      speech: '/api/speech',
      analysis: '/api/analysis',
      feedback: '/api/feedback',
      notifications: '/api/notifications',
      progress: '/api/progress',
      reporting: '/api/reporting',
      costMonitoring: '/api/cost-monitoring',
      performance: '/api/performance',
    },
    requestId: req.headers['x-request-id'] || '',
  });
});

// API 라우트 연결
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/files', fileRoutes);
app.use('/api/speech', speechRoutes);
app.use('/api/analysis', lessonAnalysisRoutes);
app.use('/api/homework', homeworkRoutes);
app.use('/api/homework-submissions', homeworkSubmissionRoutes);
app.use('/api/feedback', feedbackRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/progress', studentProgressRoutes);
app.use('/api/reporting', reportingRoutes);
app.use('/api/cost-monitoring', costMonitoringRoutes);
app.use('/api/performance', performanceRoutes);

// 에러 핸들링 미들웨어
app.use(notFoundHandler);
app.use(sentryErrorHandler());
app.use(errorHandler);

// Graceful shutdown 처리
const gracefulShutdown = async (signal: string) => {
  logWithContext('info', `${signal} signal received. Starting graceful shutdown...`);
  
  try {
    // 성능 모니터링 시스템 종료
    performanceMonitoringService.stopMonitoring();
    performanceSocketService.shutdown();
    logWithContext('info', '성능 모니터링 시스템 종료 완료');
    
    // Redis Pub/Sub 서비스 종료
    if (process.env.REDIS_URL || process.env.NODE_ENV === 'production') {
      await RedisPubSubService.shutdown();
      logWithContext('info', 'Redis Pub/Sub 서비스 종료 완료');
    }
    
    // HTTP 서버 종료
    httpServer.close(() => {
      logWithContext('info', 'HTTP 서버 종료 완료');
      process.exit(0);
    });
    
    // 강제 종료 타이머 (30초)
    setTimeout(() => {
      logWithContext('error', '강제 서버 종료');
      process.exit(1);
    }, 30000);
    
  } catch (error) {
    logWithContext('error', 'Graceful shutdown 실패', { error });
    process.exit(1);
  }
};

// Graceful shutdown 시그널 처리
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// 예상치 못한 에러 처리
process.on('uncaughtException', (error) => {
  logWithContext('error', 'Uncaught Exception', { error: error.message, stack: error.stack });
  // 프로세스 종료 전 로그 기록을 위한 지연
  setTimeout(() => {
    process.exit(1);
  }, 1000);
});

process.on('unhandledRejection', (reason, promise) => {
  logWithContext('error', 'Unhandled Rejection', { reason, promise });
});

// 서버 시작 함수
async function startServer() {
  try {
    // 데이터베이스 연결
    await connectDatabase();
    logWithContext('info', 'MongoDB 연결 성공');

    // Redis 연결
    await connectRedis();
    logWithContext('info', 'Redis 연결 성공');

    // Redis 캐시 초기화
    const { getRedisClient } = await import('./config/redis');
    RedisCache.initialize(getRedisClient());
    
    // 암호화 모듈 초기화
    Encryption.initialize();
    logWithContext('info', '암호화 모듈 초기화 완료');
    
    // 성능 최적화 서비스 초기화
    await performanceOptimizationService.initialize();
    logWithContext('info', '성능 최적화 서비스 초기화 완료');
    
    // 캐시 전략 서비스 초기화
    await cacheStrategyService.initialize();
    logWithContext('info', '캐시 전략 서비스 초기화 완료');
    
    // 메모리 최적화 서비스 초기화
    await memoryOptimizationService.initialize();
    logWithContext('info', '메모리 최적화 서비스 초기화 완료');
    
    // 성능 모니터링 서비스 초기화
    await performanceMonitoringService.initialize();
    logWithContext('info', '성능 모니터링 서비스 초기화 완료');
    
    // 백업 서비스 초기화
    BackupService.initialize();
    logWithContext('info', '백업 서비스 초기화 완료');
    
    // 자동 백업 스케줄링 (매일 새벽 3시)
    if (process.env.NODE_ENV === 'production') {
      BackupService.scheduleAutomaticBackups('0 3 * * *');
      logWithContext('info', '자동 백업 스케줄링 완료 (매일 새벽 3시)');
    }
    
    // Cron 작업 초기화
    const { initCronJobs } = await import('./config/cron');
    await initCronJobs();
    logWithContext('info', 'Cron 작업 초기화 완료');
    
    // 비용 모니터링 Cron 작업 초기화
    // 비용 모니터링 기능은 나중에 구현할 예정
    logWithContext('info', '비용 모니터링 작업 초기화 완료');
    
    // 알림 시스템 초기화
    const { initializeNotificationCronJobs } = await import('./services/notificationService');
    initializeNotificationCronJobs();
    logWithContext('info', '알림 시스템 초기화 완료');

    // AWS 설정
    configureAWS();
    await ensureS3BucketExists();
    logWithContext('info', 'AWS 설정 완료');
    
    // Azure Speech Service 설정 확인
    if (validateAzureConfig()) {
      try {
        const azureStatus = await checkAzureServiceStatus();
        if (azureStatus) {
          logWithContext('info', 'Azure Speech Service 설정 완료');
        } else {
          logWithContext('warn', 'Azure Speech Service 연결 실패, 음성 분석 기능이 제한될 수 있습니다.');
        }
      } catch (error) {
        logWithContext('warn', 'Azure Speech Service 상태 확인 중 오류 발생', { error });
      }
    }

    // 작업 큐 초기화
    initializeQueues();
    logWithContext('info', '작업 큐 초기화 완료');

    // 작업자 초기화
    await initializeWorkers();
    logWithContext('info', '작업자 초기화 완료');

    // Socket.io 서버 초기화
    SocketService.initialize(httpServer);
    logWithContext('info', 'Socket.io 서버 초기화 완료');
    
    // 성능 모니터링 Socket.io 서비스 초기화
    performanceSocketService.initialize(httpServer);
    logWithContext('info', '성능 모니터링 Socket.io 서비스 초기화 완료');
    
    // API 응답 시간 주기적 보고서 시작
    ResponseTimeOptimizer.startPeriodicReporting();
    logWithContext('info', 'API 성능 보고서 주기적 생성 시작');

    // Redis Pub/Sub 서비스 초기화 (선택적, Redis 사용 가능할 때만)
    if (process.env.REDIS_URL || process.env.NODE_ENV === 'production') {
      try {
        await RedisPubSubService.initialize();
        logWithContext('info', 'Redis Pub/Sub 서비스 초기화 완료');
      } catch (error) {
        logWithContext('warn', 'Redis Pub/Sub 초기화 실패, 단일 서버 모드로 실행', { 
          error: error instanceof Error ? error.message : '알 수 없는 오류'
        });
      }
    } else {
      logWithContext('info', 'Redis Pub/Sub 서비스 비활성화 (단일 서버 모드)');
    }

    // 서버 시작
    httpServer.listen(PORT, () => {
      logWithContext('info', `서버가 포트 ${PORT}에서 실행 중입니다.`);
      logWithContext('info', `헬스 체크: http://localhost:${PORT}/health`);
      logWithContext('info', `API 엔드포인트: http://localhost:${PORT}/api`);
      
      console.log(`🚀 서버가 포트 ${PORT}에서 실행 중입니다.`);
      console.log(`📊 헬스 체크: http://localhost:${PORT}/health`);
      console.log(`🔗 API 엔드포인트: http://localhost:${PORT}/api`);
    });
  } catch (error) {
    logWithContext('error', '서버 시작 실패', { error });
    console.error('❌ 서버 시작 실패:', error);
    process.exit(1);
  }
}

// 서버 시작
startServer();

export default app;