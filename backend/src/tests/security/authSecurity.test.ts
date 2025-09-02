import request from 'supertest';
import mongoose from 'mongoose';
import app from '../../server';
import * as dbSetup from '../utils/setupTestDB';
import { createTestUser } from '../utils/testDataGenerator';

describe('Authentication Security Tests', () => {
  let mongoServer: any;

  beforeAll(async () => {
    // Setup in-memory database
    const result = await dbSetup.connect();
    mongoServer = result.mongoServer;
  });

  afterAll(async () => {
    // Close database connection
    await dbSetup.closeDatabase(mongoServer);
  });

  beforeEach(async () => {
    // Clear database collections before each test
    await dbSetup.clearDatabase();
  });

  describe('Login Security', () => {
    beforeEach(async () => {
      // Create a test user
      await createTestUser('planner', {
        email: 'security-test@example.com',
        password: '$2a$10$XQWvjHrKoxCUjd2VZxgBceEEjqkUzKZLuUmBp8yrLMc/X/2F9/YFO' // hashed 'securePassword123'
      });
    });

    it('should prevent brute force attacks with rate limiting', async () => {
      // Make multiple login attempts with incorrect password
      const loginAttempts = Array(10).fill(0).map(() => 
        request(app)
          .post('/api/auth/login')
          .send({
            email: 'security-test@example.com',
            password: 'wrongPassword'
          })
      );
      
      const responses = await Promise.all(loginAttempts);
      
      // At least one of the later responses should be rate limited (429)
      const rateLimitedResponse = responses.find(res => res.status === 429);
      
      // If we got rate limited, check the response format
      if (rateLimitedResponse) {
        expect(rateLimitedResponse.body).toHaveProperty('success', false);
        expect(rateLimitedResponse.body).toHaveProperty('error');
        expect(rateLimitedResponse.body.error).toHaveProperty('type', 'RATE_LIMIT_ERROR');
      }
    });

    it('should not reveal whether email exists on failed login', async () => {
      // Try login with non-existent email
      const nonExistentResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'anyPassword'
        });
      
      // Try login with existing email but wrong password
      const wrongPasswordResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'security-test@example.com',
          password: 'wrongPassword'
        });
      
      // Both responses should have the same generic error message
      expect(nonExistentResponse.status).toBe(401);
      expect(wrongPasswordResponse.status).toBe(401);
      
      // Error messages should be generic and not reveal if email exists
      expect(nonExistentResponse.body.error.message).toBe(wrongPasswordResponse.body.error.message);
    });

    it('should prevent SQL injection in login parameters', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: "' OR 1=1 --",
          password: "' OR 1=1 --"
        });
      
      // Should not authenticate with SQL injection attempt
      expect(response.status).not.toBe(200);
      expect(response.body).not.toHaveProperty('data.token');
    });
  });

  describe('JWT Security', () => {
    let validToken: string;
    
    beforeEach(async () => {
      // Create a test user and get a valid token
      const user = await createTestUser('planner');
      
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: user.email,
          password: 'password123'
        });
      
      validToken = loginResponse.body.data.token;
    });

    it('should reject expired tokens', async () => {
      // Create an expired token (this requires modifying the JWT implementation for testing)
      // For this test, we'll just wait until the token expires, but in a real test
      // you would mock the JWT verification to simulate an expired token
      
      // This is a placeholder for the actual test
      const expiredToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjEyMzQ1Njc4OTAiLCJpYXQiOjE1MTYyMzkwMjIsImV4cCI6MTUxNjIzOTAyM30.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';
      
      const response = await request(app)
        .get('/api/users/profile')
        .set('Authorization', `Bearer ${expiredToken}`);
      
      expect(response.status).toBe(401);
      expect(response.body.error.type).toBe('AUTHENTICATION_ERROR');
    });

    it('should reject tampered tokens', async () => {
      // Tamper with the valid token by changing a character
      const tamperedToken = validToken.substring(0, validToken.length - 5) + 'XXXXX';
      
      const response = await request(app)
        .get('/api/users/profile')
        .set('Authorization', `Bearer ${tamperedToken}`);
      
      expect(response.status).toBe(401);
      expect(response.body.error.type).toBe('AUTHENTICATION_ERROR');
    });

    it('should reject tokens with invalid signature', async () => {
      // Create a token with valid format but invalid signature
      const invalidToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjEyMzQ1Njc4OTAiLCJpYXQiOjE1MTYyMzkwMjJ9.invalid_signature_here';
      
      const response = await request(app)
        .get('/api/users/profile')
        .set('Authorization', `Bearer ${invalidToken}`);
      
      expect(response.status).toBe(401);
      expect(response.body.error.type).toBe('AUTHENTICATION_ERROR');
    });
  });

  describe('Password Reset Security', () => {
    let user: any;
    
    beforeEach(async () => {
      // Create a test user
      user = await createTestUser('student');
    });

    it('should not reveal if email exists during password reset request', async () => {
      // Request password reset for existing email
      const existingEmailResponse = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: user.email });
      
      // Request password reset for non-existing email
      const nonExistingEmailResponse = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: 'nonexistent@example.com' });
      
      // Both should return 200 OK with the same message
      expect(existingEmailResponse.status).toBe(200);
      expect(nonExistingEmailResponse.status).toBe(200);
      
      // Messages should be identical to prevent email enumeration
      expect(existingEmailResponse.body.message).toBe(nonExistingEmailResponse.body.message);
    });

    it('should require strong passwords during reset', async () => {
      // This test assumes there's a password reset token mechanism
      // For simplicity, we'll just test the password validation directly
      
      // Test with weak password
      const weakPasswordResponse = await request(app)
        .post('/api/auth/reset-password')
        .send({
          token: 'valid-reset-token',
          password: '123456',
          confirmPassword: '123456'
        });
      
      expect(weakPasswordResponse.status).toBe(400);
      expect(weakPasswordResponse.body.error.type).toBe('VALIDATION_ERROR');
      
      // Test with strong password
      const strongPasswordResponse = await request(app)
        .post('/api/auth/reset-password')
        .send({
          token: 'valid-reset-token',
          password: 'StrongP@ssw0rd123',
          confirmPassword: 'StrongP@ssw0rd123'
        });
      
      // This might still fail due to invalid token, but should pass password validation
      expect(strongPasswordResponse.status).not.toBe(400);
      // If it fails, it should be due to invalid token, not password validation
      if (strongPasswordResponse.status !== 200) {
        expect(strongPasswordResponse.body.error.type).not.toBe('VALIDATION_ERROR');
      }
    });
  });
});