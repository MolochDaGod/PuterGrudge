/**
 * CloudPilot AI Studio - Scheduler Service
 * Cron-like job scheduling with worker restart logic and error recovery
 * 
 * Phase 1: Security & Infrastructure
 */

import { logger } from './logger';

export interface ScheduledJob {
  id: string;
  name: string;
  schedule: string | number; // cron pattern or interval in ms
  handler: () => Promise<void>;
  enabled: boolean;
  lastRun?: Date;
  nextRun?: Date;
  runCount: number;
  errorCount: number;
  lastError?: string;
  maxRetries: number;
  retryDelayMs: number;
}

export interface JobConfig {
  name: string;
  schedule: string | number;
  handler: () => Promise<void>;
  enabled?: boolean;
  maxRetries?: number;
  retryDelayMs?: number;
}

export interface WorkerStatus {
  id: string;
  name: string;
  status: 'running' | 'stopped' | 'error' | 'restarting';
  startedAt?: Date;
  lastHeartbeat?: Date;
  restartCount: number;
  maxRestarts: number;
}

class SchedulerService {
  private jobs: Map<string, ScheduledJob> = new Map();
  private workers: Map<string, WorkerStatus> = new Map();
  private timers: Map<string, ReturnType<typeof setInterval>> = new Map();
  private running: boolean = false;

  constructor() {
    // Do NOT auto-start - call start() manually when ready
  }

  /**
   * Register a new scheduled job
   * Jobs are registered but timers only start when start() is called
   */
  registerJob(config: JobConfig): string {
    const id = `job-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const job: ScheduledJob = {
      id,
      name: config.name,
      schedule: config.schedule,
      handler: config.handler,
      enabled: config.enabled ?? true,
      runCount: 0,
      errorCount: 0,
      maxRetries: config.maxRetries ?? 3,
      retryDelayMs: config.retryDelayMs ?? 5000
    };
    
    this.jobs.set(id, job);
    
    // Only schedule if already running (deferred until start() is called)
    if (this.running && job.enabled) {
      this.scheduleJob(job);
    }
    
    logger.info(`Scheduled job registered: ${config.name}`, { jobId: id });
    return id;
  }

  /**
   * Schedule a job based on its configuration
   */
  private scheduleJob(job: ScheduledJob): void {
    // Clear existing timer if any
    const existingTimer = this.timers.get(job.id);
    if (existingTimer) {
      clearInterval(existingTimer);
    }
    
    // Handle interval scheduling (number in ms)
    if (typeof job.schedule === 'number') {
      job.nextRun = new Date(Date.now() + job.schedule);
      
      const timer = setInterval(async () => {
        await this.executeJob(job);
      }, job.schedule);
      
      this.timers.set(job.id, timer);
    }
    // Handle cron-like patterns (simplified)
    else if (typeof job.schedule === 'string') {
      const intervalMs = this.parseCronToInterval(job.schedule);
      job.nextRun = new Date(Date.now() + intervalMs);
      
      const timer = setInterval(async () => {
        await this.executeJob(job);
      }, intervalMs);
      
      this.timers.set(job.id, timer);
    }
  }

  /**
   * Parse simplified cron pattern to interval
   * Supports: @hourly, @daily, @weekly, or every N minutes style
   */
  private parseCronToInterval(pattern: string): number {
    const presets: Record<string, number> = {
      '@minutely': 60 * 1000,
      '@hourly': 60 * 60 * 1000,
      '@daily': 24 * 60 * 60 * 1000,
      '@weekly': 7 * 24 * 60 * 60 * 1000
    };
    
    if (presets[pattern]) {
      return presets[pattern];
    }
    
    // Parse "*/N * * * *" pattern (every N minutes)
    const match = pattern.match(/^\*\/(\d+)/);
    if (match) {
      const minutes = parseInt(match[1], 10);
      return minutes * 60 * 1000;
    }
    
    // Default to hourly
    return 60 * 60 * 1000;
  }

  /**
   * Execute a job with retry logic
   */
  private async executeJob(job: ScheduledJob, retryCount: number = 0): Promise<void> {
    if (!job.enabled) return;
    
    job.lastRun = new Date();
    
    try {
      await job.handler();
      job.runCount++;
      job.nextRun = new Date(Date.now() + (typeof job.schedule === 'number' ? job.schedule : this.parseCronToInterval(job.schedule)));
      
      logger.debug(`Job executed successfully: ${job.name}`, { 
        jobId: job.id, 
        runCount: job.runCount 
      });
    } catch (error) {
      job.errorCount++;
      job.lastError = error instanceof Error ? error.message : String(error);
      
      logger.error(`Job execution failed: ${job.name}`, { 
        jobId: job.id, 
        error: job.lastError,
        retryCount 
      });
      
      // Retry with exponential backoff
      if (retryCount < job.maxRetries) {
        const delay = job.retryDelayMs * Math.pow(2, retryCount);
        logger.info(`Retrying job ${job.name} in ${delay}ms`, { 
          jobId: job.id, 
          attempt: retryCount + 1 
        });
        
        setTimeout(() => {
          this.executeJob(job, retryCount + 1);
        }, delay);
      }
    }
  }

  /**
   * Register a worker for monitoring and auto-restart
   */
  registerWorker(id: string, name: string, maxRestarts: number = 5): void {
    this.workers.set(id, {
      id,
      name,
      status: 'stopped',
      restartCount: 0,
      maxRestarts
    });
    
    logger.info(`Worker registered: ${name}`, { workerId: id });
  }

  /**
   * Mark worker as started
   */
  workerStarted(id: string): void {
    const worker = this.workers.get(id);
    if (worker) {
      worker.status = 'running';
      worker.startedAt = new Date();
      worker.lastHeartbeat = new Date();
      
      logger.info(`Worker started: ${worker.name}`, { workerId: id });
    }
  }

  /**
   * Worker heartbeat to confirm it's alive
   */
  workerHeartbeat(id: string): void {
    const worker = this.workers.get(id);
    if (worker) {
      worker.lastHeartbeat = new Date();
    }
  }

  /**
   * Mark worker as stopped/crashed and attempt restart
   */
  async workerCrashed(id: string, error?: string): Promise<boolean> {
    const worker = this.workers.get(id);
    if (!worker) return false;
    
    worker.status = 'error';
    
    logger.error(`Worker crashed: ${worker.name}`, { 
      workerId: id, 
      error,
      restartCount: worker.restartCount 
    });
    
    // Check if we can restart
    if (worker.restartCount < worker.maxRestarts) {
      worker.status = 'restarting';
      worker.restartCount++;
      
      // Exponential backoff for restarts
      const delay = 1000 * Math.pow(2, worker.restartCount - 1);
      
      logger.info(`Restarting worker ${worker.name} in ${delay}ms`, { 
        workerId: id, 
        attempt: worker.restartCount 
      });
      
      return true; // Indicates restart should be attempted
    } else {
      logger.error(`Worker ${worker.name} exceeded max restarts`, { 
        workerId: id, 
        maxRestarts: worker.maxRestarts 
      });
      return false;
    }
  }

  /**
   * Get job by ID
   */
  getJob(id: string): ScheduledJob | undefined {
    return this.jobs.get(id);
  }

  /**
   * Get all jobs
   */
  getAllJobs(): ScheduledJob[] {
    return Array.from(this.jobs.values());
  }

  /**
   * Enable a job
   */
  enableJob(id: string): void {
    const job = this.jobs.get(id);
    if (job) {
      job.enabled = true;
      this.scheduleJob(job);
      logger.info(`Job enabled: ${job.name}`, { jobId: id });
    }
  }

  /**
   * Disable a job
   */
  disableJob(id: string): void {
    const job = this.jobs.get(id);
    if (job) {
      job.enabled = false;
      const timer = this.timers.get(id);
      if (timer) {
        clearInterval(timer);
        this.timers.delete(id);
      }
      logger.info(`Job disabled: ${job.name}`, { jobId: id });
    }
  }

  /**
   * Remove a job
   */
  removeJob(id: string): void {
    this.disableJob(id);
    this.jobs.delete(id);
  }

  /**
   * Get worker status
   */
  getWorkerStatus(id: string): WorkerStatus | undefined {
    return this.workers.get(id);
  }

  /**
   * Get all worker statuses
   */
  getAllWorkerStatuses(): WorkerStatus[] {
    return Array.from(this.workers.values());
  }

  /**
   * Start the scheduler
   */
  start(): void {
    if (this.running) return;
    this.running = true;
    
    // Re-schedule all enabled jobs
    const jobs = Array.from(this.jobs.values());
    for (const job of jobs) {
      if (job.enabled) {
        this.scheduleJob(job);
      }
    }
    
    logger.info('Scheduler started');
  }

  /**
   * Stop the scheduler
   */
  stop(): void {
    this.running = false;
    
    // Clear all timers
    const timers = Array.from(this.timers.values());
    for (const timer of timers) {
      clearInterval(timer);
    }
    this.timers.clear();
    
    logger.info('Scheduler stopped');
  }

  /**
   * Check worker health (call periodically)
   */
  checkWorkerHealth(timeoutMs: number = 60000): WorkerStatus[] {
    const unhealthyWorkers: WorkerStatus[] = [];
    const now = Date.now();
    
    const workers = Array.from(this.workers.values());
    for (const worker of workers) {
      if (worker.status === 'running' && worker.lastHeartbeat) {
        const timeSinceHeartbeat = now - worker.lastHeartbeat.getTime();
        if (timeSinceHeartbeat > timeoutMs) {
          worker.status = 'error';
          unhealthyWorkers.push(worker);
          
          logger.warn(`Worker unresponsive: ${worker.name}`, {
            workerId: worker.id,
            lastHeartbeat: worker.lastHeartbeat
          });
        }
      }
    }
    
    return unhealthyWorkers;
  }
}

// Factory function to create scheduler with optional auto-start
export function createScheduler(autoStart: boolean = false): SchedulerService {
  const sched = new SchedulerService();
  
  // Register health check job
  sched.registerJob({
    name: 'health-check',
    schedule: '@minutely',
    handler: async () => {
      const unhealthy = sched.checkWorkerHealth();
      if (unhealthy.length > 0) {
        logger.warn(`${unhealthy.length} workers unhealthy`);
      }
    }
  });
  
  if (autoStart) {
    sched.start();
  }
  
  return sched;
}

// Singleton instance - NOT auto-started, call scheduler.start() manually
export const scheduler = createScheduler(false);

export default scheduler;
