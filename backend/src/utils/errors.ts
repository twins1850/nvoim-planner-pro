/**
 * Custom error classes for the application
 */

export class AppError extends Error {
  statusCode: number;
  type: string;
  details?: any;

  constructor(message: string, statusCode: number, type: string, details?: any) {
    super(message);
    this.statusCode = statusCode;
    this.type = type;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class BadRequestError extends AppError {
  constructor(message: string, details?: any) {
    super(message, 400, 'BAD_REQUEST', details);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = 'Unauthorized', details?: any) {
    super(message, 401, 'UNAUTHORIZED', details);
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = 'Forbidden', details?: any) {
    super(message, 403, 'FORBIDDEN', details);
  }
}

export class NotFoundError extends AppError {
  constructor(message: string, details?: any) {
    super(message, 404, 'NOT_FOUND', details);
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: any) {
    super(message, 422, 'VALIDATION_ERROR', details);
  }
}

export class ConflictError extends AppError {
  constructor(message: string, details?: any) {
    super(message, 409, 'CONFLICT', details);
  }
}

export class InternalServerError extends AppError {
  constructor(message: string = 'Internal Server Error', details?: any) {
    super(message, 500, 'INTERNAL_SERVER_ERROR', details);
  }
}

export class ServiceUnavailableError extends AppError {
  constructor(message: string = 'Service Unavailable', details?: any) {
    super(message, 503, 'SERVICE_UNAVAILABLE', details);
  }
}

export class ExternalAPIError extends AppError {
  constructor(message: string, details?: any) {
    super(message, 502, 'EXTERNAL_API_ERROR', details);
  }
}

export class FileProcessingError extends AppError {
  constructor(message: string, details?: any) {
    super(message, 500, 'FILE_PROCESSING_ERROR', details);
  }
}

export class AIServiceError extends AppError {
  constructor(message: string, details?: any) {
    super(message, 502, 'AI_SERVICE_ERROR', details);
  }
}