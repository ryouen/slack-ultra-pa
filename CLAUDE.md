# Claude Code セッション引き継ぎガイド

このファイルは、Claude Codeを再起動した際に、素早く状況を把握し作業を継続するためのものです。

## 🚀 クイックスタート

新しいセッションを開始した際は、以下のコマンドを実行してください：

```
現在の状況を教えてください。CLAUDE.mdを確認してください。
```

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
- **Steering**: `.kiro/specs/slack-personal-assistant/`
  - `steering.md` - プロジェクト方向性
  - `design.md` - 設計思想
  - `tasks.md` - タスク一覧と進捗
- **Claudeドキュメント**: `docs/claude/`
  - 索引: `DOCUMENT_INDEX.md`

## 📌 現在の状況（2025-07-26更新）

### 直近の作業内容
- **Deep Link機能の修正と改善**
  - Socket ModeでのteamId取得方法を調査・修正
  - `slack://`プロトコルでスレッドパネルを直接開く機能を実装
  - 詳細: `docs/claude/work-reports/TASK_DEEP_LINK_FIX_COMPLETION_REPORT.md`

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
- **Deep Link**: 非公式URL形式（`slack://`）を使用。将来的に動作しなくなる可能性あり
- **teamId取得**: イベントタイプにより取得方法が異なる
  - Message Event: `body.team_id`
  - Block Actions: `body.team.id`

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

### Kiroタスクから（`.kiro/specs/slack-personal-assistant/tasks.md`より）
- **Sprint 2進行中**: 現在62%→69%完了
- **Task 3 (OAuth)**: 現在進行中の最優先タスク
- **Task 10 (Smart Reply)**: Deep Link実装で一部完了

### 直近の技術的タスク
1. **プライベートチャンネルでのDeep Link動作検証**
2. **クロスプラットフォームQAテスト**（Windows/Mac/iOS/Android）
3. **エラーハンドリングの強化**

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

---
*最終更新: 2025-07-26 by Claude Code*