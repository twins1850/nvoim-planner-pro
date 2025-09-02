import { retry, RetryOptions } from '../../utils/retry';

describe('Retry Utility', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should resolve immediately if the function succeeds on first try', async () => {
    const mockFn = jest.fn().mockResolvedValue('success');
    
    const promise = retry(mockFn);
    jest.runAllTimers();
    
    const result = await promise;
    
    expect(result).toBe('success');
    expect(mockFn).toHaveBeenCalledTimes(1);
  });

  it('should retry until success', async () => {
    const mockFn = jest.fn()
      .mockRejectedValueOnce(new Error('Failure 1'))
      .mockRejectedValueOnce(new Error('Failure 2'))
      .mockResolvedValue('success');
    
    const promise = retry(mockFn, { maxRetries: 2 });
    
    // Fast-forward until all timers have been executed
    jest.runAllTimers();
    
    const result = await promise;
    
    expect(result).toBe('success');
    expect(mockFn).toHaveBeenCalledTimes(3); // Initial + 2 retries
  });

  it('should fail after max retries', async () => {
    const mockFn = jest.fn().mockRejectedValue(new Error('Persistent failure'));
    
    const promise = retry(mockFn, { maxRetries: 2 });
    
    // Fast-forward until all timers have been executed
    jest.runAllTimers();
    
    await expect(promise).rejects.toThrow('Persistent failure');
    expect(mockFn).toHaveBeenCalledTimes(3); // Initial + 2 retries
  });

  it('should use exponential backoff', async () => {
    const mockFn = jest.fn()
      .mockRejectedValueOnce(new Error('Failure 1'))
      .mockRejectedValueOnce(new Error('Failure 2'))
      .mockResolvedValue('success');
    
    const options: RetryOptions = {
      maxRetries: 2,
      initialDelayMs: 100,
      backoffFactor: 2,
      maxDelayMs: 1000
    };
    
    const promise = retry(mockFn, options);
    
    // First call happens immediately
    expect(mockFn).toHaveBeenCalledTimes(1);
    
    // First retry should happen after 100ms
    jest.advanceTimersByTime(100);
    expect(mockFn).toHaveBeenCalledTimes(2);
    
    // Second retry should happen after 200ms (100ms * 2)
    jest.advanceTimersByTime(200);
    expect(mockFn).toHaveBeenCalledTimes(3);
    
    const result = await promise;
    expect(result).toBe('success');
  });

  it('should respect maxDelayMs', async () => {
    const mockFn = jest.fn()
      .mockRejectedValueOnce(new Error('Failure 1'))
      .mockRejectedValueOnce(new Error('Failure 2'))
      .mockRejectedValueOnce(new Error('Failure 3'))
      .mockResolvedValue('success');
    
    const options: RetryOptions = {
      maxRetries: 3,
      initialDelayMs: 100,
      backoffFactor: 10, // Large factor to hit maxDelayMs quickly
      maxDelayMs: 500
    };
    
    const promise = retry(mockFn, options);
    
    // First call happens immediately
    expect(mockFn).toHaveBeenCalledTimes(1);
    
    // First retry should happen after 100ms
    jest.advanceTimersByTime(100);
    expect(mockFn).toHaveBeenCalledTimes(2);
    
    // Second retry should happen after 500ms (capped by maxDelayMs)
    jest.advanceTimersByTime(500);
    expect(mockFn).toHaveBeenCalledTimes(3);
    
    // Third retry should also happen after 500ms (capped by maxDelayMs)
    jest.advanceTimersByTime(500);
    expect(mockFn).toHaveBeenCalledTimes(4);
    
    const result = await promise;
    expect(result).toBe('success');
  });

  it('should only retry specific errors if retryableErrors is provided', async () => {
    class RetryableError extends Error {
      constructor(message: string) {
        super(message);
        this.name = 'RetryableError';
      }
    }
    
    class NonRetryableError extends Error {
      constructor(message: string) {
        super(message);
        this.name = 'NonRetryableError';
      }
    }
    
    const mockFn = jest.fn()
      .mockRejectedValueOnce(new RetryableError('Retryable failure'))
      .mockRejectedValueOnce(new NonRetryableError('Non-retryable failure'));
    
    const options: RetryOptions = {
      maxRetries: 3,
      initialDelayMs: 100,
      retryableErrors: [RetryableError]
    };
    
    const promise = retry(mockFn, options);
    
    // First call happens immediately
    expect(mockFn).toHaveBeenCalledTimes(1);
    
    // First retry should happen after 100ms
    jest.advanceTimersByTime(100);
    expect(mockFn).toHaveBeenCalledTimes(2);
    
    // Should not retry after NonRetryableError
    jest.advanceTimersByTime(1000); // Advance well past any potential retry
    expect(mockFn).toHaveBeenCalledTimes(2);
    
    await expect(promise).rejects.toThrow('Non-retryable failure');
  });

  it('should call onRetry callback before each retry', async () => {
    const mockFn = jest.fn()
      .mockRejectedValueOnce(new Error('Failure 1'))
      .mockRejectedValueOnce(new Error('Failure 2'))
      .mockResolvedValue('success');
    
    const onRetry = jest.fn();
    
    const options: RetryOptions = {
      maxRetries: 2,
      initialDelayMs: 100,
      onRetry
    };
    
    const promise = retry(mockFn, options);
    
    // Fast-forward until all timers have been executed
    jest.runAllTimers();
    
    await promise;
    
    expect(onRetry).toHaveBeenCalledTimes(2);
    expect(onRetry).toHaveBeenNthCalledWith(1, new Error('Failure 1'), 1);
    expect(onRetry).toHaveBeenNthCalledWith(2, new Error('Failure 2'), 2);
  });
});