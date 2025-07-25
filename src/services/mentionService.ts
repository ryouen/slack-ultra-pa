import { WebClient } from '@slack/web-api';
import { logger } from '@/utils/logger';
import { InboxItem } from '@/types';
import { getPrismaClient } from '@/config/database';
import { config } from '@/config/environment';

export class MentionService {
  private client: WebClient;
  private prisma = getPrismaClient();

  constructor(client: WebClient) {
    this.client = client;
  }

  /**
   * Get recent mentions from database (collected via Event API)
   * Note: search.messages is enterprise-only, so we rely on Event API collection
   */
  async getRecentMentions(userId: string, hours: number = 48): Promise<InboxItem[]> {
    try {
      const afterDate = new Date(Date.now() - (hours * 60 * 60 * 1000));
      
      logger.info('Getting recent mentions from database', { 
        userId, 
        hours,
        afterDate 
      });

      const mentions = await this.prisma.inboxItem.findMany({
        where: {
          userId,
          collectionType: 'MENTION',
          createdAt: { gte: afterDate }
        },
        orderBy: { createdAt: 'desc' },
        take: 50 // Limit to 50 most recent
      });

      // Update permalinks for mentions that don't have them
      for (const mention of mentions) {
        if (!mention.permalink && mention.channelId && mention.slackTs) {
          try {
            const permalinkResult = await this.client.chat.getPermalink({
              channel: mention.channelId,
              message_ts: mention.slackTs
            });
            
            await this.prisma.inboxItem.update({
              where: { id: mention.id },
              data: { permalink: permalinkResult.permalink }
            });
            
            mention.permalink = permalinkResult.permalink;
          } catch (error) {
            logger.warn('Failed to get permalink', { 
              error, 
              channelId: mention.channelId,
              ts: mention.slackTs 
            });
          }
        }
      }

      return mentions;
    } catch (error) {
      logger.error('Error getting recent mentions', { error, userId });
      throw error;
    }
  }

  /**
   * Get mentions from database with filters
   */
  async getMentions(userId: string, filter: 'all' | 'unread' = 'all', hours?: number): Promise<InboxItem[]> {
    try {
      const where: any = {
        userId,
        collectionType: 'MENTION',
        status: 'PENDING'
      };

      // Add time filter if specified
      if (hours) {
        const afterDate = new Date(Date.now() - (hours * 60 * 60 * 1000));
        where.createdAt = { gte: afterDate };
      }

      // Add unread filter
      if (filter === 'unread') {
        where.hasReplied = false;
      }

      const mentions = await this.prisma.inboxItem.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: 20 // Limit to 20 most recent
      });

      logger.info('Found mentions', { 
        count: mentions.length,
        filter,
        hours,
        where
      });

      return mentions;
    } catch (error) {
      logger.error('Error getting mentions', { error, userId });
      throw error;
    }
  }

  /**
   * Check if user has replied to a thread
   */
  async checkReplyStatus(channelId: string, threadTs: string, userId: string): Promise<boolean> {
    try {
      const result = await this.client.conversations.replies({
        channel: channelId,
        ts: threadTs
      });

      if (!result.messages) return false;

      // Check if user has replied
      const hasReplied = result.messages.some(msg => msg.user === userId);
      
      return hasReplied;
    } catch (error) {
      logger.warn('Failed to check reply status', { error, channelId, threadTs });
      return false;
    }
  }

  /**
   * Update reply status for a mention
   */
  async updateReplyStatus(mentionId: string, hasReplied: boolean, replyCount?: number): Promise<void> {
    try {
      await this.prisma.inboxItem.update({
        where: { id: mentionId },
        data: {
          hasReplied,
          replyCount: replyCount || 0,
          lastReplyTs: hasReplied ? new Date().toISOString() : undefined
        }
      });
    } catch (error) {
      logger.error('Error updating reply status', { error, mentionId });
      throw error;
    }
  }

  /**
   * Mark mention as read/archived
   */
  async markAsRead(mentionId: string): Promise<void> {
    try {
      await this.prisma.inboxItem.update({
        where: { id: mentionId },
        data: {
          status: 'ARCHIVED'
        }
      });
    } catch (error) {
      logger.error('Error marking as read', { error, mentionId });
      throw error;
    }
  }

  /**
   * Convert mention to task
   */
  async convertToTask(mentionId: string): Promise<string> {
    try {
      const mention = await this.prisma.inboxItem.findUnique({
        where: { id: mentionId }
      });

      if (!mention) {
        throw new Error('Mention not found');
      }

      // Create task from mention
      const task = await this.prisma.task.create({
        data: {
          title: `Reply to ${mention.channelName}: ${mention.messageText.substring(0, 50)}...`,
          description: mention.messageText,
          userId: mention.userId,
          priority: mention.importance === 'high' ? 'P1' : mention.importance === 'medium' ? 'P2' : 'P3',
          priorityScore: mention.importance === 'high' ? 0.8 : mention.importance === 'medium' ? 0.5 : 0.3,
          level: 'SUB_TASK',
          folderUrls: JSON.stringify([mention.permalink].filter(Boolean))
        }
      });

      // Update mention with task reference
      await this.prisma.inboxItem.update({
        where: { id: mentionId },
        data: {
          isTaskCreated: true,
          taskId: task.id
        }
      });

      return task.id;
    } catch (error) {
      logger.error('Error converting to task', { error, mentionId });
      throw error;
    }
  }

  /**
   * Determine importance of a mention based on content
   */
  private determineImportance(text: string): string {
    const urgentKeywords = ['urgent', '緊急', 'asap', '至急', 'important', '重要'];
    const highPriorityKeywords = ['tomorrow', '明日', 'today', '今日', 'deadline', '締切'];
    
    const lowerText = text.toLowerCase();
    
    if (urgentKeywords.some(keyword => lowerText.includes(keyword))) {
      return 'high';
    }
    
    if (highPriorityKeywords.some(keyword => lowerText.includes(keyword))) {
      return 'medium';
    }
    
    return 'low';
  }
}