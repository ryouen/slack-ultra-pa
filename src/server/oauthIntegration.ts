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

    logger.info('OAuth environment variables check', {
      hasClientId: !!clientId,
      clientIdLength: clientId?.length || 0,
      hasClientSecret: !!clientSecret,
      clientSecretLength: clientSecret?.length || 0,
      hasStateSecret: !!stateSecret,
      stateSecretLength: stateSecret?.length || 0
    });

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
      installerOptions: {
        redirectUriPath: '/slack/oauth/callback' // Explicit redirect URI path
      },
      installUrlOptions: {
        redirectUri: process.env.SLACK_REDIRECT_URI!, // Required in newer versions
        metadata: '', // Optional
        userScopes: [], // Not using user tokens
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
      }
    });

    // Set up OAuth routes
    expressApp.get('/slack/oauth/start', async (req, res) => {
      try {
        await installer.handleInstallPath(req, res);
      } catch (error) {
        logger.error('Slack OAuth start failed', { 
          error,
          errorMessage: error instanceof Error ? error.message : 'Unknown error',
          errorStack: error instanceof Error ? error.stack : undefined,
          errorCode: (error as any)?.code
        });
        res.status(500).send('OAuth initialization failed');
      }
    });

    // Add both callback routes to handle different redirect paths
    expressApp.get('/slack/oauth/callback', async (req, res) => {
      try {
        logger.info('OAuth callback received at /slack/oauth/callback', { 
          query: req.query,
          headers: req.headers.host
        });
        await installer.handleCallback(req, res);
      } catch (error) {
        logger.error('Slack OAuth callback failed', { 
          error,
          errorMessage: error instanceof Error ? error.message : 'Unknown error',
          errorStack: error instanceof Error ? error.stack : undefined,
          errorCode: (error as any)?.code,
          query: req.query
        });
        res.status(500).send('OAuth callback failed');
      }
    });
    
    // Also handle /oauth/redirect (without /slack prefix)
    expressApp.get('/oauth/redirect', async (req, res) => {
      try {
        logger.info('OAuth callback received at /oauth/redirect', { 
          query: req.query,
          headers: req.headers.host
        });
        await installer.handleCallback(req, res);
      } catch (error) {
        logger.error('Slack OAuth callback failed', { 
          error,
          errorMessage: error instanceof Error ? error.message : 'Unknown error',
          errorStack: error instanceof Error ? error.stack : undefined,
          errorCode: (error as any)?.code,
          query: req.query
        });
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