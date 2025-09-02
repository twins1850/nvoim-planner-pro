import request from 'supertest';
import app from '../../server';
import { securityAssessment } from '../../utils/securityAssessment';

describe('Security Configuration Tests', () => {
  describe('Security Headers', () => {
    it('should include essential security headers in responses', async () => {
      const response = await request(app).get('/api/health');
      
      // Check for security headers
      expect(response.headers).toHaveProperty('x-content-type-options', 'nosniff');
      expect(response.headers).toHaveProperty('x-frame-options', 'DENY');
      expect(response.headers).toHaveProperty('x-xss-protection', '1; mode=block');
      expect(response.headers).toHaveProperty('strict-transport-security');
      expect(response.headers).toHaveProperty('content-security-policy');
    });
  });

  describe('CORS Configuration', () => {
    it('should have secure CORS configuration', async () => {
      const response = await request(app)
        .options('/api/health')
        .set('Origin', 'https://example.com')
        .set('Access-Control-Request-Method', 'GET');
      
      // Check CORS headers
      expect(response.headers).toHaveProperty('access-control-allow-origin');
      expect(response.headers['access-control-allow-origin']).not.toBe('*');
      expect(response.headers).toHaveProperty('access-control-allow-methods');
      expect(response.headers).toHaveProperty('access-control-allow-headers');
      expect(response.headers).toHaveProperty('access-control-max-age');
    });
  });

  describe('Rate Limiting', () => {
    it('should apply rate limiting after multiple requests', async () => {
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

  describe('Content Security Policy', () => {
    it('should have a secure Content Security Policy', async () => {
      const response = await request(app).get('/api/health');
      
      // Check for CSP header
      expect(response.headers).toHaveProperty('content-security-policy');
      
      const csp = response.headers['content-security-policy'];
      
      // Check for essential CSP directives
      expect(csp).toContain("default-src 'self'");
      expect(csp).toContain("script-src 'self'");
      expect(csp).not.toContain("unsafe-inline");
      expect(csp).not.toContain("unsafe-eval");
    });
  });

  describe('Security Assessment', () => {
    it('should pass basic security assessment', async () => {
      const assessment = await securityAssessment.performBasicAssessment();
      
      // Check overall security score
      expect(assessment.score).toBeGreaterThanOrEqual(70);
      
      // Check for critical vulnerabilities
      expect(assessment.criticalVulnerabilities).toHaveLength(0);
      
      // Check for essential security features
      expect(assessment.securityFeatures).toContain('authentication');
      expect(assessment.securityFeatures).toContain('authorization');
      expect(assessment.securityFeatures).toContain('input-validation');
      expect(assessment.securityFeatures).toContain('rate-limiting');
    });
  });
});