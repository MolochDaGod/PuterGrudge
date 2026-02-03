import { QdrantClient } from '@qdrant/js-client-rest';

export interface QdrantConfig {
  url?: string;
  apiKey?: string;
}

export interface VectorPoint {
  id: string | number;
  vector: number[];
  payload?: Record<string, any>;
}

export interface SearchResult {
  id: string | number;
  score: number;
  payload?: Record<string, any>;
}

class QdrantService {
  private client: QdrantClient | null = null;
  private isConnected = false;

  async connect(config: QdrantConfig = {}): Promise<boolean> {
    try {
      const url = config.url || import.meta.env.VITE_QDRANT_URL || 'http://localhost:6333';
      
      this.client = new QdrantClient({
        url,
        apiKey: config.apiKey || import.meta.env.VITE_QDRANT_API_KEY,
      });

      const collections = await this.client.getCollections();
      this.isConnected = true;
      console.log('[Qdrant] Connected, collections:', collections.collections.length);
      return true;
    } catch (error) {
      console.warn('[Qdrant] Connection failed, running in offline mode:', error);
      this.isConnected = false;
      return false;
    }
  }

  get connected(): boolean {
    return this.isConnected;
  }

  async createCollection(name: string, vectorSize: number = 384, distance: 'Cosine' | 'Euclid' | 'Dot' = 'Cosine'): Promise<boolean> {
    if (!this.client) return false;
    
    try {
      const exists = await this.collectionExists(name);
      if (exists) return true;

      await this.client.createCollection(name, {
        vectors: { size: vectorSize, distance },
      });
      return true;
    } catch (error) {
      console.error('[Qdrant] Create collection failed:', error);
      return false;
    }
  }

  async collectionExists(name: string): Promise<boolean> {
    if (!this.client) return false;
    
    try {
      await this.client.getCollection(name);
      return true;
    } catch {
      return false;
    }
  }

  async listCollections(): Promise<string[]> {
    if (!this.client) return [];
    
    try {
      const result = await this.client.getCollections();
      return result.collections.map(c => c.name);
    } catch {
      return [];
    }
  }

  async upsert(collection: string, points: VectorPoint[]): Promise<boolean> {
    if (!this.client) return false;
    
    try {
      await this.client.upsert(collection, {
        points: points.map(p => ({
          id: p.id,
          vector: p.vector,
          payload: p.payload || {},
        })),
      });
      return true;
    } catch (error) {
      console.error('[Qdrant] Upsert failed:', error);
      return false;
    }
  }

  async search(collection: string, vector: number[], limit: number = 5, filter?: Record<string, any>): Promise<SearchResult[]> {
    if (!this.client) return [];
    
    try {
      const results = await this.client.search(collection, {
        vector,
        limit,
        with_payload: true,
        filter,
      });

      return results.map(r => ({
        id: r.id,
        score: r.score,
        payload: r.payload as Record<string, any>,
      }));
    } catch (error) {
      console.error('[Qdrant] Search failed:', error);
      return [];
    }
  }

  async delete(collection: string, ids: (string | number)[]): Promise<boolean> {
    if (!this.client) return false;
    
    try {
      await this.client.delete(collection, {
        points: ids,
      });
      return true;
    } catch (error) {
      console.error('[Qdrant] Delete failed:', error);
      return false;
    }
  }

  async getCollectionInfo(name: string): Promise<{ vectorCount: number; dimensions: number } | null> {
    if (!this.client) return null;
    
    try {
      const info = await this.client.getCollection(name);
      let dimensions = 0;
      const vectors = info.config?.params?.vectors;
      if (vectors && typeof vectors === 'object' && 'size' in vectors && typeof vectors.size === 'number') {
        dimensions = vectors.size;
      }
      return {
        vectorCount: info.points_count || 0,
        dimensions,
      };
    } catch {
      return null;
    }
  }
}

export const qdrantService = new QdrantService();
