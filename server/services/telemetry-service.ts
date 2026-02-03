/**
 * Telemetry & Observability Service
 * Tracks AI performance, user interactions, and system health
 */

import { logger } from './logger';

export interface TelemetryEvent {
  type: 'ai_request' | 'ai_response' | 'user_action' | 'error' | 'performance' | 'cache_hit' | 'cache_miss';
  timestamp: Date;
  data: Record<string, any>;
  userId?: string;
  sessionId?: string;
}

export interface PerformanceMetrics {
  aiRequests: number;
  aiLatencyAvg: number;
  aiLatencyP95: number;
  aiLatencyP99: number;
  cacheHitRate: number;
  errorRate: number;
  tokensUsed: number;
  costEstimate: number;
}

class TelemetryService {
  private events: TelemetryEvent[] = [];
  private maxEvents = 10000;
  private latencies: number[] = [];
  private cacheHits = 0;
  private cacheMisses = 0;
  private errors = 0;
  private totalRequests = 0;
  private totalTokens = 0;

  /**
   * Track an event
   */
  track(event: Omit<TelemetryEvent, 'timestamp'>): void {
    const fullEvent: TelemetryEvent = {
      ...event,
      timestamp: new Date(),
    };

    this.events.push(fullEvent);

    // Update metrics
    this.updateMetrics(fullEvent);

    // Trim old events
    if (this.events.length > this.maxEvents) {
      this.events = this.events.slice(-this.maxEvents);
    }

    // Log important events
    if (event.type === 'error') {
      logger.error('[Telemetry] Error event:', event.data);
    }
  }

  private updateMetrics(event: TelemetryEvent): void {
    switch (event.type) {
      case 'ai_request':
        this.totalRequests++;
        break;
      
      case 'ai_response':
        if (event.data.latency) {
          this.latencies.push(event.data.latency);
          // Keep only last 1000 latencies
          if (this.latencies.length > 1000) {
            this.latencies.shift();
          }
        }
        if (event.data.tokensUsed) {
          this.totalTokens += event.data.tokensUsed;
        }
        break;
      
      case 'cache_hit':
        this.cacheHits++;
        break;
      
      case 'cache_miss':
        this.cacheMisses++;
        break;
      
      case 'error':
        this.errors++;
        break;
    }
  }

  /**
   * Get current performance metrics
   */
  getMetrics(): PerformanceMetrics {
    const sortedLatencies = [...this.latencies].sort((a, b) => a - b);
    const p95Index = Math.floor(sortedLatencies.length * 0.95);
    const p99Index = Math.floor(sortedLatencies.length * 0.99);

    const avgLatency = sortedLatencies.length > 0
      ? sortedLatencies.reduce((sum, val) => sum + val, 0) / sortedLatencies.length
      : 0;

    const totalCacheRequests = this.cacheHits + this.cacheMisses;
    const cacheHitRate = totalCacheRequests > 0
      ? this.cacheHits / totalCacheRequests
      : 0;

    const errorRate = this.totalRequests > 0
      ? this.errors / this.totalRequests
      : 0;

    // Rough cost estimate (OpenAI pricing)
    const costEstimate = (this.totalTokens / 1000) * 0.002; // $0.002 per 1K tokens

    return {
      aiRequests: this.totalRequests,
      aiLatencyAvg: Math.round(avgLatency),
      aiLatencyP95: sortedLatencies[p95Index] || 0,
      aiLatencyP99: sortedLatencies[p99Index] || 0,
      cacheHitRate: Math.round(cacheHitRate * 100) / 100,
      errorRate: Math.round(errorRate * 100) / 100,
      tokensUsed: this.totalTokens,
      costEstimate: Math.round(costEstimate * 100) / 100,
    };
  }

  /**
   * Get events by type
   */
  getEvents(type?: TelemetryEvent['type'], limit: number = 100): TelemetryEvent[] {
    let filtered = this.events;
    
    if (type) {
      filtered = filtered.filter(e => e.type === type);
    }

    return filtered.slice(-limit);
  }

  /**
   * Get events for a specific user
   */
  getUserEvents(userId: string, limit: number = 100): TelemetryEvent[] {
    return this.events
      .filter(e => e.userId === userId)
      .slice(-limit);
  }

  /**
   * Get events for a specific session
   */
  getSessionEvents(sessionId: string): TelemetryEvent[] {
    return this.events.filter(e => e.sessionId === sessionId);
  }

  /**
   * Export metrics for external monitoring (Prometheus format)
   */
  exportPrometheusMetrics(): string {
    const metrics = this.getMetrics();
    
    return `
# HELP ai_requests_total Total number of AI requests
# TYPE ai_requests_total counter
ai_requests_total ${metrics.aiRequests}

# HELP ai_latency_avg Average AI response latency in milliseconds
# TYPE ai_latency_avg gauge
ai_latency_avg ${metrics.aiLatencyAvg}

# HELP ai_latency_p95 95th percentile AI response latency in milliseconds
# TYPE ai_latency_p95 gauge
ai_latency_p95 ${metrics.aiLatencyP95}

# HELP ai_latency_p99 99th percentile AI response latency in milliseconds
# TYPE ai_latency_p99 gauge
ai_latency_p99 ${metrics.aiLatencyP99}

# HELP cache_hit_rate Cache hit rate (0-1)
# TYPE cache_hit_rate gauge
cache_hit_rate ${metrics.cacheHitRate}

# HELP error_rate Error rate (0-1)
# TYPE error_rate gauge
error_rate ${metrics.errorRate}

# HELP tokens_used_total Total tokens used
# TYPE tokens_used_total counter
tokens_used_total ${metrics.tokensUsed}

# HELP cost_estimate_usd Estimated cost in USD
# TYPE cost_estimate_usd gauge
cost_estimate_usd ${metrics.costEstimate}
`.trim();
  }

  /**
   * Clear all telemetry data
   */
  clear(): void {
    this.events = [];
    this.latencies = [];
    this.cacheHits = 0;
    this.cacheMisses = 0;
    this.errors = 0;
    this.totalRequests = 0;
    this.totalTokens = 0;
  }
}

export const telemetryService = new TelemetryService();

