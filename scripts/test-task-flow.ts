import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testTaskFlow() {
  console.log('\n=== Testing Task Flow ===');
  
  const user = await prisma.user.findFirst();
  if (!user) {
    console.log('No user found!');
    return;
  }
  
  // 1. Show current tasks
  console.log('\n1. Current Active Tasks:');
  const activeTasks = await prisma.task.findMany({
    where: {
      userId: user.id,
      status: { in: ['PENDING', 'IN_PROGRESS'] }
    },
    orderBy: { priorityScore: 'desc' }
  });
  
  activeTasks.forEach(t => {
    console.log(`   - [${t.status}] ${t.title} (Score: ${t.priorityScore})`);
  });
  
  // 2. Show completed tasks
  console.log('\n2. Recently Completed Tasks:');
  const completedTasks = await prisma.task.findMany({
    where: {
      userId: user.id,
      status: 'COMPLETED'
    },
    orderBy: { updatedAt: 'desc' },
    take: 5
  });
  
  completedTasks.forEach(t => {
    console.log(`   - [${t.status}] ${t.title} (Completed: ${t.updatedAt.toLocaleString()})`);
  });
  
  // 3. Test completing a task
  if (activeTasks.length > 0) {
    const taskToComplete = activeTasks[0];
    console.log(`\n3. Completing task: "${taskToComplete.title}"`);
    
    await prisma.task.update({
      where: { id: taskToComplete.id },
      data: {
        status: 'COMPLETED',
        updatedAt: new Date()
      }
    });
    
    console.log('   ✓ Task completed successfully');
  }
  
  // 4. Show inbox items
  console.log('\n4. Current Inbox Items:');
  const inboxItems = await prisma.inboxItem.findMany({
    where: {
      userId: user.id,
      status: 'PENDING'
    },
    orderBy: { createdAt: 'desc' }
  });
  
  inboxItems.forEach(i => {
    console.log(`   - [${i.status}] ${i.channelName || i.channelId}: ${i.messageText.substring(0, 60)}...`);
  });
  
  // 5. Check for any issues
  console.log('\n5. Data Integrity Check:');
  
  // Check for orphaned tasks
  const tasksWithoutUser = await prisma.task.findMany({
    where: { userId: null as any }
  });
  console.log(`   - Orphaned tasks: ${tasksWithoutUser.length}`);
  
  // Check for duplicate active tasks
  const allTasks = await prisma.task.findMany({
    where: { userId: user.id }
  });
  
  const taskGroups = allTasks.reduce((acc, task) => {
    const key = `${task.title}-${task.status}`;
    if (!acc[key]) acc[key] = [];
    acc[key].push(task);
    return acc;
  }, {} as Record<string, typeof allTasks>);
  
  const duplicates = Object.entries(taskGroups)
    .filter(([key, group]) => group.length > 1 && !key.includes('COMPLETED'))
    .map(([key, group]) => ({ key, count: group.length }));
  
  console.log(`   - Active duplicate tasks: ${duplicates.length}`);
  duplicates.forEach(d => console.log(`     • "${d.key}" (${d.count} copies)`));
}

testTaskFlow()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });