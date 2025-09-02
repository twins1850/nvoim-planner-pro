import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AppError, ErrorType } from './errorHandler';

// 사용자 정보 타입 확장
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        role: string;
      };
    }
  }
}

/**
 * JWT 토큰 검증 미들웨어
 */
export const authMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  authenticate(req, res, next);
};

/**
 * JWT 토큰 검증 함수
 */
export function authenticate(req: Request, res: Response, next: NextFunction): void {
  try {
    // 헤더에서 토큰 추출
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      throw new AppError(
        '인증 토큰이 제공되지 않았습니다.',
        ErrorType.AUTHENTICATION_ERROR,
        401
      );
    }
    
    // Bearer 토큰 형식 확인
    const parts = authHeader.split(' ');
    
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      throw new AppError(
        '잘못된 토큰 형식입니다.',
        ErrorType.AUTHENTICATION_ERROR,
        401
      );
    }
    
    const token = parts[1];
    
    // 토큰 검증
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key') as {
      id: string;
      role: string;
    };
    
    // 요청 객체에 사용자 정보 추가
    req.user = {
      id: decoded.id,
      role: decoded.role
    };
    
    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      next(new AppError(
        '유효하지 않은 토큰입니다.',
        ErrorType.AUTHENTICATION_ERROR,
        401
      ));
    } else if (error instanceof jwt.TokenExpiredError) {
      next(new AppError(
        '토큰이 만료되었습니다.',
        ErrorType.AUTHENTICATION_ERROR,
        401
      ));
    } else {
      next(error);
    }
  }
}

/**
 * 역할 기반 접근 제어 미들웨어
 */
export function authorize(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      if (!req.user) {
        throw new AppError(
          '인증되지 않은 사용자입니다.',
          ErrorType.AUTHENTICATION_ERROR,
          401
        );
      }
      
      if (!roles.includes(req.user.role)) {
        throw new AppError(
          '접근 권한이 없습니다.',
          ErrorType.AUTHORIZATION_ERROR,
          403
        );
      }
      
      next();
    } catch (error) {
      next(error);
    }
  };
}