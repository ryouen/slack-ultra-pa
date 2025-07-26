# Claude & Kiro 協働プロトコル

**作成日**: 2025-07-25  
**目的**: Claude Code (Opus 4) と Kiro の効率的な協働体制確立  
**適用範囲**: Slack Personal Assistant プロジェクト

## 🤝 基本協働原則

### 1. 役割分担の明確化
- **Claude Code (Opus 4)**: 実装・コード品質・技術的問題解決
- **Kiro**: 仕様管理・プロジェクト管理・ドキュメント整備・分析

### 2. 情報共有の標準化
- **進捗報告**: 標準フォーマットでの状況共有
- **問題報告**: 構造化された問題・解決策の記録
- **学習共有**: 技術的学びの体系的な蓄積

## 📋 現在の作業分担

### Claude Code (Opus 4) 担当: Task 10.4 ユーザーフィードバック対応
**期間**: 当面の間  
**作業内容**:

#### Phase 1: 即座実装改善 (★マーク - 次リリース)
- [ ] 既読ボタンのフェードアウト効果 (CSS追加のみ)
- [ ] /todo表示の分割 ([TASKS]と[MENTIONS]セクション分離)
- [ ] スレッドジャンプの1クリック化 (中間確認画面スキップ)

#### Phase 2: 次作業セッション改善
- [ ] タスク重複防止 (DB制約追加: slackTs + channelId UNIQUE)
- [ ] スレッド内メンション検知 (event.thread_ts対応)

#### Phase 3: 長期計画改善 (☆マーク)
- [ ] User Tokenオプトイン実装 (72時間履歴検索)
- [ ] タスク完了→既読自動反映

#### 従来の仕様準拠作業
- [ ] Task 10.9: `/mention`コマンド仕様準拠調整 (2時間)
- [ ] Task 10.10: Block UIテキスト仕様準拠 (3時間)
- [ ] Task 10.12: 旧システム削除確認 (1時間)

### Kiro 担当: 並行作業項目

#### 🔴 高優先度 (Claude作業中に実施)

1. **Task 10.2 Folder Quick Access Integration 完了** (2時間)
   - 現在「修正中」状態の完了
   - ペイロードエラー対応の最終確認
   - フォルダボタン機能の安定化

2. **Task 3 OAuth Token Management System** (16時間)
   - Google Calendar/Drive OAuth flow
   - Notion OAuth connection
   - Token refresh middleware
   - Secrets Manager integration

3. **Task 4 Job Queue Infrastructure** (14時間)
   - BullMQ job queue system setup
   - Worker processes for different job types
   - Job retry logic with exponential backoff
   - Queue monitoring and cleanup

#### 🟡 中優先度 (基盤整備)

4. **Task 6 Observability Foundation** (10時間)
   - Winston logging with Loki integration
   - Prometheus metrics collection
   - OpenTelemetry tracing setup
   - Basic Grafana dashboard

5. **Task 7 Multi-language Support** (8時間)
   - i18n system with Japanese and English support
   - Language detection utilities
   - Travel keywords i18n configuration

6. **Task 8 Security & API Quota Management** (10時間)
   - Security hardening
   - API quota protection
   - Circuit breaker implementation

## 📞 コミュニケーション標準方法

### 1. 進捗報告フォーマット

```markdown
## 進捗報告 - [担当者名] - [日付]

### ✅ 完了項目
- [Task番号] [タスク名]: [完了内容の詳細]

### 🔧 進行中項目
- [Task番号] [タスク名]: [現在の状況・進捗率]

### ⚠️ 問題・ブロッカー
- [問題の詳細]: [影響範囲・解決策・必要な協力]

### 📚 学び・発見
- [技術的学び・改善点・今後への活用方法]

### 🔄 次回までの予定
- [具体的な作業項目・完了予定時期]
```

### 2. 問題報告フォーマット

```markdown
## 問題報告 - [担当者名] - [日付]

### 🚨 問題概要
- **問題**: [問題の簡潔な説明]
- **影響範囲**: [どのタスク・機能に影響するか]
- **緊急度**: [高/中/低]

### 🔍 詳細情報
- **発生状況**: [いつ・どこで・どのように発生したか]
- **エラーメッセージ**: [具体的なエラー内容]
- **再現手順**: [問題を再現する方法]

### 💡 解決策・対応
- **試行した対応**: [既に試した解決方法]
- **提案する解決策**: [推奨する解決方法]
- **必要な協力**: [他の担当者に必要な支援]

### 📋 関連情報
- **関連ファイル**: [問題に関連するファイルパス]
- **参考資料**: [関連ドキュメント・リンク]
```

### 3. 技術学習共有フォーマット

```markdown
## 技術学習共有 - [担当者名] - [日付]

### 💡 学習内容
- **技術領域**: [Slack API / React / Database など]
- **学習のきっかけ**: [どの作業で必要になったか]

### 🔧 具体的な学び
- **問題**: [遭遇した技術的課題]
- **解決方法**: [採用した解決策]
- **コード例**: [実装例・設定例]

### 📚 今後への活用
- **再利用可能性**: [他のタスクでも活用できるか]
- **ベストプラクティス**: [推奨する実装方法]
- **注意点**: [同じ問題を避けるための注意事項]

### 🔗 参考資料
- [有用だった資料・ドキュメント・記事のリンク]
```

## 🔄 定期同期ミーティング

### 週次同期 (推奨)
- **頻度**: 週1回、30分
- **内容**: 
  - 進捗確認
  - 問題・ブロッカーの解決
  - 次週の作業計画
  - 学習共有

### 緊急同期 (必要時)
- **トリガー**: 重要な問題・ブロッカー発生時
- **方法**: Slack DM または専用チャンネル
- **対応時間**: 24時間以内

## 📁 共有ドキュメント管理

### 1. 進捗管理
- **ファイル**: `PROGRESS_TRACKING.md`
- **更新頻度**: 作業完了時・問題発生時
- **責任者**: 各担当者が自分の作業を更新

### 2. 問題管理
- **ファイル**: `ISSUES_LOG.md`
- **更新頻度**: 問題発生時・解決時
- **責任者**: 問題発見者が記録、解決者が更新

### 3. 学習蓄積
- **ファイル**: `TECHNICAL_LEARNINGS.md`
- **更新頻度**: 重要な学びがあった時
- **責任者**: 学習した担当者が記録

## 🎯 成功指標

### 協働効率の測定
- **並行作業効率**: 同時進行タスク数・完了率
- **コミュニケーション品質**: 問題解決時間・情報共有の正確性
- **学習共有効果**: 同じ問題の再発防止・知識の再利用

### 品質指標
- **コード品質**: レビュー指摘事項数・バグ発生率
- **仕様準拠**: 要件充足率・ユーザーストーリー実現度
- **技術的負債**: リファクタリング必要箇所・保守性

## 🚀 今後の展開

### Phase 1: 基盤整備 (2-3週間)
- Claude: Task 10.4 ブラッシュアップ完了
- Kiro: Task 3, 4, 6-8 の基盤システム構築

### Phase 2: 統合・テスト (1-2週間)
- 両者協働: システム統合・E2Eテスト
- 品質保証・パフォーマンス最適化

### Phase 3: 本格運用準備 (1週間)
- ドキュメント整備・デプロイ準備
- 運用監視体制構築

この協働プロトコルにより、Claude Code (Opus 4) と Kiro の作業を効率的に並行実行し、高品質なシステム完成を目指します。