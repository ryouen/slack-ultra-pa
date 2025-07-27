import { Counter, Histogram, register } from 'prom-client';

/**
 * Quick Reply feature metrics
 */

// Processing latency
export const quickReplyLatency = new Histogram({
  name: 'quick_reply_latency_ms',
  help: 'Quick Reply processing latency in milliseconds',
  buckets: [10, 50, 100, 200, 500, 1000, 2000, 5000],
  labelNames: ['action_type', 'status'],
  registers: [register]
});

// Total processed count
export const quickReplyProcessed = new Counter({
  name: 'quick_reply_processed_total',
  help: 'Total number of Quick Reply messages processed',
  labelNames: ['mention_type', 'has_ui'],
  registers: [register]
});

// Error count
export const quickReplyErrors = new Counter({
  name: 'quick_reply_errors_total',
  help: 'Total number of Quick Reply processing errors',
  labelNames: ['error_type', 'stage'],
  registers: [register]
});

// Cache hits for bot user ID
export const botUserIdCacheHits = new Counter({
  name: 'bot_user_id_cache_hits_total',
  help: 'Number of cache hits when resolving bot user ID',
  registers: [register]
});

// Rate limit encounters
export const quickReplyRateLimits = new Counter({
  name: 'quick_reply_rate_limits_total',
  help: 'Number of rate limit errors encountered',
  labelNames: ['limit_type'],
  registers: [register]
});

/**
 * Helper to measure operation duration
 */
export function measureQuickReplyDuration(actionType: string = 'process') {
  const start = Date.now();
  
  return {
    success: () => {
      const duration = Date.now() - start;
      quickReplyLatency.observe({ action_type: actionType, status: 'success' }, duration);
      return duration;
    },
    
    error: (errorType: string = 'unknown') => {
      const duration = Date.now() - start;
      quickReplyLatency.observe({ action_type: actionType, status: 'error' }, duration);
      quickReplyErrors.inc({ error_type: errorType, stage: actionType });
      return duration;
    }
  };
}

/**
 * Get all Quick Reply metrics for monitoring
 */
export function getQuickReplyMetrics() {
  return {
    latency: quickReplyLatency,
    processed: quickReplyProcessed,
    errors: quickReplyErrors,
    cacheHits: botUserIdCacheHits,
    rateLimits: quickReplyRateLimits
  };
}