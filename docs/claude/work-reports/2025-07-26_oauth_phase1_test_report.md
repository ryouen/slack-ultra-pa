# OAuth Phase 1 A-2テスト実施レポート

日付: 2025-07-26
作成者: Claude Code

## 概要

OAuth Phase 1のA-2テスト（新ワークスペースへのOAuthインストール）を実施。複数のエラーに遭遇したが、段階的に解決し、最終的にOAuth認証フローは成功。ただし、データベース保存時にPrismaエラーが発生し、完全な成功には至っていない。

## 🎯 このドキュメントの目的

**同じエラーで二度躓かないための詳細記録**。将来のセッションでOAuth実装を行う際、このドキュメントを参照することで、既知のエラーとその解決策を即座に適用できる。

## 🚨 エラー早見表（Quick Reference）

| エラー | 原因 | 解決策 | ファイル:行 |
|--------|------|---------|-------------|
| `this.logger.getLevel is not a function` | InstallProviderに`logger: console`を渡した | logger設定を削除 | oauthIntegration.ts:48 |
| `receiver is not defined` | if文内でreceiverを宣言 | グローバルスコープで宣言 | app.ts:19 |
| `ERR_NGROK_8012` | app.start()にポート未指定 | `app.start(config.server.port)` | app.ts:107 |
| `slack_oauth_generate_url_error` | scopesの配置が間違い | installUrlOptions内に移動 | oauthIntegration.ts:63-82 |
| `Cannot GET /oauth/redirect` | コールバックパス不一致 | 両方のルートを追加 | oauthIntegration.ts:100-138 |
| `slack_oauth_unknown_error` | redirectUri未指定 | installUrlOptionsに追加 | oauthIntegration.ts:64 |
| `Prisma composite key error` | enterpriseId=nullで複合キー | 🔧 修正中 | slackInstallationStore.ts |

## 実施内容と遭遇したエラー（詳細）

### 1. InstallProviderのlogger互換性エラー

**エラー内容**:
```
TypeError: this.logger.getLevel is not a function
```

**原因**: 
InstallProviderに`logger: console`を渡していたが、InstallProviderは特定のインターフェースを期待

**解決策**:
logger設定を削除（src/server/oauthIntegration.ts:48行目）

### 2. receiver変数のスコープ問題

**エラー内容**:
```
ReferenceError: receiver is not defined
```

**原因**:
receiver変数がif文内で宣言されていたため、スコープ外でアクセスできない

**解決策**:
グローバルスコープで宣言（src/app.ts:19行目）:
```typescript
let receiver: ExpressReceiver | undefined;
```

### 3. HTTPサーバー起動問題

**エラー内容**:
```
ERR_NGROK_8012 - ngrok cannot connect to localhost:3000
```

**原因**:
app.start()にポート番号を渡していなかった

**解決策**:
```typescript
await app.start(config.server.port);
```

### 4. OAuth initialization failed

**エラー内容**:
```
slack_oauth_generate_url_error
```

**原因**:
InstallProviderのscopes設定が間違った場所にあった

**解決策**:
scopesをinstallUrlOptions内に移動（src/server/oauthIntegration.ts:63-82行目）

### 5. OAuthコールバックURL不一致

**エラー内容**:
```
Cannot GET /oauth/redirect
```

**原因**:
Slackが`/oauth/redirect`にリダイレクトしたが、アプリは`/slack/oauth/callback`を期待

**解決策**:
両方のルートを追加（src/server/oauthIntegration.ts:100-138行目）

### 6. redirectUri必須エラー

**エラー内容**:
```
slack_oauth_unknown_error
```

**原因**:
新しいバージョンのSlack OAuthではredirectUriが必須

**解決策**:
installUrlOptionsにredirectUriを追加:
```typescript
redirectUri: process.env.SLACK_REDIRECT_URI!
```

### 7. Prismaデータベースエラー（現在の問題）

**エラー内容**:
```
Prisma error: Invalid value for argument `enterpriseId` in `where` parameter for `upsert`. 
The `Unique constraint failed on the fields: (`teamId_enterpriseId`)` error is caused by 
incorrect usage of the `upsert` API.
```

**原因**:
- Prismaスキーマで`teamId_enterpriseId`の複合ユニークキーが設定されている
- enterpriseIdがnullの場合、複合キーでnullを扱えない
- インストールデータ: teamId="TL2EU3JPP", enterpriseId=null

**現状**:
- OAuth認証フローは成功（ユーザーが"Allow"をクリック）
- Botトークンも正常に受信: `xoxb-682504120805-9257602524080-HOOBYy3jqaBRVZj27QtvU6c2`
- データベース保存で失敗

## 🔍 エラーパターンと根本原因

### 1. 設定の階層構造を理解する
```javascript
// ❌ 間違い: scopesを最上位に配置
const installer = new InstallProvider({
  scopes: ['app_mentions:read', ...],  // エラー！
});

// ✅ 正解: installUrlOptions内に配置
const installer = new InstallProvider({
  installUrlOptions: {
    scopes: ['app_mentions:read', ...],  // 正しい！
  }
});
```

### 2. ポート統合の重要性
```javascript
// ❌ 間違い: 複数ポートを使用
// OAuth: 3100, Slack: 3000 → ngrokが混乱

// ✅ 正解: すべて3000に統合
const receiver = new ExpressReceiver({ ... });
// receiver.appにOAuthルートを追加
initOAuth(receiver.app);
```

### 3. スコープ問題の対処
```javascript
// ❌ 間違い: receiver変数をif内で宣言
if (isOAuthEnabled) {
  const receiver = new ExpressReceiver({ ... });  // スコープ外でアクセス不可
}

// ✅ 正解: グローバルスコープで宣言
let receiver: ExpressReceiver | undefined;
if (isOAuthEnabled) {
  receiver = new ExpressReceiver({ ... });
}
```

## 重要な学び

### Bolt v3の制約

アドバイスAIから指摘された重要な制約:
- ExpressReceiverに`clientId`/`clientSecret`/`installationStore`を渡す **または** `authorize`関数を渡す（両方は不可）
- 解決策: ExpressReceiverには基本設定のみ、OAuth設定はInstallProviderで分離

### ポート統合の重要性

当初の問題:
- OAuthサーバー: ポート3100
- ngrok転送先: ポート3000
- 結果: ngrokがOAuthルートにアクセスできない

解決:
- OAuthルートをExpressReceiver（ポート3000）に統合
- receiver.appにOAuthルートを追加

### Slack OAuth APIの変更

- 新しいバージョンではredirectUriが必須パラメータに
- installUrlOptionsとinstallerOptionsの区別が重要
- scopesはinstallUrlOptions内に配置

### エラーハンドリングの重要性

各段階で詳細なログを追加したことで、問題の特定が容易に:
```typescript
logger.info('OAuth callback received', { 
  query: req.query,
  headers: req.headers.host
});
```

## 🔧 実装時のチェックリスト

### OAuth実装前の確認事項
- [ ] Bolt v3の制約を理解: authorize関数とOAuth設定は排他的
- [ ] ポート統一: すべて3000番ポートで動作させる
- [ ] 環境変数の準備:
  - [ ] SLACK_CLIENT_ID
  - [ ] SLACK_CLIENT_SECRET 
  - [ ] SLACK_STATE_SECRET（64文字の英数字）
  - [ ] SLACK_REDIRECT_URI（ngrok URL + /slack/oauth/callback）
  - [ ] SLACK_OAUTH_ENABLED=true

### 実装時の注意点
1. **InstallProvider設定**
   - logger設定は入れない（互換性問題）
   - scopesはinstallUrlOptions内に配置
   - redirectUriは必須パラメータ

2. **ExpressReceiver設定**
   - 基本設定のみ（signingSecret, endpoints）
   - OAuth設定は入れない

3. **app.start()呼び出し**
   - 必ずポート番号を指定: `app.start(config.server.port)`

4. **ルーティング**
   - `/slack/oauth/callback`と`/oauth/redirect`の両方を実装
   - bodyParserは/apiのみに適用

## 次のステップ

1. **Prismaスキーマの確認と修正**
   - 複合ユニークキーの扱いを見直し
   - enterpriseIdがnullの場合の処理を追加

2. **SlackInstallationStore.tsの修正**
   - nullのenterpriseIdを適切に処理
   - 例: 空文字列''に変換、またはteamIdのみでユニーク性を保証

3. **A-2テストの完了**
   - データベース保存の成功確認
   - `/help`コマンドの動作確認

4. **A-3, A-4テストの実施**
   - Canary共存動作テスト
   - トークン無効化テスト

## 📚 トラブルシューティングガイド

### よくあるエラーと対処法

#### 1. OAuth初期化に失敗する場合
```bash
slack_oauth_generate_url_error
```
**確認事項**:
- InstallProviderにinstallUrlOptionsが設定されているか
- scopesがinstallUrlOptions内にあるか
- 環境変数が正しく読み込まれているか

#### 2. ngrokが接続できない場合
```bash
ERR_NGROK_8012
```
**確認事項**:
- app.start()にポート番号が指定されているか
- 別のプロセスがポートを使用していないか
- `netstat -ano | findstr :3000`で確認

#### 3. コールバックURLエラー
```bash
Cannot GET /oauth/redirect
```
**確認事項**:
- Slack App設定のRedirect URLが正しいか
- 実装で両方のパス（/slack/oauth/callback, /oauth/redirect）を処理しているか

#### 4. デバッグ方法
```bash
# Boltのauthorize経路を追跡
set DEBUG=bolt:*

# Expressのルーティングも確認
set DEBUG=bolt:*,express:*

# Prismaのクエリを確認
npx prisma studio
```

## 参考情報

- ngrok URL: https://6c6f7ffe797a.ngrok-free.app
- Team ID: TL2EU3JPP
- Bot Token: xoxb-682504120805-9257602524080-HOOBYy3jqaBRVZj27QtvU6c2
- インストール時刻: 2025-07-26T16:59:06.552Z