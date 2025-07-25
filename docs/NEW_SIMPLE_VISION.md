# 🎯 新ビジョン：究極のシンプル Personal Assistant

## コンセプト：「やることは3つだけ」

### 1. `/check` - 今見るべきものを見る
```
使用例: /check

[CHECK] 未対応 3件
━━━━━━━━━━━━━━━━━
💬 @田中 昨日の資料どこですか？ (2時間前)
   [返信する] [後で] [タスク化]

💬 @佐藤 会議の日程調整お願いします (5時間前)
   [返信する] [後で] [タスク化]

✅ 【今日締切】レポート提出
   [完了] [明日に] [削除]
```

### 2. `/add` - 思いついたらすぐ追加
```
使用例: /add 明日までにプレゼン資料作成

[ADDED] タスクを追加しました
```

### 3. `/today` - 今日やることを確認
```
使用例: /today

[TODAY] 3件
1. □ プレゼン資料作成
2. □ コードレビュー対応  
3. □ 定例会議準備

ドラッグで順番変更可能（というUXを真似た番号指定）
```

## なぜこれが最適解なのか

### 1. 認知負荷ゼロ
- check = 確認
- add = 追加  
- today = 今日
- 説明不要、直感的

### 2. 統合という幻想を捨てる
- Googleカレンダーは見たい時にブラウザで見る
- Notionは必要な時にNotionで開く
- 無理に統合しない

### 3. 1人用の最適化
```python
# 設定ファイル不要、すべてハードコード
MY_IMPORTANT_CHANNELS = ['dev-urgent', 'proj-main']
MY_WORK_HOURS = (9, 18)
MY_TIMEZONE = 'Asia/Tokyo'
```

### 4. メンテナンスフリー
- 外部API依存なし（Slack以外）
- OAuth更新なし
- バージョン互換性の心配なし

## 実装の簡潔さ

```typescript
// これが全体の80%の価値を提供
class SimplePA {
  async check(userId: string) {
    const mentions = await this.getUnreadMentions(userId);
    const tasks = await this.getTodayTasks(userId);
    return this.format([...mentions, ...tasks]);
  }
  
  async add(text: string, userId: string) {
    return await this.db.insert({ text, userId });
  }
  
  async today(userId: string) {
    return await this.db.find({ userId, date: TODAY });
  }
}
```

## やらないことリスト

### ❌ AI優先順位付け
理由：自分が一番知っている

### ❌ 自動レポート
理由：見ない

### ❌ 複雑な階層
理由：フラットで十分

### ❌ 外部サービス統合  
理由：壊れやすい

### ❌ プロアクティブ通知
理由：うるさい

### ❌ チーム機能
理由：1人用

## 成功の定義

1. **開発期間**: 1週間で完成
2. **コード行数**: 500行以下
3. **依存関係**: Slack APIのみ
4. **月間メンテ**: 0時間
5. **ユーザー満足度**: 「これで十分」

## 移行計画

### Week 1: コア実装
- `/check` コマンド
- `/add` コマンド  
- `/today` コマンド
- 既存の複雑な機能は触らない

### Week 2: 既存機能の整理
- 使われていない機能の無効化
- コードの整理（削除はしない）
- ドキュメント更新

### Week 3以降
- ユーザーフィードバックを待つ
- 本当に必要な機能だけ慎重に追加

## 哲学

> "Perfection is achieved, not when there is nothing more to add, 
> but when there is nothing left to take away." - Antoine de Saint-Exupéry

完璧とは、付け加えるものがなくなった時ではなく、
取り去るものがなくなった時に達成される。

## まとめ

現在のシステムは「できること」を追求しすぎた。
新しいシステムは「必要なこと」だけに集中する。

**3つのコマンド、それだけ。**