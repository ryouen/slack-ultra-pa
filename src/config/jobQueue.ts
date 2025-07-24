import { Queue, Worker, QueueOptions, WorkerOptions } from 'bullmq';
import Redis from 'ioredis';
import { config } from '@/config/environment';
import { logger } from '@/utils/logger';

// Redis connection for BullMQ
const redisConnection = new Redis(config.redis.url, {
  maxRetriesPerRequest: 3,
  retryDelayOnFailover: 100,
});

// Job queue instances
export const reminderQueue = new Queue('reminder', { connection: redisConnection });
export const reportQueue = new Queue('report', { connection: redisConnection });
export const fileSummaryQueue = new Queue('fileSummary', { connection: redisConnection });

/**
 * Initialize job queue system
 */
export async function initializeJobQueue(): Promise<void> {
  try {
    // Test Redis connection
    await redisConnection.ping();
    logger.info('Redis connection established for job queue');

    // Setup queue event listeners
    setupQueueEventListeners();

    // Initialize workers
    initializeWorkers();

    logger.info('Job queue system initialized');
  } catch (error) {
    logger.error('Failed to initialize job queue:', error);
    throw error;
  }
}

/**
 * Setup event listeners for all queues
 */
function setupQueueEventListeners(): void {
  const queues = [reminderQueue, reportQueue, fileSummaryQueue];

  queues.forEach(queue => {
    queue.on('completed', (job) => {
      logger.info(`Job completed: ${job.name}`, {
        jobId: job.id,
        queueName: queue.name,
        duration: job.finishedOn ? job.finishedOn - job.processedOn! : 0,
      });
    });

    queue.on('failed', (job, err) => {
      logger.error(`Job failed: ${job?.name}`, {
        jobId: job?.id,
        queueName: queue.name,
        error: err.message,
        attempts: job?.attemptsMade,
      });
    });

    queue.on('stalled', (jobId) => {
      logger.warn(`Job stalled: ${jobId}`, {
        queueName: queue.name,
      });
    });
  });
}

/**
 * Initialize worker processes for each queue
 */
function initializeWorkers(): void {
  const workerOptions: WorkerOptions = {
    connection: redisConnection,
    concurrency: 5,
    removeOnComplete: 100,
    removeOnFail: 50,
  };

  // Reminder worker
  new Worker('reminder', async (job) => {
    logger.info(`Processing reminder job: ${job.id}`);
    // Worker implementation will be added in later tasks
    return { success: true };
  }, workerOptions);

  // Report worker
  new Worker('report', async (job) => {
    logger.info(`Processing report job: ${job.id}`);
    // Worker implementation will be added in later tasks
    return { success: true };
  }, workerOptions);

  // File summary worker
  new Worker('fileSummary', async (job) => {
    logger.info(`Processing file summary job: ${job.id}`);
    // Worker implementation will be added in later tasks
    return { success: true };
  }, workerOptions);

  logger.info('Job queue workers initialized');
}

/**
 * Gracefully shutdown job queue system
 */
export async function shutdownJobQueue(): Promise<void> {
  try {
    await reminderQueue.close();
    await reportQueue.close();
    await fileSummaryQueue.close();
    await redisConnection.quit();
    logger.info('Job queue system shutdown complete');
  } catch (error) {
    logger.error('Error during job queue shutdown:', error);
  }
}