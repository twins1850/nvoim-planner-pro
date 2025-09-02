import { Request, Response, NextFunction } from 'express';
import logger, { logWithContext } from '../utils/logger';
import * as Sentry from '@sentry/node';

// 에러 타입 정의
export enum ErrorType {
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  AUTHENTICATION_ERROR = 'AUTHENTICATION_ERROR',
  AUTHORIZATION_ERROR = 'AUTHORIZATION_ERROR',
  FILE_PROCESSING_ERROR = 'FILE_PROCESSING_ERROR',
  AI_SERVICE_ERROR = 'AI_SERVICE_ERROR',
  DATABASE_ERROR = 'DATABASE_ERROR',
  EXTERNAL_API_ERROR = 'EXTERNAL_API_ERROR',
  SYSTEM_ERROR = 'SYSTEM_ERROR',
  RATE_LIMIT_ERROR = 'RATE_LIMIT_ERROR',
  TIMEOUT_ERROR = 'TIMEOUT_ERROR'
}

// 에러 처리 전략 정의
export interface ErrorHandlingStrategy {
  retry: boolean;
  maxRetries: number;
  fallback?: string;
  userMessage: string;
  logLevel: 'error' | 'warn' | 'info';
  reportToSentry: boolean;
}

// 에러 타입별 처리 전략
export const errorHandlingStrategies: Record<ErrorType, ErrorHandlingStrategy> = {
  [ErrorType.VALIDATION_ERROR]: {
    retry: false,
    maxRetries: 0,
    userMessage: '입력 데이터가 유효하지 않습니다.',
    logLevel: 'warn',
    reportToSentry: false
  },
  [ErrorType.AUTHENTICATION_ERROR]: {
    retry: false,
    maxRetries: 0,
    userMessage: '인증에 실패했습니다.',
    logLevel: 'warn',
    reportToSentry: false
  },
  [ErrorType.AUTHORIZATION_ERROR]: {
    retry: false,
    maxRetries: 0,
    userMessage: '권한이 없습니다.',
    logLevel: 'warn',
    reportToSentry: false
  },
  [ErrorType.FILE_PROCESSING_ERROR]: {
    retry: true,
    maxRetries: 3,
    fallback: 'manual_processing_queue',
    userMessage: '파일 처리 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
    logLevel: 'error',
    reportToSentry: true
  },
  [ErrorType.AI_SERVICE_ERROR]: {
    retry: true,
    maxRetries: 2,
    fallback: 'basic_analysis',
    userMessage: 'AI 분석 중 오류가 발생했습니다. 기본 분석으로 진행됩니다.',
    logLevel: 'error',
    reportToSentry: true
  },
  [ErrorType.DATABASE_ERROR]: {
    retry: true,
    maxRetries: 3,
    userMessage: '데이터베이스 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
    logLevel: 'error',
    reportToSentry: true
  },
  [ErrorType.EXTERNAL_API_ERROR]: {
    retry: true,
    maxRetries: 3,
    fallback: 'cached_response',
    userMessage: '외부 서비스 연결 오류입니다. 잠시 후 다시 시도해주세요.',
    logLevel: 'error',
    reportToSentry: true
  },
  [ErrorType.SYSTEM_ERROR]: {
    retry: false,
    maxRetries: 0,
    userMessage: '시스템 오류가 발생했습니다. 관리자에게 문의해주세요.',
    logLevel: 'error',
    reportToSentry: true
  },
  [ErrorType.RATE_LIMIT_ERROR]: {
    retry: true,
    maxRetries: 5,
    userMessage: '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.',
    logLevel: 'warn',
    reportToSentry: false
  },
  [ErrorType.TIMEOUT_ERROR]: {
    retry: true,
    maxRetries: 2,
    userMessage: '요청 시간이 초과되었습니다. 잠시 후 다시 시도해주세요.',
    logLevel: 'error',
    reportToSentry: true
  }
};

// 커스텀 에러 클래스
export class AppError extends Error {
  public readonly type: ErrorType;
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly details?: any;
  public readonly retryable: boolean;

  constructor(
    message: string,
    type: ErrorType,
    statusCode: number = 500,
    isOperational: boolean = true,
    details?: any
  ) {
    super(message);
    
    this.type = type;
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.details = details;
    this.retryable = errorHandlingStrategies[type]?.retry || false;
    
    Error.captureStackTrace(this, this.constructor);
  }
}

// 에러 핸들링 미들웨어
export function errorHandler(
  error: Error | AppError,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  let statusCode = 500;
  let errorType = ErrorType.SYSTEM_ERROR;
  let message = '서버 내부 오류가 발생했습니다.';
  let details = null;
  let isOperational = false;

  // AppError 인스턴스인 경우
  if (error instanceof AppError) {
    statusCode = error.statusCode;
    errorType = error.type;
    message = error.message;
    details = error.details;
    isOperational = error.isOperational;
  }
  // MongoDB 에러 처리
  else if (error.name === 'ValidationError') {
    statusCode = 400;
    errorType = ErrorType.VALIDATION_ERROR;
    message = '입력 데이터 검증 실패';
    details = error.message;
    isOperational = true;
  }
  else if (error.name === 'CastError') {
    statusCode = 400;
    errorType = ErrorType.VALIDATION_ERROR;
    message = '잘못된 데이터 형식입니다.';
    isOperational = true;
  }
  else if (error.name === 'MongoError' || error.name === 'MongoServerError') {
    statusCode = 500;
    errorType = ErrorType.DATABASE_ERROR;
    message = '데이터베이스 오류가 발생했습니다.';
    isOperational = true;
  }
  // JWT 에러 처리
  else if (error.name === 'JsonWebTokenError') {
    statusCode = 401;
    errorType = ErrorType.AUTHENTICATION_ERROR;
    message = '유효하지 않은 토큰입니다.';
    isOperational = true;
  }
  else if (error.name === 'TokenExpiredError') {
    statusCode = 401;
    errorType = ErrorType.AUTHENTICATION_ERROR;
    message = '토큰이 만료되었습니다.';
    isOperational = true;
  }
  // Multer 파일 업로드 에러
  else if (error.name === 'MulterError') {
    statusCode = 400;
    errorType = ErrorType.FILE_PROCESSING_ERROR;
    message = '파일 업로드 오류가 발생했습니다.';
    details = error.message;
    isOperational = true;
  }
  // Axios 에러 처리
  else if (error.name === 'AxiosError') {
    statusCode = 502;
    errorType = ErrorType.EXTERNAL_API_ERROR;
    message = '외부 API 호출 중 오류가 발생했습니다.';
    details = {
      status: (error as any).response?.status,
      data: (error as any).response?.data
    };
    isOperational = true;
  }
  // 타임아웃 에러
  else if (error.name === 'TimeoutError' || error.message.includes('timeout')) {
    statusCode = 504;
    errorType = ErrorType.TIMEOUT_ERROR;
    message = '요청 시간이 초과되었습니다.';
    isOperational = true;
  }

  // 에러 처리 전략 가져오기
  const strategy = errorHandlingStrategies[errorType];

  // 에러 로깅
  const logContext = {
    error: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    requestId: req.headers['x-request-id'] || '',
    userId: (req as any).user?.id || 'anonymous',
    errorType,
    statusCode,
    isOperational,
    timestamp: new Date().toISOString()
  };

  // 로그 레벨에 따라 로깅
  logWithContext(strategy?.logLevel || 'error', `[${errorType}] ${message}`, logContext);

  // Sentry에 에러 보고 (비운영적 에러 또는 전략에서 지정한 경우)
  if ((!isOperational || strategy?.reportToSentry) && process.env.SENTRY_DSN) {
    Sentry.withScope((scope) => {
      scope.setExtras(logContext);
      scope.setTag('errorType', errorType);
      scope.setLevel(strategy?.logLevel === 'error' ? 'error' : 'warning');
      Sentry.captureException(error);
    });
  }

  // 응답 전송
  res.status(statusCode).json({
    success: false,
    error: {
      type: errorType,
      message: strategy?.userMessage || message,
      ...(details && { details }),
      ...(process.env.NODE_ENV === 'development' && { stack: error.stack }),
      requestId: req.headers['x-request-id'] || '',
    },
    timestamp: new Date().toISOString()
  });
}

// 404 에러 핸들러
export function notFoundHandler(req: Request, res: Response): void {
  logWithContext('warn', `404 Not Found: ${req.originalUrl}`, {
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });

  res.status(404).json({
    success: false,
    error: {
      type: 'NOT_FOUND',
      message: `요청하신 경로 '${req.originalUrl}'를 찾을 수 없습니다.`,
      method: req.method,
      requestId: req.headers['x-request-id'] || '',
    },
    timestamp: new Date().toISOString()
  });
}

// 비동기 에러 캐처 래퍼
export function asyncHandler(fn: Function) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}