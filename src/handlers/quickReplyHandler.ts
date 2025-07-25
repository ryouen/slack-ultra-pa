import { App } from '@slack/bolt';
import { MessageAnalyzer } from '@/llm/MessageAnalyzer';
import { SmartReplyUIBuilder } from '@/ui/SmartReplyUIBuilder';
import { getPrismaClient } from '@/config/database';
import { logger } from '@/utils/logger';
import { getChannelId, getUserId } from '@/utils/getChannelId';
import { sendReply } from '@/utils/sendReply';

export function setupQuickReplyHandler(app: App, BOT_USER_ID: string): void {
  const messageAnalyzer = new MessageAnalyzer();
  const uiBuilder = new SmartReplyUIBuilder();
  const prisma = getPrismaClient();

  // メッセージイベントハンドラー（ユーザー間メンション検出）
  app.event('message', async ({ event, client }) => {
    // TypeScript型ガード
    if (!('text' in event) || !event.text) return;
    if (!('user' in event) || !event.user) return;
    if (!('channel' in event)) return;
    
    // Bot自身の発言は無視
    if (event.user === BOT_USER_ID) return;

    try {
      // メンション検出（<@UXXXXXX>形式）
      const mentionRegex = /<@([UW][A-Z0-9]+)>/g;
      const mentions = [...event.text.matchAll(mentionRegex)];

      if (mentions.length === 0) return; // メンションがない場合は処理しない

      logger.info('User mentions detected', {
        messageUser: event.user,
        channel: event.channel,
        mentions: mentions.map(m => m[1])
      });

      // 各メンションされたユーザーに対して処理
      for (const mention of mentions) {
        const mentionedUserId = mention[1];
        
        // 自分自身へのメンションはスキップ
        if (mentionedUserId === event.user) continue;
        
        // ボットへのメンションはスキップ（app_mentionで処理される）
        if (mentionedUserId === BOT_USER_ID) continue;

        // メンションされたユーザーの情報を確認
        try {
          const userInfo = await client.users.info({ user: mentionedUserId });
          if (!userInfo.ok || userInfo.user?.is_bot) continue; // ボットへのメンションはスキップ
        } catch (error) {
          logger.warn('Failed to get user info', { mentionedUserId, error });
          continue;
        }

        logger.info('Processing mention for user', {
          mentionedUserId,
          messageTs: event.ts
        });

        // データベースにメンションを保存
        try {
          // ユーザーの取得または作成
          const user = await prisma.user.upsert({
            where: { slackUserId: mentionedUserId },
            update: {},
            create: {
              slackUserId: mentionedUserId,
              timezone: 'Asia/Tokyo',
              language: 'ja',
              preferences: '{}'
            }
          });

          // チャンネル名の取得
          let channelName = event.channel;
          try {
            const channelInfo = await client.conversations.info({ channel: event.channel });
            channelName = channelInfo.channel?.name || event.channel;
          } catch (error) {
            logger.warn('Could not get channel info', { channelId: event.channel, error });
          }

          // Permalinkの取得
          let permalink: string | undefined;
          try {
            const permalinkResult = await client.chat.getPermalink({
              channel: event.channel,
              message_ts: event.ts
            });
            permalink = permalinkResult.permalink;
          } catch (error) {
            logger.warn('Failed to get permalink', { error });
          }

          // InboxItemとして保存
          const expiresAt = new Date();
          expiresAt.setDate(expiresAt.getDate() + 2); // 2日後に期限

          await prisma.inboxItem.create({
            data: {
              slackTs: event.ts,
              channelId: event.channel,
              channelName,
              messageText: event.text,
              authorId: event.user,
              status: 'PENDING',
              collectionType: 'MENTION',
              userId: user.id,
              permalink,
              threadTs: (event as any).thread_ts,
              expiresAt,
              hasReplied: false,
              importance: 'medium'
            }
          });

          logger.info('Mention saved to database', {
            userId: user.id,
            channelId: event.channel
          });
        } catch (dbError) {
          logger.error('Failed to save mention to database', { dbError });
        }

        // メッセージ分析
        const analysis = await messageAnalyzer.analyzeMessage(event.text);

        // UI生成（元のメッセージのmetadataを渡す）
        const blocks = uiBuilder.buildUI(analysis, event.text, {
          originalTs: event.ts,
          channelId: event.channel
        });

        // メンションされたユーザーに送信（チャンネル/DM対応）
        await sendReply(client, event.channel, mentionedUserId, {
          blocks,
          text: 'Quick Reply オプション' // フォールバック
        });

        logger.info('Quick reply sent to mentioned user', {
          mentionedUserId,
          messageTs: event.ts
        });
      }

    } catch (error) {
      logger.error('Quick reply handler error:', error);
    }
  });

  // タスク追加アクション
  app.action('add_task_from_smart_reply', async ({ ack, body, client }) => {
    await ack();

    try {
      // TypeScript型アサーション
      const typedBody = body as any;
      const meta = JSON.parse(typedBody.actions[0].value);
      
      // Slack User IDから内部User IDを取得/作成
      const slackUserId = typedBody.user.id;
      const user = await prisma.user.upsert({
        where: { slackUserId },
        update: {},
        create: { 
          slackUserId, 
          timezone: 'Asia/Tokyo',
          language: 'ja',
          preferences: '{}'
        }
      });

      // Permalink取得
      const permalink = await client.chat.getPermalink({
        channel: typedBody.channel.id,
        message_ts: typedBody.message.ts
      });

      // Task作成
      const task = await prisma.task.create({
        data: {
          title: meta.title,
          slackPermalink: permalink.permalink,
          dueDate: meta.dueDate ? new Date(meta.dueDate) : null,
          status: 'PENDING',
          priority: 'P2',
          level: 'SUB_TASK',
          priorityScore: 0,
          userId: user.id,
          folderUrls: '[]'
        }
      });

      await sendReply(client, getChannelId(body), getUserId(body), {
        text: `📝 タスクを追加しました：「${meta.title}」`
      });

      logger.info('Task created from smart reply', {
        taskId: task.id,
        userId: user.id
      });

    } catch (error) {
      logger.error('Task creation error:', error);
      
      await sendReply(client, getChannelId(body), getUserId(body), {
        text: '⚠️ タスクの追加に失敗しました。後ほどもう一度お試しください。'
      });
    }
  });

  // app_mentionイベントハンドラー（追加）
  app.event('app_mention', async ({ event, client }) => {
    // Bot自身の発言は無視
    if (event.user === BOT_USER_ID) return;

    try {
      logger.info('Quick reply: Processing app_mention', {
        user: event.user,
        channel: event.channel,
        text: event.text
      });

      // メッセージ分析
      const analysis = await messageAnalyzer.analyzeMessage(event.text);
      
      // UI生成（元のメッセージのmetadataを渡す）
      const blocks = uiBuilder.buildUI(analysis, event.text, {
        originalTs: event.ts,
        channelId: event.channel
      });

      // 送信（チャンネル/DM対応）
      await sendReply(client, event.channel, event.user, {
        blocks,
        text: 'Quick Reply オプション' // フォールバック
      });

      logger.info('Quick reply: Ephemeral message sent via app_mention');

    } catch (error) {
      logger.error('Quick reply app_mention handler error:', error);
      
      // エラー時のフォールバック
      try {
        await sendReply(client, event.channel, event.user, {
          text: '⚠️ 一時的に返信案を生成できませんでした。後ほどもう一度お試しください。'
        });
      } catch (fallbackError) {
        logger.error('Failed to send error message', { fallbackError });
      }
    }
  });

  // スレッド返信ジャンプアクション（追加）
  app.action('thread_reply_jump', async ({ ack, body, client, action }) => {
    await ack();

    try {
      const typedBody = body as any;
      
      // actionのvalueから元のメッセージのtimestampとchannelを取得
      // 'thread_jump'の場合は旧形式なのでfallback
      if (action.value === 'thread_jump') {
        // 旧形式の場合はチャンネルリンクを提供
        const channelLink = `slack://channel?team=${typedBody.team.id}&id=${typedBody.channel.id}`;
        
        await sendReply(client, getChannelId(body), getUserId(body), {
          blocks: [{
            type: 'section',
            text: { type: 'mrkdwn', text: '🔗 チャンネルに移動:' },
            accessory: {
              type: 'button',
              text: { type: 'plain_text', text: 'チャンネルを開く' },
              url: channelLink
            }
          }],
          text: '🔗 チャンネルに移動'
        });
        
        logger.info('Channel link generated (fallback)', { channelLink });
        return;
      }
      
      const metadata = JSON.parse(action.value);
      const { originalTs, channelId } = metadata;
      
      // chat.getPermalinkで元のメッセージのpermalinkを取得
      const permalinkResult = await client.chat.getPermalink({
        channel: channelId,
        message_ts: originalTs
      });

      await sendReply(client, getChannelId(body), getUserId(body), {
        blocks: [{
          type: 'section',
          text: { type: 'mrkdwn', text: '🔗 元のメッセージに移動:' },
          accessory: {
            type: 'button',
            text: { type: 'plain_text', text: 'スレッドを開く' },
            url: permalinkResult.permalink
          }
        }],
        text: '🔗 元のメッセージに移動'
      });

      logger.info('Thread permalink generated', { 
        permalink: permalinkResult.permalink,
        originalTs,
        channelId 
      });

    } catch (error) {
      logger.error('Thread jump error:', error);
      
      await sendReply(client, getChannelId(body), getUserId(body), {
        text: '❌ スレッドへのリンク生成に失敗しました。'
      });
    }
  });

  logger.info('Quick Reply Handler configured', { BOT_USER_ID });
}