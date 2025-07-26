import { getPrismaClient } from '@/config/database';
import { Installation, InstallationQuery } from '@slack/bolt';
import { logger } from '@/utils/logger';

/**
 * Slack Installation Store using Prisma
 * Handles OAuth installation data storage and retrieval
 */
export class SlackInstallationStore {
  private get prisma() {
    return getPrismaClient();
  }

  /**
   * Store Slack installation data
   */
  async storeInstallation(installation: Installation): Promise<void> {
    try {
      const teamId = installation.team?.id;
      const enterpriseId = installation.enterprise?.id || null;

      if (!teamId) {
        throw new Error('Installation missing team ID');
      }

      await this.prisma.slackInstallation.upsert({
        where: {
          teamId_enterpriseId: {
            teamId,
            enterpriseId
          }
        },
        update: {
          installData: JSON.stringify(installation),
          botToken: installation.bot?.token,
          botId: installation.bot?.id,
          botUserId: installation.bot?.userId,
          updatedAt: new Date()
        },
        create: {
          teamId,
          enterpriseId,
          installData: JSON.stringify(installation),
          botToken: installation.bot?.token,
          botId: installation.bot?.id,
          botUserId: installation.bot?.userId
        }
      });

      logger.info('Slack installation stored successfully', {
        teamId,
        enterpriseId,
        botId: installation.bot?.id
      });
    } catch (error) {
      logger.error('Failed to store Slack installation', { error, installation });
      throw error;
    }
  }

  /**
   * Fetch Slack installation data
   * Returns undefined if not found (as expected by Bolt)
   */
  async fetchInstallation(query: InstallationQuery<boolean>): Promise<Installation | undefined> {
    try {
      const { teamId, enterpriseId } = query;

      if (!teamId) {
        return undefined;
      }

      const record = await this.prisma.slackInstallation.findUnique({
        where: {
          teamId_enterpriseId: {
            teamId,
            enterpriseId: enterpriseId || null
          }
        }
      });

      if (!record) {
        logger.debug('Slack installation not found', { teamId, enterpriseId });
        return undefined;
      }

      const installation = JSON.parse(record.installData) as Installation;
      
      logger.debug('Slack installation fetched successfully', {
        teamId,
        enterpriseId,
        botId: installation.bot?.id
      });

      return installation;
    } catch (error) {
      logger.error('Failed to fetch Slack installation', { error, query });
      return undefined; // Return undefined on error to allow fallback
    }
  }

  /**
   * Delete Slack installation (for token revocation)
   */
  async deleteInstallation(query: InstallationQuery<boolean>): Promise<void> {
    try {
      const { teamId, enterpriseId } = query;

      if (!teamId) {
        return;
      }

      await this.prisma.slackInstallation.delete({
        where: {
          teamId_enterpriseId: {
            teamId,
            enterpriseId: enterpriseId || null
          }
        }
      });

      logger.info('Slack installation deleted successfully', { teamId, enterpriseId });
    } catch (error) {
      logger.error('Failed to delete Slack installation', { error, query });
      throw error;
    }
  }
}

// Export singleton instance
export const slackInstallationStore = new SlackInstallationStore();