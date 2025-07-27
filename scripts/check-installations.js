const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkInstallations() {
  try {
    const installations = await prisma.slackInstallation.findMany();
    console.log('Current Slack Installations:');
    console.log(JSON.stringify(installations, null, 2));
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkInstallations();