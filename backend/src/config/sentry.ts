import * as Sentry from '@sentry/node';
import { ProfilingIntegration } from '@sentry/profiling-node';
import { Request, Response, NextFunction } from 'express';
import { logWithContext } from '../utils/logger';

/**
 * Initialize Sentry for error monitoring
 */
export function initializeSentry(): void {
  // Only initialize if DSN is provided
  if (!process.env.SENTRY_DSN) {
    logWithContext('warn', 'Sentry DSN not provided, skipping initialization');
    return;
  }

  try {
    Sentry.init({
      dsn: process.env.SENTRY_DSN,
      environment: process.env.NODE_ENV || 'development',
      integrations: [
        // Enable HTTP calls tracing
        new Sentry.Integrations.Http({ tracing: true }),
        // Enable Express.js middleware tracing
        new Sentry.Integrations.Express(),
        // Enable profiling
        new ProfilingIntegration(),
      ],
      // Set tracesSampleRate to 1.0 to capture 100% of transactions for performance monitoring
      // We recommend adjusting this value in production
      tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.2 : 1.0,
      // Set profilesSampleRate to 1.0 to profile all transactions
      profilesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
      // Enable debug mode in development
      debug: process.env.NODE_ENV === 'development',
      // Set the release version
      release: process.env.npm_package_version || '1.0.0',
    });

    logWithContext('info', 'Sentry initialized successfully');
  } catch (error) {
    logWithContext('error', 'Failed to initialize Sentry', { error });
  }
}

/**
 * Sentry request handler middleware
 */
export function sentryRequestHandler() {
  return Sentry.Handlers.requestHandler();
}

/**
 * Sentry error handler middleware
 */
export function sentryErrorHandler(): any {
  return Sentry.Handlers.errorHandler();
}

/**
 * Sentry tracing handler middleware
 */
export function sentryTracingHandler() {
  return Sentry.Handlers.tracingHandler();
}

/**
 * Capture exception with Sentry
 * @param error Error to capture
 * @param context Additional context
 */
export function captureException(error: Error, context?: Record<string, any>): string {
  if (!process.env.SENTRY_DSN) {
    return '';
  }

  return Sentry.captureException(error, { extra: context });
}

/**
 * Capture message with Sentry
 * @param message Message to capture
 * @param level Severity level
 * @param context Additional context
 */
export function captureMessage(
  message: string,
  level: Sentry.SeverityLevel = 'info',
  context?: Record<string, any>
): string {
  if (!process.env.SENTRY_DSN) {
    return '';
  }

  return Sentry.captureMessage(message, {
    level,
    extra: context,
  });
}

/**
 * Start a new transaction
 * @param name Transaction name
 * @param op Operation type
 */
export function startTransaction(name: string, op: string): Sentry.Transaction {
  return Sentry.startTransaction({
    name,
    op,
  });
}

/**
 * Set user information for Sentry
 * @param user User information
 */
export function setUser(user: { id: string; email?: string; username?: string }): void {
  Sentry.setUser(user);
}

/**
 * Middleware to add user information to Sentry
 */
export function sentryUserMiddleware(req: Request, res: Response, next: NextFunction): void {
  if ((req as any).user) {
    Sentry.setUser({
      id: (req as any).user.id,
      email: (req as any).user.email,
      username: (req as any).user.name || (req as any).user.username,
    });
  }
  next();
}