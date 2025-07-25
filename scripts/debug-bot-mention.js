const { App } = require('@slack/bolt');
require('dotenv').config();

async function debugBotMention() {
  console.log('Debugging bot mention issue...\n');
  
  const app = new App({
    token: process.env.SLACK_BOT_TOKEN,
    signingSecret: process.env.SLACK_SIGNING_SECRET,
    socketMode: false, // Force HTTP mode
    port: 3000
  });

  // Add debug logging for all events
  app.use(async ({ payload, next }) => {
    console.log(`[EVENT] Received: ${payload.type || payload.command || 'unknown'}`);
    if (payload.text) {
      console.log(`[TEXT] ${payload.text}`);
    }
    await next();
  });

  // Handle app_mention events
  app.event('app_mention', async ({ event, say }) => {
    console.log('[APP_MENTION] Bot was mentioned!');
    console.log('Event details:', JSON.stringify(event, null, 2));
    
    try {
      await say({
        text: `Hello <@${event.user}>! I received your mention.`,
        thread_ts: event.thread_ts || event.ts
      });
      console.log('[SUCCESS] Response sent');
    } catch (error) {
      console.error('[ERROR] Failed to respond:', error);
    }
  });

  // Handle all messages to see what's coming through
  app.message(async ({ message }) => {
    console.log('[MESSAGE] Received message');
    console.log('Message details:', JSON.stringify(message, null, 2));
  });

  // Error handler
  app.error(async (error) => {
    console.error('[APP_ERROR]', error);
  });

  await app.start();
  console.log('✅ Debug app is running on port 3000');
  console.log('\nTo test:');
  console.log('1. Make sure your Slack app Event URL is set to your public URL + /slack/events');
  console.log('2. Mention the bot in any channel where it\'s present');
  console.log('3. Watch this console for debug output\n');
}

debugBotMention().catch(console.error);