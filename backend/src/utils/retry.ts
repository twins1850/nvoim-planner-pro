import { logWithContext } from './logger';

/**
 * Retry configuration
 */
export interface RetryConfig {
  maxRetries: number;           // Maximum number of retry attempts
  initialDelayMs: number;       // Initial delay before first retry (ms)
  maxDelayMs: number;           // Maximum delay between retries (ms)
  backoffFactor: number;        // Exponential backoff factor
  retryableErrors?: RegExp[];   // Error patterns that are retryable
  onRetry?: (error: Error, attempt: number, delay: number) => void; // Callback on retry
}

/**
 * Default retry configuration
 */
const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  initialDelayMs: 1000,
  maxDelayMs: 30000,
  backoffFactor: 2,
};

/**
 * Retry a function with exponential backoff
 * @param fn Function to retry
 * @param config Retry configuration
 * @returns Promise that resolves with the function result or rejects after max retries
 */
export async function retry<T>(
  fn: () => Promise<T>,
  config: Partial<RetryConfig> = {}
): Promise<T> {
  const retryConfig: RetryConfig = { ...DEFAULT_RETRY_CONFIG, ...config };
  let attempt = 0;
  let lastError: Error;

  while (attempt <= retryConfig.maxRetries) {
    try {
      if (attempt > 0) {
        logWithContext('info', `Retry attempt ${attempt}/${retryConfig.maxRetries}`);
      }
      return await fn();
    } catch (error) {
      lastError = error as Error;
      attempt++;

      // If we've reached max retries, throw the error
      if (attempt > retryConfig.maxRetries) {
        logWithContext('error', `Max retries (${retryConfig.maxRetries}) exceeded`, { error: lastError.message });
        throw lastError;
      }

      // Check if error is retryable
      if (retryConfig.retryableErrors && retryConfig.retryableErrors.length > 0) {
        const isRetryable = retryConfig.retryableErrors.some(pattern => 
          pattern.test(lastError.message || '')
        );

        if (!isRetryable) {
          logWithContext('warn', `Non-retryable error encountered`, { error: lastError.message });
          throw lastError;
        }
      }

      // Calculate delay with exponential backoff
      const delay = Math.min(
        retryConfig.initialDelayMs * Math.pow(retryConfig.backoffFactor, attempt - 1),
        retryConfig.maxDelayMs
      );

      // Add some jitter to prevent thundering herd
      const jitteredDelay = delay * (0.8 + Math.random() * 0.4);

      // Call onRetry callback if provided
      if (retryConfig.onRetry) {
        retryConfig.onRetry(lastError, attempt, jitteredDelay);
      }

      logWithContext('info', `Retrying after ${Math.round(jitteredDelay)}ms due to error: ${lastError.message}`);
      
      // Wait before next retry
      await new Promise(resolve => setTimeout(resolve, jitteredDelay));
    }
  }

  // This should never happen due to the throw in the loop
  throw new Error('Unexpected retry failure');
}

/**
 * Decorator for retrying class methods
 * @param config Retry configuration
 * @returns Method decorator
 */
export function Retryable(config: Partial<RetryConfig> = {}) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      return retry(
        () => originalMethod.apply(this, args),
        config
      );
    };

    return descriptor;
  };
}