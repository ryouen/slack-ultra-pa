// Internationalization support
// Multi-language support for Japanese and English

export interface I18nMessages {
  [key: string]: string | I18nMessages;
}

export interface I18nConfig {
  defaultLanguage: 'ja' | 'en';
  supportedLanguages: ('ja' | 'en')[];
  messages: Record<'ja' | 'en', I18nMessages>;
}

// i18n configuration with basic messages
export const i18nConfig: I18nConfig = {
  defaultLanguage: 'ja',
  supportedLanguages: ['ja', 'en'],
  messages: {
    ja: {
      help: {
        title: '[AI] Slack個人秘書AI - 利用可能なコマンド',
        description: 'あなたが本来やるべきことに集中するためのSlack個人秘書AIです。',
        commands: {
          help: '`/help` - このヘルプメッセージを表示',
          todo: '`/todo today` - 今日の優先タスクTop5を表示',
          lang: '`/lang [ja|en]` - 言語設定を切り替え',
          prep: '`/prep [eventID]` - 会議資料を準備',
          focus: '`/focus [duration]` - 集中モードを有効化'
        },
        tip: '[TIP] *ヒント:* どのチャンネルでもメンションするか、DMを送信してください！'
      },
      dm: {
        greeting: 'こんにちは{{name}}！[HELLO] 私はあなたの個人秘書です。',
        help_text: 'まだ学習中ですが、以下のことでお手伝いできます：',
        commands_list: '• `/help` で利用可能なコマンドを確認\n• `/todo today` で今日のタスクを確認\n• どのチャンネルでもメンションしてください'
      },
      mention: {
        greeting: 'こんにちは <@{{userId}}>！[HELLO] 私はあなたの個人秘書です。`/help` でできることを確認してください。'
      },
      error: {
        general: '申し訳ありません。エラーが発生しました。もう一度お試しください。'
      },
      language: {
        switched: '言語を{{language}}に切り替えました。'
      },
      feature: {
        coming_soon: 'この機能は近日公開予定です！お楽しみに [SOON]'
      }
    },
    en: {
      help: {
        title: '[AI] Slack Personal Assistant AI - Available Commands',
        description: 'Slack Personal Assistant AI to help you focus on what you should really be doing.',
        commands: {
          help: '`/help` - Show this help message',
          todo: '`/todo today` - Show top 5 priority tasks',
          lang: '`/lang [ja|en]` - Switch language preference',
          prep: '`/prep [eventID]` - Prepare meeting materials',
          focus: '`/focus [duration]` - Enable focus mode'
        },
        tip: '[TIP] *Tip:* Mention me in any channel or send me a DM to get started!'
      },
      dm: {
        greeting: 'Hi {{name}}! [HELLO] I\'m your personal assistant.',
        help_text: 'I\'m still learning, but here are some things I can help you with:',
        commands_list: '• Use `/help` to see available commands\n• Use `/todo today` to see your top tasks\n• Mention me in any channel for assistance'
      },
      mention: {
        greeting: 'Hello <@{{userId}}>! [HELLO] I\'m your personal assistant. Use `/help` to see what I can do for you.'
      },
      error: {
        general: 'Sorry, an error occurred. Please try again.'
      },
      language: {
        switched: 'Language switched to {{language}}.'
      },
      feature: {
        coming_soon: 'This feature is coming soon! Stay tuned [SOON]'
      }
    },
  },
};

/**
 * Get translation for a key with parameter substitution
 */
export function t(key: string, language: 'ja' | 'en' = 'ja', params?: Record<string, string>): string {
  const messages = i18nConfig.messages[language];
  let text = getNestedValue(messages, key);
  
  if (!text) {
    // Fallback to default language if not found
    if (language !== i18nConfig.defaultLanguage) {
      text = getNestedValue(i18nConfig.messages[i18nConfig.defaultLanguage], key);
    }
    
    if (!text) {
      console.warn(`Translation not found for key: ${key} in language: ${language}`);
      return key; // Return the key if translation not found
    }
  }
  
  // Parameter substitution
  if (params) {
    Object.entries(params).forEach(([param, value]) => {
      text = text.replace(new RegExp(`{{${param}}}`, 'g'), value);
    });
  }
  
  return text;
}

/**
 * Get nested value from object using dot notation
 */
function getNestedValue(obj: I18nMessages, key: string): string | undefined {
  const keys = key.split('.');
  let current: any = obj;
  
  for (const k of keys) {
    if (current && typeof current === 'object' && k in current) {
      current = current[k];
    } else {
      return undefined;
    }
  }
  
  return typeof current === 'string' ? current : undefined;
}

/**
 * Detect language from message content
 */
export function detectLanguage(text: string): 'ja' | 'en' {
  // Simple heuristic - check for Japanese characters
  const hasJapanese = /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/.test(text);
  return hasJapanese ? 'ja' : 'en';
}

/**
 * Get user's preferred language from database or detect from message
 */
export async function getUserLanguage(userId: string, messageText?: string): Promise<'ja' | 'en'> {
  // TODO: Implement database lookup for user preferences
  // For now, detect from message or default to Japanese
  if (messageText) {
    return detectLanguage(messageText);
  }
  return 'ja';
}