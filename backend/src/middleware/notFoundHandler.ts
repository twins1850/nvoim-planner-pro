import { Request, Response } from 'express';

/**
 * 404 에러 핸들러
 */
export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({
    success: false,
    error: {
      type: 'NOT_FOUND',
      message: `요청하신 경로 '${req.originalUrl}'를 찾을 수 없습니다.`,
      method: req.method
    },
    timestamp: new Date().toISOString()
  });
}