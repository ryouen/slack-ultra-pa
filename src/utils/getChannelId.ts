/**
 * Get channel ID from Slack interaction body
 * Returns undefined for DMs to handle them separately
 */
export function getChannelId(body: any): string | undefined {
  // For actions from ephemeral messages, channel might be in container
  if (body.container?.channel_id) {
    return body.container.channel_id;
  }
  
  // For regular messages/commands
  return body.channel?.id;
  // Note: Returns undefined for DMs - caller should handle this case
}

/**
 * Get user ID from Slack interaction body
 */
export function getUserId(body: any): string {
  return body.user?.id || body.user_id;
}