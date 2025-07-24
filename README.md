# Slack Personal Assistant AI / Slack個人秘書AI

**"あなたが本来やるべきことに集中するための Slack個人秘書AI"**  
**"Slack Personal Assistant AI to help you focus on what you should really be doing"**

## Core Concept / コアコンセプト

This project implements an intelligent personal assistant integrated with Slack that eliminates friction in task management, scheduling, and communication workflows, enabling users to focus on their core work.

このプロジェクトは、タスク管理、スケジューリング、コミュニケーションワークフローの摩擦を排除し、ユーザーが核となる作業に集中できるようにするSlack統合インテリジェント個人秘書を実装します。

## Value Propositions / 価値提案

| 価値メッセージ / Value Message | 対応機能 / Features | 効果 / Impact |
|---|---|---|
| **"探さない・思い出さない"** | 朝7:30自動タスク表示、📂ワンクリックフォルダアクセス、AI文書要約 | 準備ゼロ秒で仕事開始 |
| **"No Searching, No Remembering"** | 7:30 AM auto task display, 📂 one-click folder access, AI doc summary | Start work in zero seconds |
| **"考える前に提示"** | P1タスク自動リマインド、会議30分前資料準備、プロアクティブ提案 | 通知を見て即行動 |
| **"Proactive Suggestions"** | P1 task auto-reminders, 30-min meeting prep, proactive suggestions | See notification, take immediate action |
| **"日程調整の摩擦ゼロ"** | 🗓メッセージアクション、候補一覧表示、返信下書き自動生成 | カレンダー確認作業を統合 |
| **"Frictionless Scheduling"** | 🗓 message actions, candidate lists, auto reply drafts | Integrate calendar checking workflow |
| **"チャット＝秘書室"** | メンション自動取り込み、AI返信候補、進捗レポート自動投稿 | Slack中心のワークフロー |
| **"Chat as Secretary Office"** | Auto mention capture, AI reply suggestions, auto progress reports | Slack-centered workflow |
| **"集中を守る"** | 集中モード通知制御、感情認識応答調整 | 深い作業への没入支援 |
| **"Protect Focus"** | Focus mode notification control, emotion-aware responses | Support deep work immersion |

## Features / 機能

### MVP Features / MVP機能
- **Smart Task Management**: AI-powered prioritization, 3-tier hierarchy, mention inbox
- **Smart Calendar Integration**: Message actions, availability checking, tentative booking
- **Proactive Intelligence**: Automated reminders, meeting preparation, context awareness
- **Multi-language Support**: Seamless Japanese/English switching

### スマートタスク管理
- AI駆動優先度付け、3階層管理、メンション取り込み
### スマートカレンダー統合
- メッセージアクション、空き状況確認、仮予定管理
### プロアクティブ知能
- 自動リマインダー、会議準備、コンテキスト認識
### 多言語サポート
- 日英シームレス切り替え

## Architecture / アーキテクチャ

- **Frontend**: Slack Block Kit UI
- **Backend**: Node.js + TypeScript + Slack Bolt
- **Database**: PostgreSQL + Prisma ORM
- **Queue**: Redis + BullMQ for async processing
- **AI**: OpenAI API for natural language processing
- **External APIs**: Google Calendar, Drive, Gmail, Notion, Dropbox
- **Observability**: Winston + Loki + Prometheus + Grafana + OpenTelemetry

## Getting Started / 開始方法

### Prerequisites / 前提条件
- Node.js 18+
- PostgreSQL 14+
- Redis 6+
- Slack App with appropriate permissions

### Installation / インストール

```bash
# Clone repository / リポジトリをクローン
git clone <repository-url>
cd slack-personal-assistant

# Install dependencies / 依存関係をインストール
npm install

# Set up environment variables / 環境変数を設定
cp .env.example .env
# Edit .env with your API keys and configuration

# Set up database / データベースをセットアップ
npx prisma migrate dev
npx prisma db seed

# Start development server / 開発サーバーを起動
npm run dev
```

### Environment Variables / 環境変数

```env
# Slack Configuration
SLACK_BOT_TOKEN=xoxb-your-bot-token
SLACK_SIGNING_SECRET=your-signing-secret
SLACK_APP_TOKEN=xapp-your-app-token

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/slack_assistant

# Redis
REDIS_URL=redis://localhost:6379

# External APIs
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
OPENAI_API_KEY=your-openai-api-key
NOTION_TOKEN=your-notion-token

# Observability
LOKI_URL=http://localhost:3100
PROMETHEUS_PORT=9090
```

## Development / 開発

### Project Structure / プロジェクト構造

```
src/
├── controllers/     # Slack event handlers
├── services/        # Business logic
├── models/          # Prisma models & types
├── utils/           # Helper functions
├── middleware/      # Slack middleware
├── i18n/           # Internationalization
└── tests/          # Test files
prisma/
├── schema.prisma   # Database schema
└── migrations/     # DB migrations
```

### Available Commands / 利用可能なコマンド

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run test         # Run tests
npm run test:watch   # Run tests in watch mode
npm run lint         # Run ESLint
npm run format       # Format code with Prettier
npm run db:migrate   # Run database migrations
npm run db:seed      # Seed database with test data
```

### Slack Commands / Slackコマンド

- `/todo today` - Display top 5 priority tasks / 優先タスクTop5を表示
- `/focus on [duration]` - Enable focus mode / 集中モードを有効化
- `/lang [en|ja]` - Switch language preference / 言語設定を切り替え
- `/prep [eventID]` - Prepare meeting materials / 会議資料を準備
- `/help` - Show available commands / 利用可能なコマンドを表示

## Contributing / 貢献

1. Fork the repository / リポジトリをフォーク
2. Create a feature branch / 機能ブランチを作成
3. Make your changes / 変更を実装
4. Add tests / テストを追加
5. Submit a pull request / プルリクエストを提出

## License / ライセンス

MIT License - see LICENSE file for details

## Support / サポート

For questions and support, please open an issue in the GitHub repository.

質問やサポートについては、GitHubリポジトリでissueを開いてください。

---

**Built for Kiro Competition 2025 / Kiroコンペティション2025向けに構築**