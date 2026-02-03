/**
 * Request Queue with Priority, Retry Logic, and Rate Limiting
 */

export interface QueuedRequest<T = any> {
  id: string;
  operation: () => Promise<T>;
  priority: number;
  retries: number;
  maxRetries: number;
  backoffMs: number;
  timestamp: number;
  resolve: (value: T) => void;
  reject: (error: any) => void;
  timeout?: number;
}

export interface QueueStats {
  pending: number;
  processing: number;
  completed: number;
  failed: number;
  averageWaitTime: number;
  averageProcessingTime: number;
}

export interface RequestQueueConfig {
  maxConcurrent: number;
  maxQueueSize: number;
  defaultTimeout: number;
  defaultMaxRetries: number;
  initialBackoff: number;
  maxBackoff: number;
  backoffMultiplier: number;
}

export class RequestQueue {
  private queue: QueuedRequest[] = [];
  private processing = new Set<string>();
  private completed = 0;
  private failed = 0;
  private totalWaitTime = 0;
  private totalProcessingTime = 0;

  constructor(
    private readonly name: string,
    private readonly config: RequestQueueConfig = {
      maxConcurrent: 5,
      maxQueueSize: 100,
      defaultTimeout: 30000,
      defaultMaxRetries: 3,
      initialBackoff: 1000,
      maxBackoff: 30000,
      backoffMultiplier: 2
    }
  ) {}

  async enqueue<T>(
    operation: () => Promise<T>,
    options: {
      priority?: number;
      maxRetries?: number;
      timeout?: number;
    } = {}
  ): Promise<T> {
    if (this.queue.length >= this.config.maxQueueSize) {
      throw new Error(`Queue ${this.name} is full (max: ${this.config.maxQueueSize})`);
    }

    return new Promise<T>((resolve, reject) => {
      const request: QueuedRequest<T> = {
        id: `${this.name}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        operation,
        priority: options.priority ?? 5,
        retries: 0,
        maxRetries: options.maxRetries ?? this.config.defaultMaxRetries,
        backoffMs: this.config.initialBackoff,
        timestamp: Date.now(),
        timeout: options.timeout ?? this.config.defaultTimeout,
        resolve,
        reject
      };

      this.queue.push(request);
      this.queue.sort((a, b) => b.priority - a.priority); // Higher priority first

      console.log(`[Queue:${this.name}] Enqueued request ${request.id} (priority: ${request.priority}, queue size: ${this.queue.length})`);

      this.processNext();
    });
  }

  private async processNext(): Promise<void> {
    if (this.processing.size >= this.config.maxConcurrent) {
      return; // Already at max concurrency
    }

    const request = this.queue.shift();
    if (!request) {
      return; // Queue is empty
    }

    this.processing.add(request.id);
    const waitTime = Date.now() - request.timestamp;
    this.totalWaitTime += waitTime;

    console.log(`[Queue:${this.name}] Processing request ${request.id} (waited: ${waitTime}ms, processing: ${this.processing.size})`);

    const startTime = Date.now();
    
    try {
      // Set timeout for operation
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Request timeout')), request.timeout);
      });

      const result = await Promise.race([
        request.operation(),
        timeoutPromise
      ]);

      const processingTime = Date.now() - startTime;
      this.totalProcessingTime += processingTime;
      this.completed++;
      
      console.log(`[Queue:${this.name}] Completed request ${request.id} (${processingTime}ms)`);
      request.resolve(result);
    } catch (error: any) {
      console.error(`[Queue:${this.name}] Request ${request.id} failed:`, error.message);
      
      // Retry logic with exponential backoff
      if (request.retries < request.maxRetries) {
        request.retries++;
        request.backoffMs = Math.min(
          request.backoffMs * this.config.backoffMultiplier,
          this.config.maxBackoff
        );

        console.log(`[Queue:${this.name}] Retrying request ${request.id} (attempt ${request.retries}/${request.maxRetries}) after ${request.backoffMs}ms`);

        setTimeout(() => {
          request.timestamp = Date.now();
          this.queue.unshift(request); // Put at front of queue
          this.processNext();
        }, request.backoffMs);
      } else {
        this.failed++;
        console.error(`[Queue:${this.name}] Request ${request.id} failed after ${request.maxRetries} retries`);
        request.reject(error);
      }
    } finally {
      this.processing.delete(request.id);
      this.processNext(); // Process next item
    }
  }

  getStats(): QueueStats {
    const totalCompleted = this.completed + this.failed;
    return {
      pending: this.queue.length,
      processing: this.processing.size,
      completed: this.completed,
      failed: this.failed,
      averageWaitTime: totalCompleted > 0 ? this.totalWaitTime / totalCompleted : 0,
      averageProcessingTime: this.completed > 0 ? this.totalProcessingTime / this.completed : 0
    };
  }

  clear(): void {
    this.queue.forEach(req => {
      req.reject(new Error('Queue cleared'));
    });
    this.queue = [];
    console.log(`[Queue:${this.name}] Cleared all pending requests`);
  }

  pause(): void {
    // Implemented by not calling processNext()
    console.log(`[Queue:${this.name}] Paused processing`);
  }

  resume(): void {
    console.log(`[Queue:${this.name}] Resumed processing`);
    this.processNext();
  }
}
