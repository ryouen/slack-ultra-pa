/**
 * Deep Link形式のバリエーションテスト
 * スレッドパネルが開かない問題の調査
 */

const testPermalinks = [
  'https://zentechworld.slack.com/archives/C0979H6S0P8/p1753404206917869',
];

// ログから取得した実際のteamId
const ACTUAL_TEAM_ID = 'TL2EU3JPP';

console.log('=== Deep Link形式バリエーションテスト ===\n');
console.log('問題: Slackアプリ内で開くが、スレッドパネルが自動的に開かない\n');

function testVariations(permalink, teamId) {
  const match = permalink.match(/\/archives\/([A-Z0-9]+)\/p(\d+)$/);
  if (!match) return;
  
  const [, channelId, timestampRaw] = match;
  const timestamp = timestampRaw.slice(0, 10) + '.' + timestampRaw.slice(10);
  
  console.log('Original permalink:', permalink);
  console.log('Channel ID:', channelId);
  console.log('Timestamp:', timestamp);
  console.log('\nテスト形式:\n');
  
  // 現在の実装
  console.log('1. 現在の実装 (tab=thread_ts):');
  console.log(`   slack://channel?team=${teamId}&id=${channelId}&message=${timestamp}&tab=thread_ts`);
  
  // 代替形式1: threadパラメータ
  console.log('\n2. threadパラメータ使用:');
  console.log(`   slack://channel?team=${teamId}&id=${channelId}&thread=${timestamp}`);
  
  // 代替形式2: thread_tsパラメータ
  console.log('\n3. thread_tsパラメータ使用:');
  console.log(`   slack://channel?team=${teamId}&id=${channelId}&thread_ts=${timestamp}`);
  
  // 代替形式3: messageのみ（スレッドを開く別の方法）
  console.log('\n4. messageパラメータのみ:');
  console.log(`   slack://channel?team=${teamId}&id=${channelId}&message=${timestamp}`);
  
  // 代替形式4: 標準のWeb URL形式（フォールバック）
  console.log('\n5. Web URL形式（フォールバック）:');
  console.log(`   https://app.slack.com/client/${teamId}/${channelId}/thread-${channelId}-${timestamp}`);
}

testVariations(testPermalinks[0], ACTUAL_TEAM_ID);

console.log('\n\n推奨事項:');
console.log('1. 各形式を手動でテストして、スレッドパネルが開くものを確認');
console.log('2. 動作する形式が見つからない場合は、現在の実装（チャンネルを開く）を維持');
console.log('3. Slack公式ドキュメントがないため、将来的な変更リスクを考慮');