require('dotenv').config();

console.log('🔍 Slack Configuration Check');
console.log('============================');

const requiredVars = [
  'SLACK_BOT_TOKEN',
  'SLACK_SIGNING_SECRET', 
  'SLACK_APP_TOKEN'
];

const optionalVars = [
  'SLACK_CLIENT_ID',
  'SLACK_CLIENT_SECRET',
  'PORT'
];

console.log('\n✅ Required Variables:');
requiredVars.forEach(varName => {
  const value = process.env[varName];
  if (value) {
    console.log(`  ${varName}: ${value.substring(0, 10)}...`);
  } else {
    console.log(`  ❌ ${varName}: MISSING`);
  }
});

console.log('\n📋 Optional Variables:');
optionalVars.forEach(varName => {
  const value = process.env[varName];
  if (value) {
    console.log(`  ${varName}: ${value}`);
  } else {
    console.log(`  ${varName}: Not set`);
  }
});

console.log('\n🔧 Socket Mode Settings:');
console.log(`  SLACK_SOCKET_MODE: ${process.env.SLACK_SOCKET_MODE}`);
console.log(`  PORT: ${process.env.PORT || '3000'}`);

console.log('\n💡 Recommendations:');
if (process.env.SLACK_SOCKET_MODE !== 'true') {
  console.log('  - Set SLACK_SOCKET_MODE=true for development');
}
if (!process.env.SLACK_APP_TOKEN) {
  console.log('  - SLACK_APP_TOKEN is required for Socket Mode');
}

console.log('\n🚀 Ready to test! Run: node test-slack-app.js');