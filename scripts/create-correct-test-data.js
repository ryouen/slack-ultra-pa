const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function createCorrectTestData() {
  try {
    console.log('[START] Creating CORRECT test data...\n');
    console.log('[INFO] This system tracks mentions of the USER, not the bot!');
    console.log('[INFO] The bot (ultraPA) helps the user manage their mentions.\n');

    // Get the first user
    const user = await prisma.user.findFirst();
    if (!user) {
      console.error('[ERROR] No user found. Please run the app and use /todo today first.');
      return;
    }

    console.log(`[USER] Found user with Slack ID: ${user.slackUserId}`);
    console.log('[INFO] In real usage, this user would be mentioned by others like:');
    console.log('       "@ryosu can you review this?" or "@りょーえん 確認お願いします"\n');

    // Clear existing test data
    console.log('[CLEANUP] Clearing old test data...');
    await prisma.inboxItem.deleteMany({ where: { userId: user.id } });
    await prisma.task.deleteMany({ where: { userId: user.id } });

    // Create realistic tasks
    const tasks = [
      {
        title: 'コードレビュー：認証機能の実装',
        description: '山田さんからのPR #234のレビュー依頼。セキュリティ面を重点的に確認する必要あり。',
        priority: 'P1',
        priorityScore: 0.8,
        level: 'SUB_TASK',
        dueDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000), // Tomorrow
      },
      {
        title: 'Q4予算計画書の作成',
        description: '経理部門への提出期限は今週金曜日。前年度比較と来期の投資計画を含める。',
        priority: 'P1',
        priorityScore: 0.9,
        level: 'MID_TASK',
        dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days
      },
      {
        title: '新入社員オンボーディング資料の更新',
        description: '来月入社予定の3名向け。最新のツールとプロセスを反映させる。',
        priority: 'P2',
        priorityScore: 0.4,
        level: 'SUB_TASK',
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 1 week
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

    // Create realistic mentions (other users mentioning OUR user)
    const mentions = [
      {
        slackTs: `${Date.now() / 1000}`,
        channelId: 'C01234567',
        channelName: 'dev-backend',
        messageText: `@${user.slackUserId} データベースのマイグレーションスクリプトのレビューをお願いします。明日のデプロイまでに確認が必要です。PRリンク: https://github.com/company/backend/pull/456`,
        authorId: 'U98765432', // 鈴木さん
        status: 'PENDING',
        collectionType: 'MENTION',
        expiresAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
      },
      {
        slackTs: `${(Date.now() / 1000) + 1}`,
        channelId: 'C09876543',
        channelName: 'project-ai-assistant',
        messageText: `@${user.slackUserId} 来週月曜日の15時からAIアシスタントプロジェクトのキックオフミーティングを開催します。アジェンダを事前に共有してもらえますか？`,
        authorId: 'U11223344', // 山田部長
        status: 'PENDING',
        collectionType: 'MENTION',
        expiresAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
      },
      {
        slackTs: `${(Date.now() / 1000) + 2}`,
        channelId: 'C55667788',
        channelName: 'sales-team',
        messageText: `@${user.slackUserId} 明日の顧客デモの技術サポートをお願いできますか？13:00-14:00の予定です。製品の新機能について説明が必要です。`,
        authorId: 'U33445566', // 営業の田中さん
        status: 'PENDING',
        collectionType: 'MENTION',
        expiresAt: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000),
      }
    ];

    // Create inbox items
    console.log('\n[MENTIONS] Creating mentions (messages where YOU are mentioned)...');
    for (const mentionData of mentions) {
      const inbox = await prisma.inboxItem.create({
        data: {
          ...mentionData,
          userId: user.id
        }
      });
      console.log(`  ✓ From #${inbox.channelName}: "${inbox.messageText.substring(0, 60)}..."`);
    }

    console.log('\n[SUCCESS] Correct test data created!');
    console.log('\n[NEXT STEPS]');
    console.log('1. Run "/todo today" in Slack');
    console.log('2. You will see:');
    console.log('   - 3 tasks in your task list');
    console.log('   - 3 mentions where OTHER people mentioned YOU');
    console.log('3. For each mention, you can:');
    console.log('   - Convert to task');
    console.log('   - Ignore');
    console.log('   - Generate Quick Reply\n');

  } catch (error) {
    console.error('[ERROR]', error);
  } finally {
    await prisma.$disconnect();
  }
}

createCorrectTestData();