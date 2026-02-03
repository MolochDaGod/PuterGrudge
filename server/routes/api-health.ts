import { Router, Request, Response } from 'express';
import { aiAPIManager } from '../services/ai-api-manager';
import { requireAuth, requireRole } from '../middleware';
import { createApiResponse, createApiError, ERROR_CODES } from '@shared/schema';

const router = Router();

/**
 * GET /api/health/status
 * Get overall API health status
 */
router.get('/status', (req: Request, res: Response) => {
  try {
    const allServices = aiAPIManager.getAllServiceHealth();
    const healthyServices = allServices.filter(s => s.healthy).length;
    const totalServices = allServices.length;
    
    const overallHealth = healthyServices === totalServices ? 'healthy' : 
                         healthyServices > 0 ? 'degraded' : 'unhealthy';

    res.json(createApiResponse({
      status: overallHealth,
      services: allServices,
      summary: {
        total: totalServices,
        healthy: healthyServices,
        unhealthy: totalServices - healthyServices
      },
      timestamp: Date.now()
    }, req.requestId));
  } catch (error: any) {
    res.status(500).json(createApiError(
      ERROR_CODES.INTERNAL_ERROR,
      'Failed to retrieve health status',
      undefined,
      req.requestId
    ));
  }
});

/**
 * GET /api/health/service/:serviceName
 * Get detailed health for a specific service
 */
router.get('/service/:serviceName', (req: Request, res: Response) => {
  try {
    const { serviceName } = req.params;
    const health = aiAPIManager.getServiceHealth(serviceName);

    if (!health) {
      return res.status(404).json(createApiError(
        ERROR_CODES.NOT_FOUND,
        `Service '${serviceName}' not found`,
        undefined,
        req.requestId
      ));
    }

    const circuitStats = aiAPIManager.getCircuitBreakerStats(serviceName);
    const queueStats = aiAPIManager.getQueueStats(serviceName);

    res.json(createApiResponse({
      ...health,
      circuitBreaker: circuitStats,
      queue: queueStats
    }, req.requestId));
  } catch (error: any) {
    res.status(500).json(createApiError(
      ERROR_CODES.INTERNAL_ERROR,
      'Failed to retrieve service health',
      undefined,
      req.requestId
    ));
  }
});

/**
 * POST /api/health/service/:serviceName/circuit/open
 * Force open circuit breaker (admin only)
 */
router.post('/service/:serviceName/circuit/open', requireAuth, requireRole('admin'), (req: Request, res: Response) => {
  try {
    const { serviceName } = req.params;
    aiAPIManager.forceOpenCircuit(serviceName);

    res.json(createApiResponse({
      message: `Circuit breaker opened for ${serviceName}`,
      service: serviceName,
      action: 'open'
    }, req.requestId));
  } catch (error: any) {
    res.status(500).json(createApiError(
      ERROR_CODES.INTERNAL_ERROR,
      'Failed to open circuit',
      undefined,
      req.requestId
    ));
  }
});

/**
 * POST /api/health/service/:serviceName/circuit/close
 * Force close circuit breaker (admin only)
 */
router.post('/service/:serviceName/circuit/close', requireAuth, requireRole('admin'), (req: Request, res: Response) => {
  try {
    const { serviceName } = req.params;
    aiAPIManager.forceCloseCircuit(serviceName);

    res.json(createApiResponse({
      message: `Circuit breaker closed for ${serviceName}`,
      service: serviceName,
      action: 'close'
    }, req.requestId));
  } catch (error: any) {
    res.status(500).json(createApiError(
      ERROR_CODES.INTERNAL_ERROR,
      'Failed to close circuit',
      undefined,
      req.requestId
    ));
  }
});

/**
 * POST /api/health/service/:serviceName/queue/clear
 * Clear request queue (admin only)
 */
router.post('/service/:serviceName/queue/clear', requireAuth, requireRole('admin'), (req: Request, res: Response) => {
  try {
    const { serviceName } = req.params;
    aiAPIManager.clearQueue(serviceName);

    res.json(createApiResponse({
      message: `Queue cleared for ${serviceName}`,
      service: serviceName,
      action: 'clear'
    }, req.requestId));
  } catch (error: any) {
    res.status(500).json(createApiError(
      ERROR_CODES.INTERNAL_ERROR,
      'Failed to clear queue',
      undefined,
      req.requestId
    ));
  }
});

/**
 * POST /api/health/service/:serviceName/metrics/reset
 * Reset metrics (admin only)
 */
router.post('/service/:serviceName/metrics/reset', requireAuth, requireRole('admin'), (req: Request, res: Response) => {
  try {
    const { serviceName } = req.params;
    aiAPIManager.resetMetrics(serviceName);

    res.json(createApiResponse({
      message: `Metrics reset for ${serviceName}`,
      service: serviceName,
      action: 'reset'
    }, req.requestId));
  } catch (error: any) {
    res.status(500).json(createApiError(
      ERROR_CODES.INTERNAL_ERROR,
      'Failed to reset metrics',
      undefined,
      req.requestId
    ));
  }
});

/**
 * GET /api/health/metrics
 * Get aggregated metrics for all services
 */
router.get('/metrics', (req: Request, res: Response) => {
  try {
    const services = aiAPIManager.getAllServiceHealth();
    
    const metrics = services.map(service => ({
      service: service.service,
      healthy: service.healthy,
      errorRate: service.errorRate,
      circuitState: service.circuitState,
      queuePending: service.queueStats.pending,
      queueProcessing: service.queueStats.processing,
      completedRequests: service.queueStats.completed,
      failedRequests: service.queueStats.failed
    }));

    res.json(createApiResponse({
      metrics,
      timestamp: Date.now()
    }, req.requestId));
  } catch (error: any) {
    res.status(500).json(createApiError(
      ERROR_CODES.INTERNAL_ERROR,
      'Failed to retrieve metrics',
      undefined,
      req.requestId
    ));
  }
});

export default router;
