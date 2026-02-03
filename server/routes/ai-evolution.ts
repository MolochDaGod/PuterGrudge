/**
 * AI Evolution API Routes
 * Exposes AI evolution, telemetry, and orchestration endpoints
 */

import { Router } from 'express';
import { aiEvolutionEngine } from '../services/ai-evolution-engine';
import { telemetryService } from '../services/telemetry-service';
import { aiOrchestrator } from '../services/ai-orchestrator';
import { unifiedMemory } from '../services/unified-memory';
import { embeddingService } from '../services/embedding-service';

const router = Router();

// ============================================================================
// TELEMETRY ENDPOINTS
// ============================================================================

router.get('/telemetry/metrics', (req, res) => {
  const metrics = telemetryService.getMetrics();
  res.json(metrics);
});

router.get('/telemetry/events', (req, res) => {
  const { type, limit = 100 } = req.query;
  const events = telemetryService.getEvents(
    type as any,
    parseInt(limit as string)
  );
  res.json(events);
});

router.get('/telemetry/prometheus', (req, res) => {
  const metrics = telemetryService.exportPrometheusMetrics();
  res.set('Content-Type', 'text/plain');
  res.send(metrics);
});

router.post('/telemetry/track', (req, res) => {
  const { type, data, userId, sessionId } = req.body;
  telemetryService.track({ type, data, userId, sessionId });
  res.json({ success: true });
});

// ============================================================================
// AI ORCHESTRATION ENDPOINTS
// ============================================================================

router.post('/orchestrator/execute', async (req, res) => {
  try {
    const task = req.body;
    const result = await aiOrchestrator.executeTask(task);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/orchestrator/agents', (req, res) => {
  const agents = aiOrchestrator.getAgentStats();
  res.json(agents);
});

// ============================================================================
// AI EVOLUTION ENDPOINTS
// ============================================================================

router.post('/evolution/record', async (req, res) => {
  try {
    await aiEvolutionEngine.recordInteraction(req.body);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/evolution/improvements', (req, res) => {
  const improvements = aiEvolutionEngine.getImprovements();
  res.json(improvements);
});

router.get('/evolution/stats', (req, res) => {
  const stats = aiEvolutionEngine.getStats();
  res.json(stats);
});

// ============================================================================
// MEMORY ENDPOINTS
// ============================================================================

router.post('/memory/store', async (req, res) => {
  try {
    const { content, metadata, type } = req.body;
    
    // Generate embedding
    const embedding = await embeddingService.generateEmbedding(content);
    
    await unifiedMemory.store({
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      content,
      metadata,
      embedding,
      timestamp: new Date(),
      type,
    });
    
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/memory/search', async (req, res) => {
  try {
    const { query, type, limit = 10 } = req.body;
    
    // Generate query embedding
    const queryEmbedding = await embeddingService.generateEmbedding(query);
    
    const results = await unifiedMemory.search(queryEmbedding, type, limit);
    res.json(results);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/memory/cache/:key', async (req, res) => {
  const { key } = req.params;
  const value = await unifiedMemory.cacheGet(key);
  res.json({ value });
});

router.post('/memory/cache/:key', async (req, res) => {
  const { key } = req.params;
  const { value, ttl = 3600 } = req.body;
  await unifiedMemory.cacheSet(key, value, ttl);
  res.json({ success: true });
});

// ============================================================================
// EMBEDDING ENDPOINTS
// ============================================================================

router.post('/embeddings/generate', async (req, res) => {
  try {
    const { text, model } = req.body;
    const embedding = await embeddingService.generateEmbedding(text, { model });
    res.json({ embedding });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/embeddings/similarity', async (req, res) => {
  try {
    const { query, candidates, topK = 5 } = req.body;
    const results = await embeddingService.findSimilar(query, candidates, topK);
    res.json(results);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;

