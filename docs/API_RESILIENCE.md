# API Resilience & Error Management

## Overview

This system implements comprehensive API resilience patterns to prevent 503 errors and API spam. It includes circuit breakers, request queuing, retry logic, and health monitoring.

## Architecture

### Components

1. **Circuit Breaker** (`server/lib/circuit-breaker.ts`)
   - Prevents cascading failures
   - Three states: CLOSED, OPEN, HALF_OPEN
   - Automatically opens after failure threshold
   - Attempts recovery through HALF_OPEN state

2. **Request Queue** (`server/lib/request-queue.ts`)
   - Manages concurrent requests with priority
   - Implements exponential backoff for retries
   - Configurable timeouts and retry limits
   - Queue size limits to prevent memory issues

3. **AI API Manager** (`server/services/ai-api-manager.ts`)
   - Centralized API management
   - Per-service circuit breakers and queues
   - Health monitoring and metrics tracking
   - Fallback strategies

4. **API Client** (`client/lib/api-client.ts`)
   - Frontend retry logic
   - Exponential backoff
   - Request timeout management
   - Automatic error handling

## API Endpoints

### Health Monitoring

#### GET /api/health/status
Get overall system health.

**Response:**
```json
{
  "success": true,
  "data": {
    "status": "healthy" | "degraded" | "unhealthy",
    "services": [...],
    "summary": {
      "total": 3,
      "healthy": 3,
      "unhealthy": 0
    }
  }
}
```

#### GET /api/health/service/:serviceName
Get detailed health for a specific service.

**Response:**
```json
{
  "success": true,
  "data": {
    "service": "openai",
    "healthy": true,
    "circuitState": "CLOSED",
    "queueStats": {
      "pending": 0,
      "processing": 1,
      "completed": 150,
      "failed": 5
    },
    "errorRate": 0.032,
    "circuitBreaker": {...},
    "queue": {...}
  }
}
```

#### GET /api/health/metrics
Get aggregated metrics for all services.

### Admin Operations (Requires Admin Role)

#### POST /api/health/service/:serviceName/circuit/open
Force open a circuit breaker.

#### POST /api/health/service/:serviceName/circuit/close
Force close a circuit breaker.

#### POST /api/health/service/:serviceName/queue/clear
Clear pending requests from queue.

#### POST /api/health/service/:serviceName/metrics/reset
Reset metrics for a service.

## Configuration

### Circuit Breaker Config

```typescript
{
  failureThreshold: 5,        // Failures before opening
  successThreshold: 2,         // Successes to close from half-open
  timeout: 60000,              // Time before trying half-open (ms)
  monitoringPeriod: 120000,    // Failure tracking window (ms)
  volumeThreshold: 10          // Min requests before circuit can open
}
```

### Request Queue Config

```typescript
{
  maxConcurrent: 5,            // Max parallel requests
  maxQueueSize: 100,           // Max queued requests
  defaultTimeout: 30000,       // Request timeout (ms)
  defaultMaxRetries: 3,        // Max retry attempts
  initialBackoff: 1000,        // Initial backoff (ms)
  maxBackoff: 30000,           // Max backoff (ms)
  backoffMultiplier: 2         // Backoff multiplier
}
```

## Usage Examples

### Backend: Using AI API Manager

```typescript
import { aiAPIManager } from './services/ai-api-manager';

// Execute AI request with resilience
const result = await aiAPIManager.executeAIRequest(
  'openai',
  async () => {
    // Your API call here
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${API_KEY}` },
      body: JSON.stringify({ ... })
    });
    return response.json();
  },
  {
    priority: 10,      // Higher priority (1-10)
    maxRetries: 3,     // Override default retries
    timeout: 45000,    // Override default timeout
    useFallback: true  // Enable fallback response
  }
);
```

### Frontend: Using API Client

```typescript
import { aiAPI, APIError } from './lib/api-client';

try {
  const response = await aiAPI.chat(sessionId, 'Hello!');
  console.log(response);
} catch (error) {
  if (error instanceof APIError) {
    if (error.status === 503) {
      // Service temporarily unavailable
      showNotification('AI service is busy. Retrying...');
    } else if (error.status === 429) {
      // Rate limited
      showNotification('Too many requests. Please wait.');
    } else {
      showError(error.message);
    }
  }
}
```

## Error Codes

### Standard HTTP Status Codes
- `400` - Bad Request (validation failed)
- `401` - Unauthorized (no auth token)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `408` - Request Timeout
- `429` - Too Many Requests (rate limited)
- `500` - Internal Server Error
- `502` - Bad Gateway
- `503` - Service Unavailable (circuit open)
- `504` - Gateway Timeout

### Custom Error Codes
- `VALIDATION_ERROR` - Request validation failed
- `UNAUTHORIZED` - Authentication required
- `FORBIDDEN` - Insufficient permissions
- `NOT_FOUND` - Resource not found
- `BAD_REQUEST` - Invalid request
- `INTERNAL_ERROR` - Server error
- `SERVICE_UNAVAILABLE` - Service unavailable
- `NETWORK_ERROR` - Network connectivity issue

## Retry Strategy

### Retryable Errors
Automatic retries occur for:
- 408 (Timeout)
- 429 (Rate Limit)
- 500 (Internal Server Error)
- 502 (Bad Gateway)
- 503 (Service Unavailable)
- 504 (Gateway Timeout)
- Network errors

### Exponential Backoff
```
Attempt 1: Wait 1s
Attempt 2: Wait 2s
Attempt 3: Wait 4s
Attempt 4: Wait 8s
...
Max: Wait 30s
```

## Best Practices

### 1. Set Appropriate Timeouts
```typescript
// Short timeout for health checks
await apiClient.get('/health', { timeout: 5000 });

// Longer timeout for AI operations
await apiClient.post('/ai/chat', data, { timeout: 60000 });
```

### 2. Use Priority for Critical Requests
```typescript
await aiAPIManager.executeAIRequest('service', operation, {
  priority: 10 // Higher priority processed first
});
```

### 3. Handle Errors Gracefully
```typescript
try {
  const result = await aiAPI.sendMessage(sessionId, message);
  return result;
} catch (error) {
  if (error instanceof APIError && error.status === 503) {
    // Provide fallback or queue for later
    return { cached: true, message: 'Using cached response' };
  }
  throw error;
}
```

### 4. Monitor Health
```typescript
// Check service health before critical operations
const health = await aiAPI.getServiceHealth('openai');
if (!health.healthy) {
  // Use alternative service or show warning
}
```

### 5. Implement Circuit Breaker Monitoring
```typescript
// Admin dashboard should display circuit breaker status
const status = await apiClient.get('/health/status');
status.services.forEach(service => {
  if (service.circuitState === 'OPEN') {
    alert(`Service ${service.service} is down`);
  }
});
```

## Monitoring & Debugging

### View Service Health
```bash
curl https://your-api.vercel.app/api/health/status
```

### View Specific Service
```bash
curl https://your-api.vercel.app/api/health/service/openai
```

### Force Circuit Open (Admin)
```bash
curl -X POST https://your-api.vercel.app/api/health/service/openai/circuit/open \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

### Reset Metrics (Admin)
```bash
curl -X POST https://your-api.vercel.app/api/health/service/openai/metrics/reset \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

## Troubleshooting

### Circuit Breaker Stuck Open
1. Check service logs for underlying issue
2. Verify service is actually recovered
3. Manually close circuit via admin endpoint
4. Reset metrics to clear historical data

### Queue Filling Up
1. Check if service is slow or down
2. Increase `maxConcurrent` if service can handle it
3. Reduce `maxQueueSize` to fail fast
4. Clear queue if requests are stale

### High Error Rates
1. Check `/api/health/metrics` for patterns
2. Review circuit breaker stats
3. Investigate specific failed requests
4. Adjust retry and timeout settings

## Performance Impact

### Memory Usage
- Circuit breaker: ~1KB per service
- Request queue: ~100-500KB per service (depends on queue size)
- Total overhead: <5MB for typical setup

### Latency
- Circuit breaker check: <1ms
- Queue enqueue: <1ms
- Retry overhead: Varies by backoff strategy
- Overall: Minimal impact on successful requests

## Migration Guide

### Updating Existing Code

**Before:**
```typescript
const response = await fetch('/api/ai/chat', {
  method: 'POST',
  body: JSON.stringify(data)
});
```

**After:**
```typescript
import { aiAPI } from './lib/api-client';

const response = await aiAPI.chat(sessionId, message);
```

This automatically includes retry logic, timeout management, and error handling.
