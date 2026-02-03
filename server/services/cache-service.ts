/**
 * CloudPilot AI Studio - Cache Service
 * Memory + Puter KV caching to reduce API costs
 * 
 * Phase 1: Security & Infrastructure
 */

export interface CacheEntry<T> {
  value: T;
  expiresAt: number;
  createdAt: number;
}

export interface CacheStats {
  hits: number;
  misses: number;
  size: number;
  hitRate: number;
}

export interface CacheConfig {
  maxMemoryItems: number;
  defaultTTLSeconds: number;
  persistToPuterKV: boolean;
  kvPrefix: string;
}

const defaultConfig: CacheConfig = {
  maxMemoryItems: 1000,
  defaultTTLSeconds: 3600, // 1 hour
  persistToPuterKV: true,
  kvPrefix: 'cache:'
};

class CacheService {
  private config: CacheConfig;
  private memoryCache: Map<string, CacheEntry<any>> = new Map();
  private stats: CacheStats = { hits: 0, misses: 0, size: 0, hitRate: 0 };
  private cleanupTimer: ReturnType<typeof setInterval> | null = null;

  constructor(config: Partial<CacheConfig> = {}) {
    this.config = { ...defaultConfig, ...config };
    
    // Periodic cleanup of expired entries
    this.cleanupTimer = setInterval(() => this.cleanupExpired(), 60000); // Every minute
  }
  
  /**
   * Cleanup resources - call when shutting down
   */
  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
    this.memoryCache.clear();
  }

  /**
   * Generate cache key from components
   */
  key(...parts: (string | number | boolean)[]): string {
    return parts.map(p => String(p)).join(':');
  }

  /**
   * Get value from cache (memory first, then Puter KV)
   */
  async get<T>(key: string): Promise<T | null> {
    // Check memory cache first
    const memEntry = this.memoryCache.get(key);
    if (memEntry) {
      if (Date.now() < memEntry.expiresAt) {
        this.stats.hits++;
        this.updateHitRate();
        return memEntry.value as T;
      } else {
        this.memoryCache.delete(key);
      }
    }

    // Check Puter KV if enabled
    if (this.config.persistToPuterKV) {
      try {
        if (typeof window !== 'undefined' && (window as any).puter) {
          const puter = (window as any).puter;
          const kvKey = this.config.kvPrefix + key;
          const kvEntry = await puter.kv.get(kvKey);
          
          if (kvEntry && Date.now() < kvEntry.expiresAt) {
            // Restore to memory cache
            this.setMemory(key, kvEntry.value, kvEntry.expiresAt - Date.now());
            this.stats.hits++;
            this.updateHitRate();
            return kvEntry.value as T;
          }
        }
      } catch (error) {
        console.error('[Cache] KV read error:', error);
      }
    }

    this.stats.misses++;
    this.updateHitRate();
    return null;
  }

  /**
   * Set value in cache (memory and optionally Puter KV)
   */
  async set<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    const ttl = ttlSeconds ?? this.config.defaultTTLSeconds;
    const expiresAt = Date.now() + (ttl * 1000);
    
    // Store in memory
    this.setMemory(key, value, ttl * 1000);
    
    // Store in Puter KV if enabled
    if (this.config.persistToPuterKV) {
      try {
        if (typeof window !== 'undefined' && (window as any).puter) {
          const puter = (window as any).puter;
          const kvKey = this.config.kvPrefix + key;
          
          const entry: CacheEntry<T> = {
            value,
            expiresAt,
            createdAt: Date.now()
          };
          
          await puter.kv.set(kvKey, entry);
          await puter.kv.expire(kvKey, ttl);
        }
      } catch (error) {
        console.error('[Cache] KV write error:', error);
      }
    }
  }

  /**
   * Set value in memory only
   */
  private setMemory<T>(key: string, value: T, ttlMs: number): void {
    // Evict oldest if at capacity
    if (this.memoryCache.size >= this.config.maxMemoryItems) {
      const oldestKey = this.memoryCache.keys().next().value;
      if (oldestKey) {
        this.memoryCache.delete(oldestKey);
      }
    }

    this.memoryCache.set(key, {
      value,
      expiresAt: Date.now() + ttlMs,
      createdAt: Date.now()
    });
    
    this.stats.size = this.memoryCache.size;
  }

  /**
   * Delete value from cache
   */
  async delete(key: string): Promise<void> {
    this.memoryCache.delete(key);
    
    if (this.config.persistToPuterKV) {
      try {
        if (typeof window !== 'undefined' && (window as any).puter) {
          const puter = (window as any).puter;
          const kvKey = this.config.kvPrefix + key;
          await puter.kv.del(kvKey);
        }
      } catch (error) {
        console.error('[Cache] KV delete error:', error);
      }
    }
    
    this.stats.size = this.memoryCache.size;
  }

  /**
   * Clear all cache entries
   */
  async clear(): Promise<void> {
    this.memoryCache.clear();
    this.stats = { hits: 0, misses: 0, size: 0, hitRate: 0 };
    
    // Note: Clearing all KV cache entries would require listing all keys
    // which is expensive. Consider implementing selective clear by prefix.
  }

  /**
   * Get or set pattern - fetch from cache or compute and store
   */
  async getOrSet<T>(
    key: string, 
    factory: () => Promise<T>, 
    ttlSeconds?: number
  ): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }
    
    const value = await factory();
    await this.set(key, value, ttlSeconds);
    return value;
  }

  /**
   * Cache AI model response
   * Uses prompt hash as key for deduplication
   */
  async cacheAIResponse(
    model: string,
    prompt: string,
    response: string,
    ttlSeconds: number = 86400 // 24 hours
  ): Promise<void> {
    const hash = this.hashString(prompt);
    const key = this.key('ai', model, hash);
    await this.set(key, { prompt, response, model }, ttlSeconds);
  }

  /**
   * Get cached AI response
   */
  async getAIResponse(model: string, prompt: string): Promise<string | null> {
    const hash = this.hashString(prompt);
    const key = this.key('ai', model, hash);
    const cached = await this.get<{ prompt: string; response: string; model: string }>(key);
    return cached?.response ?? null;
  }

  /**
   * Simple string hash for cache keys
   */
  private hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * Cleanup expired entries from memory
   */
  private cleanupExpired(): void {
    const now = Date.now();
    const entries = Array.from(this.memoryCache.entries());
    for (const [key, entry] of entries) {
      if (now >= entry.expiresAt) {
        this.memoryCache.delete(key);
      }
    }
    this.stats.size = this.memoryCache.size;
  }

  /**
   * Update hit rate statistic
   */
  private updateHitRate(): void {
    const total = this.stats.hits + this.stats.misses;
    this.stats.hitRate = total > 0 ? this.stats.hits / total : 0;
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    return { ...this.stats };
  }

  /**
   * Check if key exists in cache
   */
  async has(key: string): Promise<boolean> {
    const value = await this.get(key);
    return value !== null;
  }
}

// Singleton instance
export const cacheService = new CacheService();

// Named exports for different cache use cases
export const aiCache = new CacheService({
  kvPrefix: 'ai-cache:',
  defaultTTLSeconds: 86400 // 24 hours for AI responses
});

export const apiCache = new CacheService({
  kvPrefix: 'api-cache:',
  defaultTTLSeconds: 300 // 5 minutes for API responses
});

export default cacheService;
