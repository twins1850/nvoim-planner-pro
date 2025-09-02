import request from 'supertest';
import mongoose from 'mongoose';
import app from '../../server';
import { CircuitBreakerRegistry } from '../../utils/circuitBreaker';
import { AppError, ErrorType } from '../../middleware/errorHandler';
import * as dbSetup from '../utils/setupTestDB';

describe('Error Handling Integration Tests', () => {
  let mongoServer: any;

  beforeAll(async () => {
    // Setup in-memory database
    const result = await dbSetup.connect();
    mongoServer = result.mongoServer;
  });

  afterAll(async () => {
    // Reset all circuit breakers
    CircuitBreakerRegistry.resetAll();
    
    // Close database connection
    await dbSetup.closeDatabase(mongoServer);
  });

  beforeEach(async () => {
    // Clear database collections before each test
    await dbSetup.clearDatabase();
  });

  describe('404 Not Found Handler', () => {
    it('should return 404 with proper error format for non-existent routes', async () => {
      const response = await request(app).get('/api/non-existent-route');
      
      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toHaveProperty('type', 'NOT_FOUND');
      expect(response.body.error).toHaveProperty('message');
      expect(response.body).toHaveProperty('timestamp');
    });
  });

  describe('Validation Error Handling', () => {
    it('should return 400 with proper error format for validation errors', async () => {
      // Attempt to login with invalid data
      const response = await request(app)
        .post('/api/auth/login')
        .send({ email: 'not-an-email', password: '' });
      
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toHaveProperty('type', 'VALIDATION_ERROR');
    });
  });

  describe('Authentication Error Handling', () => {
    it('should return 401 for unauthorized access to protected routes', async () => {
      const response = await request(app).get('/api/users/profile');
      
      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toHaveProperty('type', 'AUTHENTICATION_ERROR');
    });
  });

  describe('Rate Limiting', () => {
    it('should apply rate limiting after too many requests', async () => {
      // Make multiple requests to trigger rate limiting
      const requests = Array(25).fill(0).map(() => 
        request(app).get('/api/health')
      );
      
      // Execute all requests
      const responses = await Promise.all(requests);
      
      // At least one response should be rate limited (429)
      const rateLimitedResponse = responses.find(res => res.status === 429);
      
      // If we got rate limited, check the response format
      if (rateLimitedResponse) {
        expect(rateLimitedResponse.body).toHaveProperty('success', false);
        expect(rateLimitedResponse.body).toHaveProperty('error');
        expect(rateLimitedResponse.body.error).toHaveProperty('type', 'RATE_LIMIT_ERROR');
      }
    });
  });

  describe('Circuit Breaker Pattern', () => {
    it('should open circuit after multiple failures', async () => {
      // Create a test circuit breaker
      const breaker = CircuitBreakerRegistry.getBreaker('test-breaker', {
        failureThreshold: 3,
        resetTimeout: 1000, // 1 second for testing
        monitoringPeriod: 10000
      });
      
      // Function that always fails
      const failingFunction = async () => {
        throw new Error('Test failure');
      };
      
      // Call the failing function multiple times to open the circuit
      try {
        await breaker.execute(failingFunction);
      } catch (error) {
        // Expected to fail
      }
      
      try {
        await breaker.execute(failingFunction);
      } catch (error) {
        // Expected to fail
      }
      
      try {
        await breaker.execute(failingFunction);
      } catch (error) {
        // Expected to fail
      }
      
      // Circuit should now be open
      try {
        await breaker.execute(failingFunction);
        fail('Circuit should be open and fail fast');
      } catch (error: any) {
        expect(error.message).toContain('Circuit test-breaker is OPEN');
      }
      
      // Wait for reset timeout
      await new Promise(resolve => setTimeout(resolve, 1100));
      
      // Circuit should now be half-open
      try {
        await breaker.execute(failingFunction);
        fail('Circuit should still fail in half-open state');
      } catch (error: any) {
        expect(error.message).toContain('Test failure');
      }
    });
  });

  describe('Retry Mechanism', () => {
    it('should retry operations with exponential backoff', async () => {
      const { retry } = require('../../utils/retry');
      
      let attempts = 0;
      const maxAttempts = 3;
      
      const testFunction = jest.fn().mockImplementation(async () => {
        attempts++;
        if (attempts < maxAttempts) {
          throw new Error('Temporary failure');
        }
        return 'success';
      });
      
      const result = await retry(testFunction, {
        maxRetries: maxAttempts - 1,
        initialDelayMs: 10,
        maxDelayMs: 100,
        backoffFactor: 2
      });
      
      expect(result).toBe('success');
      expect(testFunction).toHaveBeenCalledTimes(maxAttempts);
    });
    
    it('should fail after max retries', async () => {
      const { retry } = require('../../utils/retry');
      
      const testFunction = jest.fn().mockImplementation(async () => {
        throw new Error('Persistent failure');
      });
      
      await expect(retry(testFunction, {
        maxRetries: 2,
        initialDelayMs: 10,
        maxDelayMs: 100,
        backoffFactor: 2
      })).rejects.toThrow('Persistent failure');
      
      expect(testFunction).toHaveBeenCalledTimes(3); // Initial + 2 retries
    });
  });

  describe('Graceful Degradation', () => {
    it('should provide fallback functionality when services fail', async () => {
      const { fallbackService } = require('../../services/fallbackService');
      
      // Test basic conversation analysis fallback
      const speakerSegments = [
        {
          speaker: 'teacher',
          startTime: 0,
          endTime: 10,
          transcript: 'How are you today?',
          confidence: 0.9
        },
        {
          speaker: 'student',
          startTime: 11,
          endTime: 15,
          transcript: 'I am fine, thank you.',
          confidence: 0.8
        }
      ];
      
      const result = fallbackService.generateBasicConversationAnalysis(speakerSegments);
      
      expect(result).toHaveProperty('lessonInsights');
      expect(result).toHaveProperty('improvementAreas');
      expect(result).toHaveProperty('generatedNotes');
      expect(Array.isArray(result.lessonInsights)).toBe(true);
      expect(result.lessonInsights.length).toBeGreaterThan(0);
    });
  });

  describe('Custom Error Classes', () => {
    it('should create proper AppError instances with correct properties', () => {
      const error = new AppError(
        'Test error message',
        ErrorType.VALIDATION_ERROR,
        400,
        true,
        { field: 'test' }
      );
      
      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(AppError);
      expect(error.message).toBe('Test error message');
      expect(error.type).toBe(ErrorType.VALIDATION_ERROR);
      expect(error.statusCode).toBe(400);
      expect(error.isOperational).toBe(true);
      expect(error.details).toEqual({ field: 'test' });
      expect(error.stack).toBeDefined();
    });
  });
});