import { App } from '@slack/bolt';
import { logger } from '@/utils/logger';
import { slackRequestsTotal, slackRequestDuration } from '@/config/metrics';
import { t, detectLanguage, getUserLanguage } from '@/i18n';
import { registerHierarchyRoutes } from './hierarchyRoutes';
import { registerMentionRoutes } from './mentionRoutes';
import { setupQuickReplyHandler } from '@/handlers/quickReplyHandler';
import { resolveBotUserId } from '@/config/botConfig';
import { Router } from 'express';
import oauthRoutes from './oauth';

/**
 * Setup all Slack Bolt routes and handlers
 */
export async function setupRoutes(app: App): Promise<void> {
  // Resolve Bot User ID for Quick Reply handler (skip in OAuth mode)
  const isOAuthEnabled = process.env.SLACK_OAUTH_ENABLED === 'true';
  let BOT_USER_ID: string | undefined;
  
  if (!isOAuthEnabled) {
    BOT_USER_ID = await resolveBotUserId(app);
    logger.info('Bot User ID resolved for routes', { BOT_USER_ID });
  } else {
    logger.info('OAuth mode enabled, skipping Bot User ID resolution');
  }
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

  // Simple test command
  app.command('/test', async ({ command, ack, respond }) => {
    try {
      await ack();

      logger.info('Test command received', {
        userId: command.user_id,
        text: command.text,
        channelId: command.channel_id,
        teamId: command.team_id
      });

      await respond({
        text: '[OK] Test successful!',
        blocks: [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `[OK] *Test successful!*\n\nSlack bot is working correctly.\n\n**Details:**\n• User: <@${command.user_id}>\n• Channel: ${command.channel_id}\n• Time: ${new Date().toISOString()}`
            }
          }
        ]
      });

      logger.info('Test command response sent successfully');
    } catch (error) {
      logger.error('Error in test command', { error, userId: command.user_id });

      try {
        await respond({
          text: '[ERROR] Test failed',
          response_type: 'ephemeral'
        });
      } catch (respondError) {
        logger.error('Failed to send error response', { respondError });
      }
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
            text: `[OK] ${t('language.switched', language, { language: language === 'ja' ? '日本語' : 'English' })}`,
          },
        },
      ],
    });
  });

  // Todo today command with real task management
  app.command('/todo', async ({ command, ack, respond, client }) => {
    await ack();

    logger.info('Todo command received', {
      userId: command.user_id,
      text: command.text,
    });

    // Detect language
    const language = command.text ? detectLanguage(command.text) : 'ja';

    // Handle subcommands
    const subcommand = command.text?.trim() || 'today'; // Default to 'today' if no argument

    // Handle collect command
    if (command.text?.trim() === 'collect') {
      try {
        const { TaskService } = await import('@/services/taskService');
        const { getPrismaClient } = await import('@/config/database');
        const taskService = new TaskService();
        const prisma = getPrismaClient();

        // Get or create user
        let user = await prisma.user.findUnique({
          where: { slackUserId: command.user_id }
        });

        if (!user) {
          user = await prisma.user.create({
            data: {
              slackUserId: command.user_id,
              timezone: 'Asia/Tokyo',
              language: language,
              preferences: '{}'
            }
          });
        }

        // Collect mentions
        const mentions = await taskService.collectRecentMentions(user.id);
        
        await respond({
          text: language === 'ja'
            ? `[COLLECT] ${mentions.length}件のメンションを収集しました`
            : `[COLLECT] Collected ${mentions.length} mentions`,
          blocks: [
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: language === 'ja'
                  ? `[COLLECT] *メンション収集完了*\n\n${mentions.length}件のメンションを収集しました。\n\n表示するには \`/mention\` を使用してください。`
                  : `[COLLECT] *Mention Collection Complete*\n\nCollected ${mentions.length} mentions.\n\nUse \`/mention\` to view them.`
              }
            }
          ],
          response_type: 'ephemeral'
        });
      } catch (error) {
        logger.error('Error collecting mentions', { error });
        await respond({
          text: language === 'ja'
            ? '[ERROR] メンション収集中にエラーが発生しました'
            : '[ERROR] Error collecting mentions',
          response_type: 'ephemeral'
        });
      }
      return;
    }

    // Handle todo commands (empty = all tasks, today = today's tasks)
    if (subcommand === '' || subcommand === 'today') {
      // Process tasks
      try {

        const { TaskService } = await import('@/services/taskService');
        const taskService = new TaskService();

        // Get user's Slack user ID
        const slackUserId = command.user_id;

        if (!slackUserId) {
          logger.error('Missing user_id in command');
          // Respond with error
          await respond({
            text: 'エラー: ユーザーIDが見つかりません',
            blocks: [
              {
                type: 'section',
                text: {
                  type: 'mrkdwn',
                  text: '[ERROR] *エラー*\n\nユーザーIDが見つかりません。'
                }
              }
            ]
          });
          return;
        }

        // Find user in database
        const { getPrismaClient } = await import('@/config/database');
        const prisma = getPrismaClient();

        let user = await prisma.user.findUnique({
          where: { slackUserId: slackUserId }
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

        // Get tasks based on subcommand
        const tasksCount = subcommand === 'today'
          ? await taskService.getTodayTasksCount(user.id)
          : await taskService.getTasksCount(user.id);

        if (tasksCount === 0) {
          // No tasks
          await respond({
            text: language === 'ja' 
              ? (subcommand === 'today' ? '[DONE] 今日はタスクがありません' : '[DONE] タスクがありません')
              : (subcommand === 'today' ? '[DONE] No tasks for today' : '[DONE] No tasks'),
            blocks: [
              {
                type: 'header',
                text: {
                  type: 'plain_text',
                  text: language === 'ja' 
                    ? (subcommand === 'today' ? '[DONE] 今日はタスクがありません' : '[DONE] タスクがありません')
                    : (subcommand === 'today' ? '[DONE] No Tasks Today' : '[DONE] No Tasks'),
                },
              },
              {
                type: 'section',
                text: {
                  type: 'mrkdwn',
                  text: language === 'ja'
                    ? (subcommand === 'today' 
                      ? '素晴らしい！今日はタスクがありません。\n\nメンションから新しいタスクを作成できます。\n`/mention` でメンションを確認してください。'
                      : 'タスクがありません。\n\nメンションから新しいタスクを作成できます。\n`/mention` でメンションを確認してください。')
                    : (subcommand === 'today'
                      ? 'Great! No tasks for today.\n\nYou can create tasks from mentions.\nUse `/mention` to view mentions.'
                      : 'No tasks found.\n\nYou can create tasks from mentions.\nUse `/mention` to view mentions.'),
                },
              },
            ],
          });
          return;
        }

        // Build response blocks
        const responseBlocks: any[] = [];
        
        // Add tasks if any
        if (tasksCount > 0) {
          const allTasks = subcommand === 'today'
            ? await taskService.getDailyTop5Tasks(user.id)
            : await taskService.getAllTasks(user.id);
          
          // Import URL detection utility once
          const { detectFolderUrls } = await import('@/utils/urlDetection');
          
          // Filter out tasks that were created from mentions
          const pureTasks: typeof allTasks = [];
          
          allTasks.forEach(task => {
            // Check if task has source metadata (was created from a mention)
            let isFromMention = false;
            
            if (task.folderUrls && task.folderUrls.length > 0) {
              try {
                const parsed = typeof task.folderUrls === 'string' ? JSON.parse(task.folderUrls) : task.folderUrls;
                if (!Array.isArray(parsed) && parsed.channelId) {
                  // This is source metadata - task was created from mention
                  isFromMention = true;
                }
              } catch (e) {
                // Not JSON, this is a pure task with folder URLs
                isFromMention = false;
              }
            }
            
            if (!isFromMention) {
              pureTasks.push(task);
            }
          });
          
          // Only show tasks section if there are pure tasks
          if (pureTasks.length > 0) {
            // Add header for tasks
            responseBlocks.push({
              type: 'header',
              text: {
                type: 'plain_text',
                text: language === 'ja' 
                  ? `[TASKS] 今日の優先タスクTop${pureTasks.length}` 
                  : `[TASKS] Top ${pureTasks.length} Priority Tasks Today`,
              },
            });
            responseBlocks.push({ type: 'divider' });
          }
          
          pureTasks.forEach(task => {
            const badgeText = task.badges.join(' ');
            const dueDateText = task.dueDate
              ? (language === 'ja' ? `期限: ${task.dueDate.toLocaleDateString('ja-JP')}` : `Due: ${task.dueDate.toLocaleDateString()}`)
              : '';

            // Task section
            responseBlocks.push({
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: `${badgeText} *${task.title}*\n${task.description || ''}\n${dueDateText}`
              }
            });

            // Action buttons
            const actionElements: any[] = [
              {
                type: 'button',
                text: {
                  type: 'plain_text',
                  text: '[OK] 完了'
                },
                action_id: `complete_task_${task.id}`,
                value: task.id
              }
            ];

            // Check if task has source metadata (was created from a mention)
            let hasSourceMetadata = false;
            let sourceMetadata: any = null;
            let folderUrls: string[] = [];
            
            if (task.folderUrls && task.folderUrls.length > 0) {
              // Try to parse as source metadata first
              try {
                const parsed = typeof task.folderUrls === 'string' ? JSON.parse(task.folderUrls) : task.folderUrls;
                if (!Array.isArray(parsed) && parsed.channelId) {
                  // This is source metadata
                  sourceMetadata = parsed;
                  hasSourceMetadata = true;
                } else if (Array.isArray(parsed) && parsed.length > 0) {
                  // This is actual folder URLs
                  folderUrls = parsed;
                }
              } catch (e) {
                // Not JSON, treat as simple folder URL
                folderUrls = [task.folderUrls];
              }
            }

            // Add folder button if we have valid URLs
            if (folderUrls.length > 0) {
              // Validate URLs using the detection utility
              const validUrls = detectFolderUrls(folderUrls.join(' '));
              
              if (validUrls.length > 0 || folderUrls.some(url => url.startsWith('http'))) {
                actionElements.push({
                  type: 'button',
                  text: {
                    type: 'plain_text',
                    text: '📂 フォルダ'
                  },
                  action_id: `open_folder_${task.id}`,
                  value: JSON.stringify({ taskId: task.id, urls: folderUrls })
                });
              }
            }

            // Add thread button if task was created from a mention
            if (hasSourceMetadata && sourceMetadata.channelId) {
              actionElements.push({
                type: 'button',
                text: {
                  type: 'plain_text',
                  text: language === 'ja' ? '[スレッド] 会話' : '[Thread] View'
                },
                action_id: `view_thread_${task.id}`,
                value: JSON.stringify(sourceMetadata),
                style: 'primary'
              });
            }

            // Actions block
            responseBlocks.push({
              type: 'actions',
              elements: actionElements
            });

            // Divider between tasks
            responseBlocks.push({ type: 'divider' });
          });
        }
        
        // メンション表示を削除 - /mentionコマンドを使用してください
        
        // Send the response
        const titleText = language === 'ja' 
          ? '[TASKS] 今日のタスク' 
          : '[TASKS] Today\'s Tasks';
          
        await respond({
          text: titleText,
          blocks: responseBlocks
        });
      } catch (error) {
        logger.error('Error in /todo today command', {
          error: error instanceof Error ? error.message : error,
          stack: error instanceof Error ? error.stack : undefined,
          userId: command.user_id,
          channelId: command.channel_id,
          channelName: command.channel_name
        });

        // Simple error response
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

  // Note: User mention processing has been removed per MVP specification
  // Only bot mentions are processed via quickReplyHandler

  // Note: app_mention handler is now managed by quickReplyHandler
  // See setupQuickReplyHandler() for bot mention handling

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
          // Try to get user info, but handle missing scope gracefully
          let userName = '';
          try {
            const userInfo = await client.users.info({
              user: message.user
            });
            userName = userInfo.user?.real_name || userInfo.user?.name || '';
          } catch (userError: any) {
            if (userError?.data?.error === 'missing_scope') {
              logger.warn('Missing users:read scope, continuing without user name', { userId: message.user });
            } else {
              logger.error('Error fetching user info', { error: userError, userId: message.user });
            }
          }

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

  // Note: add_task_from_mention action has been removed per MVP specification

  // Note: ignore_mention action has been removed per MVP specification

  // Note: quick_reply_mention action has been removed per MVP specification

  // Note: use_reply action has been removed per MVP specification

  // Complete task button handler
  app.action(/^complete_task_(.+)$/, async ({ ack, body, client, action }) => {
    await ack();

    try {
      const taskId = (action as any).value;
      const userId = body.user.id;

      logger.info('Complete task button clicked', {
        taskId,
        userId,
        bodyKeys: Object.keys(body)
      });

      const { TaskService } = await import('@/services/taskService');
      const taskService = new TaskService();

      await taskService.completeTask(taskId);

      // Get channel ID and message timestamp safely
      let channelId: string | undefined;
      let messageTs: string | undefined;

      if ('channel' in body && body.channel && typeof body.channel === 'object') {
        channelId = (body.channel as any).id;
      } else if ('message' in body && body.message && 'channel' in body.message) {
        channelId = (body.message as any).channel;
      }

      if ('message' in body && body.message && typeof body.message === 'object') {
        messageTs = (body.message as any).ts;
      }

      logger.info('Complete task update params', {
        channelId,
        messageTs,
        hasChannel: !!channelId,
        hasTs: !!messageTs
      });

      if (channelId && messageTs) {
        // Update the message to show completion
        try {
          await client.chat.update({
            channel: channelId,
            ts: messageTs,
            text: '[OK] Task completed',
            blocks: [
              {
                type: 'section',
                text: {
                  type: 'mrkdwn',
                  text: '[OK] *Task completed successfully!*'
                }
              }
            ]
          });
        } catch (updateError: any) {
          // If update fails (common in DMs), send a new message
          logger.warn('Message update failed, sending new message', { 
            error: updateError.message, 
            channelId, 
            messageTs 
          });
          
          if (channelId) {
            await client.chat.postMessage({
              channel: channelId,
              text: '[OK] Task completed successfully!'
            });
          } else {
            // Last resort: send DM to user
            await client.chat.postMessage({
              channel: userId,
              text: '[OK] Task completed successfully!'
            });
          }
        }
      } else {
        // Fallback: send a new message if we can't update the original
        logger.warn('Cannot update message, sending new message', { channelId, messageTs });
        await client.chat.postMessage({
          channel: userId,
          text: '[OK] Task completed successfully!'
        });
      }

      logger.info('Task completed via button', { taskId });

    } catch (error) {
      logger.error('Error completing task', { 
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        taskId: (action as any).value,
        body: JSON.stringify(body, null, 2)
      });

      // Try to send error message to user
      try {
        await client.chat.postMessage({
          channel: body.user.id,
          text: '[ERROR] Error completing task. Please try again.'
        });
      } catch (fallbackError) {
        logger.error('Failed to send error message', { fallbackError });
      }
    }
  });

  // Open folder button handler
  app.action(/^open_folder_(.+)$/, async ({ ack, body, client, action }) => {
    // Acknowledge immediately to prevent timeout
    await ack();
    
    try {
      // Parse action value to validate
      const actionValue = (action as any).value;

      if (!actionValue) {
        logger.error('Missing action value in folder button');
        return;
      }

      let taskId, urls;
      try {
        const parsed = JSON.parse(actionValue);
        taskId = parsed.taskId;
        urls = parsed.urls;
      } catch (parseError) {
        logger.error('Failed to parse folder button payload', { actionValue, parseError });
        return;
      }

      const userId = body.user.id;

      if (!taskId || !urls || !Array.isArray(urls)) {
        logger.error('Invalid folder button payload', { taskId, urls });
        return;
      }

      logger.info('Folder button clicked', {
        taskId,
        userId,
        urlCount: urls.length
      });

      // Get channel ID safely
      let channelId: string;
      if ('channel' in body && body.channel) {
        channelId = (body.channel as any).id;
      } else if ('message' in body && body.message && 'channel' in body.message) {
        channelId = (body.message as any).channel;
      } else {
        // Fallback: try to get from the original message context
        logger.warn('Could not determine channel ID, using user ID as fallback', { userId });
        channelId = userId; // Use user ID for DM
      }

      logger.info('Folder button clicked', {
        taskId,
        userId,
        channelId,
        urlCount: urls.length,
        bodyKeys: Object.keys(body)
      });

      const { TaskService } = await import('@/services/taskService');
      const { detectFolderUrls, getFolderIcon } = await import('@/utils/urlDetection');

      const taskService = new TaskService();

      if (urls.length === 1) {
        // Single URL - open directly
        const url = urls[0];
        await taskService.logFolderAccess(taskId, url, userId);

        // Send message with link (use postMessage for DM channels)
        await client.chat.postMessage({
          channel: channelId,
          text: `[FOLDER] フォルダを開いています...`,
          blocks: [
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: `[FOLDER] *フォルダを開いています...*\n\n<${url}|フォルダを開く>`
              }
            }
          ]
        });

      } else {
        // Multiple URLs - show selection
        const folderUrls = detectFolderUrls(urls.join(' '));

        if (folderUrls.length === 0) {
          // No valid URLs found, show raw URLs
          const folderBlocks = urls.map((url: string, index: number) => ({
            type: 'section' as const,
            text: {
              type: 'mrkdwn' as const,
              text: `[FOLDER] *フォルダ ${index + 1}*`
            },
            accessory: {
              type: 'button' as const,
              text: {
                type: 'plain_text' as const,
                text: '開く'
              },
              action_id: `open_single_folder_${taskId}_${index}`,
              value: JSON.stringify({ taskId, url: url, userId })
            }
          }));

          await client.chat.postMessage({
            channel: channelId,
            text: '[FOLDER] フォルダを選択してください',
            blocks: [
              {
                type: 'section',
                text: {
                  type: 'mrkdwn',
                  text: '[FOLDER] *フォルダを選択してください*'
                }
              },
              {
                type: 'divider'
              },
              ...folderBlocks
            ]
          });
        } else {
          // Valid URLs found
          const folderBlocks = folderUrls.map((folder, index) => ({
            type: 'section' as const,
            text: {
              type: 'mrkdwn' as const,
              text: `${getFolderIcon(folder.type)} *${folder.title || folder.type}*`
            },
            accessory: {
              type: 'button' as const,
              text: {
                type: 'plain_text' as const,
                text: '開く'
              },
              action_id: `open_single_folder_${taskId}_${index}`,
              value: JSON.stringify({ taskId, url: folder.url, userId })
            }
          }));

          await client.chat.postMessage({
            channel: channelId,
            text: '[FOLDER] フォルダを選択してください',
            blocks: [
              {
                type: 'section',
                text: {
                  type: 'mrkdwn',
                  text: '[FOLDER] *フォルダを選択してください*'
                }
              },
              {
                type: 'divider'
              },
              ...folderBlocks
            ]
          });
        }
      }

      logger.info('Folder access requested successfully', { taskId, userId, urlCount: urls.length });

    } catch (error) {
      logger.error('Error opening folder', { error, actionValue: (action as any).value });

      // Send error message to user
      try {
        await client.chat.postMessage({
          channel: body.user.id, // Use user ID as fallback
          text: '[ERROR] フォルダを開く際にエラーが発生しました。',
          blocks: [
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: '[ERROR] *エラー*\n\nフォルダを開く際にエラーが発生しました。しばらく後でもう一度お試しください。'
              }
            }
          ]
        });
      } catch (fallbackError) {
        logger.error('Failed to send error message', { fallbackError });
      }
    }
  });

  // Single folder open handler
  app.action(/^open_single_folder_(.+)_(\d+)$/, async ({ ack, body, client, action }) => {
    // Acknowledge immediately to prevent timeout
    await ack();
    
    try {
      const actionValue = (action as any).value;

      if (!actionValue) {
        logger.error('Missing action value in single folder button');
        return;
      }

      let taskId, url, userId;
      try {
        const parsed = JSON.parse(actionValue);
        taskId = parsed.taskId;
        url = parsed.url;
        userId = parsed.userId;
      } catch (parseError) {
        logger.error('Failed to parse single folder button payload', { actionValue, parseError });
        return;
      }

      if (!taskId || !url || !userId) {
        logger.error('Invalid single folder button payload', { taskId, url, userId });
        return;
      }

      // Get channel ID safely
      let channelId: string;
      if ('channel' in body && body.channel) {
        channelId = (body.channel as any).id;
      } else {
        channelId = userId; // Use user ID for DM
      }

      const { TaskService } = await import('@/services/taskService');
      const taskService = new TaskService();

      await taskService.logFolderAccess(taskId, url, userId);

      // Send message with link
      await client.chat.postMessage({
        channel: channelId,
        text: `[FOLDER] フォルダを開いています...`,
        blocks: [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `[FOLDER] *フォルダを開いています...*\n\n<${url}|フォルダを開く>`
            }
          }
        ]
      });

      logger.info('Single folder opened', { taskId, url, userId, channelId });

    } catch (error) {
      logger.error('Error opening single folder', { error, actionValue: (action as any).value });

      // Send error message to user
      try {
        await client.chat.postMessage({
          channel: body.user.id,
          text: '[ERROR] フォルダを開く際にエラーが発生しました。',
          blocks: [
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: '[ERROR] *エラー*\n\nフォルダを開く際にエラーが発生しました。しばらく後でもう一度お試しください。'
              }
            }
          ]
        });
      } catch (fallbackError) {
        logger.error('Failed to send single folder error message', { fallbackError });
      }
    }
  });

  // View thread button handler
  app.action(/^view_thread_(.+)$/, async ({ ack, body, client, action }) => {
    await ack();

    try {
      const sourceMetadata = JSON.parse((action as any).value);
      const { channelId, threadTs, permalink } = sourceMetadata;

      // Get user language
      const { getPrismaClient } = await import('@/config/database');
      const prisma = getPrismaClient();
      
      const user = await prisma.user.findUnique({
        where: { slackUserId: body.user.id }
      });
      const language = user?.language as 'ja' | 'en' || 'ja';

      // Post message with link to thread
      if (permalink) {
        // If we have a permalink, use it
        await client.chat.postEphemeral({
          channel: body.user.id,
          user: body.user.id,
          text: language === 'ja' ? '[スレッド] 元の会話に移動' : '[Thread] Go to original conversation',
          blocks: [
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: language === 'ja' 
                  ? `[スレッド] *元の会話に移動*\n\n<${permalink}|スレッドを開く>`
                  : `[Thread] *Go to Original Conversation*\n\n<${permalink}|Open Thread>`
              }
            }
          ]
        });
      } else if (channelId) {
        // Fallback: provide channel link
        const channelLink = `slack://channel?id=${channelId}&team=${body.team?.id}`;
        await client.chat.postEphemeral({
          channel: body.user.id,
          user: body.user.id,
          text: language === 'ja' ? '[スレッド] チャンネルに移動' : '[Thread] Go to channel',
          blocks: [
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: language === 'ja' 
                  ? `[スレッド] *チャンネルに移動*\n\n<${channelLink}|#${sourceMetadata.channelName || channelId}を開く>`
                  : `[Thread] *Go to Channel*\n\n<${channelLink}|Open #${sourceMetadata.channelName || channelId}>`
              }
            }
          ]
        });
      }

      logger.info('Thread view requested', { channelId, threadTs, hasPermalink: !!permalink });

    } catch (error) {
      logger.error('Error viewing thread', { error, actionValue: (action as any).value });
    }
  });

  // Register hierarchy routes
  registerHierarchyRoutes(app);
  
  // Register mention routes
  registerMentionRoutes(app);
  
  // Setup Quick Reply handler for bot mentions (skip in OAuth mode)
  if (!isOAuthEnabled && BOT_USER_ID) {
    setupQuickReplyHandler(app, BOT_USER_ID);
    logger.info('Quick Reply handler configured');
  } else {
    logger.info('OAuth mode enabled, skipping Quick Reply handler setup');
  }

  logger.info('Slack routes configured successfully');
}