const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkTasks() {
  try {
    // Get all pending tasks
    const tasks = await prisma.task.findMany({
      where: {
        status: { in: ['PENDING', 'IN_PROGRESS'] }
      },
      orderBy: { priorityScore: 'desc' }
    });
    
    console.log('[TASKS] Total pending tasks:', tasks.length);
    console.log('=====================================\n');
    
    tasks.forEach((task, index) => {
      console.log(`Task ${index + 1}:`);
      console.log(`  ID: ${task.id}`);
      console.log(`  Title: ${task.title}`);
      console.log(`  Status: ${task.status}`);
      console.log(`  Priority: ${task.priority} (Score: ${task.priorityScore})`);
      console.log(`  Created: ${task.createdAt}`);
      console.log('---');
    });
    
    // Check for exact duplicates
    const titleMap = new Map();
    tasks.forEach(task => {
      const count = titleMap.get(task.title) || 0;
      titleMap.set(task.title, count + 1);
    });
    
    console.log('\n[DUPLICATES] Checking for duplicate titles:');
    let hasDuplicates = false;
    titleMap.forEach((count, title) => {
      if (count > 1) {
        console.log(`  "${title}" - ${count} copies`);
        hasDuplicates = true;
      }
    });
    
    if (!hasDuplicates) {
      console.log('  No duplicate titles found');
    }
    
  } catch (error) {
    console.error('[ERROR]', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkTasks();