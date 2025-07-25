// Feature Testing Script
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

console.log('[TEST] Feature Testing Script');
console.log('=============================\n');

// Test configurations
const tests = {
  mention: {
    name: 'Mention Detection',
    description: 'Verify user mentions are detected and create inbox items'
  },
  aiReply: {
    name: 'AI Quick Reply',
    description: 'Test AI-generated quick reply suggestions'
  },
  taskComplete: {
    name: 'Task Completion',
    description: 'Verify task completion button works'
  },
  inboxExpiry: {
    name: 'Inbox Expiration',
    description: 'Check 2-business-day expiration logic'
  },
  hierarchy: {
    name: 'Task Hierarchy',
    description: 'Test parent-child task relationships'
  }
};

// Feature status check
async function checkFeatures() {
  console.log('[CHECKING] Application Features\n');
  
  // Check environment
  console.log('[ENV] Configuration:');
  console.log(`- Slack Bot Token: ${process.env.SLACK_BOT_TOKEN ? 'Set' : 'Missing'}`);
  console.log(`- OpenAI API Key: ${process.env.OPENAI_API_KEY ? 'Set' : 'Missing'}`);
  console.log(`- OpenAI Model: ${process.env.OPENAI_MODEL || 'Not set'}`);
  console.log(`- Database URL: ${process.env.DATABASE_URL ? 'Set' : 'Missing'}\n`);
  
  // Instructions for manual testing
  console.log('[MANUAL TESTS] Please perform these tests in Slack:\n');
  
  console.log('1. MENTION DETECTION:');
  console.log('   - Have someone mention you: @yourname test message');
  console.log('   - Check if "Recent Mentions" appears');
  console.log('   - Expected: Inbox item created with 3 buttons\n');
  
  console.log('2. AI QUICK REPLY:');
  console.log('   - Click "Quick Reply" button on a mention');
  console.log('   - Expected: 3 AI-generated reply options');
  console.log('   - Note: Falls back to templates if OpenAI fails\n');
  
  console.log('3. TASK COMPLETION:');
  console.log('   - Run /todo today');
  console.log('   - Click "Complete" button on any task');
  console.log('   - Expected: Task marked as completed\n');
  
  console.log('4. ADD TASK FROM MENTION:');
  console.log('   - Click "Add Task" on a mention');
  console.log('   - Expected: Task created from mention\n');
  
  console.log('5. HIERARCHY TEST:');
  console.log('   - Check if tasks show parent-child relationships');
  console.log('   - Expected: Indented sub-tasks\n');
  
  // Check database for feature data
  checkDatabase();
}

async function checkDatabase() {
  try {
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();
    
    console.log('\n[DATABASE] Current Status:');
    
    // Count records
    const userCount = await prisma.user.count();
    const taskCount = await prisma.task.count();
    const inboxCount = await prisma.inboxItem.count();
    
    console.log(`- Users: ${userCount}`);
    console.log(`- Tasks: ${taskCount}`);
    console.log(`- Inbox Items: ${inboxCount}`);
    
    // Check for expired inbox items
    const now = new Date();
    const expiredItems = await prisma.inboxItem.count({
      where: {
        expiresAt: { lte: now },
        status: 'PENDING'
      }
    });
    
    console.log(`- Expired Inbox Items: ${expiredItems}`);
    
    await prisma.$disconnect();
  } catch (error) {
    console.error('\n[ERROR] Database check failed:', error.message);
  }
}

// Run checks
checkFeatures();