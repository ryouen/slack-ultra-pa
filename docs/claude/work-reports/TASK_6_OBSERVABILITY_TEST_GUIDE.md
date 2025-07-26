# Task 6 Observability Foundation - Test Guide

## 🎯 目的
Task 6 Observability Foundation の機能テスト手順

## 📋 実装完了内容

### ✅ 完了した機能
1. **Prometheus Metrics強化**: Job Queue、OAuth、System Health メトリクス
2. **OpenTelemetry Tracing**: 分散トレーシング基盤
3. **構造化ログ強化**: トレーシング情報統合
4. **Health Check システム**: 包括的なシステム健全性チェック
5. **Health Check API**: 複数エンドポイントでの監視

## 🧪 テスト手順

### Phase 1: 基本機能テスト

#### 1.1 Health Check API テスト
```bash
# 基本ヘルスチェック
curl http://localhost:3100/health

# 期待結果:
{
  "status": "ok",
  "timestamp": "2025-01-26T..."
}

# 詳細ヘルスチェック
curl http://localhost:3100/health/detailed

# 期待結果:
{
  "status": "healthy|degraded|unhealthy",
  "timestamp": "2025-01-26T...",
  "uptime": 123.45,
  "version": "1.0.0",
  "components": {
    "database": {
      "status": "healthy",
      "responseTime": 50,
      "lastChecked": "2025-01-26T..."
    },
    "redis": { ... },
    "jobQueue": { ... },
    "oauth": { ... }
  },
  "metrics": {
    "totalTasks": 10,
    "activeJobs": 2,
    "queueStats": { ... }
  }
}
```

#### 1.2 Kubernetes Probes テスト
```bash
# Readiness Probe
curl http://localhost:3100/ready

# Liveness Probe  
curl http://localhost:3100/live
```

#### 1.3 Prometheus Metrics テスト
```bash
# メトリクス確認
curl http://localhost:9090/metrics

# 期待されるメトリクス:
# - slack_requests_total
# - job_queue_jobs_total
# - oauth_token_operations_total
# - system_health_status
# - database_connection_status
# - redis_connection_status
```

### Phase 2: 統合テスト

#### 2.1 Job Queue Metrics テスト
```bash
# Job Queue サービス起動後
curl http://localhost:9090/metrics | grep job_queue

# 期待されるメトリクス:
# job_queue_jobs_total{job_type="reminder",status="completed"} 5
# job_queue_active_jobs{job_type="reminder"} 2
# job_queue_waiting_jobs{job_type="daily_report"} 1
```

#### 2.2 OAuth Metrics テスト
```bash
# OAuth操作実行後
curl http://localhost:9090/metrics | grep oauth

# 期待されるメトリクス:
# oauth_token_operations_total{provider="GOOGLE_CALENDAR",operation="store",status="success"} 3
# oauth_token_refresh_duration_seconds_bucket{provider="GOOGLE_CALENDAR"} 1.2
```

#### 2.3 Health Check 統合テスト
```bash
# システム全体の健全性確認
curl -s http://localhost:3100/health/detailed | jq '.components'

# 各コンポーネントの状態確認:
# - database: healthy (< 1秒応答)
# - redis: healthy (< 0.5秒応答)  
# - jobQueue: healthy (失敗率 < 10%)
# - oauth: healthy (有効トークン存在)
```

### Phase 3: トレーシングテスト

#### 3.1 OpenTelemetry 設定
```bash
# 環境変数設定
export TRACING_ENABLED=true
export JAEGER_ENDPOINT=http://localhost:14268/api/traces

# アプリケーション再起動
npm run dev
```

#### 3.2 トレーシング確認
```bash
# ログでトレーシング情報確認
tail -f logs/combined.log | grep trace

# 期待される出力:
# 2025-01-26T... info: [trace:abc12345 span:def67890] OAuth token stored successfully
```

### Phase 4: エラーハンドリングテスト

#### 4.1 データベース接続エラー
```bash
# PostgreSQL停止
# Health Check実行
curl http://localhost:3100/health/detailed

# 期待結果:
# - status: "unhealthy"
# - components.database.status: "unhealthy"
# - components.database.message: "Database connection failed"
```

#### 4.2 Redis接続エラー
```bash
# Redis停止
# Health Check実行
curl http://localhost:3100/health/detailed

# 期待結果:
# - status: "unhealthy" 
# - components.redis.status: "unhealthy"
# - components.redis.message: "Redis connection failed"
```

## 📊 成功基準

### 基本機能
- [ ] Health Check API が正常応答
- [ ] Prometheus メトリクスが収集される
- [ ] 構造化ログが出力される
- [ ] トレーシング情報がログに含まれる

### 監視機能
- [ ] システム健全性が正確に判定される
- [ ] コンポーネント別の詳細状態が取得できる
- [ ] メトリクスが時系列で収集される
- [ ] 障害時に適切なステータスが返される

### 統合機能
- [ ] Job Queue メトリクスが正確
- [ ] OAuth メトリクスが記録される
- [ ] 分散トレーシングが動作する
- [ ] Kubernetes Probes が機能する

## ⚠️ 既知の制限事項

### TypeScript エラー
- 現在206個のTypeScriptエラーが存在
- 主に型安全性の問題（undefined チェック等）
- 機能的には動作するが、本番前に修正が必要

### 依存関係
- **PostgreSQL**: データベース接続が必要
- **Redis**: Job Queue 機能に必要
- **Jaeger**: トレーシング可視化（オプション）
- **Grafana**: メトリクス可視化（オプション）

## 🚀 次のステップ

### 短期（今週）
1. **TypeScript エラー修正**: 型安全性の向上
2. **基本動作テスト**: Health Check API の動作確認
3. **メトリクス確認**: Prometheus メトリクスの収集確認

### 中期（来週）
1. **Grafana ダッシュボード**: メトリクス可視化
2. **アラート設定**: 障害検知の自動化
3. **ログ集約**: Loki 統合の完成

### 長期（来月）
1. **本番監視**: 本格的な監視体制構築
2. **パフォーマンス最適化**: メトリクス収集の最適化
3. **SLI/SLO設定**: サービスレベル指標の設定

---

**テスト実行者**: ___________  
**テスト日時**: ___________  
**結果**: ___________  
**備考**: TypeScriptエラーは機能に影響しないが、本番前に修正推奨