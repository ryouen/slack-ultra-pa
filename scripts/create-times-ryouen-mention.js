const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function createTimesRyouenMention() {
  try {
    console.log('[TEST] Creating #times_ryouen mention...\n');

    // Get the first user
    const user = await prisma.user.findFirst();
    if (!user) {
      console.error('[ERROR] No user found. Please run the app first.');
      return;
    }

    console.log(`[USER] Creating mention for: ${user.slackUserId}\n`);

    // Create a realistic mention from #times_ryouen
    const mention = await prisma.inboxItem.create({
      data: {
        slackTs: '1753404206.917869',
        channelId: 'C0979H6S0P8',
        channelName: 'times_ryouen',
        messageText: `[TEST] @${user.slackUserId} プロジェクトの進捗状況を共有します。\n\n【完了】\n- API設計書の作成\n- データベーススキーマの定義\n- 認証機能の実装\n\n【進行中】\n- メンション収集機能の改善（User Token対応検討中）\n- Quick Reply機能のテスト\n\n【今後の予定】\n- パフォーマンス最適化\n- ドキュメント整備\n\n何か質問や提案があればお知らせください。`,
        authorId: 'U_RYOUEN',
        status: 'PENDING',
        collectionType: 'MENTION',
        createdAt: new Date(Date.now() - (2 * 60 * 60 * 1000)), // 2 hours ago
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        userId: user.id,
        hasReplied: false,
        replyCount: 0,
        isTaskCreated: false,
        importance: 'medium',
        permalink: 'https://zentechworld.slack.com/archives/C0979H6S0P8/p1753404206917869'
      }
    });

    console.log('[SUCCESS] Created mention from #times_ryouen');
    console.log(`\n[DETAILS]`);
    console.log(`- Channel: #times_ryouen`);
    console.log(`- Author: ryouen`);
    console.log(`- Time: 2時間前`);
    console.log(`- Type: プロジェクト進捗報告`);
    console.log(`- Permalink: ${mention.permalink}`);
    
    console.log('\n[TEST] You can now:');
    console.log('1. Run `/mention` to see this mention');
    console.log('2. Test Quick Reply to generate response suggestions');
    console.log('3. Convert to task for follow-up');
    console.log('4. Click the → button to navigate to the thread\n');

  } catch (error) {
    console.error('[ERROR]', error);
  } finally {
    await prisma.$disconnect();
  }
}

createTimesRyouenMention();