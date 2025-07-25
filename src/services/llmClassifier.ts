import { logger } from '@/utils/logger';
import { OpenAI } from 'openai';
import { config } from '@/config/environment';

export interface ClassificationResult {
  type: 'scheduling_request' | 'generic_request';
  dates?: Array<{
    date: string;
    part_of_day: 'morning' | 'afternoon' | 'evening';
  }>;
  intent_variants?: {
    agree_polite: string;
    agree_casual: string;
    reject_polite: string;
    reject_casual: string;
  };
}

/**
 * LLMを使用してメッセージを分類し、返信案を生成
 */
export class LLMClassifier {
  private openai: OpenAI;

  constructor() {
    this.openai = new OpenAI({
      apiKey: config.openai.apiKey,
    });
  }

  /**
   * メッセージを分類して返信案を生成
   */
  async classify(messageText: string): Promise<ClassificationResult> {
    try {
      const startTime = Date.now();
      
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4-turbo-preview',
        messages: [
          {
            role: 'system',
            content: this.getSystemPrompt()
          },
          {
            role: 'user',
            content: messageText
          }
        ],
        response_format: { type: 'json_object' },
        temperature: 0.3, // 一貫性のため低めに設定
        max_tokens: 500,
        timeout: 5000 // 5秒タイムアウト
      });

      const result = JSON.parse(response.choices[0].message.content || '{}');
      
      logger.info('LLM classification completed', {
        duration: Date.now() - startTime,
        type: result.type,
        hasDates: !!result.dates
      });

      return this.validateAndNormalize(result);

    } catch (error) {
      logger.error('LLM classification failed', { error, messageText });
      
      // フォールバック: 汎用返信
      return {
        type: 'generic_request',
        intent_variants: {
          agree_polite: '承知いたしました。確認して対応いたします。',
          agree_casual: '了解です！確認します。',
          reject_polite: '申し訳ございません。確認が必要ですので、後ほどご連絡いたします。',
          reject_casual: 'ちょっと確認が必要なので、また連絡します！'
        }
      };
    }
  }

  /**
   * システムプロンプト
   */
  private getSystemPrompt(): string {
    return `あなたはSlackメッセージを分類し、適切な返信案を生成するアシスタントです。
以下のルールに従って、メッセージを分類してください。

1. メッセージタイプの判定:
   - "scheduling_request": 日程調整、会議設定、時間の相談を含むメッセージ
   - "generic_request": その他の依頼、確認、質問

2. scheduling_requestの場合:
   - 日付を抽出して "dates" 配列に格納
   - 日付フォーマット: "YYYY-MM-DD"
   - part_of_day: "morning" (午前), "afternoon" (午後), "evening" (夕方/夜)
   - 返信案は固定（後述）

3. generic_requestの場合:
   - intent_variantsに4つの返信パターンを生成
   - agree_polite: 丁寧な承諾
   - agree_casual: カジュアルな承諾
   - reject_polite: 丁寧な断り/調整依頼
   - reject_casual: カジュアルな断り/調整依頼

必ず以下のJSON形式で返答してください：

scheduling_requestの例:
{
  "type": "scheduling_request",
  "dates": [
    {"date": "2024-10-11", "part_of_day": "morning"}
  ]
}

generic_requestの例:
{
  "type": "generic_request",
  "intent_variants": {
    "agree_polite": "承知いたしました。確認して対応いたします。",
    "agree_casual": "了解！やっておくね。",
    "reject_polite": "申し訳ございません。本日は対応が難しいため、明日でもよろしいでしょうか。",
    "reject_casual": "ごめん、今日は無理かも。明日でもいい？"
  }
}`;
  }

  /**
   * 結果の検証と正規化
   */
  private validateAndNormalize(result: any): ClassificationResult {
    // 基本構造の検証
    if (!result.type || !['scheduling_request', 'generic_request'].includes(result.type)) {
      throw new Error('Invalid classification type');
    }

    // scheduling_requestの場合
    if (result.type === 'scheduling_request') {
      if (!Array.isArray(result.dates) || result.dates.length === 0) {
        throw new Error('No dates found in scheduling request');
      }
      
      // 日付の正規化
      result.dates = result.dates.map((d: any) => ({
        date: this.normalizeDate(d.date),
        part_of_day: d.part_of_day || 'afternoon'
      }));

      // 固定の返信案を設定
      return {
        type: 'scheduling_request',
        dates: result.dates
      };
    }

    // generic_requestの場合
    if (!result.intent_variants || typeof result.intent_variants !== 'object') {
      throw new Error('Missing intent_variants');
    }

    const required = ['agree_polite', 'agree_casual', 'reject_polite', 'reject_casual'];
    for (const key of required) {
      if (!result.intent_variants[key]) {
        throw new Error(`Missing intent_variant: ${key}`);
      }
    }

    return {
      type: 'generic_request',
      intent_variants: result.intent_variants
    };
  }

  /**
   * 日付の正規化
   */
  private normalizeDate(dateStr: string): string {
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) {
        throw new Error('Invalid date');
      }
      return date.toISOString().split('T')[0];
    } catch {
      // 今日の日付を返す
      return new Date().toISOString().split('T')[0];
    }
  }
}