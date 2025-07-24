import { logger } from '@/utils/logger';
import { getPrismaClient } from '@/config/database';
import { Task, InboxItem } from '@prisma/client';

export interface TaskCard {
  id: string;
  title: string;
  priority: 'P1' | 'P2' | 'P3';
  badges: ('🔥' | '⚡' | '⚠️')[];
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

export interface UserStyle {
  tone: string;
  formality: string;
  patterns: string[];
}

export class TaskService {
  private prisma = getPrismaClient();

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
          status: 'PENDING'
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
        authorId: item.authorId || undefined,
        permalink: item.permalink || undefined,
        channelName: item.channelName || undefined
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
  }): Promise<any> {
    // Calculate expiration (2 business days from now)
    const expiresAt = this.calculateBusinessDaysFromNow(2);
    
    const inboxItem = await this.prisma.inboxItem.create({
      data: {
        slackTs: mentionData.slackTs,
        channelId: mentionData.channelId,
        channelName: mentionData.channelName,
        messageText: mentionData.messageText,
        authorId: mentionData.authorId,
        userId: mentionData.userId,
        status: 'PENDING',
        collectionType: 'MENTION',
        expiresAt
      }
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
      title = `Task from #${inboxItem.channelName || inboxItem.channelId}`;
    }
    
    const task = await this.prisma.task.create({
      data: {
        title,
        description: inboxItem.messageText,
        status: 'PENDING',
        priority: 'P2',
        priorityScore: 0,
        level: 'SUB_TASK',
        userId: inboxItem.userId,
        folderUrls: '[]'
      }
    });
    
    // Calculate and update priority score
    const priorityScore = this.calculatePriorityScore(task);
    await this.prisma.task.update({
      where: { id: task.id },
      data: { priorityScore }
    });
    
    logger.info('Created task from mention', {
      taskId: task.id,
      inboxItemId: inboxItem.id,
      title: task.title
    });
    
    return task;
  }

  /**
   * Generate quick reply options for a mention
   */
  async generateQuickReplies(inboxItem: any): Promise<string[]> {
    // For now, generate simple template-based replies
    // In a real implementation, this would use AI to learn from user's writing style
    
    const user = await this.prisma.user.findUnique({
      where: { id: inboxItem.userId }
    });
    
    const language = user?.language as 'ja' | 'en' || 'ja';
    
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
    await this.prisma.task.update({
      where: { id: taskId },
      data: {
        status: 'COMPLETED',
        updatedAt: new Date()
      }
    });
    
    logger.info('Task completed', { taskId });
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
        }
      });

      return {
        id: inboxItem.id,
        messageText: inboxItem.messageText,
        channelId: inboxItem.channelId,
        timestamp: inboxItem.slackTs,
        authorId: inboxItem.authorId || undefined,
        permalink: inboxItem.permalink || undefined,
        channelName: inboxItem.channelName || undefined
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
   */
  async suggestHierarchy(task: any): Promise<HierarchySuggestion> {
    logger.info('Suggesting hierarchy', { task });

    // Simple heuristics for hierarchy suggestion
    const title = task.title?.toLowerCase() || '';
    const description = task.description?.toLowerCase() || '';
    const content = `${title} ${description}`;

    // Project-level keywords
    if (content.includes('プロジェクト') || content.includes('project') || 
        content.includes('開発') || content.includes('development')) {
      return { level: 'PROJECT' };
    }

    // Mid-task keywords
    if (content.includes('実装') || content.includes('implement') ||
        content.includes('システム') || content.includes('system') ||
        content.includes('機能') || content.includes('feature')) {
      return { level: 'MID_TASK' };
    }

    // Default to sub-task
    return { level: 'SUB_TASK' };
  }

  /**
   * Generate quick reply options (placeholder)
   */
  async generateQuickReplies(context: MessageContext, userStyle: UserStyle): Promise<string[]> {
    logger.info('Generating quick replies', { context, userStyle });
    
    // Simple template-based replies for now
    return [
      '承知しました。確認して対応いたします。',
      'ありがとうございます。検討させていただきます。',
      '詳細を確認して、後ほどご連絡いたします。'
    ];
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

      // TODO: Cancel any pending reminders for this task
    } catch (error) {
      logger.error('Failed to handle task completion', { error, taskId });
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

      // TODO: Reschedule reminders for this task
    } catch (error) {
      logger.error('Failed to handle task snooze', { error, taskId });
      throw error;
    }
  }

  /**
   * Map database task to TaskCard
   */
  private mapTaskToCard(task: any): TaskCard {
    const badges: ('🔥' | '⚡' | '⚠️')[] = [];
    
    // Add badges based on priority and due date
    if (task.priority === 'P1') badges.push('🔥');
    if (task.priorityScore > 0.8) badges.push('⚡');
    
    if (task.dueDate) {
      const now = new Date();
      const daysUntilDue = Math.ceil((task.dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      if (daysUntilDue <= 1) badges.push('⚠️');
    }

    let folderUrls: string[] = [];
    try {
      folderUrls = JSON.parse(task.folderUrls || '[]');
    } catch {
      folderUrls = [];
    }

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