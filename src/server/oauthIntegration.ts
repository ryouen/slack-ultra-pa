import express from 'express';
import { InstallProvider } from '@slack/oauth';
import { slackInstallationStore } from '@/services/slackInstallationStore';
import { logger } from '@/utils/logger';

/**
 * Slack OAuth Integration for Express server
 * Adds OAuth routes to existing Express app (port 3100)
 */
export default function initOAuth(expressApp: express.Application): void {
  try {
    // Check if OAuth is enabled
    const isOAuthEnabled = process.env.SLACK_OAUTH_ENABLED === 'true';
    
    if (!isOAuthEnabled) {
      logger.info('Slack OAuth disabled, skipping OAuth routes setup');
      return;
    }

    // Validate required environment variables
    const clientId = process.env.SLACK_CLIENT_ID;
    const clientSecret = process.env.SLACK_CLIENT_SECRET;
    const stateSecret = process.env.SLACK_STATE_SECRET;

    if (!clientId || !clientSecret || !stateSecret) {
      logger.warn('Slack OAuth credentials missing, skipping OAuth setup', {
        hasClientId: !!clientId,
        hasClientSecret: !!clientSecret,
        hasStateSecret: !!stateSecret
      });
      return;
    }

    // Create InstallProvider
    const installer = new InstallProvider({
      clientId,
      clientSecret,
      stateSecret,
      // Remove logger: console as it causes compatibility issues
      installationStore: {
        storeInstallation: async (installation) => {
          await slackInstallationStore.storeInstallation(installation);
        },
        fetchInstallation: async (query) => {
          return await slackInstallationStore.fetchInstallation(query);
        },
        deleteInstallation: async (query) => {
          await slackInstallationStore.deleteInstallation(query);
        }
      },
      scopes: [
        'app_mentions:read',
        'channels:history',
        'channels:read',
        'chat:write',
        'commands',
        'groups:history',
        'groups:read',
        'im:history',
        'im:read',
        'im:write',
        'mpim:history',
        'mpim:read',
        'users:read'
      ]
    });

    // Set up OAuth routes
    expressApp.get('/slack/oauth/start', async (req, res) => {
      try {
        await installer.handleInstallPath(req, res);
      } catch (error) {
        logger.error('Slack OAuth start failed', { error });
        res.status(500).send('OAuth initialization failed');
      }
    });

    expressApp.get('/slack/oauth/callback', async (req, res) => {
      try {
        await installer.handleCallback(req, res);
      } catch (error) {
        logger.error('Slack OAuth callback failed', { error });
        res.status(500).send('OAuth callback failed');
      }
    });

    // Add install route for convenience
    expressApp.get('/slack/install', (req, res) => {
      res.redirect('/slack/oauth/start');
    });

    logger.info('Slack OAuth routes configured successfully', {
      routes: ['/slack/oauth/start', '/slack/oauth/callback', '/slack/install']
    });

  } catch (error) {
    logger.error('Failed to setup Slack OAuth', { error });
    throw error;
  }
}