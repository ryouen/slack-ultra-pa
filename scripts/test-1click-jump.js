const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function test1ClickJump() {
  try {
    // Get mentions with permalinks
    const mentions = await prisma.inboxItem.findMany({
      where: {
        status: 'PENDING',
        collectionType: 'MENTION',
        NOT: {
          permalink: null
        }
      },
      take: 3
    });

    console.log(`Found ${mentions.length} mentions with permalinks:\n`);

    mentions.forEach((mention, index) => {
      console.log(`${index + 1}. Message: ${mention.messageText.substring(0, 50)}...`);
      console.log(`   Permalink: ${mention.permalink}`);
      console.log('');
    });

    console.log('Test the 1-click jump:');
    console.log('1. Run /mention in Slack');
    console.log('2. Click "Quick Reply" on a mention');
    console.log('3. Look for the "スレッドへ" button (should be a direct URL)');
    console.log('4. Click it - should jump directly to the thread in 1 click!');
    console.log('');
    console.log('Expected behavior:');
    console.log('- Button should open Slack directly to the thread');
    console.log('- No intermediate confirmation or additional clicks');
    console.log('- Works in both desktop and web clients');

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

test1ClickJump();