# Phase 1, 2 詳細実装計画

## Phase 1: コア価値の確実な実装（2週間）

### 1.1 Quick Reply の改善

#### ユーザーストーリー
```
AS A 忙しいビジネスパーソン
WHEN 上司から「資料確認お願いします」とメンションされた
THEN 適切な返信案が3つ提示され、ワンクリックで返信できる
```

#### 具体的な機能
```typescript
// 返信案生成時のコンテキスト分析
interface ReplyContext {
  // 送信者分析
  senderRelation: 'superior' | 'peer' | 'junior' | 'external';
  senderHistory: RecentInteraction[];
  
  // メッセージ分析
  urgency: 'urgent' | 'normal' | 'low';
  requestType: 'confirmation' | 'action' | 'question' | 'info';
  sentiment: 'positive' | 'neutral' | 'negative';
  
  // 時間的コンテキスト
  currentTime: Date;
  businessHours: boolean;
  deadline?: Date;
}

// 生成される返信案の例
例1）上司からの緊急依頼の場合：
1. 「承知いたしました。すぐに確認し、本日中にご報告いたします。」
2. 「かしこまりました。確認の上、17時までにフィードバックをお送りします。」
3. 「承知いたしました。現在別件対応中のため、1時間後に確認させていただいてもよろしいでしょうか。」

例2）同僚からのカジュアルな質問の場合：
1. 「了解です！確認してみますね。」
2. 「ありがとうございます。少し確認してから返信します。」
3. 「承知しました。調べて後ほど共有します。」
```

#### 実装の流れ
```
1. メンション受信
   ↓
2. AIがコンテキスト分析（送信者、内容、緊急度）
   ↓
3. ユーザーの過去100件の返信スタイルを参照
   ↓
4. 3つの返信案を生成（カジュアル/標準/丁寧）
   ↓
5. Slackのメッセージ入力欄に挿入（送信はしない）
```

### 1.2 統合Inbox（/inbox）

#### ユーザーストーリー
```
AS A マルチタスクで働く人
WHEN 朝一番に/inboxを実行
THEN 今対応すべきメンションとタスクが優先度順に表示される
```

#### 表示例
```
/inbox

[INBOX] 2025/1/25(土) 8:30 - 要対応: 5件
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔴 @山田部長「予算申請の件、至急確認を」(30分前) #finance
   [💬 返信案] [✅ タスク化] [👁 既読]

⏰ [今日 15:00締切] 四半期レポート提出
   [✅ 完了] [📝 開く] [⏰ 延期]

💬 @鈴木「デザインレビューお願いします」(2時間前) #design
   [💬 返信案] [✅ タスク化] [👁 既読]

📌 [P2] API仕様書の更新
   [✅ 完了] [📁 資料] [⏰ リマインド]

💬 @佐藤「ランチどうですか？」(3時間前) #random
   [💬 返信案] [👁 既読]

───────────────────────────────
📊 残りタスク: 12件 | 📅 次の予定: 10:00 定例会議
[もっと見る] [フィルター] [設定]
```

#### 優先度ロジック（シンプル版）
```typescript
calculatePriority(item: WorkItem): number {
  let score = 0;
  
  // メンションの場合
  if (item.type === 'mention') {
    // 送信者の重要度
    if (item.senderRole === 'superior') score += 0.3;
    if (item.channelImportance === 'high') score += 0.2;
    
    // 時間経過
    const hoursAgo = getHoursAgo(item.timestamp);
    if (hoursAgo < 1) score += 0.3;
    else if (hoursAgo < 4) score += 0.2;
    else if (hoursAgo < 24) score += 0.1;
    
    // キーワード
    if (hasUrgentKeywords(item.text)) score += 0.2;
  }
  
  // タスクの場合
  if (item.type === 'task') {
    // 締切
    const hoursUntilDue = getHoursUntilDue(item.dueDate);
    if (hoursUntilDue < 3) score += 0.5;
    else if (hoursUntilDue < 24) score += 0.3;
    
    // 優先度
    if (item.priority === 'P1') score += 0.3;
    else if (item.priority === 'P2') score += 0.2;
  }
  
  return Math.min(score, 1.0);
}
```

### 1.3 基本的な秘書機能

#### 朝のブリーフィング
```
ユーザーストーリー：
AS A 一日の始まりに全体像を把握したい人
WHEN 朝8:30（設定可能）
THEN DMで今日の概要が送られてくる

メッセージ例：
━━━━━━━━━━━━━━━━━━━━━━━━
おはようございます。1/25(土)の予定です。

📅 本日の会議: 3件
 • 10:00-11:00 定例会議 @会議室A
 • 14:00-14:30 1on1 @オンライン
 • 16:00-17:00 デザインレビュー @Zoom

🔴 緊急タスク: 2件
 • 四半期レポート（15:00締切）
 • 予算申請確認（午前中）

💬 未返信: 5件（うち重要2件）

[📊 詳細を見る] [⚡ 作業開始]
━━━━━━━━━━━━━━━━━━━━━━━━
```

#### 作業フォルダクイックアクセス
```
コマンド: /work [プロジェクト名]

例: /work design-system

[WORKSPACE] Design System 関連リソース
━━━━━━━━━━━━━━━━━━━━━━━━
📁 Google Drive
   └ 📄 設計仕様書_v3.pdf (2時間前更新)
   └ 📊 コンポーネント一覧.xlsx (昨日)
   
📝 Notion
   └ 📋 タスクボード (30分前更新)
   └ 📝 議事録_2025_01_24 (昨日)

💾 Figma
   └ 🎨 UIコンポーネント (3時間前)

🔗 関連リンク
   └ GitHub: design-system-v2
   └ Storybook: component.example.com
━━━━━━━━━━━━━━━━━━━━━━━━
```

## Phase 2: 秘書的統合の実装（3-4週間）

### 2.1 Google Calendar 連携（読み取り専用）

#### ユーザーストーリー
```
AS A 会議の合間で作業している人
WHEN /inboxや/focusを実行時
THEN 次の予定までの時間と内容が表示される

AS A 会議を設定したい人  
WHEN 「来週会議したい」とメンションされた
THEN 自分の空き時間候補が提示される
```

#### 機能詳細
```typescript
// カレンダー情報の表示
interface CalendarContext {
  nextEvent?: {
    title: string;
    start: Date;
    location?: string;
    attendees: string[];
  };
  freeTimeUntilNext: number; // 分
  todayStats: {
    totalMeetings: number;
    totalMeetingHours: number;
    focusTimeBlocks: TimeBlock[];
  };
}

// 表示例
"📅 次: 14:00 デザインレビュー (あと45分)"
"✨ 次の予定まで2時間のまとまった時間があります"
"🎯 本日の会議: 3/5完了、残り2.5時間"
```

#### 空き時間提案機能
```
ユーザー：「来週ミーティングしましょう」
      ↓
Quick Reply候補：
1. 「来週の空いている時間帯をお送りします：
    • 月曜 14:00-17:00
    • 火曜 10:00-12:00、15:00-17:00  
    • 水曜 13:00-15:00
    ご都合はいかがでしょうか？」

2. 「承知いたしました。私の来週の予定を確認しますので、少々お待ちください。」

3. 「ありがとうございます。カレンダーを確認して候補日時をお送りします。」
```

### 2.2 ドキュメントアクセス支援

#### ユーザーストーリー
```
AS A 複数プロジェクトを掛け持ちする人
WHEN あるプロジェクトの作業を始める時
THEN 関連ドキュメントがすぐに開ける

AS A 会議中に資料を探す人
WHEN 「先週の議事録」のような曖昧な要求
THEN AIが文脈から適切な資料を特定して提示
```

#### スマート検索機能
```typescript
// コマンド: /find [曖昧な検索クエリ]
例: /find 先週の山田さんとの会議メモ

[SEARCH] 検索結果（関連度順）
━━━━━━━━━━━━━━━━━━━━━━━━
📝 定例会議メモ_山田_2025_01_18
   場所: Notion | 更新: 1/18 15:30
   内容: "予算について...リリース日程..."
   
📊 予算検討資料_v2.xlsx  
   場所: Google Drive | 更新: 1/18 16:45
   関連: 山田さんが最終編集
   
💬 Slackスレッド: "予算の件について"
   チャンネル: #finance | 日時: 1/18 14:00
   参加者: @山田, @あなた
━━━━━━━━━━━━━━━━━━━━━━━━
```

### 2.3 コンテキスト保持機能

#### セッション記憶
```typescript
// 30分間のコンテキスト保持
class ConversationContext {
  recentTopics: string[];      // 最近話題になったトピック
  mentionedPeople: Person[];    // 言及された人
  referencedDocs: Document[];   // 参照されたドキュメント
  currentProject?: string;      // 現在のプロジェクト文脈
}

// 使用例
ユーザー: /work project-x
PA: [Project X の資料を表示]

（10分後）
ユーザー: 昨日の会議の資料は？
PA: [Project X の昨日の会議資料を推測して表示]
```

## design.md との主な差分

### 1. 統合の深さ
```diff
- 設計書: 完全な双方向統合（カレンダー仮予約、ファイル編集）
+ 新提案: 読み取り中心、明示的アクション時のみ書き込み
理由: 責任範囲を明確化し、エラーを削減
```

### 2. AI の使い方
```diff
- 設計書: 包括的なAI活用（自動分類、予測、学習）
+ 新提案: 特定用途のAI（返信案、検索、優先度）
理由: 実装可能性と精度のバランス
```

### 3. 実装順序
```diff
- 設計書: 全機能を並行開発
+ 新提案: Phase分けで段階的実装
理由: 早期の価値提供と継続的改善
```

### 4. UI/UX
```diff
- 設計書: 高度なインタラクティブUI
+ 新提案: Slackネイティブなシンプルui
理由: Slack の制約内で最大価値
```

### 5. 秘書メタファーの解釈
```diff
- 設計書: 自動実行する有能秘書
+ 新提案: 提案と準備に徹する控えめ秘書
理由: ユーザーの信頼とコントロール感
```

## まとめ

この実装計画は、design.md の理想を現実的に落とし込んだもの。
コア価値（時間節約、摩擦削減）は維持しつつ、
実装可能性と保守性を重視した。