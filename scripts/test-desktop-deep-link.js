// デスクトップdeep-link形式のテスト

const testPermalinks = [
  'https://zentechworld.slack.com/archives/C0979H6S0P8/p1753404206917869',
  'https://zentechworld.slack.com/archives/C0979H6S0P8/p1753492627937249',
  'https://zentechworld.slack.com/archives/C0979H6S0P8/p1753492647822919'
];

const TEAM_ID = 'T0979H6R0H7'; // あなたの実際のteam IDに置き換えてください

console.log('=== Slackデスクトップ Deep-Link テスト (修正版) ===\n');
console.log('公式形式: slack://channel?team=TEAM_ID&id=CHANNEL_ID&message=TIMESTAMP&tab=thread_ts\n');

function convertToDesktopDeepLink(permalink, teamId) {
  const match = permalink.match(/\/archives\/([A-Z0-9]+)\/p(\d+)$/);
  if (!match) return null;
  
  const [, channelId, timestampRaw] = match;
  const timestamp = timestampRaw.slice(0, 10) + '.' + timestampRaw.slice(10);
  
  // デスクトップアプリ用のdeep-link（tab=thread_ts付き）
  return `slack://channel?team=${teamId}&id=${channelId}&message=${timestamp}&tab=thread_ts`;
}

testPermalinks.forEach((permalink, index) => {
  console.log(`テスト ${index + 1}:`);
  console.log(`元のpermalink: ${permalink}`);
  
  const deepLink = convertToDesktopDeepLink(permalink, TEAM_ID);
  console.log(`Desktop deep-link: ${deepLink}`);
  console.log('');
});

console.log('期待される動作:');
console.log('✅ Slackデスクトップアプリ内で開く');
console.log('✅ 指定されたメッセージのスレッドに直接移動');
console.log('✅ スレッドパネルが自動的に開く');
console.log('✅ 入力欄にフォーカスが当たる');
console.log('');
console.log('注意: この形式はSlackデスクトップアプリでのみ動作します。');
console.log('Webブラウザ版Slackでは通常のpermalinkにフォールバックします。');