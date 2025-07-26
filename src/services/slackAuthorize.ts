import { Authorize } from '@slack/bolt';
import { slackInstallationStore } from './slackInstallationStore';
import { logger } from '@/utils/logger';

/**
 * Slack authorization function with OAuth + env token fallback
 * Supports both OAuth installations and environment token
 */
export const authorize: Authorize = async ({ teamId, enterpriseId }) => {
  try {
    // Try OAuth installation first
    const installation = await slackInstallationStore.fetchInstallation({
      teamId: teamId!,
      enterpriseId
    });

    if (installation) {
      logger.info(`[authorize] team ${teamId} via DB (OAuth)`);
      logger.debug('Using OAuth installation for authorization', { teamId, enterpriseId });
      return {
        botToken: installation.bot?.token!,
        botId: installation.bot?.id!,
        botUserId: installation.bot?.userId!,
        teamId: teamId!,
        enterpriseId
      };
    }

    // Fallback to environment token
    const envBotToken = process.env.SLACK_BOT_TOKEN;
    const envBotId = process.env.SLACK_BOT_ID;
    const envBotUserId = process.env.SLACK_BOT_USER_ID;

    if (envBotToken && envBotId && envBotUserId) {
      logger.info(`[authorize] team ${teamId} via ENV (fallback)`);
      logger.debug('Using environment token for authorization', { teamId, enterpriseId });
      return {
        botToken: envBotToken,
        botId: envBotId,
        botUserId: envBotUserId,
        teamId: teamId!,
        enterpriseId
      };
    }

    // No authorization found
    logger.error(`[authorize] team ${teamId} - NO AUTH AVAILABLE`);
    logger.error('No Slack authorization found', { teamId, enterpriseId });
    throw new Error(`No installation found for team ${teamId} and no fallback token available`);

  } catch (error) {
    logger.error('Slack authorization failed', { error, teamId, enterpriseId });
    throw error;
  }
};