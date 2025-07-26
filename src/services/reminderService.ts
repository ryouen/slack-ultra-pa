import { logger } from '@/utils/logger';
import { getPrismaClient } from '@/config/database';
import { jobQueueService, JobType, ReminderJobData } from './jobQueueService';
import { TaskService } from './taskService';

export interface ReminderSchedule {
  taskId: string;
  userId: string;
  reminderType: 'day_before' | 'before_free_time';
  scheduledAt: Date;
  status: 'pending' | 'sent' | 'cancelled';
}

export interface FreeBusySlot {
  start: Date;
  end: Date;
  status: 'free' | 'busy';
}

export class ReminderService {
  private prisma = getPrismaClient();
  private taskService = new TaskService();

  /**
   * Schedule reminders for a P1 task
   */
  async scheduleReminders(taskId: string): Promise<void> {
    try {
      const task = await this.prisma.task.findUnique({
        where: { id: taskId },
        include: { user: true }
      });

      if (!task || task.priority !== 'P1' || !task.dueDate) {
        logger.info('Task not eligible for reminders', { 
          taskId, 
          priority: task?.priority, 
          hasDueDate: !!task?.dueDate 
        });
        return;
      }

      // Schedule day-before 9AM reminder
      await this.scheduleDayBeforeReminder(task);

      // Schedule 3h before free time reminder
      await this.scheduleBeforeFreeTimeReminder(task);

      logger.info('Reminders scheduled for P1 task', { 
        taskId, 
        dueDate: task.dueDate 
      });

    } catch (error) {
      logger.error('Failed to schedule reminders', { error, taskId });
      throw error;
    }
  }

  /**
   * Schedule day-before 9AM reminder
   */
  private async scheduleDayBeforeReminder(task: any): Promise<void> {
    const dayBefore = new Date(task.dueDate);
    dayBefore.setDate(dayBefore.getDate() - 1);
    dayBefore.setHours(9, 0, 0, 0); // 9:00 AM

    // Don't schedule if it's in the past
    if (dayBefore <= new Date()) {
      logger.info('Day-before reminder time has passed', { 
        taskId: task.id, 
        scheduledTime: dayBefore 
      });
      return;
    }

    await this.createReminderJob({
      taskId: task.id,
      userId: task.userId,
      reminderType: 'day_before',
      scheduledAt: dayBefore,
      status: 'pending'
    });
  }

  /**
   * Schedule 3h before free time reminder
   */
  private async scheduleBeforeFreeTimeReminder(task: any): Promise<void> {
    try {
      // Get user's free time slots on due date
      const freeSlots = await this.getFreeBusySlots(task.userId, task.dueDate);
      
      if (freeSlots.length === 0) {
        logger.warn('No free time slots found for reminder', { 
          taskId: task.id, 
          dueDate: task.dueDate 
        });
        return;
      }

      // Find the first free slot that's at least 1 hour long
      const suitableSlot = freeSlots.find(slot => {
        const duration = slot.end.getTime() - slot.start.getTime();
        return duration >= 60 * 60 * 1000; // 1 hour in milliseconds
      });

      if (!suitableSlot) {
        logger.warn('No suitable free time slot found', { taskId: task.id });
        return;
      }

      // Schedule reminder 3 hours before the free slot
      const reminderTime = new Date(suitableSlot.start);
      reminderTime.setHours(reminderTime.getHours() - 3);

      // Don't schedule if it's in the past
      if (reminderTime <= new Date()) {
        logger.info('Free time reminder time has passed', { 
          taskId: task.id, 
          scheduledTime: reminderTime 
        });
        return;
      }

      await this.createReminderJob({
        taskId: task.id,
        userId: task.userId,
        reminderType: 'before_free_time',
        scheduledAt: reminderTime,
        status: 'pending'
      });

    } catch (error) {
      logger.error('Failed to schedule free time reminder', { 
        error, 
        taskId: task.id 
      });
      // Don't throw - day-before reminder should still work
    }
  }

  /**
   * Get free/busy slots for a user on a specific date
   * TODO: Integrate with Google Calendar FreeBusy API
   */
  private async getFreeBusySlots(userId: string, date: Date): Promise<FreeBusySlot[]> {
    // For now, return mock free time slots
    // In real implementation, this would call Google Calendar FreeBusy API
    
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    // Mock: Assume user is free 9-12 and 14-17
    return [
      {
        start: new Date(date.getFullYear(), date.getMonth(), date.getDate(), 9, 0),
        end: new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12, 0),
        status: 'free'
      },
      {
        start: new Date(date.getFullYear(), date.getMonth(), date.getDate(), 14, 0),
        end: new Date(date.getFullYear(), date.getMonth(), date.getDate(), 17, 0),
        status: 'free'
      }
    ];
  }

  /**
   * Create a reminder job in the job queue
   */
  private async createReminderJob(reminder: ReminderSchedule): Promise<void> {
    // Create job in database for tracking
    await this.prisma.jobQueue.create({
      data: {
        jobType: 'REMINDER',
        payload: JSON.stringify(reminder),
        scheduledAt: reminder.scheduledAt,
        status: 'PENDING',
        userId: reminder.userId
      }
    });

    // Schedule job in BullMQ for actual execution
    try {
      const delay = reminder.scheduledAt.getTime() - Date.now();
      
      const reminderJobData: ReminderJobData = {
        taskId: reminder.taskId,
        userId: reminder.userId,
        reminderType: reminder.reminderType,
        scheduledAt: reminder.scheduledAt,
        message: reminder.message || `Reminder: Task requires attention`
      };

      await jobQueueService.scheduleReminder(reminderJobData, delay);
      
      logger.info('Reminder job created in both database and BullMQ', { 
        taskId: reminder.taskId, 
        type: reminder.reminderType, 
        scheduledAt: reminder.scheduledAt 
      });
    } catch (error) {
      logger.error('Failed to schedule reminder in BullMQ', { error, reminder });
      // Job is still tracked in database, but won't execute
    }
  }

  /**
   * Cancel all reminders for a task (when completed or snoozed)
   */
  async cancelReminders(taskId: string): Promise<void> {
    try {
      // Update job queue to cancel pending reminders
      await this.prisma.jobQueue.updateMany({
        where: {
          jobType: 'REMINDER',
          status: 'PENDING',
          payload: {
            contains: `"taskId":"${taskId}"`
          }
        },
        data: {
          status: 'CANCELLED'
        }
      });

      logger.info('Reminders cancelled for task', { taskId });

    } catch (error) {
      logger.error('Failed to cancel reminders', { error, taskId });
      throw error;
    }
  }

  /**
   * Process a reminder job (send reminder to Slack)
   */
  async processReminderJob(jobId: string, payload: string): Promise<void> {
    try {
      const reminder: ReminderSchedule = JSON.parse(payload);
      
      // Check if task still exists and is not completed
      const task = await this.prisma.task.findUnique({
        where: { id: reminder.taskId },
        include: { user: true }
      });

      if (!task || task.status === 'COMPLETED') {
        logger.info('Task completed or deleted, skipping reminder', { 
          taskId: reminder.taskId 
        });
        return;
      }

      // Send reminder to Slack
      await this.sendReminderToSlack(task, reminder.reminderType);

      // Mark task as reminder sent
      await this.prisma.task.update({
        where: { id: reminder.taskId },
        data: { reminderSent: true }
      });

      // Mark job as completed
      await this.prisma.jobQueue.update({
        where: { id: jobId },
        data: { status: 'COMPLETED' }
      });

      logger.info('Reminder processed successfully', { 
        taskId: reminder.taskId, 
        type: reminder.reminderType 
      });

    } catch (error) {
      logger.error('Failed to process reminder job', { error, jobId });
      
      // Mark job as failed
      await this.prisma.jobQueue.update({
        where: { id: jobId },
        data: { 
          status: 'FAILED',
          attempts: { increment: 1 }
        }
      });
      
      throw error;
    }
  }

  /**
   * Send reminder message to Slack
   */
  private async sendReminderToSlack(task: any, reminderType: 'day_before' | 'before_free_time'): Promise<void> {
    const language = task.user.language as 'ja' | 'en' || 'ja';
    
    const messages = {
      day_before: {
        ja: `🔔 **明日の重要タスクのリマインダー**\n\n**${task.title}**\n期限: ${task.dueDate.toLocaleDateString('ja-JP')}\n\n準備はいかがですか？`,
        en: `🔔 **Important Task Reminder for Tomorrow**\n\n**${task.title}**\nDue: ${task.dueDate.toLocaleDateString()}\n\nHow is your preparation going?`
      },
      before_free_time: {
        ja: `⏰ **空き時間前のタスクリマインダー**\n\n**${task.title}**\n\n3時間後に空き時間があります。このタスクに取り組む良いタイミングです！`,
        en: `⏰ **Task Reminder Before Free Time**\n\n**${task.title}**\n\nYou have free time in 3 hours. This would be a good time to work on this task!`
      }
    };

    const messageText = messages[reminderType][language];
    
    try {
      // Import Slack app instance
      const { getSlackApp } = await import('@/app');
      const app = getSlackApp();
      
      if (app?.client) {
        await app.client.chat.postMessage({
          channel: task.user.slackUserId,
          text: messageText,
          blocks: [
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: messageText
              }
            },
            {
              type: 'actions',
              elements: [
                {
                  type: 'button',
                  text: {
                    type: 'plain_text',
                    text: language === 'ja' ? '✅ 完了' : '✅ Complete'
                  },
                  action_id: `complete_task_${task.id}`,
                  value: task.id,
                  style: 'primary'
                },
                {
                  type: 'button',
                  text: {
                    type: 'plain_text',
                    text: language === 'ja' ? '⏰ スヌーズ' : '⏰ Snooze'
                  },
                  action_id: `snooze_task_${task.id}`,
                  value: task.id
                }
              ]
            }
          ]
        });

        logger.info('Reminder sent to Slack', { 
          taskId: task.id, 
          userId: task.user.slackUserId,
          reminderType 
        });
      } else {
        throw new Error('Slack app client not available');
      }

    } catch (error) {
      logger.error('Failed to send reminder to Slack', { 
        error, 
        taskId: task.id,
        reminderType 
      });
      
      // Log the message for manual follow-up
      logger.info('Reminder message (not sent)', { 
        taskId: task.id, 
        reminderType, 
        message: messageText,
        userId: task.user.slackUserId
      });
      
      throw error;
    }
  }

  /**
   * Get all pending reminders for a user
   */
  async getPendingReminders(userId: string): Promise<ReminderSchedule[]> {
    try {
      const jobs = await this.prisma.jobQueue.findMany({
        where: {
          userId,
          jobType: 'REMINDER',
          status: 'PENDING'
        },
        orderBy: {
          scheduledAt: 'asc'
        }
      });

      return jobs.map(job => JSON.parse(job.payload) as ReminderSchedule);

    } catch (error) {
      logger.error('Failed to get pending reminders', { error, userId });
      return [];
    }
  }
}