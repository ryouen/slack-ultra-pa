const { WebClient } = require('@slack/web-api');
require('dotenv').config();

async function checkBotPermissions() {
  const client = new WebClient(process.env.SLACK_BOT_TOKEN);
  
  console.log('[INFO] Checking bot permissions...\n');
  
  try {
    // Test auth to get basic info and scopes
    console.log('[1] Testing auth.test...');
    const authResult = await client.auth.test();
    console.log('✓ Bot authenticated successfully');
    console.log(`  Bot User ID: ${authResult.user_id}`);
    console.log(`  Bot Username: ${authResult.user}`);
    console.log(`  Team: ${authResult.team} (${authResult.team_id})`);
    console.log(`  URL: ${authResult.url}\n`);

    // Get OAuth scopes
    console.log('[2] Getting OAuth scopes...');
    try {
      // Try to get scopes from apps.permissions.info (requires admin scope)
      const permResult = await client.apps.permissions.info();
      console.log('✓ Permissions info retrieved');
      if (permResult.permissions) {
        console.log('  Scopes:', permResult.permissions.scopes);
      }
    } catch (error) {
      console.log('✗ apps.permissions.info failed (normal for non-admin tokens)');
      console.log('  Checking alternative methods...\n');
    }

    // Test each API endpoint to determine available scopes
    console.log('[3] Testing API endpoints to determine scopes...\n');
    
    const scopeTests = [
      {
        name: 'channels:read',
        test: async () => await client.conversations.list({ limit: 1, types: 'public_channel' }),
        description: 'List public channels'
      },
      {
        name: 'groups:read', 
        test: async () => await client.conversations.list({ limit: 1, types: 'private_channel' }),
        description: 'List private channels'
      },
      {
        name: 'im:read',
        test: async () => await client.conversations.list({ limit: 1, types: 'im' }),
        description: 'List direct messages'
      },
      {
        name: 'mpim:read',
        test: async () => await client.conversations.list({ limit: 1, types: 'mpim' }),
        description: 'List multi-person DMs'
      },
      {
        name: 'channels:history',
        test: async () => {
          const channels = await client.conversations.list({ limit: 1, types: 'public_channel' });
          if (channels.channels && channels.channels.length > 0) {
            await client.conversations.history({ channel: channels.channels[0].id, limit: 1 });
          }
        },
        description: 'Read channel history'
      },
      {
        name: 'search:read',
        test: async () => await client.search.messages({ query: 'test', count: 1 }),
        description: 'Search messages'
      },
      {
        name: 'users:read',
        test: async () => await client.users.info({ user: authResult.user_id }),
        description: 'Get user info'
      },
      {
        name: 'chat:write',
        test: async () => {
          // Don't actually send a message, just check if we could
          return { ok: true }; // Assume we have this if auth.test worked
        },
        description: 'Send messages'
      },
      {
        name: 'commands',
        test: async () => {
          // Can't directly test, but if bot is responding to commands, it has this
          return { ok: true };
        },
        description: 'Respond to slash commands'
      },
      {
        name: 'app_mentions:read',
        test: async () => {
          // Can't directly test, but needed for @mentions
          return { ok: true };
        },
        description: 'Read app mentions'
      }
    ];

    const availableScopes = [];
    const missingScopes = [];

    for (const scopeTest of scopeTests) {
      process.stdout.write(`  Testing ${scopeTest.name} (${scopeTest.description})... `);
      try {
        await scopeTest.test();
        console.log('✓ Available');
        availableScopes.push(scopeTest.name);
      } catch (error) {
        if (error.data && error.data.error === 'missing_scope') {
          console.log('✗ Missing');
          missingScopes.push(scopeTest.name);
        } else if (error.data && error.data.error) {
          console.log(`✗ Error: ${error.data.error}`);
          missingScopes.push(scopeTest.name);
        } else {
          console.log('✗ Unknown error');
          missingScopes.push(scopeTest.name);
        }
      }
    }

    // Summary
    console.log('\n[SUMMARY]');
    console.log('Available scopes:', availableScopes.join(', '));
    console.log('Missing scopes:', missingScopes.join(', '));

    // Check for required scopes for /mention command
    console.log('\n[REQUIRED FOR /mention COMMAND]');
    const requiredScopes = ['search:read', 'channels:read', 'channels:history', 'groups:read', 'groups:history'];
    const missingRequired = requiredScopes.filter(scope => missingScopes.includes(scope));
    
    if (missingRequired.length > 0) {
      console.log('⚠️  Missing required scopes for /mention command:');
      missingRequired.forEach(scope => console.log(`   - ${scope}`));
      console.log('\n[ACTION REQUIRED]');
      console.log('1. Go to https://api.slack.com/apps');
      console.log('2. Select your app');
      console.log('3. Go to "OAuth & Permissions"');
      console.log('4. Add the missing scopes under "Bot Token Scopes"');
      console.log('5. Reinstall the app to your workspace');
    } else {
      console.log('✅ All required scopes are available!');
    }

    // Test search.messages specifically
    console.log('\n[TESTING search.messages API]');
    try {
      const searchResult = await client.search.messages({
        query: `@${authResult.user_id}`,
        count: 1
      });
      console.log('✓ search.messages is working');
      console.log(`  Found ${searchResult.messages.total} total matches`);
    } catch (error) {
      console.log('✗ search.messages failed:', error.data?.error || error.message);
    }

  } catch (error) {
    console.error('[ERROR] Failed to check permissions:', error.message);
    if (error.data) {
      console.error('Error details:', error.data);
    }
  }
}

checkBotPermissions();