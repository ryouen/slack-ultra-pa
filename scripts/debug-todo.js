// Debug todo command behavior
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function debugTodo() {
  try {
    console.log('[DEBUG] Checking /todo today behavior...\n');

    const user = await prisma.user.findFirst();
    console.log(`User ID: ${user.id}`);
    console.log(`Slack User ID: ${user.slackUserId}\n`);

    // Get tasks
    const tasks = await prisma.task.findMany({
      where: {
        userId: user.id,
        status: 'TODO'
      },
      orderBy: {
        priorityScore: 'desc'
      },
      take: 5
    });

    console.log(`[TASKS] Found ${tasks.length} tasks`);
    
    // Get recent mentions
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
    
    const inboxItems = await prisma.inboxItem.findMany({
      where: {
        userId: user.id,
        createdAt: {
          gte: threeDaysAgo
        },
        status: 'PENDING'
      }
    });

    console.log(`[INBOX] Found ${inboxItems.length} pending inbox items\n`);

    // The problem
    console.log('[PROBLEM] If you see mentions as tasks, it means:');
    console.log('1. The mentions were already converted to tasks');
    console.log('2. There are no PENDING inbox items to show as mentions\n');

    // Show what's displayed
    if (tasks.length > 0 && inboxItems.length === 0) {
      console.log('[CURRENT DISPLAY] Shows tasks (including mention-based tasks)');
      tasks.forEach(t => console.log(`- ${t.title}`));
    } else if (tasks.length === 0 && inboxItems.length > 0) {
      console.log('[EXPECTED DISPLAY] Should show Recent Mentions with 3 buttons');
      inboxItems.forEach(i => console.log(`- ${i.messageText}`));
    }

    // Clean up mention tasks
    const mentionTasks = tasks.filter(t => 
      t.title.includes('@ryosu') || 
      t.description?.includes('@ryosu')
    );

    if (mentionTasks.length > 0) {
      console.log(`\n[CLEANUP] Found ${mentionTasks.length} mention-based tasks`);
      console.log('[ACTION] Deleting them to test Recent Mentions feature...');
      
      await prisma.task.deleteMany({
        where: {
          id: { in: mentionTasks.map(t => t.id) }
        }
      });
      
      console.log('[DONE] Mention tasks deleted');
      console.log('[NEXT] Run /todo today again to see Recent Mentions');
    }

  } catch (error) {
    console.error('[ERROR]', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugTodo();