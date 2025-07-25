import { App } from '@slack/bolt';
import { config } from '@/config/environment';
import { logger } from '@/utils/logger';
import { setupRoutes } from '@/routes';
import { initializeDatabase } from '@/config/database';
import { initializeJobQueue } from '@/config/jobQueue';
import { initializeMetrics } from '@/config/metrics';
import { findAvailablePort } from '@/utils/portFinder';

/**
 * Main application entry point
 * Slack Personal Assistant AI - Kiro Competition Entry
 */
export async function startApp(): Promise<void> {
  try {
    logger.info('Starting Slack Personal Assistant...');

    // Initialize database connection
    await initializeDatabase();
    logger.info('Database initialized');

    // Initialize job queue (disabled for development)
    // await initializeJobQueue();
    logger.info('Job queue skipped (development mode)');

    // Initialize metrics collection
    initializeMetrics();
    logger.info('Metrics initialized');

    // Initialize inbox cleanup service
    const { InboxCleanupService } = await import('@/services/inboxCleanupService');
    inboxCleanupInstance = new InboxCleanupService();
    inboxCleanupInstance.scheduleCleanup();
    logger.info('Inbox cleanup service started');

    // Find available port (in development, try to find an available port)
    const port = config.server.nodeEnv === 'development' 
      ? await findAvailablePort(config.server.port)
      : config.server.port;

    // Initialize Slack Bolt app
    const app = new App({
      token: config.slack.botToken,
      signingSecret: config.slack.signingSecret,
      socketMode: config.slack.socketMode,
      appToken: config.slack.appToken,
      port: port,
    });

    // Add HTTP mode endpoints
    if (app.receiver && 'router' in app.receiver) {
      // Health check endpoint
      app.receiver.router.get('/health', (req: any, res: any) => {
        res.json({ status: 'ok', timestamp: new Date().toISOString() });
      });

      // Slack events endpoint (for HTTP mode)
      app.receiver.router.post('/slack/events', (req: any, res: any, next: any) => {
        // Handle URL verification challenge
        if (req.body?.type === 'url_verification') {
          logger.info('Handling URL verification challenge');
          res.json({ challenge: req.body.challenge });
          return;
        }
        
        logger.info('Received Slack event', { 
          type: req.body?.type,
          event: req.body?.event?.type 
        });
        next();
      });

      // Slack commands endpoint (for HTTP mode)
      app.receiver.router.post('/slack/commands', (req: any, res: any, next: any) => {
        logger.info('Received Slack command', { 
          command: req.body?.command,
          user_id: req.body?.user_id 
        });
        next();
      });

      // OAuth redirect endpoint
      app.receiver.router.get('/slack/oauth/redirect', (req: any, res: any) => {
        logger.info('OAuth redirect received', { query: req.query });
        res.send('OAuth redirect received');
      });
    }

    // Setup routes and handlers
    await setupRoutes(app);
    logger.info('Routes configured');

    // Store app instance globally
    appInstance = app;
    
    // Start the app with custom server options
    await app.start(port);
    
    logger.info(`Slack Personal Assistant is running on port ${port}`);
    logger.info('Ready to help users focus on what they should really be doing');
    
    // Display connection status
    try {
      const authInfo = await app.client.auth.test();
      const { getPrismaClient } = await import('@/config/database');
      const prisma = getPrismaClient();
      const mentionCount = await prisma.inboxItem.count({ where: { status: 'PENDING' } });
      const taskCount = await prisma.task.count({ where: { status: 'PENDING' } });
      
      console.log(`[READY] @${authInfo.user} | ${mentionCount} pending mentions, ${taskCount} active tasks`);
    } catch {
      console.log(`[READY] Port ${port}`);
    }

  } catch (error) {
    logger.error('Failed to start application:', error);
    process.exit(1);
  }
}

// Store app instance for cleanup
let appInstance: App | null = null;
let inboxCleanupInstance: any = null;
let cleanupInProgress = false;

// Graceful shutdown handler
async function gracefulShutdown(signal: string) {
  if (cleanupInProgress) {
    return;
  }
  
  cleanupInProgress = true;
  console.log(`\n[SHUTDOWN] Received ${signal}, shutting down gracefully...`);
  
  try {
    // Stop the Slack app properly
    if (appInstance) {
      console.log('[SHUTDOWN] Stopping Slack app...');
      await appInstance.stop();
    }
    
    // Stop inbox cleanup service
    if (inboxCleanupInstance) {
      console.log('[SHUTDOWN] Stopping inbox cleanup service...');
      inboxCleanupInstance.stopCleanup();
    }
    
    console.log('[SHUTDOWN] Cleanup complete. Exiting...');
    process.exit(0);
  } catch (error) {
    console.error('[SHUTDOWN] Error during cleanup:', error);
    process.exit(1);
  }
}

// Set up signal handlers BEFORE starting the app
process.on('SIGINT', () => void gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => void gracefulShutdown('SIGTERM'));

// Windows-specific handling
if (process.platform === 'win32') {
  const rl = require('readline').createInterface({
    input: process.stdin,
    output: process.stdout
  });

  rl.on('SIGINT', () => {
    process.emit('SIGINT');
  });
}

// Start the application
void startApp();