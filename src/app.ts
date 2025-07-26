import { App } from '@slack/bolt';
import { config } from '@/config/environment';
import { logger } from '@/utils/logger';
import { setupRoutes } from '@/routes';
import { jobQueueService } from '@/services/jobQueueService';
import { initializeDatabase } from '@/config/database';
import { initializeMetrics } from '@/config/metrics';
import { initializeTracing } from '@/config/tracing';
import express from 'express';
import apiRoutes from '@/routes/api';

// Initialize Slack app
const app = new App({
  token: config.slack.botToken,
  signingSecret: config.slack.signingSecret,
  socketMode: config.slack.socketMode,
  appToken: config.slack.appToken,
  port: config.server.port,
});

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

    // Start Slack app
    await app.start();
    logger.info(`Slack app is running on port ${config.server.port}`);

    // Start Express server for REST API
    const expressPort = config.server.port + 100; // Use port offset of 100 to avoid conflicts
    expressApp.listen(expressPort, () => {
      logger.info(`REST API server running on port ${expressPort}`);
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