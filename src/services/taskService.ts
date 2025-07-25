import { logger } from '@/utils/logger';
import { getPrismaClient } from '@/config/database';
import { AIReplyService } from './aiReplyService';
import { config } from '@/config/environment';
import { safeJsonParse, safeJsonStringify } from '@/utils/jsonHelpers';
import { Block, KnownBlock } from '@slack/bolt';

export interface TaskCard {
  id: string;
  title: string;
  priority: 'P1' | 'P2' | 'P3';
  badges: ('[URGENT]')[];
  dueDate?: Date;
  folderUrls: string[];
  actions: string[];
  priorityScore: number;
  level: string;
  description?: string;
}

export interface SlackMention {
  userId: string;
  channelId: string;
  messageText: string;
  timestamp: string;
  authorId?: string;
  permalink?: string;
  channelName?: string;
}

export interface InboxEntry {
  id: string;
  messageText: string;
  channelId: string;
  timestamp: string;
  authorId?: string;
  permalink?: string;
  channelName?: string;
}

export interface HierarchySuggestion {
  level: 'PROJECT' | 'MID_TASK' | 'SUB_TASK';
  suggestedParent?: string;
}

export interface MessageContext {
  channelId: string;
  userId: string;
  messageText: string;
}

export interface SmartReplyResponse {
  type: 'scheduling_request' | 'generic_request';
  ui: (KnownBlock | Block)[];
  replies?: string[]; // 互換性のため
}

export interface UserStyle {
  tone: string;
  formality: string;
  patterns: string[];
}

export class TaskService {
  private prisma = getPrismaClient();
  private aiReplyService: AIReplyService | null = null;

  /**
   * Get daily top 5 priority tasks for a user
   */
  async getDailyTop5Tasks(userId: string): Promise<TaskCard[]> {
    try {
      logger.info('Getting daily top 5 tasks', { userId });

      const tasks = await this.prisma.task.findMany({
        where: {
          userId,
          status: {
            in: ['PENDING', 'IN_PROGRESS']
          }
        },
        orderBy: [
          { priorityScore: 'desc' },
          { priority: 'asc' },
          { createdAt: 'desc' }
        ],
        take: 5
      });

      return tasks.map(task => this.mapTaskToCard(task));
    } catch (error) {
      logger.error('Failed to get daily top 5 tasks', { error, userId });
      return [];
    }
  }

  /**
   * Get tasks count for a user
   */
  async getTasksCount(userId: string): Promise<number> {
    try {
      return await this.prisma.task.count({
        where: {
          userId,
          status: {
            in: ['PENDING', 'IN_PROGRESS']
          }
        }
      });
    } catch (error) {
      logger.error('Failed to get tasks count', { error, userId });
      return 0;
    }
  }

  /**
   * Collect mentions from the past 3 business days
   */
  async collectRecentMentions(userId: string): Promise<InboxEntry[]> {
    try {
      logger.info('Collecting recent mentions for user', { userId });

      // Calculate 3 business days ago
      const threeDaysAgo = this.getBusinessDaysAgo(3);

      const inboxItems = await this.prisma.inboxItem.findMany({
        where: {
          userId,
          createdAt: {
            gte: threeDaysAgo
          },
          status: 'PENDING' // Only show items that haven't been converted or ignored
        },
        orderBy: {
          createdAt: 'desc'
        },
        take: 10 // Limit to 10 most recent
      });

      return inboxItems.map(item => ({
        id: item.id,
        messageText: item.messageText,
        channelId: item.channelId,
        timestamp: item.slackTs,
        authorId: (item as any).authorId || undefined,
        permalink: (item as any).permalink || undefined,
        channelName: (item as any).channelName || undefined
      }));
    } catch (error) {
      logger.error('Failed to collect recent mentions', { error, userId });
      return [];
    }
  }

  /**
   * Create inbox item from mention
   */
  async createInboxFromMention(mentionData: {
    slackTs: string;
    channelId: string;
    channelName?: string;
    messageText: string;
    authorId?: string;
    userId: string;
    permalink?: string;
    threadTs?: string;
  }): Promise<any> {
    // First check if inbox item already exists
    const existingItem = await this.prisma.inboxItem.findUnique({
      where: { slackTs: mentionData.slackTs }
    });

    if (existingItem) {
      logger.info('Inbox item already exists for this mention', {
        inboxItemId: existingItem.id,
        slackTs: mentionData.slackTs
      });
      return existingItem;
    }

    // Calculate expiration (2 business days from now)
    const expiresAt = this.calculateBusinessDaysFromNow(2);

    const inboxItem = await this.prisma.inboxItem.create({
      data: {
        slackTs: mentionData.slackTs,
        channelId: mentionData.channelId,
        channelName: mentionData.channelName,
        messageText: mentionData.messageText,
        authorId: mentionData.authorId,
        permalink: mentionData.permalink,
        threadTs: mentionData.threadTs,
        userId: mentionData.userId,
        status: 'PENDING',
        collectionType: 'MENTION',
        expiresAt
      } as any
    });

    logger.info('Created inbox item from mention', {
      inboxItemId: inboxItem.id,
      userId: mentionData.userId,
      channelId: mentionData.channelId,
      expiresAt
    });

    return inboxItem;
  }

  /**
   * Create task from mention inbox item
   */
  async createTaskFromMention(inboxItem: any): Promise<any> {
    // Check if already converted to task
    if (inboxItem.status === 'CONVERTED_TO_TASK') {
      // Find the existing task
      const existingTask = await this.prisma.task.findFirst({
        where: {
          userId: inboxItem.userId,
          description: inboxItem.messageText,
          status: {
            not: 'COMPLETED'
          }
        }
      });
      
      if (existingTask) {
        logger.info('Task already exists for this mention', {
          taskId: existingTask.id,
          inboxItemId: inboxItem.id
        });
        return existingTask;
      }
    }

    // Extract task title from message text (remove mentions and clean up)
    let title = inboxItem.messageText
      .replace(/<@[UW][A-Z0-9]+>/g, '') // Remove user mentions
      .replace(/<#[C][A-Z0-9]+\|[^>]+>/g, '') // Remove channel mentions
      .trim();

    // Limit title length
    if (title.length > 100) {
      title = title.substring(0, 97) + '...';
    }

    // If title is empty, use a default
    if (!title) {
      title = `Task from #${(inboxItem as any).channelName || inboxItem.channelId}`;
    }

    // Store source information as metadata
    const sourceMetadata = {
      channelId: inboxItem.channelId,
      channelName: (inboxItem as any).channelName,
      threadTs: (inboxItem as any).threadTs,
      permalink: (inboxItem as any).permalink,
      authorId: (inboxItem as any).authorId
    };

    const task = await this.prisma.task.create({
      data: {
        title,
        description: inboxItem.messageText,
        status: 'PENDING',
        priority: 'P2',
        priorityScore: 0,
        level: 'SUB_TASK',
        userId: inboxItem.userId,
        folderUrls: safeJsonStringify(sourceMetadata) // Store source info in folderUrls temporarily
      }
    });

    // Update inbox item status
    await this.prisma.inboxItem.update({
      where: { id: inboxItem.id },
      data: { status: 'CONVERTED_TO_TASK' }
    });

    // Calculate and update priority score
    const priorityScore = this.calculatePriorityScoreSync(task);
    await this.prisma.task.update({
      where: { id: task.id },
      data: { priorityScore }
    });

    // Schedule reminders if this is a P1 task with due date
    if (task.priority === 'P1' && task.dueDate) {
      try {
        const { ReminderService } = await import('./reminderService');
        const reminderService = new ReminderService();
        await reminderService.scheduleReminders(task.id);
      } catch (error) {
        logger.error('Failed to schedule reminders for new task', { 
          error, 
          taskId: task.id 
        });
        // Don't fail task creation if reminder scheduling fails
      }
    }

    logger.info('Created task from mention', {
      taskId: task.id,
      inboxItemId: inboxItem.id,
      title: task.title,
      priority: task.priority,
      hasReminders: task.priority === 'P1' && !!task.dueDate
    });

    return task;
  }

  /**
   * Generate quick reply options for a mention
   * @deprecated Use MessageAnalyzer and SmartReplyUIBuilder directly for new Smart Reply MVP
   */
  async generateQuickReplies(inboxItem: any): Promise<SmartReplyResponse> {
    const { MessageAnalyzer } = await import('@/llm/MessageAnalyzer');
    const { SmartReplyUIBuilder } = await import('@/ui/SmartReplyUIBuilder');
    
    const analyzer = new MessageAnalyzer();
    const uiBuilder = new SmartReplyUIBuilder();

    const analysis = await analyzer.analyzeMessage(inboxItem.messageText);
    const ui = uiBuilder.buildUI(analysis, inboxItem.messageText, {
      originalTs: inboxItem.slackTs,
      channelId: inboxItem.channelId
    });
    
    // 互換性のため replies も生成
    const replies = analysis.type === 'generic_request' && analysis.intent_variants
      ? Object.values(analysis.intent_variants)
      : ['承知いたしました', 'ありがとうございます', '確認いたします'];

    return { type: analysis.type, ui, replies };
  }

  /**
   * Get template replies as fallback
   */
  private getTemplateReplies(language: 'ja' | 'en'): string[] {
    if (language === 'ja') {
      return [
        'ありがとうございます。確認いたします。',
        '承知いたしました。対応いたします。',
        'お疲れ様です。検討させていただきます。'
      ];
    } else {
      return [
        'Thank you. I will check on this.',
        'Understood. I will take care of it.',
        'Thanks for letting me know. I will review this.'
      ];
    }
  }

  /**
   * Complete a task
   */
  async completeTask(taskId: string): Promise<void> {
    // Use onTaskCompleted which handles the update and logging
    await this.onTaskCompleted(taskId);
  }

  /**
   * Calculate business days from now
   */
  private calculateBusinessDaysFromNow(businessDays: number): Date {
    const result = new Date();
    let daysAdded = 0;

    while (daysAdded < businessDays) {
      result.setDate(result.getDate() + 1);
      const dayOfWeek = result.getDay();

      // Skip weekends (0 = Sunday, 6 = Saturday)
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        daysAdded++;
      }
    }

    return result;
  }

  /**
   * Process a mention and create inbox entry
   */
  async processMention(mention: SlackMention): Promise<InboxEntry> {
    try {
      logger.info('Processing mention', { mention });

      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 2); // 2 days from now

      const inboxItem = await this.prisma.inboxItem.create({
        data: {
          slackTs: mention.timestamp,
          channelId: mention.channelId,
          messageText: mention.messageText,
          status: 'PENDING',
          authorId: mention.authorId,
          permalink: mention.permalink,
          channelName: mention.channelName,
          expiresAt,
          collectionType: 'MENTION',
          userId: mention.userId
        } as any
      });

      return {
        id: inboxItem.id,
        messageText: inboxItem.messageText,
        channelId: inboxItem.channelId,
        timestamp: inboxItem.slackTs,
        authorId: (inboxItem as any).authorId || undefined,
        permalink: (inboxItem as any).permalink || undefined,
        channelName: (inboxItem as any).channelName || undefined
      };
    } catch (error) {
      logger.error('Failed to process mention', { error, mention });
      throw error;
    }
  }

  /**
   * Calculate priority score for a task
   */
  async calculatePriorityScore(task: any): Promise<number> {
    return this.calculatePriorityScoreSync(task);
  }

  /**
   * Calculate priority score for a task (synchronous version)
   */
  calculatePriorityScoreSync(task: any): number {
    let score = 0;

    // Base priority score
    switch (task.priority) {
      case 'P1': score += 0.6; break;
      case 'P2': score += 0.4; break;
      case 'P3': score += 0.2; break;
    }

    // Due date urgency (0.0 to 0.4)
    if (task.dueDate) {
      const now = new Date();
      const daysUntilDue = Math.ceil((task.dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

      if (daysUntilDue <= 0) {
        score += 0.4; // Overdue
      } else if (daysUntilDue <= 1) {
        score += 0.35; // Due today/tomorrow
      } else if (daysUntilDue <= 3) {
        score += 0.25; // Due within 3 days
      } else if (daysUntilDue <= 7) {
        score += 0.15; // Due within a week
      }
    }

    return Math.min(score, 1.0); // Cap at 1.0
  }

  /**
   * Suggest task hierarchy based on content
   * @deprecated Use HierarchyService.analyzeTaskHierarchy instead
   */
  async suggestHierarchy(task: any): Promise<HierarchySuggestion> {
    logger.info('Suggesting hierarchy (deprecated method)', { task });

    // Import hierarchy service
    const { HierarchyService } = await import('./hierarchyService');
    const hierarchyService = new HierarchyService();
    
    // Get user preferences
    const user = await this.prisma.user.findUnique({
      where: { id: task.userId }
    });
    
    // Parse preferences to check if AI is enabled
    const preferences = safeJsonParse(user?.preferences, {});
    const useAI = preferences.hierarchyAI === true;
    
    // Use new hierarchy service
    const result = await hierarchyService.analyzeTaskHierarchy(task, { 
      useAI,
      userId: task.userId 
    });
    
    return {
      level: result.level,
      suggestedParent: result.suggestedParent
    };
  }



  /**
   * Handle task completion
   */
  async onTaskCompleted(taskId: string): Promise<void> {
    try {
      logger.info('Task completed', { taskId });

      await this.prisma.task.update({
        where: { id: taskId },
        data: {
          status: 'COMPLETED',
          updatedAt: new Date()
        }
      });

      // Cancel any pending reminders for this task
      const { ReminderService } = await import('./reminderService');
      const reminderService = new ReminderService();
      await reminderService.cancelReminders(taskId);
    } catch (error) {
      logger.error('Failed to handle task completion', { 
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        taskId 
      });
      throw error;
    }
  }

  /**
   * Handle task snooze
   */
  async onTaskSnoozed(taskId: string): Promise<void> {
    try {
      logger.info('Task snoozed', { taskId });

      await this.prisma.task.update({
        where: { id: taskId },
        data: {
          reminderSent: false,
          updatedAt: new Date()
        }
      });

      // Cancel existing reminders and reschedule
      const { ReminderService } = await import('./reminderService');
      const reminderService = new ReminderService();
      await reminderService.cancelReminders(taskId);
      await reminderService.scheduleReminders(taskId);
    } catch (error) {
      logger.error('Failed to handle task snooze', { error, taskId });
      throw error;
    }
  }

  /**
   * Update task with folder URLs
   */
  async updateTaskFolderUrls(taskId: string, urls: string[]): Promise<void> {
    try {
      await this.prisma.task.update({
        where: { id: taskId },
        data: {
          folderUrls: safeJsonStringify(urls),
          updatedAt: new Date()
        }
      });

      logger.info('Updated task folder URLs', { taskId, urlCount: urls.length });
    } catch (error) {
      logger.error('Failed to update task folder URLs', { error, taskId });
      throw error;
    }
  }

  /**
   * Log folder access
   */
  async logFolderAccess(taskId: string, url: string, userId: string): Promise<void> {
    try {
      // For now, just log to console
      // In a real implementation, this could be stored in a separate table
      logger.info('Folder accessed', {
        taskId,
        url,
        userId,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.error('Failed to log folder access', { error, taskId, url, userId });
    }
  }

  /**
   * Get all pending tasks for a user
   */
  async getAllTasks(userId: string): Promise<TaskCard[]> {
    const tasks = await this.prisma.task.findMany({
      where: {
        userId,
        status: 'PENDING'
      },
      orderBy: [
        { priorityScore: 'desc' },
        { createdAt: 'desc' }
      ],
      take: 20 // Limit to 20 tasks
    });

    return tasks.map(task => this.mapTaskToCard(task));
  }


  /**
   * Get today's tasks count
   */
  async getTodayTasksCount(userId: string): Promise<number> {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    return await this.prisma.task.count({
      where: {
        userId,
        status: 'PENDING',
        OR: [
          {
            dueDate: {
              gte: todayStart,
              lte: todayEnd
            }
          },
          {
            priority: 'P1'
          }
        ]
      }
    });
  }

  /**
   * Map database task to TaskCard
   */
  private mapTaskToCard(task: any): TaskCard {
    const badges: ('[URGENT]')[] = [];

    // Add warning badge for urgent/overdue tasks only
    if (task.dueDate) {
      const now = new Date();
      const daysUntilDue = Math.ceil((task.dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      if (daysUntilDue <= 1) badges.push('[URGENT]');
    }

    const folderUrls = safeJsonParse<string[]>(task.folderUrls, []);

    return {
      id: task.id,
      title: task.title,
      priority: task.priority as 'P1' | 'P2' | 'P3',
      badges,
      dueDate: task.dueDate,
      folderUrls,
      actions: ['complete', 'snooze', 'edit'],
      priorityScore: task.priorityScore,
      level: task.level,
      description: task.description || undefined
    };
  }

  /**
   * Calculate business days ago (excluding weekends)
   */
  private getBusinessDaysAgo(days: number): Date {
    const date = new Date();
    let businessDays = 0;

    while (businessDays < days) {
      date.setDate(date.getDate() - 1);
      const dayOfWeek = date.getDay();

      // Skip weekends (0 = Sunday, 6 = Saturday)
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        businessDays++;
      }
    }

    return date;
  }
}