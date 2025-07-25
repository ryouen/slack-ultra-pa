import { App } from '@slack/bolt';
import { logger } from '@/utils/logger';
import { LLMClassifier } from '@/services/llmClassifier';
import { ReplyGenerator } from '@/services/replyGenerator';
import { SlackUtils } from '@/utils/slackUtils';

/**
 * Quick Reply MVP - メッセージハンドラー
 * ユーザーがメンションされた時にQuick Reply機能を提供
 */
export function registerQuickReplyHandler(app: App): void {
  app.event('app_mention', async ({ event, client, context }) => {
    try {
      logger.info('Quick Reply: app_mention event received', {
        user: event.user,
        channel: event.channel,
        text: event.text
      });

      // LLMで分類
      const classifier = new LLMClassifier();
      const classification = await classifier.classify(event.text);
      
      logger.info('Quick Reply: Message classified', {
        type: classification.type,
        hasDates: !!classification.dates
      });

      // Permalink取得
      const permalink = await SlackUtils.getPermalink(client, {
        channel: event.channel,
        ts: event.thread_ts || event.ts
      });

      // エフェメラルUI生成
      const replyGenerator = new ReplyGenerator();
      const blocks = await replyGenerator.generate(
        classification, 
        event,
        permalink
      );

      // エフェメラル送信
      await client.chat.postEphemeral({
        channel: event.channel,
        user: event.user,
        blocks,
        text: 'Quick Reply オプション', // フォールバック
        thread_ts: event.thread_ts || event.ts
      });

      logger.info('Quick Reply: Ephemeral message sent');

    } catch (error) {
      logger.error('Quick Reply: Error handling mention', { error });
      
      // エラー時のフォールバック
      try {
        await client.chat.postEphemeral({
          channel: event.channel,
          user: event.user,
          text: '申し訳ございません。返信案の生成中にエラーが発生しました。',
          thread_ts: event.thread_ts || event.ts
        });
      } catch (fallbackError) {
        logger.error('Quick Reply: Fallback error message failed', { fallbackError });
      }
    }
  });

  // 通常メッセージでのメンション検出（既存ユーザー向け）
  app.message(async ({ message, client }) => {
    // Type guard
    if (!('text' in message) || !('user' in message)) return;

    try {
      // ボット自身のIDを取得
      const authResult = await client.auth.test();
      const botUserId = authResult.user_id;

      // メンション検出
      const mentionRegex = /<@([UW][A-Z0-9]+)>/g;
      const mentions = [...message.text.matchAll(mentionRegex)];

      // 現在のユーザーへのメンションを探す
      for (const mention of mentions) {
        const mentionedUserId = mention[1];
        
        // ボット自身へのメンションは app_mention で処理されるのでスキップ
        if (mentionedUserId === botUserId) continue;
        
        // メンションされたユーザーに対してQuick Reply提供
        await processUserMention(client, message, mentionedUserId);
      }
    } catch (error) {
      logger.error('Quick Reply: Error in message handler', { error });
    }
  });
}

/**
 * ユーザーメンション処理
 */
async function processUserMention(
  client: any, 
  message: any, 
  mentionedUserId: string
): Promise<void> {
  try {
    // メンションされたユーザーの情報取得
    const userInfo = await client.users.info({ user: mentionedUserId });
    if (!userInfo.ok || userInfo.user.is_bot) return;

    // LLM分類
    const classifier = new LLMClassifier();
    const classification = await classifier.classify(message.text);

    // Permalink取得
    const permalink = await SlackUtils.getPermalink(client, {
      channel: message.channel,
      ts: message.thread_ts || message.ts
    });

    // エフェメラルUI生成
    const replyGenerator = new ReplyGenerator();
    const blocks = await replyGenerator.generate(
      classification,
      message,
      permalink
    );

    // メンションされたユーザーにエフェメラル送信
    await client.chat.postEphemeral({
      channel: message.channel,
      user: mentionedUserId,
      blocks,
      text: 'Quick Reply オプション',
      thread_ts: message.thread_ts || message.ts
    });

    logger.info('Quick Reply: Sent to mentioned user', {
      mentionedUser: mentionedUserId,
      messageTs: message.ts
    });

  } catch (error) {
    logger.error('Quick Reply: Error processing user mention', { 
      error, 
      mentionedUserId 
    });
  }
}