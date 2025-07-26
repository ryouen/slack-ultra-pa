/**
 * Message EventでのteamId取得方法の詳細調査
 * Socket ModeでのMessage Eventの実際の構造を確認
 */

console.log('=== Message Event構造の詳細調査 ===\n');

console.log('Slack Socket ModeでのMessage Eventハンドラー:');
console.log('app.event("message", async ({ event, client, context, body }) => { ... })\n');

console.log('パラメータの説明:');
console.log('- event: メッセージイベント自体のデータ');
console.log('- client: Slack Web APIクライアント');
console.log('- context: Socket Mode固有のコンテキスト情報');
console.log('- body: イベントペイロードの全体\n');

console.log('実際のbody構造（Socket Mode）:');
const messageEventBody = {
  type: 'event_callback',
  team_id: 'T0979H6R0H7',  // ここにteam_idが存在する可能性
  api_app_id: 'A12345',
  event: {
    type: 'message',
    user: 'U123456',
    text: 'Hello <@U789012>',
    ts: '1234567890.123456',
    channel: 'C123456',
    team: 'T0979H6R0H7'  // eventオブジェクト内にもteamが存在
  },
  event_time: 1234567890
};

console.log(JSON.stringify(messageEventBody, null, 2));
console.log('\n');

console.log('現在のquickReplyHandler.tsの実装:');
console.log('Message Event: teamId: (body as any).team_id || (body as any).team?.id');
console.log('  → bodyレベルのteam_idを優先的に使用');
console.log('  → なければbody.team?.idにフォールバック（これは通常存在しない）\n');

console.log('問題点:');
console.log('1. Message Eventではbody.team_idが正しい');
console.log('2. Block Actionsではbody.team.idが正しい');
console.log('3. 単純にbody.team?.idに統一すると、Message Eventで取得できなくなる\n');

console.log('推奨される解決策:');
console.log('イベントタイプごとに適切な取得方法を使い分ける必要がある');
console.log('- Message Event: body.team_id を使用');
console.log('- Block Actions: body.team.id を使用\n');

console.log('現在の実装（team_id || team?.id）は実は正しい可能性が高い');