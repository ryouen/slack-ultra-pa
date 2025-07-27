import { Redis } from 'ioredis';
import { logger } from '@/utils/logger';
import { register, Gauge } from 'prom-client';

/**
 * Create Redis client with unified configuration
 * Uses REDIS_URL as primary source, falls back to individual env vars
 */
export function createRedisClient(): Redis {
  const redisUrl = process.env.REDIS_URL;
  
  if (redisUrl) {
    // Use REDIS_URL directly (preferred method)
    logger.info('Creating Redis client from REDIS_URL');
    return new Redis(redisUrl, {
      lazyConnect: false,
      retryDelayOnFailover: 100,
      enableReadyCheck: false,
      maxRetriesPerRequest: null,
    });
  } else {
    // Fallback to individual environment variables
    logger.info('Creating Redis client from individual env vars');
    return new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
      db: parseInt(process.env.REDIS_DB || '0'),
      retryDelayOnFailover: 100,
      enableReadyCheck: false,
      maxRetriesPerRequest: null,
    });
  }
}

/**
 * Create Redis client for BullMQ queues
 * BullMQ requires specific configuration
 */
// Prometheus metrics for Redis monitoring
const redisConnectedClients = new Gauge({
  name: 'redis_connected_clients',
  help: 'Number of connected Redis clients',
  registers: [register]
});

const redisUsedMemory = new Gauge({
  name: 'redis_used_memory_bytes',
  help: 'Redis memory usage in bytes',
  registers: [register]
});

/**
 * Monitor Redis connection metrics
 */
export async function monitorRedisMetrics(redis: Redis): Promise<void> {
  try {
    const info = await redis.info('clients');
    const clientsMatch = info.match(/connected_clients:(\d+)/);
    if (clientsMatch) {
      const connectedClients = parseInt(clientsMatch[1]);
      redisConnectedClients.set(connectedClients);
      logger.info('Redis connected clients', { count: connectedClients });
      
      // Alert if connection count is high
      if (connectedClients > 800) {
        logger.warn('High Redis connection count', { 
          count: connectedClients, 
          threshold: 800 
        });
      }
    }
    
    const memInfo = await redis.info('memory');
    const memMatch = memInfo.match(/used_memory:(\d+)/);
    if (memMatch) {
      redisUsedMemory.set(parseInt(memMatch[1]));
    }
  } catch (error) {
    logger.error('Failed to collect Redis metrics', { error });
  }
}

export function createBullMQRedisClient(): Redis {
  const redisUrl = process.env.REDIS_URL;
  
  if (redisUrl) {
    logger.info('Creating BullMQ Redis client from REDIS_URL');
    return new Redis(redisUrl, {
      lazyConnect: false,
      maxRetriesPerRequest: null, // BullMQの要件
      enableReadyCheck: false, // o3-pro推奨: ElastiCache対応
      connectionName: `ultrapa-${process.pid}`, // o3-pro推奨: 可観測性向上
      retryDelayOnFailover: 100,
    });
  } else {
    logger.info('Creating BullMQ Redis client from individual env vars');
    return new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
      db: parseInt(process.env.REDIS_DB || '0'),
      lazyConnect: false,
      maxRetriesPerRequest: null, // BullMQの要件
      enableReadyCheck: false, // o3-pro推奨設定
      connectionName: `ultrapa-${process.pid}`, // o3-pro推奨設定
      retryDelayOnFailover: 100,
    });
  }
}