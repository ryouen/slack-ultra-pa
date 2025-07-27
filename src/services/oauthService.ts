import { InstallProvider } from '@slack/oauth';
import { WebClient } from '@slack/web-api';
import { PrismaClient } from '@prisma/client';
import { config } from '@/config/environment';
import { logger } from '@/utils/logger';
import { getSlackClient as getSlackClientUtil } from '@/utils/getSlackClient';

const prisma = new PrismaClient();

// Create the installation provider
export const installer = new InstallProvider({
  clientId: config.slack.clientId,
  clientSecret: config.slack.clientSecret,
  stateSecret: config.slack.stateSecret,
  installationStore: {
    storeInstallation: async (installation) => {
      logger.info('Storing installation', { 
        teamId: installation.team?.id,
        userId: installation.user.id
      });
      
      if (installation.isEnterpriseInstall && installation.enterprise?.id) {
        // Handle enterprise installation
        await prisma.slackInstallation.create({
          data: {
            enterpriseId: installation.enterprise.id,
            teamId: null,
            installData: JSON.stringify(installation),
          },
        });
        return;
      }
      
      if (installation.team?.id) {
        // Handle workspace installation
        await prisma.slackInstallation.create({
          data: {
            enterpriseId: null,
            teamId: installation.team.id,
            installData: JSON.stringify(installation),
            botToken: installation.bot?.token,
            botId: installation.bot?.id,
            botUserId: installation.bot?.userId,
          },
        });
        return;
      }
      
      throw new Error('Failed to store installation: Missing team or enterprise ID');
    },
    
    fetchInstallation: async (installQuery) => {
      logger.info('Fetching installation', { 
        teamId: installQuery.teamId,
        enterpriseId: installQuery.enterpriseId
      });
      
      if (installQuery.isEnterpriseInstall && installQuery.enterpriseId) {
        // Handle enterprise installation fetch
        const installation = await prisma.slackInstallation.findFirst({
          where: {
            enterpriseId: installQuery.enterpriseId,
          },
        });
        
        if (!installation) {
          throw new Error('Failed to fetch enterprise installation');
        }
        
        return JSON.parse(installation.installData);
      }
      
      if (installQuery.teamId) {
        // Handle workspace installation fetch
        const installation = await prisma.slackInstallation.findFirst({
          where: {
            teamId: installQuery.teamId,
          },
        });
        
        if (!installation) {
          throw new Error(`Failed to fetch installation for team: ${installQuery.teamId}`);
        }
        
        return JSON.parse(installation.installData);
      }
      
      throw new Error('Failed to fetch installation: Missing team or enterprise ID');
    },
    
    deleteInstallation: async (installQuery) => {
      logger.info('Deleting installation', { 
        teamId: installQuery.teamId,
        enterpriseId: installQuery.enterpriseId
      });
      
      if (installQuery.isEnterpriseInstall && installQuery.enterpriseId) {
        // Handle enterprise installation deletion
        await prisma.slackInstallation.deleteMany({
          where: {
            enterpriseId: installQuery.enterpriseId,
          },
        });
        return;
      }
      
      if (installQuery.teamId) {
        // Handle workspace installation deletion
        await prisma.slackInstallation.deleteMany({
          where: {
            teamId: installQuery.teamId,
          },
        });
        return;
      }
      
      throw new Error('Failed to delete installation: Missing team or enterprise ID');
    },
  },
});

/**
 * Get a WebClient instance for a specific team
 * @deprecated Use getSlackClient from '@/utils/getSlackClient' instead
 */
export async function getSlackClient(teamId: string): Promise<WebClient> {
  // Delegate to the new utility function
  return getSlackClientUtil(teamId);
}

/**
 * Send a direct message to a user
 */
export async function sendDirectMessage(teamId: string, userId: string, text: string): Promise<void> {
  try {
    const client = await getSlackClient(teamId);
    
    // Open a DM channel with the user
    const conversationResponse = await client.conversations.open({
      users: userId,
    });
    
    if (!conversationResponse.ok || !conversationResponse.channel?.id) {
      throw new Error(`Failed to open DM channel with user: ${userId}`);
    }
    
    // Send message to the DM channel
    await client.chat.postMessage({
      channel: conversationResponse.channel.id,
      text,
    });
    
    logger.info('Sent direct message', { userId, teamId });
  } catch (error) {
    logger.error('Failed to send direct message', { userId, teamId, error });
    throw error;
  }
}