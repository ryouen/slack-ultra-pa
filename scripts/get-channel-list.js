const { WebClient } = require('@slack/web-api');
require('dotenv').config();

async function getChannelList() {
  const client = new WebClient(process.env.SLACK_BOT_TOKEN);
  
  try {
    console.log('[INFO] Fetching channel list...\n');
    
    // Get public channels
    const result = await client.conversations.list({
      exclude_archived: true,
      types: 'public_channel,private_channel'
    });
    
    if (result.channels) {
      console.log('[PUBLIC CHANNELS]');
      for (const channel of result.channels) {
        if (channel.name && channel.name.includes('times') || channel.name.includes('ryouen')) {
          console.log(`  ${channel.name}: ${channel.id} ${channel.is_member ? '(Bot is member)' : '(Bot NOT member)'}`);
        }
      }
      
      console.log('\n[ALL CHANNELS]');
      for (const channel of result.channels) {
        console.log(`  ${channel.name}: ${channel.id} ${channel.is_member ? '(Bot is member)' : ''}`);
      }
      
      console.log('\n[INFO] To add bot to a channel:');
      console.log('  1. Go to the channel in Slack');
      console.log('  2. Click on channel name at top');
      console.log('  3. Go to "Integrations" tab');
      console.log('  4. Add the bot app');
    }
    
  } catch (error) {
    console.error('[ERROR]', error.message);
    if (error.data && error.data.error === 'missing_scope') {
      console.error('[INFO] Bot needs channels:read scope to list channels');
    }
  }
}

getChannelList();