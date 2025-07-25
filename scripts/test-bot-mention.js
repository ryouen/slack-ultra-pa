const { App } = require('@slack/bolt');
require('dotenv').config();

async function testBotMention() {
  console.log('Testing bot mention configuration...\n');
  
  try {
    // Initialize the app with the same configuration
    const app = new App({
      token: process.env.SLACK_BOT_TOKEN,
      signingSecret: process.env.SLACK_SIGNING_SECRET,
      socketMode: process.env.SLACK_SOCKET_MODE === 'true',
      appToken: process.env.SLACK_APP_TOKEN,
      port: 3001 // Different port to avoid conflicts
    });

    // Get bot info
    const authResult = await app.client.auth.test({
      token: process.env.SLACK_BOT_TOKEN
    });

    console.log('Bot Information:');
    console.log('- Bot User ID:', authResult.user_id);
    console.log('- Bot User Name:', authResult.user);
    console.log('- Team ID:', authResult.team_id);
    console.log('- Team Name:', authResult.team);
    console.log('- Socket Mode:', process.env.SLACK_SOCKET_MODE === 'true' ? 'Enabled' : 'Disabled');
    console.log('\n');

    // Check bot permissions
    console.log('Bot Permissions/Scopes:');
    const scopes = authResult.response_metadata?.scopes || [];
    if (scopes.length > 0) {
      scopes.forEach(scope => console.log('- ' + scope));
    } else {
      console.log('- No scopes information available');
    }
    console.log('\n');

    // Test event subscriptions
    console.log('Event Subscription Status:');
    console.log('- Socket Mode:', process.env.SLACK_SOCKET_MODE === 'true' ? 'Active (using WebSocket)' : 'Inactive (using HTTP)');
    
    if (process.env.SLACK_SOCKET_MODE !== 'true') {
      console.log('- HTTP Mode requires:');
      console.log('  1. Public URL for event subscriptions');
      console.log('  2. Event URL configured in Slack app settings');
      console.log('  3. URL verification challenge handled');
    }
    console.log('\n');

    // Check for app_mentions:read scope
    const hasAppMentionScope = scopes.includes('app_mentions:read');
    console.log('App Mention Detection:');
    console.log('- app_mentions:read scope:', hasAppMentionScope ? 'Present' : 'MISSING (Required for bot mentions!)');
    
    if (!hasAppMentionScope) {
      console.log('\n⚠️  WARNING: app_mentions:read scope is missing!');
      console.log('   Bot mentions will not work without this scope.');
      console.log('   Add this scope in your Slack app settings.');
    }

    // Test posting a message
    console.log('\nTesting message posting...');
    try {
      const result = await app.client.chat.postMessage({
        token: process.env.SLACK_BOT_TOKEN,
        channel: authResult.user_id, // Send to bot's DM channel
        text: 'Test message from bot configuration check'
      });
      console.log('✓ Message posting works');
    } catch (error) {
      console.log('✗ Message posting failed:', error.message);
    }

  } catch (error) {
    console.error('Error during bot configuration test:', error);
  }
}

testBotMention();