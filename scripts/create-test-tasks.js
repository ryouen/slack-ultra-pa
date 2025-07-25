// Script to create test tasks in the database
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function createTestTasks() {
  try {
    console.log('[TEST] Creating test tasks...\n');

    // Get the first user
    const user = await prisma.user.findFirst();
    if (!user) {
      console.error('[ERROR] No user found. Please ensure the app has been used at least once.');
      return;
    }

    console.log(`[INFO] Creating tasks for user: ${user.slackUserId}`);

    // Test tasks
    const tasks = [
      {
        title: '週次レポートを作成する',
        description: '今週の進捗をまとめる',
        priority: 'P1',
        priorityScore: 85,
        status: 'TODO',
        userId: user.id
      },
      {
        title: 'プロジェクト会議の準備',
        description: '明日の会議資料を準備',
        priority: 'P1',
        priorityScore: 90,
        status: 'TODO',
        userId: user.id,
        dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000) // Tomorrow
      },
      {
        title: 'コードレビューを完了する',
        description: 'PRのレビュー依頼が3件',
        priority: 'P2',
        priorityScore: 70,
        status: 'TODO',
        userId: user.id
      },
      {
        title: 'ドキュメントを更新',
        description: 'APIドキュメントの更新',
        priority: 'P3',
        priorityScore: 50,
        status: 'TODO',
        userId: user.id
      },
      {
        title: 'チームミーティング',
        description: '定例のチームミーティング',
        priority: 'P2',
        priorityScore: 60,
        status: 'TODO',
        userId: user.id,
        dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000) // 2 days later
      }
    ];

    // Create tasks
    for (const task of tasks) {
      const created = await prisma.task.create({
        data: task
      });
      console.log(`[CREATED] ${created.title} (${created.priority})`);
    }

    console.log(`\n[SUCCESS] Created ${tasks.length} test tasks`);
    console.log('[INFO] Run /todo today in Slack to see them');

  } catch (error) {
    console.error('[ERROR] Failed to create test tasks:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createTestTasks();