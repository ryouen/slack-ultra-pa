import { App } from '@slack/bolt';
import { config } from '../src/config/environment';
import { logger } from '../src/utils/logger';
import { safeJsonParse } from '../src/utils/jsonHelpers';
import { validateSlackUserId, validateSlackChannelId } from '../src/utils/validation';

/**
 * Integration test to verify Slack bot functionality after code improvements
 */

async function verifySlackIntegration() {
  console.log('🤖 Verifying Slack Integration...\n');
  
  const results = {
    appInitialization: false,
    eventHandling: false,
    commandHandling: false,
    messageHandling: false,
    utilityIntegration: false,
  };

  try {
    // Test 1: App Initialization
    console.log('1️⃣ Testing App Initialization...');
    const app = new App({
      token: config.slack.botToken,
      signingSecret: config.slack.signingSecret,
      socketMode: config.slack.socketMode,
      appToken: config.slack.appToken,
    });
    results.appInitialization = true;
    console.log('  ✅ App initialized successfully\n');

    // Test 2: Event Handler with Safe JSON Parsing
    console.log('2️⃣ Testing Event Handling with Utilities...');
    app.event('app_mention', async ({ event, client, logger }) => {
      try {
        // Test validation utilities
        const isValidUser = validateSlackUserId(event.user);
        const isValidChannel = validateSlackChannelId(event.channel);
        
        if (!isValidUser || !isValidChannel) {
          throw new Error('Invalid Slack IDs');
        }

        // Test safe JSON parsing
        const metadata = safeJsonParse(event.metadata as any, {});
        
        logger.info('Event handled with improved utilities', {
          user: event.user,
          channel: event.channel,
          hasMetadata: Object.keys(metadata).length > 0
        });
        
        results.eventHandling = true;
      } catch (error) {
        logger.error('Event handling failed:', error);
      }
    });
    console.log('  ✅ Event handler registered\n');

    // Test 3: Command Handler
    console.log('3️⃣ Testing Command Handling...');
    app.command('/inbox', async ({ command, ack, respond }) => {
      await ack();
      
      // Validate command data
      if (!validateSlackUserId(command.user_id)) {
        await respond('Invalid user ID');
        return;
      }
      
      results.commandHandling = true;
      await respond('Command processed successfully');
    });
    console.log('  ✅ Command handler registered\n');

    // Test 4: Message Handler with Error Handling
    console.log('4️⃣ Testing Message Handling...');
    app.message(async ({ message, client }) => {
      try {
        // Safe access to message properties
        const messageData = message as any;
        const userId = messageData.user;
        
        if (userId && validateSlackUserId(userId)) {
          results.messageHandling = true;
          logger.info('Message processed', { userId });
        }
      } catch (error) {
        logger.error('Message handling error:', error);
      }
    });
    console.log('  ✅ Message handler registered\n');

    // Test 5: Utility Integration
    console.log('5️⃣ Testing Utility Integration...');
    // Simulate processing with our utilities
    const testData = {
      user: 'U123ABC456',
      channel: 'C123ABC456',
      metadata: '{"priority": "P1", "type": "task"}',
      invalidJson: 'not json',
    };

    const processedData = {
      validUser: validateSlackUserId(testData.user),
      validChannel: validateSlackChannelId(testData.channel),
      parsedMetadata: safeJsonParse(testData.metadata, {}),
      parsedInvalid: safeJsonParse(testData.invalidJson, { default: true }),
    };

    if (
      processedData.validUser &&
      processedData.validChannel &&
      processedData.parsedMetadata.priority === 'P1' &&
      processedData.parsedInvalid.default === true
    ) {
      results.utilityIntegration = true;
      console.log('  ✅ Utilities integrated successfully\n');
    } else {
      console.error('  ❌ Utility integration failed:', processedData);
    }

    // Summary
    console.log('📊 Integration Test Summary:');
    Object.entries(results).forEach(([test, passed]) => {
      console.log(`  ${passed ? '✅' : '❌'} ${test}`);
    });

    const allPassed = Object.values(results).every(r => r);
    if (allPassed) {
      console.log('\n✅ All Slack integration tests passed!');
      console.log('The code improvements are compatible with existing functionality.');
    } else {
      console.log('\n⚠️  Some integration tests failed.');
      console.log('Please review the implementation.');
    }

  } catch (error) {
    console.error('❌ Critical error during integration test:', error);
    console.error('This may indicate breaking changes in the code improvements.');
  }
}

// Run the verification
verifySlackIntegration().catch(console.error);