import { App } from '@slack/bolt';
import { logger } from '@/utils/logger';
import { slackRequestsTotal, slackRequestDuration } from '@/config/metrics';
import { t, detectLanguage, getUserLanguage } from '@/i18n';

/**
 * Setup all Slack Bolt routes and handlers
 */
export function setupRoutes(app: App): void {
  // Middleware for metrics collection
  app.use(async ({ next, payload }) => {
    const startTime = Date.now();
    const commandName = (payload as any)?.command || (payload as any)?.type || 'unknown';

    try {
      await next();
      
      // Record successful request
      slackRequestsTotal.inc({ command: commandName, status: 'success' });
      slackRequestDuration.observe({ command: commandName }, (Date.now() - startTime) / 1000);
    } catch (error) {
      // Record failed request
      slackRequestsTotal.inc({ command: commandName, status: 'error' });
      slackRequestDuration.observe({ command: commandName }, (Date.now() - startTime) / 1000);
      throw error;
    }
  });

  // Enhanced help command with multi-language support
  app.command('/help', async ({ command, ack, respond }) => {
    await ack();
    
    logger.info('Help command received', {
      userId: command.user_id,
      channelId: command.channel_id,
    });

    // Detect language from command text or default to Japanese
    const language = command.text ? detectLanguage(command.text) : 'ja';

    await respond({
      text: t('help.title', language),
      blocks: [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: t('help.title', language),
          },
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: t('help.description', language),
          },
        },
        {
          type: 'divider',
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*${language === 'ja' ? '利用可能なコマンド' : 'Available Commands'}:*\n• ${t('help.commands.help', language)}\n• ${t('help.commands.todo', language)}\n• ${t('help.commands.lang', language)}\n• ${t('help.commands.prep', language)}\n• ${t('help.commands.focus', language)}`,
          },
        },
        {
          type: 'context',
          elements: [
            {
              type: 'mrkdwn',
              text: t('help.tip', language),
            },
          ],
        },
      ],
    });
  });

  // Language switching command
  app.command('/lang', async ({ command, ack, respond }) => {
    await ack();
    
    logger.info('Language command received', {
      userId: command.user_id,
      text: command.text,
    });

    const requestedLang = command.text?.trim().toLowerCase();
    let language: 'ja' | 'en' = 'ja';
    
    if (requestedLang === 'en' || requestedLang === 'english') {
      language = 'en';
    } else if (requestedLang === 'ja' || requestedLang === 'japanese' || requestedLang === '日本語') {
      language = 'ja';
    } else {
      // If no valid language specified, show current options
      await respond({
        text: '言語を選択してください / Please select a language:',
        blocks: [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: '*言語設定 / Language Settings*\n\n使用方法 / Usage:\n• `/lang ja` または `/lang 日本語` - 日本語に設定\n• `/lang en` または `/lang english` - Set to English',
            },
          },
        ],
      });
      return;
    }

    // TODO: Save user language preference to database
    
    await respond({
      text: t('language.switched', language, { language: language === 'ja' ? '日本語' : 'English' }),
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `✅ ${t('language.switched', language, { language: language === 'ja' ? '日本語' : 'English' })}`,
          },
        },
      ],
    });
  });

  // Todo today command with real task management
  app.command('/todo', async ({ command, ack, respond }) => {
    await ack();
    
    logger.info('Todo command received', {
      userId: command.user_id,
      text: command.text,
    });

    // Detect language
    const language = command.text ? detectLanguage(command.text) : 'ja';
    
    if (command.text?.trim() === 'today') {
      try {
        const { TaskService } = await import('@/services/taskService');
        const taskService = new TaskService();
        
        // Get user's Slack user ID
        const slackUserId = command.user_id;
        
        // Find user in database
        const { getPrismaClient } = await import('@/config/database');
        const prisma = getPrismaClient();
        
        let user = await prisma.user.findUnique({
          where: { slackUserId }
        });
        
        // Create user if doesn't exist
        if (!user) {
          user = await prisma.user.create({
            data: {
              slackUserId,
              timezone: 'Asia/Tokyo',
              language: language,
              preferences: '{}'
            }
          });
          logger.info('Created new user', { userId: user.id, slackUserId });
        }
        
        // Get tasks count first
        const tasksCount = await taskService.getTasksCount(user.id);
        
        if (tasksCount === 0) {
          // No tasks - collect recent mentions
          const recentMentions = await taskService.collectRecentMentions(user.id);
          
          if (recentMentions.length > 0) {
            // Show recent mentions as inbox
            const mentionBlocks = recentMentions.map(mention => ({
              type: 'section' as const,
              text: {
                type: 'mrkdwn' as const,
                text: `*#${mention.channelName || mention.channelId}*\n${mention.messageText.substring(0, 100)}${mention.messageText.length > 100 ? '...' : ''}`
              },
              accessory: {
                type: 'button' as const,
                text: {
                  type: 'plain_text' as const,
                  text: language === 'ja' ? '＋タスク追加' : '＋Add Task'
                },
                action_id: `add_task_${mention.id}`,
                value: mention.id
              }
            }));

            await respond({
              text: language === 'ja' ? '📥 過去3営業日のメンション' : '📥 Mentions from Past 3 Business Days',
              blocks: [
                {
                  type: 'header',
                  text: {
                    type: 'plain_text',
                    text: language === 'ja' ? '📥 過去3営業日のメンション' : '📥 Recent Mentions',
                  },
                },
                {
                  type: 'section',
                  text: {
                    type: 'mrkdwn',
                    text: language === 'ja' 
                      ? 'タスクがないため、過去3営業日のメンションを収集しました。タスクに変換しますか？'
                      : 'No tasks found. Here are mentions from the past 3 business days. Convert to tasks?',
                  },
                },
                {
                  type: 'divider'
                },
                ...mentionBlocks
              ],
            });
          } else {
            // No tasks and no mentions
            await respond({
              text: language === 'ja' ? '🎉 今日はタスクがありません' : '🎉 No tasks for today',
              blocks: [
                {
                  type: 'header',
                  text: {
                    type: 'plain_text',
                    text: language === 'ja' ? '🎉 今日はタスクがありません' : '🎉 No Tasks Today',
                  },
                },
                {
                  type: 'section',
                  text: {
                    type: 'mrkdwn',
                    text: language === 'ja' 
                      ? '素晴らしい！今日はタスクがありません。\n\n新しいタスクを追加するには、メンションでお知らせください。'
                      : 'Great! No tasks for today.\n\nMention me to add new tasks.',
                  },
                },
              ],
            });
          }
        } else {
          // Show top 5 tasks
          const tasks = await taskService.getDailyTop5Tasks(user.id);
          
          const taskBlocks = tasks.map(task => {
            const badgeText = task.badges.join(' ');
            const dueDateText = task.dueDate 
              ? (language === 'ja' ? `期限: ${task.dueDate.toLocaleDateString('ja-JP')}` : `Due: ${task.dueDate.toLocaleDateString()}`)
              : '';
            
            return {
              type: 'section' as const,
              text: {
                type: 'mrkdwn' as const,
                text: `${badgeText} *${task.title}*\n${task.description || ''}\n${dueDateText}`
              },
              accessory: {
                type: 'button' as const,
                text: {
                  type: 'plain_text' as const,
                  text: '✅'
                },
                action_id: `complete_task_${task.id}`,
                value: task.id
              }
            };
          });

          await respond({
            text: language === 'ja' ? '📋 今日の優先タスクTop5' : '📋 Top 5 Priority Tasks Today',
            blocks: [
              {
                type: 'header',
                text: {
                  type: 'plain_text',
                  text: language === 'ja' ? '📋 今日の優先タスクTop5' : '📋 Top 5 Priority Tasks Today',
                },
              },
              {
                type: 'divider'
              },
              ...taskBlocks
            ],
          });
        }
      } catch (error) {
        logger.error('Error in /todo today command', { error, userId: command.user_id });
        
        await respond({
          text: language === 'ja' ? 'エラーが発生しました' : 'An error occurred',
          blocks: [
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: t('error.general', language),
              },
            },
          ],
        });
      }
    } else {
      // Show usage
      await respond({
        text: language === 'ja' ? 'タスクコマンドの使用方法' : 'Todo Command Usage',
        blocks: [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: language === 'ja' 
                ? '*使用方法:*\n• `/todo today` - 今日の優先タスクTop5を表示'
                : '*Usage:*\n• `/todo today` - Show top 5 priority tasks',
            },
          },
        ],
      });
    }
  });

  // Enhanced app mention handler with inbox creation
  app.event('app_mention', async ({ event, say, client }) => {
    logger.info('App mention received', {
      userId: event.user,
      channelId: event.channel,
      text: event.text,
    });

    try {
      // Import services
      const { TaskService } = await import('@/services/taskService');
      const { getPrismaClient } = await import('@/config/database');
      
      const taskService = new TaskService();
      const prisma = getPrismaClient();
      
      // Detect language from mention text
      const language = detectLanguage(event.text);
      
      // Find or create user
      let user = await prisma.user.findUnique({
        where: { slackUserId: event.user }
      });
      
      if (!user) {
        user = await prisma.user.create({
          data: {
            slackUserId: event.user,
            timezone: 'Asia/Tokyo',
            language: language,
            preferences: '{}'
          }
        });
        logger.info('Created new user from mention', { userId: user.id, slackUserId: event.user });
      }
      
      // Get channel info for display
      let channelName = event.channel;
      try {
        const channelInfo = await client.conversations.info({ channel: event.channel });
        channelName = channelInfo.channel?.name || event.channel;
      } catch (error) {
        logger.warn('Could not get channel info', { channelId: event.channel, error });
      }
      
      // Create inbox entry
      const inboxItem = await taskService.createInboxFromMention({
        slackTs: event.ts,
        channelId: event.channel,
        channelName,
        messageText: event.text,
        authorId: event.user,
        userId: user.id
      });
      
      // Show ephemeral 3-button interface to the mentioned user
      await client.chat.postEphemeral({
        channel: event.channel,
        user: event.user,
        text: language === 'ja' ? '📥 メンションを受信しました' : '📥 Mention received',
        blocks: [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: language === 'ja' 
                ? `📥 *メンションを受信しました*\n\n"${event.text.substring(0, 100)}${event.text.length > 100 ? '...' : ''}"\n\nどうしますか？`
                : `📥 *Mention Received*\n\n"${event.text.substring(0, 100)}${event.text.length > 100 ? '...' : ''}"\n\nWhat would you like to do?`
            }
          },
          {
            type: 'actions',
            elements: [
              {
                type: 'button',
                text: {
                  type: 'plain_text',
                  text: language === 'ja' ? '＋タスク追加' : '＋Add Task'
                },
                style: 'primary',
                action_id: `add_task_from_mention_${inboxItem.id}`,
                value: inboxItem.id
              },
              {
                type: 'button',
                text: {
                  type: 'plain_text',
                  text: language === 'ja' ? '✕無視' : '✕Ignore'
                },
                action_id: `ignore_mention_${inboxItem.id}`,
                value: inboxItem.id
              },
              {
                type: 'button',
                text: {
                  type: 'plain_text',
                  text: language === 'ja' ? '⚡即返信' : '⚡Quick Reply'
                },
                action_id: `quick_reply_mention_${inboxItem.id}`,
                value: inboxItem.id
              }
            ]
          }
        ]
      });
      
      logger.info('Created inbox item from mention', { 
        inboxItemId: inboxItem.id, 
        userId: user.id, 
        channelId: event.channel 
      });
      
    } catch (error) {
      logger.error('Error handling app mention', { error, userId: event.user, channelId: event.channel });
      
      // Fallback response
      const language = detectLanguage(event.text);
      await say({
        text: t('mention.greeting', language, { userId: event.user }),
        blocks: [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: t('mention.greeting', language, { userId: event.user }),
            },
          },
          {
            type: 'context',
            elements: [
              {
                type: 'mrkdwn',
                text: language === 'ja' 
                  ? '💡 `/help` でできることを確認してください！'
                  : '💡 Use `/help` to see what I can do!',
              },
            ],
          },
        ],
      });
    }
  });

  // Enhanced message handler for DMs with multi-language support
  app.message(async ({ message, say, client }) => {
    // Type guard for regular messages
    if ('channel_type' in message && 'user' in message && 'text' in message) {
      // Only respond to DMs (not channel messages)
      if (message.channel_type === 'im') {
        logger.info('Direct message received', {
          userId: message.user,
          text: message.text,
        });

        try {
          // Get user info to personalize the response
          const userInfo = await client.users.info({
            user: message.user
          });
          
          const userName = userInfo.user?.real_name || userInfo.user?.name || '';
          
          // Detect language from message
          const language = await getUserLanguage(message.user, message.text);
          
          await say({
            text: t('dm.greeting', language, { name: userName }),
            blocks: [
              {
                type: "section",
                text: {
                  type: "mrkdwn",
                  text: t('dm.greeting', language, { name: userName })
                }
              },
              {
                type: "section",
                text: {
                  type: "mrkdwn",
                  text: t('dm.help_text', language)
                }
              },
              {
                type: "section",
                text: {
                  type: "mrkdwn",
                  text: t('dm.commands_list', language)
                }
              }
            ]
          });
          
          logger.info('Sent DM response successfully', { userId: message.user, language });
        } catch (error) {
          logger.error('Error handling DM', { error, userId: message.user });
          
          // Fallback response if there's an error
          const language = 'ja'; // Default fallback
          await say({
            text: t('error.general', language)
          });
        }
      }
    }
  });

  // Button action handlers for mention inbox
  
  // Add task from mention
  app.action(/^add_task_from_mention_(.+)$/, async ({ ack, body, client, action }) => {
    await ack();
    
    try {
      const inboxItemId = (action as any).value;
      const userId = body.user.id;
      
      const { TaskService } = await import('@/services/taskService');
      const { getPrismaClient } = await import('@/config/database');
      
      const taskService = new TaskService();
      const prisma = getPrismaClient();
      
      // Get inbox item
      const inboxItem = await prisma.inboxItem.findUnique({
        where: { id: inboxItemId },
        include: { user: true }
      });
      
      if (!inboxItem) {
        logger.error('Inbox item not found', { inboxItemId });
        return;
      }
      
      // Create task from mention
      const task = await taskService.createTaskFromMention(inboxItem);
      
      // Update inbox item status
      await prisma.inboxItem.update({
        where: { id: inboxItemId },
        data: { status: 'CONVERTED_TO_TASK' }
      });
      
      const language = inboxItem.user.language as 'ja' | 'en';
      
      // Update the ephemeral message
      await client.chat.update({
        channel: (body as any).channel.id,
        ts: (body as any).message.ts,
        text: language === 'ja' ? '✅ タスクに追加しました' : '✅ Added to tasks',
        blocks: [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: language === 'ja' 
                ? `✅ *タスクに追加しました*\n\n**${task.title}**\n\n`
                : `✅ *Added to Tasks*\n\n**${task.title}**\n\n`
            }
          }
        ]
      });
      
      logger.info('Created task from mention', { taskId: task.id, inboxItemId });
      
    } catch (error) {
      logger.error('Error adding task from mention', { error, actionValue: (action as any).value });
    }
  });
  
  // Ignore mention
  app.action(/^ignore_mention_(.+)$/, async ({ ack, body, client, action }) => {
    await ack();
    
    try {
      const inboxItemId = (action as any).value;
      
      const { getPrismaClient } = await import('@/config/database');
      const prisma = getPrismaClient();
      
      // Get inbox item for language
      const inboxItem = await prisma.inboxItem.findUnique({
        where: { id: inboxItemId },
        include: { user: true }
      });
      
      if (!inboxItem) {
        logger.error('Inbox item not found', { inboxItemId });
        return;
      }
      
      // Update inbox item status
      await prisma.inboxItem.update({
        where: { id: inboxItemId },
        data: { status: 'IGNORED' }
      });
      
      const language = inboxItem.user.language as 'ja' | 'en';
      
      // Update the ephemeral message
      await client.chat.update({
        channel: (body as any).channel.id,
        ts: (body as any).message.ts,
        text: language === 'ja' ? '✕ 無視しました' : '✕ Ignored',
        blocks: [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: language === 'ja' 
                ? '✕ *無視しました*\n\nこのメンションは処理されません。'
                : '✕ *Ignored*\n\nThis mention will not be processed.'
            }
          }
        ]
      });
      
      logger.info('Ignored mention', { inboxItemId });
      
    } catch (error) {
      logger.error('Error ignoring mention', { error, actionValue: (action as any).value });
    }
  });
  
  // Quick reply to mention
  app.action(/^quick_reply_mention_(.+)$/, async ({ ack, body, client, action }) => {
    await ack();
    
    try {
      const inboxItemId = (action as any).value;
      
      const { TaskService } = await import('@/services/taskService');
      const { getPrismaClient } = await import('@/config/database');
      
      const taskService = new TaskService();
      const prisma = getPrismaClient();
      
      // Get inbox item
      const inboxItem = await prisma.inboxItem.findUnique({
        where: { id: inboxItemId },
        include: { user: true }
      });
      
      if (!inboxItem) {
        logger.error('Inbox item not found', { inboxItemId });
        return;
      }
      
      const language = inboxItem.user.language as 'ja' | 'en';
      
      // Generate quick reply options
      const replyOptions = await taskService.generateQuickReplies(inboxItem);
      
      // Update inbox item status
      await prisma.inboxItem.update({
        where: { id: inboxItemId },
        data: { status: 'QUICK_REPLIED' }
      });
      
      // Show reply options
      await client.chat.update({
        channel: (body as any).channel.id,
        ts: (body as any).message.ts,
        text: language === 'ja' ? '⚡ 返信候補を生成しました' : '⚡ Generated reply options',
        blocks: [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: language === 'ja' 
                ? '⚡ *返信候補を生成しました*\n\n以下の返信候補から選択してください：'
                : '⚡ *Generated Reply Options*\n\nSelect from the reply options below:'
            }
          },
          {
            type: 'divider'
          },
          ...replyOptions.map((reply, index) => ({
            type: 'section' as const,
            text: {
              type: 'mrkdwn' as const,
              text: `*${language === 'ja' ? '候補' : 'Option'} ${index + 1}:*\n${reply}`
            },
            accessory: {
              type: 'button' as const,
              text: {
                type: 'plain_text' as const,
                text: language === 'ja' ? '使用' : 'Use'
              },
              action_id: `use_reply_${inboxItemId}_${index}`,
              value: `${inboxItemId}|${index}`
            }
          }))
        ]
      });
      
      logger.info('Generated quick replies', { inboxItemId, optionsCount: replyOptions.length });
      
    } catch (error) {
      logger.error('Error generating quick reply', { error, actionValue: (action as any).value });
    }
  });
  
  // Use generated reply
  app.action(/^use_reply_(.+)_(\d+)$/, async ({ ack, body, client, action }) => {
    await ack();
    
    try {
      const [inboxItemId, replyIndex] = (action as any).value.split('|');
      
      const { TaskService } = await import('@/services/taskService');
      const { getPrismaClient } = await import('@/config/database');
      
      const taskService = new TaskService();
      const prisma = getPrismaClient();
      
      // Get inbox item
      const inboxItem = await prisma.inboxItem.findUnique({
        where: { id: inboxItemId },
        include: { user: true }
      });
      
      if (!inboxItem) {
        logger.error('Inbox item not found', { inboxItemId });
        return;
      }
      
      // Regenerate reply options to get the selected one
      const replyOptions = await taskService.generateQuickReplies(inboxItem);
      const selectedReply = replyOptions[parseInt(replyIndex)];
      
      if (!selectedReply) {
        logger.error('Reply option not found', { inboxItemId, replyIndex });
        return;
      }
      
      const language = inboxItem.user.language as 'ja' | 'en';
      
      // Post the reply to the original channel
      await client.chat.postMessage({
        channel: inboxItem.channelId,
        thread_ts: inboxItem.slackTs, // Reply in thread
        text: selectedReply
      });
      
      // Update the ephemeral message
      await client.chat.update({
        channel: (body as any).channel.id,
        ts: (body as any).message.ts,
        text: language === 'ja' ? '✅ 返信しました' : '✅ Reply sent',
        blocks: [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: language === 'ja' 
                ? `✅ *返信しました*\n\n"${selectedReply}"`
                : `✅ *Reply Sent*\n\n"${selectedReply}"`
            }
          }
        ]
      });
      
      logger.info('Sent quick reply', { inboxItemId, replyIndex, channelId: inboxItem.channelId });
      
    } catch (error) {
      logger.error('Error using reply', { error, actionValue: (action as any).value });
    }
  });

  // Complete task button handler
  app.action(/^complete_task_(.+)$/, async ({ ack, body, client, action }) => {
    await ack();
    
    try {
      const taskId = (action as any).value;
      
      const { TaskService } = await import('@/services/taskService');
      const taskService = new TaskService();
      
      await taskService.completeTask(taskId);
      
      // Update the message to show completion
      await client.chat.update({
        channel: (body as any).channel.id,
        ts: (body as any).message.ts,
        text: '✅ Task completed',
        blocks: [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: '✅ *Task completed successfully!*'
            }
          }
        ]
      });
      
      logger.info('Task completed via button', { taskId });
      
    } catch (error) {
      logger.error('Error completing task', { error, taskId: (action as any).value });
    }
  });

  logger.info('Slack routes configured successfully');
}