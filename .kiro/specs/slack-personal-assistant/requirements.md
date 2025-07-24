---
ultrathink: always
docs_bilingual: "JP first, EN second"
evaluation_criteria:
  impact: "Business value and user benefit"
  effort: "Development complexity and time"
  differentiation: "Uniqueness compared to existing solutions"
  demo_impact: "Visual appeal and demonstration value"
priority_thresholds:
  mvp: "≥12 total points"
  booster: "8-11 total points"
  future: "≤7 total points"
---

# Requirements Document / 要件定義書

## Introduction / はじめに

This document outlines the requirements for a Slack-centered personal assistant system that helps users manage their daily tasks, schedule, and communications more efficiently. The system will integrate with Slack to provide intelligent assistance through natural language interactions.

このドキュメントは、ユーザーの日常業務、スケジュール、コミュニケーションをより効率的に管理するためのSlackを中心としたパーソナル秘書システムの要件を定義します。システムはSlackと統合し、自然言語による対話を通じてインテリジェントなアシスタンス機能を提供します。

## Core Concept / コアコンセプト

**"あなたが本来やるべきことに集中するための Slack個人秘書AI"**
**"Slack Personal Assistant AI to help you focus on what you should really be doing"**

### Value Propositions / 価値提案

| 価値メッセージ / Value Message | 対応機能 / Corresponding Features | 効果 / Impact |
|---|---|---|
| **1. "探さない・思い出さない" / "No Searching, No Remembering"** | • 朝7:30 / /todo today で🔥優先タスクTop5カード<br>• 📂ボタンで Drive/Notion/Dropbox を即オープン<br>• 資料タスク → 直近30日ファイル自動サマリ | 助走をなくし、準備ゼロ秒で仕事を開始<br>Eliminate preparation time, start work in zero seconds |
| **2. "考える前に提示" / "Proactive Suggestions"** | • P1タスク：前日09:00＋空き3h前にDMリマインド<br>• 会議30分前 /prep → 過去議事・関連資料DM | ユーザーは"通知を見て即行動"するだけ<br>Users just see notifications and take immediate action |
| **3. "日程調整の摩擦ゼロ" / "Frictionless Scheduling"** | • 🗓 Open in Calendar→候補リスト（✅❌✈️🚶⚠️）<br>• 時間枠クリックで週ビュー直行<br>• 📅仮予定挿入（連番）＋👍返信下書き | 「カレンダー開く→空き探す」の手間を統合<br>Integrate "open calendar → find availability" workflow |
| **4. "チャット＝秘書室" / "Chat as Secretary Office"** | • メンション自動インボックス＋3ボタン（＋タスク追加）<br>• Quick Reply 3候補下書き（ユーザー文体学習）<br>• Daily/Weekly レポートを指定チャンネルに自動投稿 | UIの重心を完全にSlack側に固定<br>Keep UI center of gravity entirely on Slack side |
| **5. "集中を守る" / "Protect Focus"** | • 集中モード中は非緊急通知をバッチ処理<br>• 感情/負荷を検知しメッセージを簡潔化 | "本来やるべきこと"に深く没入させる<br>Enable deep immersion in "what you should really be doing" |

## MVP Requirements / MVP要件 (≥12 points)

### Requirement 1: Basic Slack Integration / 基本的なSlack統合
**Score: Impact(4) + Effort(2) + Differentiation(2) + Demo(4) = 12**
<!-- Impact: 高い - 基盤機能として必須 | Effort: 低い - Slack Bolt使用で簡単 | Differentiation: 低い - 一般的 | Demo: 高い - 視覚的にわかりやすい -->

**User Story / ユーザーストーリー:** As a user, I want to interact with my personal assistant through Slack, so that I can access assistance within my existing workflow.
ユーザーとして、既存のワークフロー内でアシスタンス機能にアクセスできるよう、Slackを通じてパーソナル秘書と対話したい。

#### Acceptance Criteria / 受け入れ基準
1. **GIVEN** a user mentions the assistant bot in a Slack channel **WHEN** they send a message **THEN** the system SHALL respond with appropriate assistance in the detected language
   **前提条件** ユーザーがSlackチャンネルでアシスタントボットにメンションする **条件** メッセージを送信した時 **結果** システムは検出された言語で適切なアシスタンス機能で応答する
2. **GIVEN** a user sends a direct message to the assistant bot **WHEN** the message is received **THEN** the system SHALL process the request and provide a relevant response within 3 seconds
   **前提条件** ユーザーがアシスタントボットにダイレクトメッセージを送信する **条件** メッセージが受信された時 **結果** システムは3秒以内にリクエストを処理し関連する応答を提供する
3. **GIVEN** the system receives a message in Japanese or English **WHEN** processing the request **THEN** it SHALL respond in the same language as the input
   **前提条件** システムが日本語または英語のメッセージを受信する **条件** リクエストを処理する時 **結果** 入力と同じ言語で応答する
4. **GIVEN** a user explicitly requests language switching **WHEN** they use the /lang command **THEN** the system SHALL change the response language and remember the preference
   **前提条件** ユーザーが明示的に言語切り替えを要求する **条件** /langコマンドを使用した時 **結果** システムは応答言語を変更し設定を記憶する
5. **GIVEN** a user sends any slash command **WHEN** the command is received **THEN** the system SHALL acknowledge receipt within 1 second and process the command appropriately
   **前提条件** ユーザーがスラッシュコマンドを送信する **条件** コマンドが受信された時 **結果** システムは1秒以内に受信確認し、適切にコマンドを処理する

### Requirement 2: Smart Task Management / スマートタスク管理
**Score: Impact(5) + Effort(4) + Differentiation(4) + Demo(5) = 18**
<!-- Impact: 最高 - 生産性向上の核心 | Effort: 高い - AI統合＋学習アルゴリズム＋3階層管理 | Differentiation: 高い - メンション取り込み＋階層管理で独自性 | Demo: 最高 - 視覚的で分かりやすい日常業務改善 -->
<!-- AI Priority Algorithm: score = (due_date_urgency * 0.6) + (completion_pattern_weight * 0.4) + context_boost -->

**User Story / ユーザーストーリー:** As a user, I want an intelligent task management system that captures mentions, organizes tasks hierarchically, and provides proactive assistance, so that I can focus on execution rather than task administration.
ユーザーとして、メンションを取り込み、タスクを階層的に整理し、プロアクティブな支援を提供するインテリジェントなタスク管理システムを求め、タスク管理ではなく実行に集中したい。

#### Acceptance Criteria / 受け入れ基準
1. **GIVEN** it's 7:30 AM or user executes /todo today **WHEN** the command is triggered **THEN** the system SHALL display top 5 priority tasks as cards with 🔥⚡ badges, due dates, 📂 folder buttons, ⚠️ for urgent/overdue tasks, and ✅ completion buttons
   **前提条件** 朝7:30または/todo todayコマンド実行 **条件** トリガーされた時 **結果** システムは🔥⚡バッジ、期限、📂フォルダボタン、緊急/期限切れタスクの⚠️、✅完了ボタン付きの優先タスクTop5をカード表示する
2. **GIVEN** a task has associated folder URLs (Drive/Notion/Dropbox) **WHEN** 📂 button is clicked **THEN** the system SHALL open the URL in a new browser tab and log the access timestamp
   **前提条件** タスクに関連フォルダURL（Drive/Notion/Dropbox）がある **条件** 📂ボタンがクリックされた時 **結果** システムは新しいブラウザタブでURLを開きアクセスタイムスタンプを記録する
3. **GIVEN** a P1 priority task exists **WHEN** it's 9:00 AM the day before due date OR 3 hours before user's first unscheduled consecutive 3+ hour slot detected by FreeBusy API **THEN** the system SHALL send DM reminders and stop when task is completed or snoozed
   **前提条件** P1優先度タスクが存在する **条件** 期限前日9:00またはFreeBusy APIで検出される未スケジュール連続3時間以上の最初のスロットの3時間前 **結果** システムはDMリマインダーを送信し、タスク完了またはスヌーズで停止する
4. **GIVEN** user is mentioned in a message **WHEN** the mention is detected **THEN** the system SHALL create an inbox entry and show ephemeral 3-button interface: ＋Add Task, ✕Ignore, ⚡Quick Reply with AI-generated response options
   **前提条件** ユーザーがメッセージでメンションされる **条件** メンションが検出された時 **結果** システムはinboxエントリを作成し、AI生成返信選択肢付きの3ボタン（＋タスク追加、✕無視、⚡即返信）をエフェメラル表示する
4.1. **GIVEN** user executes `/todo today` and has no active tasks **WHEN** the command is processed **THEN** the system SHALL automatically collect mentions from the past 3 business days (Monday-Friday, excluding weekends) and display them as inbox entries with the same 3-button interface
   **前提条件** ユーザーが`/todo today`を実行し、アクティブなタスクがない **条件** コマンドが処理された時 **結果** システムは過去3営業日（月-金曜日、土日を除く）のメンションを自動収集し、同じ3ボタンインターフェースでinboxエントリとして表示する
5. **GIVEN** inbox items remain unprocessed **WHEN** 2 business days (Monday-Friday, 48 hours elapsed excluding weekends) have passed **THEN** the system SHALL automatically delete the inbox entry and log the action to user's DM
   **前提条件** inboxアイテムが未処理のまま **条件** 2営業日（月-金曜日、48時間経過かつ土日をスキップ）経過した時 **結果** システムは自動的にinboxエントリを削除しユーザーのDMにアクションをログ記録する
5.1. **GIVEN** user executes /todo today and no tasks exist **WHEN** the command is triggered **THEN** the system SHALL automatically collect mentions from the past 3 business days and display them as inbox items with 3-button interface (＋Add Task, ✕Ignore, ⚡Quick Reply)
   **前提条件** ユーザーが/todo todayを実行しタスクが存在しない **条件** コマンドがトリガーされた時 **結果** システムは過去3営業日のメンションを自動収集し、3ボタンインターフェース（＋タスク追加、✕無視、⚡即返信）でinboxアイテムとして表示する
6. **GIVEN** tasks are being organized **WHEN** project/client names are detected **THEN** the system SHALL suggest 3-tier hierarchy (Project ▸ Mid-task ▸ Sub-task) and auto-promote when sub-tasks exceed 5 items OR when mid-task is unassigned
   **前提条件** タスクが整理されている **条件** プロジェクト/顧客名が検出された時 **結果** システムは3階層（プロジェクト▸中タスク▸小タスク）を提案し、小タスクが5件超過または中タスク未設定時に自動昇格する
7. **GIVEN** a presentation/document creation task is identified **WHEN** the task is created **THEN** the system SHALL search recent 30-day files in Notion/Drive/Dropbox and auto-summarize: ①Project name ②Background ③Participants ④Issues
   **前提条件** プレゼン/資料作成タスクが識別される **条件** タスクが作成された時 **結果** システムはNotion/Drive/Dropboxの直近30日ファイルを検索し①プロジェクト名②背景③参加者④課題を自動要約する
8. **GIVEN** a large task needs breakdown **WHEN** user clicks "break" button **THEN** the system SHALL generate 5-6 sub-tasks using templates or similar project patterns via vector search
   **前提条件** 大きなタスクの分割が必要 **条件** ユーザーが「break」ボタンをクリックした時 **結果** システムはテンプレートまたはベクター検索による類似プロジェクトパターンで5-6個の小タスクを生成する
9. **GIVEN** daily/weekly reporting is scheduled **WHEN** 8:00 AM daily or Monday 8:00 AM weekly **THEN** the system SHALL generate progress reports (completed/remaining/new tasks) and send to specified channels
   **前提条件** 日次/週次レポートがスケジュールされている **条件** 毎日8:00または月曜8:00 **結果** システムは進捗レポート（完了/残/新規タスク）を生成し指定チャンネルに送信する
10. **GIVEN** user completes a task or uses quick reply **WHEN** response is needed **THEN** the system SHALL learn from user's recent 100 messages and generate 3 draft reply options in user's writing style, inserting them into the message input field without auto-sending
    **前提条件** ユーザーがタスク完了または即返信を使用 **条件** 返信が必要な時 **結果** システムはユーザーの直近100メッセージから学習し、自動送信せずにメッセージ入力欄にユーザーの文体で3つの返信下書き選択肢を挿入する

### Requirement 3: Smart Calendar Integration / スマートカレンダー統合
**Score: Impact(5) + Effort(4) + Differentiation(4) + Demo(4) = 17**
<!-- Impact: 最高 - 日程調整の時間を劇的短縮 | Effort: 高い - NLP + Google Calendar API統合 | Differentiation: 高い - メッセージから直接カレンダー操作 | Demo: 高い - 視覚的で分かりやすい -->

**User Story / ユーザーストーリー:** As a user, I want to quickly check my calendar availability and coordinate meetings directly from Slack messages, so that I can efficiently manage scheduling without switching applications.
ユーザーとして、Slackメッセージから直接カレンダーの空き状況を確認し会議調整を行い、アプリケーションを切り替えることなく効率的にスケジュール管理をしたい。

#### Acceptance Criteria / 受け入れ基準
1. **GIVEN** a message contains date/time proposals **WHEN** user selects "🗓 Open in Calendar" action **THEN** the system SHALL display an ephemeral list of candidates with availability status (✅❌), travel indicators (✈️🚶), and warning icons (⚠️ for events within 1 hour before/after)
   **前提条件** メッセージに日時提案が含まれる **条件** ユーザーが「🗓 Open in Calendar」アクションを選択した時 **結果** システムは空き状況（✅❌）、移動表示（✈️🚶）、警告アイコン（前後1時間以内のイベントに⚠️）付きの候補リストをエフェメラル表示する
2. **GIVEN** candidate list is displayed **WHEN** user clicks on a time slot **THEN** the system SHALL open Google Calendar week view for that specific week in a new browser tab
   **前提条件** 候補リストが表示されている **条件** ユーザーが時間枠をクリックした時 **結果** システムはその特定週のGoogle Calendar週ビューを新しいブラウザタブで開く
3. **GIVEN** user selects one or more candidates **WHEN** "👍 OK返信下書き" is clicked **THEN** the system SHALL generate a draft reply with selected time slots and insert it into the message input field without auto-sending
   **前提条件** ユーザーが1つ以上の候補を選択する **条件** 「👍 OK返信下書き」がクリックされた時 **結果** システムは選択された時間枠で返信下書きを生成し、自動送信せずにメッセージ入力欄に挿入する
4. **GIVEN** user enables tentative booking option **WHEN** candidates are selected **THEN** the system SHALL create tentative events in user's calendar with sequential naming (仮1/N, 仮2/N) for easy identification and cleanup
   **前提条件** ユーザーが仮予定オプションを有効にする **条件** 候補が選択された時 **結果** システムは識別と削除を容易にするため連番命名（仮1/N, 仮2/N）でユーザーのカレンダーに仮予定を作成する
5. **GIVEN** user enables invitation sending option **WHEN** meeting is confirmed **THEN** the system SHALL send Google Calendar invitations to detected participants and automatically remove other tentative bookings
   **前提条件** ユーザーが招待送信オプションを有効にする **条件** 会議が確定した時 **結果** システムは検出された参加者にGoogle Calendar招待を送信し、他の仮予定を自動削除する
6. **GIVEN** candidate evaluation is performed **WHEN** analyzing message content **THEN** the system SHALL detect travel keywords (出張, 大阪, 新幹線, 空港) and display appropriate icons (✈️ for travel, 🚶 for transport)
   **前提条件** 候補評価が実行される **条件** メッセージ内容を分析する時 **結果** システムは移動キーワード（出張、大阪、新幹線、空港）を検出し適切なアイコン（移動は✈️、交通手段は🚶）を表示する
7. **GIVEN** existing tentative events are found **WHEN** confirming a meeting **THEN** the system SHALL offer to convert existing tentative to confirmed and automatically clean up related tentative events
   **前提条件** 既存の仮予定が見つかる **条件** 会議を確定する時 **結果** システムは既存仮予定の確定変換を提案し、関連する仮予定を自動削除する

### Requirement 4: Emotional Intelligence & Context Adaptation / 感情知能とコンテキスト適応
**Score: Impact(4) + Effort(4) + Differentiation(4) + Demo(2) = 14**
<!-- Impact: 高い - ストレス軽減は個人秘書のコア価値 | Effort: 高い - 感情分析AI必要 | Differentiation: 高い - 他にない独自機能 | Demo: 低い - 効果が見えにくい -->

**User Story / ユーザーストーリー:** As a user, I want my assistant to understand my emotional state and workload, so that it can adapt its communication style and suggestions appropriately.
ユーザーとして、アシスタントに感情状態と作業負荷を理解してもらい、コミュニケーションスタイルと提案を適切に適応させたい。

#### Acceptance Criteria / 受け入れ基準
1. **GIVEN** the user seems stressed or overwhelmed based on message patterns **WHEN** responding **THEN** the system SHALL offer simplified responses and stress-reduction suggestions
   **前提条件** メッセージパターンからユーザーがストレスを感じているか圧倒されている **条件** 応答する時 **結果** システムは簡潔な応答とストレス軽減提案を提供する
2. **GIVEN** the user is in a focused work session **WHEN** notifications are due **THEN** the system SHALL minimize interruptions and batch non-urgent notifications
   **前提条件** ユーザーが集中作業セッション中 **条件** 通知が必要な時 **結果** システムは中断を最小化し緊急でない通知をバッチ処理する

### Requirement 5: Cross-Platform Context Bridge / クロスプラットフォームコンテキストブリッジ
**Score: Impact(4) + Effort(3) + Differentiation(3) + Demo(3) = 13**
<!-- Impact: 高い - Gmail/Calendar/Drive/Notionは業務必須 | Effort: 中程度 - Google Workspace OAuth一元化で軽量 | Differentiation: 中程度 - 統合秘書体験で差別化 | Demo: 中程度 - メール要約→Slack DMは視覚的 -->

**User Story / ユーザーストーリー:** As a user, I want my assistant to monitor my Google Workspace and Notion activities, so that important information is automatically surfaced in Slack.
ユーザーとして、アシスタントにGoogle WorkspaceとNotionの活動を監視してもらい、重要な情報が自動的にSlackに表示されるようにしたい。

#### Acceptance Criteria / 受け入れ基準
1. **GIVEN** an important email arrives in Gmail **WHEN** detected by the system **THEN** it SHALL send a summary to Slack with "Create Task" and "Remind Later" buttons
   **前提条件** Gmailに重要なメールが届く **条件** システムが検出した時 **結果** 「タスク作成」と「後でリマインド」ボタン付きの要約をSlackに送信する
2. **GIVEN** a Google Docs comment mentions the user **WHEN** the comment is added **THEN** the system SHALL quote the relevant section and offer one-click task creation
   **前提条件** Google Docsのコメントでユーザーがメンションされる **条件** コメントが追加された時 **結果** システムは関連セクションを引用しワンクリックタスク作成を提供する
3. **GIVEN** a calendar event is modified **WHEN** the change occurs **THEN** the system SHALL notify the user and automatically collect related documents
   **前提条件** カレンダーイベントが変更される **条件** 変更が発生した時 **結果** システムはユーザーに通知し関連文書を自動収集する
4. **GIVEN** a Notion page is updated with user mentions **WHEN** the update occurs **THEN** the system SHALL summarize changes and offer task integration
   **前提条件** ユーザーメンション付きでNotionページが更新される **条件** 更新が発生した時 **結果** システムは変更を要約しタスク統合を提供する
5. **GIVEN** Gmail monitoring is active **WHEN** filtering emails **THEN** the system SHALL prioritize emails with "Important" label, "Action Required" keywords, or from VIP senders list
   **前提条件** Gmail監視がアクティブ **条件** メールをフィルタリングする時 **結果** システムは「重要」ラベル、「要対応」キーワード、またはVIP送信者リストからのメールを優先する
6. **GIVEN** Notion integration is configured **WHEN** system starts **THEN** it SHALL validate NOTION_TOKEN environment variable and establish secure API connection
   **前提条件** Notion統合が設定されている **条件** システム開始時 **結果** NOTION_TOKEN環境変数を検証し、安全なAPI接続を確立する

## Booster Requirements / ブースター要件 (8-11 points)

### Requirement 6: Communication Pattern Analysis / コミュニケーションパターン分析
**Score: Impact(3) + Effort(3) + Differentiation(3) + Demo(2) = 11**
<!-- Impact: 中程度 - 洞察は有用だが必須ではない | Effort: 中程度 - データ分析ロジック必要 | Differentiation: 中程度 - 類似サービスあり | Demo: 低い - グラフ表示程度 -->

**User Story / ユーザーストーリー:** As a user, I want insights into my communication patterns and productivity, so that I can optimize my work habits.
ユーザーとして、コミュニケーションパターンと生産性の洞察を得て、作業習慣を最適化したい。

#### Acceptance Criteria / 受け入れ基準
1. **GIVEN** a user requests productivity insights **WHEN** the command is issued **THEN** the system SHALL provide weekly productivity insights and communication pattern analysis
   **前提条件** ユーザーが生産性洞察を要求する **条件** コマンドが発行された時 **結果** システムは週次生産性洞察とコミュニケーションパターン分析を提供する
2. **GIVEN** patterns indicate inefficiency **WHEN** analysis is complete **THEN** the system SHALL suggest specific workflow improvements
   **前提条件** パターンが非効率性を示す **条件** 分析が完了した時 **結果** システムは具体的なワークフロー改善を提案する

### Requirement 7: Communication Pattern Analysis / コミュニケーションパターン分析
**Score: Impact(3) + Effort(3) + Differentiation(3) + Demo(3) = 12**
<!-- Impact: 中程度 - 洞察は有用だが必須ではない | Effort: 中程度 - データ分析ロジック必要 | Differentiation: 中程度 - 類似サービスあり | Demo: 中程度 - グラフ表示で視覚的 -->

**User Story / ユーザーストーリー:** As a user, I want insights into my communication patterns and productivity, so that I can optimize my work habits.
ユーザーとして、コミュニケーションパターンと生産性の洞察を得て、作業習慣を最適化したい。

#### Acceptance Criteria / 受け入れ基準
1. **GIVEN** a user requests productivity insights **WHEN** the command is issued **THEN** the system SHALL provide weekly productivity insights with bar charts (completion count), pie charts (category breakdown), and timeline graphs (weekly trends)
   **前提条件** ユーザーが生産性洞察を要求する **条件** コマンドが発行された時 **結果** システムは棒グラフ（完了数）、円グラフ（カテゴリ別）、時系列グラフ（週次推移）付きの週次生産性洞察を提供する
2. **GIVEN** patterns indicate inefficiency **WHEN** analysis is complete **THEN** the system SHALL suggest specific workflow improvements
   **前提条件** パターンが非効率性を示す **条件** 分析が完了した時 **結果** システムは具体的なワークフロー改善を提案する



## Future Requirements / 将来要件 (≤7 points)

### Requirement 8: Voice-to-Action Processing / 音声からアクション処理
**Score: Impact(2) + Effort(4) + Differentiation(2) + Demo(3) = 11**
<!-- Impact: 低い - 便利だが必須ではない | Effort: 高い - 音声認識・処理が複雑 | Differentiation: 低い - 既存音声アシスタント多数 | Demo: 中程度 - 音声デモは印象的 -->

**User Story / ユーザーストーリー:** As a user, I want to interact with my assistant through voice messages, so that I can multitask more effectively.
ユーザーとして、音声メッセージでアシスタントと対話し、より効果的にマルチタスクを行いたい。

#### Acceptance Criteria / 受け入れ基準
1. **GIVEN** a user sends a voice message **WHEN** the audio is received **THEN** the system SHALL transcribe and process the request as if it were text
   **前提条件** ユーザーが音声メッセージを送信する **条件** 音声が受信された時 **結果** システムは音声を文字起こしし、テキストと同様にリクエストを処理する

### Requirement 9: Advanced Context Intelligence / 高度コンテキスト知能
**Score: Impact(3) + Effort(5) + Differentiation(4) + Demo(2) = 14**
<!-- Impact: 中程度 - 高度な統合価値 | Effort: 最高 - Cross-Platform Context Bridgeの高度推論機能、RAG拡張時に着手 | Differentiation: 高い - 複雑なコンテキスト理解 | Demo: 低い - 技術的すぎる -->

**User Story / ユーザーストーリー:** As a user, I want my assistant to understand complex context from emails, documents, and cross-platform activities for comprehensive assistance.
ユーザーとして、メール、文書、クロスプラットフォーム活動から複雑なコンテキストを理解し、包括的な支援を提供してもらいたい。

#### Acceptance Criteria / 受け入れ基準
1. **GIVEN** complex cross-platform data is available **WHEN** context analysis is requested **THEN** the system SHALL provide comprehensive insights using RAG (Retrieval-Augmented Generation) technology
   **前提条件** 複雑なクロスプラットフォームデータが利用可能 **条件** コンテキスト分析が要求された時 **結果** システムはRAG（検索拡張生成）技術を使用して包括的な洞察を提供する

---

## Appendix / 付録

### Slash Commands / スラッシュコマンド一覧
- `/todo today` - Display top 5 priority tasks / 優先タスクTop5を表示
- `/focus on [duration]` - Enable focus mode / 集中モードを有効化
- `/lang [en|ja]` - Switch language preference / 言語設定を切り替え
- `/prep [eventID]` - Prepare meeting materials / 会議資料を準備
- `/help` - Show available commands and features / 利用可能なコマンドと機能を表示

### Glossary / 用語集
- **仮予定 / Tentative Event**: Google Calendar event with `transparency: 'opaque', responseStatus: 'tentative'`
- **営業日 / Business Days**: Monday through Friday, excluding weekends
- **FreeBusy**: Google Calendar API for checking availability without accessing event details

### Technical Implementation Notes / 技術実装メモ
- **Google Calendar Week View URL**: `https://calendar.google.com/calendar/u/0/r/week/YYYY/MM/DD`
- **Priority Score Algorithm**: `score = (due_date_urgency * 0.6) + (completion_pattern_weight * 0.4) + context_boost`
- **Travel Keywords**: 出張, 大阪, 名古屋, 福岡, 空港, 新幹線, 移動, 飛行機 (configurable via YAML)
- **Response Time Targets**: Basic operations ≤3s, Complex analysis ≤30s with progress indicators
- **Timezone**: All scheduled times (7:30 AM, 8:00 AM, 9:00 AM) use user's Slack timezone setting
- **Quick Reply Learning**: Includes both DM and public channel messages from user (last 100 messages)
- **FreeBusy Scope**: Primary calendar only (expandable to multiple calendars in Booster phase)
- **Search Permissions**: User OAuth delegation for Drive/Dropbox/Notion access (not BOT service account)
- **Google Calendar Tentative API**: `transparency: 'opaque', responseStatus: 'tentative'` for 仮予定