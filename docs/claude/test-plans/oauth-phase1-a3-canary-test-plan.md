# OAuth Phase 1 A-3 Canaryテスト実行計画

日付: 2025-07-26 18:10  
作成者: Claude Code (Opus 4)  
目的: OAuth認証と環境変数認証の共存動作確認

## 🎯 テストの目的

同一アプリインスタンスで複数の認証方式（OAuth + 環境変数）を同時にサポートし、段階的移行を可能にする。

## ⚠️ 現在の課題

### 環境変数トークンの不足
A-3テストには以下の環境変数が必要ですが、現在設定されていません：
- `SLACK_BOT_TOKEN=xoxb-xxxxx` （旧ワークスペース用）
- `SLACK_BOT_ID=Bxxxxxxx` （旧ワークスペース用）
- `SLACK_BOT_USER_ID=Uxxxxxxx` （旧ワークスペース用）

**重要**: .envにコメントアウトされているトークンは新ワークスペース（TL2EU3JPP）のものであり、
これはすでにOAuth経由でDBに保存されています。A-3テストには別の旧ワークスペースの認証情報が必要です。

## 📝 必要な準備

### 1. 旧ワークスペースのBot情報取得

旧ワークスペースの管理画面から：
1. https://api.slack.com/apps → 該当アプリ選択
2. **OAuth & Permissions** → **Bot User OAuth Token**をコピー
3. **Basic Information** → **App Credentials**からBot IDを確認

### 2. .env設定例

```env
# OAuth設定（新ワークスペース用）
SLACK_OAUTH_ENABLED=true
SLACK_CLIENT_ID=682504120805.9220407599367
SLACK_CLIENT_SECRET=68a394fcefd394e4ea00777b10c4a03d
SLACK_STATE_SECRET=a8f7d9c2e1b4f6a3d8e9c7b2f5a1d9e8c3b7f2a6d1e8c9b4f7a2d5e9c8b3f6a1
SLACK_REDIRECT_URI=https://6c6f7ffe797a.ngrok-free.app/slack/oauth/callback

# Socket Mode設定（両方で使用）
SLACK_APP_TOKEN=xapp-1-A096GBZHMAT-9233218287109-xxxx
SLACK_SIGNING_SECRET=e6b466f0226a55892aa07f0c60fa2ce3

# 旧ワークスペース用（環境変数トークン）- 現在不足
SLACK_BOT_TOKEN=xoxb-旧ワークスペースのトークン # ⚠️ 要設定
SLACK_BOT_ID=B旧ワークスペースのBOT_ID       # ⚠️ 要設定
SLACK_BOT_USER_ID=U旧ワークスペースのBOT_USER_ID # ⚠️ 要設定

# 注意: 新ワークスペース（TL2EU3JPP）の認証情報は
# すでにDBに保存されているため、環境変数には設定しません
```

## 🧪 テスト手順

### Step 1: 前提確認

```bash
# ライブラリバージョン確認
npm ls @slack/bolt @slack/oauth

# Redis接続数確認（オプション）
redis-cli -u $REDIS_URL INFO clients | grep connected_clients

# ポート使用状況確認
netstat -ano | findstr :3000
```

### Step 2: サーバー起動（デバッグモード）

```bash
# 既存プロセスの終了
powershell -Command "Get-Process -Name node -ErrorAction SilentlyContinue | Stop-Process -Force"

# デバッグログ有効化
set DEBUG=bolt:authorize,oauth:*,express:router

# サーバー起動
npm run dev
```

### Step 3: 旧ワークスペース確認

1. 旧ワークスペースでSlackを開く
2. `/help`コマンドを実行
3. ログで以下を確認：
   ```
   [authorize] team T旧WS_ID via ENV (fallback)
   ```

### Step 4: 新ワークスペース確認

1. A-2でインストールしたワークスペース（TL2EU3JPP）を開く
2. `/help`コマンドを実行
3. ログで以下を確認：
   ```
   [authorize] team TL2EU3JPP via DB (OAuth)
   ```

### Step 5: 並行動作確認

1. 両方のワークスペースで同時に`/todo`コマンドを実行
2. 両方で正常に応答が返ることを確認
3. ログで認証経路が正しく表示されることを確認

## 📊 期待される結果

### 成功基準

| チェック項目 | 期待結果 |
|------------|---------|
| 旧WS `/help` | 200 OK + `via ENV (fallback)` ログ |
| 新WS `/help` | 200 OK + `via DB (OAuth)` ログ |
| DB確認 | SlackInstallationテーブルに新WSのレコードのみ |
| 相互干渉 | なし（各WSが独立して動作） |

### トラブルシューティング

| 症状 | 原因 | 対処 |
|------|------|------|
| 旧WSで`NO AUTH AVAILABLE` | 環境変数未設定 | .envに`SLACK_BOT_TOKEN`等を追加 |
| 新WSで`via ENV` | DBにレコードなし | OAuth再インストール |
| 両方で認証失敗 | authorize関数の問題 | ログを詳細確認 |

## 🔄 ロールバック手順

問題が発生した場合：
1. `.env`で`SLACK_OAUTH_ENABLED=false`に設定
2. サーバー再起動
3. 環境変数トークンのみで動作確認

## 📚 関連ドキュメント

- [OAuth Phase 1テスト計画](../work-reports/2025-07-26_oauth_phase1_test_report.md)
- [OAuth Redirect URL問題](../troubleshooting/oauth-redirect-url-issue.md)
- [authorize関数実装](../../../src/services/slackAuthorize.ts)

## 🚀 次のステップ

A-3テスト成功後：
1. A-4テスト（トークン無効化）実施
2. Quick-Reply再有効化（botUserId動的取得）
3. Worker改修（getSlackClient util作成）

---
*注: このテスト計画は環境変数トークンが利用可能な場合のものです。*
*実際のテストには旧ワークスペースのBot認証情報が必要です。*