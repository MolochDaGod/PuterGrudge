# API Resilience System - Quick Setup

## 🎯 What This Solves

Prevents **503 Service Unavailable** errors and API spam by implementing:
- ✅ Circuit breakers to stop cascading failures
- ✅ Request queuing with priority
- ✅ Automatic retry with exponential backoff
- ✅ Health monitoring and metrics
- ✅ Rate limiting and timeout management

## 🚀 Quick Start

### 1. Backend Setup

The system is already configured and ready to use. Key files:

```
server/
├── lib/
│   ├── circuit-breaker.ts       # Circuit breaker implementation
│   └── request-queue.ts         # Request queue with retry logic
├── services/
│   ├── ai-api-manager.ts        # Centralized API management
│   └── ai-service.ts            # Updated to use API manager
└── routes/
    └── api-health.ts            # Health monitoring endpoints
```

### 2. Frontend Setup

Use the new API client instead of direct fetch calls:

```typescript
// Old way (DON'T do this)
const response = await fetch('/api/ai-worker/message', {
  method: 'POST',
  body: JSON.stringify(data)
});

// New way (DO this)
import { aiAPI } from './lib/api-client';
const response = await aiAPI.sendMessage(sessionId, data);
```

### 3. Environment Variables

Add to your `.env.production`:

```bash
# API Resilience Configuration
CIRCUIT_BREAKER_ENABLED=true
MAX_CONCURRENT_REQUESTS=5
REQUEST_QUEUE_SIZE=100
DEFAULT_REQUEST_TIMEOUT=30000
```

## 📊 Monitoring

### Check Overall Health
```bash
curl https://your-app.vercel.app/api/health/status
```

### Check Specific Service
```bash
curl https://your-app.vercel.app/api/health/service/openai
```

### View Metrics
```bash
curl https://your-app.vercel.app/api/health/metrics
```

## 🔧 Configuration

### Per-Service Configuration

Edit `server/services/ai-api-manager.ts`:

```typescript
this.registerService('openai', {
  failureThreshold: 5,      // Open circuit after 5 failures
  successThreshold: 2,       // Close after 2 successes
  timeout: 60000,            // 60s timeout
  volumeThreshold: 10        // Min 10 requests before opening
});
```

### Queue Configuration

Edit `server/lib/request-queue.ts`:

```typescript
{
  maxConcurrent: 5,          // 5 parallel requests
  maxQueueSize: 100,         // Queue up to 100 requests
  defaultTimeout: 30000,     // 30s timeout
  defaultMaxRetries: 3,      // Retry 3 times
  initialBackoff: 1000,      // Start with 1s delay
  maxBackoff: 30000,         // Max 30s delay
  backoffMultiplier: 2       // Double delay each retry
}
```

## 🎯 Usage Examples

### Backend: Wrap API Calls

```typescript
import { aiAPIManager } from './services/ai-api-manager';

router.post('/api/ai-worker/message', async (req, res) => {
  try {
    const result = await aiAPIManager.executeAIRequest(
      'puter-ai',
      async () => {
        // Your API call here
        return await someAIService.process(req.body);
      },
      {
        priority: 8,           // Higher priority (1-10)
        maxRetries: 3,         // Override retries
        useFallback: true      // Use fallback on failure
      }
    );
    
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

### Frontend: Use API Client

```typescript
import { aiAPI, APIError } from './lib/api-client';

async function sendAIMessage(sessionId: string, content: string) {
  try {
    const response = await aiAPI.chat(sessionId, content);
    return response;
  } catch (error) {
    if (error instanceof APIError) {
      if (error.status === 503) {
        // Circuit breaker open - show friendly message
        showNotification('AI is temporarily busy. We\'ll retry automatically.');
      } else if (error.status === 429) {
        showNotification('Slow down! Too many requests.');
      } else {
        showError(`Error: ${error.message}`);
      }
    }
    throw error;
  }
}
```

## 🛠️ Admin Operations

### Force Open Circuit (Emergency)
```bash
curl -X POST https://your-app.vercel.app/api/health/service/openai/circuit/open \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

### Force Close Circuit
```bash
curl -X POST https://your-app.vercel.app/api/health/service/openai/circuit/close \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

### Clear Queue
```bash
curl -X POST https://your-app.vercel.app/api/health/service/openai/queue/clear \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

### Reset Metrics
```bash
curl -X POST https://your-app.vercel.app/api/health/service/openai/metrics/reset \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

## 📈 Metrics to Monitor

Key metrics available at `/api/health/metrics`:

- **Error Rate**: Percentage of failed requests
- **Circuit State**: CLOSED (good), OPEN (bad), HALF_OPEN (testing)
- **Queue Depth**: Number of pending requests
- **Completed/Failed**: Request success/failure counts
- **Average Wait Time**: Time requests spend in queue
- **Average Processing Time**: Request execution time

## 🚨 Troubleshooting

### Problem: Circuit Breaker Won't Close

**Symptoms**: Service shows as "unhealthy" even though it's working

**Solution**:
1. Check actual service health
2. Review error logs
3. Manually close circuit if confirmed healthy
4. Reset metrics to clear history

### Problem: Requests Timing Out

**Symptoms**: 408 errors or "Request timeout"

**Solution**:
1. Increase timeout for specific operations
2. Check if service is actually slow
3. Review queue depth - might be backed up

### Problem: Queue Filling Up

**Symptoms**: "Queue is full" errors

**Solution**:
1. Check if service is down
2. Clear queue if requests are stale
3. Increase `maxConcurrent` if service can handle it
4. Reduce `maxQueueSize` to fail faster

## 📚 Documentation

For detailed documentation, see `docs/API_RESILIENCE.md`

## 🎉 Benefits

- **No more 503 spam**: Circuit breaker stops retry storms
- **Automatic recovery**: System self-heals when service recovers
- **Better UX**: Graceful degradation with fallbacks
- **Visibility**: Health endpoints show system status
- **Performance**: Queue prevents overload
- **Reliability**: Exponential backoff prevents thundering herd

## 📝 Next Steps

1. Update frontend code to use `aiAPI` from `client/lib/api-client.ts`
2. Add health monitoring dashboard (optional)
3. Configure alerts for circuit breaker state changes
4. Set up metrics visualization (Grafana, Datadog, etc.)
5. Tune configuration based on actual traffic patterns
