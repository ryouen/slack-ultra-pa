# OAuth Redirect URL設定問題の解決記録

日付: 2025-07-26 18:00  
作成者: Claude Code (Opus 4)  
問題: OAuth認証時の「redirect_uri did not match」エラー

## 🔍 問題の詳細

### エラーメッセージ
```
Something went wrong when authorizing ultraPA.
Error details: redirect_uri did not match any configured URIs. 
Passed URI: https://6c6f7ffe797a.ngrok-free.app/slack/oauth/callback
```

### 根本原因
1. **localhost経由でのアクセス**
   - `http://localhost:3000/slack/install`でアクセス
   - Slackは`localhost`を知らないため、Redirect URLが一致しない

2. **Slack App設定のURL不一致**
   - アプリ側: `/slack/oauth/callback`
   - Slack設定: `/oauth/redirect`

## ✅ 解決策

### 1. 正しいアクセス方法
OAuthインストールは**必ずngrok URL経由**で行う：
```
https://[ngrok-url]/slack/install
```

**重要**: `localhost`経由ではアクセスしない

### 2. Redirect URLの柔軟な対応
アプリケーションは実は**両方のパス**を処理可能：
- `/slack/oauth/callback` （推奨）
- `/oauth/redirect` （互換性のため）

`oauthIntegration.ts`の実装：
```typescript
// 両方のコールバックルートを処理
expressApp.get('/slack/oauth/callback', handler);
expressApp.get('/oauth/redirect', handler);
```

### 3. Slack App設定の確認ポイント
1. **OAuth & Permissions** → **Redirect URLs**
2. 以下のいずれかを設定：
   - `https://[ngrok-url]/slack/oauth/callback` （推奨）
   - `https://[ngrok-url]/oauth/redirect` （動作可）
3. 必ず「Save URLs」をクリック

## 📝 学んだこと

### OAuth認証フローの理解
1. ユーザーが`/slack/install`にアクセス
2. Slackの認証画面にリダイレクト
3. ユーザーが承認後、Slackが設定されたRedirect URLに戻る
4. このとき、**最初のアクセスURL**と**Redirect URL**のドメインが一致する必要がある

### ngrokを使う理由
- SlackからローカルPCにアクセスできるようにするため
- HTTPSが必須（Slack OAuthの要件）
- 一貫したURLでのアクセスが必要

## 🔧 トラブルシューティング

### チェックリスト
- [ ] ngrok URL経由でアクセスしているか
- [ ] Slack App設定のRedirect URLが正しいか
- [ ] 環境変数`SLACK_REDIRECT_URI`が設定されているか
- [ ] 「Save URLs」をクリックしたか

### デバッグ方法
```bash
# 詳細なログを有効化
set DEBUG=bolt:*
npm run dev
```

## 📚 関連ドキュメント
- [OAuth Phase 1 A-2テスト実施レポート](../work-reports/2025-07-26_oauth_phase1_test_report.md)
- [OAuth一般的なエラー](./oauth-common-errors.md)

---
*このドキュメントは未来の自分とKiroのために作成されました*