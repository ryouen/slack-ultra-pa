import { Queue, Worker, QueueOptions, WorkerOptions, QueueScheduler, QueueEvents } from 'bullmq';
import Redis from 'ioredis';
import { config } from '@/config/environment';
import { logger } from '@/utils/logger';
import { createBullMQRedisClient, monitorRedisMetrics } from '@/config/redis';

// Redis connection for BullMQ - use unified configuration
const redisConnection = createBullMQRedisClient();

// Shared Redis connection for all BullMQ components
const sharedRedis = redisConnection;

// Queue options with reuseRedis enabled
const queueOptions: QueueOptions = {
  connection: sharedRedis
};

// Job queue instances
export const reminderQueue = new Queue('reminder', queueOptions);
export const reportQueue = new Queue('report', queueOptions);
export const fileSummaryQueue = new Queue('fileSummary', queueOptions);

// Queue schedulers for delayed/repeated jobs (v5 requires these)
const reminderScheduler = new QueueScheduler('reminder', { connection: sharedRedis });
const reportScheduler = new QueueScheduler('report', { connection: sharedRedis });
const fileSummaryScheduler = new QueueScheduler('fileSummary', { connection: sharedRedis });

// Queue events for monitoring (optional but recommended)
const reminderEvents = new QueueEvents('reminder', { connection: sharedRedis });
const reportEvents = new QueueEvents('report', { connection: sharedRedis });
const fileSummaryEvents = new QueueEvents('fileSummary', { connection: sharedRedis });

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
    
    // Start Redis metrics monitoring
    setInterval(() => {
      monitorRedisMetrics(redisConnection).catch(err => 
        logger.error('Redis metrics collection failed', { error: err })
      );
    }, 30000); // Every 30 seconds
    
    // Initial metrics collection
    monitorRedisMetrics(redisConnection);
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
    connection: sharedRedis,
    concurrency: 5,
    removeOnComplete: {
      count: 100,
      age: 60 * 60 * 24 // Keep completed jobs for 24 hours
    },
    removeOnFail: {
      count: 50,
      age: 60 * 60 * 24 * 7 // Keep failed jobs for 7 days
    },
    // Rate limiter to avoid Slack API 429 errors
    limiter: {
      max: 59, // Max 59 calls
      duration: 60000 // Per 60 seconds (1 minute)
    }
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
    // Step 1: Pause queues to prevent new job additions
    await reminderQueue.pause(true, true);
    await reportQueue.pause(true, true);
    await fileSummaryQueue.pause(true, true);
    logger.info('Queues paused for graceful shutdown');
    
    // Step 2: Wait for active workers to complete (with timeout)
    const shutdownTimeout = 30000; // 30 seconds
    const shutdownPromise = Promise.all([
      reminderQueue.close(),
      reportQueue.close(),
      fileSummaryQueue.close()
    ]);
    
    await Promise.race([
      shutdownPromise,
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Queue shutdown timeout')), shutdownTimeout)
      )
    ]);
    
    // Step 3: Close schedulers
    await reminderScheduler.close();
    await reportScheduler.close();
    await fileSummaryScheduler.close();
    
    // Step 4: Close event listeners
    await reminderEvents.close();
    await reportEvents.close();
    await fileSummaryEvents.close();
    
    // Step 5: Finally close Redis connection
    await redisConnection.quit();
    logger.info('Job queue system shutdown complete');
  } catch (error) {
    logger.error('Error during job queue shutdown:', error);
    // Force close Redis connection
    redisConnection.disconnect();
  }
}