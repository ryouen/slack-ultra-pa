# AI Quick Reply Implementation Documentation

## Overview
This document describes the implementation of Task 10.4 - AI Quick Reply Generation for the Slack Personal Assistant project.

## Implementation Summary

### Files Created/Modified

1. **`src/services/aiReplyService.ts`** (New)
   - Core AI reply generation service
   - Integrates with OpenAI API (gpt-4.1-mini)
   - Implements user style learning from Slack message history
   - Provides context-aware message analysis

2. **`src/services/taskService.ts`** (Modified)
   - Enhanced `generateQuickReplies()` method
   - Added AI service integration with fallback to templates
   - Maintains backward compatibility

3. **`src/config/environment.ts`** (Modified)
   - Added OpenAI configuration support
   - Environment variables for API key, model, tokens, temperature

4. **`src/services/aiReplyService.test.ts`** (New)
   - Test cases for various scenarios
   - Examples of expected outputs

## Key Features Implemented

### 1. User Style Learning
```typescript
interface UserStyle {
  formalityLevel: 'casual' | 'polite' | 'formal';
  emojiFrequency: number; // 0-1
  averageLength: number;
  commonPhrases: string[];
  language: 'ja' | 'en';
}
```

The system analyzes:
- Formality markers (です/ます vs カジュアル)
- Emoji usage frequency
- Average message length
- Common phrases used by the user
- Language preference

### 2. Message Context Analysis
```typescript
interface MessageContext {
  urgency: 'low' | 'medium' | 'high';
  sentiment: 'positive' | 'neutral' | 'negative';
  messageType: 'question' | 'request' | 'information' | 'greeting';
  keywords: string[];
}
```

Detects:
- Urgency indicators (急ぎ, ASAP, 至急)
- Message type (question, request, etc.)
- Sentiment analysis
- Key terms extraction

### 3. AI Integration
- Uses OpenAI's gpt-4.1-mini model
- Context-aware prompt generation
- Style-matching reply generation
- Automatic emoji addition based on user preference

### 4. Error Handling
- Graceful fallback to template replies
- Comprehensive error logging
- API failure recovery
- Missing configuration handling

## Configuration

### Environment Variables
```env
OPENAI_API_KEY=sk-proj-xxxxx
OPENAI_MODEL=gpt-4.1-mini
OPENAI_MAX_TOKENS=300
OPENAI_TEMPERATURE=0.7
```

### Slack Permissions Required
- `channels:history` - Read channel message history
- `groups:history` - Read private channel history
- `im:history` - Read direct message history
- `mpim:history` - Read group DM history

## Usage Example

When a user is mentioned, the system:
1. Creates an inbox entry
2. Shows 3-button interface (Add Task/Ignore/Quick Reply)
3. On "Quick Reply" click:
   - Fetches user's recent messages
   - Analyzes writing style
   - Analyzes message context
   - Generates 3 AI-powered reply options
   - Shows options with "Use" buttons

## Example Outputs

### Polite Japanese User (with emojis)
**Input**: "お疲れ様です！明日の資料、準備できそうでしょうか？🙏"

**Generated Replies**:
1. "お疲れ様です！承知いたしました。明日までに準備いたします✨"
2. "ありがとうございます！確認して、明日お渡しできるよう進めます🙌"
3. "かしこまりました！明日の資料、しっかり準備させていただきます💪"

### Casual English User
**Input**: "Hey, can you check the PR when you get a chance?"

**Generated Replies**:
1. "Sure! I'll check the PR soon."
2. "Got it! Will review the PR today."
3. "Thanks for the heads up! I'll take a look."

## Performance Considerations

- Slack API calls are cached to minimize rate limiting
- User style is learned from last 50 messages (configurable)
- OpenAI API timeout: 10 seconds
- Fallback to templates if API fails

## Future Enhancements

1. **Style Persistence**: Cache learned user styles in database
2. **Multi-language Support**: Add more languages beyond ja/en
3. **Context Memory**: Remember previous conversations
4. **Fine-tuning**: Train on organization-specific communication patterns
5. **Metrics**: Track reply usage and effectiveness

## Testing

Run tests:
```bash
npm test src/services/aiReplyService.test.ts
```

## Troubleshooting

### Common Issues

1. **"OpenAI not configured" warning**
   - Ensure OPENAI_API_KEY is set in .env
   - Restart the application

2. **Slack permission errors**
   - Add required history scopes to Slack app
   - Reinstall app to workspace

3. **Slow response times**
   - Check OpenAI API status
   - Consider reducing OPENAI_MAX_TOKENS
   - Implement response caching

## Dependencies

- `openai`: ^5.10.2 - OpenAI API client
- `@slack/bolt`: Existing - Slack API client
- `@slack/web-api`: Transitive - For conversation history

## Security Notes

- OpenAI API key stored in environment variables only
- No user messages are permanently stored
- Slack tokens handled securely via existing OAuth flow
- All API calls use HTTPS