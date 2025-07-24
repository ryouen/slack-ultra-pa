const { App } = require('@slack/bolt');
require('dotenv').config();

console.log('🚀 Slack接続テストを開始します...');

// Slack Bolt アプリを初期化
const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  socketMode: process.env.SLACK_SOCKET_MODE === 'true',
  appToken: process.env.SLACK_APP_TOKEN,
  port: process.env.PORT || 3000
});

// /hello コマンドのテスト
app.command('/hello', async ({ command, ack, respond }) => {
  await ack();
  console.log('✅ /hello コマンドを受信しました', {
    userId: command.user_id,
    channelId: command.channel_id
  });
  
  await respond({
    text: `こんにちは！ <@${command.user_id}> さん 👋\n接続テストが成功しました！`,
    response_type: 'in_channel'
  });
});

// アプリメンションのテスト
app.event('app_mention', async ({ event, say }) => {
  console.log('✅ アプリメンションを受信しました', {
    userId: event.user,
    channelId: event.channel,
    text: event.text
  });

  await say({
    text: `<@${event.user}> さん、こんにちは！👋\nメンション機能が正常に動作しています。`,
    channel: event.channel
  });
});

// DMメッセージのテスト
app.message(async ({ message, say }) => {
  // DMのみに応答（チャンネルメッセージは無視）
  if (message.channel_type === 'im') {
    console.log('✅ DMメッセージを受信しました', {
      userId: message.user,
      text: message.text
    });

    try {
      await say({
        text: `こんにちは！DMが正常に動作しています 🎉\n\n受信したメッセージ: "${message.text}"\n\n時刻: ${new Date().toLocaleString('ja-JP')}`
      });
      console.log('✅ DM返信を送信しました');
    } catch (error) {
      console.error('❌ DM返信でエラーが発生:', error);
    }
  }
});

// エラーハンドリング
app.error((error) => {
  console.error('❌ Slackアプリでエラーが発生:', error);
});

// アプリを開始
(async () => {
  try {
    await app.start();
    console.log('⚡️ Slackテストアプリが起動しました！');
    console.log('📝 テスト方法:');
    console.log('  1. Slackで @ultraPA にメンションしてください');
    console.log('  2. @ultraPA にDMを送信してください');
    console.log('  3. /hello コマンドを実行してください');
  } catch (error) {
    console.error('❌ アプリの起動に失敗:', error);
    process.exit(1);
  }
})();

// 終了処理
process.on('SIGINT', () => {
  console.log('🛑 アプリを終了します...');
  process.exit(0);
});