# OAuth Phase 2 実装計画

日付: 2025-07-27 15:00  
作成者: Claude Code (Opus 4)  
目的: アドバイスAIのフィードバックを反映した詳細実装計画

## 📊 エグゼクティブサマリー

Phase 2では「全機能の動的トークン対応」を実現します。アドバイスAIの指摘を踏まえ、リスクを最小化しながら段階的に実装します。

### 主要変更点
1. **実装順序の最適化**: getSlackClient util → Quick-Reply → Worker（段階的）
2. **LRUキャッシュ戦略**: Bolt公式推奨パターンを採用
3. **段階的ロールアウト**: 各ステップで計測・検証を実施

## 🔧 技術アーキテクチャ

### 1. キャッシュ階層設計

```
┌─────────────────┐
│  LRU Cache      │ ← TTL: 10分、Max: 500
│ (AuthorizeResult)│
└────────┬────────┘
         │
┌────────┴────────┐
│  WeakMap Cache  │ ← WebClientインスタンス
│   (WebClient)   │
└─────────────────┘
```

### 2. 認証フロー

```typescript
// 統一認証関数
export const cachedAuthorize: Authorize = async (source) => {
  const cached = authCache.get(source.teamId);
  if (cached && !isExpired(cached)) {
    metrics.increment('auth.cache.hit');
    return cached;
  }
  
  metrics.increment('auth.cache.miss');
  const fresh = await authorize(source);
  authCache.set(source.teamId, fresh);
  return fresh;
};
```

## 📈 実装フェーズ

### Phase 2.1: 基盤整備（2-3日）

#### 作業内容
1. **getSlackClient util実装**
   ```typescript
   export async function getSlackClient(teamId: string): Promise<WebClient> {
     const auth = await cachedAuthorize({ teamId });
     const client = clientCache.get(auth) || createNewClient(auth);
     return client;
   }
   ```

2. **メトリクス基盤**
   - キャッシュヒット率
   - API呼び出しレイテンシ
   - エラー率

#### 成功基準
- キャッシュヒット率 > 80%
- API呼び出しレイテンシ p95 < 200ms

### Phase 2.2: Quick-Reply再有効化（3-4日）

#### 作業内容
1. **グローバルミドルウェア実装**
   ```typescript
   app.use(async ({ context, next }) => {
     const auth = await cachedAuthorize({ teamId: context.teamId });
     context.botUserId = auth.botUserId;
     await next();
   });
   ```

2. **quickReplyHandler改修**
   - OAuth対応ガード削除
   - botUserId動的取得

#### 検証項目
- [ ] メンション検出の正確性
- [ ] 自己応答ループが発生しないこと
- [ ] レスポンスタイム劣化なし

### Phase 2.3: Worker段階的移行（5-7日）

#### Step A: Reminder Workerのみ移行
```typescript
const reminderWorker = new Worker(
  'reminder',
  async (job) => {
    const client = await getSlackClient(job.data.teamId);
    // 処理実装
  },
  { 
    connection: redis,
    reuseRedis: true  // 接続再利用
  }
);
```

#### Step B: 計測期間（3日）
- Queue失敗率
- Rate limit発生数
- Redis接続数

#### Step C: 全Worker移行
- 問題がなければ全Workerに展開
- 問題があれば個別対応

### Phase 2.4: エラー修正と最適化（1-2日）

1. **Cleanupジョブ修正**
   ```typescript
   // Before: Date型
   { olderThan: new Date() }
   
   // After: epochミリ秒
   { olderThan: Date.now() }
   ```

2. **CI/CD強化**
   - Prisma migrate diff自動チェック
   - ESLintルール追加

## 🚨 リスク管理

### 技術的リスクと対策

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| キャッシュ不整合 | 高 | 中 | auth.test失敗時に即座にinvalidate |
| メモリリーク | 高 | 低 | WeakMap使用、定期的なGC監視 |
| Rate Limit | 中 | 中 | リトライ＋バックオフ戦略 |
| Worker遅延 | 中 | 低 | 並行度調整、優先度キュー |

### ロールバック計画

各フェーズで以下のロールバック戦略を準備：

1. **Feature Flag使用**
   ```typescript
   if (featureFlags.useNewAuth) {
     return getSlackClient(teamId);
   } else {
     return legacyGetClient();
   }
   ```

2. **段階的有効化**
   - 10% → 50% → 100%
   - 問題発生時は即座に0%へ

## 📊 監視ダッシュボード

### Key Metrics

```yaml
# Prometheusメトリクス定義
slack_auth_cache_hit_rate:
  type: gauge
  help: "Authorization cache hit rate"
  
slack_api_latency_seconds:
  type: histogram
  help: "Slack API call latency"
  buckets: [0.1, 0.5, 1, 2, 5]
  
slack_worker_job_duration_seconds:
  type: histogram
  help: "Worker job processing duration"
```

### アラート設定

```yaml
alerts:
  - name: HighCacheMissRate
    expr: slack_auth_cache_hit_rate < 0.7
    for: 5m
    severity: warning
    
  - name: SlackAPILatencyHigh
    expr: histogram_quantile(0.95, slack_api_latency_seconds) > 1
    for: 10m
    severity: critical
```

## 🎯 成功指標

### パフォーマンス
- メッセージ処理レイテンシ p95 < 200ms
- キャッシュヒット率 > 90%
- Worker処理時間 p95 < 5秒

### 可用性
- エラー率 < 0.1%
- 認証成功率 > 99.9%
- Rate limit発生 < 10回/時

### スケーラビリティ
- 同時接続チーム数 > 100
- メモリ使用量 < 1GB
- CPU使用率 < 50%

## 📅 タイムライン

| 週 | フェーズ | 成果物 |
|----|---------|--------|
| Week 1 | 基盤整備 | getSlackClient util、メトリクス |
| Week 1-2 | Quick-Reply | botUserId動的化、ハンドラー復活 |
| Week 2-3 | Worker改修 | 段階的移行、検証 |
| Week 3 | 最適化 | Cleanupジョブ修正、CI/CD |

## 🔄 次のステップ

1. **即座に開始**
   - LRUキャッシュライブラリ選定（lru-cache推奨）
   - getSlackClient utilの実装
   - メトリクス収集基盤

2. **Kiroとの確認事項**
   - Quick-Reply機能の優先度
   - エラーメッセージの文言
   - ロールアウト速度の希望

3. **技術調査**
   - BullMQ v4.7+の機能確認
   - Slack API rate limitの最新仕様
   - Redis Cluster必要性の検討

---
*このドキュメントは随時更新されます*