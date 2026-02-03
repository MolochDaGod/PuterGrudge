/**
 * AI API Manager - Centralized API management with resilience patterns
 * Prevents 503 spam and manages AI service health
 */

import { CircuitBreaker, CircuitState } from '../lib/circuit-breaker';
import { RequestQueue } from '../lib/request-queue';

export interface AIAPIHealth {
  service: string;
  healthy: boolean;
  circuitState: CircuitState;
  queueStats: {
    pending: number;
    processing: number;
    completed: number;
    failed: number;
  };
  lastCheck: number;
  errorRate: number;
}

export interface AIRequestOptions {
  priority?: number;
  maxRetries?: number;
  timeout?: number;
  useFallback?: boolean;
}

class AIAPIManager {
  private circuitBreakers: Map<string, CircuitBreaker> = new Map();
  private requestQueues: Map<string, RequestQueue> = new Map();
  private healthChecks: Map<string, AIAPIHealth> = new Map();
  private errorCounts: Map<string, number> = new Map();
  private requestCounts: Map<string, number> = new Map();

  constructor() {
    // Initialize default services
    this.registerService('openai', {
      failureThreshold: 5,
      successThreshold: 2,
      timeout: 60000,
      monitoringPeriod: 120000,
      volumeThreshold: 10
    });

    this.registerService('qdrant', {
      failureThreshold: 3,
      successThreshold: 2,
      timeout: 30000,
      monitoringPeriod: 60000,
      volumeThreshold: 5
    });

    this.registerService('puter-ai', {
      failureThreshold: 5,
      successThreshold: 2,
      timeout: 45000,
      monitoringPeriod: 90000,
      volumeThreshold: 10
    });

    // Periodic health check
    setInterval(() => this.updateHealthMetrics(), 30000);
  }

  private registerService(name: string, config?: any): void {
    if (!this.circuitBreakers.has(name)) {
      this.circuitBreakers.set(name, new CircuitBreaker(name, config));
    }

    if (!this.requestQueues.has(name)) {
      this.requestQueues.set(name, new RequestQueue(name, {
        maxConcurrent: name === 'puter-ai' ? 10 : 5, // Puter AI can handle more
        maxQueueSize: 100,
        defaultTimeout: 30000,
        defaultMaxRetries: 3,
        initialBackoff: 1000,
        maxBackoff: 30000,
        backoffMultiplier: 2
      }));
    }

    this.errorCounts.set(name, 0);
    this.requestCounts.set(name, 0);
  }

  async executeAIRequest<T>(
    service: string,
    operation: () => Promise<T>,
    options: AIRequestOptions = {}
  ): Promise<T> {
    // Ensure service is registered
    if (!this.circuitBreakers.has(service)) {
      this.registerService(service);
    }

    const breaker = this.circuitBreakers.get(service)!;
    const queue = this.requestQueues.get(service)!;

    // Increment request count
    const currentCount = this.requestCounts.get(service) || 0;
    this.requestCounts.set(service, currentCount + 1);

    try {
      // Execute through circuit breaker and queue
      const result = await breaker.execute(
        () => queue.enqueue(operation, {
          priority: options.priority,
          maxRetries: options.maxRetries,
          timeout: options.timeout
        }),
        options.useFallback ? this.getFallbackOperation<T>(service) : undefined
      );

      return result;
    } catch (error: any) {
      // Track error
      const errorCount = this.errorCounts.get(service) || 0;
      this.errorCounts.set(service, errorCount + 1);

      // Enhance error with service info
      const enhancedError = new Error(
        `[${service}] ${error.message || 'Request failed'}`
      );
      (enhancedError as any).service = service;
      (enhancedError as any).circuitState = breaker.getStats().state;
      (enhancedError as any).originalError = error;

      throw enhancedError;
    }
  }

  private getFallbackOperation<T>(service: string): (() => Promise<T>) | undefined {
    // Define fallback behaviors for different services
    const fallbacks: Record<string, () => Promise<any>> = {
      'openai': async () => ({
        message: 'AI service temporarily unavailable. Using cached response.',
        cached: true
      }),
      'puter-ai': async () => ({
        message: 'Puter AI is currently busy. Please try again shortly.',
        retry: true
      }),
      'qdrant': async () => ({
        vectors: [],
        message: 'Vector search temporarily unavailable.'
      })
    };

    return fallbacks[service] as (() => Promise<T>) | undefined;
  }

  getServiceHealth(service: string): AIAPIHealth | null {
    const breaker = this.circuitBreakers.get(service);
    const queue = this.requestQueues.get(service);

    if (!breaker || !queue) {
      return null;
    }

    const stats = breaker.getStats();
    const queueStats = queue.getStats();
    const errorCount = this.errorCounts.get(service) || 0;
    const requestCount = this.requestCounts.get(service) || 0;

    return {
      service,
      healthy: stats.state === CircuitState.CLOSED,
      circuitState: stats.state,
      queueStats: {
        pending: queueStats.pending,
        processing: queueStats.processing,
        completed: queueStats.completed,
        failed: queueStats.failed
      },
      lastCheck: Date.now(),
      errorRate: requestCount > 0 ? errorCount / requestCount : 0
    };
  }

  getAllServiceHealth(): AIAPIHealth[] {
    const health: AIAPIHealth[] = [];
    
    for (const service of this.circuitBreakers.keys()) {
      const serviceHealth = this.getServiceHealth(service);
      if (serviceHealth) {
        health.push(serviceHealth);
      }
    }

    return health;
  }

  private updateHealthMetrics(): void {
    for (const service of this.circuitBreakers.keys()) {
      const health = this.getServiceHealth(service);
      if (health) {
        this.healthChecks.set(service, health);
        
        // Log unhealthy services
        if (!health.healthy) {
          console.warn(`[AIAPIManager] Service ${service} is unhealthy:`, {
            circuitState: health.circuitState,
            errorRate: (health.errorRate * 100).toFixed(1) + '%',
            queuePending: health.queueStats.pending
          });
        }
      }
    }
  }

  // Admin operations
  forceOpenCircuit(service: string): void {
    const breaker = this.circuitBreakers.get(service);
    if (breaker) {
      breaker.forceOpen();
      console.log(`[AIAPIManager] Forced circuit OPEN for ${service}`);
    }
  }

  forceCloseCircuit(service: string): void {
    const breaker = this.circuitBreakers.get(service);
    if (breaker) {
      breaker.forceClose();
      console.log(`[AIAPIManager] Forced circuit CLOSED for ${service}`);
    }
  }

  clearQueue(service: string): void {
    const queue = this.requestQueues.get(service);
    if (queue) {
      queue.clear();
      console.log(`[AIAPIManager] Cleared queue for ${service}`);
    }
  }

  resetMetrics(service: string): void {
    this.errorCounts.set(service, 0);
    this.requestCounts.set(service, 0);
    const breaker = this.circuitBreakers.get(service);
    if (breaker) {
      breaker.forceClear();
    }
    console.log(`[AIAPIManager] Reset metrics for ${service}`);
  }

  getCircuitBreakerStats(service: string) {
    const breaker = this.circuitBreakers.get(service);
    return breaker ? breaker.getStats() : null;
  }

  getQueueStats(service: string) {
    const queue = this.requestQueues.get(service);
    return queue ? queue.getStats() : null;
  }
}

// Singleton instance
export const aiAPIManager = new AIAPIManager();
