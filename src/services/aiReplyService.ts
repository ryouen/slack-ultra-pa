import { logger } from '@/utils/logger';
import { config } from '@/config/environment';
import OpenAI from 'openai';
import { WebClient } from '@slack/web-api';

export interface UserStyle {
  formalityLevel: 'casual' | 'polite' | 'formal';
  emojiFrequency: number; // 0-1
  averageLength: number;
  commonPhrases: string[];
  language: 'ja' | 'en';
}

export interface MessageContext {
  urgency: 'low' | 'medium' | 'high';
  sentiment: 'positive' | 'neutral' | 'negative';
  messageType: 'question' | 'request' | 'information' | 'greeting';
  keywords: string[];
  channelName?: string;
  authorName?: string;
}

export class AIReplyService {
  private openai: OpenAI;
  private slackClient: WebClient;

  constructor(slackToken: string) {
    this.openai = new OpenAI({
      apiKey: config.openai?.apiKey || process.env.OPENAI_API_KEY,
    });
    this.slackClient = new WebClient(slackToken);
  }

  /**
   * Generate AI-powered quick reply options
   */
  async generateQuickReplies(
    messageText: string,
    userId: string,
    channelId: string,
    language: 'ja' | 'en' = 'ja'
  ): Promise<string[]> {
    try {
      // 1. Learn user's writing style from recent messages
      const userStyle = await this.learnUserStyle(userId, channelId);
      
      // 2. Analyze message context
      const context = await this.analyzeMessageContext(messageText);
      
      // 3. Generate replies using OpenAI
      const replies = await this.generateAIReplies(messageText, userStyle, context, language);
      
      return replies;
    } catch (error) {
      logger.error('Failed to generate AI replies', { error, userId, channelId });
      // Fallback to template replies
      return this.getTemplateReplies(language);
    }
  }

  /**
   * Learn user's writing style from recent Slack messages
   */
  private async learnUserStyle(userId: string, channelId: string): Promise<UserStyle> {
    try {
      // Skip learning from history for now
      // In production, would need to:
      // 1. Check if channelId is a DM channel
      // 2. Open DM conversation if needed
      // 3. Handle different channel types (public, private, DM)
      logger.info('Using default user style', { userId });
      return this.getDefaultUserStyle();
    } catch (error) {
      logger.error('Failed to learn user style', { error, userId });
      return this.getDefaultUserStyle();
    }
  }

  /**
   * Analyze writing style from messages
   */
  private analyzeWritingStyle(messages: string[]): UserStyle {
    // Formality detection
    let formalityScore = 0;
    const formalMarkers = {
      ja: ['です', 'ます', 'いたします', 'でしょうか', 'ございます'],
      casual: ['っす', 'だね', 'よね', 'かな', 'だよ']
    };

    // Emoji frequency
    const emojiRegex = /[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu;
    let totalEmojis = 0;

    // Common phrases extraction
    const phraseMap = new Map<string, number>();
    
    // Average message length
    let totalLength = 0;

    messages.forEach(msg => {
      // Formality check
      formalMarkers.ja.forEach(marker => {
        if (msg.includes(marker)) formalityScore++;
      });
      formalMarkers.casual.forEach(marker => {
        if (msg.includes(marker)) formalityScore--;
      });

      // Count emojis
      const emojis = msg.match(emojiRegex);
      if (emojis) totalEmojis += emojis.length;

      // Message length
      totalLength += msg.length;

      // Extract common phrases (2-5 character sequences)
      const words = msg.split(/[\s、。！？]/);
      words.forEach(word => {
        if (word.length >= 2 && word.length <= 5) {
          phraseMap.set(word, (phraseMap.get(word) || 0) + 1);
        }
      });
    });

    // Determine formality level
    const avgFormalityScore = formalityScore / messages.length;
    let formalityLevel: 'casual' | 'polite' | 'formal';
    if (avgFormalityScore > 1.5) {
      formalityLevel = 'formal';
    } else if (avgFormalityScore > 0.5) {
      formalityLevel = 'polite';
    } else {
      formalityLevel = 'casual';
    }

    // Calculate emoji frequency
    const emojiFrequency = Math.min(totalEmojis / messages.length, 1);

    // Get top common phrases
    const sortedPhrases = Array.from(phraseMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([phrase]) => phrase);

    // Calculate average length
    const averageLength = Math.round(totalLength / messages.length);

    // Detect language (simple check)
    const hasJapanese = messages.some(msg => /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/.test(msg));
    const language = hasJapanese ? 'ja' : 'en';

    return {
      formalityLevel,
      emojiFrequency,
      averageLength,
      commonPhrases: sortedPhrases,
      language
    };
  }

  /**
   * Analyze message context
   */
  private async analyzeMessageContext(messageText: string): Promise<MessageContext> {
    // Urgency detection
    const urgencyMarkers = {
      high: ['急ぎ', '至急', 'ASAP', '今すぐ', 'urgent', '緊急', '本日中', '今日中'],
      medium: ['できれば', '可能なら', 'お願い', 'よろしく', 'when you can'],
      low: ['いつでも', 'お時間あるとき', 'no rush', 'ゆっくり']
    };

    let urgency: 'low' | 'medium' | 'high' = 'medium';
    for (const [level, markers] of Object.entries(urgencyMarkers)) {
      if (markers.some(marker => messageText.includes(marker))) {
        urgency = level as 'low' | 'medium' | 'high';
        break;
      }
    }

    // Message type detection
    let messageType: 'question' | 'request' | 'information' | 'greeting' = 'information';
    if (messageText.includes('?') || messageText.includes('？') || messageText.includes('でしょうか')) {
      messageType = 'question';
    } else if (messageText.includes('お願い') || messageText.includes('してください') || messageText.includes('please')) {
      messageType = 'request';
    } else if (messageText.match(/おはよう|こんにちは|お疲れ様|hello|hi|hey/i)) {
      messageType = 'greeting';
    }

    // Simple sentiment analysis
    const positiveMarkers = ['ありがとう', '素晴らしい', 'great', 'excellent', '良い', 'thanks'];
    const negativeMarkers = ['問題', '困った', 'issue', 'problem', '失敗', 'error'];
    
    let sentiment: 'positive' | 'neutral' | 'negative' = 'neutral';
    if (positiveMarkers.some(marker => messageText.includes(marker))) {
      sentiment = 'positive';
    } else if (negativeMarkers.some(marker => messageText.includes(marker))) {
      sentiment = 'negative';
    }

    // Extract keywords (simple approach)
    const keywords = messageText
      .split(/[\s、。！？]/)
      .filter(word => word.length > 2)
      .slice(0, 5);

    return {
      urgency,
      sentiment,
      messageType,
      keywords
    };
  }

  /**
   * Generate AI replies using OpenAI
   */
  private async generateAIReplies(
    originalMessage: string,
    userStyle: UserStyle,
    context: MessageContext,
    language: 'ja' | 'en'
  ): Promise<string[]> {
    try {
      const styleDescription = this.getStyleDescription(userStyle, language);
      const contextDescription = this.getContextDescription(context, language);

      const systemPrompt = language === 'ja' 
        ? `あなたは優秀な秘書AIです。ユーザーのメッセージに対して、3つの返信候補を生成してください。
          ${styleDescription}
          ${contextDescription}
          各返信は1-2文で簡潔に、ユーザーの文体に合わせて作成してください。`
        : `You are an excellent secretary AI. Generate 3 reply options for the user's message.
          ${styleDescription}
          ${contextDescription}
          Each reply should be 1-2 sentences, concise, and match the user's writing style.`;

      const userPrompt = language === 'ja'
        ? `以下のメッセージに対する3つの返信候補を生成してください：\n\n"${originalMessage}"\n\n返信1:\n返信2:\n返信3:`
        : `Generate 3 reply options for the following message:\n\n"${originalMessage}"\n\nReply 1:\nReply 2:\nReply 3:`;

      // Try to use the model from env
      let modelToUse = process.env.OPENAI_MODEL!;
      
      try {
        const completion = await this.openai.chat.completions.create({
          model: modelToUse,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          temperature: parseFloat(process.env.OPENAI_TEMPERATURE || '0.7'),
          max_tokens: parseInt(process.env.OPENAI_MAX_TOKENS || '300'),
        });

        const response = completion.choices[0]?.message?.content;
        if (!response) {
          throw new Error('No response from OpenAI');
        }

        logger.info('OpenAI raw response', { response });

        // Parse the replies
        const replies = this.parseAIReplies(response);
        
        logger.info('Parsed replies', { replies, count: replies.length });
        
        // Add emojis if user style includes them
        if (userStyle.emojiFrequency > 0.3) {
          return replies.map(reply => this.addEmojis(reply, userStyle.emojiFrequency));
        }

        return replies;
      } catch (error) {
        logger.error('OpenAI API error', { error, model: modelToUse });
        // Try with fallback model
        if (modelToUse === 'gpt-4.1-mini') {
          logger.info('Trying fallback model gpt-3.5-turbo');
          const completion = await this.openai.chat.completions.create({
            model: 'gpt-3.5-turbo',
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userPrompt }
            ],
            temperature: config.openai?.temperature || 0.7,
            max_tokens: config.openai?.maxTokens || 300,
          });

          const response = completion.choices[0]?.message?.content;
          if (!response) {
            throw new Error('No response from OpenAI');
          }

          logger.info('OpenAI fallback response', { response });

          // Parse the replies
          const replies = this.parseAIReplies(response);
          return replies;
        }
        throw error;
      }
    } catch (error) {
      logger.error('Final OpenAI API error', { error });
      throw error;
    }
  }

  /**
   * Get style description for prompt
   */
  private getStyleDescription(userStyle: UserStyle, language: 'ja' | 'en'): string {
    const descriptions = {
      ja: {
        casual: 'カジュアルで親しみやすい文体',
        polite: '丁寧で礼儀正しい文体',
        formal: 'フォーマルで敬語を使った文体'
      },
      en: {
        casual: 'casual and friendly tone',
        polite: 'polite and courteous tone',
        formal: 'formal and professional tone'
      }
    };

    const formalityDesc = language === 'ja' 
      ? descriptions.ja[userStyle.formalityLevel]
      : descriptions.en[userStyle.formalityLevel];

    const emojiDesc = userStyle.emojiFrequency > 0.3
      ? (language === 'ja' ? '絵文字を適度に使用' : 'use emojis moderately')
      : '';

    const lengthDesc = language === 'ja'
      ? `平均文字数${userStyle.averageLength}文字程度`
      : `average length around ${userStyle.averageLength} characters`;

    return `${formalityDesc}、${lengthDesc}${emojiDesc ? '、' + emojiDesc : ''}`;
  }

  /**
   * Get context description for prompt
   */
  private getContextDescription(context: MessageContext, language: 'ja' | 'en'): string {
    const urgencyMap = {
      ja: { high: '緊急', medium: '通常', low: '急ぎでない' },
      en: { high: 'urgent', medium: 'normal', low: 'not urgent' }
    };

    const typeMap = {
      ja: { question: '質問', request: '依頼', information: '情報共有', greeting: '挨拶' },
      en: { question: 'question', request: 'request', information: 'information', greeting: 'greeting' }
    };

    return language === 'ja'
      ? `メッセージタイプ: ${typeMap.ja[context.messageType]}、緊急度: ${urgencyMap.ja[context.urgency]}`
      : `Message type: ${typeMap.en[context.messageType]}, Urgency: ${urgencyMap.en[context.urgency]}`;
  }

  /**
   * Parse AI replies from response
   */
  private parseAIReplies(response: string): string[] {
    logger.info('Parsing AI response', { response });
    const replies: string[] = [];

    // First try to match the exact format: 返信1: or Reply 1:
    const replyPattern = /(?:返信|Reply)\s*(\d+)[:：]\s*([^]*?)(?=(?:返信|Reply)\s*\d+[:：]|$)/gi;
    let match;
    
    while ((match = replyPattern.exec(response)) !== null) {
      const replyText = match[2].trim();
      if (replyText) {
        replies.push(replyText);
      }
    }

    // If no matches, try numbered patterns
    if (replies.length === 0) {
      const numberedPattern = /(\d+)[.．)）]\s*([^]*?)(?=\d+[.．)）]|$)/gi;
      while ((match = numberedPattern.exec(response)) !== null) {
        const replyText = match[2].trim();
        if (replyText) {
          replies.push(replyText);
        }
      }
    }

    // If still no matches, split by double newlines
    if (replies.length === 0) {
      const sections = response.split(/\n\n+/).filter(s => s.trim());
      for (const section of sections) {
        const cleanedSection = section.replace(/^(?:返信|Reply)\s*\d+[:：]\s*/i, '').trim();
        if (cleanedSection) {
          replies.push(cleanedSection);
        }
      }
    }

    logger.info('Parsed replies', { count: replies.length, replies });

    // Ensure we have exactly 3 replies
    while (replies.length < 3) {
      replies.push(this.getTemplateReplies('ja')[replies.length]);
    }

    return replies.slice(0, 3);
  }

  /**
   * Add emojis to reply based on frequency
   */
  private addEmojis(reply: string, frequency: number): string {
    if (Math.random() > frequency) return reply;

    // Emoji functionality disabled for Windows compatibility
    return reply; // Return reply without modifications
    // Previously would add emojis here, now disabled
  }

  /**
   * Get default user style
   */
  private getDefaultUserStyle(): UserStyle {
    return {
      formalityLevel: 'polite',
      emojiFrequency: 0.2,
      averageLength: 50,
      commonPhrases: [],
      language: 'ja'
    };
  }

  /**
   * Get template replies as fallback
   */
  private getTemplateReplies(language: 'ja' | 'en'): string[] {
    if (language === 'ja') {
      return [
        'ありがとうございます。確認いたします。',
        '承知いたしました。対応いたします。',
        'お疲れ様です。検討させていただきます。'
      ];
    } else {
      return [
        'Thank you. I will check on this.',
        'Understood. I will take care of it.',
        'Thanks for letting me know. I will review this.'
      ];
    }
  }
}