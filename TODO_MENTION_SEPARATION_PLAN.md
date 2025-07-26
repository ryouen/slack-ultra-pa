# /todo と /mention 分離実装計画

## 現在の問題

`/todo today`コマンドで以下の両方が表示されている：
1. タスク（getDailyTop5Tasks）
2. メンション（collectRecentMentions）

## 期待される動作

### /todo コマンド
- **タスクのみ**を表示
- メンションから作成されたタスクも含む
- メンション自体は表示しない

### /mention コマンド
- **未対応のメンションのみ**を表示
- タスク化されたメンションは除外または「タスク化済み」と表示

## 実装方針

### 修正箇所：`src/routes/index.ts`

```typescript
// 現在の実装（369行目付近）
// Collect recent mentions (limit to 3)
const allMentions = await taskService.collectRecentMentions(user.id);
const recentMentions = allMentions.slice(0, 3);

// 修正後：この部分を削除
// メンションの収集と表示を完全に削除
```

### 代替案（もしメンションの存在を知らせたい場合）

```typescript
// メンションの件数だけを取得
const unreadMentionsCount = await taskService.getUnreadMentionsCount(user.id);

if (unreadMentionsCount > 0) {
  responseBlocks.push({
    type: 'context',
    elements: [{
      type: 'mrkdwn',
      text: `💬 ${unreadMentionsCount}件の未対応メンションがあります。\`/mention\`で確認してください。`
    }]
  });
}
```

## 実装手順

1. `/todo`コマンドからメンション表示部分を削除
2. （オプション）未読メンション数の通知を追加
3. テストして動作確認

## 影響範囲

- `/todo`：メンションが表示されなくなる（期待通り）
- `/todo today`：同上
- `/mention`：影響なし（既に独立して動作）

## リスク

- 低リスク：単純な削除のみ
- ユーザーへの影響：メンションの存在に気づきにくくなる可能性