// Check user information
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkUser() {
  try {
    const user = await prisma.user.findFirst();
    
    console.log('[USER INFO]');
    console.log('Database User ID:', user.id);
    console.log('Slack User ID:', user.slackUserId);
    console.log('\n[INFO] Your actual Slack username format:');
    console.log('- Internal ID:', user.slackUserId);
    console.log('- Mention format: <@' + user.slackUserId + '>');
    console.log('\n[NOTE] The test mentions use @ryosu as placeholder text,');
    console.log('but the system actually detects mentions by User ID.');
    
  } catch (error) {
    console.error('[ERROR]', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkUser();