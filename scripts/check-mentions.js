// Check inbox items and mentions
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkMentions() {
  try {
    console.log('[CHECK] Checking mentions and inbox items...\n');

    // Get all inbox items
    const inboxItems = await prisma.inboxItem.findMany({
      include: { user: true },
      orderBy: { createdAt: 'desc' }
    });

    console.log(`[INFO] Total inbox items: ${inboxItems.length}`);
    
    if (inboxItems.length > 0) {
      console.log('\n[INBOX ITEMS]:');
      inboxItems.forEach(item => {
        console.log(`\nID: ${item.id}`);
        console.log(`User: ${item.user.slackUserId}`);
        console.log(`Status: ${item.status}`);
        console.log(`Channel: ${item.channelName || item.channelId}`);
        console.log(`Message: ${item.messageText}`);
        console.log(`Created: ${item.createdAt}`);
        console.log(`Expires: ${item.expiresAt}`);
      });
    }

    // Check for test mentions
    console.log('\n[TIP] To test mentions:');
    console.log('1. Have someone mention you in Slack: @yourname test message');
    console.log('2. Or post in another channel: @yourname please check this');
    console.log('3. Then run /todo today to see Recent Mentions');

  } catch (error) {
    console.error('[ERROR]', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkMentions();