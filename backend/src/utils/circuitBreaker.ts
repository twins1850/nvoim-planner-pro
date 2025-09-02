import { logWithContext } from './logger';

/**
 * Circuit breaker states
 */
enum CircuitState {
  CLOSED = 'CLOSED',     // Normal operation, requests pass through
  OPEN = 'OPEN',         // Circuit is open, requests fail fast
  HALF_OPEN = 'HALF_OPEN', // Testing if service is back online
}

/**
 * Circuit breaker configuration
 */
export interface CircuitBreakerConfig {
  failureThreshold: number;      // Number of failures before opening circuit
  resetTimeout: number;          // Time in ms to wait before trying again (OPEN -> HALF_OPEN)
  monitoringPeriod: number;      // Time window in ms to track failures
  name: string;                  // Name of the circuit breaker (for logging)
  fallbackFn?: <T>(...args: any[]) => Promise<T>; // Optional fallback function
}

/**
 * Circuit breaker implementation
 */
export class CircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED;
  private failures: number = 0;
  private lastFailureTime: number = 0;
  private resetTimer: NodeJS.Timeout | null = null;
  private readonly config: CircuitBreakerConfig;

  constructor(config: CircuitBreakerConfig) {
    this.config = {
      failureThreshold: 5,
      resetTimeout: 30000, // 30 seconds
      monitoringPeriod: 120000, // 2 minutes
      ...config,
    };
  }

  /**
   * Execute a function with circuit breaker protection
   * @param fn The function to execute
   * @param args Arguments to pass to the function
   * @returns The result of the function
   */
  async execute<T>(fn: (...args: any[]) => Promise<T>, ...args: any[]): Promise<T> {
    // Check if circuit is open
    if (this.state === CircuitState.OPEN) {
      // If reset timeout has passed, move to half-open
      if (Date.now() - this.lastFailureTime >= this.config.resetTimeout) {
        this.transitionToHalfOpen();
      } else {
        // Circuit is open, fail fast
        logWithContext('warn', `Circuit ${this.config.name} is OPEN. Failing fast.`);
        
        // If fallback function is provided, use it
        if (this.config.fallbackFn) {
          return this.config.fallbackFn(...args);
        }
        
        throw new Error(`Service unavailable: Circuit ${this.config.name} is OPEN`);
      }
    }

    try {
      // Execute the function
      const result = await fn(...args);
      
      // If successful and in HALF_OPEN state, close the circuit
      if (this.state === CircuitState.HALF_OPEN) {
        this.closeCircuit();
      }
      
      return result;
    } catch (error) {
      // Record the failure
      this.recordFailure();
      
      // If we've reached the failure threshold, open the circuit
      if (this.failures >= this.config.failureThreshold) {
        this.openCircuit();
      }
      
      // If fallback function is provided, use it
      if (this.config.fallbackFn) {
        return this.config.fallbackFn(...args);
      }
      
      // Re-throw the error
      throw error;
    }
  }

  /**
   * Record a failure
   */
  private recordFailure(): void {
    const now = Date.now();
    
    // Reset failure count if outside monitoring period
    if (now - this.lastFailureTime > this.config.monitoringPeriod) {
      this.failures = 1;
    } else {
      this.failures++;
    }
    
    this.lastFailureTime = now;
    
    logWithContext('warn', `Circuit ${this.config.name} recorded failure. Count: ${this.failures}/${this.config.failureThreshold}`);
  }

  /**
   * Open the circuit
   */
  private openCircuit(): void {
    if (this.state !== CircuitState.OPEN) {
      logWithContext('warn', `Circuit ${this.config.name} is now OPEN`);
      this.state = CircuitState.OPEN;
      
      // Set timer to transition to half-open after reset timeout
      this.resetTimer = setTimeout(() => {
        this.transitionToHalfOpen();
      }, this.config.resetTimeout);
    }
  }

  /**
   * Transition to half-open state
   */
  private transitionToHalfOpen(): void {
    logWithContext('info', `Circuit ${this.config.name} is now HALF_OPEN`);
    this.state = CircuitState.HALF_OPEN;
    
    // Clear any existing timer
    if (this.resetTimer) {
      clearTimeout(this.resetTimer);
      this.resetTimer = null;
    }
  }

  /**
   * Close the circuit
   */
  private closeCircuit(): void {
    logWithContext('info', `Circuit ${this.config.name} is now CLOSED`);
    this.state = CircuitState.CLOSED;
    this.failures = 0;
    
    // Clear any existing timer
    if (this.resetTimer) {
      clearTimeout(this.resetTimer);
      this.resetTimer = null;
    }
  }

  /**
   * Get the current state of the circuit
   */
  getState(): CircuitState {
    return this.state;
  }

  /**
   * Reset the circuit breaker to closed state
   */
  reset(): void {
    this.closeCircuit();
  }
}

// Circuit breaker registry to manage multiple circuit breakers
export class CircuitBreakerRegistry {
  private static breakers: Map<string, CircuitBreaker> = new Map();

  /**
   * Get or create a circuit breaker
   * @param name Name of the circuit breaker
   * @param config Configuration for the circuit breaker
   * @returns The circuit breaker instance
   */
  static getBreaker(name: string, config?: Partial<CircuitBreakerConfig>): CircuitBreaker {
    if (!this.breakers.has(name)) {
      this.breakers.set(name, new CircuitBreaker({
        name,
        ...(config || {}),
      }));
    }
    
    return this.breakers.get(name)!;
  }

  /**
   * Get all circuit breakers
   * @returns Map of all circuit breakers
   */
  static getAllBreakers(): Map<string, CircuitBreaker> {
    return this.breakers;
  }

  /**
   * Reset all circuit breakers
   */
  static resetAll(): void {
    this.breakers.forEach(breaker => breaker.reset());
  }
}