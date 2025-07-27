# P2-2 Quick-Reply Feature Re-enablement 実装チェックリスト

日付: 2025-07-27 18:00  
作成者: Claude Code (Opus 4)  
フェーズ: P2-2実装前確認  

## 📋 実装前チェックリスト

### ✅ P2-1完了確認
- [x] LRUキャッシュ実装（TTL: 600s, max: 500）
- [x] updateAgeOnGet: true
- [x] Prometheusメトリクス実装
- [x] パフォーマンステスト作成
- [x] invalid_auth自動処理

### 🔍 現状分析

#### Quick-Reply無効化の現状
```typescript
// src/routes/index.ts
if (!isOAuthEnabled && BOT_USER_ID) {
  setupQuickReplyHandler(app, BOT_USER_ID);
  logger.info('Quick Reply handler configured');
} else {
  logger.info('OAuth mode enabled, skipping Quick Reply handler setup');
}
```

**問題点**:
1. OAuthモードで完全に無効化されている
2. BOT_USER_IDが静的（環境変数から取得）
3. 動的なbotUserId解決が未実装

### 📝 P2-2実装計画

#### 1. Boltミドルウェアの実装
```typescript
// src/middleware/injectBotUserId.ts
export async function injectBotUserId({ body, context, next }) {
  const teamId = body.team_id || body.team?.id;
  if (teamId) {
    try {
      const client = await getSlackClient(teamId);
      const authTest = await client.auth.test();
      context.botUserId = authTest.user_id;
    } catch (error) {
      logger.error('Failed to get bot user ID', { teamId, error });
    }
  }
  await next();
}
```

#### 2. Quick-Reply Handlerの改修
- setupQuickReplyHandlerの引数を変更
- context.botUserIdを使用するように修正
- OAuth/環境変数両方で動作するように

#### 3. メトリクス追加
- `quick_reply_latency_ms`: ハンドラー処理時間
- `quick_reply_processed_total`: 処理数
- `quick_reply_errors_total`: エラー数

#### 4. レート制限の確認
- BullMQ limiter: 59 req/分設定済み ✅
- Slack API制限: 1 msg/s per channel

### 🎯 Exit Criteria

| 項目 | 目標値 | 測定方法 |
|------|--------|----------|
| レイテンシ | P95 < 200ms | Prometheusメトリクス |
| キャッシュヒット率 | ≥ 90% | `/api/cache/stats` |
| 429エラー | 0件/24h | エラーログ監視 |
| botUserId解決成功率 | > 99% | カスタムメトリクス |

### 🚧 実装手順

1. **ミドルウェア作成**
   - [ ] injectBotUserIdミドルウェア実装
   - [ ] app.useで全イベントに適用

2. **Handler改修**
   - [ ] setupQuickReplyHandler引数変更
   - [ ] context.botUserId使用
   - [ ] OAuthモード判定削除

3. **メトリクス実装**
   - [ ] quick_reply_* メトリクス追加
   - [ ] Histogramでレイテンシ測定

4. **テスト実装**
   - [ ] ユニットテスト
   - [ ] 統合テスト
   - [ ] 負荷テスト（50 msg/s）

5. **ドキュメント更新**
   - [ ] CHANGELOG.md
   - [ ] README.md（Quick-Reply有効化）

### ⚠️ リスク事項

1. **キャッシュ不整合**
   - botUserIdが変更された場合の対応
   - 解決策: auth.testエラー時にキャッシュクリア

2. **レート制限**
   - 大量メンション時の429エラー
   - 解決策: キューイング、バックオフ

3. **パフォーマンス**
   - ミドルウェアのオーバーヘッド
   - 解決策: キャッシュヒット率向上

### 📊 監視ポイント

- auth_cache_hit_rate（目標: ≥90%）
- quick_reply_latency_ms（目標: P95<200ms）
- redis_connected_clients（目標: ≤30）
- エラーログ（invalid_auth, 429）

### 🔄 ロールバック計画

1. Feature flag追加: `QUICK_REPLY_ENABLED`
2. 段階的ロールアウト（10% → 50% → 100%）
3. 問題発生時は即座にフラグでOFF

---
*次のステップ: ミドルウェア実装から開始*