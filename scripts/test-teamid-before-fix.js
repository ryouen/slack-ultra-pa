/**
 * teamId取得ロジックの修正前テスト
 * 現在の実装: (body as any).team_id || (body as any).team?.id
 */

console.log('=== teamId取得ロジック 修正前テスト ===\n');

// Socket Modeで想定されるbodyオブジェクトの模擬
const testCases = [
  {
    name: 'Block Actions (正常ケース)',
    body: {
      type: 'block_actions',
      team: { id: 'T0979H6R0H7', domain: 'zentechworld' },
      user: { id: 'U123456' }
    }
  },
  {
    name: 'Block Actions (teamがnull)',
    body: {
      type: 'block_actions',
      team: null,
      user: { id: 'U123456' }
    }
  },
  {
    name: 'Block Actions (teamが未定義)',
    body: {
      type: 'block_actions',
      user: { id: 'U123456' }
    }
  },
  {
    name: 'Message Event のbody',
    body: {
      type: 'event_callback',
      team_id: 'T0979H6R0H7',  // これは実際には存在しない
      event: {
        type: 'message',
        team: 'T0979H6R0H7'
      }
    }
  }
];

// 現在の実装をシミュレート
function getCurrentImplementation(body) {
  return body.team_id || body.team?.id;
}

// 修正後の実装をシミュレート
function getProposedImplementation(body) {
  return body.team?.id;
}

console.log('テスト結果:\n');

testCases.forEach((testCase, index) => {
  console.log(`テスト${index + 1}: ${testCase.name}`);
  console.log('Body構造:', JSON.stringify(testCase.body, null, 2));
  
  const currentResult = getCurrentImplementation(testCase.body);
  const proposedResult = getProposedImplementation(testCase.body);
  
  console.log(`現在の実装結果: ${currentResult || 'undefined'}`);
  console.log(`修正後の実装結果: ${proposedResult || 'undefined'}`);
  console.log(`結果の一致: ${currentResult === proposedResult ? '✅ 一致' : '❌ 不一致'}`);
  console.log('---\n');
});

// Deep Link変換のテスト
console.log('=== Deep Link変換テスト ===\n');

function testDeepLinkConversion(teamId) {
  if (!teamId) {
    return 'teamIdなし - 標準permalinkを使用';
  }
  const permalink = 'https://zentechworld.slack.com/archives/C0979H6S0P8/p1753404206917869';
  const channelId = 'C0979H6S0P8';
  const timestamp = '1753404206.917869';
  return `slack://channel?team=${teamId}&id=${channelId}&message=${timestamp}&tab=thread_ts`;
}

testCases.forEach((testCase, index) => {
  const teamId = getCurrentImplementation(testCase.body);
  const deepLink = testDeepLinkConversion(teamId);
  console.log(`テスト${index + 1} (${testCase.name}):`);
  console.log(`TeamID: ${teamId || 'undefined'}`);
  console.log(`Deep Link: ${deepLink}`);
  console.log('---\n');
});

console.log('現在時刻:', new Date().toISOString());
console.log('テスト環境: Node.js', process.version);