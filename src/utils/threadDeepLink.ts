import { logger } from '@/utils/logger';

/**
 * Convert standard Slack permalink to desktop deep-link format
 * 
 * Standard permalink: https://workspace.slack.com/archives/CHANNEL_ID/pTIMESTAMP
 * Desktop deep-link: slack://channel?team=TEAM_ID&id=CHANNEL_ID&message=TIMESTAMP&tab=thread_ts
 * 
 * Desktop deep-link opens directly in Slack app with thread panel focused
 */
export function convertToThreadDeepLink(permalink: string, teamId: string): string | null {
  try {
    // Parse permalink
    const match = permalink.match(/\/archives\/([A-Z0-9]+)\/p(\d+)$/);
    if (!match) {
      logger.warn('Invalid permalink format', { permalink });
      return null;
    }

    const [, channelId, timestampRaw] = match;
    
    if (!channelId || !timestampRaw) {
      logger.warn('Invalid match results', { channelId, timestampRaw });
      return null;
    }
    
    // Convert timestamp from p1753492647822919 to 1753492647.822919
    const timestamp = timestampRaw.slice(0, 10) + '.' + timestampRaw.slice(10);
    
    // Build desktop deep-link using slack:// protocol with tab=thread_ts
    const threadDeepLink = `slack://channel?team=${teamId}&id=${channelId}&message=${timestamp}&tab=thread_ts`;
    
    logger.info('Converted to desktop deep-link with thread focus', {
      original: permalink,
      deepLink: threadDeepLink,
      channelId,
      timestamp
    });
    
    return threadDeepLink;
  } catch (error) {
    logger.error('Failed to convert permalink', { error, permalink });
    return null;
  }
}

/**
 * Extract channel ID and timestamp from permalink
 */
export function parsePermalink(permalink: string): { channelId: string; timestamp: string } | null {
  const match = permalink.match(/\/archives\/([A-Z0-9]+)\/p(\d+)$/);
  if (!match) {
    return null;
  }
  
  const [, channelId, timestampRaw] = match;
  
  if (!channelId || !timestampRaw) {
    return null;
  }
  
  const timestamp = timestampRaw.slice(0, 10) + '.' + timestampRaw.slice(10);
  
  return { channelId, timestamp };
}