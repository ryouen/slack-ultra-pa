# Kiro実装メモ - 2025年7月25日

## 概要
本メモは、Slack Personal Assistant の根本的な設計変更について記録します。
ユーザーフィードバックに基づき、メンション中心のワークフローへ移行します。

## 1. 重要な設計変更

### 1.1 コマンド体系の変更

**従来:**
```
/todo today - タスクとメンションを混在表示
```

**新設計:**
```
/mention       - メンション一覧（デフォルト48時間）
/mention all   - 全期間のメンション
/mention unread - 未返信のメンションのみ
/tasks         - タスク一覧（従来の/todo）
```

**移行措置:**
- `/todo` を `/mention` のエイリアスとして残す
- 既存ユーザーへの影響を最小化

### 1.2 ワークフローの変更

**従来のフロー:**
1. `/todo today` でタスクとメンションを確認
2. タスク完了またはメンション処理

**新しいフロー:**
1. `/mention` で自分宛のメンションを確認
2. 各メンションに対して3つのアクション:
   - 返信案を見る → スレッドで返信
   - タスク化 → `/tasks` で管理
   - 既読にする → アーカイブ

### 1.3 Quick Reply機能の根本的変更

**重要: ボットは返信を送信しない**

**従来（問題あり）:**
- ボットがユーザーの代わりに返信を送信
- ユーザーのアイデンティティ喪失

**新設計:**
- AI返信案を提示のみ
- ユーザーがコピー＆ペーストで返信
- `chat.getPermalink` でスレッドへ直接遷移

## 2. 実装フェーズ

### Phase 0 (MVP) - 即実装
```typescript
// 新規実装項目
1. /mention コマンド実装
   - search.messages APIで過去48時間のメンション取得
   - Block Kitで一覧表示
   - 各項目に[返信案][タスク化][既読]ボタン

2. permalink機能追加
   - InboxItemモデルにpermalinkフィールド追加
   - メンション保存時にchat.getPermalinkで取得

3. Quick Reply改修
   - 返信案をコードブロックで表示
   - 「スレッドで返信」ボタンでpermalinkへ遷移
   - ボットによる自動返信を完全削除
```

### Phase 1 - 次期実装
```typescript
// フィルタリング機能
1. 未返信判定
   - conversations.repliesでスレッド確認
   - hasRepliedフラグの実装

2. 期間指定
   - /mention today (24時間)
   - /mention week (7日間)
   - /mention month (30日間)

3. 設定機能
   - /mention settings
   - デフォルト期間の変更
   - 既読判定ロジックのカスタマイズ
```

### Phase 2 - 将来実装
```typescript
// 高度な機能
1. カレンダー連携
   - 空き時間を考慮した返信案生成
   - 日程調整の自動化

2. リアルタイムDB
   - Event APIでメンションをリアルタイム保存
   - search.messages の負荷軽減

3. 分析機能
   - 返信時間の統計
   - メンション処理率の可視化
```

## 3. データモデルの変更

### 3.1 InboxItem拡張

```typescript
// prisma/schema.prisma への追加フィールド
model InboxItem {
  // 既存フィールド
  id            String   @id @default(cuid())
  slackTs       String
  channelId     String
  channelName   String
  messageText   String
  authorId      String
  status        String
  
  // 新規追加フィールド
  permalink     String?  // chat.getPermalinkで取得
  hasReplied    Boolean  @default(false)
  replyCount    Int      @default(0)
  lastReplyTs   String?
  isTaskCreated Boolean  @default(false)
  taskId        String?
  importance    String   @default("medium") // high/medium/low
}
```

### 3.2 マイグレーション必要性
- 既存のInboxItemテーブルに新規カラム追加
- デフォルト値設定で既存データへの影響なし

## 4. API使用の変更

### 4.1 新規使用API
```typescript
// search.messages - メンション検索
client.search.messages({
  query: `@${userId} after:${timestamp}`,
  sort: 'timestamp',
  sort_dir: 'desc'
})

// chat.getPermalink - スレッドURL取得
client.chat.getPermalink({
  channel: channelId,
  message_ts: messageTs
})

// conversations.replies - 返信確認
client.conversations.replies({
  channel: channelId,
  ts: threadTs
})
```

### 4.2 必要なスコープ追加
```
search:read - search.messages用
channels:history - conversations.replies用
groups:history - プライベートチャンネル対応
```

## 5. 技術的決定事項

### 5.1 パフォーマンス考慮
- search.messages結果は5分間キャッシュ
- permalinkは永続保存（再取得不要）
- 未返信判定は非同期バックグラウンド処理

### 5.2 エラーハンドリング
- API制限時は適切なメッセージ表示
- チャンネル権限エラーは明確に通知
- フォールバック機構を全機能に実装

### 5.3 後方互換性
- /todoコマンドは維持（エイリアス）
- 既存のタスク機能は影響なし
- データベース変更は追加のみ（削除なし）

## 6. ユーザー価値の変化

### Before（現在）
- タスク中心の思考
- メンションとタスクが混在
- Quick Replyがユーザーの代理で送信

### After（新設計）
- メンション中心のワークフロー
- 明確な処理フロー（返信/タスク化/既読）
- ユーザーが主体的に返信

## 7. 実装タスク一覧（task.md更新用）

### 削除すべきタスク
- Task 10.4の一部（自動返信機能）

### 追加すべきタスク

#### Task 20: Mention-Centric Workflow Implementation
**Estimated Hours:** 40
**Requirements:** メンション中心のワークフロー実装
**Deliverables:**
- `/mention` コマンド実装
- search.messages統合
- permalink機能追加
- Quick Reply再設計（提示のみ）

**Sub-tasks:**
- [ ] 20.1: /mention コマンド基本実装 (8h)
- [ ] 20.2: search.messages API統合 (8h)
- [ ] 20.3: permalink取得・保存機能 (6h)
- [ ] 20.4: Quick Reply UI再設計 (8h)
- [ ] 20.5: データモデル拡張 (6h)
- [ ] 20.6: テスト・ドキュメント更新 (4h)

#### Task 21: Reply Detection System
**Estimated Hours:** 16
**Requirements:** 未返信メンション検出
**Blocked by:** Task 20
**Deliverables:**
- conversations.replies統合
- hasRepliedフラグ実装
- /mention unreadフィルタ

#### Task 22: Advanced Filtering and Settings
**Estimated Hours:** 12
**Requirements:** 期間指定・設定機能
**Blocked by:** Task 20
**Deliverables:**
- 期間パラメータ対応
- /mention settings実装
- ユーザー設定保存

## 8. 移行計画

### Step 1: 基盤準備（1週目）
- データモデル拡張
- API権限追加
- 基本的な/mentionコマンド実装

### Step 2: 機能実装（2週目）
- search.messages統合
- permalink機能
- Quick Reply再設計

### Step 3: 段階的リリース（3週目）
- 一部ユーザーでベータテスト
- フィードバック収集
- バグ修正

### Step 4: 全面移行（4週目）
- 全ユーザーへ展開
- /todoから/mentionへの誘導
- ドキュメント更新

## 9. リスクと対策

### リスク1: 既存ユーザーの混乱
**対策:** 
- /todoコマンドを残す
- 移行ガイドを表示
- ヘルプメッセージ充実

### リスク2: API制限
**対策:**
- キャッシュ機構実装
- レート制限対応
- 段階的なEvent API移行

### リスク3: パフォーマンス
**対策:**
- 非同期処理
- バックグラウンドジョブ
- インデックス最適化

## 10. 成功指標

### 短期（1ヶ月）
- /mentionコマンド使用率 > 50%
- 平均返信時間 20%短縮
- エラー率 < 1%

### 中期（3ヶ月）
- 未返信メンション率 < 10%
- タスク化率 30%向上
- ユーザー満足度 NPS > 50

### 長期（6ヶ月）
- 全ユーザーが/mention使用
- 返信時間 50%短縮
- 拡張機能利用率 > 30%

---

## Kiroへの申し送り事項

1. **task.md更新時の注意**
   - Task 20-22を新規追加
   - 既存タスクとの依存関係を明記
   - 工数見積もりは控えめに設定済み

2. **design.md更新時の注意**
   - コマンド体系の変更を反映
   - データフローの更新必要
   - ユーザーストーリーの追加

3. **requirements.md確認事項**
   - 新しいユーザーストーリーとの整合性
   - API権限要件の追加
   - パフォーマンス要件の見直し

4. **実装の優先順位**
   - Phase 0（MVP）を最優先
   - 既存機能への影響を最小化
   - ユーザーフィードバックを重視

---

*作成: Claude Opus 4*
*日付: 2025-07-25*
*目的: Kiroとの情報共有・task.md更新支援*