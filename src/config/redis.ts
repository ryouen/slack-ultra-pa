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
  const client = createRedisClient();
  
  client.on('connect', () => {
    logger.info('Redis connected for BullMQ');
  });

  client.on('error', (error) => {
    logger.error('Redis connection error for BullMQ', { error });
  });

  return client;
}