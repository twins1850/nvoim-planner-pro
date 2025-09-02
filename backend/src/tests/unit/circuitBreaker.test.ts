import { CircuitBreaker, CircuitBreakerRegistry, CircuitBreakerState } from '../../utils/circuitBreaker';

describe('CircuitBreaker', () => {
  beforeEach(() => {
    // Reset all circuit breakers before each test
    CircuitBreakerRegistry.resetAll();
    
    // Mock Date.now to control time
    jest.spyOn(Date, 'now').mockImplementation(() => 1000);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('CircuitBreaker Class', () => {
    it('should create a circuit breaker with default options', () => {
      const breaker = new CircuitBreaker('test-breaker');
      
      expect(breaker.name).toBe('test-breaker');
      expect(breaker.state).toBe(CircuitBreakerState.CLOSED);
      expect(breaker.failureCount).toBe(0);
      expect(breaker.lastFailureTime).toBe(0);
      expect(breaker.options).toEqual({
        failureThreshold: 5,
        resetTimeout: 30000,
        monitoringPeriod: 120000
      });
    });

    it('should create a circuit breaker with custom options', () => {
      const options = {
        failureThreshold: 3,
        resetTimeout: 10000,
        monitoringPeriod: 60000
      };
      
      const breaker = new CircuitBreaker('test-breaker', options);
      
      expect(breaker.options).toEqual(options);
    });

    it('should execute a function successfully when circuit is closed', async () => {
      const breaker = new CircuitBreaker('test-breaker');
      const mockFn = jest.fn().mockResolvedValue('success');
      
      const result = await breaker.execute(mockFn);
      
      expect(result).toBe('success');
      expect(mockFn).toHaveBeenCalledTimes(1);
      expect(breaker.state).toBe(CircuitBreakerState.CLOSED);
      expect(breaker.failureCount).toBe(0);
    });

    it('should track failures and open circuit when threshold is reached', async () => {
      const breaker = new CircuitBreaker('test-breaker', { failureThreshold: 2 });
      const mockFn = jest.fn().mockRejectedValue(new Error('test error'));
      
      // First failure
      await expect(breaker.execute(mockFn)).rejects.toThrow('test error');
      expect(breaker.state).toBe(CircuitBreakerState.CLOSED);
      expect(breaker.failureCount).toBe(1);
      
      // Second failure - should open the circuit
      await expect(breaker.execute(mockFn)).rejects.toThrow('test error');
      expect(breaker.state).toBe(CircuitBreakerState.OPEN);
      expect(breaker.failureCount).toBe(2);
      
      // Circuit is open, should fail fast without calling the function
      await expect(breaker.execute(mockFn)).rejects.toThrow('Circuit test-breaker is OPEN');
      expect(mockFn).toHaveBeenCalledTimes(2); // Function not called on third attempt
    });

    it('should transition to half-open state after reset timeout', async () => {
      const breaker = new CircuitBreaker('test-breaker', { 
        failureThreshold: 1,
        resetTimeout: 5000
      });
      
      const mockFn = jest.fn().mockRejectedValue(new Error('test error'));
      
      // Fail and open the circuit
      await expect(breaker.execute(mockFn)).rejects.toThrow('test error');
      expect(breaker.state).toBe(CircuitBreakerState.OPEN);
      
      // Advance time past reset timeout
      jest.spyOn(Date, 'now').mockImplementation(() => 10000);
      
      // Next call should put circuit in half-open state
      const successFn = jest.fn().mockResolvedValue('success');
      const result = await breaker.execute(successFn);
      
      expect(breaker.state).toBe(CircuitBreakerState.CLOSED);
      expect(result).toBe('success');
    });

    it('should reopen circuit immediately if it fails in half-open state', async () => {
      const breaker = new CircuitBreaker('test-breaker', { 
        failureThreshold: 1,
        resetTimeout: 5000
      });
      
      // Fail and open the circuit
      await expect(breaker.execute(() => Promise.reject(new Error('test error')))).rejects.toThrow('test error');
      expect(breaker.state).toBe(CircuitBreakerState.OPEN);
      
      // Advance time past reset timeout
      jest.spyOn(Date, 'now').mockImplementation(() => 10000);
      
      // Next call should put circuit in half-open state, but fail again
      await expect(breaker.execute(() => Promise.reject(new Error('another error')))).rejects.toThrow('another error');
      
      // Circuit should be open again
      expect(breaker.state).toBe(CircuitBreakerState.OPEN);
      
      // Should fail fast
      await expect(breaker.execute(() => Promise.resolve('success'))).rejects.toThrow('Circuit test-breaker is OPEN');
    });

    it('should reset failure count after successful execution', async () => {
      const breaker = new CircuitBreaker('test-breaker', { failureThreshold: 3 });
      
      // Two failures
      await expect(breaker.execute(() => Promise.reject(new Error('error 1')))).rejects.toThrow('error 1');
      await expect(breaker.execute(() => Promise.reject(new Error('error 2')))).rejects.toThrow('error 2');
      
      expect(breaker.failureCount).toBe(2);
      
      // Successful execution
      await breaker.execute(() => Promise.resolve('success'));
      
      // Failure count should be reset
      expect(breaker.failureCount).toBe(0);
    });
  });

  describe('CircuitBreakerRegistry', () => {
    it('should create and retrieve circuit breakers', () => {
      const breaker1 = CircuitBreakerRegistry.getBreaker('service1');
      const breaker2 = CircuitBreakerRegistry.getBreaker('service2');
      
      expect(breaker1).toBeInstanceOf(CircuitBreaker);
      expect(breaker2).toBeInstanceOf(CircuitBreaker);
      expect(breaker1).not.toBe(breaker2);
      
      // Getting the same breaker should return the same instance
      const breaker1Again = CircuitBreakerRegistry.getBreaker('service1');
      expect(breaker1Again).toBe(breaker1);
    });

    it('should create circuit breakers with custom options', () => {
      const options = {
        failureThreshold: 2,
        resetTimeout: 5000,
        monitoringPeriod: 60000
      };
      
      const breaker = CircuitBreakerRegistry.getBreaker('custom-service', options);
      
      expect(breaker.options).toEqual(options);
    });

    it('should reset all circuit breakers', () => {
      // Create and open a circuit breaker
      const breaker = CircuitBreakerRegistry.getBreaker('test-service', { failureThreshold: 1 });
      
      breaker.execute(() => Promise.reject(new Error('test error')))
        .catch(() => {}); // Ignore the error
      
      expect(breaker.state).toBe(CircuitBreakerState.OPEN);
      
      // Reset all circuit breakers
      CircuitBreakerRegistry.resetAll();
      
      // The breaker should be closed again
      expect(breaker.state).toBe(CircuitBreakerState.CLOSED);
      expect(breaker.failureCount).toBe(0);
    });
  });
});