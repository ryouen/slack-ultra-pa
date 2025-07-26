const { WebClient } = require('@slack/web-api');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const slack = new WebClient(process.env.SLACK_BOT_TOKEN);

async function testFadeOut() {
  try {
    // Get a test user
    const user = await prisma.user.findFirst();
    if (!user) {
      console.log('No users found. Please create a user first.');
      return;
    }

    // Check if there are any mentions
    const mentions = await prisma.inboxItem.findMany({
      where: {
        userId: user.id,
        status: 'PENDING',
        collectionType: 'MENTION'
      },
      take: 5
    });

    console.log(`Found ${mentions.length} pending mentions for user ${user.slackUserId}`);
    
    if (mentions.length === 0) {
      console.log('No pending mentions found. Creating a test mention...');
      
      // Create a test mention
      const testMention = await prisma.inboxItem.create({
        data: {
          slackTs: `test-${Date.now()}`,
          channelId: 'C0828U3E5UR', // Replace with your test channel
          channelName: 'test-channel',
          messageText: '<@U097E0TB6K4> This is a test mention for fade-out testing',
          authorId: 'U097E0TB6K4',
          permalink: 'https://slack.com/archives/test',
          userId: user.id,
          status: 'PENDING',
          collectionType: 'MENTION',
          expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000) // 48 hours from now
        }
      });
      
      console.log('Created test mention:', testMention.id);
    } else {
      // Show existing mentions
      mentions.forEach((mention, index) => {
        console.log(`${index + 1}. ${mention.messageText.substring(0, 50)}... (ID: ${mention.id})`);
      });
    }

    console.log('\nTo test the fade-out effect:');
    console.log('1. Run /mention in Slack');
    console.log('2. Click the "既読" (Read) button on any mention');
    console.log('3. Watch the mention fade out and disappear from the list');
    console.log('4. You should see a "✅ 既読にしました" confirmation message');

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testFadeOut();