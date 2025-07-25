const { AIReplyService } = require('../dist/services/aiReplyService');
const { config } = require('../dist/config/environment');

async function testAIReply() {
  console.log('[TEST] Testing AI Reply Service...\n');
  
  // Check OpenAI configuration
  console.log('[CONFIG] OpenAI Settings:');
  console.log(`  API Key: ${config.openai?.apiKey ? 'Set' : 'Not set'}`);
  console.log(`  Model: ${config.openai?.model || 'Not set'}`);
  console.log(`  Max Tokens: ${config.openai?.maxTokens || 'Not set'}`);
  console.log(`  Temperature: ${config.openai?.temperature || 'Not set'}`);
  console.log();

  if (!config.openai?.apiKey) {
    console.log('[ERROR] OpenAI API key is not set!');
    console.log('[INFO] Please set OPENAI_API_KEY in your .env file');
    return;
  }

  // Test message
  const testMessage = 'データベースのマイグレーションスクリプトのレビューをお願いします。明日のデプロイまでに確認が必要です。';
  
  try {
    const aiService = new AIReplyService(config.slack.botToken);
    
    console.log('[TEST] Generating replies for:', testMessage);
    console.log('[TEST] Calling generateQuickReplies...');
    
    const replies = await aiService.generateQuickReplies(
      testMessage,
      'test-user-id',
      'test-channel-id',
      'ja'
    );
    
    console.log(`\n[SUCCESS] Generated ${replies.length} replies:`);
    replies.forEach((reply, index) => {
      console.log(`  ${index + 1}. ${reply}`);
    });
    
  } catch (error) {
    console.error('[ERROR] Failed to generate replies:', error);
    if (error.response) {
      console.error('[API ERROR]', error.response.data);
    }
  }
}

testAIReply();