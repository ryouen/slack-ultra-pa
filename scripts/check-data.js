// Check current data state
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkData() {
  try {
    console.log('[CHECKING] Current data state...\n');

    // Check tasks
    const tasks = await prisma.task.findMany({
      where: { status: 'TODO' },
      orderBy: { priorityScore: 'desc' }
    });
    
    console.log(`[TASKS] Found ${tasks.length} TODO tasks:`);
    tasks.forEach(t => {
      console.log(`- ${t.title.substring(0, 50)}... (Score: ${t.priorityScore})`);
    });

    // Check inbox items
    const inboxItems = await prisma.inboxItem.findMany({
      where: { status: 'PENDING' }
    });
    
    console.log(`\n[INBOX] Found ${inboxItems.length} pending inbox items:`);
    inboxItems.forEach(i => {
      console.log(`- ${i.messageText.substring(0, 50)}... (Type: ${i.collectionType})`);
    });

    // Problem: It seems mentions were converted to tasks
    const mentionTasks = tasks.filter(t => 
      t.title.includes('@ryosu') || 
      t.title.includes('review the PR')
    );
    
    if (mentionTasks.length > 0) {
      console.log('\n[ISSUE] Mentions were converted to tasks!');
      console.log('[FIX] Deleting mention tasks...');
      
      await prisma.task.deleteMany({
        where: {
          id: { in: mentionTasks.map(t => t.id) }
        }
      });
      
      console.log(`[DELETED] ${mentionTasks.length} mention tasks`);
    }

  } catch (error) {
    console.error('[ERROR]', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkData();