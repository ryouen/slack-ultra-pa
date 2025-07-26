# Deep Link実装に関する重要事項

## 📌 実装概要
Slack標準permalinkをデスクトップアプリ用Deep Link（`slack://`プロトコル）に変換し、スレッドパネルを直接開く機能を実装しています。

## ⚠️ 重要な注意事項

### 1. 非公式URL形式の使用
- **リスク**: `slack://channel?team=...&tab=thread_ts`形式は**Slack公式ドキュメントに記載されていない内部仕様**です
- **影響**: Slackのアップデートにより予告なく動作しなくなる可能性があります
- **対策**: フォールバック機構により、Deep Link変換失敗時は標準permalinkを使用します

### 2. teamId取得の確実性
- **Socket Mode環境**: 
  - Block Actions: `body.team.id`から取得
  - Message Events: `event.team`から取得（ただし現在は`body`経由）
- **推奨**: イベントタイプごとに適切な取得方法を使用

### 3. プラットフォーム依存性
- **動作環境**:
  - ✅ Slackデスクトップアプリ（Windows/macOS）
  - ❌ Webブラウザ版Slack
  - ❓ モバイルアプリ（iOS/Android）- 未検証

### 4. セキュリティ考慮事項
- **Deep Link共有時の注意**: 
  - Deep LinkにはチャンネルIDとタイムスタンプが含まれます
  - Slack外部に共有された場合でも、Slack認証が必要なため内容は保護されます
  - ただし、チャンネルの存在とメッセージのタイミングは推測可能です

## 🔄 フォールバック設計
```typescript
const threadUrl = metadata.teamId 
  ? convertToThreadDeepLink(metadata.permalink, metadata.teamId) || metadata.permalink
  : metadata.permalink;
```
- teamId取得失敗 → 標準permalink使用
- Deep Link変換失敗 → 標準permalink使用

## 📊 動作確認チェックリスト

### 基本動作確認
- [ ] Public チャンネルでのスレッドジャンプ
- [ ] Private チャンネルでのスレッドジャンプ（ユーザーが参加済み）
- [ ] DMでのスレッドジャンプ

### クロスプラットフォーム確認
- [ ] Windows デスクトップアプリ
- [ ] macOS デスクトップアプリ
- [ ] Webブラウザ（フォールバック動作確認）
- [ ] iOS モバイルアプリ
- [ ] Android モバイルアプリ

### エッジケース確認
- [ ] teamId取得失敗時のフォールバック
- [ ] 削除されたメッセージへのリンク
- [ ] アーカイブされたチャンネルへのリンク

## 🚀 改善効果
- 返信ステップ: 5→3に削減
- 「Reply in thread」クリック不要
- スレッドパネル自動表示・入力欄フォーカス

## 📝 メンテナンス指針
1. Slackのアップデート情報を定期的に確認
2. Deep Link動作不良の報告があれば即座にフォールバックのみに切り替え
3. 公式APIでの代替手段が提供された場合は移行を検討

---
*最終更新: 2025-07-26*