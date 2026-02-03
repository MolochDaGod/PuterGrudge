/**
 * Circuit Breaker Pattern Implementation
 * Prevents cascading failures by stopping requests to failing services
 */

export enum CircuitState {
  CLOSED = 'CLOSED',     // Normal operation
  OPEN = 'OPEN',         // Blocking requests
  HALF_OPEN = 'HALF_OPEN' // Testing if service recovered
}

export interface CircuitBreakerConfig {
  failureThreshold: number;      // Number of failures before opening
  successThreshold: number;       // Number of successes to close from half-open
  timeout: number;                // Time to wait before half-open (ms)
  monitoringPeriod: number;       // Time window for failure tracking (ms)
  volumeThreshold: number;        // Minimum requests before circuit can open
}

export interface CircuitBreakerStats {
  state: CircuitState;
  failures: number;
  successes: number;
  totalRequests: number;
  lastFailureTime?: number;
  lastStateChange: number;
  consecutiveFailures: number;
  consecutiveSuccesses: number;
}

export class CircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED;
  private failures: number = 0;
  private successes: number = 0;
  private consecutiveFailures: number = 0;
  private consecutiveSuccesses: number = 0;
  private lastFailureTime?: number;
  private lastStateChange: number = Date.now();
  private totalRequests: number = 0;
  private resetTimer?: NodeJS.Timeout;
  
  constructor(
    private readonly name: string,
    private readonly config: CircuitBreakerConfig = {
      failureThreshold: 5,
      successThreshold: 2,
      timeout: 60000, // 1 minute
      monitoringPeriod: 120000, // 2 minutes
      volumeThreshold: 10
    }
  ) {}

  async execute<T>(
    operation: () => Promise<T>,
    fallback?: () => Promise<T>
  ): Promise<T> {
    if (this.state === CircuitState.OPEN) {
      if (this.shouldAttemptReset()) {
        this.transitionTo(CircuitState.HALF_OPEN);
      } else {
        if (fallback) {
          console.log(`[CircuitBreaker:${this.name}] Circuit OPEN, using fallback`);
          return fallback();
        }
        throw new Error(`Circuit breaker is OPEN for ${this.name}`);
      }
    }

    this.totalRequests++;

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess(): void {
    this.successes++;
    this.consecutiveSuccesses++;
    this.consecutiveFailures = 0;

    if (this.state === CircuitState.HALF_OPEN) {
      if (this.consecutiveSuccesses >= this.config.successThreshold) {
        console.log(`[CircuitBreaker:${this.name}] Closing circuit after ${this.consecutiveSuccesses} successes`);
        this.transitionTo(CircuitState.CLOSED);
        this.reset();
      }
    }
  }

  private onFailure(): void {
    this.failures++;
    this.consecutiveFailures++;
    this.consecutiveSuccesses = 0;
    this.lastFailureTime = Date.now();

    if (this.state === CircuitState.HALF_OPEN) {
      console.log(`[CircuitBreaker:${this.name}] Failure in HALF_OPEN, reopening circuit`);
      this.transitionTo(CircuitState.OPEN);
      this.scheduleReset();
      return;
    }

    if (this.state === CircuitState.CLOSED) {
      const failureRate = this.failures / this.totalRequests;
      
      if (
        this.totalRequests >= this.config.volumeThreshold &&
        this.consecutiveFailures >= this.config.failureThreshold
      ) {
        console.log(`[CircuitBreaker:${this.name}] Opening circuit after ${this.consecutiveFailures} failures (rate: ${(failureRate * 100).toFixed(1)}%)`);
        this.transitionTo(CircuitState.OPEN);
        this.scheduleReset();
      }
    }
  }

  private shouldAttemptReset(): boolean {
    if (!this.lastFailureTime) return false;
    return Date.now() - this.lastFailureTime >= this.config.timeout;
  }

  private transitionTo(newState: CircuitState): void {
    const oldState = this.state;
    this.state = newState;
    this.lastStateChange = Date.now();
    
    if (oldState !== newState) {
      console.log(`[CircuitBreaker:${this.name}] State transition: ${oldState} -> ${newState}`);
    }
  }

  private scheduleReset(): void {
    if (this.resetTimer) {
      clearTimeout(this.resetTimer);
    }

    this.resetTimer = setTimeout(() => {
      console.log(`[CircuitBreaker:${this.name}] Timeout elapsed, moving to HALF_OPEN`);
      this.transitionTo(CircuitState.HALF_OPEN);
    }, this.config.timeout);
  }

  private reset(): void {
    this.failures = 0;
    this.successes = 0;
    this.consecutiveFailures = 0;
    this.consecutiveSuccesses = 0;
    this.totalRequests = 0;
    
    if (this.resetTimer) {
      clearTimeout(this.resetTimer);
      this.resetTimer = undefined;
    }
  }

  getStats(): CircuitBreakerStats {
    return {
      state: this.state,
      failures: this.failures,
      successes: this.successes,
      totalRequests: this.totalRequests,
      lastFailureTime: this.lastFailureTime,
      lastStateChange: this.lastStateChange,
      consecutiveFailures: this.consecutiveFailures,
      consecutiveSuccesses: this.consecutiveSuccesses
    };
  }

  isOpen(): boolean {
    return this.state === CircuitState.OPEN;
  }

  forceOpen(): void {
    this.transitionTo(CircuitState.OPEN);
  }

  forceClose(): void {
    this.transitionTo(CircuitState.CLOSED);
    this.reset();
  }

  forceClear(): void {
    this.reset();
  }
}
