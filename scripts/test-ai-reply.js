// Test script for AI Reply Service
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

// Set up module alias
require('module-alias/register');
require('module-alias').addAliases({
  '@': path.join(__dirname, '../dist')
});

async function testAIReply() {
  try {
    console.log('[TEST] Starting AI Reply Service test...\n');

    // Import compiled services
    const { AIReplyService } = require('../dist/services/aiReplyService');
    const { config } = require('../dist/config/environment');

    // Check if OpenAI is configured
    if (!config.openai?.apiKey) {
      console.error('[ERROR] OpenAI API key not configured');
      return;
    }

    console.log('[INFO] OpenAI configured with model:', config.openai.model);

    // Create service instance
    const aiService = new AIReplyService(config.slack.botToken);

    // Test cases
    const testCases = [
      {
        name: 'Japanese formal request',
        message: 'お疲れ様です。明日の会議の資料準備をお願いできますでしょうか？',
        userId: 'test-user-1',
        channelId: 'test-channel-1',
        language: 'ja'
      },
      {
        name: 'Japanese casual question',
        message: 'このタスクって今週中でOK？',
        userId: 'test-user-2',
        channelId: 'test-channel-2',
        language: 'ja'
      },
      {
        name: 'English request',
        message: 'Hey, can you review the PR when you get a chance?',
        userId: 'test-user-3',
        channelId: 'test-channel-3',
        language: 'en'
      }
    ];

    for (const testCase of testCases) {
      console.log(`\n[TEST CASE] ${testCase.name}`);
      console.log(`Message: "${testCase.message}"`);
      console.log('Generating AI replies...');

      try {
        const replies = await aiService.generateQuickReplies(
          testCase.message,
          testCase.userId,
          testCase.channelId,
          testCase.language
        );

        console.log('\n[RESULTS] Generated replies:');
        replies.forEach((reply, index) => {
          console.log(`  ${index + 1}. ${reply}`);
        });
      } catch (error) {
        console.error('[ERROR] Failed to generate replies:', error.message);
      }
    }

    console.log('\n[TEST] Test completed!');

  } catch (error) {
    console.error('[ERROR] Test failed:', error);
  }
}

// Run test
testAIReply();