const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function createTestMentionsWithPermalinks() {
  try {
    // Get a test user
    const user = await prisma.user.findFirst();
    if (!user) {
      console.log('No users found. Please create a user first.');
      return;
    }

    console.log(`Creating test mentions with real permalinks for user: ${user.slackUserId}`);

    // Test data with real permalinks
    const testMentions = [
      {
        slackTs: '1753404206.917869',
        channelId: 'C0979H6S0P8',
        channelName: 'general',
        messageText: '<@UKS3XGZ1R> プロジェクトの進捗確認をお願いします。今週中に報告書の提出が必要です。',
        authorId: 'U097E0TB6K4',
        permalink: 'https://zentechworld.slack.com/archives/C0979H6S0P8/p1753404206917869',
        userId: user.id,
        status: 'PENDING',
        collectionType: 'MENTION',
        expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000),
        hasReplied: false,
        importance: 'high'
      },
      {
        slackTs: '1753492627.937249',
        channelId: 'C0979H6S0P8',
        channelName: 'general',
        messageText: '<@UKS3XGZ1R> 明日の会議資料のレビューをお願いできますか？特にスライド15-20の内容について意見をください。',
        authorId: 'U097E0TB6K4',
        permalink: 'https://zentechworld.slack.com/archives/C0979H6S0P8/p1753492627937249',
        userId: user.id,
        status: 'PENDING',
        collectionType: 'MENTION',
        expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000),
        hasReplied: false,
        importance: 'medium'
      },
      {
        slackTs: '1753492647.822919',
        channelId: 'C0979H6S0P8',
        channelName: 'general',
        messageText: '<@UKS3XGZ1R> 来週火曜日の14時からミーティングを設定したいのですが、ご都合いかがでしょうか？',
        authorId: 'U097E0TB6K4',
        permalink: 'https://zentechworld.slack.com/archives/C0979H6S0P8/p1753492647822919',
        userId: user.id,
        status: 'PENDING',
        collectionType: 'MENTION',
        expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000),
        hasReplied: false,
        importance: 'medium'
      }
    ];

    // Create mentions
    for (const mention of testMentions) {
      // Check if already exists
      const existing = await prisma.inboxItem.findUnique({
        where: { slackTs: mention.slackTs }
      });

      if (existing) {
        console.log(`Mention already exists: ${mention.slackTs}`);
        continue;
      }

      const created = await prisma.inboxItem.create({
        data: mention
      });

      console.log(`Created mention: ${created.id}`);
      console.log(`  Channel: #${mention.channelName}`);
      console.log(`  Message: ${mention.messageText.substring(0, 50)}...`);
      console.log(`  Permalink: ${mention.permalink}`);
      console.log('');
    }

    console.log('\nTest mentions created successfully!');
    console.log('\nTo test the 1-click thread jump:');
    console.log('1. Run /mention in Slack');
    console.log('2. Click "Quick Reply" on any of these mentions');
    console.log('3. Click "スレッドへ" button - should jump directly to the thread!');

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createTestMentionsWithPermalinks();