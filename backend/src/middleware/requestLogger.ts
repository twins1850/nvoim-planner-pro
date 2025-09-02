import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { logWithContext } from '../utils/logger';

/**
 * Middleware to add request ID to each request
 * This helps with tracing requests through the system
 */
export function requestIdMiddleware(req: Request, res: Response, next: NextFunction): void {
  // Generate a unique request ID if not already present
  const requestId = req.headers['x-request-id'] || uuidv4();
  
  // Add request ID to request headers
  req.headers['x-request-id'] = requestId;
  
  // Add request ID to response headers
  res.setHeader('X-Request-ID', requestId);
  
  next();
}

/**
 * Middleware to log incoming requests
 */
export function requestLoggerMiddleware(req: Request, res: Response, next: NextFunction): void {
  // Get start time
  const startTime = Date.now();
  
  // Log request
  logWithContext('http', `${req.method} ${req.originalUrl}`, {
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    requestId: req.headers['x-request-id'] || '',
    userId: (req as any).user?.id || 'anonymous',
  });
  
  // Log response when finished
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const level = res.statusCode >= 400 ? 'warn' : 'http';
    
    logWithContext(level, `${req.method} ${req.originalUrl} ${res.statusCode} ${duration}ms`, {
      method: req.method,
      url: req.originalUrl,
      statusCode: res.statusCode,
      duration,
      requestId: req.headers['x-request-id'] || '',
      userId: (req as any).user?.id || 'anonymous',
    });
  });
  
  next();
}

/**
 * Middleware to add performance monitoring
 */
export function performanceMonitorMiddleware(req: Request, res: Response, next: NextFunction): void {
  // Skip for non-API routes
  if (!req.originalUrl.startsWith('/api')) {
    return next();
  }
  
  // Get start time
  const startTime = process.hrtime();
  
  // Add response hook
  res.on('finish', () => {
    const [seconds, nanoseconds] = process.hrtime(startTime);
    const duration = seconds * 1000 + nanoseconds / 1000000; // Convert to milliseconds
    
    // Log slow requests (over 1000ms)
    if (duration > 1000) {
      logWithContext('warn', `Slow request: ${req.method} ${req.originalUrl} (${duration.toFixed(2)}ms)`, {
        method: req.method,
        url: req.originalUrl,
        duration,
        requestId: req.headers['x-request-id'] || '',
      });
    }
    
    // Add timing header
    res.setHeader('X-Response-Time', `${duration.toFixed(2)}ms`);
  });
  
  next();
}