import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // First, let's check the current state
  console.log('\n=== Current Database State ===');
  
  const users = await prisma.user.findMany();
  console.log(`\nUsers (${users.length}):`);
  users.forEach(u => console.log(`  - ${u.slackUserId} (${u.id})`));
  
  const tasks = await prisma.task.findMany({
    include: { user: true }
  });
  console.log(`\nTasks (${tasks.length}):`);
  tasks.forEach(t => console.log(`  - [${t.status}] ${t.title} (User: ${t.user.slackUserId})`));
  
  const inboxItems = await prisma.inboxItem.findMany({
    include: { user: true }
  });
  console.log(`\nInbox Items (${inboxItems.length}):`);
  inboxItems.forEach(i => console.log(`  - [${i.status}] ${i.messageText.substring(0, 50)}... (User: ${i.user.slackUserId})`));
  
  // Check for duplicates
  const taskGroups = tasks.reduce((acc, task) => {
    const key = `${task.title}-${task.userId}`;
    if (!acc[key]) acc[key] = [];
    acc[key].push(task);
    return acc;
  }, {} as Record<string, typeof tasks>);
  
  console.log('\n=== Checking for Duplicate Tasks ===');
  Object.entries(taskGroups).forEach(([key, group]) => {
    if (group.length > 1) {
      console.log(`\nDuplicate found: "${group[0].title}"`);
      group.forEach(t => console.log(`  - ID: ${t.id}, Created: ${t.createdAt}, Status: ${t.status}`));
    }
  });
  
  // Remove duplicates (keep the oldest one)
  console.log('\n=== Removing Duplicate Tasks ===');
  for (const group of Object.values(taskGroups)) {
    if (group.length > 1) {
      const sorted = group.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
      const toDelete = sorted.slice(1);
      
      for (const task of toDelete) {
        console.log(`Deleting duplicate task: ${task.id} - ${task.title}`);
        await prisma.task.delete({ where: { id: task.id } });
      }
    }
  }
  
  // Now add realistic inbox items (mentions)
  console.log('\n=== Adding Test Inbox Items ===');
  
  const mainUser = users[0];
  if (!mainUser) {
    console.log('No users found! Please run the app first to create a user.');
    return;
  }
  
  const testInboxItems = [
    {
      slackTs: `${Date.now() / 1000}.000001`,
      channelId: 'C0123ABCD',
      channelName: 'project-ai-assistant',
      messageText: '<@UKS3XGZ1R> 来週月曜日の15時からAIアシスタントプロジェクトのキックオフミーティングを開催します。アジェンダを事前に共有してもらえますか？',
      authorId: 'U0123MANAGER',
      permalink: 'https://workspace.slack.com/archives/C0123ABCD/p1234567890000001',
      collectionType: 'MENTION',
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
      userId: mainUser.id
    },
    {
      slackTs: `${Date.now() / 1000}.000002`,
      channelId: 'C0456EFGH',
      channelName: 'dev-backend',
      messageText: '<@UKS3XGZ1R> データベースのマイグレーションスクリプトのレビューをお願いします。明日のデプロイまでに確認が必要です。PRリンク: https://github.com/company/backend/pull/456',
      authorId: 'U0456DEVLEAD',
      threadTs: `${Date.now() / 1000}.000000`,
      permalink: 'https://workspace.slack.com/archives/C0456EFGH/p1234567890000002',
      collectionType: 'MENTION',
      expiresAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // 2 days from now
      userId: mainUser.id
    }
  ];
  
  for (const item of testInboxItems) {
    try {
      const created = await prisma.inboxItem.create({
        data: item
      });
      console.log(`Created inbox item: ${created.channelName} - ${created.messageText.substring(0, 50)}...`);
    } catch (error: any) {
      if (error.code === 'P2002') {
        console.log(`Inbox item already exists with slackTs: ${item.slackTs}`);
      } else {
        console.error(`Error creating inbox item:`, error);
      }
    }
  }
  
  // Final state
  console.log('\n=== Final Database State ===');
  
  const finalTasks = await prisma.task.findMany({
    include: { user: true }
  });
  console.log(`\nTasks (${finalTasks.length}):`);
  finalTasks.forEach(t => console.log(`  - [${t.status}] ${t.title} (User: ${t.user.slackUserId})`));
  
  const finalInbox = await prisma.inboxItem.findMany({
    include: { user: true },
    orderBy: { createdAt: 'desc' }
  });
  console.log(`\nInbox Items (${finalInbox.length}):`);
  finalInbox.forEach(i => console.log(`  - [${i.status}] Channel: ${i.channelName}, Message: ${i.messageText.substring(0, 80)}...`));
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });