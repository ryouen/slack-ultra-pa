# OAuth Manual Testing Guide

## 🎯 目的
Task 3 OAuth Token Management System の手動テスト手順

## 📋 前提条件

### 1. Google OAuth設定
```bash
# .env ファイルに以下を設定
GOOGLE_CLIENT_ID=your-actual-google-client-id
GOOGLE_CLIENT_SECRET=your-actual-google-client-secret
GOOGLE_REDIRECT_URI=http://localhost:3000/oauth/google/callback
OAUTH_ENCRYPTION_KEY=your-secure-32-character-key
```

### 2. Google Cloud Console設定
- Google Cloud Console でプロジェクト作成
- Google Calendar API を有効化
- OAuth 2.0 認証情報を作成
- リダイレクトURI に `http://localhost:3000/oauth/google/callback` を追加

### 3. データベース準備
```bash
# マイグレーション実行
npx prisma migrate dev

# データベース確認
npx prisma studio
```

## 🧪 テスト手順

### Phase 1: 基本機能テスト

#### 1.1 サーバー起動
```bash
npm run dev
```

#### 1.2 OAuth認証開始
```bash
# ブラウザで以下にアクセス
http://localhost:3000/oauth/google/GOOGLE_CALENDAR?userId=test-user-123
```

**期待結果:**
- Google OAuth同意画面にリダイレクト
- スコープに Calendar 権限が含まれている

#### 1.3 OAuth認証完了
- Google で認証・同意を実行
- コールバックページで成功メッセージを確認

**期待結果:**
```html
OAuth Success!
Successfully connected GOOGLE_CALENDAR for user test-user-123
```

#### 1.4 データベース確認
```bash
# Prisma Studio でoauth_tokensテーブルを確認
npx prisma studio
```

**期待結果:**
- `oauth_tokens` テーブルに新しいレコード
- `provider` = 'GOOGLE_CALENDAR'
- `userId` = 'test-user-123'
- `accessToken` が暗号化されている
- `isValid` = true

### Phase 2: API テスト

#### 2.1 プロバイダー一覧取得
```bash
curl http://localhost:3000/oauth/providers/test-user-123
```

**期待結果:**
```json
{
  "success": true,
  "providers": [
    {
      "provider": "GOOGLE_CALENDAR",
      "connectedAt": "2025-01-25T...",
      "scope": "https://www.googleapis.com/auth/calendar.readonly ...",
      "isValid": true
    }
  ]
}
```

#### 2.2 接続テスト
```bash
curl -X POST http://localhost:3000/oauth/test/GOOGLE_CALENDAR \
  -H "Content-Type: application/json" \
  -d '{"userId": "test-user-123"}'
```

**期待結果:**
```json
{
  "success": true,
  "provider": "GOOGLE_CALENDAR",
  "testResult": true,
  "message": "Connection test successful"
}
```

#### 2.3 トークン取り消し
```bash
curl -X DELETE http://localhost:3000/oauth/GOOGLE_CALENDAR \
  -H "Content-Type: application/json" \
  -d '{"userId": "test-user-123"}'
```

**期待結果:**
```json
{
  "success": true,
  "message": "GOOGLE_CALENDAR token revoked successfully"
}
```

### Phase 3: エラーハンドリングテスト

#### 3.1 無効なプロバイダー
```bash
curl http://localhost:3000/oauth/google/INVALID_PROVIDER?userId=test-user-123
```

**期待結果:**
```json
{
  "error": "Invalid provider"
}
```

#### 3.2 存在しないユーザー
```bash
curl http://localhost:3000/oauth/providers/nonexistent-user
```

**期待結果:**
```json
{
  "success": true,
  "providers": []
}
```

#### 3.3 OAuth エラー
```bash
# ブラウザで以下にアクセス（認証を拒否）
http://localhost:3000/oauth/google/callback?error=access_denied
```

**期待結果:**
- エラーページが表示される
- "OAuth Error" メッセージ

## 🔍 トラブルシューティング

### よくある問題

#### 1. Google OAuth設定エラー
```
Error: Failed to generate authorization URL
```
**解決策:**
- `.env` の `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` を確認
- Google Cloud Console の設定を確認

#### 2. リダイレクトURI エラー
```
Error: redirect_uri_mismatch
```
**解決策:**
- Google Cloud Console でリダイレクトURI を正確に設定
- `http://localhost:3000/oauth/google/callback`

#### 3. データベース接続エラー
```
Error: Can't reach database server
```
**解決策:**
- PostgreSQL が起動しているか確認
- `DATABASE_URL` が正しいか確認

#### 4. 暗号化エラー
```
Error: Failed to encrypt token
```
**解決策:**
- `OAUTH_ENCRYPTION_KEY` が32文字以上か確認
- 特殊文字を避ける

## ✅ テスト完了チェックリスト

### 基本機能
- [ ] OAuth認証フロー完了
- [ ] トークンがデータベースに保存される
- [ ] トークンが暗号化されている
- [ ] プロバイダー一覧取得
- [ ] 接続テスト成功
- [ ] トークン取り消し

### エラーハンドリング
- [ ] 無効なプロバイダーでエラー
- [ ] 認証拒否でエラーページ
- [ ] 存在しないユーザーで空配列
- [ ] 必須パラメータ不足でエラー

### セキュリティ
- [ ] トークンが暗号化されている
- [ ] リフレッシュトークンが安全に保存
- [ ] 不正なアクセスでエラー

## 📊 パフォーマンステスト

### レスポンス時間
- OAuth認証開始: < 1秒
- コールバック処理: < 3秒
- API呼び出し: < 2秒

### 同時接続
- 複数ユーザーの同時OAuth認証
- トークンの競合状態テスト

## 🎯 次のステップ

テスト完了後:
1. **Task 4: Job Queue Infrastructure** の実装
2. **Task 11: Smart Calendar Integration** でOAuth活用
3. **本番環境設定** (Google Cloud Console本番設定)

---

**テスト実行者:** ___________  
**テスト日時:** ___________  
**結果:** ___________