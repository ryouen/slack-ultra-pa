import { register, Counter, Histogram, Gauge } from 'prom-client';
import { logger } from '@/utils/logger';

/**
 * Worker job metrics for monitoring
 */

// Job completion counter
export const jobCompletedCounter = new Counter({
  name: 'bull_jobs_completed_total',
  help: 'Total number of completed jobs',
  labelNames: ['queue', 'job_type'],
  registers: [register]
});

// Job failure counter with reason
export const jobFailedCounter = new Counter({
  name: 'bull_jobs_failed_total',
  help: 'Total number of failed jobs',
  labelNames: ['queue', 'job_type', 'reason'],
  registers: [register]
});

// Job processing duration
export const jobDurationHistogram = new Histogram({
  name: 'bull_job_duration_seconds',
  help: 'Job processing duration in seconds',
  labelNames: ['queue', 'job_type'],
  buckets: [0.1, 0.5, 1, 2, 5, 10, 30, 60],
  registers: [register]
});

// Queue depth gauge
export const queueDepthGauge = new Gauge({
  name: 'bull_queue_depth',
  help: 'Number of jobs waiting in queue',
  labelNames: ['queue', 'status'],
  registers: [register]
});

// API latency for Slack calls
export const slackApiLatencyHistogram = new Histogram({
  name: 'slack_api_latency_seconds',
  help: 'Slack API call latency in seconds',
  labelNames: ['method', 'status'],
  buckets: [0.05, 0.1, 0.2, 0.5, 1, 2, 5],
  registers: [register]
});

// Invalid auth error counter
export const invalidAuthCounter = new Counter({
  name: 'slack_invalid_auth_errors_total',
  help: 'Total number of invalid_auth errors',
  labelNames: ['team_id', 'operation'],
  registers: [register]
});

/**
 * Track job completion with metrics
 */
export function trackJobCompletion(queue: string, jobType: string, duration: number): void {
  jobCompletedCounter.inc({ queue, job_type: jobType });
  jobDurationHistogram.observe({ queue, job_type: jobType }, duration);
}

/**
 * Track job failure with reason
 */
export function trackJobFailure(queue: string, jobType: string, reason: string): void {
  jobFailedCounter.inc({ queue, job_type: jobType, reason });
  
  // Special handling for invalid_auth errors
  if (reason.includes('invalid_auth')) {
    logger.error('Invalid auth error detected in job', { queue, jobType, reason });
    // Extract team_id if available
    const teamMatch = reason.match(/team[_\s]?id[:\s]+([A-Z0-9]+)/i);
    const teamId = teamMatch ? teamMatch[1] : 'unknown';
    invalidAuthCounter.inc({ team_id: teamId, operation: jobType });
  }
}

/**
 * Track Slack API call latency
 */
export function trackSlackApiCall(method: string, status: number, duration: number): void {
  slackApiLatencyHistogram.observe({ method, status: status.toString() }, duration);
}

/**
 * Update queue depth metrics
 */
export async function updateQueueMetrics(queue: any, queueName: string): Promise<void> {
  try {
    const [waiting, active, completed, failed] = await Promise.all([
      queue.getWaitingCount(),
      queue.getActiveCount(),
      queue.getCompletedCount(),
      queue.getFailedCount()
    ]);
    
    queueDepthGauge.set({ queue: queueName, status: 'waiting' }, waiting);
    queueDepthGauge.set({ queue: queueName, status: 'active' }, active);
    queueDepthGauge.set({ queue: queueName, status: 'completed' }, completed);
    queueDepthGauge.set({ queue: queueName, status: 'failed' }, failed);
  } catch (error) {
    logger.error('Failed to update queue metrics', { error, queueName });
  }
}

/**
 * Check if invalid_auth rate is above threshold
 */
export function checkInvalidAuthThreshold(): boolean {
  // This would be better implemented with Prometheus query
  // For now, just log warning
  const threshold = 10;
  logger.warn('Invalid auth threshold check not fully implemented', { threshold });
  return false;
}