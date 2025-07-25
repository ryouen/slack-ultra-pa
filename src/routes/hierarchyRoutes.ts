import { App } from '@slack/bolt';
import { logger } from '@/utils/logger';
import { HierarchyService } from '@/services/hierarchyService';
import { getPrismaClient } from '@/config/database';
import { getChannelId, getUserId } from '@/utils/getChannelId';

export function registerHierarchyRoutes(app: App) {
  const hierarchyService = new HierarchyService();
  const prisma = getPrismaClient();

  /**
   * Settings command - Show user preferences including AI hierarchy toggle
   */
  app.command('/settings', async ({ command, ack, client }) => {
    await ack();

    try {
      const userId = command.user_id;
      
      // Get user preferences
      const user = await prisma.user.findUnique({
        where: { slackUserId: userId }
      });

      if (!user) {
        await client.chat.postEphemeral({
          channel: command.channel_id,
          user: userId,
          text: '[WARNING] ユーザー情報が見つかりません / User not found'
        });
        return;
      }

      const preferences = JSON.parse(user.preferences || '{}');
      const language = user.language as 'ja' | 'en';
      const hierarchyAI = preferences.hierarchyAI === true;

      // Build settings UI
      await client.chat.postEphemeral({
        channel: command.channel_id,
        user: userId,
        blocks: [
          {
            type: 'header',
            text: {
              type: 'plain_text',
              text: language === 'ja' ? '[SETTINGS] 設定' : '[SETTINGS] Settings'
            }
          },
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: language === 'ja' 
                ? '*現在の設定*\n個人設定を確認・変更できます。'
                : '*Current Settings*\nView and modify your personal preferences.'
            }
          },
          {
            type: 'divider'
          },
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: language === 'ja'
                ? `*[LANG] 言語 / Language*\n現在: ${user.language === 'ja' ? '日本語' : 'English'}`
                : `*[LANG] Language*\nCurrent: ${user.language === 'ja' ? '日本語' : 'English'}`
            },
            accessory: {
              type: 'button',
              text: {
                type: 'plain_text',
                text: language === 'ja' ? '変更' : 'Change'
              },
              action_id: 'change_language',
              value: user.language === 'ja' ? 'en' : 'ja'
            }
          },
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: language === 'ja'
                ? `*[AI] AI階層分析*\nタスクの階層（プロジェクト/中タスク/小タスク）をAIで自動判定します。\n現在: ${hierarchyAI ? '[OK] 有効' : '[ERROR] 無効'}`
                : `*[AI] AI Hierarchy Analysis*\nAutomatically classify tasks (Project/Mid-task/Sub-task) using AI.\nCurrent: ${hierarchyAI ? '[OK] Enabled' : '[ERROR] Disabled'}`
            },
            accessory: {
              type: 'button',
              text: {
                type: 'plain_text',
                text: hierarchyAI 
                  ? (language === 'ja' ? '無効にする' : 'Disable')
                  : (language === 'ja' ? '有効にする' : 'Enable')
              },
              action_id: 'toggle_hierarchy_ai',
              value: hierarchyAI ? 'false' : 'true',
              style: hierarchyAI ? 'danger' : 'primary'
            }
          },
          {
            type: 'context',
            elements: [
              {
                type: 'mrkdwn',
                text: language === 'ja'
                  ? '[TIP] *ヒント*: AI分析を有効にすると、より精度の高い階層判定が可能になりますが、処理に少し時間がかかります。'
                  : '[TIP] *Tip*: Enabling AI analysis provides more accurate hierarchy detection but may take slightly longer to process.'
              }
            ]
          },
          {
            type: 'divider'
          },
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: language === 'ja'
                ? '*[CHART] 階層ビュー*\n現在のタスク階層を確認'
                : '*[CHART] Hierarchy View*\nView your current task hierarchy'
            },
            accessory: {
              type: 'button',
              text: {
                type: 'plain_text',
                text: language === 'ja' ? '表示' : 'View'
              },
              action_id: 'view_hierarchy',
              value: 'show'
            }
          }
        ]
      });

    } catch (error) {
      logger.error('Failed to show settings', { error, userId: command.user_id });
    }
  });

  /**
   * Toggle hierarchy AI setting
   */
  app.action('toggle_hierarchy_ai', async ({ ack, body, client }) => {
    await ack();

    try {
      const userId = (body as any).user.id;
      const enable = (body as any).actions[0].value === 'true';

      // Update user preferences
      const user = await prisma.user.findUnique({
        where: { slackUserId: userId }
      });

      if (!user) return;

      const preferences = JSON.parse(user.preferences || '{}');
      preferences.hierarchyAI = enable;

      await prisma.user.update({
        where: { id: user.id },
        data: { preferences: JSON.stringify(preferences) }
      });

      const language = user.language as 'ja' | 'en';

      // Show confirmation
      await client.chat.postEphemeral({
        channel: getChannelId(body),
        user: userId,
        text: language === 'ja'
          ? `[OK] AI階層分析を${enable ? '有効' : '無効'}にしました。`
          : `[OK] AI hierarchy analysis ${enable ? 'enabled' : 'disabled'}.`
      });

      logger.info('Updated hierarchy AI preference', { userId, enable });

    } catch (error) {
      logger.error('Failed to toggle hierarchy AI', { error });
    }
  });

  /**
   * View hierarchy visualization
   */
  app.action('view_hierarchy', async ({ ack, body, client }) => {
    await ack();

    try {
      const userId = (body as any).user.id;
      
      // Get user
      const user = await prisma.user.findUnique({
        where: { slackUserId: userId }
      });

      if (!user) return;

      const language = user.language as 'ja' | 'en';
      
      // Get hierarchy data
      const hierarchyData = await hierarchyService.getHierarchyVisualization(user.id);

      // Build visualization blocks
      const blocks: any[] = [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: language === 'ja' ? '[CHART] タスク階層ビュー' : '[CHART] Task Hierarchy View'
          }
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: language === 'ja'
              ? `*サマリー*\n• プロジェクト: ${hierarchyData.summary.totalProjects}件\n• 中タスク: ${hierarchyData.summary.totalMidTasks}件\n• 小タスク: ${hierarchyData.summary.totalSubTasks}件\n• 未整理: ${hierarchyData.summary.orphanedCount}件`
              : `*Summary*\n• Projects: ${hierarchyData.summary.totalProjects}\n• Mid-tasks: ${hierarchyData.summary.totalMidTasks}\n• Sub-tasks: ${hierarchyData.summary.totalSubTasks}\n• Unorganized: ${hierarchyData.summary.orphanedCount}`
          }
        },
        {
          type: 'divider'
        }
      ];

      // Add project hierarchies
      if (hierarchyData.hierarchy.length > 0) {
        blocks.push({
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: language === 'ja' ? '*[PROJECT] プロジェクト階層*' : '*[PROJECT] Project Hierarchy*'
          }
        });

        hierarchyData.hierarchy.forEach((project: any) => {
          let hierarchyText = `*${project.title}*\n`;
          
          project.children.forEach((midTask: any) => {
            hierarchyText += `  └ ${midTask.title} (${midTask.taskCount})\n`;
            
            if (midTask.children.length > 0 && midTask.children.length <= 3) {
              midTask.children.forEach((subTask: any) => {
                hierarchyText += `      └ ${subTask.title}\n`;
              });
            } else if (midTask.children.length > 3) {
              hierarchyText += language === 'ja' 
                ? `      └ ... 他${midTask.children.length}件\n`
                : `      └ ... ${midTask.children.length} more\n`;
            }
          });

          blocks.push({
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: hierarchyText
            }
          });
        });
      }

      // Add orphaned tasks if any
      if (hierarchyData.summary.orphanedCount > 0) {
        blocks.push({
          type: 'divider'
        });
        
        blocks.push({
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: language === 'ja'
              ? `*[WARNING] 未整理のタスク*\n階層に属していないタスクが${hierarchyData.summary.orphanedCount}件あります。`
              : `*[WARNING] Unorganized Tasks*\nYou have ${hierarchyData.summary.orphanedCount} tasks not in any hierarchy.`
          },
          accessory: {
            type: 'button',
            text: {
              type: 'plain_text',
              text: language === 'ja' ? '自動整理' : 'Auto-organize'
            },
            action_id: 'auto_organize_tasks',
            value: 'organize'
          }
        });
      }

      // Send visualization
      await client.chat.postEphemeral({
        channel: getChannelId(body),
        user: userId,
        blocks
      });

    } catch (error) {
      logger.error('Failed to show hierarchy', { error });
    }
  });

  /**
   * Auto-organize orphaned tasks
   */
  app.action('auto_organize_tasks', async ({ ack, body, client }) => {
    await ack();

    try {
      const userId = (body as any).user.id;
      
      // Get user
      const user = await prisma.user.findUnique({
        where: { slackUserId: userId }
      });

      if (!user) return;

      const language = user.language as 'ja' | 'en';
      const preferences = JSON.parse(user.preferences || '{}');
      const useAI = preferences.hierarchyAI === true;

      // Get orphaned tasks
      const orphanedTasks = await prisma.task.findMany({
        where: {
          userId: user.id,
          parentId: null,
          level: { in: ['MID_TASK', 'SUB_TASK'] },
          status: { not: 'COMPLETED' }
        }
      });

      let organizedCount = 0;
      let createdProjects = 0;

      // Process each orphaned task
      for (const task of orphanedTasks) {
        const result = await hierarchyService.analyzeTaskHierarchy(task, { 
          useAI, 
          userId: user.id 
        });

        if (result.suggestedParent) {
          await prisma.task.update({
            where: { id: task.id },
            data: { parentId: result.suggestedParent }
          });
          organizedCount++;
        }
      }

      // Check for auto-promotions
      const tasksToCheck = await prisma.task.findMany({
        where: {
          userId: user.id,
          children: {
            some: {}
          }
        },
        include: {
          children: true
        }
      });

      for (const task of tasksToCheck) {
        const promotionResult = await hierarchyService.checkAutoPromotion(task.id);
        if (promotionResult.promoted && promotionResult.newLevel === 'PROJECT') {
          createdProjects++;
        }
      }

      // Send result
      await client.chat.postEphemeral({
        channel: getChannelId(body),
        user: userId,
        text: language === 'ja'
          ? `[OK] 自動整理完了\n• 整理されたタスク: ${organizedCount}件\n• 新規作成プロジェクト: ${createdProjects}件`
          : `[OK] Auto-organization complete\n• Tasks organized: ${organizedCount}\n• Projects created: ${createdProjects}`
      });

    } catch (error) {
      logger.error('Failed to auto-organize tasks', { error });
    }
  });

  logger.info('Hierarchy routes registered');
}