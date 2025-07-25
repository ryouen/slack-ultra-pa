const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function createRealChannelTestData() {
  try {
    console.log('[START] Creating test data for real channels...\n');
    console.log('[INFO] This will create mentions in #times_ryouen channel');
    console.log('[INFO] Make sure the bot is added to #times_ryouen channel first!\n');

    // Get the first user
    const user = await prisma.user.findFirst();
    if (!user) {
      console.error('[ERROR] No user found. Please run the app and use /todo today first.');
      return;
    }

    console.log(`[USER] Found user with Slack ID: ${user.slackUserId}`);

    // Clear existing test data
    console.log('[CLEANUP] Clearing old test data...');
    await prisma.inboxItem.deleteMany({ where: { userId: user.id } });
    await prisma.task.deleteMany({ where: { userId: user.id } });

    // Create realistic tasks
    const tasks = [
      {
        title: '#times_ryouenでのテストタスク',
        description: 'Quick Reply機能のテストを実施し、正常に動作することを確認する',
        priority: 'P1',
        priorityScore: 0.9,
        level: 'SUB_TASK',
        dueDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000), // Tomorrow
      },
      {
        title: 'チャンネル権限の設定確認',
        description: 'ボットが各チャンネルに正しくアクセスできるか確認',
        priority: 'P1',
        priorityScore: 0.8,
        level: 'SUB_TASK',
        dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // 2 days
      }
    ];

    // Create tasks
    console.log('\n[TASKS] Creating tasks...');
    for (const taskData of tasks) {
      const task = await prisma.task.create({
        data: {
          ...taskData,
          userId: user.id,
          status: 'PENDING',
          folderUrls: '[]'
        }
      });
      console.log(`  ✓ ${task.title}`);
    }

    // IMPORTANT: Ask user for the real channel ID
    console.log('\n[IMPORTANT] You need to get the real channel ID for #times_ryouen');
    console.log('[HELP] To get channel ID:');
    console.log('  1. Right-click on #times_ryouen in Slack');
    console.log('  2. Select "View channel details"');
    console.log('  3. Scroll down to find the Channel ID (starts with C)');
    console.log('  4. Update the channelId in the mentions below\n');

    // Create mentions with placeholder channel ID
    const mentions = [
      {
        slackTs: `${Date.now() / 1000}`,
        channelId: 'C_REPLACE_WITH_REAL_ID', // TODO: Replace with real channel ID
        channelName: 'times_ryouen',
        messageText: `@${user.slackUserId} Quick Reply機能のテストです。このメッセージに返信できるか確認してください。`,
        authorId: 'U98765432', // テストユーザー
        status: 'PENDING',
        collectionType: 'MENTION',
        expiresAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
      },
      {
        slackTs: `${(Date.now() / 1000) + 1}`,
        channelId: 'C_REPLACE_WITH_REAL_ID', // TODO: Replace with real channel ID
        channelName: 'times_ryouen',
        messageText: `@${user.slackUserId} チャンネルへの返信機能が正常に動作するか確認お願いします。`,
        authorId: 'U11223344', // 別のテストユーザー
        status: 'PENDING',
        collectionType: 'MENTION',
        expiresAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
      }
    ];

    // Create inbox items
    console.log('[MENTIONS] Creating mentions (YOU NEED TO UPDATE CHANNEL IDs!)...');
    for (const mentionData of mentions) {
      const inbox = await prisma.inboxItem.create({
        data: {
          ...mentionData,
          userId: user.id
        }
      });
      console.log(`  ✓ From #${inbox.channelName}: "${inbox.messageText.substring(0, 60)}..."`);
    }

    console.log('\n[WARNING] Channel IDs are placeholders!');
    console.log('[ACTION REQUIRED]');
    console.log('1. Get the real channel ID for #times_ryouen');
    console.log('2. Update this script with the real channel ID');
    console.log('3. Run the script again');
    console.log('\nOR use the Slack API tester to get channel list:');
    console.log('https://api.slack.com/methods/conversations.list/test\n');

  } catch (error) {
    console.error('[ERROR]', error);
  } finally {
    await prisma.$disconnect();
  }
}

createRealChannelTestData();