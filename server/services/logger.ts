/**
 * CloudPilot AI Studio - Logger Service
 * Winston-based structured logging with Puter KV persistence
 * 
 * Phase 1: Security & Infrastructure
 */

import type { Request } from "express";

// Log levels in order of severity
export enum LogLevel {
  ERROR = 'error',
  WARN = 'warn',
  INFO = 'info',
  DEBUG = 'debug'
}

// Log entry structure
export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  service: string;
  message: string;
  requestId?: string;
  meta?: Record<string, any>;
}

// Shared AI log chat entry for cross-agent coordination
export interface AILogEntry extends LogEntry {
  agentId?: string;
  agentName?: string;
  taskId?: string;
  modelUsed?: string;
  tokensUsed?: number;
}

// Configuration options
export interface LoggerConfig {
  serviceName: string;
  level: LogLevel;
  persistToPuterKV: boolean;
  maxLogBuffer: number;
  flushIntervalMs: number;
}

// Default configuration
const defaultConfig: LoggerConfig = {
  serviceName: 'cloudpilot',
  level: LogLevel.INFO,
  persistToPuterKV: true,
  maxLogBuffer: 100,
  flushIntervalMs: 30000 // 30 seconds
};

class Logger {
  private config: LoggerConfig;
  private logBuffer: LogEntry[] = [];
  private aiLogBuffer: AILogEntry[] = [];
  private flushTimer: ReturnType<typeof setInterval> | null = null;
  private levelPriority: Record<LogLevel, number> = {
    [LogLevel.ERROR]: 0,
    [LogLevel.WARN]: 1,
    [LogLevel.INFO]: 2,
    [LogLevel.DEBUG]: 3
  };

  constructor(config: Partial<LoggerConfig> = {}) {
    this.config = { ...defaultConfig, ...config };
    
    // Always start flush timer for buffered logging (both Puter and server-side)
    this.startFlushTimer();
  }

  private shouldLog(level: LogLevel): boolean {
    return this.levelPriority[level] <= this.levelPriority[this.config.level];
  }

  private formatLog(level: LogLevel, message: string, meta?: Record<string, any>, requestId?: string): LogEntry {
    return {
      timestamp: new Date().toISOString(),
      level,
      service: this.config.serviceName,
      message,
      requestId,
      meta
    };
  }

  private writeToConsole(entry: LogEntry): void {
    const prefix = `[${entry.timestamp}] [${entry.level.toUpperCase()}] [${entry.service}]`;
    const reqId = entry.requestId ? ` [${entry.requestId}]` : '';
    const message = `${prefix}${reqId} ${entry.message}`;
    
    switch (entry.level) {
      case LogLevel.ERROR:
        console.error(message, entry.meta || '');
        break;
      case LogLevel.WARN:
        console.warn(message, entry.meta || '');
        break;
      case LogLevel.DEBUG:
        console.debug(message, entry.meta || '');
        break;
      default:
        console.log(message, entry.meta || '');
    }
  }

  private addToBuffer(entry: LogEntry): void {
    this.logBuffer.push(entry);
    
    if (this.logBuffer.length >= this.config.maxLogBuffer) {
      this.flush();
    }
  }

  private startFlushTimer(): void {
    if (this.flushTimer) return;
    
    this.flushTimer = setInterval(() => {
      this.flush();
    }, this.config.flushIntervalMs);
  }

  /**
   * Flush logs to Puter KV storage (browser) or local file (server)
   * This creates a time-series log structure for querying
   */
  async flush(): Promise<void> {
    if (this.logBuffer.length === 0) return;
    
    const logsToFlush = [...this.logBuffer];
    this.logBuffer = [];
    
    try {
      const today = new Date().toISOString().split('T')[0];
      
      // In browser context, use puter.kv
      if (typeof window !== 'undefined' && (window as any).puter) {
        const puter = (window as any).puter;
        const key = `logs:${this.config.serviceName}:${today}`;
        
        // Append to existing logs for today
        const existing = await puter.kv.get(key) || [];
        const combined = [...existing, ...logsToFlush];
        
        // Keep only last 1000 entries per day
        const trimmed = combined.slice(-1000);
        await puter.kv.set(key, trimmed);
        
        // Set 7-day expiration
        await puter.kv.expire(key, 7 * 24 * 60 * 60);
      } else {
        // Server-side: store in memory with rotation
        if (!this.serverLogStore) {
          this.serverLogStore = new Map();
        }
        const existing = this.serverLogStore.get(today) || [];
        const combined = [...existing, ...logsToFlush];
        const trimmed = combined.slice(-1000);
        this.serverLogStore.set(today, trimmed);
        
        // Clean old days (keep 7 days)
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - 7);
        const cutoffStr = cutoff.toISOString().split('T')[0];
        const keysToDelete = Array.from(this.serverLogStore.keys()).filter(k => k < cutoffStr);
        keysToDelete.forEach(k => this.serverLogStore.delete(k));
      }
    } catch (error) {
      console.error('[Logger] Failed to flush logs:', error);
      // Restore buffer on failure - prepend failed logs to retry on next flush
      // Don't truncate to ensure all logs are eventually persisted
      this.logBuffer = [...logsToFlush, ...this.logBuffer];
      
      // If buffer gets too large, write to console as fallback
      if (this.logBuffer.length > this.config.maxLogBuffer * 2) {
        console.warn('[Logger] Buffer overflow - writing oldest logs to console');
        const overflow = this.logBuffer.splice(0, this.config.maxLogBuffer);
        overflow.forEach(entry => console.log(JSON.stringify(entry)));
      }
    }
  }
  
  private serverLogStore: Map<string, LogEntry[]> | null = null;
  
  /**
   * Get logs for a specific date (server-side only)
   */
  getServerLogs(date?: string): LogEntry[] {
    const targetDate = date || new Date().toISOString().split('T')[0];
    return this.serverLogStore?.get(targetDate) || [];
  }

  /**
   * Log an error message
   */
  error(message: string, meta?: Record<string, any>, requestId?: string): void {
    if (!this.shouldLog(LogLevel.ERROR)) return;
    const entry = this.formatLog(LogLevel.ERROR, message, meta, requestId);
    this.writeToConsole(entry);
    this.addToBuffer(entry);
  }

  /**
   * Log a warning message
   */
  warn(message: string, meta?: Record<string, any>, requestId?: string): void {
    if (!this.shouldLog(LogLevel.WARN)) return;
    const entry = this.formatLog(LogLevel.WARN, message, meta, requestId);
    this.writeToConsole(entry);
    this.addToBuffer(entry);
  }

  /**
   * Log an info message
   */
  info(message: string, meta?: Record<string, any>, requestId?: string): void {
    if (!this.shouldLog(LogLevel.INFO)) return;
    const entry = this.formatLog(LogLevel.INFO, message, meta, requestId);
    this.writeToConsole(entry);
    this.addToBuffer(entry);
  }

  /**
   * Log a debug message
   */
  debug(message: string, meta?: Record<string, any>, requestId?: string): void {
    if (!this.shouldLog(LogLevel.DEBUG)) return;
    const entry = this.formatLog(LogLevel.DEBUG, message, meta, requestId);
    this.writeToConsole(entry);
    this.addToBuffer(entry);
  }

  /**
   * Log HTTP request
   */
  request(req: Request, statusCode: number, durationMs: number): void {
    const meta = {
      method: req.method,
      path: req.path,
      status: statusCode,
      duration: durationMs,
      userAgent: req.headers['user-agent']?.substring(0, 100),
      ip: req.ip
    };
    
    const level = statusCode >= 500 ? LogLevel.ERROR : 
                  statusCode >= 400 ? LogLevel.WARN : LogLevel.INFO;
    
    const message = `${req.method} ${req.path} ${statusCode} ${durationMs}ms`;
    
    if (this.shouldLog(level)) {
      const entry = this.formatLog(level, message, meta, req.requestId);
      this.writeToConsole(entry);
      this.addToBuffer(entry);
    }
  }

  /**
   * Log AI agent activity to shared chat
   * All agents can read/write to this for coordination
   */
  async logAIActivity(activity: Omit<AILogEntry, 'timestamp' | 'level' | 'service'>): Promise<void> {
    const entry: AILogEntry = {
      timestamp: new Date().toISOString(),
      level: LogLevel.INFO,
      service: 'ai-agents',
      ...activity
    };
    
    this.aiLogBuffer.push(entry);
    
    // Persist to shared AI log chat in Puter KV
    try {
      if (typeof window !== 'undefined' && (window as any).puter) {
        const puter = (window as any).puter;
        const key = 'ai:shared-log-chat';
        
        const existing = await puter.kv.get(key) || [];
        const combined = [...existing, entry];
        
        // Keep last 500 AI log entries
        const trimmed = combined.slice(-500);
        await puter.kv.set(key, trimmed);
      }
    } catch (error) {
      console.error('[Logger] Failed to log AI activity:', error);
    }
  }

  /**
   * Get recent AI activity for agent coordination
   */
  async getAIActivityLog(limit: number = 50): Promise<AILogEntry[]> {
    try {
      if (typeof window !== 'undefined' && (window as any).puter) {
        const puter = (window as any).puter;
        const logs = await puter.kv.get('ai:shared-log-chat') || [];
        return logs.slice(-limit);
      }
    } catch (error) {
      console.error('[Logger] Failed to get AI activity log:', error);
    }
    return [];
  }

  /**
   * Create child logger with additional context
   */
  child(context: Record<string, any>): ChildLogger {
    return new ChildLogger(this, context);
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
    this.flush();
  }
}

class ChildLogger {
  private parent: Logger;
  private context: Record<string, any>;

  constructor(parent: Logger, context: Record<string, any>) {
    this.parent = parent;
    this.context = context;
  }

  error(message: string, meta?: Record<string, any>, requestId?: string): void {
    this.parent.error(message, { ...this.context, ...meta }, requestId);
  }

  warn(message: string, meta?: Record<string, any>, requestId?: string): void {
    this.parent.warn(message, { ...this.context, ...meta }, requestId);
  }

  info(message: string, meta?: Record<string, any>, requestId?: string): void {
    this.parent.info(message, { ...this.context, ...meta }, requestId);
  }

  debug(message: string, meta?: Record<string, any>, requestId?: string): void {
    this.parent.debug(message, { ...this.context, ...meta }, requestId);
  }
}

// Singleton instance
export const logger = new Logger({
  serviceName: process.env.SERVICE_NAME || 'cloudpilot',
  level: (process.env.LOG_LEVEL as LogLevel) || LogLevel.INFO,
  persistToPuterKV: process.env.LOG_TO_PUTER_KV !== 'false'
});

// Express request logging middleware
export function requestLogger() {
  return (req: any, res: any, next: any) => {
    const start = Date.now();
    
    res.on('finish', () => {
      const duration = Date.now() - start;
      logger.request(req, res.statusCode, duration);
    });
    
    next();
  };
}

export default logger;
