/**
 * Unified Memory System
 * Combines vector, graph, relational, and cache storage for optimal AI memory
 */

import { QdrantClient } from '@qdrant/js-client-rest';
import Redis from 'ioredis';
import { db } from '../db';
import { logger } from './logger';

export interface MemoryEntry {
  id: string;
  content: string;
  metadata: Record<string, any>;
  embedding?: number[];
  timestamp: Date;
  type: 'conversation' | 'code' | 'error' | 'solution' | 'context';
}

export interface SearchResult {
  id: string;
  content: string;
  score: number;
  metadata: Record<string, any>;
}

class UnifiedMemorySystem {
  private qdrant: QdrantClient | null = null;
  private redis: Redis | null = null;
  private initialized = false;

  constructor() {
    this.initialize();
  }

  private async initialize() {
    try {
      // Initialize Qdrant (Vector DB)
      const qdrantUrl = process.env.QDRANT_URL || 'http://localhost:6333';
      this.qdrant = new QdrantClient({
        url: qdrantUrl,
        apiKey: process.env.QDRANT_API_KEY,
      });

      // Initialize Redis (Cache)
      this.redis = new Redis({
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
        password: process.env.REDIS_PASSWORD,
        retryStrategy: (times) => Math.min(times * 50, 2000),
      });

      // Create collections if they don't exist
      await this.ensureCollections();

      this.initialized = true;
      logger.info('[UnifiedMemory] Initialized successfully');
    } catch (error) {
      logger.error('[UnifiedMemory] Initialization failed:', error);
      this.initialized = false;
    }
  }

  private async ensureCollections() {
    if (!this.qdrant) return;

    const collections = ['conversations', 'code_snippets', 'errors', 'solutions', 'context'];
    
    for (const name of collections) {
      try {
        await this.qdrant.getCollection(name);
      } catch {
        await this.qdrant.createCollection(name, {
          vectors: {
            size: 1536, // OpenAI embedding size
            distance: 'Cosine',
          },
        });
        logger.info(`[UnifiedMemory] Created collection: ${name}`);
      }
    }
  }

  // ============================================================================
  // SHORT-TERM MEMORY (Redis Cache)
  // ============================================================================

  async cacheSet(key: string, value: any, ttl: number = 3600): Promise<void> {
    if (!this.redis) return;
    try {
      await this.redis.setex(key, ttl, JSON.stringify(value));
    } catch (error) {
      logger.error('[UnifiedMemory] Cache set error:', error);
    }
  }

  async cacheGet<T = any>(key: string): Promise<T | null> {
    if (!this.redis) return null;
    try {
      const data = await this.redis.get(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      logger.error('[UnifiedMemory] Cache get error:', error);
      return null;
    }
  }

  async cacheDelete(key: string): Promise<void> {
    if (!this.redis) return;
    try {
      await this.redis.del(key);
    } catch (error) {
      logger.error('[UnifiedMemory] Cache delete error:', error);
    }
  }

  // ============================================================================
  // LONG-TERM MEMORY (Vector DB)
  // ============================================================================

  async store(entry: MemoryEntry): Promise<void> {
    if (!this.qdrant || !entry.embedding) return;

    try {
      const collection = this.getCollectionName(entry.type);
      
      await this.qdrant.upsert(collection, {
        points: [{
          id: entry.id,
          vector: entry.embedding,
          payload: {
            content: entry.content,
            metadata: entry.metadata,
            timestamp: entry.timestamp.toISOString(),
            type: entry.type,
          },
        }],
      });

      logger.debug(`[UnifiedMemory] Stored ${entry.type}: ${entry.id}`);
    } catch (error) {
      logger.error('[UnifiedMemory] Store error:', error);
    }
  }

  async search(query: number[], type?: MemoryEntry['type'], limit: number = 10): Promise<SearchResult[]> {
    if (!this.qdrant) return [];

    try {
      const collection = type ? this.getCollectionName(type) : 'conversations';
      
      const results = await this.qdrant.search(collection, {
        vector: query,
        limit,
      });

      return results.map(r => ({
        id: String(r.id),
        content: r.payload?.content as string,
        score: r.score,
        metadata: r.payload?.metadata as Record<string, any>,
      }));
    } catch (error) {
      logger.error('[UnifiedMemory] Search error:', error);
      return [];
    }
  }

  private getCollectionName(type: MemoryEntry['type']): string {
    const map: Record<MemoryEntry['type'], string> = {
      conversation: 'conversations',
      code: 'code_snippets',
      error: 'errors',
      solution: 'solutions',
      context: 'context',
    };
    return map[type] || 'conversations';
  }
}

export const unifiedMemory = new UnifiedMemorySystem();

