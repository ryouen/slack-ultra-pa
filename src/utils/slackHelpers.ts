import { WebClient } from '@slack/web-api';
import { logger } from '@/utils/logger';

/**
 * Get user's language preference from Slack profile
 */
export async function getSlackLanguage(client: WebClient, userId: string): Promise<'ja' | 'en'> {
  try {
    const result = await client.users.info({ user: userId });
    const locale = result.user?.locale;
    
    // Check if locale starts with 'ja'
    if (locale && locale.startsWith('ja')) {
      return 'ja';
    }
    
    return 'en';
  } catch (error) {
    logger.warn('Failed to get user locale', { error, userId });
    return 'ja'; // Default to Japanese
  }
}

/**
 * Format timestamp for display
 */
export function formatTimestamp(timestamp: Date, language: 'ja' | 'en'): string {
  const options: Intl.DateTimeFormatOptions = {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  };
  
  const locale = language === 'ja' ? 'ja-JP' : 'en-US';
  return timestamp.toLocaleString(locale, options);
}

/**
 * Get relative time string
 */
export function getRelativeTime(date: Date, language: 'ja' | 'en'): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffDays > 7) {
    return formatTimestamp(date, language);
  } else if (diffDays > 0) {
    return language === 'ja' ? `${diffDays}日前` : `${diffDays} days ago`;
  } else if (diffHours > 0) {
    return language === 'ja' ? `${diffHours}時間前` : `${diffHours} hours ago`;
  } else if (diffMins > 0) {
    return language === 'ja' ? `${diffMins}分前` : `${diffMins} minutes ago`;
  } else {
    return language === 'ja' ? 'たった今' : 'just now';
  }
}

/**
 * Truncate text with ellipsis
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + '...';
}

/**
 * Extract user IDs from mention text
 */
export function extractMentionedUsers(text: string): string[] {
  const mentionPattern = /<@([A-Z0-9]+)>/g;
  const matches = text.matchAll(mentionPattern);
  return Array.from(matches, m => m[1]);
}

/**
 * Check if text contains urgent keywords
 */
export function isUrgent(text: string, language: 'ja' | 'en'): boolean {
  const urgentKeywords = language === 'ja' 
    ? ['緊急', '至急', '急ぎ', '今すぐ', 'ASAP', 'asap']
    : ['urgent', 'asap', 'ASAP', 'immediately', 'critical'];
  
  const lowerText = text.toLowerCase();
  return urgentKeywords.some(keyword => lowerText.includes(keyword.toLowerCase()));
}

/**
 * Parse Slack timestamp
 */
export function parseSlackTimestamp(ts: string): Date {
  const seconds = parseFloat(ts);
  return new Date(seconds * 1000);
}

/**
 * Generate Slack timestamp from Date
 */
export function generateSlackTimestamp(date: Date): string {
  return (date.getTime() / 1000).toString();
}