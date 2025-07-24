import { logger } from '@/utils/logger';
import { getPrismaClient } from '@/config/database';

export class InboxCleanupService {
  private prisma = getPrismaClient();

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
    // Run cleanup every hour
    setInterval(async () => {
      try {
        await this.cleanupExpiredInboxItems();
      } catch (error) {
        logger.error('Scheduled cleanup failed', { error });
      }
    }, 60 * 60 * 1000); // 1 hour

    logger.info('Inbox cleanup scheduler started');
  }
}