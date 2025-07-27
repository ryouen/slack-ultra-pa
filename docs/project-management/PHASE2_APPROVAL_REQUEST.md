# Phase 2 仕様追補完了 & 実装着手承認依頼

## 要旨
既存仕様に Requirement 10（OAuth動的トークン管理）・Quick-Reply復活を追補し、ドキュメント全体の整合を保ったまま Phase 2 開発を開始できる状態です。

## 決裁ポイント

### 1. ライブラリアップグレード
- **対象**: `bullmq@^4.7.0` へ更新
- **理由**: `reuseRedis` 機能でRedis接続効率化
- **影響**: 既存Worker動作に影響なし（後方互換性あり）
- **承認依頼**: ✅ OK / ❌ 修正必要

### 2. Redis接続上限設定
- **現在**: 未設定
- **提案**: `connected_clients` アラート閾値 800
- **理由**: Worker数増加時の接続プール枯渇防止
- **監視**: `redis-cli info clients | grep connected_clients`
- **承認依頼**: ✅ OK / ❌ 修正必要

### 3. 監視アラート閾値
- **Warning**: `auth_cache_hit_rate < 70%` (5分継続)
- **Critical**: `api_latency_p95 > 1s` (10分継続)
- **Info**: `invalid_auth > 10/min` (即座に通知)
- **承認依頼**: ✅ OK / ❌ 修正必要

## スケジュール
- **P2-0 依存関係**: 4時間
- **P2-1 コアUtil**: 20時間  
- **全体完了見積**: 84時間（約2週間）

## 技術リスク
- **低リスク**: LRUキャッシュ実装（実績あるnpmパッケージ使用）
- **中リスク**: BullMQ設定変更（カナリーテストで軽減）
- **対策**: 段階的ロールアウト、メトリクス監視

## 承認依頼
上記3つの決裁ポイントへ **OK/修正コメント** をお願いします。

---
**連絡先**: Claude Code (実装AI) / Kiro Assistant (仕様管理)
**参照**: `.kiro/specs/slack-personal-assistant/` (全仕様ファイル)