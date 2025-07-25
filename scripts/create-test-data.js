const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function createTestData() {
  try {
    console.log('[START] Creating test data...\n');

    // Get the first user
    const user = await prisma.user.findFirst();
    if (!user) {
      console.error('[ERROR] No user found. Please run the app and use /todo today first.');
      return;
    }

    console.log(`[USER] Found user: ${user.slackUserId}`);

    // Create test tasks
    const tasks = [
      {
        title: 'AI個人秘書プロジェクトの設計書レビュー',
        description: '来週のキックオフミーティングまでに設計書のレビューを完了する必要があります。特にアーキテクチャ部分を重点的に確認してください。',
        priority: 'P1',
        priorityScore: 0.8,
        level: 'MID_TASK',
        dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // 2 days from now
      },
      {
        title: 'Slackボットのテストケース作成',
        description: 'メンション機能、タスク管理機能、AI返信機能のテストケースを作成。Jestを使用して自動テストも実装する。',
        priority: 'P2',
        priorityScore: 0.6,
        level: 'SUB_TASK',
        dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // 5 days from now
      },
      {
        title: '週次ステータスレポートの作成',
        description: '今週の進捗状況をまとめて、チームに共有する。KPIの達成状況も含める。',
        priority: 'P2',
        priorityScore: 0.5,
        level: 'SUB_TASK',
        dueDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000), // Tomorrow
      }
    ];

    // Create tasks
    for (const taskData of tasks) {
      const task = await prisma.task.create({
        data: {
          ...taskData,
          userId: user.id,
          status: 'PENDING',
          folderUrls: '[]'
        }
      });
      console.log(`[TASK] Created: ${task.title}`);
    }

    // Create test inbox items (mentions)
    const mentions = [
      {
        slackTs: `${Date.now() / 1000}`,
        channelId: 'C01234567',
        channelName: 'dev-team',
        messageText: '@ultraPA プロダクションデプロイの準備はできていますか？明日の午後3時にリリース予定です。チェックリストを確認してください。',
        authorId: 'U98765432',
        status: 'PENDING',
        collectionType: 'MENTION',
        expiresAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
      },
      {
        slackTs: `${(Date.now() / 1000) + 1}`,
        channelId: 'C09876543',
        channelName: 'project-management',
        messageText: '@ultraPA 来週の月曜日にクライアントミーティングがあります。プレゼン資料の準備状況を教えてください。デモも必要です。',
        authorId: 'U11223344',
        status: 'PENDING',
        collectionType: 'MENTION',
        expiresAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
      }
    ];

    // Create inbox items
    for (const mentionData of mentions) {
      const inbox = await prisma.inboxItem.create({
        data: {
          ...mentionData,
          userId: user.id
        }
      });
      console.log(`[MENTION] Created: ${inbox.channelName} - ${inbox.messageText.substring(0, 50)}...`);
    }

    console.log('\n[SUCCESS] Test data created successfully!');
    console.log('[INFO] Run /todo today in Slack to see the tasks and mentions.');

  } catch (error) {
    console.error('[ERROR]', error);
  } finally {
    await prisma.$disconnect();
  }
}

createTestData();