import jwt from 'jsonwebtoken';

/**
 * JWT 액세스 토큰 생성
 */
export function generateToken(userId: string, role: string): string {
  return jwt.sign(
    {
      id: userId,
      role
    },
    process.env.JWT_SECRET || 'your-secret-key',
    {
      expiresIn: '1h' // 1시간 유효
    }
  );
}

/**
 * JWT 리프레시 토큰 생성
 */
export function generateRefreshToken(userId: string): string {
  return jwt.sign(
    {
      id: userId
    },
    process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-key',
    {
      expiresIn: '7d' // 7일 유효
    }
  );
}

/**
 * JWT 토큰 검증
 */
export function verifyToken(token: string): any {
  return jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
}

/**
 * JWT 리프레시 토큰 검증
 */
export function verifyRefreshToken(token: string): any {
  return jwt.verify(token, process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-key');
}