import { WebClient } from '@slack/web-api';
import LRU from 'lru-cache';
import { SlackInstallationStore } from '@/services/slackInstallationStore';
import { logger } from '@/utils/logger';
import { register, Counter, Histogram, Gauge } from 'prom-client';

/**
 * Cache configuration for Slack WebClients
 * - Max 500 teams (as per requirement)
 * - TTL: 10 minutes (600 seconds)
 * - Update age on get for frequently used clients
 */
const CACHE_OPTIONS = {
  max: 500,
  ttl: 1000 * 60 * 10, // 10 minutes in milliseconds
  updateAgeOnGet: true,
  updateAgeOnHas: true,
};

/**
 * Prometheus metrics for monitoring cache performance
 */
const cacheHitCounter = new Counter({
  name: 'auth_cache_hits_total',
  help: 'Total number of cache hits',
  registers: [register]
});

const cacheMissCounter = new Counter({
  name: 'auth_cache_misses_total',
  help: 'Total number of cache misses',
  registers: [register]
});

const cacheSize = new Gauge({
  name: 'auth_cache_size',
  help: 'Current number of items in cache',
  registers: [register]
});

const cacheMemoryUsage = new Gauge({
  name: 'auth_cache_memory_usage_bytes',
  help: 'Estimated memory usage of cache in bytes',
  registers: [register]
});

const clientCreationDuration = new Histogram({
  name: 'slack_client_creation_duration_seconds',
  help: 'Time taken to create Slack client',
  buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1],
  registers: [register]
});

/**
 * LRU Cache for WebClient instances
 * Key format: `${teamId}:${enterpriseId || 'null'}`
 */
const clientCache = new LRU<string, WebClient>(CACHE_OPTIONS);

/**
 * Slack installation store instance
 */
let installationStore: SlackInstallationStore | null = null;

/**
 * Initialize the installation store (called once at startup)
 */
export function initializeSlackClientStore(store: SlackInstallationStore): void {
  installationStore = store;
  logger.info('Slack client store initialized');
}

/**
 * Get cache statistics for monitoring
 */
export function getCacheStats() {
  const hitRate = cacheHitCounter.get().values[0]?.value || 0;
  const missCount = cacheMissCounter.get().values[0]?.value || 0;
  const total = hitRate + missCount;
  
  return {
    size: clientCache.size,
    hitRate: total > 0 ? (hitRate / total) * 100 : 0,
    hits: hitRate,
    misses: missCount,
    memoryUsage: estimateCacheMemoryUsage()
  };
}

/**
 * Estimate memory usage of cache
 */
function estimateCacheMemoryUsage(): number {
  // Rough estimate: each WebClient instance ~1KB + token string ~100 bytes
  const bytesPerEntry = 1100;
  return clientCache.size * bytesPerEntry;
}

/**
 * Update cache metrics
 */
function updateCacheMetrics(): void {
  cacheSize.set(clientCache.size);
  cacheMemoryUsage.set(estimateCacheMemoryUsage());
}

/**
 * Create a cache key from team and enterprise IDs
 */
function createCacheKey(teamId: string, enterpriseId?: string | null): string {
  return `${teamId}:${enterpriseId || 'null'}`;
}

/**
 * Main function to get Slack WebClient with dynamic token resolution
 * 
 * @param teamId - Slack team ID
 * @param enterpriseId - Slack enterprise ID (optional)
 * @returns WebClient instance with appropriate token
 */
export async function getSlackClient(
  teamId: string,
  enterpriseId?: string | null
): Promise<WebClient> {
  const startTime = Date.now();
  const cacheKey = createCacheKey(teamId, enterpriseId);

  try {
    // Check cache first
    const cachedClient = clientCache.get(cacheKey);
    if (cachedClient) {
      cacheHitCounter.inc();
      logger.debug('Slack client cache hit', { teamId, enterpriseId });
      return cachedClient;
    }

    // Cache miss - need to create new client
    cacheMissCounter.inc();
    logger.debug('Slack client cache miss', { teamId, enterpriseId });

    // Try OAuth installation first
    if (installationStore) {
      try {
        const installation = await installationStore.fetchInstallation({
          teamId,
          enterpriseId: enterpriseId || undefined,
          isEnterpriseInstall: !!enterpriseId
        });

        if (installation?.bot?.token) {
          const client = new WebClient(installation.bot.token);
          
          // Store in cache
          clientCache.set(cacheKey, client);
          updateCacheMetrics();
          
          logger.info('Created Slack client from OAuth installation', {
            teamId,
            enterpriseId,
            botId: installation.bot.id
          });

          return client;
        }
      } catch (error) {
        logger.error('Failed to fetch OAuth installation', {
          error,
          teamId,
          enterpriseId
        });
      }
    }

    // Fallback to environment variable token
    const envToken = process.env.SLACK_BOT_TOKEN;
    if (envToken) {
      logger.warn('Using environment variable token as fallback', {
        teamId,
        enterpriseId
      });

      const client = new WebClient(envToken);
      
      // Cache even fallback clients
      clientCache.set(cacheKey, client);
      updateCacheMetrics();
      
      return client;
    }

    // No token available
    throw new Error(`No Slack token available for team ${teamId}`);

  } finally {
    // Record duration metric
    const duration = (Date.now() - startTime) / 1000;
    clientCreationDuration.observe(duration);
  }
}

/**
 * Clear cache for a specific team (useful for token refresh)
 */
export function clearClientCache(teamId: string, enterpriseId?: string | null): void {
  const cacheKey = createCacheKey(teamId, enterpriseId);
  const deleted = clientCache.delete(cacheKey);
  
  if (deleted) {
    updateCacheMetrics();
    logger.info('Cleared Slack client cache', { teamId, enterpriseId });
  }
}

/**
 * Clear entire cache (use with caution)
 */
export function clearAllClientCache(): void {
  const previousSize = clientCache.size;
  clientCache.clear();
  updateCacheMetrics();
  
  logger.warn('Cleared entire Slack client cache', { previousSize });
}

/**
 * Handle invalid_auth errors by clearing cache and retrying
 */
export async function handleInvalidAuth(
  teamId: string,
  enterpriseId?: string | null
): Promise<void> {
  logger.warn('Handling invalid_auth error', { teamId, enterpriseId });
  
  // Clear cache for this team
  clearClientCache(teamId, enterpriseId);
  
  // If using OAuth, try to delete the installation
  if (installationStore) {
    try {
      await installationStore.deleteInstallation({
        teamId,
        enterpriseId: enterpriseId || undefined,
        isEnterpriseInstall: !!enterpriseId
      });
      
      logger.info('Deleted invalid OAuth installation', { teamId, enterpriseId });
    } catch (error) {
      logger.error('Failed to delete OAuth installation', {
        error,
        teamId,
        enterpriseId
      });
    }
  }
}

/**
 * Periodic cache cleanup (remove expired entries)
 * LRU-cache handles this automatically, but we update metrics
 */
export function performCacheCleanup(): void {
  // Force cleanup of expired entries
  clientCache.purgeStale();
  updateCacheMetrics();
  
  const stats = getCacheStats();
  logger.info('Cache cleanup completed', stats);
}

// Set up periodic cleanup (every 5 minutes)
setInterval(performCacheCleanup, 5 * 60 * 1000);

// Export metrics for monitoring
export function getMetrics() {
  return {
    cacheHitRate: getCacheStats().hitRate,
    cacheSize: clientCache.size,
    memoryUsage: estimateCacheMemoryUsage()
  };
}