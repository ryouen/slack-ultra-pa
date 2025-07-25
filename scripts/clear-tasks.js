// Clear all tasks to test Recent Mentions
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function clearTasks() {
  try {
    console.log('[CLEAR] Deleting all TODO tasks...');
    
    const result = await prisma.task.deleteMany({
      where: { status: 'TODO' }
    });
    
    console.log(`[DONE] Deleted ${result.count} tasks`);
    console.log('[NEXT] Run /todo today to see Recent Mentions with 3 buttons');
    
  } catch (error) {
    console.error('[ERROR]', error);
  } finally {
    await prisma.$disconnect();
  }
}

clearTasks();