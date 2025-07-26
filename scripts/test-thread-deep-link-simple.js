// Simple test to verify thread deep-link conversion

const testPermalinks = [
  'https://zentechworld.slack.com/archives/C0979H6S0P8/p1753404206917869',
  'https://zentechworld.slack.com/archives/C0979H6S0P8/p1753492627937249',
  'https://zentechworld.slack.com/archives/C0979H6S0P8/p1753492647822919'
];

const TEAM_ID = 'T0979H6R0H7'; // Replace with your actual team ID

console.log('Thread Deep-Link Conversion Test\n');

function convertToThreadDeepLink(permalink, teamId) {
  const match = permalink.match(/\/archives\/([A-Z0-9]+)\/p(\d+)$/);
  if (!match) return null;
  
  const [, channelId, timestampRaw] = match;
  const timestamp = timestampRaw.slice(0, 10) + '.' + timestampRaw.slice(10);
  
  return `slack://channel?team=${teamId}&id=${channelId}&message=${timestamp}&tab=thread_ts`;
}

testPermalinks.forEach((permalink, index) => {
  console.log(`Test ${index + 1}:`);
  console.log(`Original:  ${permalink}`);
  
  const deepLink = convertToThreadDeepLink(permalink, TEAM_ID);
  console.log(`Deep-link: ${deepLink}`);
  console.log('');
});

console.log('How to test in Slack:');
console.log('1. Run /mention in Slack');
console.log('2. Click "Quick Reply" on any mention');
console.log('3. Click "スレッドへ" button');
console.log('4. Thread should open directly with input focused!');
console.log('');
console.log('Note: You need to replace TEAM_ID with your actual Slack team ID');
console.log('Find it in URLs like: https://app.slack.com/client/T12345/...');