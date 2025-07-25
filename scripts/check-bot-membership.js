const { WebClient } = require('@slack/web-api');
require('dotenv').config();

async function checkBotMembership() {
  const client = new WebClient(process.env.SLACK_BOT_TOKEN);
  
  try {
    console.log('[INFO] Checking bot membership in channels...\n');
    
    // Get bot info first
    const authResult = await client.auth.test();
    const botUserId = authResult.user_id;
    console.log(`[BOT] Bot User ID: ${botUserId}`);
    console.log(`[BOT] Bot Name: ${authResult.user}\n`);
    
    // Get list of channels bot is member of
    console.log('[CHANNELS] Bot is a member of:');
    
    try {
      // Try to get conversations list
      const result = await client.conversations.list({
        exclude_archived: true,
        types: 'public_channel,private_channel',
        limit: 200
      });
      
      if (result.channels) {
        const memberChannels = result.channels.filter(ch => ch.is_member);
        
        if (memberChannels.length === 0) {
          console.log('  [WARNING] Bot is not a member of any channels!');
          console.log('  [INFO] Please add the bot to channels where you want to use it.\n');
        } else {
          memberChannels.forEach(channel => {
            console.log(`  - #${channel.name} (${channel.id})`);
          });
        }
        
        // Look for times_ryouen specifically
        console.log('\n[SEARCH] Looking for #times_ryouen:');
        const timesChannel = result.channels.find(ch => 
          ch.name && ch.name.includes('times_ryouen')
        );
        
        if (timesChannel) {
          console.log(`  Found: #${timesChannel.name} (${timesChannel.id})`);
          console.log(`  Bot is member: ${timesChannel.is_member ? 'YES' : 'NO'}`);
          
          if (!timesChannel.is_member) {
            console.log('\n[ACTION REQUIRED]');
            console.log('1. Go to #times_ryouen in Slack');
            console.log('2. Click on the channel name at the top');
            console.log('3. Go to "Integrations" tab');
            console.log('4. Click "Add apps"');
            console.log('5. Add your bot app\n');
          }
        } else {
          console.log('  [NOT FOUND] Channel #times_ryouen not found');
          console.log('  [INFO] Make sure the channel exists and is accessible\n');
        }
        
      }
    } catch (error) {
      if (error.data && error.data.error === 'missing_scope') {
        console.error('[ERROR] Bot needs channels:read scope');
        console.error('[INFO] Add these scopes to your Slack app:');
        console.error('  - channels:read');
        console.error('  - groups:read');
      } else {
        throw error;
      }
    }
    
    // Try to join public channels (if we have permission)
    console.log('\n[TIP] To automatically join public channels:');
    console.log('1. Use client.conversations.join({channel: channelId})');
    console.log('2. For private channels, bot must be invited manually\n');
    
  } catch (error) {
    console.error('[ERROR]', error.message);
    console.error('[INFO] Make sure your bot token is valid');
  }
}

checkBotMembership();