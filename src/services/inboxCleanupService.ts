import { logger } from '@/utils/logger';
import { getPrismaClient } from '@/config/database';

export class InboxCleanupService {
  private prisma = getPrismaClient();
  private cleanupInterval: NodeJS.Timeout | null = null;

  /**
   * Clean up expired inbox items (2 business days old)
   */
  async cleanupExpiredInboxItems(): Promise<void> {
    try {
      logger.info('Starting inbox cleanup process');

      const now = new Date();
      
      // Find expired inbox items
      const expiredItems = await this.prisma.inboxItem.findMany({
        where: {
          status: 'PENDING',
          expiresAt: {
            lte: now
          }
        },
        include: {
          user: true
        }
      });

      if (expiredItems.length === 0) {
        logger.info('No expired inbox items found');
        return;
      }

      // Delete expired items
      const deletedCount = await this.prisma.inboxItem.deleteMany({
        where: {
          id: {
            in: expiredItems.map(item => item.id)
          }
        }
      });

      logger.info('Cleaned up expired inbox items', {
        deletedCount: deletedCount.count,
        expiredItems: expiredItems.map(item => ({
          id: item.id,
          userId: item.userId,
          channelId: item.channelId,
          expiresAt: item.expiresAt
        }))
      });

      // Optionally notify users about cleanup
      // This could be implemented later if needed
      
    } catch (error) {
      logger.error('Failed to cleanup expired inbox items', { error });
      throw error;
    }
  }

  /**
   * Schedule cleanup to run periodically
   */
  scheduleCleanup(): void {
    // Clear any existing interval
    this.stopCleanup();
    
    // Run cleanup every hour
    this.cleanupInterval = setInterval(async () => {
      try {
        await this.cleanupExpiredInboxItems();
      } catch (error) {
        logger.error('Scheduled cleanup failed', { error });
      }
    }, 60 * 60 * 1000); // 1 hour

    // Run initial cleanup
    this.cleanupExpiredInboxItems().catch(error => {
      logger.error('Initial cleanup failed', { error });
    });

    logger.info('Inbox cleanup scheduler started');
  }

  /**
   * Stop the cleanup scheduler
   */
  stopCleanup(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
      logger.info('Inbox cleanup scheduler stopped');
    }
  }
}