import { Router } from 'express';
import { googleOAuthService } from '@/services/googleOAuthService';
import { notionOAuthService } from '@/services/notionOAuthService';
import { oauthTokenService } from '@/services/oauthTokenService';
import { logger } from '@/utils/logger';

const router = Router();

/**
 * Initiate Google OAuth flow
 * GET /oauth/google/:provider?userId=xxx
 */
router.get('/google/:provider', async (req, res) => {
  try {
    const { provider } = req.params;
    const { userId } = req.query;

    if (!userId || typeof userId !== 'string') {
      return res.status(400).json({ error: 'userId is required' });
    }

    const validProviders = ['GOOGLE_CALENDAR', 'GOOGLE_DRIVE', 'GMAIL'];
    if (!validProviders.includes(provider)) {
      return res.status(400).json({ error: 'Invalid provider' });
    }

    const authUrl = googleOAuthService.generateAuthUrl(
      userId, 
      provider as 'GOOGLE_CALENDAR' | 'GOOGLE_DRIVE' | 'GMAIL'
    );

    // Redirect user to Google OAuth consent screen
    res.redirect(authUrl);
  } catch (error) {
    logger.error('Failed to initiate Google OAuth', { error, provider: req.params.provider });
    res.status(500).json({ error: 'Failed to initiate OAuth flow' });
  }
});

/**
 * Handle Google OAuth callback
 * GET /oauth/google/callback?code=xxx&state=xxx
 */
router.get('/google/callback', async (req, res) => {
  try {
    const { code, state, error } = req.query;

    // Handle OAuth error
    if (error) {
      logger.error('OAuth error received', { error });
      return res.status(400).send(`
        <html>
          <body>
            <h1>OAuth Error</h1>
            <p>Error: ${error}</p>
            <p>Please try again or contact support.</p>
          </body>
        </html>
      `);
    }

    if (!code || !state || typeof code !== 'string' || typeof state !== 'string') {
      return res.status(400).json({ error: 'Missing code or state parameter' });
    }

    // Process the callback
    const result = await googleOAuthService.handleCallback(code, state);

    if (result.success) {
      // Success page
      res.send(`
        <html>
          <body>
            <h1>OAuth Success!</h1>
            <p>Successfully connected ${result.provider} for user ${result.userId}</p>
            <p>You can now close this window and return to Slack.</p>
            <script>
              // Auto-close window after 3 seconds
              setTimeout(() => {
                window.close();
              }, 3000);
            </script>
          </body>
        </html>
      `);
    } else {
      throw new Error('OAuth callback processing failed');
    }
  } catch (error) {
    logger.error('Failed to handle Google OAuth callback', { error });
    res.status(500).send(`
      <html>
        <body>
          <h1>OAuth Error</h1>
          <p>Failed to process OAuth callback. Please try again.</p>
          <p>Error: ${error instanceof Error ? error.message : 'Unknown error'}</p>
        </body>
      </html>
    `);
  }
});

/**
 * Get user's connected providers
 * GET /oauth/providers/:userId
 */
router.get('/providers/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    const providers = await oauthTokenService.getUserProviders(userId);

    res.json({
      success: true,
      providers
    });
  } catch (error) {
    logger.error('Failed to get user providers', { error, userId: req.params.userId });
    res.status(500).json({ error: 'Failed to get user providers' });
  }
});

/**
 * Test OAuth connection
 * POST /oauth/test/:provider
 */
router.post('/test/:provider', async (req, res) => {
  try {
    const { provider } = req.params;
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    let testResult = false;

    switch (provider) {
      case 'GOOGLE_CALENDAR':
        testResult = await googleOAuthService.testCalendarAccess(userId);
        break;
      default:
        return res.status(400).json({ error: 'Invalid provider for testing' });
    }

    res.json({
      success: true,
      provider,
      testResult,
      message: testResult ? 'Connection test successful' : 'Connection test failed'
    });
  } catch (error) {
    logger.error('Failed to test OAuth connection', { error, provider: req.params.provider });
    res.status(500).json({ error: 'Failed to test OAuth connection' });
  }
});

/**
 * Initiate Notion OAuth flow
 * GET /oauth/notion?userId=xxx
 */
router.get('/notion', async (req, res) => {
  try {
    const { userId } = req.query;

    if (!userId || typeof userId !== 'string') {
      return res.status(400).json({ error: 'userId is required' });
    }

    const authUrl = notionOAuthService.generateAuthUrl(userId);

    // Redirect user to Notion OAuth consent screen
    res.redirect(authUrl);
  } catch (error) {
    logger.error('Failed to initiate Notion OAuth', { error });
    res.status(500).json({ error: 'Failed to initiate OAuth flow' });
  }
});

/**
 * Handle Notion OAuth callback
 * GET /oauth/notion/callback?code=xxx&state=xxx
 */
router.get('/notion/callback', async (req, res) => {
  try {
    const { code, state, error } = req.query;

    // Handle OAuth error
    if (error) {
      logger.error('Notion OAuth error received', { error });
      return res.status(400).send(`
        <html>
          <body>
            <h1>OAuth Error</h1>
            <p>Error: ${error}</p>
            <p>Please try again or contact support.</p>
          </body>
        </html>
      `);
    }

    if (!code || !state || typeof code !== 'string' || typeof state !== 'string') {
      return res.status(400).json({ error: 'Missing code or state parameter' });
    }

    // Process the callback
    const result = await notionOAuthService.handleCallback(code, state);

    if (result.success) {
      // Success page
      res.send(`
        <html>
          <body>
            <h1>OAuth Success!</h1>
            <p>Successfully connected Notion for user ${result.userId}</p>
            <p>You can now close this window and return to Slack.</p>
            <script>
              // Auto-close window after 3 seconds
              setTimeout(() => {
                window.close();
              }, 3000);
            </script>
          </body>
        </html>
      `);
    } else {
      throw new Error('OAuth callback processing failed');
    }
  } catch (error) {
    logger.error('Failed to handle Notion OAuth callback', { error });
    res.status(500).send(`
      <html>
        <body>
          <h1>OAuth Error</h1>
          <p>Failed to process OAuth callback. Please try again.</p>
          <p>Error: ${error instanceof Error ? error.message : 'Unknown error'}</p>
        </body>
        </html>
      `);
  }
});

/**
 * Test OAuth connection
 * POST /oauth/test/:provider
 */
router.post('/test/:provider', async (req, res) => {
  try {
    const { provider } = req.params;
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    let testResult = false;

    switch (provider) {
      case 'GOOGLE_CALENDAR':
        testResult = await googleOAuthService.testCalendarAccess(userId);
        break;
      case 'NOTION':
        testResult = await notionOAuthService.testNotionAccess(userId);
        break;
      default:
        return res.status(400).json({ error: 'Invalid provider for testing' });
    }

    res.json({
      success: true,
      provider,
      testResult,
      message: testResult ? 'Connection test successful' : 'Connection test failed'
    });
  } catch (error) {
    logger.error('Failed to test OAuth connection', { error, provider: req.params.provider });
    res.status(500).json({ error: 'Failed to test OAuth connection' });
  }
});

/**
 * Revoke OAuth token
 * DELETE /oauth/:provider
 */
router.delete('/:provider', async (req, res) => {
  try {
    const { provider } = req.params;
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    if (provider.startsWith('GOOGLE_')) {
      await googleOAuthService.revokeToken(userId, provider);
    } else if (provider === 'NOTION') {
      await notionOAuthService.revokeToken(userId);
    } else {
      return res.status(400).json({ error: 'Invalid provider' });
    }

    res.json({
      success: true,
      message: `${provider} token revoked successfully`
    });
  } catch (error) {
    logger.error('Failed to revoke OAuth token', { error, provider: req.params.provider });
    res.status(500).json({ error: 'Failed to revoke OAuth token' });
  }
});

export default router;