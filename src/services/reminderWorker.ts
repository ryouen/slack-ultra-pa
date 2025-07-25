import { logger } from '@/utils/logger';
import { getPrismaClient } from '@/config/database';
import { ReminderService } from './reminderService';

export class ReminderWorker {
  private prisma = getPrismaClient();
  private reminderService = new ReminderService();
  private isRunning = false;
  private intervalId?: NodeJS.Timeout;

  /**
   * Start the reminder worker
   */
  start(): void {
    if (this.isRunning) {
      logger.warn('Reminder worker is already running');
      return;
    }

    this.isRunning = true;
    
    // Check for pending reminders every minute
    this.intervalId = setInterval(() => {
      this.processReminders().catch(error => {
        logger.error('Error in reminder worker', { error });
      });
    }, 60 * 1000); // 1 minute

    logger.info('Reminder worker started');
  }

  /**
   * Stop the reminder worker
   */
  stop(): void {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;
    
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = undefined;
    }

    logger.info('Reminder worker stopped');
  }

  /**
   * Process pending reminder jobs
   */
  private async processReminders(): Promise<void> {
    try {
      const now = new Date();
      
      // Find reminder jobs that are due
      const dueJobs = await this.prisma.jobQueue.findMany({
        where: {
          jobType: 'REMINDER',
          status: 'PENDING',
          scheduledAt: {
            lte: now
          }
        },
        orderBy: {
          scheduledAt: 'asc'
        },
        take: 10 // Process up to 10 reminders at a time
      });

      if (dueJobs.length === 0) {
        return;
      }

      logger.info(`Processing ${dueJobs.length} reminder jobs`);

      for (const job of dueJobs) {
        try {
          // Mark job as processing
          await this.prisma.jobQueue.update({
            where: { id: job.id },
            data: { status: 'PROCESSING' }
          });

          // Process the reminder
          await this.reminderService.processReminderJob(job.id, job.payload);

          logger.info('Reminder job processed successfully', { jobId: job.id });

        } catch (error) {
          logger.error('Failed to process reminder job', { 
            error, 
            jobId: job.id,
            payload: job.payload 
          });

          // Update job with failure info
          await this.prisma.jobQueue.update({
            where: { id: job.id },
            data: {
              status: 'FAILED',
              attempts: { increment: 1 }
            }
          });

          // If max attempts reached, mark as cancelled
          if (job.attempts >= job.maxAttempts - 1) {
            await this.prisma.jobQueue.update({
              where: { id: job.id },
              data: { status: 'CANCELLED' }
            });
            
            logger.warn('Reminder job cancelled after max attempts', { 
              jobId: job.id,
              attempts: job.attempts + 1,
              maxAttempts: job.maxAttempts
            });
          }
        }
      }

    } catch (error) {
      logger.error('Error processing reminders', { error });
    }
  }

  /**
   * Get worker status
   */
  getStatus(): { isRunning: boolean; nextCheck?: Date } {
    return {
      isRunning: this.isRunning,
      nextCheck: this.isRunning ? new Date(Date.now() + 60 * 1000) : undefined
    };
  }

  /**
   * Manually trigger reminder processing (for testing)
   */
  async triggerProcessing(): Promise<void> {
    if (!this.isRunning) {
      throw new Error('Reminder worker is not running');
    }

    await this.processReminders();
  }

  /**
   * Get pending reminder statistics
   */
  async getStats(): Promise<{
    pending: number;
    processing: number;
    failed: number;
    completed: number;
  }> {
    const stats = await this.prisma.jobQueue.groupBy({
      by: ['status'],
      where: {
        jobType: 'REMINDER'
      },
      _count: {
        id: true
      }
    });

    const result = {
      pending: 0,
      processing: 0,
      failed: 0,
      completed: 0
    };

    stats.forEach(stat => {
      switch (stat.status) {
        case 'PENDING':
          result.pending = stat._count.id;
          break;
        case 'PROCESSING':
          result.processing = stat._count.id;
          break;
        case 'FAILED':
          result.failed = stat._count.id;
          break;
        case 'COMPLETED':
          result.completed = stat._count.id;
          break;
      }
    });

    return result;
  }

  /**
   * Clean up old completed/failed jobs
   */
  async cleanup(olderThanDays: number = 7): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

    const result = await this.prisma.jobQueue.deleteMany({
      where: {
        jobType: 'REMINDER',
        status: {
          in: ['COMPLETED', 'FAILED', 'CANCELLED']
        },
        updatedAt: {
          lt: cutoffDate
        }
      }
    });

    logger.info(`Cleaned up ${result.count} old reminder jobs`);
    return result.count;
  }
}