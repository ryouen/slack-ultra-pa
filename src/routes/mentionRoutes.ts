import { App } from '@slack/bolt';
import { logger } from '@/utils/logger';
import { MentionService } from '@/services/mentionService';
import { TaskService } from '@/services/taskService';
import { getPrismaClient } from '@/config/database';
import { getSlackLanguage } from '@/utils/slackHelpers';
import { getChannelId, getUserId } from '@/utils/getChannelId';
import { sendReply } from '@/utils/sendReply';

export function registerMentionRoutes(app: App): void {
  const prisma = getPrismaClient();
  
  // Common handler for both /mention and /todo commands
  const mentionCommandHandler = async ({ command, ack, respond, client }: any) => {
    await ack();

    try {
      const userId = command.user_id;
      const args = command.text.trim().split(' ');
      const subcommand = args[0] || '';

      // Get user from database
      let user = await prisma.user.findUnique({
        where: { slackUserId: userId }
      });

      if (!user) {
        // Create user if not exists
        user = await prisma.user.create({
          data: {
            slackUserId: userId,
            language: 'ja',
            timezone: 'Asia/Tokyo'
          }
        });
      }

      const language = user.language as 'ja' | 'en';
      const mentionService = new MentionService(client);

      // Handle subcommands
      switch (subcommand) {
        case 'all':
          await handleMentionList(respond, client, user.id, userId, 'all', undefined, language);
          break;
        case 'unread':
          await handleMentionList(respond, client, user.id, userId, 'unread', 48, language);
          break;
        case 'help':
          await showMentionHelp(respond, language);
          break;
        default:
          // Default: show last 48 hours
          await handleMentionList(respond, client, user.id, userId, 'all', 48, language);
          break;
      }
    } catch (error) {
      logger.error('Error in /mention command', { error });
      await respond({
        text: '[ERROR] Failed to process mention command',
        response_type: 'ephemeral'
      });
    }
  };

  // Register /mention command
  app.command('/mention', mentionCommandHandler);
  // Note: /todo is handled in index.ts for backward compatibility

  // Register action handlers
  registerMentionActions(app);
}

async function handleMentionList(
  respond: any,
  client: any,
  userId: string,
  slackUserId: string,
  filter: 'all' | 'unread',
  hours: number | undefined,
  language: 'ja' | 'en'
) {
  const mentionService = new MentionService(client);

  // Get mentions from database
  const mentions = await mentionService.getMentions(userId, filter, hours);

  if (mentions.length === 0) {
    const emptyMessage = language === 'ja' 
      ? `[EMPTY] ${filter === 'unread' ? '未返信の' : ''}メンションはありません\n\n` +
        `[INFO] メンション収集の仕組み：\n` +
        `• ボットが参加しているチャンネルのみ監視\n` +
        `• リアルタイムでメンションを検出・保存\n` +
        `• プライベートチャンネルは /invite @ultraPA が必要\n\n` +
        `[TIP] より多くのメンションを収集するには：\n` +
        `• 重要なチャンネルにボットを招待してください`
      : `[EMPTY] No ${filter === 'unread' ? 'unread ' : ''}mentions found\n\n` +
        `[INFO] How mentions are collected:\n` +
        `• Only monitors channels where bot is a member\n` +
        `• Detects and saves mentions in real-time\n` +
        `• Private channels require /invite @ultraPA\n\n` +
        `[TIP] To collect more mentions:\n` +
        `• Invite the bot to important channels`;
    
    await respond({
      text: emptyMessage,
      response_type: 'ephemeral'
    });
    return;
  }

  // Build response blocks
  const blocks: any[] = [
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: language === 'ja'
          ? `[INBOX] ${filter === 'unread' ? '未返信の' : ''}メンション (${mentions.length}件)`
          : `[INBOX] ${filter === 'unread' ? 'Unread ' : ''}Mentions (${mentions.length})`
      }
    },
    {
      type: 'divider'
    }
  ];

  // Add each mention
  for (const mention of mentions) {
    const timeAgo = getTimeAgo(new Date(mention.createdAt), language);
    const importanceIcon = mention.importance === 'high' ? '[URGENT]' : 
                          mention.importance === 'medium' ? '[MEDIUM]' : '';
    
    blocks.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `${importanceIcon} *${timeAgo} - #${mention.channelName || mention.channelId}*\n` +
              `${mention.messageText.substring(0, 100)}${mention.messageText.length > 100 ? '...' : ''}`
      }
    });

    // Action buttons
    const elements: any[] = [
      {
        type: 'button',
        text: {
          type: 'plain_text',
          text: language === 'ja' ? 'Quick Reply' : 'Quick Reply'
        },
        action_id: `mention_quick_reply_${mention.id}`,
        value: mention.id
      },
      {
        type: 'button',
        text: {
          type: 'plain_text',
          text: language === 'ja' ? 'タスク化' : 'Task'
        },
        action_id: `mention_to_task_${mention.id}`,
        value: mention.id
      },
      {
        type: 'button',
        text: {
          type: 'plain_text',
          text: language === 'ja' ? '既読' : 'Read'
        },
        action_id: `mention_mark_read_${mention.id}`,
        value: mention.id
      }
    ];

    blocks.push({
      type: 'actions',
      elements
    });

    blocks.push({ type: 'divider' });
  }

  await respond({
    blocks,
    response_type: 'ephemeral'
  });
}

function registerMentionActions(app: App) {
  const prisma = getPrismaClient();

  // Quick Reply action - Show Smart Reply UI
  app.action(/^mention_quick_reply_(.+)$/, async ({ ack, body, client, action }) => {
    await ack();

    try {
      const mentionId = (action as any).value;
      const userId = getUserId(body);
      
      // Debug log
      logger.info('Quick Reply action body', { 
        bodyType: body.type,
        channelId: body.channel?.id,
        userId: body.user?.id,
        containerId: (body as any).container?.channel_id,
        responseUrl: (body as any).response_url
      });

      // Get mention
      const mention = await prisma.inboxItem.findUnique({
        where: { id: mentionId },
        include: { user: true }
      });

      if (!mention) {
        logger.error('Mention not found', { mentionId });
        return;
      }

      // Import Smart Reply components
      const { MessageAnalyzer } = await import('@/llm/MessageAnalyzer');
      const { SmartReplyUIBuilder } = await import('@/ui/SmartReplyUIBuilder');
      
      const analyzer = new MessageAnalyzer();
      const uiBuilder = new SmartReplyUIBuilder();

      // Analyze message and build UI (pass metadata for permalink)
      const analysis = await analyzer.analyzeMessage(mention.messageText);
      const blocks = uiBuilder.buildUI(analysis, mention.messageText, {
        originalTs: mention.slackTs,
        channelId: mention.channelId
      });

      // Send Smart Reply UI (handles both channel and DM)
      await sendReply(client, getChannelId(body), userId, {
        blocks,
        text: 'Quick Reply オプション'
      });

    } catch (error) {
      logger.error('Error generating smart reply', { error });
      
      // Fallback error message
      await sendReply(client, getChannelId(body), getUserId(body), {
        text: '⚠️ 返信案の生成に失敗しました。'
      });
    }
  });

  // Convert to task action
  app.action(/^mention_to_task_(.+)$/, async ({ ack, body, client, action }) => {
    await ack();

    try {
      const mentionId = (action as any).value;
      const mentionService = new MentionService(client);

      // Convert to task
      const taskId = await mentionService.convertToTask(mentionId);

      // Get user for language
      const user = await prisma.user.findUnique({
        where: { slackUserId: getUserId(body) }
      });
      const language = user?.language as 'ja' | 'en' || 'ja';

      // Update message
      await sendReply(client, getChannelId(body), getUserId(body), {
        text: language === 'ja'
          ? `[OK] タスクを作成しました`
          : `[OK] Task created`
      });

    } catch (error) {
      logger.error('Error converting to task', { error });
    }
  });

  // Mark as read action
  app.action(/^mention_mark_read_(.+)$/, async ({ ack, body, client, action }) => {
    await ack();

    try {
      const mentionId = (action as any).value;
      const mentionService = new MentionService(client);

      // Mark as read
      await mentionService.markAsRead(mentionId);

      // Get user for language
      const user = await prisma.user.findUnique({
        where: { slackUserId: getUserId(body) }
      });
      const language = user?.language as 'ja' | 'en' || 'ja';

      // Update message
      await sendReply(client, getChannelId(body), getUserId(body), {
        text: language === 'ja'
          ? `[OK] 既読にしました`
          : `[OK] Marked as read`
      });

    } catch (error) {
      logger.error('Error marking as read', { error });
    }
  });
}

async function showMentionHelp(respond: any, language: 'ja' | 'en') {
  const helpText = language === 'ja' ? `
[HELP] /mention コマンドの使い方

• \`/mention\` - 過去48時間のメンション
• \`/mention all\` - すべてのメンション
• \`/mention unread\` - 未返信のメンションのみ
• \`/mention help\` - このヘルプを表示

各メンションに対して：
• 返信案 - AI生成の返信候補を表示
• タスク化 - タスクとして保存
• 既読 - アーカイブ
` : `
[HELP] /mention command usage

• \`/mention\` - Mentions from last 48 hours
• \`/mention all\` - All mentions
• \`/mention unread\` - Unread mentions only
• \`/mention help\` - Show this help

For each mention:
• Reply - Show AI-generated reply options
• Task - Convert to task
• Read - Archive
`;

  await respond({
    text: helpText,
    response_type: 'ephemeral'
  });
}

function getTimeAgo(date: Date, language: 'ja' | 'en'): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffDays > 0) {
    return language === 'ja' ? `${diffDays}日前` : `${diffDays}d ago`;
  } else if (diffHours > 0) {
    return language === 'ja' ? `${diffHours}時間前` : `${diffHours}h ago`;
  } else if (diffMins > 0) {
    return language === 'ja' ? `${diffMins}分前` : `${diffMins}m ago`;
  } else {
    return language === 'ja' ? 'たった今' : 'just now';
  }
}