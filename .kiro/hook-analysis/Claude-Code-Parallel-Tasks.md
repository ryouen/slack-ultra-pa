# Claude Code 並行作業依頼書

## 🎯 背景
Kiro が ChatGPT o3-pro に Phase 1 統合戦略を相談している間に、以下の準備作業を並行実行してください。

## 📋 Task 1: OAuth パス統一 (優先度: High)

### 目的
Google/Notion OAuth連携ボタンが正常動作する状態にする

### 現在の問題
```typescript
// デフォルト値の不整合
GOOGLE_REDIRECT_URI: /auth/google/callback  // デフォルト
実際のルート: /oauth/google/callback        // routes/oauth.ts

NOTION_REDIRECT_URI: /auth/notion/callback   // デフォルト  
実際のルート: /oauth/notion/callback         // routes/oauth.ts
```

### 修正箇所
1. **src/services/googleOAuthService.ts**
   ```typescript
   // Line 47付近
   redirectUri: process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/auth/google/callback'
   // ↓ 修正
   redirectUri: process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/oauth/google/callback'
   ```

2. **src/services/notionOAuthService.ts**
   ```typescript
   // 同様の修正
   /auth/notion/callback → /oauth/notion/callback
   ```

3. **.env.example**
   ```bash
   GOOGLE_REDIRECT_URI=http://localhost:3000/oauth/google/callback
   NOTION_REDIRECT_URI=http://localhost:3000/oauth/notion/callback
   ```

### 動作確認
- OAuth連携ボタンが 200 OK を返すことを確認
- リダイレクトが正常に動作することを確認

## 📋 Task 2: TypeScript エラー修正 (優先度: Medium)

### 目的
ビルドエラー 141個 → 50個以下に削減

### 優先修正箇所

#### 1. src/services/oauthTokenService.ts
```typescript
// 主な問題
- 'iv' is declared but never read (Line 68)
- Buffer.from の型安全性
- Prisma の exactOptionalPropertyTypes 対応
```

#### 2. src/services/googleOAuthService.ts  
```typescript
// 主な問題
- OAuth2Client 型不一致
- google.calendar() の型エラー
- null/undefined 安全性
```

#### 3. 未使用import/変数の削除
```typescript
// 各ファイルで未使用の import や変数を削除
// 特に config, logger 等の未使用import
```

### 修正方針
- 型安全性を優先
- 既存機能を壊さない範囲で修正
- 段階的に修正（一度に全て修正しない）

## 📋 Task 3: テスト安定化 (優先度: Medium)

### 目的
テスト成功率 0% → 60%以上

### 修正箇所

#### 1. src/test/setup.ts
```typescript
// 現在の問題
process.env.NODE_ENV = 'test';  // 型エラー
// ↓ 修正
process.env['NODE_ENV'] = 'test';
```

#### 2. OAuth関連テスト
```typescript
// src/tests/googleOAuthService.test.ts
// src/tests/oauthTokenService.test.ts
// 型エラーとモック設定の修正
```

#### 3. 基本テストの動作確認
```bash
npm test -- --testPathPattern="oauth"
# 基本的なテストが通ることを確認
```

## 🚨 重要な制約

### やってはいけないこと
1. **Redis設定の変更** - Kiro が修正済み
2. **Slack OAuth統合** - Phase 1 で Kiro が実装予定
3. **ExpressReceiver統合** - ChatGPT o3-pro 回答待ち
4. **大幅なアーキテクチャ変更** - Phase 1 統合戦略決定後

### 安全な修正範囲
1. **型エラー修正** - 既存機能に影響しない範囲
2. **パス統一** - 設定値の修正のみ
3. **テスト修正** - テスト環境の安定化のみ
4. **未使用コード削除** - 明らかに未使用のもののみ

## 📊 成功指標

### Task 1: OAuth パス統一
- [ ] Google OAuth連携ボタンが 200 OK
- [ ] Notion OAuth連携ボタンが 200 OK
- [ ] .env.example が正しいパスに更新

### Task 2: TypeScript エラー修正
- [ ] ビルドエラー 141個 → 50個以下
- [ ] 主要サービスファイルの型安全性向上
- [ ] 未使用import/変数の削除

### Task 3: テスト安定化
- [ ] テスト成功率 60%以上
- [ ] OAuth関連テストが通る
- [ ] 基本的なテストスイートが安定

## 🔄 進捗報告

作業完了時に以下の形式で報告してください：

```
## Claude Code 作業完了報告

### Task 1: OAuth パス統一
- ✅ Google OAuth パス修正完了
- ✅ Notion OAuth パス修正完了  
- ✅ .env.example 更新完了
- ✅ 動作確認: 連携ボタン 200 OK

### Task 2: TypeScript エラー修正
- ✅ oauthTokenService.ts 修正完了
- ✅ googleOAuthService.ts 修正完了
- ✅ 未使用import削除完了
- 📊 ビルドエラー: 141個 → XX個

### Task 3: テスト安定化
- ✅ test/setup.ts 修正完了
- ✅ OAuth関連テスト修正完了
- 📊 テスト成功率: 0% → XX%

### 次のステップ
Phase 1 統合作業の準備完了
```

## 🎯 期待する効果

この並行作業により：
1. **OAuth連携の即座復旧** - ユーザー影響の最小化
2. **コード品質の向上** - Phase 1 統合作業の安定化
3. **テスト環境の安定化** - 統合後の品質保証

Kiro の Phase 1 統合作業と並行して実行することで、48時間以内の「動く全体像」確立に貢献します。

よろしくお願いします！