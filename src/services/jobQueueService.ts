import { Queue, Worker, Job, QueueOptions, WorkerOptions } from 'bullmq';
import { Redis } from 'ioredis';
import { logger } from '@/utils/logger';
import { createBullMQRedisClient } from '@/config/redis';

// Job Types
export enum JobType {
  REMINDER = 'reminder',
  DAILY_REPORT = 'daily_report',
  WEEKLY_REPORT = 'weekly_report',
  CALENDAR_SYNC = 'calendar_sync',
  EMAIL_NOTIFICATION = 'email_notification',
  CLEANUP = 'cleanup',
  TOKEN_HEALTH_CHECK = 'token_health_check'
}

// Job Data Interfaces
export interface ReminderJobData {
  taskId: string;
  userId: string;
  reminderType: 'day_before' | 'free_time';
  scheduledAt: Date;
  message: string;
}

export interface ReportJobData {
  userId: string;
  reportType: 'daily' | 'weekly';
  channelId?: string;
  includeMetrics: boolean;
}

export interface CalendarSyncJobData {
  userId: string;
  provider: string;
  syncType: 'full' | 'incremental';
  lastSyncAt?: Date;
}

export interface CleanupJobData {
  targetType: 'completed_jobs' | 'expired_tokens' | 'old_logs';
  olderThan: Date;
}

export interface TokenHealthCheckJobData {
  checkType: 'all' | 'team';
  teamId?: string;
}

export type JobData = ReminderJobData | ReportJobData | CalendarSyncJobData | CleanupJobData | TokenHealthCheckJobData;

/**
 * Job Queue Service
 * Manages asynchronous job processing with BullMQ and Redis
 */
export class JobQueueService {
  private redis: Redis;
  private queues: Map<JobType, Queue> = new Map();
  private workers: Map<JobType, Worker> = new Map();

  constructor() {
    // Initialize Redis connection using unified config
    this.redis = createBullMQRedisClient();
  }

  /**
   * Initialize job queues and workers
   */
  async initialize(): Promise<void> {
    try {
      // Create queues for each job type
      for (const jobType of Object.values(JobType)) {
        await this.createQueue(jobType);
      }

      // Start workers
      await this.startWorkers();

      // Schedule recurring jobs
      await this.scheduleRecurringJobs();

      logger.info('Job queue service initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize job queue service', { error });
      throw error;
    }
  }

  /**
   * Create a queue for a specific job type
   */
  private async createQueue(jobType: JobType): Promise<void> {
    const queueOptions: QueueOptions = {
      connection: this.redis,
      defaultJobOptions: {
        removeOnComplete: 100, // Keep last 100 completed jobs
        removeOnFail: 50,      // Keep last 50 failed jobs
        attempts: 3,           // Retry failed jobs 3 times
        backoff: {
          type: 'exponential',
          delay: 2000,         // Start with 2 second delay
        },
      },
    };

    const queue = new Queue(jobType, queueOptions);
    this.queues.set(jobType, queue);

    logger.info(`Queue created for job type: ${jobType}`);
  }

  /**
   * Start workers for all job types
   */
  private async startWorkers(): Promise<void> {
    const workerOptions: WorkerOptions = {
      connection: this.redis,
      concurrency: 5, // Process up to 5 jobs concurrently per worker
    };

    // Reminder worker
    const reminderWorker = new Worker(
      JobType.REMINDER,
      this.processReminderJob.bind(this),
      workerOptions
    );
    this.workers.set(JobType.REMINDER, reminderWorker);

    // Report workers
    const dailyReportWorker = new Worker(
      JobType.DAILY_REPORT,
      this.processDailyReportJob.bind(this),
      workerOptions
    );
    this.workers.set(JobType.DAILY_REPORT, dailyReportWorker);

    const weeklyReportWorker = new Worker(
      JobType.WEEKLY_REPORT,
      this.processWeeklyReportJob.bind(this),
      workerOptions
    );
    this.workers.set(JobType.WEEKLY_REPORT, weeklyReportWorker);

    // Calendar sync worker
    const calendarSyncWorker = new Worker(
      JobType.CALENDAR_SYNC,
      this.processCalendarSyncJob.bind(this),
      workerOptions
    );
    this.workers.set(JobType.CALENDAR_SYNC, calendarSyncWorker);

    // Cleanup worker
    const cleanupWorker = new Worker(
      JobType.CLEANUP,
      this.processCleanupJob.bind(this),
      workerOptions
    );
    this.workers.set(JobType.CLEANUP, cleanupWorker);

    // Token health check worker
    const tokenHealthCheckWorker = new Worker(
      JobType.TOKEN_HEALTH_CHECK,
      this.processTokenHealthCheckJob.bind(this),
      workerOptions
    );
    this.workers.set(JobType.TOKEN_HEALTH_CHECK, tokenHealthCheckWorker);

    // Add error handlers
    this.workers.forEach((worker, jobType) => {
      worker.on('completed', (job) => {
        logger.info(`Job completed: ${jobType}`, { jobId: job.id });
      });

      worker.on('failed', (job, err) => {
        logger.error(`Job failed: ${jobType}`, { 
          jobId: job?.id, 
          error: err.message,
          attempts: job?.attemptsMade 
        });
      });

      worker.on('error', (err) => {
        logger.error(`Worker error: ${jobType}`, { error: err.message });
      });
    });

    logger.info('All workers started successfully');
  }

  /**
   * Schedule a reminder job
   */
  async scheduleReminder(data: ReminderJobData, delay?: number): Promise<string> {
    const queue = this.queues.get(JobType.REMINDER);
    if (!queue) {
      throw new Error('Reminder queue not initialized');
    }

    const job = await queue.add(JobType.REMINDER, data, {
      delay: delay || 0,
      jobId: `reminder-${data.taskId}-${data.reminderType}-${Date.now()}`,
    });

    logger.info('Reminder job scheduled', { 
      jobId: job.id, 
      taskId: data.taskId,
      reminderType: data.reminderType,
      scheduledAt: data.scheduledAt
    });

    return job.id!;
  }

  /**
   * Cancel a scheduled reminder
   */
  async cancelReminder(jobId: string): Promise<boolean> {
    const queue = this.queues.get(JobType.REMINDER);
    if (!queue) {
      return false;
    }

    try {
      const job = await queue.getJob(jobId);
      if (job) {
        await job.remove();
        logger.info('Reminder job cancelled', { jobId });
        return true;
      }
      return false;
    } catch (error) {
      logger.error('Failed to cancel reminder job', { jobId, error });
      return false;
    }
  }

  /**
   * Schedule a report job
   */
  async scheduleReport(data: ReportJobData, cronExpression?: string): Promise<string> {
    const jobType = data.reportType === 'daily' ? JobType.DAILY_REPORT : JobType.WEEKLY_REPORT;
    const queue = this.queues.get(jobType);
    if (!queue) {
      throw new Error(`${data.reportType} report queue not initialized`);
    }

    const jobOptions: any = {
      jobId: `${data.reportType}-report-${data.userId}-${Date.now()}`,
    };

    if (cronExpression) {
      jobOptions.repeat = { pattern: cronExpression };
    }

    const job = await queue.add(jobType, data, jobOptions);

    logger.info(`${data.reportType} report job scheduled`, { 
      jobId: job.id, 
      userId: data.userId,
      cronExpression 
    });

    return job.id!;
  }

  /**
   * Schedule calendar sync job
   */
  async scheduleCalendarSync(data: CalendarSyncJobData): Promise<string> {
    const queue = this.queues.get(JobType.CALENDAR_SYNC);
    if (!queue) {
      throw new Error('Calendar sync queue not initialized');
    }

    const job = await queue.add(JobType.CALENDAR_SYNC, data, {
      jobId: `calendar-sync-${data.userId}-${data.provider}-${Date.now()}`,
    });

    logger.info('Calendar sync job scheduled', { 
      jobId: job.id, 
      userId: data.userId,
      provider: data.provider,
      syncType: data.syncType
    });

    return job.id!;
  }

  /**
   * Schedule recurring jobs (daily reports, cleanup, etc.)
   */
  private async scheduleRecurringJobs(): Promise<void> {
    // Daily cleanup at 2 AM
    await this.scheduleCleanupJob({
      targetType: 'completed_jobs',
      olderThan: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // 7 days ago
    }, '0 2 * * *');

    // Weekly token cleanup on Sundays at 3 AM
    await this.scheduleCleanupJob({
      targetType: 'expired_tokens',
      olderThan: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // 30 days ago
    }, '0 3 * * 0');

    // Token health check every 10 minutes
    await this.scheduleTokenHealthCheck({
      checkType: 'all'
    }, '*/10 * * * *');

    logger.info('Recurring jobs scheduled');
  }

  /**
   * Schedule cleanup job
   */
  private async scheduleCleanupJob(data: CleanupJobData, cronExpression: string): Promise<string> {
    const queue = this.queues.get(JobType.CLEANUP);
    if (!queue) {
      throw new Error('Cleanup queue not initialized');
    }

    const job = await queue.add(JobType.CLEANUP, data, {
      repeat: { pattern: cronExpression },
      jobId: `cleanup-${data.targetType}`,
    });

    return job.id!;
  }

  /**
   * Schedule token health check job
   */
  private async scheduleTokenHealthCheck(data: TokenHealthCheckJobData, cronExpression: string): Promise<string> {
    const queue = this.queues.get(JobType.TOKEN_HEALTH_CHECK);
    if (!queue) {
      throw new Error('Token health check queue not initialized');
    }

    const job = await queue.add(JobType.TOKEN_HEALTH_CHECK, data, {
      repeat: { pattern: cronExpression },
      jobId: `token-health-check-${data.checkType}`,
    });

    return job.id!;
  }

  /**
   * Process reminder job
   */
  private async processReminderJob(job: Job<ReminderJobData>): Promise<void> {
    const { taskId, userId, reminderType, message } = job.data;

    try {
      logger.info('Processing reminder job', { 
        jobId: job.id, 
        taskId, 
        userId, 
        reminderType 
      });

      // Import reminder service dynamically to avoid circular dependencies
      const { ReminderService } = await import('./reminderService');
      const reminderService = new ReminderService();

      // Send reminder
      await reminderService.sendReminder(taskId, userId, reminderType, message);

      logger.info('Reminder job completed successfully', { jobId: job.id, taskId });
    } catch (error) {
      logger.error('Reminder job failed', { 
        jobId: job.id, 
        taskId, 
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Process daily report job
   */
  private async processDailyReportJob(job: Job<ReportJobData>): Promise<void> {
    const { userId, channelId, includeMetrics } = job.data;

    try {
      logger.info('Processing daily report job', { jobId: job.id, userId });

      // TODO: Implement daily report generation
      // This would integrate with TaskService to generate daily progress reports
      
      logger.info('Daily report job completed successfully', { jobId: job.id, userId });
    } catch (error) {
      logger.error('Daily report job failed', { 
        jobId: job.id, 
        userId, 
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Process weekly report job
   */
  private async processWeeklyReportJob(job: Job<ReportJobData>): Promise<void> {
    const { userId, channelId, includeMetrics } = job.data;

    try {
      logger.info('Processing weekly report job', { jobId: job.id, userId });

      // TODO: Implement weekly report generation
      // This would integrate with TaskService to generate weekly progress reports
      
      logger.info('Weekly report job completed successfully', { jobId: job.id, userId });
    } catch (error) {
      logger.error('Weekly report job failed', { 
        jobId: job.id, 
        userId, 
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Process calendar sync job
   */
  private async processCalendarSyncJob(job: Job<CalendarSyncJobData>): Promise<void> {
    const { userId, provider, syncType, lastSyncAt } = job.data;

    try {
      logger.info('Processing calendar sync job', { 
        jobId: job.id, 
        userId, 
        provider, 
        syncType 
      });

      // TODO: Implement calendar synchronization
      // This would integrate with GoogleOAuthService and CalendarService
      
      logger.info('Calendar sync job completed successfully', { jobId: job.id, userId });
    } catch (error) {
      logger.error('Calendar sync job failed', { 
        jobId: job.id, 
        userId, 
        provider, 
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Process cleanup job
   */
  private async processCleanupJob(job: Job<CleanupJobData>): Promise<void> {
    const { targetType, olderThan } = job.data;

    try {
      logger.info('Processing cleanup job', { 
        jobId: job.id, 
        targetType, 
        olderThan: olderThan.toISOString() 
      });

      switch (targetType) {
        case 'completed_jobs':
          await this.cleanupCompletedJobs(olderThan);
          break;
        case 'expired_tokens':
          await this.cleanupExpiredTokens(olderThan);
          break;
        case 'old_logs':
          await this.cleanupOldLogs(olderThan);
          break;
      }

      logger.info('Cleanup job completed successfully', { jobId: job.id, targetType });
    } catch (error) {
      logger.error('Cleanup job failed', { 
        jobId: job.id, 
        targetType, 
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Process token health check job
   */
  private async processTokenHealthCheckJob(job: Job<TokenHealthCheckJobData>): Promise<void> {
    const { checkType, teamId } = job.data;

    try {
      logger.info('Processing token health check job', { 
        jobId: job.id, 
        checkType,
        teamId 
      });

      const { slackInstallationStore } = await import('@/services/slackInstallationStore');
      const { WebClient } = await import('@slack/web-api');
      const { getPrismaClient } = await import('@/config/database');
      
      const prisma = getPrismaClient();
      let checkedCount = 0;
      let invalidCount = 0;

      if (checkType === 'all') {
        const installations = await prisma.slackInstallation.findMany({
          select: {
            teamId: true,
            botToken: true,
            createdAt: true,
            updatedAt: true
          }
        });

        for (const installation of installations) {
          checkedCount++;
          try {
            const client = new WebClient(installation.botToken);
            await client.auth.test();
            logger.debug(`Token valid for team ${installation.teamId}`);
          } catch (error: any) {
            if (error.data?.error === 'invalid_auth') {
              invalidCount++;
              logger.warn(`Invalid token detected for team ${installation.teamId}`);
              
              await slackInstallationStore.deleteInstallation({
                teamId: installation.teamId,
                enterpriseId: undefined
              });
              
              logger.info(`Deleted invalid installation for team ${installation.teamId}`);
            } else {
              logger.error(`Error checking token for team ${installation.teamId}`, { error });
            }
          }
        }
      } else if (checkType === 'team' && teamId) {
        // Check specific team
        const installation = await prisma.slackInstallation.findFirst({
          where: { teamId }
        });

        if (installation) {
          checkedCount = 1;
          try {
            const client = new WebClient(installation.botToken);
            await client.auth.test();
            logger.debug(`Token valid for team ${teamId}`);
          } catch (error: any) {
            if (error.data?.error === 'invalid_auth') {
              invalidCount = 1;
              logger.warn(`Invalid token detected for team ${teamId}`);
              
              await slackInstallationStore.deleteInstallation({
                teamId,
                enterpriseId: undefined
              });
              
              logger.info(`Deleted invalid installation for team ${teamId}`);
            }
          }
        }
      }
      
      logger.info('Token health check completed', { 
        jobId: job.id,
        checked: checkedCount,
        invalid: invalidCount
      });
    } catch (error) {
      logger.error('Token health check job failed', { 
        jobId: job.id,
        checkType,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Cleanup completed jobs older than specified date
   */
  private async cleanupCompletedJobs(olderThan: Date): Promise<void> {
    for (const [jobType, queue] of this.queues) {
      const completed = await queue.getCompleted();
      let cleanedCount = 0;

      for (const job of completed) {
        if (job.finishedOn && job.finishedOn < olderThan.getTime()) {
          await job.remove();
          cleanedCount++;
        }
      }

      logger.info(`Cleaned up completed jobs`, { jobType, cleanedCount });
    }
  }

  /**
   * Cleanup expired OAuth tokens
   */
  private async cleanupExpiredTokens(olderThan: Date): Promise<void> {
    try {
      const { getPrismaClient } = await import('@/config/database');
      const prisma = getPrismaClient();

      const result = await prisma.oAuthToken.deleteMany({
        where: {
          OR: [
            { isValid: false },
            { 
              expiresAt: {
                lt: olderThan
              }
            }
          ]
        }
      });

      logger.info('Cleaned up expired OAuth tokens', { deletedCount: result.count });
    } catch (error) {
      logger.error('Failed to cleanup expired tokens', { error });
      throw error;
    }
  }

  /**
   * Cleanup old log entries (placeholder)
   */
  private async cleanupOldLogs(olderThan: Date): Promise<void> {
    // TODO: Implement log cleanup based on your logging strategy
    logger.info('Log cleanup completed', { olderThan: olderThan.toISOString() });
  }

  /**
   * Get queue statistics
   */
  async getQueueStats(): Promise<Record<string, any>> {
    const stats: Record<string, any> = {};

    for (const [jobType, queue] of this.queues) {
      const waiting = await queue.getWaiting();
      const active = await queue.getActive();
      const completed = await queue.getCompleted();
      const failed = await queue.getFailed();

      stats[jobType] = {
        waiting: waiting.length,
        active: active.length,
        completed: completed.length,
        failed: failed.length,
      };
    }

    return stats;
  }

  /**
   * Graceful shutdown
   */
  async shutdown(): Promise<void> {
    logger.info('Shutting down job queue service...');

    // Close all workers
    for (const [jobType, worker] of this.workers) {
      await worker.close();
      logger.info(`Worker closed: ${jobType}`);
    }

    // Close all queues
    for (const [jobType, queue] of this.queues) {
      await queue.close();
      logger.info(`Queue closed: ${jobType}`);
    }

    // Close Redis connection
    await this.redis.quit();
    logger.info('Redis connection closed');

    logger.info('Job queue service shutdown complete');
  }
}

// Export singleton instance
export const jobQueueService = new JobQueueService();