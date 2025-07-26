# Claude Code セッション引き継ぎガイド

このファイルは、Claude Codeを再起動した際に、素早く状況を把握し作業を継続するためのものです。

## 🚀 クイックスタート

新しいセッションを開始した際は、以下のコマンドを実行してください：

```
現在の状況を教えてください。CLAUDE.mdを確認してください。
```

より詳細な状況把握が必要な場合は、以下のコマンドを使用してください：

```
フォルダの必要なドキュメントとコードを細大漏らさずUltrathinkして読み、状況把握に努めてください
```

このコマンドは以下を実行します：
- Kiroのスペック文書を徹底的に分析
  - `.kiro/specs/slack-personal-assistant/` - design.md, tasks.md, requirements.md
  - `.kiro/steering/` - project-standards.md
- Claudeドキュメントを確認
  - `docs/claude/DOCUMENT_INDEX.md` - ドキュメント索引
  - `docs/claude/planning/CLAUDE_KIRO_COLLABORATION_PROTOCOL.md` - 協働プロトコル
  - `docs/claude/work-reports/` - 最新の作業レポート
- 主要なソースコードの現状を把握
- git statusで示された変更ファイルを確認

## 🎯 重要な前提事項

### Kiroとの共同作業体制
- **Kiro**: プロダクトオーナー、steering/design/taskの意思決定者
- **Claude**: 実装担当、技術的アドバイザー
- **協働プロトコル**: `docs/claude/planning/CLAUDE_KIRO_COLLABORATION_PROTOCOL.md`

### プロジェクト方針
- **誤爆ゼロ原則**: Botは送信しない、ユーザーが手動で送信
- **段階的リリース**: MVP→機能拡張→完成形
- **ユーザー体験優先**: シンプルで使いやすいUI

### ドキュメントの場所
- **Kiroスペック**: `.kiro/specs/slack-personal-assistant/`
  - `design.md` - システム設計とアーキテクチャ
  - `tasks.md` - タスク一覧と進捗
  - `requirements.md` - 要件定義
- **プロジェクト標準**: `.kiro/steering/`
  - `project-standards.md` - 技術スタック・コード標準
- **Claudeドキュメント**: `docs/claude/`
  - 索引: `DOCUMENT_INDEX.md`
  - **新規**: `troubleshooting/oauth-common-errors.md` - OAuthエラー解決ガイド

## 📌 現在の状況（2025-07-26更新）

### 🧪 OAuth Phase 1テスト実行中
- **o3-proによるテスト計画**: 段階的OAuth移行のための包括的テスト
- **進捗**: A-1テスト完了、A-2テスト実装修正中
- **アドバイスAIからの最新指摘**: 
  - Bolt v3制約（clientId/clientSecret/installationStoreとauthorizeの排他性）は理解済み
  - ポート3000統合アプローチを採用（ngrok URL変更回避のため）
  - 追加のチェックポイントを確認中

#### テスト進捗状況
| テスト | 状態 | 詳細 |
|--------|------|------|
| A-1: 既存Botトークン | ✅ 完了 | `/todo`コマンドが環境変数トークンで正常動作 |
| A-2: OAuth新ワークスペース | 🔧 実装中 | OAuth認証成功、DB保存エラー対応中 |
| A-3: 共存動作(Canary) | ⏳ 待機 | 環境変数とOAuthトークンの共存テスト |
| A-4: トークン無効化 | ⏳ 待機 | Bot削除→エラー確認→再インストール |

### 直近の作業内容
- **OAuth Phase 1 A-2テスト実施（2025-07-26）**
  - OAuth認証フロー成功: ユーザーが"Allow"クリック、Botトークン受信
  - 複数のエラーを段階的に解決:
    - InstallProviderのlogger互換性問題
    - receiver変数のスコープ問題  
    - HTTPサーバー起動問題（ポート指定）
    - InstallURLOptions設定エラー
    - OAuthコールバックURL不一致
    - redirectUri必須パラメータ追加
  - **現在の課題**: Prismaデータベースエラー（enterpriseId null問題）
    - 複合ユニークキー`teamId_enterpriseId`がnullを扱えない
    - インストールデータは正常に受信（teamId: TL2EU3JPP）
  - 詳細: `docs/claude/work-reports/2025-07-26_oauth_phase1_test_report.md`

- **/todoと/mentionコマンドの分離実装**
  - `/todo`からメンション表示を削除（src/routes/index.ts:485-543行目）
  - 各コマンドの責務を明確化

- **Deep Link機能の修正と改善**
  - Socket ModeでのteamId取得方法を調査・修正
  - `slack://`プロトコルでスレッドパネルを直接開く機能を実装
  - 詳細: `docs/claude/work-reports/2025-07-26_work_report.md`

### アクティブな機能
1. **Smart Reply（Quick Reply）**
   - メンション検出→AI分析→返信案生成
   - 4象限返信案（丁寧/カジュアル × 承諾/拒否）
   - スレッドへの1クリックジャンプ（Deep Link）

2. **メンション収集**
   - リアルタイムでメンションを検出・保存
   - `/mention`コマンドで一覧表示
   - 既読フェードアウト効果

### 重要な注意事項
- **OAuth実装**:
  - Bolt v3制約: clientId/clientSecret/installationStoreとauthorizeは同時指定不可
  - ExpressReceiverには基本設定のみ、OAuth設定はInstallProviderで分離
  - 環境変数トークンはフォールバック用として残す
  - **新バージョンSlack OAuth**: redirectUriが必須パラメータに
  - **Prismaスキーマ制約**: 複合ユニークキーでnull値を扱えない問題あり
  - **よくあるエラー**: `docs/claude/troubleshooting/oauth-common-errors.md`参照
  - **アドバイスAI最新指摘事項（2025-07-26）**:
    - ポート3000統合で/apiと/slack/*が共存（CORS/bodyParser競合注意）
    - SLACK_STATE_SECRETはURL安全文字列推奨（英数字+-_）※現在64文字の安全な文字列を使用中
    - authorize関数でDB→環境変数のフォールバック順を確認
    - ngrok URLをSlack App設定の3箇所すべてに反映必要
    - InstallProviderのdirectInstall=trueは外す検討（CSRF検知エラー回避）
    - bodyParser二重読み込み防止（/apiにのみ適用、/slackは除外）
    - authorize経路の可視化（logger.debug追加推奨）
- **Deep Link**: 非公式URL形式（`slack://`）を使用。将来的に動作しなくなる可能性あり
- **teamId取得**: イベントタイプにより取得方法が異なる
  - Message Event: `body.team_id`
  - Block Actions: `body.team.id`
- **Redis設定**: BullMQには`maxRetriesPerRequest: null`が必須
- **認証トークン**: Slackトークンが急に変更される場合がある（要確認）

## 🗂️ プロジェクト構造

```
slack-ultra-pa/
├── src/
│   ├── handlers/quickReplyHandler.ts    # メインのイベントハンドラー
│   ├── ui/SmartReplyUIBuilder.ts       # UI構築
│   ├── llm/MessageAnalyzer.ts          # AI分析
│   └── utils/threadDeepLink.ts         # Deep Link変換
├── docs/
│   └── claude/                          # Claude作成ドキュメント
│       ├── DOCUMENT_INDEX.md            # ドキュメント索引
│       ├── work-reports/                # 作業レポート
│       ├── implementation/              # 実装ガイド
│       ├── analysis/                    # 分析レポート
│       └── planning/                    # 計画文書
└── CLAUDE.md                            # このファイル
```

## 🔧 よく使うコマンド

```bash
# 開発サーバー起動
npm run dev

# ビルド
npm run build

# テスト
npm test

# Deep Link変換テスト
node scripts/test-thread-deep-link-simple.js
```

## 📝 作業を再開する際のチェックリスト

1. [ ] このファイル（CLAUDE.md）を読む
2. [ ] Kiroの最新タスクを確認: `.kiro/specs/slack-personal-assistant/tasks.md`
3. [ ] Claudeの即時タスクを確認: `docs/claude/planning/KIRO_IMMEDIATE_TASKS.md`
4. [ ] 直近の作業レポートを確認: `docs/claude/work-reports/`
5. [ ] git statusで変更を確認
6. [ ] npm run devでサーバーが起動するか確認

## 🎯 次の作業候補

### OAuth Phase 1テスト継続
1. **A-2テストのDB保存エラー修正**:
   - [ ] Prismaスキーマ確認（複合ユニークキー制約）
   - [ ] SlackInstallationStore.tsでenterpriseId null処理追加
   - [ ] DB保存成功後、`/help`コマンドで動作確認
2. **A-2テスト完了**: OAuth新ワークスペースインストール確認
3. **A-3テスト実行**: Canary共存動作テスト
   - `SLACK_OAUTH_ENABLED=true` + 環境変数トークン残し
   - 旧WS: `/todo`が環境変数トークンで動作
   - 新WS: `/todo`がOAuthトークンで動作
4. **A-4テスト実行**: トークン無効化と再インストール確認
5. **自動テスト追加**: SlackInstallationStore roundtrip, authorize fallback
6. **Runtime健康チェック**: Redis/BullMQ/Slack Web API確認

### Kiroタスクから（`.kiro/specs/slack-personal-assistant/tasks.md`より）
- **Sprint 2進行中**: 現在62%→69%完了
- **Task 3 (OAuth)**: Phase 1テスト実行中
- **Task 10 (Smart Reply)**: Deep Link実装で一部完了

### 直近の技術的タスク
1. **OAuth Phase 1完了後**: フォルダアクセス機能のinvalid_authエラー修正
2. **Deep Linkスレッドパネル自動表示問題**（低優先度、現状維持）
3. **フォルダ選定基準の明確化**

## 💡 Tips

- ドキュメントは`docs/claude/DOCUMENT_INDEX.md`で整理されています
- 技術的な詳細は各実装ドキュメントを参照
- 不明な点は関連ファイルのコメントを確認

## 🔄 自動更新について

### 更新タイミング
Claudeは以下のタイミングでこのファイルを自動更新します：
- 重要なタスク完了時
- 新機能の実装時
- プロジェクト構造の変更時
- セッション終了時（可能な限り）

### 更新される内容
- 「現在の状況」セクション
- 「次の作業候補」セクション
- 重要な注意事項
- 最終更新日時

### 手動更新のリクエスト
「現在の状況をCLAUDE.mdに更新してください」と伝えることで、いつでも更新を依頼できます。

## 📋 OAuth移行テスト計画詳細

### テストシナリオ
1. **A-1: 既存Botトークンテスト** ✅
   - 事前条件: `SLACK_OAUTH_ENABLED=false`, `SLACK_BOT_TOKEN`設定済み
   - 期待結果: レスポンス200、authorizeログなし

2. **A-2: OAuth新ワークスペース** 🔧
   - 事前条件: `SLACK_OAUTH_ENABLED=true` (他は空にしない)
   - 手順: `/slack/install`→インストール
   - 期待結果: SlackInstallationにレコード保存、`/help`成功

3. **A-3: 共存動作(Canary)** ⏳
   - 設定: `SLACK_OAUTH_ENABLED=true` + `SLACK_BOT_TOKEN`残す
   - 期待: 両方のauthorizeソースがログに表示

4. **A-4: トークン無効化** ⏳
   - Bot削除→`invalid_auth`→レコード削除→401エラー→再インストール

### デバッグTips
- `DEBUG="bolt:*"` でBoltのauthorize経路を追跡
- `npx prisma studio` でSlackInstallationをリアルタイム確認

### A-2テスト時のエラーと解決策
1. **OAuth initialization failed**
   - 原因: ポート設定の不一致
   - 解決: OAuthルートをExpressReceiver (port 3000)に統合 ✅

2. **ngrok転送先エラー (ERR_NGROK_8012)**
   - 原因: ngrokがポート3000に転送、OAuthはポート3100
   - 解決: OAuthルートをポート3000のアプリに統合 ✅

3. **ポート使用中エラー (EADDRINUSE)**
   - 原因: 前のプロセスがポートを占有
   - 解決: `netstat -ano | findstr :3100` でPID確認、`taskkill`で終了

4. **予想される追加エラー（アドバイスAIより）**
   - **invalid_state**: state文字列の不一致（URL安全文字列でない場合）
   - **not_authed**: Bot User ID解決失敗（OAuth後の初期化問題）
   - **CSRF検知エラー**: directInstall=trueでstateパラメータ無し
   - **bodyParser競合**: raw-body二重読み込みエラー

### アドバイスAIからの追加チェックポイント
1. **bodyParser競合**
   - /apiルートにbodyParser.json()適用
   - /slackルートには適用しない（raw-body使用）

2. **デバッグ強化**
   - `DEBUG=bolt:*`でBolt経路確認
   - InstallProviderに`logger: console`追加
   - authorize関数にDB/ENV判別ログ追加

3. **Slack App設定確認**
   - OAuth Redirect URL: `/slack/oauth/callback`
   - Event Subscriptions: `/slack/events`
   - Interactivity: `/slack/actions`

### 🔄 サーバー再起動方法
```bash
# Windowsの場合
powershell -Command "Get-Process -Name node -ErrorAction SilentlyContinue | Stop-Process -Force"
npm run dev

# ポートが使用中の場合
netstat -ano | findstr :3000
netstat -ano | findstr :3100
taskkill /PID <PID> /F
```

## 🎯 現在の作業状況（2025-07-26 17:00更新）

### ✅ A-2テスト前の最終確認チェックリスト完了

#### 実施結果サマリ
1. **ポート3100の重複リッスン削除** ✅
   - 問題発見: src/app.ts:110-116行目でポート3100のExpressサーバーが動作
   - 修正実施: APIルートをreceiver.app（ポート3000）に統合
   - 結果: OAuth、API、Slackイベントがすべてポート3000で動作

2. **bodyParser設定確認** ✅
   - src/app.ts:61行目で/apiパスのみにexpress.json()を適用
   - Slackルート（/slack/*）はraw-bodyを使用するため除外

3. **OAuth Redirect URLの一致確認** ✅
   - .env: `/slack/oauth/callback`
   - oauthIntegration.ts: `/slack/oauth/callback`
   - 完全に一致

4. **authorize関数にデバッグログ追加** ✅
   - 既に実装済み（slackAuthorize.ts:18,35,47行目）
   - OAuth: `[authorize] team ${teamId} via DB (OAuth)`
   - ENV: `[authorize] team ${teamId} via ENV (fallback)`
   - エラー: `[authorize] team ${teamId} - NO AUTH AVAILABLE`

5. **ngrok URL設定箇所の3点確認** ✅
   - Slack App管理画面で以下の設定が必要:
   - OAuth Redirect URL: `https://6c6f7ffe797a.ngrok-free.app/slack/oauth/callback`
   - Event Subscriptions: `https://6c6f7ffe797a.ngrok-free.app/slack/events`
   - Interactivity: `https://6c6f7ffe797a.ngrok-free.app/slack/actions`

6. **Prismaマイグレーション確認** ✅
   - マイグレーションは最新状態
   - SlackInstallationテーブルが存在

7. **InstallProviderのdirectInstall設定確認** ✅
   - directInstallは使用していない（推奨通り）

8. **DEBUG環境変数の準備** ✅
   - テスト実行時に`set DEBUG=bolt:*`を使用

#### 🛠️ 修正したファイル
- **src/app.ts**: ポート3100の削除、APIルート統合

### アドバイスAIからの最新フィードバック対応
1. **実装状況の確認完了**:
   - ポート3000統合アプローチを採用（ngrok URL変更回避）
   - authorize関数は正しくOAuth→環境変数フォールバック実装済み
   - SLACK_STATE_SECRETは64文字の安全な文字列使用中

2. **A-2テスト前に必要な追加対応**:
   - bodyParser設定の明示的な分離（/apiのみ適用）→ 実装済み
   - authorize関数へのデバッグログ追加 → 次に実施
   - InstallProviderのdirectInstall設定確認 → 確認予定
   - ポート3100の完全な削除確認 → 完了

### 🚀 A-2テスト実行状況（2025-07-26 17:20）

#### ✅ OAuth認証フロー成功
- ユーザーが"Allow"をクリック
- Botトークン受信: `xoxb-682504120805-9257602524080-HOOBYy3jqaBRVZj27QtvU6c2`
- Team ID: TL2EU3JPP

#### 🔧 実行時エラーと修正（時系列順）

##### 段階1: サーバー起動時のエラー
1. **`this.logger.getLevel is not a function`**
   - 修正: InstallProviderからlogger設定を削除（oauthIntegration.ts:48）

2. **`receiver is not defined`**
   - 修正: receiver変数をグローバルスコープで宣言（app.ts:19）

##### 段階2: ngrok接続エラー
3. **`ERR_NGROK_8012`**
   - 修正: `app.start(config.server.port)`にポート指定（app.ts:107）

##### 段階3: OAuth URL生成エラー
4. **`slack_oauth_generate_url_error`**
   - 修正: scopesをinstallUrlOptions内に移動（oauthIntegration.ts:63-82）

##### 段階4: コールバック処理エラー
5. **`Cannot GET /oauth/redirect`**
   - 修正: 両方のパスを処理（oauthIntegration.ts:100-138）

6. **`slack_oauth_unknown_error`**
   - 修正: redirectUriを追加（oauthIntegration.ts:64）

##### 段階5: データベース保存エラー（現在）
7. **Prisma複合キーエラー**
   - 状態: enterpriseId=nullで複合ユニークキー失敗
   - 次の対応: SlackInstallationStore.tsの修正が必要

#### 📋 テスト実行手順
1. **サーバー再起動**
   ```powershell
   # Windowsの場合
   powershell -Command "Get-Process -Name node -ErrorAction SilentlyContinue | Stop-Process -Force"
   set DEBUG=bolt:*,express:*
   npm run dev
   ```

2. **期待されるログ**
   ```
   [INFO] OAuth mode enabled, skipping Bot User ID resolution
   [INFO] Slack OAuth available at http://localhost:3000/slack/install
   ```

3. **OAuthインストールテスト**
   - ブラウザで `http://localhost:3000/slack/install` へアクセス
   - Slack認可画面で「Allow」をクリック
   - 成功画面 → Slackへリダイレクト

4. **動作確認**
   - インストールしたワークスペースで:
   - `/help` コマンドを実行 → 200 OK
   - `/mention` コマンドを実行
   - DEBUGログで `authorize: team T123 via DB (OAuth)` を確認

#### 🆘 トラブルシューティング早見表
| 症状 | 原因候補 | 対処 |
|------|----------|------|
| `invalid_state` | STATE_SECRET不一致 | Slack App設定を確認 |
| `missing_scope` | スコープ不足 | Permissionsで追加→再インストール |
| `via ENV`がログに出る | envトークンがロード | .envファイル再確認、新ターミナルで実行 |

#### エラー時の収集情報
1. ブラウザのエラーメッセージ
2. Slackのリターンコード
3. サーバーのスタックトレース

## 📚 関連する重要ドキュメント

### トラブルシューティング
- [`docs/claude/troubleshooting/oauth-common-errors.md`](docs/claude/troubleshooting/oauth-common-errors.md)
  - OAuthエラー早見表
  - 問題解決フローチャート
  - デバッグ方法

### 作業レポート
- [`docs/claude/work-reports/2025-07-26_oauth_phase1_test_report.md`](docs/claude/work-reports/2025-07-26_oauth_phase1_test_report.md)
  - A-2テスト実施詳細
  - エラーパターンと根本原因
  - 実装時のチェックリスト

---
*最終更新: 2025-07-26 17:30 by Claude Code*