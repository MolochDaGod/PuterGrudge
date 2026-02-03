/**
 * Embedding Service
 * Generates embeddings for semantic search and memory storage
 */

import { logger } from './logger';

export interface EmbeddingOptions {
  model?: 'text-embedding-3-small' | 'text-embedding-3-large' | 'text-embedding-ada-002';
  dimensions?: number;
}

class EmbeddingService {
  private apiKey: string | undefined;
  private baseUrl = 'https://api.openai.com/v1';
  private cache = new Map<string, number[]>();

  constructor() {
    this.apiKey = process.env.OPENAI_API_KEY;
  }

  /**
   * Generate embedding for text
   */
  async generateEmbedding(text: string, options: EmbeddingOptions = {}): Promise<number[]> {
    // Check cache first
    const cacheKey = `${text}:${options.model || 'default'}`;
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }

    if (!this.apiKey) {
      logger.warn('[EmbeddingService] No API key, using fallback');
      return this.generateFallbackEmbedding(text);
    }

    try {
      const model = options.model || 'text-embedding-3-small';
      
      const response = await fetch(`${this.baseUrl}/embeddings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model,
          input: text,
          dimensions: options.dimensions,
        }),
      });

      if (!response.ok) {
        throw new Error(`Embedding API error: ${response.statusText}`);
      }

      const data = await response.json();
      const embedding = data.data[0].embedding;

      // Cache the result
      this.cache.set(cacheKey, embedding);

      // Limit cache size
      if (this.cache.size > 1000) {
        const firstKey = this.cache.keys().next().value;
        this.cache.delete(firstKey);
      }

      return embedding;
    } catch (error) {
      logger.error('[EmbeddingService] Error generating embedding:', error);
      return this.generateFallbackEmbedding(text);
    }
  }

  /**
   * Generate embeddings for multiple texts in batch
   */
  async generateBatchEmbeddings(texts: string[], options: EmbeddingOptions = {}): Promise<number[][]> {
    if (!this.apiKey) {
      return texts.map(text => this.generateFallbackEmbedding(text));
    }

    try {
      const model = options.model || 'text-embedding-3-small';
      
      const response = await fetch(`${this.baseUrl}/embeddings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model,
          input: texts,
          dimensions: options.dimensions,
        }),
      });

      if (!response.ok) {
        throw new Error(`Embedding API error: ${response.statusText}`);
      }

      const data = await response.json();
      return data.data.map((item: any) => item.embedding);
    } catch (error) {
      logger.error('[EmbeddingService] Error generating batch embeddings:', error);
      return texts.map(text => this.generateFallbackEmbedding(text));
    }
  }

  /**
   * Simple fallback embedding using character-based hashing
   * Not semantically meaningful but better than nothing
   */
  private generateFallbackEmbedding(text: string): number[] {
    const dimensions = 1536; // Match OpenAI embedding size
    const embedding = new Array(dimensions).fill(0);
    
    // Simple hash-based embedding
    for (let i = 0; i < text.length; i++) {
      const charCode = text.charCodeAt(i);
      const index = (charCode * i) % dimensions;
      embedding[index] += charCode / 1000;
    }

    // Normalize
    const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
    return embedding.map(val => val / (magnitude || 1));
  }

  /**
   * Calculate cosine similarity between two embeddings
   */
  cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) {
      throw new Error('Embeddings must have the same dimensions');
    }

    let dotProduct = 0;
    let magnitudeA = 0;
    let magnitudeB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      magnitudeA += a[i] * a[i];
      magnitudeB += b[i] * b[i];
    }

    magnitudeA = Math.sqrt(magnitudeA);
    magnitudeB = Math.sqrt(magnitudeB);

    if (magnitudeA === 0 || magnitudeB === 0) {
      return 0;
    }

    return dotProduct / (magnitudeA * magnitudeB);
  }

  /**
   * Find most similar texts from a list
   */
  async findSimilar(
    query: string,
    candidates: string[],
    topK: number = 5
  ): Promise<Array<{ text: string; score: number; index: number }>> {
    const queryEmbedding = await this.generateEmbedding(query);
    const candidateEmbeddings = await this.generateBatchEmbeddings(candidates);

    const similarities = candidateEmbeddings.map((embedding, index) => ({
      text: candidates[index],
      score: this.cosineSimilarity(queryEmbedding, embedding),
      index,
    }));

    similarities.sort((a, b) => b.score - a.score);
    return similarities.slice(0, topK);
  }

  clearCache() {
    this.cache.clear();
  }
}

export const embeddingService = new EmbeddingService();

