import { WebClient } from '@slack/web-api';
import { Block, KnownBlock } from '@slack/bolt';
import { logger } from './logger';

/**
 * Send a reply message that handles both channels and DMs appropriately
 * - For channels: Uses ephemeral messages (only visible to the user)
 * - For DMs: Uses regular messages (since ephemeral is not supported in DMs)
 */
export async function sendReply(
  client: WebClient,
  channel: string | undefined,
  user: string,
  payload: {
    text: string;
    blocks?: (KnownBlock | Block)[];
    thread_ts?: string;
  }
): Promise<void> {
  try {
    if (!channel) {
      // No channel ID - open DM with user
      logger.info('No channel ID, opening DM with user', { user });
      const im = await client.conversations.open({ users: user });
      if (!im.ok || !im.channel?.id) {
        throw new Error('Failed to open DM channel');
      }
      
      await client.chat.postMessage({
        channel: im.channel.id,
        ...payload
      });
      return;
    }

    // Check if it's a DM channel (starts with 'D')
    if (channel.startsWith('D')) {
      logger.info('DM channel detected, opening conversation with user', { channel, user });
      // For DM channels, we need to open a conversation with the user
      try {
        const im = await client.conversations.open({ users: user });
        if (!im.ok || !im.channel?.id) {
          throw new Error('Failed to open DM channel');
        }
        
        logger.info('Sending message to DM', { dmChannel: im.channel.id, user });
        await client.chat.postMessage({
          channel: im.channel.id,
          ...payload
        });
      } catch (dmError) {
        // If opening DM fails, try with the original channel ID
        logger.warn('Failed to open DM, trying with original channel', { dmError, channel });
        await client.chat.postMessage({
          channel,
          ...payload
        });
      }
    } else {
      // Public/private channel - use ephemeral
      logger.info('Sending ephemeral message to channel', { channel, user });
      await client.chat.postEphemeral({
        channel,
        user,
        ...payload
      });
    }
  } catch (error) {
    logger.error('Failed to send reply', { 
      error, 
      channel, 
      user,
      isDM: channel?.startsWith('D') || !channel
    });
    
    // Fallback: try to send as regular message if ephemeral fails
    if (channel && !channel.startsWith('D')) {
      try {
        logger.info('Ephemeral failed, trying regular message', { channel });
        await client.chat.postMessage({
          channel,
          ...payload,
          text: `@${user} ${payload.text}` // Mention user in fallback
        });
      } catch (fallbackError) {
        logger.error('Fallback message also failed', { fallbackError });
        throw fallbackError;
      }
    } else {
      throw error;
    }
  }
}