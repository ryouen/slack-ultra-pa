import { RespondFn } from '@slack/bolt';
import { logger } from './logger';

interface ErrorHandlerOptions {
  respond?: RespondFn;
  userId?: string;
  teamId?: string;
  isOAuthEnabled?: boolean;
  installUrl?: string;
}

/**
 * Handle Slack authentication errors with user-friendly messages
 */
export async function handleSlackAuthError(
  error: any,
  options: ErrorHandlerOptions
): Promise<void> {
  const { respond, userId, teamId, isOAuthEnabled, installUrl } = options;

  // Log the error
  logger.error('Slack authentication error', {
    error: error.message || error,
    teamId,
    userId,
    errorCode: error.data?.error
  });

  // If we can't respond to the user, just log and return
  if (!respond) {
    return;
  }

  try {
    if (error.data?.error === 'invalid_auth' || error.data?.error === 'not_authed') {
      // Authentication error - provide reinstall instructions
      if (isOAuthEnabled && installUrl) {
        await respond({
          response_type: 'ephemeral',
          text: '⚠️ 認証エラーが発生しました / Authentication Error',
          blocks: [
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: '⚠️ *認証エラーが発生しました*\n\nアプリのトークンが無効になっている可能性があります。'
              }
            },
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: '以下のリンクからアプリを再インストールしてください：'
              }
            },
            {
              type: 'actions',
              elements: [
                {
                  type: 'button',
                  text: {
                    type: 'plain_text',
                    text: '🔄 アプリを再インストール',
                    emoji: true
                  },
                  url: installUrl,
                  action_id: 'reinstall_app'
                }
              ]
            },
            {
              type: 'context',
              elements: [
                {
                  type: 'mrkdwn',
                  text: 'エラーコード: `invalid_auth` | Team ID: ' + (teamId || 'unknown')
                }
              ]
            }
          ]
        });
      } else {
        // OAuth not enabled - generic error message
        await respond({
          response_type: 'ephemeral',
          text: '⚠️ 認証エラーが発生しました。管理者にお問い合わせください。',
          blocks: [
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: '⚠️ *認証エラーが発生しました*\n\nアプリのトークンが無効になっている可能性があります。\nワークスペースの管理者にお問い合わせください。'
              }
            }
          ]
        });
      }
    } else if (error.data?.error === 'missing_scope') {
      // Missing permissions
      await respond({
        response_type: 'ephemeral',
        text: '⚠️ 権限不足エラー / Missing Permissions',
        blocks: [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: '⚠️ *権限不足エラー*\n\nこの操作に必要な権限がありません。アプリを再インストールしてください。'
            }
          },
          {
            type: 'context',
            elements: [
              {
                type: 'mrkdwn',
                text: `必要なスコープ: ${error.data?.needed || 'unknown'}`
              }
            ]
          }
        ]
      });
    } else {
      // Generic error
      await respond({
        response_type: 'ephemeral',
        text: '⚠️ エラーが発生しました',
        blocks: [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: '⚠️ *エラーが発生しました*\n\n申し訳ございません。予期しないエラーが発生しました。'
            }
          },
          {
            type: 'context',
            elements: [
              {
                type: 'mrkdwn',
                text: `エラー: ${error.message || 'Unknown error'}`
              }
            ]
          }
        ]
      });
    }
  } catch (respondError) {
    logger.error('Failed to send error message to user', {
      error: respondError,
      originalError: error.message
    });
  }
}

/**
 * Get install URL for the current deployment
 */
export function getInstallUrl(baseUrl?: string): string {
  const base = baseUrl || process.env.BASE_URL || 'http://localhost:3000';
  return `${base}/slack/install`;
}