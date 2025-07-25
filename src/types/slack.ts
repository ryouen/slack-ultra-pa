// Slack-specific type definitions to replace 'any' usage

import { WebClient } from '@slack/web-api';
import { App } from '@slack/bolt';

/**
 * Slack command payload with proper typing
 */
export interface SlackCommand {
  token: string;
  team_id: string;
  team_domain: string;
  channel_id: string;
  channel_name: string;
  user_id: string;
  user_name: string;
  command: string;
  text: string;
  api_app_id: string;
  is_enterprise_install: string;
  response_url: string;
  trigger_id: string;
}

/**
 * Slack action payload
 */
export interface SlackAction {
  type: string;
  action_id: string;
  block_id: string;
  text?: {
    type: string;
    text: string;
    emoji?: boolean;
  };
  value?: string;
  action_ts: string;
}

/**
 * Slack body for actions
 */
export interface SlackActionBody {
  type: string;
  user: {
    id: string;
    username: string;
    name: string;
    team_id: string;
  };
  api_app_id: string;
  token: string;
  container: {
    type: string;
    message_ts?: string;
    channel_id?: string;
    is_ephemeral?: boolean;
  };
  trigger_id: string;
  team: {
    id: string;
    domain: string;
  };
  enterprise?: {
    id: string;
    name: string;
  };
  is_enterprise_install: boolean;
  channel: {
    id: string;
    name: string;
  };
  message?: {
    type: string;
    subtype?: string;
    text?: string;
    ts: string;
    username?: string;
    bot_id?: string;
    blocks?: any[];
  };
  state?: {
    values: Record<string, Record<string, any>>;
  };
  response_url: string;
  actions: SlackAction[];
}

/**
 * Slack message event
 */
export interface SlackMessageEvent {
  type: 'message';
  subtype?: string;
  channel: string;
  user: string;
  text: string;
  ts: string;
  event_ts: string;
  team: string;
  blocks?: any[];
  thread_ts?: string;
  parent_user_id?: string;
  bot_id?: string;
}

/**
 * Slack Block Kit button
 */
export interface SlackButton {
  type: 'button';
  text: {
    type: 'plain_text';
    text: string;
    emoji?: boolean;
  };
  action_id: string;
  value?: string;
  url?: string;
  style?: 'primary' | 'danger';
  confirm?: {
    title: {
      type: 'plain_text';
      text: string;
    };
    text: {
      type: 'plain_text' | 'mrkdwn';
      text: string;
    };
    confirm: {
      type: 'plain_text';
      text: string;
    };
    deny: {
      type: 'plain_text';
      text: string;
    };
  };
}

/**
 * Type guard for Slack action body
 */
export function isSlackActionBody(body: any): body is SlackActionBody {
  return body && 
         typeof body === 'object' && 
         'type' in body && 
         'user' in body && 
         'actions' in body &&
         Array.isArray(body.actions);
}

/**
 * Type guard for Slack message event
 */
export function isSlackMessageEvent(event: any): event is SlackMessageEvent {
  return event &&
         typeof event === 'object' &&
         event.type === 'message' &&
         'channel' in event &&
         'user' in event &&
         'text' in event;
}

/**
 * Typed Slack API response handlers
 */
export interface SlackApiResponse<T = any> {
  ok: boolean;
  error?: string;
  response_metadata?: {
    warnings?: string[];
  };
  data?: T;
}

/**
 * Extract channel ID from various Slack payloads
 */
export function extractChannelId(body: any): string | undefined {
  if ('channel' in body && body.channel) {
    return typeof body.channel === 'string' ? body.channel : body.channel.id;
  }
  if ('container' in body && body.container?.channel_id) {
    return body.container.channel_id;
  }
  if ('message' in body && body.message?.channel) {
    return body.message.channel;
  }
  return undefined;
}

/**
 * Extract user ID from various Slack payloads
 */
export function extractUserId(body: any): string | undefined {
  if ('user' in body) {
    return typeof body.user === 'string' ? body.user : body.user?.id;
  }
  if ('user_id' in body) {
    return body.user_id;
  }
  return undefined;
}