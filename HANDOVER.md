# Slack Personal Assistant - 開発引き継ぎドキュメント

## 現在の状況 / Current Status

### 完了済みタスク / Completed Tasks
- ✅ **タスク1**: プロジェクト設定と依存関係
- ✅ **タスク5**: 基本Slack統合とヘルプシステム

### 次の優先タスク / Next Priority Tasks
1. **タスク2**: データベーススキーマとモデル
2. **タスク3**: OAuth Token管理システム
3. **タスク10**: スマートタスク管理コア

## 開発環境セットアップ / Development Environment Setup

### 必要なサービス / Required Services

#### 1. アプリケーション起動
```bash
npm run dev
```

#### 2. localtunnel起動（別ターミナル）
```bash
npx localtunnel --port 3000 --subdomain clear-regions-follow
```
- **URL**: `https://clear-regions-follow.loca.lt`
- **パスワード**: `1.21.49.145`

#### 3. Slack API設定
- **管理画面**: https://api.slack.com/apps
- **アプリ名**: ultraPA
- **Request URL**: `https://clear-regions-follow.loca.lt/slack/events`

## 重要な設定ファイル / Important Configuration Files

### 環境変数 (.env)
```env
SLACK_BOT_TOKEN=xoxb-682504120805-9257602524080-7iB6lUeD8qUQ6FYFGWEnVQkb
SLACK_SIGNING_SECRET=e6b466f0226a55892aa07f0c60fa2ce3
SLACK_SOCKET_MODE=false  # 重要: HTTP Modeで動作
DATABASE_URL="file:./dev.db"
REDIS_URL="redis://localhost:6379"
```

### Slack API設定チェックリスト
- [ ] **Socket Mode**: 無効（オフ）
- [ ] **App Home > Messages Tab**: 有効（オン）
- [ ] **Slash Commands**: 全て`https://clear-regions-follow.loca.lt/slack/events`に設定
- [ ] **Event Subscriptions**: `https://clear-regions-follow.loca.lt/slack/events`に設定

## トラブルシューティング / Troubleshooting

### 1. "dispatch_failed" エラー
**原因**: Request URLが正しく設定されていない
**解決方法**:
1. localtunnelが起動しているか確認
2. Slack API管理画面でRequest URLを確認
3. アプリを再インストール

### 2. "dispatch_unknown_error" エラー
**原因**: アプリでエラーが発生している
**解決方法**:
1. アプリのログを確認
2. localtunnelの接続を確認
3. `https://clear-regions-follow.loca.lt/health`にアクセステスト

### 3. DM機能が動作しない
**原因**: App Home設定が無効
**解決方法**:
1. Slack API管理画面 > App Home
2. "Allow users to send Slash commands and messages from the messages tab"を有効化
3. アプリを再インストール

### 4. 翻訳が表示されない
**原因**: 翻訳データの構造問題
**解決方法**:
- `src/i18n/index.ts`で階層構造を確認
- デバッグログで翻訳キーの検索状況を確認

## 動作確認コマンド / Test Commands

### 基本機能テスト
```
/help          # ヘルプメッセージ表示
/lang ja       # 日本語に切り替え
/lang en       # 英語に切り替え
/todo today    # 今日のタスク表示（プレースホルダー）
```

### DM・メンションテスト
- @ultraPA にメンション
- ultraPAにDM送信

## 実装済み機能 / Implemented Features

### コマンドシステム
- **多言語対応**: 日本語・英語の自動検出と切り替え
- **ヘルプシステム**: `/help`コマンドで利用可能な機能を表示
- **言語切り替え**: `/lang ja`/`/lang en`コマンド
- **基本タスク**: `/todo today`（プレースホルダー）

### 翻訳システム
- **階層構造**: `help.title` → `help: { title: "..." }`
- **パラメータ置換**: `{{name}}`などの動的置換
- **言語検出**: 日本語文字の自動検出

### Slack統合
- **HTTP Mode**: Socket Modeから移行済み
- **メトリクス**: Prometheus統合
- **ログ**: Winston構造化ログ
- **エラーハンドリング**: 適切なフォールバック

## 次の実装予定 / Next Implementation Plan

### 優先度1: データベース基盤
- Prismaスキーマの完成
- ユーザー・タスク・OAuth管理

### 優先度2: タスク管理システム
- 3階層タスク管理
- AI優先度計算
- メンション収集（新要件）

### 優先度3: カレンダー統合
- Google Calendar API
- FreeBusy統合
- 仮予定管理

## 開発のコツ / Development Tips

### デバッグ方法
1. **アプリログ**: `npm run dev`のターミナル出力を確認
2. **Slackログ**: Slack API管理画面のEvent Logsを確認
3. **接続テスト**: `/health`エンドポイントでアプリの生存確認

### よくある問題
- **翻訳エラー**: `console.log`でデバッグ情報を追加
- **Slack接続エラー**: localtunnelの再起動を試す
- **TypeScriptエラー**: 型定義の確認とany型での一時回避

## 連絡先・参考資料 / References

### 重要なファイル
- `src/routes/index.ts`: Slackコマンドハンドラー
- `src/i18n/index.ts`: 多言語対応システム
- `.kiro/specs/slack-personal-assistant/`: 仕様書
- `docs/conversation-highlights.md`: 開発履歴

### 外部サービス
- **Slack API**: https://api.slack.com/apps
- **localtunnel**: https://localtunnel.github.io/www/
- **Prisma**: https://www.prisma.io/docs

---

**最終更新**: 2025-07-23 15:53 JST
**次回開始時**: タスク2（データベーススキーマ）から実装開始推奨