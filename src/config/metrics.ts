import { register, collectDefaultMetrics, Counter, Histogram, Gauge } from 'prom-client';
import express from 'express';
import { config } from '@/config/environment';
import { logger } from '@/utils/logger';

// Collect default Node.js metrics
collectDefaultMetrics({ register });

// Custom metrics
export const slackRequestsTotal = new Counter({
  name: 'slack_requests_total',
  help: 'Total number of Slack requests processed',
  labelNames: ['command', 'status'],
});

export const slackRequestDuration = new Histogram({
  name: 'slack_request_duration_seconds',
  help: 'Duration of Slack request processing in seconds',
  labelNames: ['command'],
  buckets: [0.1, 0.5, 1, 2, 5, 10],
});

export const taskOperationsTotal = new Counter({
  name: 'task_operations_total',
  help: 'Total number of task operations',
  labelNames: ['operation', 'status'],
});

export const activeTasksGauge = new Gauge({
  name: 'active_tasks_total',
  help: 'Current number of active tasks',
});

export const jobQueueSize = new Gauge({
  name: 'job_queue_size',
  help: 'Current size of job queues',
  labelNames: ['queue_name'],
});

export const externalApiRequestsTotal = new Counter({
  name: 'external_api_requests_total',
  help: 'Total number of external API requests',
  labelNames: ['provider', 'endpoint', 'status'],
});

export const externalApiRequestDuration = new Histogram({
  name: 'external_api_request_duration_seconds',
  help: 'Duration of external API requests in seconds',
  labelNames: ['provider', 'endpoint'],
  buckets: [0.1, 0.5, 1, 2, 5, 10, 30],
});

// Job Queue Metrics
export const jobQueueJobsTotal = new Counter({
  name: 'job_queue_jobs_total',
  help: 'Total number of jobs processed',
  labelNames: ['job_type', 'status'],
});

export const jobQueueJobDuration = new Histogram({
  name: 'job_queue_job_duration_seconds',
  help: 'Duration of job processing in seconds',
  labelNames: ['job_type'],
  buckets: [0.1, 0.5, 1, 5, 10, 30, 60, 300],
});

export const jobQueueActiveJobs = new Gauge({
  name: 'job_queue_active_jobs',
  help: 'Current number of active jobs',
  labelNames: ['job_type'],
});

export const jobQueueWaitingJobs = new Gauge({
  name: 'job_queue_waiting_jobs',
  help: 'Current number of waiting jobs',
  labelNames: ['job_type'],
});

export const jobQueueFailedJobs = new Gauge({
  name: 'job_queue_failed_jobs',
  help: 'Current number of failed jobs',
  labelNames: ['job_type'],
});

// OAuth Metrics
export const oauthTokenOperations = new Counter({
  name: 'oauth_token_operations_total',
  help: 'Total number of OAuth token operations',
  labelNames: ['provider', 'operation', 'status'],
});

export const oauthTokenRefreshDuration = new Histogram({
  name: 'oauth_token_refresh_duration_seconds',
  help: 'Duration of OAuth token refresh operations',
  labelNames: ['provider'],
  buckets: [0.1, 0.5, 1, 2, 5, 10],
});

// System Health Metrics
export const systemHealthStatus = new Gauge({
  name: 'system_health_status',
  help: 'System health status (1 = healthy, 0 = unhealthy)',
  labelNames: ['component'],
});

export const databaseConnectionStatus = new Gauge({
  name: 'database_connection_status',
  help: 'Database connection status (1 = connected, 0 = disconnected)',
});

export const redisConnectionStatus = new Gauge({
  name: 'redis_connection_status',
  help: 'Redis connection status (1 = connected, 0 = disconnected)',
});

/**
 * Initialize metrics collection and HTTP endpoint
 */
export function initializeMetrics(): void {
  // Skip metrics server if port is 0
  if (config.observability.metricsPort === 0) {
    logger.info('Metrics server disabled (port set to 0)');
    return;
  }

  const metricsApp = express();

  // Metrics endpoint
  metricsApp.get('/metrics', async (req, res) => {
    try {
      res.set('Content-Type', register.contentType);
      res.end(await register.metrics());
    } catch (error) {
      logger.error('Error generating metrics:', error);
      res.status(500).end('Error generating metrics');
    }
  });

  // Health check endpoint
  metricsApp.get('/health', (req, res) => {
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    });
  });

  const metricsServer = metricsApp.listen(config.observability.metricsPort, () => {
    logger.info(`Metrics server running on port ${config.observability.metricsPort}`);
  });

  metricsServer.on('error', (error: any) => {
    if (error.code === 'EADDRINUSE') {
      logger.warn(`Metrics port ${config.observability.metricsPort} is already in use, trying next port`);
      const nextPort = config.observability.metricsPort + 1;
      metricsApp.listen(nextPort, () => {
        logger.info(`Metrics server running on port ${nextPort}`);
      });
    } else {
      logger.error('Metrics server error:', error);
    }
  });
}