import { Middleware, SlackEventMiddlewareArgs } from '@slack/bolt';
import { getSlackClient } from '@/utils/getSlackClient';
import { logger } from '@/utils/logger';
import { Histogram } from 'prom-client';
import { register } from 'prom-client';

/**
 * Metrics for bot user ID injection middleware
 */
const botUserIdInjectionDuration = new Histogram({
  name: 'bot_user_id_injection_duration_seconds',
  help: 'Time taken to inject bot user ID into context',
  buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5],
  registers: [register]
});

/**
 * Middleware to inject dynamic botUserId into context
 * This enables OAuth-compatible bot user identification
 */
export const injectBotUserId: Middleware<SlackEventMiddlewareArgs> = async ({ 
  body, 
  context, 
  next 
}) => {
  const startTime = Date.now();
  
  try {
    // Extract team ID from various event types
    const teamId = body.team_id || body.team?.id;
    
    if (!teamId) {
      logger.debug('No team ID found in event, skipping bot user ID injection');
      await next();
      return;
    }

    // Check if botUserId is already in context (from authorize function)
    if (context.botUserId) {
      logger.debug('Bot user ID already in context', { 
        teamId, 
        botUserId: context.botUserId 
      });
      await next();
      return;
    }

    try {
      // Get cached Slack client
      const client = await getSlackClient(teamId);
      
      // Perform auth.test to get bot user ID
      const authResult = await client.auth.test();
      
      if (authResult.ok && authResult.user_id) {
        context.botUserId = authResult.user_id;
        context.botId = authResult.bot_id;
        
        logger.debug('Bot user ID injected into context', {
          teamId,
          botUserId: authResult.user_id,
          botId: authResult.bot_id,
          cached: true // getSlackClient uses cache
        });
      } else {
        logger.warn('auth.test failed or returned no user_id', {
          teamId,
          authResult
        });
      }
    } catch (error) {
      // Log error but don't fail the middleware chain
      logger.error('Failed to inject bot user ID', {
        teamId,
        error: error instanceof Error ? error.message : String(error)
      });
      
      // Try environment variable fallback
      if (process.env.SLACK_BOT_USER_ID) {
        context.botUserId = process.env.SLACK_BOT_USER_ID;
        logger.info('Using environment variable BOT_USER_ID as fallback', {
          teamId,
          botUserId: context.botUserId
        });
      }
    }
  } finally {
    // Record metrics
    const duration = (Date.now() - startTime) / 1000;
    botUserIdInjectionDuration.observe(duration);
  }

  // Continue to next middleware
  await next();
};

/**
 * Get metrics for monitoring
 */
export function getBotUserIdMetrics() {
  return {
    injectionDuration: botUserIdInjectionDuration
  };
}