import express from 'express';
import { installer } from '@/services/oauthService';
import { logger } from '@/utils/logger';

const router = express.Router();

/**
 * Handle OAuth redirect
 */
router.get('/slack/oauth/redirect', async (req, res) => {
  try {
    logger.info('Received OAuth redirect', { 
      code: !!req.query.code, 
      state: !!req.query.state 
    });
    
    // Handle the OAuth callback
    await installer.handleCallback(req, res);
    
    // The installer.handleCallback will handle the response
    // so we don't need to send anything here
  } catch (error) {
    logger.error('OAuth redirect error', { error });
    res.status(500).send(`<html><body><h1>OAuth Error</h1><p>Failed to complete OAuth flow: ${error}</p></body></html>`);
  }
});

/**
 * Handle OAuth install
 */
router.get('/slack/install', async (req, res) => {
  try {
    logger.info('Received install request');
    
    // Generate the installation URL
    const url = await installer.generateInstallUrl({
      scopes: [
        'app_mentions:read',
        'channels:history',
        'channels:read',
        'chat:write',
        'commands',
        'im:history',
        'im:read',
        'im:write',
        'users:read',
        'users:read.email'
      ],
      userScopes: [],
    });
    
    // Redirect to the installation URL
    res.redirect(url);
  } catch (error) {
    logger.error('Install request error', { error });
    res.status(500).send(`<html><body><h1>Installation Error</h1><p>Failed to generate installation URL: ${error}</p></body></html>`);
  }
});

export default router;