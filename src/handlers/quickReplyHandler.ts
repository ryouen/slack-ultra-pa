import { App } from '@slack/bolt';
import { MessageAnalyzer } from '@/llm/MessageAnalyzer';
import { SmartReplyUIBuilder } from '@/ui/SmartReplyUIBuilder';
import { getPrismaClient } from '@/config/database';
import { logger } from '@/utils/logger';
import { getChannelId, getUserId } from '@/utils/getChannelId';
import { sendReply } from '@/utils/sendReply';
import { 
  quickReplyProcessed, 
  quickReplyErrors,
  measureQuickReplyDuration 
} from '@/metrics/quickReplyMetrics';

export function setupQuickReplyHandler(app: App): void {
  const messageAnalyzer = new MessageAnalyzer();
  const uiBuilder = new SmartReplyUIBuilder();
  const prisma = getPrismaClient();

  // メッセージイベントハンドラー（ユーザー間メンション検出）
  app.event('message', async ({ event, client, context, body }) => {
    const timer = measureQuickReplyDuration('message_handler');
    
    // TypeScript型ガード
    if (!('text' in event) || !event.text) return;
    if (!('user' in event) || !event.user) return;
    if (!('channel' in event)) return;
    
    // Bot自身の発言は無視（動的に解決）
    const botUserId = context.botUserId || process.env.SLACK_BOT_USER_ID;
    if (!botUserId) {
      logger.warn('No bot user ID available in context or environment');
      return;
    }
    if (event.user === botUserId) return;

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
        if (mentionedUserId === botUserId) continue;

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
          messageTs: event.ts,
          teamId: (body as any).team_id || (body as any).team?.id
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
          channelId: event.channel,
          permalink: permalink,
          // Socket ModeではイベントタイプによってteamIdの場所が異なる
          // Message Event: body.team_id
          // Block Actions: body.team.id
          teamId: (body as any).team_id || (body as any).team?.id
        });

        // メンションされたユーザーに送信（チャンネル/DM対応）
        await sendReply(client, event.channel, mentionedUserId, {
          blocks,
          text: 'Quick Reply オプション' // フォールバック
        });

        logger.info('Quick reply sent to mentioned user', {
          mentionedUserId,
          messageTs: event.ts,
          teamId: (body as any).team_id || (body as any).team?.id,
          hadPermalink: !!permalink
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
  app.event('app_mention', async ({ event, client, context, body }) => {
    const timer = measureQuickReplyDuration('app_mention_handler');
    
    // Bot自身の発言は無視（動的に解決）
    const botUserId = context.botUserId || process.env.SLACK_BOT_USER_ID;
    if (!botUserId) {
      logger.warn('No bot user ID available for app_mention');
      return;
    }
    if (event.user === botUserId) return;

    try {
      logger.info('Quick reply: Processing app_mention', {
        user: event.user,
        channel: event.channel,
        text: event.text,
        teamId: (body as any).team_id || (body as any).team?.id
      });

      // メッセージ分析
      const analysis = await messageAnalyzer.analyzeMessage(event.text);
      
      // UI生成（元のメッセージのmetadataを渡す）
      const blocks = uiBuilder.buildUI(analysis, event.text, {
        originalTs: event.ts,
        channelId: event.channel,
        permalink: undefined, // app_mentionではpermalinkは必要ない
        // Socket ModeではイベントタイプによってteamIdの場所が異なる
        // Message Event: body.team_id
        // Block Actions: body.team.id  
        teamId: (body as any).team_id || (body as any).team?.id
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

  // thread_reply_jumpアクションハンドラーを削除
  // 現在は全てpermalink URLボタンを使用して直接スレッドに飛ぶため不要

  logger.info('Quick Reply Handler configured with dynamic bot user ID resolution');
}