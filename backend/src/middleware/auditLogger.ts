import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { logWithContext } from '../utils/logger';

// 감사 로그 스키마 정의
const auditLogSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: false,
    index: true
  },
  action: {
    type: String,
    required: true,
    index: true
  },
  resourceType: {
    type: String,
    required: true,
    index: true
  },
  resourceId: {
    type: String,
    required: false,
    index: true
  },
  details: {
    type: Object,
    required: false
  },
  ipAddress: {
    type: String,
    required: true
  },
  userAgent: {
    type: String,
    required: false
  },
  requestId: {
    type: String,
    required: false,
    index: true
  },
  status: {
    type: String,
    enum: ['success', 'failure'],
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  }
}, {
  timestamps: true
});

// 인덱스 생성
auditLogSchema.index({ timestamp: -1 });
auditLogSchema.index({ userId: 1, timestamp: -1 });
auditLogSchema.index({ action: 1, timestamp: -1 });
auditLogSchema.index({ resourceType: 1, resourceId: 1 });

// 감사 로그 모델 생성
const AuditLog = mongoose.model('AuditLog', auditLogSchema);

/**
 * 감사 로그 기록 함수
 */
export async function createAuditLog(logData: {
  userId?: string;
  action: string;
  resourceType: string;
  resourceId?: string;
  details?: any;
  ipAddress: string;
  userAgent?: string;
  requestId?: string;
  status: 'success' | 'failure';
}): Promise<void> {
  try {
    await AuditLog.create(logData);
    
    // 로그 기록 (민감한 정보는 제외)
    const logDetails = { ...logData };
    if (logDetails.details?.password) {
      logDetails.details.password = '[REDACTED]';
    }
    
    logWithContext('info', `Audit log: ${logData.action} on ${logData.resourceType}`, logDetails);
  } catch (error) {
    logWithContext('error', 'Failed to create audit log', { error, logData });
  }
}

/**
 * 민감한 작업에 대한 감사 로깅 미들웨어
 */
export function auditLogMiddleware(options: {
  action: string;
  resourceType: string;
  getResourceId?: (req: Request) => string | undefined;
  getDetails?: (req: Request) => any;
}) {
  return async (req: Request, res: Response, next: NextFunction) => {
    // 원본 응답 메서드 저장
    const originalSend = res.send;
    const originalJson = res.json;
    const originalEnd = res.end;
    
    // 응답 상태 추적
    let responseBody: any;
    let responseStatus: number;
    
    // 응답 메서드 오버라이드
    res.send = function(body: any): Response {
      responseBody = body;
      responseStatus = res.statusCode;
      return originalSend.call(this, body);
    };
    
    res.json = function(body: any): Response {
      responseBody = body;
      responseStatus = res.statusCode;
      return originalJson.call(this, body);
    };
    
    res.end = function(chunk?: any): Response {
      if (chunk) {
        responseBody = chunk;
      }
      responseStatus = res.statusCode;
      return originalEnd.call(this, chunk, 'utf8');
    };
    
    // 요청 처리 후 감사 로그 기록
    res.on('finish', async () => {
      try {
        // 사용자 ID 가져오기
        const userId = (req as any).user?.id;
        
        // 리소스 ID 가져오기
        const resourceId = options.getResourceId ? options.getResourceId(req) : undefined;
        
        // 상세 정보 가져오기
        const details = options.getDetails ? options.getDetails(req) : undefined;
        
        // 성공/실패 상태 결정
        const status = responseStatus >= 200 && responseStatus < 400 ? 'success' : 'failure';
        
        // 감사 로그 생성
        await createAuditLog({
          userId,
          action: options.action,
          resourceType: options.resourceType,
          resourceId,
          details: {
            ...details,
            requestMethod: req.method,
            requestPath: req.path,
            responseStatus,
            // 실패한 경우에만 응답 본문 포함
            ...(status === 'failure' && { responseBody })
          },
          ipAddress: req.ip || 'unknown',
          userAgent: req.get('User-Agent'),
          requestId: req.headers['x-request-id'] as string,
          status
        });
      } catch (error) {
        logWithContext('error', 'Failed to create audit log in middleware', { error });
      }
    });
    
    next();
  };
}

/**
 * 민감한 작업 목록 정의
 */
export const sensitiveActions = {
  AUTH: {
    LOGIN: 'user:login',
    REGISTER: 'user:register',
    PASSWORD_CHANGE: 'user:password_change',
    PASSWORD_RESET: 'user:password_reset',
    TOKEN_REFRESH: 'user:token_refresh',
    LOGOUT: 'user:logout'
  },
  USER: {
    CREATE: 'user:create',
    UPDATE: 'user:update',
    DELETE: 'user:delete',
    ROLE_CHANGE: 'user:role_change'
  },
  FILE: {
    UPLOAD: 'file:upload',
    DELETE: 'file:delete'
  },
  HOMEWORK: {
    CREATE: 'homework:create',
    UPDATE: 'homework:update',
    DELETE: 'homework:delete',
    SUBMIT: 'homework:submit'
  },
  FEEDBACK: {
    CREATE: 'feedback:create',
    UPDATE: 'feedback:update',
    DELETE: 'feedback:delete'
  },
  SETTINGS: {
    UPDATE: 'settings:update'
  },
  ADMIN: {
    ACCESS: 'admin:access',
    SYSTEM_CONFIG: 'admin:system_config'
  }
};

export default AuditLog;