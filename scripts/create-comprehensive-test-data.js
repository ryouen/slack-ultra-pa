const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function createComprehensiveTestData() {
  try {
    console.log('[TEST] Creating comprehensive test data for /mention feature...\n');

    // Get the first user
    const user = await prisma.user.findFirst();
    if (!user) {
      console.error('[ERROR] No user found. Please run the app first.');
      return;
    }

    console.log(`[USER] Testing for user: ${user.slackUserId}\n`);

    // Clear existing test mentions (keep tasks)
    console.log('[CLEANUP] Clearing existing test mentions...');
    await prisma.inboxItem.deleteMany({ 
      where: { 
        userId: user.id,
        messageText: { contains: '[TEST]' }
      } 
    });

    // Create various test scenarios
    const testScenarios = [
      // Scenario 1: Urgent request
      {
        messageText: `[TEST] @${user.slackUserId} 緊急！プロダクションでエラーが発生しています。至急確認をお願いします。エラーログ: https://example.com/logs/12345`,
        channelName: 'dev-urgent',
        channelId: 'C_TEST_URG',
        importance: 'high',
        hoursAgo: 1,
        authorName: '山田太郎'
      },
      // Scenario 2: Meeting request
      {
        messageText: `[TEST] @${user.slackUserId} 来週の火曜日15時から新プロジェクトのキックオフミーティングを開催したいのですが、ご都合いかがでしょうか？`,
        channelName: 'project-planning',
        channelId: 'C_TEST_MTG',
        importance: 'medium',
        hoursAgo: 6,
        authorName: '佐藤部長'
      },
      // Scenario 3: Code review request
      {
        messageText: `[TEST] @${user.slackUserId} PR #456のコードレビューをお願いします。認証機能の実装で、セキュリティ面を重点的に見ていただけますか？`,
        channelName: 'dev-backend',
        channelId: 'C_TEST_DEV',
        importance: 'medium',
        hoursAgo: 24,
        authorName: '鈴木'
      },
      // Scenario 4: Simple question
      {
        messageText: `[TEST] @${user.slackUserId} 先日の資料はどこに保存されていますか？`,
        channelName: 'general',
        channelId: 'C_TEST_GEN',
        importance: 'low',
        hoursAgo: 36,
        authorName: '田中'
      },
      // Scenario 5: Already replied (for testing unread filter)
      {
        messageText: `[TEST] @${user.slackUserId} 昨日の件、確認できましたか？`,
        channelName: 'random',
        channelId: 'C_TEST_RND',
        importance: 'low',
        hoursAgo: 72,
        hasReplied: true,
        authorName: '高橋'
      },
      // Scenario 6: Task already created (just over 48 hours)
      {
        messageText: `[TEST] @${user.slackUserId} 月次レポートの作成をお願いします。締切は今月末です。`,
        channelName: 'reports',
        channelId: 'C_TEST_RPT',
        importance: 'medium',
        hoursAgo: 49, // Changed to 49 hours to test 48h boundary
        isTaskCreated: true,
        authorName: '伊藤'
      }
    ];

    console.log('[CREATE] Creating test mentions...\n');
    const createdMentions = [];

    for (const scenario of testScenarios) {
      const timestamp = Date.now() - (scenario.hoursAgo * 60 * 60 * 1000);
      const slackTs = (timestamp / 1000).toString();

      const mention = await prisma.inboxItem.create({
        data: {
          slackTs,
          channelId: scenario.channelId,
          channelName: scenario.channelName,
          messageText: scenario.messageText,
          authorId: `U_TEST_${scenario.authorName}`,
          status: 'PENDING',
          collectionType: 'MENTION',
          createdAt: new Date(timestamp), // Explicitly set createdAt
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          userId: user.id,
          hasReplied: scenario.hasReplied || false,
          replyCount: scenario.hasReplied ? 1 : 0,
          isTaskCreated: scenario.isTaskCreated || false,
          importance: scenario.importance,
          // For testing, we'll use a mock permalink format
          permalink: `https://slack.com/archives/${scenario.channelId}/p${slackTs.replace('.', '')}`
        }
      });

      createdMentions.push(mention);
      
      const status = [];
      if (scenario.hasReplied) status.push('返信済み');
      if (scenario.isTaskCreated) status.push('タスク化済み');
      const statusText = status.length > 0 ? ` [${status.join(', ')}]` : '';
      
      console.log(`  ✓ ${scenario.hoursAgo}時間前 - #${scenario.channelName} from ${scenario.authorName}${statusText}`);
      console.log(`    "${scenario.messageText.substring(0, 60)}..."\n`);
    }

    // Create a task from one of the mentions for testing
    if (testScenarios[5].isTaskCreated) {
      const taskMention = createdMentions[5];
      const task = await prisma.task.create({
        data: {
          title: `返信: ${taskMention.messageText.substring(0, 50)}...`,
          description: taskMention.messageText,
          userId: user.id,
          priority: 'P2',
          priorityScore: 0.5,
          level: 'SUB_TASK',
          folderUrls: JSON.stringify([taskMention.permalink])
        }
      });
      
      await prisma.inboxItem.update({
        where: { id: taskMention.id },
        data: { taskId: task.id }
      });
    }

    console.log('[SUCCESS] Test data created!\n');
    console.log('[TEST SCENARIOS]');
    console.log('1. 緊急メンション (1時間前) - Quick Reply生成をテスト');
    console.log('2. 会議依頼 (6時間前) - 日程調整の返信案をテスト');
    console.log('3. コードレビュー (24時間前) - 技術的な返信案をテスト');
    console.log('4. 簡単な質問 (36時間前) - シンプルな返信案をテスト');
    console.log('5. 返信済み (72時間前) - unreadフィルタをテスト');
    console.log('6. タスク化済み (48時間前) - タスク化状態をテスト\n');
    
    console.log('[TEST COMMANDS]');
    console.log('1. /mention         → 48時間以内（4件表示されるはず）');
    console.log('2. /mention all     → すべて（6件表示）');
    console.log('3. /mention unread  → 未返信のみ（5件表示）\n');
    
    console.log('[ACTION TESTS]');
    console.log('- 各メンションの「返信案」ボタンでAI返信生成をテスト');
    console.log('- 「タスク化」ボタンでタスク作成をテスト');
    console.log('- 「既読」ボタンでアーカイブをテスト');
    console.log('- 「→」ボタンでpermalink動作をテスト（実際のSlackでは動作しません）\n');

  } catch (error) {
    console.error('[ERROR]', error);
  } finally {
    await prisma.$disconnect();
  }
}

createComprehensiveTestData();