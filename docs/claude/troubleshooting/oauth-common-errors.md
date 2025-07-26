# OAuth実装 - よくあるエラーと解決策

このドキュメントは、Slack OAuth実装で遭遇する可能性のあるエラーと、その解決策をまとめたトラブルシューティングガイドです。

## 🚨 エラー早見表

| エラーメッセージ | 発生タイミング | 対処法 |
|-----------------|--------------|--------|
| `this.logger.getLevel is not a function` | サーバー起動時 | InstallProviderからlogger設定を削除 |
| `receiver is not defined` | サーバー起動時 | receiver変数をグローバルスコープで宣言 |
| `ERR_NGROK_8012` | ngrok接続時 | app.start()にポート番号を指定 |
| `slack_oauth_generate_url_error` | OAuth URL生成時 | scopesをinstallUrlOptions内に移動 |
| `Cannot GET /oauth/redirect` | コールバック時 | 複数のコールバックルートを実装 |
| `slack_oauth_unknown_error` | OAuth処理時 | redirectUriを追加 |
| `invalid_state` | OAuth認証時 | SLACK_STATE_SECRETを確認 |
| `missing_scope` | インストール時 | 必要なスコープを追加 |

## 📋 問題解決フローチャート

```
OAuth実装でエラー発生
│
├─ サーバーが起動しない
│  ├─ logger関連エラー → InstallProviderのlogger設定を削除
│  ├─ receiver未定義 → グローバルスコープで宣言
│  └─ ポート競合 → netstatで確認、プロセスを終了
│
├─ OAuthページが表示されない
│  ├─ ngrok接続エラー → app.start(port)を確認
│  ├─ URL生成エラー → installUrlOptionsの構造を確認
│  └─ 環境変数未設定 → .envファイルを確認
│
└─ 認証後にエラー
   ├─ コールバックURL不一致 → 両方のパスを実装
   ├─ state不一致 → URL安全な文字列を使用
   └─ DB保存エラー → Prismaスキーマを確認
```

## 🔧 エラー別詳細ガイド

### 1. TypeError: this.logger.getLevel is not a function

**発生箇所**: `new InstallProvider()`の初期化時

**原因**: 
InstallProviderに`logger: console`を渡したが、期待されるloggerインターフェースと異なる

**解決策**:
```javascript
// ❌ 間違い
const installer = new InstallProvider({
  logger: console,  // これがエラーの原因
  // ...
});

// ✅ 正解
const installer = new InstallProvider({
  // logger設定を削除
  clientId,
  clientSecret,
  // ...
});
```

### 2. ReferenceError: receiver is not defined

**発生箇所**: app.ts内でreceiverを参照する箇所

**原因**:
receiver変数がif文内で宣言されているため、スコープ外でアクセスできない

**解決策**:
```javascript
// ❌ 間違い
if (isOAuthEnabled) {
  const receiver = new ExpressReceiver({ ... });
}
// receiverはここでアクセスできない

// ✅ 正解
let receiver: ExpressReceiver | undefined;
if (isOAuthEnabled) {
  receiver = new ExpressReceiver({ ... });
}
// receiverはここでアクセス可能
```

### 3. ERR_NGROK_8012 - ngrok cannot connect

**発生箇所**: ngrokがローカルサーバーに接続しようとした時

**原因**:
ExpressReceiverを使用時、app.start()にポート番号を明示的に渡す必要がある

**解決策**:
```javascript
// ❌ 間違い
await app.start();  // ポート番号が指定されていない

// ✅ 正解
await app.start(config.server.port);  // 例: 3000
```

### 4. slack_oauth_generate_url_error

**発生箇所**: `/slack/oauth/start`へのアクセス時

**原因**:
InstallProviderにInstallURLOptionsが正しく設定されていない

**解決策**:
```javascript
// ❌ 間違い
const installer = new InstallProvider({
  clientId,
  clientSecret,
  scopes: ['app_mentions:read'],  // 最上位に配置してはいけない
});

// ✅ 正解
const installer = new InstallProvider({
  clientId,
  clientSecret,
  installUrlOptions: {
    scopes: ['app_mentions:read'],  // installUrlOptions内に配置
    redirectUri: process.env.SLACK_REDIRECT_URI,
  }
});
```

### 5. Prismaデータベースエラー

**発生箇所**: OAuth認証成功後のデータ保存時

**エラー内容**:
```
Invalid value for argument `enterpriseId` in `where` parameter
Unique constraint failed on the fields: (`teamId_enterpriseId`)
```

**原因**:
複合ユニークキー`teamId_enterpriseId`でenterpriseIdがnullの場合、Prismaが正しく処理できない

**解決策候補**:
1. enterpriseIdがnullの場合、空文字列''に変換
2. teamIdのみでユニーク性を保証するようスキーマを変更
3. enterpriseIdとteamIdで別々のインデックスを作成

## 🎯 実装前チェックリスト

### 環境設定
- [ ] `SLACK_OAUTH_ENABLED=true`
- [ ] `SLACK_CLIENT_ID`が設定されている
- [ ] `SLACK_CLIENT_SECRET`が設定されている
- [ ] `SLACK_STATE_SECRET`が64文字の英数字
- [ ] `SLACK_REDIRECT_URI`がngrok URLと一致
- [ ] `SLACK_BOT_TOKEN`をコメントアウト（OAuth専用テスト時）

### Slack App設定
- [ ] OAuth Redirect URLが正しく設定されている
- [ ] Event Subscriptionsが有効
- [ ] Interactivityが有効
- [ ] 必要なBot Token Scopesがすべて追加されている

### コード実装
- [ ] ExpressReceiverを使用（Socket Mode無効）
- [ ] receiver変数がグローバルスコープ
- [ ] app.start()にポート番号を指定
- [ ] InstallProviderにloggerを渡していない
- [ ] scopesがinstallUrlOptions内にある
- [ ] redirectUriが設定されている
- [ ] 複数のコールバックパスを処理

## 🐛 デバッグ方法

### 1. 詳細ログを有効化
```bash
# Windows
set DEBUG=bolt:*,express:*
npm run dev

# Mac/Linux
DEBUG=bolt:*,express:* npm run dev
```

### 2. ポート使用状況を確認
```bash
# Windows
netstat -ano | findstr :3000

# Mac/Linux
lsof -i :3000
```

### 3. Prismaデータベースを確認
```bash
npx prisma studio
```

### 4. 環境変数の確認
```javascript
// デバッグ用コード追加
console.log('OAuth Config:', {
  hasClientId: !!process.env.SLACK_CLIENT_ID,
  hasClientSecret: !!process.env.SLACK_CLIENT_SECRET,
  hasStateSecret: !!process.env.SLACK_STATE_SECRET,
  redirectUri: process.env.SLACK_REDIRECT_URI,
});
```

## 📝 関連ドキュメント

- [OAuth Phase 1テスト実施レポート](../work-reports/2025-07-26_oauth_phase1_test_report.md)
- [CLAUDE.md](../../../CLAUDE.md) - プロジェクト全体の状況

---
*最終更新: 2025-07-26*