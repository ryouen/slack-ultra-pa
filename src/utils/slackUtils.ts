import { WebClient } from '@slack/web-api';
import { logger } from '@/utils/logger';

export interface MessageInfo {
  channel: string;
  ts: string;
}

/**
 * Slack関連のユーティリティ関数
 */
export class SlackUtils {
  /**
   * メッセージのpermalinkを取得
   * @param client Slack WebClient
   * @param message メッセージ情報
   * @returns permalink URL、取得失敗時はundefined
   */
  static async getPermalink(
    client: WebClient, 
    message: MessageInfo
  ): Promise<string | undefined> {
    try {
      const result = await client.chat.getPermalink({
        channel: message.channel,
        message_ts: message.ts
      });

      if (result.ok && result.permalink) {
        logger.info('Permalink retrieved', { 
          channel: message.channel, 
          ts: message.ts 
        });
        return result.permalink;
      }
    } catch (error) {
      logger.error('Failed to get permalink', {
        error,
        channel: message.channel,
        ts: message.ts
      });
    }

    return undefined;
  }

  /**
   * エフェメラルメッセージを送信（エラーハンドリング付き）
   */
  static async sendEphemeral(
    client: WebClient,
    params: {
      channel: string;
      user: string;
      text?: string;
      blocks?: any[];
      thread_ts?: string;
    }
  ): Promise<boolean> {
    try {
      const result = await client.chat.postEphemeral({
        channel: params.channel,
        user: params.user,
        text: params.text || 'メッセージ',
        blocks: params.blocks,
        thread_ts: params.thread_ts
      });

      return result.ok || false;
    } catch (error) {
      logger.error('Failed to send ephemeral message', { error, params });
      return false;
    }
  }

  /**
   * メッセージテキストから最初の50文字を抽出（タスクタイトル用）
   */
  static extractTitle(messageText: string): string {
    // メンション、URL、改行を除去
    const cleaned = messageText
      .replace(/<@[UW][A-Z0-9]+>/g, '') // メンション除去
      .replace(/<https?:\/\/[^\s|>]+(\|[^>]+)?>/g, '') // URL除去
      .replace(/\n/g, ' ') // 改行をスペースに
      .trim();

    // 最初の50文字を取得
    if (cleaned.length > 50) {
      return cleaned.substring(0, 47) + '...';
    }
    
    return cleaned || '無題のタスク';
  }

  /**
   * メッセージがスレッド内かどうか判定
   */
  static isInThread(message: any): boolean {
    return !!(message.thread_ts && message.thread_ts !== message.ts);
  }

  /**
   * ユーザー情報を取得（キャッシュ付き）
   */
  private static userCache = new Map<string, any>();

  static async getUserInfo(
    client: WebClient,
    userId: string
  ): Promise<any> {
    // キャッシュチェック
    if (this.userCache.has(userId)) {
      return this.userCache.get(userId);
    }

    try {
      const result = await client.users.info({ user: userId });
      if (result.ok && result.user) {
        // 30分キャッシュ
        this.userCache.set(userId, result.user);
        setTimeout(() => this.userCache.delete(userId), 30 * 60 * 1000);
        return result.user;
      }
    } catch (error) {
      logger.error('Failed to get user info', { error, userId });
    }

    return null;
  }
}