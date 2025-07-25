/**
 * Get channel ID from Slack interaction body
 * Handles both channel messages and DMs properly
 */
export function getChannelId(body: any): string {
  // For actions from ephemeral messages, channel might be in container
  if (body.container?.channel_id) {
    return body.container.channel_id;
  }
  
  // For DMs, channel might not exist in body.channel
  // In that case, use the user ID as channel ID
  return body.channel?.id || body.user?.id || body.user_id;
}

/**
 * Get user ID from Slack interaction body
 */
export function getUserId(body: any): string {
  return body.user?.id || body.user_id;
}