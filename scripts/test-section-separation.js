const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testSectionSeparation() {
  try {
    // Get a test user
    const user = await prisma.user.findFirst();
    if (!user) {
      console.log('No users found.');
      return;
    }

    console.log(`Testing section separation for user: ${user.slackUserId}`);

    // Check tasks
    const allTasks = await prisma.task.findMany({
      where: {
        userId: user.id,
        status: 'PENDING'
      },
      take: 10
    });

    console.log(`\nTotal tasks: ${allTasks.length}`);

    // Categorize tasks
    let pureTasks = 0;
    let mentionTasks = 0;

    for (const task of allTasks) {
      if (task.folderUrls) {
        try {
          const parsed = JSON.parse(task.folderUrls);
          if (!Array.isArray(parsed) && parsed.channelId) {
            // This is a mention-derived task
            mentionTasks++;
            console.log(`  - [MENTION-TASK] ${task.title.substring(0, 50)}...`);
          } else {
            // This is a pure task with folder URLs
            pureTasks++;
            console.log(`  - [PURE-TASK] ${task.title.substring(0, 50)}...`);
          }
        } catch (e) {
          // Not JSON, treat as pure task
          pureTasks++;
          console.log(`  - [PURE-TASK] ${task.title.substring(0, 50)}...`);
        }
      } else {
        // No folderUrls, pure task
        pureTasks++;
        console.log(`  - [PURE-TASK] ${task.title.substring(0, 50)}...`);
      }
    }

    console.log(`\nSummary:`);
    console.log(`  Pure tasks: ${pureTasks} (will show in [TASKS] section)`);
    console.log(`  Mention-derived tasks: ${mentionTasks} (will NOT show in [TASKS] section)`);

    // Check mentions
    const mentions = await prisma.inboxItem.findMany({
      where: {
        userId: user.id,
        status: 'PENDING',
        collectionType: 'MENTION'
      },
      take: 5
    });

    console.log(`\nPending mentions: ${mentions.length} (max 3 will show in [MENTIONS] section)`);
    mentions.forEach((mention, index) => {
      console.log(`  ${index + 1}. ${mention.messageText.substring(0, 50)}...`);
    });

    console.log('\nExpected /todo output:');
    if (pureTasks > 0) {
      console.log('1. [TASKS] section with pure tasks only');
    }
    if (mentions.length > 0) {
      console.log('2. [MENTIONS] section with up to 3 unaddressed mentions');
    }
    if (pureTasks === 0 && mentions.length === 0) {
      console.log('Empty state: No tasks or mentions');
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testSectionSeparation();