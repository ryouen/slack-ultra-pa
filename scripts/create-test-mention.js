// Create test mention for Quick Reply testing
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function createTestMention() {
  try {
    console.log('[TEST] Creating test mention for Quick Reply...\n');

    // Get the first user
    const user = await prisma.user.findFirst();
    if (!user) {
      console.error('[ERROR] No user found.');
      return;
    }

    console.log(`[INFO] Creating mention for user: ${user.slackUserId}`);

    // Create a test mention (from someone else to you)
    const testMention = await prisma.inboxItem.create({
      data: {
        slackTs: `test-${Date.now()}`,
        channelId: 'C123456789',
        channelName: 'general',
        messageText: '@ryosu 明日のプレゼンの資料、確認していただけますか？急ぎでお願いします🙏',
        authorId: 'U987654321', // Simulated other user
        userId: user.id,
        status: 'PENDING',
        collectionType: 'MENTION',
        expiresAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000) // 2 days from now
      }
    });

    console.log('[SUCCESS] Created test mention:');
    console.log(`- Message: ${testMention.messageText}`);
    console.log(`- Channel: ${testMention.channelName}`);
    console.log(`- Status: ${testMention.status}`);
    
    // Create another test mention (English)
    const testMention2 = await prisma.inboxItem.create({
      data: {
        slackTs: `test-en-${Date.now()}`,
        channelId: 'C234567890',
        channelName: 'dev-team',
        messageText: '@ryosu Could you please review the PR when you get a chance? Thanks!',
        authorId: 'U876543210', // Another simulated user
        userId: user.id,
        status: 'PENDING',
        collectionType: 'MENTION',
        expiresAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000)
      }
    });

    console.log(`\n- Message: ${testMention2.messageText}`);
    console.log(`- Channel: ${testMention2.channelName}`);
    console.log(`- Status: ${testMention2.status}`);

    console.log('\n[ACTION] Now run /todo today in Slack');
    console.log('[INFO] You should see "Recent Mentions" with Quick Reply buttons');

  } catch (error) {
    console.error('[ERROR] Failed to create test mention:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createTestMention();