import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create test user
  const testUser = await prisma.user.upsert({
    where: { slackUserId: 'UKS3XGZ1R' },
    update: {},
    create: {
      slackUserId: 'UKS3XGZ1R',
      timezone: 'Asia/Tokyo',
      language: 'ja',
      preferences: JSON.stringify({
        notifications: true,
        dailyReportTime: '08:00',
        weeklyReportDay: 1, // Monday
      }),
    },
  });

  console.log('✅ Created test user:', testUser.id);

  // Create sample tasks with 3-tier hierarchy
  const projectTask = await prisma.task.create({
    data: {
      title: 'Slack個人秘書AI開発プロジェクト',
      description: 'ユーザーが本来やるべきことに集中するためのSlack個人秘書AIの開発',
      status: 'IN_PROGRESS',
      priority: 'P1',
      level: 'PROJECT',
      priorityScore: 0.9,
      userId: testUser.id,
      dueDate: new Date('2025-08-31'),
      folderUrls: JSON.stringify([
        'https://drive.google.com/drive/folders/example1',
        'https://www.notion.so/workspace/project-page'
      ]),
    },
  });

  const midTask = await prisma.task.create({
    data: {
      title: 'タスク管理システム実装',
      description: '3階層タスク管理とAI優先度計算の実装',
      status: 'IN_PROGRESS',
      priority: 'P1',
      level: 'MID_TASK',
      parentId: projectTask.id,
      priorityScore: 0.8,
      userId: testUser.id,
      dueDate: new Date('2025-07-30'),
    },
  });

  await prisma.task.createMany({
    data: [
      {
        title: 'データベーススキーマ完成',
        description: 'Prismaスキーマの完成とマイグレーション',
        status: 'COMPLETED',
        priority: 'P1',
        level: 'SUB_TASK',
        parentId: midTask.id,
        priorityScore: 0.7,
        userId: testUser.id,
      },
      {
        title: 'タスクCRUD操作実装',
        description: 'タスクの作成・読み取り・更新・削除機能',
        status: 'PENDING',
        priority: 'P1',
        level: 'SUB_TASK',
        parentId: midTask.id,
        priorityScore: 0.75,
        userId: testUser.id,
        dueDate: new Date('2025-07-25'),
      },
      {
        title: 'AI優先度計算アルゴリズム',
        description: '期限・完了パターン・コンテキストブーストを考慮した優先度計算',
        status: 'PENDING',
        priority: 'P2',
        level: 'SUB_TASK',
        parentId: midTask.id,
        priorityScore: 0.6,
        userId: testUser.id,
        dueDate: new Date('2025-07-28'),
      },
    ],
  });

  // Create sample inbox items
  await prisma.inboxItem.createMany({
    data: [
      {
        slackTs: '1721721600.123456',
        channelId: 'C1234567890',
        channelName: 'general',
        messageText: '@ultraPA 来週の会議の資料準備をお願いします',
        status: 'PENDING',
        authorId: 'U9876543210',
        permalink: 'https://workspace.slack.com/archives/C1234567890/p1721721600123456',
        expiresAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // 2 days from now
        collectionType: 'MENTION',
        userId: testUser.id,
      },
      {
        slackTs: '1721635200.789012',
        channelId: 'C0987654321',
        channelName: 'project-alpha',
        messageText: '@ultraPA プロジェクトの進捗確認をしたいです',
        status: 'PENDING',
        authorId: 'U1111111111',
        permalink: 'https://workspace.slack.com/archives/C0987654321/p1721635200789012',
        expiresAt: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000), // 1 day from now
        collectionType: 'AUTO_COLLECTED',
        userId: testUser.id,
      },
    ],
  });

  // Create sample OAuth tokens (placeholder)
  await prisma.oAuthToken.create({
    data: {
      provider: 'GOOGLE_CALENDAR',
      accessToken: 'placeholder_access_token',
      refreshToken: 'placeholder_refresh_token',
      expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour from now
      scope: 'https://www.googleapis.com/auth/calendar',
      tokenType: 'Bearer',
      isValid: true,
      userId: testUser.id,
    },
  });

  // Create sample job queue entries
  await prisma.jobQueue.createMany({
    data: [
      {
        jobType: 'REMINDER',
        payload: JSON.stringify({
          taskId: midTask.id,
          reminderType: 'DUE_DATE',
          message: 'タスクの期限が近づいています',
        }),
        scheduledAt: new Date(Date.now() + 30 * 60 * 1000), // 30 minutes from now
        status: 'PENDING',
        userId: testUser.id,
      },
      {
        jobType: 'DAILY_REPORT',
        payload: JSON.stringify({
          reportType: 'DAILY',
          includeCompleted: true,
          includeUpcoming: true,
        }),
        scheduledAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
        status: 'PENDING',
        userId: testUser.id,
      },
    ],
  });

  console.log('✅ Database seeded successfully!');
  console.log('📊 Created:');
  console.log('  - 1 test user');
  console.log('  - 4 tasks (1 project, 1 mid-task, 2 sub-tasks)');
  console.log('  - 2 inbox items');
  console.log('  - 1 OAuth token');
  console.log('  - 2 job queue entries');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });