import { App } from '@slack/bolt';
import { config } from '@/config/environment';
import { logger } from '@/utils/logger';
import { setupRoutes } from '@/routes';
import { initializeDatabase } from '@/config/database';
import { initializeJobQueue } from '@/config/jobQueue';
import { initializeMetrics } from '@/config/metrics';

/**
 * Main application entry point
 * Slack Personal Assistant AI - Kiro Competition Entry
 */
async function startApp(): Promise<void> {
  try {
    logger.info('🚀 Starting Slack Personal Assistant...');

    // Initialize database connection
    await initializeDatabase();
    logger.info('✅ Database initialized');

    // Initialize job queue (disabled for development)
    // await initializeJobQueue();
    logger.info('✅ Job queue skipped (development mode)');

    // Initialize metrics collection
    initializeMetrics();
    logger.info('✅ Metrics initialized');

    // Initialize inbox cleanup service
    const { InboxCleanupService } = await import('@/services/inboxCleanupService');
    const inboxCleanup = new InboxCleanupService();
    inboxCleanup.scheduleCleanup();
    logger.info('✅ Inbox cleanup service started');

    // Initialize Slack Bolt app
    const app = new App({
      token: config.slack.botToken,
      signingSecret: config.slack.signingSecret,
      socketMode: config.slack.socketMode,
      appToken: config.slack.appToken,
      port: config.server.port,
    });

    // Add a simple health check endpoint
    if (app.receiver && 'router' in app.receiver) {
      app.receiver.router.get('/health', (req: any, res: any) => {
        res.json({ status: 'ok', timestamp: new Date().toISOString() });
      });
    }

    // Setup routes and handlers
    setupRoutes(app);
    logger.info('✅ Routes configured');

    // Start the app
    await app.start();
    
    logger.info(`⚡️ Slack Personal Assistant is running on port ${config.server.port}!`);
    logger.info('🎯 Ready to help users focus on what they should really be doing');

  } catch (error) {
    logger.error('❌ Failed to start application:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  logger.info('🛑 Received SIGINT, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  logger.info('🛑 Received SIGTERM, shutting down gracefully...');
  process.exit(0);
});

// Start the application
void startApp();