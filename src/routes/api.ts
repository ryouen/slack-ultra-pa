import { Router } from 'express';
import oauthRoutes from './oauth';
import { healthCheckService } from '@/services/healthCheckService';
import { logger } from '@/utils/logger';

const router = Router();

// Basic health check
router.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Comprehensive health check
router.get('/health/detailed', async (req, res) => {
  try {
    const healthResult = await healthCheckService.performHealthCheck();
    
    const statusCode = healthResult.status === 'healthy' ? 200 : 
                      healthResult.status === 'degraded' ? 200 : 503;
    
    res.status(statusCode).json(healthResult);
  } catch (error) {
    logger.error('Health check endpoint failed', { error });
    res.status(500).json({
      status: 'unhealthy',
      message: 'Health check failed',
      timestamp: new Date().toISOString(),
    });
  }
});

// Readiness probe (for Kubernetes)
router.get('/ready', async (req, res) => {
  try {
    const healthResult = await healthCheckService.performHealthCheck();
    
    if (healthResult.status === 'unhealthy') {
      res.status(503).json({ ready: false, reason: 'System unhealthy' });
    } else {
      res.json({ ready: true, status: healthResult.status });
    }
  } catch (error) {
    logger.error('Readiness check failed', { error });
    res.status(503).json({ ready: false, reason: 'Health check failed' });
  }
});

// Liveness probe (for Kubernetes)
router.get('/live', (req, res) => {
  res.json({ 
    alive: true, 
    uptime: process.uptime(),
    timestamp: new Date().toISOString() 
  });
});

// OAuth routes
router.use('/oauth', oauthRoutes);

export default router;