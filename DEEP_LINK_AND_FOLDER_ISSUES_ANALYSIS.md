# Deep Link & フォルダアクセス問題分析

## 🔍 問題の整理

### 1. Deep Link問題
- **現象**: Slackデスクトップアプリ内で開くが、スレッドパネルが自動的に開かない
- **原因**: `tab=thread_ts`パラメータが効いていない可能性
- **現在のteamId**: `TL2EU3JPP`（テストデータの`T0979H6R0H7`と異なる）

### 2. フォルダアクセス問題
- **現象**: 📂ボタンクリック時に`invalid_auth`エラー
- **原因**: `client.chat.postMessage`の認証失敗
- **エラー箇所**: `src/routes/index.ts`の860行目

### 3. /todo と /mention の混在問題
- **現象**: `/todo today`にメンションが含まれている
- **期待**: タスク化されたものだけが表示される

## 📋 対応方針

### 1. Deep Linkの修正案

#### Option A: 現状維持（推奨）
- 少なくともSlackアプリ内でチャンネルが開く
- スレッドパネルの自動表示は非公式機能のため、動作保証なし

#### Option B: フォールバック実装
```typescript
// スレッドビューのWeb URL形式を試す
const webThreadUrl = `https://app.slack.com/client/${teamId}/${channelId}/thread-${channelId}-${timestamp}`;
```

### 2. フォルダアクセスの修正

```typescript
// 修正前（エラー）
await client.chat.postMessage({
  channel: channelId,
  text: `[FOLDER] フォルダを開いています...`,
  // ...
});

// 修正後（response_urlを使用）
const response_url = (body as any).response_url;
if (response_url) {
  await axios.post(response_url, {
    text: `[FOLDER] フォルダを開いています...`,
    blocks: [/* ... */]
  });
}
```

### 3. フォルダ選定基準の明確化

現在の実装では、タスクに含まれるURLから以下を検出：
- Dropbox: `dropbox.com`
- Google Drive: `drive.google.com`
- Notion: `notion.so`

**問題**: どのURLをフォルダとして扱うかの基準が不明確

### 4. /todo と /mention の分離

```typescript
// taskService.tsのgetDailyTop5修正
async getDailyTop5(userId: string): Promise<Task[]> {
  const tasks = await this.prisma.task.findMany({
    where: {
      userId,
      status: { not: 'COMPLETED' },
      // メンションから作成されたタスクのみを除外するか、
      // または別のメソッドを作成
    },
    // ...
  });
}
```

## 🎯 推奨する実装順序

1. **フォルダアクセスのinvalid_auth修正**（最優先）
2. **/todo と /mention の分離**
3. **Deep Linkは現状維持**（リスクを避ける）

## ⚠️ リスク管理

- Deep Link修正時は必ず現在の動作を保持
- フォルダアクセスは`response_url`を使用して修正
- /todoの変更は既存の動作を壊さないよう注意