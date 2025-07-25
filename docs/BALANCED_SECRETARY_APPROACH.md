# 人間の秘書メタファーに基づく設計哲学

## 1. Quick Reply（返信案）の価値

### 現実の問題
```
実際の状況：
「承知しました」と言いたいだけなのに...
→ 「お世話になっております。ご連絡ありがとうございます。承知いたしました。よろしくお願いいたします。」
```

### 秘書的解決
```typescript
// 優秀な秘書のように、状況に応じた返信案を用意
interface QuickReplyContext {
  sender: string;        // 誰から？
  urgency: 'high' | 'normal' | 'low';
  relationship: 'superior' | 'peer' | 'external';
  previousContext: Message[];
}

// AIが生成する返信案
generateReplies(context: QuickReplyContext): string[] {
  // 1. カジュアル版
  // 2. 標準版  
  // 3. フォーマル版
}
```

**価値**: 関係性を保ちつつ、タイピング時間を90%削減

## 2. 外部連携の正しい設計

### ❌ 間違った統合（密結合）
```
Slack ← 双方向同期 → Google Calendar
         ↓
   複雑な状態管理
         ↓
   同期エラー地獄
```

### ✅ 正しい統合（責任分離）
```
秘書的アプローチ：
「こちらの書類です」と差し出すように

1. 作業フォルダへのクイックアクセス
   /work project-x
   → 「Project Xの資料はこちらです：」
      📁 [Google Drive] | 📝 [Notion] | 💾 [Dropbox]

2. カレンダー情報の参照（読み取り専用）
   「次の会議まで30分あります」
   「明日の10-11時は空いています」

3. 必要な時だけの連携
   ユーザーが明示的に要求した時のみアクセス
```

## 3. 責任範囲の明確な切り分け

### Slack PA の責任範囲
```yaml
MUST（必須）:
  - Slack内のメンション管理
  - タスクリストの維持
  - リマインダー送信
  - 返信案の提示

SHOULD（推奨）:
  - 関連資料へのリンク提供
  - スケジュール情報の表示
  - 優先順位の提案

MUST NOT（禁止）:
  - 勝手にメール送信
  - カレンダーイベントの自動確定
  - ファイルの自動編集
```

### 外部サービスの責任範囲
```yaml
Google Calendar:
  - 正式な予定管理
  - 招待状の送信

Notion/Drive:
  - ドキュメントの実体管理
  - バージョン管理

Slack PA:
  - これらへの「道案内」役
```

## 4. 実装の具体例

### 作業開始時の秘書的サポート
```typescript
// 朝の挨拶と共に必要な情報を提示
async function morningBriefing(userId: string) {
  const today = await getCalendarSummary(userId);
  const urgentTasks = await getUrgentTasks(userId);
  const unrepliedMentions = await getMentions(userId);
  
  return {
    blocks: [
      header("おはようございます。本日の予定です。"),
      section(`📅 ${today.meetingCount}件の会議`),
      section(`🔴 ${urgentTasks.length}件の緊急タスク`),
      section(`💬 ${unrepliedMentions.length}件の未返信`),
      actions([
        button("詳細を見る", "view_details"),
        button("作業開始", "start_work", { 
          url: getWorkspaceFolderUrl(userId) 
        })
      ])
    ]
  };
}
```

### フォルダアクセスの実装
```typescript
// 人間の秘書が「こちらです」と資料を差し出すように
async function presentWorkFolder(projectName: string) {
  const folders = await findProjectFolders(projectName);
  
  return {
    text: `${projectName}の作業フォルダ:`,
    attachments: folders.map(f => ({
      color: f.service === 'drive' ? '#4285f4' : '#000000',
      title: f.name,
      title_link: f.url,
      text: `最終更新: ${f.lastModified}`,
      footer: f.service,
      footer_icon: f.icon
    }))
  };
}
```

## 5. design.md からの重要な示唆

### "考える前に提示"の真意
```
誤解：AIが勝手に判断して行動
正解：ユーザーが判断するための材料を先回りして用意
```

### "日程調整の摩擦ゼロ"の実装
```typescript
// 複雑な自動調整ではなく、情報提示による摩擦削減
async function suggestMeetingTimes(participants: string[]) {
  const availability = await checkAvailability(participants);
  
  // 仮予定として提示（自動確定しない）
  return availability.map((slot, i) => ({
    text: `候補${i+1}: ${slot.format()}`,
    tentative: true,  // 仮1/3, 仮2/3 表示
    action: "propose_time"
  }));
}
```

## 6. 統合設計の原則

### 1. 単方向の情報フロー（基本）
```
外部サービス → Slack PA → ユーザー
（読み取り専用、表示のみ）
```

### 2. 明示的なアクション（書き込み時）
```
ユーザー → [確認] → Slack PA → 外部サービス
（必ず確認ステップを挟む）
```

### 3. フォールバック設計
```typescript
try {
  const calendar = await getCalendarEvents();
  return formatCalendarView(calendar);
} catch (error) {
  // APIエラー時も最低限の価値を提供
  return {
    text: "カレンダー接続エラー。直接確認: https://calendar.google.com",
    color: "warning"
  };
}
```

## まとめ

「人間の秘書」メタファーは、以下を意味する：

1. **先回りして準備** - でも勝手に実行しない
2. **必要な資料を差し出す** - でも整理はユーザー任せ
3. **返事の下書きを用意** - でも送信はユーザー
4. **スケジュールを把握** - でも決定はユーザー

これにより：
- ✅ 実際に毎日使える（実用性）
- ✅ 信頼できる（予測可能性）
- ✅ 価値がある（時間短縮）
- ✅ 邪魔にならない（控えめ）