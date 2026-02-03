# AI Evolution System - Deployment Checklist ✅

## Pre-Deployment

### 1. Dependencies
- [x] Core packages installed (`ioredis`, `winston`, `@qdrant/js-client-rest`)
- [ ] Optional: Install additional AI packages (see below)
- [ ] Verify `package.json` includes all dependencies

### 2. Environment Variables
```env
# Required (defaults work for local development)
NODE_ENV=production

# Optional: OpenAI for embeddings (fallback available)
OPENAI_API_KEY=sk-...

# Optional: Qdrant (defaults to localhost:6333)
QDRANT_URL=http://localhost:6333
QDRANT_API_KEY=

# Optional: Redis (defaults to localhost:6379)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
```

### 3. External Services

**Redis (Recommended)**
```bash
# Docker
docker run -d -p 6379:6379 redis:alpine

# Or use cloud Redis (Upstash, Redis Cloud, etc.)
```

**Qdrant (Optional)**
```bash
# Docker
docker run -d -p 6333:6333 qdrant/qdrant

# Or use Qdrant Cloud
```

## Installation Steps

### 1. Install Additional AI Packages (Optional)
```bash
npm install \
  langchain \
  @langchain/openai \
  @langchain/anthropic \
  @langchain/community \
  llamaindex \
  openai \
  anthropic \
  @anthropic-ai/sdk \
  cohere-ai \
  tiktoken \
  gpt-tokenizer \
  ai \
  @ai-sdk/openai \
  @ai-sdk/anthropic \
  @vercel/ai \
  zod-to-json-schema \
  nanoid \
  eventsource-parser \
  p-queue \
  p-retry
```

### 2. Build the Project
```bash
npm run build
```

### 3. Test Locally
```bash
npm run dev
```

Visit:
- Main app: `http://localhost:5000`
- Metrics: `http://localhost:5000/api/ai/telemetry/metrics`
- Prometheus: `http://localhost:5000/api/ai/telemetry/prometheus`

## Integration Checklist

### Frontend Integration

**1. Add Smart Suggestions to App**
```tsx
// In your main App.tsx or layout component
import { SmartSuggestions } from '@/components/ai/SmartSuggestions';

function App() {
  return (
    <>
      <YourApp />
      <SmartSuggestions />
    </>
  );
}
```

**2. Add AI Evolution Dashboard**
```tsx
// In admin or monitoring page
import { AIEvolutionDashboard } from '@/components/ai/AIEvolutionDashboard';

function AdminPage() {
  return <AIEvolutionDashboard />;
}
```

**3. Use the Hook**
```tsx
import { useAIEvolution } from '@/hooks/useAIEvolution';

function MyComponent() {
  const {
    metrics,
    predictions,
    recordInteraction,
    storeMemory,
    searchMemory,
    speak,
  } = useAIEvolution();
  
  // Use the features!
}
```

### Backend Integration

**1. Verify Routes are Mounted**
Check `server/routes.ts` includes:
```typescript
import aiEvolutionRoutes from "./routes/ai-evolution";
app.use('/api/ai', aiEvolutionRoutes);
```

**2. Test Endpoints**
```bash
# Metrics
curl http://localhost:5000/api/ai/telemetry/metrics

# Improvements
curl http://localhost:5000/api/ai/evolution/improvements

# Agents
curl http://localhost:5000/api/ai/orchestrator/agents
```

## Production Deployment

### 1. Environment Setup
- [ ] Set `NODE_ENV=production`
- [ ] Configure Redis connection
- [ ] Configure Qdrant (if using)
- [ ] Set OpenAI API key (if using embeddings)

### 2. Performance Tuning
```typescript
// Adjust cache TTL in unified-memory.ts
await this.redis.setex(key, 7200, value); // 2 hours instead of 1

// Adjust evolution cycle in ai-evolution-engine.ts
setInterval(() => this.evolve(), 7200000); // 2 hours instead of 1
```

### 3. Monitoring Setup

**Prometheus Integration**
```yaml
# prometheus.yml
scrape_configs:
  - job_name: 'puter-monitor-ai'
    static_configs:
      - targets: ['localhost:5000']
    metrics_path: '/api/ai/telemetry/prometheus'
    scrape_interval: 15s
```

**Grafana Dashboard**
- Import metrics from Prometheus
- Create panels for latency, cache hit rate, tokens used
- Set up alerts for high error rates

### 4. Security
- [ ] Rate limit AI endpoints
- [ ] Validate all inputs
- [ ] Sanitize user data before storing
- [ ] Use HTTPS in production
- [ ] Rotate API keys regularly

## Testing

### Unit Tests
```bash
# Add tests for services
npm test
```

### Integration Tests
```bash
# Test API endpoints
curl -X POST http://localhost:5000/api/ai/memory/store \
  -H "Content-Type: application/json" \
  -d '{"content":"test","metadata":{},"type":"conversation"}'
```

### Load Testing
```bash
# Use Apache Bench or similar
ab -n 1000 -c 10 http://localhost:5000/api/ai/telemetry/metrics
```

## Post-Deployment

### 1. Monitor Metrics
- Check `/api/ai/telemetry/metrics` regularly
- Watch for high latency or error rates
- Monitor cache hit rate (target: >60%)

### 2. Review Improvements
- Check `/api/ai/evolution/improvements` daily
- Apply suggested optimizations
- Track performance gains

### 3. User Feedback
- Encourage users to provide feedback on AI responses
- Monitor prediction accuracy
- Adjust confidence thresholds as needed

## Rollback Plan

If issues occur:

1. **Disable AI Evolution**
```typescript
// In ai-evolution-engine.ts
constructor() {
  // Comment out:
  // this.startEvolutionCycle();
}
```

2. **Disable Predictions**
```typescript
// In predictive-ux.ts
constructor() {
  // Comment out:
  // this.startPatternAnalysis();
}
```

3. **Fall back to basic AI**
- System automatically falls back if Redis/Qdrant unavailable
- Embeddings use fallback if OpenAI unavailable

## Success Metrics

Track these KPIs:
- **Cache Hit Rate**: Target >60%
- **Average Latency**: Target <1000ms
- **Error Rate**: Target <5%
- **User Satisfaction**: Track feedback ratio
- **Cost Savings**: Monitor token usage reduction

## Support

For issues:
1. Check logs: `tail -f logs/app.log`
2. Review metrics: `/api/ai/telemetry/metrics`
3. Check service health: `/api/health`
4. Consult `AI_EVOLUTION_GUIDE.md`

## 🎉 You're Ready to Deploy!

All systems are go. The AI will start learning and improving from day one! 🚀

