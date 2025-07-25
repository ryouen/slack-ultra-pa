# 重要な注意事項

## OpenAI モデル名
**絶対に変更しないこと**: `gpt-4.1-mini`

このプロジェクトでは OpenAI API のモデル名として `gpt-4.1-mini` を使用しています。
他のモデル名に変更しないでください。

- ✅ 正しい: `gpt-4.1-mini`
- ❌ 間違い: `gpt-4o-mini`, `gpt-4-1106-preview`, その他すべて

該当ファイル:
- `src/llm/MessageAnalyzer.ts`
- その他 OpenAI API を使用するすべてのファイル