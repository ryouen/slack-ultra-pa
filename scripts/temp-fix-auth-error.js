/**
 * 一時的にauth.testを回避してサーバーを起動する
 * invalid_authエラーの原因調査用
 */

console.log('=== Invalid Auth エラーの一時回避策 ===\n');

console.log('問題:');
console.log('- サーバー起動時にauth.test()が実行される');
console.log('- invalid_authエラーでサーバーがクラッシュ');
console.log('- ngrokは502 Bad Gatewayを返す\n');

console.log('考えられる原因:');
console.log('1. SLACK_BOT_TOKENが未設定または無効');
console.log('2. トークンの権限不足');
console.log('3. アプリの再インストールが必要\n');

console.log('確認手順:');
console.log('1. 環境変数を確認:');
console.log('   - Windowsの場合: echo %SLACK_BOT_TOKEN%');
console.log('   - .envファイルを確認\n');

console.log('2. トークンの形式を確認:');
console.log('   - xoxb-で始まるBot User OAuth Token');
console.log('   - xoxp-ではない（これはUser Token）\n');

console.log('3. Slackアプリの設定:');
console.log('   - https://api.slack.com/apps');
console.log('   - OAuth & Permissions → Bot User OAuth Token');
console.log('   - 必要に応じて"Reinstall to Workspace"\n');

console.log('一時的な回避策:');
console.log('botConfig.tsのresolveBotUserId関数を修正して、');
console.log('ハードコードされたBot User IDを返すようにする');
console.log('（ログから取得: U097KHQFE2C）');