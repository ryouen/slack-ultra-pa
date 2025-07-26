import { App, ExpressReceiver } from '@slack/bolt';
import { config } from '@/config/environment';
import { logger } from '@/utils/logger';
import { setupRoutes } from '@/routes';
import { jobQueueService } from '@/services/jobQueueService';
import { initializeDatabase } from '@/config/database';
import { initializeMetrics } from '@/config/metrics';
import { initializeTracing } from '@/config/tracing';
import { authorize } from '@/services/slackAuthorize';
import { slackInstallationStore } from '@/services/slackInstallationStore';
import express from 'express';
import apiRoutes from '@/routes/api';

// Feature flag for OAuth
const isOAuthEnabled = process.env.SLACK_OAUTH_ENABLED === 'true';

// Initialize Slack app with conditional OAuth support
let app: App;

if (isOAuthEnabled) {
  logger.info('Initializing Slack app with OAuth support');
  
  // Create ExpressReceiver for OAuth support (simplified)
  const receiver = new ExpressReceiver({
    signingSecret: config.slack.signingSecret,
    endpoints: {
      events: '/slack/events',
      commands: '/slack/commands',
      actions: '/slack/actions'
    }
  });

  app = new App({
    receiver,
    authorize, // Use authorize function for OAuth + fallback
    socketMode: false // OAuth requires HTTP mode
  });
} else {
  logger.info('Initializing Slack app with environment token');
  
  app = new App({
    token: config.slack.botToken,
    signingSecret: config.slack.signingSecret,
    socketMode: config.slack.socketMode,
    appToken: config.slack.appToken,
    port: config.server.port,
  });
}

// Initialize Express app for REST API
const expressApp = express();
expressApp.use(express.json());
expressApp.use('/', apiRoutes);

async function startApp() {
  try {
    // Initialize observability
    initializeTracing();
    initializeMetrics();
    logger.info('Observability initialized');

    // Initialize database
    await initializeDatabase();
    logger.info('Database initialized');
    
    // Initialize job queue service
    await jobQueueService.initialize();
    logger.info('Job queue service initialized');

    // Setup Slack routes
    await setupRoutes(app);
    logger.info('Slack routes configured');

    // Setup error handling for token revocation
    app.error(async (error) => {
      if (error.code === 'slack_webapi_platform_error' && error.data?.error === 'invalid_auth') {
        const teamId = error.data?.team || 'UNKNOWN';
        logger.error(`Slack token revoked for team ${teamId}`, { error });
        
        // Delete invalid installation
        if (isOAuthEnabled) {
          try {
            await slackInstallationStore.deleteInstallation({ teamId });
            logger.info(`Deleted invalid installation for team ${teamId}`);
          } catch (deleteError) {
            logger.error('Failed to delete invalid installation', { deleteError, teamId });
          }
        }
      } else {
        logger.error('Slack app error', { error });
      }
    });

    // Start Slack app
    await app.start();
    logger.info(`Slack app is running on port ${config.server.port}`);

    // Setup Slack OAuth routes (if enabled)
    if (isOAuthEnabled) {
      const oauthIntegration = require('./server/oauthIntegration').default;
      oauthIntegration(expressApp);
    }

    // Start Express server for REST API
    const expressPort = config.server.port + 100; // Use port offset of 100 to avoid conflicts
    expressApp.listen(expressPort, () => {
      logger.info(`REST API server running on port ${expressPort}`);
      if (isOAuthEnabled) {
        logger.info(`Slack OAuth available at http://localhost:${expressPort}/slack/install`);
      }
    });

    // Graceful shutdown handling
    process.on('SIGTERM', async () => {
      logger.info('SIGTERM received, shutting down gracefully...');
      await jobQueueService.shutdown();
      await app.stop();
      process.exit(0);
    });

    process.on('SIGINT', async () => {
      logger.info('SIGINT received, shutting down gracefully...');
      await jobQueueService.shutdown();
      await app.stop();
      process.exit(0);
    });

  } catch (error) {
    logger.error('Failed to start application', { 
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    process.exit(1);
  }
}

// Start the application
startApp();