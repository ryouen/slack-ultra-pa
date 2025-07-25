import OpenAI from 'openai';
import { z } from 'zod';

const AnalysisSchema = z.object({
  type: z.enum(['scheduling_request', 'generic_request']),
  dates: z.array(z.object({
    date: z.string(),
    part_of_day: z.enum(['morning', 'afternoon', 'evening'])
  })).optional(),
  intent_variants: z.object({
    agree_polite: z.string(),
    agree_casual: z.string(),
    reject_polite: z.string(),
    reject_casual: z.string()
  }).optional()
});

export type AnalysisResult = z.infer<typeof AnalysisSchema>;

export class MessageAnalyzer {
  private openai: OpenAI;

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
  }

  async analyzeMessage(messageText: string): Promise<AnalysisResult> {
    const systemPrompt = `
Role: あなたはSlackメッセージを分類し、指定されたJSON形式のみで返答するAIです。

分類タイプ:
1. scheduling_request: 日程調整・会議設定の依頼
2. generic_request: 一般的な依頼・確認・質問

出力形式:
{
  "type": "scheduling_request" | "generic_request",
  "dates": [{"date":"YYYY-MM-DD","part_of_day":"morning/afternoon/evening"}], // scheduling のみ
  "intent_variants": {
    "agree_polite": "丁寧な承諾返信",
    "agree_casual": "カジュアルな承諾返信", 
    "reject_polite": "丁寧な断り返信",
    "reject_casual": "カジュアルな断り返信"
  } // generic のみ
}

Few-shot examples:
入力: "来週の火曜日14時からミーティングできますか？"
出力: {"type":"scheduling_request","dates":[{"date":"2025-01-28","part_of_day":"afternoon"}]}

入力: "資料の確認をお願いします"
出力: {"type":"generic_request","intent_variants":{"agree_polite":"承知いたしました。確認いたします。","agree_casual":"わかりました！確認しますね","reject_polite":"申し訳ありません、今は難しい状況です。","reject_casual":"ごめん、今ちょっと厳しいかも"}}
    `;

    try {
      const startTime = Date.now();
      
      const response = await this.openai.chat.completions.create({
        model: process.env.OPENAI_MODEL!,
        temperature: parseFloat(process.env.OPENAI_TEMPERATURE || '0.2'),
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: messageText }
        ],
        response_format: { type: 'json_object' }
      });

      const content = response.choices[0]?.message?.content;
      if (!content) throw new Error('No response from OpenAI');

      const parsed = JSON.parse(content);
      const validated = AnalysisSchema.parse(parsed);
      
      console.log('Message analyzed successfully', {
        type: validated.type,
        duration: Date.now() - startTime
      });

      return validated;

    } catch (error) {
      console.error('Message analysis failed', { error, messageText });
      
      // 失敗時は type "generic_request" で既定値返却
      return {
        type: 'generic_request',
        intent_variants: {
          agree_polite: '承知いたしました。対応いたします。',
          agree_casual: 'わかりました！やりますね',
          reject_polite: '申し訳ありません、難しい状況です。',
          reject_casual: 'ごめん、ちょっと厳しいかも'
        }
      };
    }
  }
}