import { Redis } from 'ioredis';
import { logger } from '@/utils/logger';

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