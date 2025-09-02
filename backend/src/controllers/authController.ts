import { Request, Response, NextFunction } from 'express';
import { User, IUser } from '../models/User';
import { generateToken, generateRefreshToken, verifyToken, verifyRefreshToken } from '../utils/jwt';
import { AppError, ErrorType } from '../middleware/errorHandler';
import { getRedisClient, SessionManager } from '../config/redis';
import { asyncHandler } from '../middleware/errorHandler';
import { PasswordUtils } from '../config/security';
import { createAuditLog, sensitiveActions } from '../middleware/auditLogger';
import jwt from 'jsonwebtoken';

// 회원가입
export const register = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const { email, password, role, profile } = req.body;
  
  // 비밀번호 강도 검증
  const passwordValidation = PasswordUtils.validatePasswordStrength(password);
  if (!passwordValidation.isValid) {
    throw new AppError(passwordValidation.message, ErrorType.VALIDATION_ERROR, 400);
  }
  
  // 이메일 중복 확인
  const existingUser = await User.findOne({ email });
  
  if (existingUser) {
    // 감사 로그 기록 (실패)
    await createAuditLog({
      action: sensitiveActions.AUTH.REGISTER,
      resourceType: 'user',
      details: { email, reason: 'email_already_exists' },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      requestId: req.headers['x-request-id'] as string,
      status: 'failure'
    });
    
    throw new AppError('이미 사용 중인 이메일입니다.', ErrorType.VALIDATION_ERROR, 400);
  }
  
  // 새 사용자 생성
  const user = new User({
    email,
    password, // 모델에서 저장 전에 해싱됨
    role,
    profile
  });
  
  await user.save();
  
  // 토큰 생성
  const accessToken = generateToken(user._id.toString(), user.role);
  const refreshToken = generateRefreshToken(user._id.toString());
  
  // 세션 생성
  await SessionManager.createSession(user._id.toString(), {
    email: user.email,
    role: user.role,
    refreshToken,
    ipAddress: req.ip,
    userAgent: req.get('User-Agent'),
    createdAt: new Date().toISOString()
  });
  
  // 응답에서 비밀번호 제외
  const userResponse = user.toJSON();
  
  // 감사 로그 기록 (성공)
  await createAuditLog({
    userId: user._id.toString(),
    action: sensitiveActions.AUTH.REGISTER,
    resourceType: 'user',
    resourceId: user._id.toString(),
    details: { email, role: user.role },
    ipAddress: req.ip,
    userAgent: req.get('User-Agent'),
    requestId: req.headers['x-request-id'] as string,
    status: 'success'
  });
  
  res.status(201).json({
    success: true,
    message: '회원가입이 완료되었습니다.',
    data: {
      user: userResponse,
      token: accessToken,
      refreshToken,
      expiresIn: process.env.JWT_EXPIRES_IN || '1h'
    }
  });
});

// 로그인
export const login = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const { email, password } = req.body;
  
  // 사용자 조회
  const user = await User.findOne({ email });
  
  if (!user) {
    // 감사 로그 기록 (실패)
    await createAuditLog({
      action: sensitiveActions.AUTH.LOGIN,
      resourceType: 'user',
      details: { email, reason: 'user_not_found' },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      requestId: req.headers['x-request-id'] as string,
      status: 'failure'
    });
    
    throw new AppError('이메일 또는 비밀번호가 올바르지 않습니다.', ErrorType.AUTHENTICATION_ERROR, 401);
  }
  
  // 비밀번호 확인
  const isPasswordValid = await user.comparePassword(password);
  
  if (!isPasswordValid) {
    // 감사 로그 기록 (실패)
    await createAuditLog({
      userId: user._id.toString(),
      action: sensitiveActions.AUTH.LOGIN,
      resourceType: 'user',
      resourceId: user._id.toString(),
      details: { email, reason: 'invalid_password' },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      requestId: req.headers['x-request-id'] as string,
      status: 'failure'
    });
    
    throw new AppError('이메일 또는 비밀번호가 올바르지 않습니다.', ErrorType.AUTHENTICATION_ERROR, 401);
  }
  
  if (!user.isActive) {
    // 감사 로그 기록 (실패)
    await createAuditLog({
      userId: user._id.toString(),
      action: sensitiveActions.AUTH.LOGIN,
      resourceType: 'user',
      resourceId: user._id.toString(),
      details: { email, reason: 'account_inactive' },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      requestId: req.headers['x-request-id'] as string,
      status: 'failure'
    });
    
    throw new AppError('비활성화된 계정입니다. 관리자에게 문의하세요.', ErrorType.AUTHORIZATION_ERROR, 403);
  }
  
  // 토큰 생성
  const accessToken = generateToken(user._id.toString(), user.role);
  const refreshToken = generateRefreshToken(user._id.toString());
  
  // 세션 생성
  await SessionManager.createSession(user._id.toString(), {
    email: user.email,
    role: user.role,
    refreshToken,
    ipAddress: req.ip,
    userAgent: req.get('User-Agent'),
    createdAt: new Date().toISOString()
  });
  
  // 마지막 로그인 시간 업데이트
  user.lastLoginAt = new Date();
  await user.save();
  
  // 응답에서 비밀번호 제외
  const userResponse = user.toJSON();
  
  // 감사 로그 기록 (성공)
  await createAuditLog({
    userId: user._id.toString(),
    action: sensitiveActions.AUTH.LOGIN,
    resourceType: 'user',
    resourceId: user._id.toString(),
    details: { email, role: user.role },
    ipAddress: req.ip,
    userAgent: req.get('User-Agent'),
    requestId: req.headers['x-request-id'] as string,
    status: 'success'
  });
  
  res.status(200).json({
    success: true,
    message: '로그인 성공',
    data: {
      user: userResponse,
      token: accessToken,
      refreshToken,
      expiresIn: process.env.JWT_EXPIRES_IN || '1h'
    }
  });
});

// 로그아웃
export const logout = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const token = req.token;
  const userId = req.user?._id;
  
  if (!token || !userId) {
    throw new AppError('인증 정보가 없습니다.', ErrorType.AUTHENTICATION_ERROR, 401);
  }
  
  // 토큰 블랙리스트에 추가
  const redisClient = getRedisClient();
  const tokenExp = verifyToken(token).exp;
  const ttl = Math.max(0, tokenExp - Math.floor(Date.now() / 1000));
  
  await redisClient.setEx(`blacklist:${token}`, ttl, 'true');
  
  // 세션 삭제
  await SessionManager.deleteUserSessions(userId.toString());
  
  res.status(200).json({
    success: true,
    message: '로그아웃 성공'
  });
});

// 토큰 갱신
export const refreshToken = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const { refreshToken } = req.body;
  
  if (!refreshToken) {
    throw new AppError('리프레시 토큰이 제공되지 않았습니다.', ErrorType.AUTHENTICATION_ERROR, 401);
  }
  
  try {
    // 리프레시 토큰 검증
    const decoded = verifyToken(refreshToken, true);
    
    // 사용자 조회
    const user = await User.findById(decoded.userId);
    
    if (!user) {
      throw new AppError('사용자를 찾을 수 없습니다.', ErrorType.AUTHENTICATION_ERROR, 401);
    }
    
    if (!user.isActive) {
      throw new AppError('비활성화된 계정입니다.', ErrorType.AUTHORIZATION_ERROR, 403);
    }
    
    // 세션 확인
    const sessions = await SessionManager.getUserSessions(user._id.toString());
    const isValidSession = sessions.some(session => session.refreshToken === refreshToken);
    
    if (!isValidSession) {
      throw new AppError('유효하지 않은 리프레시 토큰입니다.', ErrorType.AUTHENTICATION_ERROR, 401);
    }
    
    // 새 토큰 생성
    const newAccessToken = generateToken(user._id.toString(), user.role);
    const newRefreshToken = generateRefreshToken(user._id.toString());
    
    // 세션 업데이트
    await SessionManager.updateUserSession(user._id.toString(), refreshToken, {
      refreshToken: newRefreshToken
    });
    
    res.status(200).json({
      success: true,
      message: '토큰 갱신 성공',
      data: {
        token: newAccessToken,
        refreshToken: newRefreshToken,
        expiresIn: process.env.JWT_EXPIRES_IN || '24h'
      }
    });
  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      throw new AppError('유효하지 않은 리프레시 토큰입니다.', ErrorType.AUTHENTICATION_ERROR, 401);
    }
    throw error;
  }
});

// 비밀번호 변경
export const changePassword = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const { currentPassword, newPassword } = req.body;
  const userId = req.user?._id;
  
  if (!userId) {
    throw new AppError('인증 정보가 없습니다.', ErrorType.AUTHENTICATION_ERROR, 401);
  }
  
  // 사용자 조회 (비밀번호 포함)
  const user = await User.findById(userId);
  
  if (!user) {
    throw new AppError('사용자를 찾을 수 없습니다.', ErrorType.AUTHENTICATION_ERROR, 401);
  }
  
  // 현재 비밀번호 확인
  const isPasswordValid = await user.comparePassword(currentPassword);
  
  if (!isPasswordValid) {
    throw new AppError('현재 비밀번호가 올바르지 않습니다.', ErrorType.VALIDATION_ERROR, 400);
  }
  
  // 새 비밀번호가 현재 비밀번호와 같은지 확인
  if (currentPassword === newPassword) {
    throw new AppError('새 비밀번호는 현재 비밀번호와 달라야 합니다.', ErrorType.VALIDATION_ERROR, 400);
  }
  
  // 비밀번호 업데이트
  user.password = newPassword;
  await user.save();
  
  // 모든 세션 삭제 (다른 기기에서 로그아웃)
  await SessionManager.deleteUserSessions(userId.toString());
  
  // 새 토큰 생성
  const accessToken = generateToken(user._id.toString(), user.role);
  const refreshToken = generateRefreshToken(user._id.toString());
  
  // 새 세션 생성
  await SessionManager.createSession(user._id.toString(), {
    email: user.email,
    role: user.role,
    refreshToken,
    ipAddress: req.ip,
    userAgent: req.get('User-Agent'),
    createdAt: new Date().toISOString()
  });
  
  res.status(200).json({
    success: true,
    message: '비밀번호가 성공적으로 변경되었습니다.',
    data: {
      token: accessToken,
      refreshToken,
      expiresIn: process.env.JWT_EXPIRES_IN || '24h'
    }
  });
});

// 비밀번호 재설정 요청
export const requestPasswordReset = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const { email } = req.body;
  
  // 사용자 조회
  const user = await User.findOne({ email });
  
  // 사용자가 없어도 보안을 위해 같은 응답 반환
  if (!user) {
    return res.status(200).json({
      success: true,
      message: '비밀번호 재설정 링크가 이메일로 전송되었습니다. (실제로는 전송되지 않음)'
    });
  }
  
  // 비밀번호 재설정 토큰 생성 (6시간 유효)
  const resetToken = generatePasswordResetToken(user);
  
  // Redis에 토큰 저장
  const redisClient = getRedisClient();
  await redisClient.setEx(`password_reset:${user._id}`, 6 * 60 * 60, resetToken);
  
  // 이메일 전송 로직 (실제 구현 필요)
  // sendPasswordResetEmail(user.email, resetToken);
  
  res.status(200).json({
    success: true,
    message: '비밀번호 재설정 링크가 이메일로 전송되었습니다.',
    // 개발 환경에서만 토큰 반환 (실제 환경에서는 제거)
    ...(process.env.NODE_ENV === 'development' && { resetToken })
  });
});

// 비밀번호 재설정
export const resetPassword = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const { token, newPassword } = req.body;
  
  if (!token || !newPassword) {
    throw new AppError('토큰과 새 비밀번호가 필요합니다.', ErrorType.VALIDATION_ERROR, 400);
  }
  
  try {
    // 토큰 검증
    const decoded = verifyToken(token, false);
    const userId = decoded.userId;
    
    // Redis에서 토큰 확인
    const redisClient = getRedisClient();
    const storedToken = await redisClient.get(`password_reset:${userId}`);
    
    if (!storedToken || storedToken !== token) {
      throw new AppError('유효하지 않거나 만료된 토큰입니다.', ErrorType.AUTHENTICATION_ERROR, 401);
    }
    
    // 사용자 조회
    const user = await User.findById(userId);
    
    if (!user) {
      throw new AppError('사용자를 찾을 수 없습니다.', ErrorType.AUTHENTICATION_ERROR, 401);
    }
    
    // 비밀번호 업데이트
    user.password = newPassword;
    await user.save();
    
    // 토큰 삭제
    await redisClient.del(`password_reset:${userId}`);
    
    // 모든 세션 삭제
    await SessionManager.deleteUserSessions(userId);
    
    res.status(200).json({
      success: true,
      message: '비밀번호가 성공적으로 재설정되었습니다. 새 비밀번호로 로그인하세요.'
    });
  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      throw new AppError('유효하지 않거나 만료된 토큰입니다.', ErrorType.AUTHENTICATION_ERROR, 401);
    }
    throw error;
  }
});

// 비밀번호 재설정 토큰 생성
function generatePasswordResetToken(user: IUser): string {
  return jwt.sign(
    { userId: user._id.toString(), email: user.email, purpose: 'password_reset' },
    process.env.JWT_SECRET || 'default-jwt-secret',
    { expiresIn: '6h' }
  );
}

// 세션 관리 함수들 추가
// 사용자의 모든 세션 조회
async function getUserSessions(userId: string): Promise<any[]> {
  const pattern = `session:${userId}_*`;
  const redisClient = getRedisClient();
  const keys = await redisClient.keys(pattern);
  const sessions = [];
  
  for (const key of keys) {
    const session = await redisClient.get(key);
    if (session) {
      sessions.push(JSON.parse(session));
    }
  }
  
  return sessions;
}

// 특정 세션 업데이트
async function updateUserSession(userId: string, oldRefreshToken: string, data: any): Promise<void> {
  const pattern = `session:${userId}_*`;
  const redisClient = getRedisClient();
  const keys = await redisClient.keys(pattern);
  
  for (const key of keys) {
    const sessionData = await redisClient.get(key);
    if (sessionData) {
      const session = JSON.parse(sessionData);
      if (session.refreshToken === oldRefreshToken) {
        const updatedSession = { ...session, ...data, updatedAt: new Date().toISOString() };
        await redisClient.set(key, JSON.stringify(updatedSession));
        return;
      }
    }
  }
  
  throw new Error('세션을 찾을 수 없습니다.');
}

// SessionManager에 함수 추가
if (!SessionManager.getUserSessions) {
  SessionManager.getUserSessions = getUserSessions;
}

if (!SessionManager.updateUserSession) {
  SessionManager.updateUserSession = updateUserSession;
}