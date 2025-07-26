const { convertToThreadDeepLink } = require('../dist/utils/threadDeepLink');

// Test permalinks from user
const testPermalinks = [
  'https://zentechworld.slack.com/archives/C0979H6S0P8/p1753404206917869',
  'https://zentechworld.slack.com/archives/C0979H6S0P8/p1753492627937249',
  'https://zentechworld.slack.com/archives/C0979H6S0P8/p1753492647822919'
];

// Slack Team ID (you need to get this from your Slack workspace)
// Usually found in URLs like: https://app.slack.com/client/T12345/...
const TEAM_ID = 'T0979H6R0H7'; // Replace with your actual team ID

console.log('Testing Thread Deep-Link Conversion\n');
console.log('Standard permalink format: Opens in main channel view');
console.log('Thread deep-link format: Opens directly in thread panel\n');

testPermalinks.forEach((permalink, index) => {
  console.log(`Test ${index + 1}:`);
  console.log(`Original: ${permalink}`);
  
  const deepLink = convertToThreadDeepLink(permalink, TEAM_ID);
  console.log(`Deep-link: ${deepLink || 'Conversion failed'}`);
  
  if (deepLink) {
    console.log('✅ This link will open directly in the thread panel!');
  }
  console.log('');
});

console.log('Expected behavior:');
console.log('- Thread panel opens automatically');
console.log('- Input field is focused');
console.log('- User can immediately paste and send reply');
console.log('- No need to click "Reply in thread"');