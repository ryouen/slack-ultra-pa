# Implementation Plan

## Sprint 1: Foundation (Weeks 1-2) / スプリント1: 基盤構築
**Sprint 1 Total Hours:** 96 hours

- [x] 1. Project Setup & Dependencies / プロジェクト設定と依存関係
  - Initialize Node.js/TypeScript project with Slack Bolt, Prisma, BullMQ, and observability tools
  - **Estimated Hours:** 8
  - **Requirements:** Requirement 1
  - **Deliverables:**
    - package.json with all dependencies (Slack Bolt, Prisma, BullMQ, Winston, Prometheus)
    - TypeScript configuration with strict mode
    - ESLint and Prettier setup
    - Basic project structure following design.md
  - **Acceptance Criteria:**
    - Project builds without errors
    - All linting rules pass
    - Test framework (Jest) is configured

- [x] 2. Database Schema & Models / データベーススキーマとモデル




  - Create complete Prisma schema with User, Task, OAuthToken, JobQueue, and CalendarEvent models
  - **Estimated Hours:** 12
  - **Requirements:** Requirement 2, Requirement 3
  - **Deliverables:**
    - prisma/schema.prisma with all models from design.md
    - Initial migration files
    - Database connection utilities with error handling
    - Seed data for development
  - **Acceptance Criteria:**
    - All models support 3-tier task hierarchy
    - OAuth token management with expiration
    - Job queue models with retry logic
    - Foreign key relationships properly defined

- [ ] 3. OAuth Token Management System / OAuthトークン管理システム
  - Implement secure OAuth token storage, refresh, and management for external APIs
  - **Estimated Hours:** 16
  - **Requirements:** Requirement 3, Cross-platform integration
  - **Blocked by:** Task 2
  - **Deliverables:**
    - src/services/oauthService.ts
    - Token refresh middleware
    - Secrets Manager integration (AWS/GCP)
    - Error handling for expired tokens
    - Browser-based OAuth flow for user-friendly connection
  - **Acceptance Criteria:**
    - Google Calendar/Drive OAuth flow works via browser click
    - Notion OAuth connection available through browser
    - Tokens automatically refresh before expiration
    - Graceful handling of refresh failures
    - No sensitive data in logs

- [ ] 4. Job Queue Infrastructure / ジョブキューインフラ
  - Set up BullMQ job queue system with Redis for asynchronous processing
  - **Estimated Hours:** 14
  - **Requirements:** Requirement 2 (Reminders), Requirement 3 (Reports)
  - **Blocked by:** Task 2
  - **Deliverables:**
    - src/services/jobQueueService.ts
    - Worker processes for different job types
    - Job retry logic with exponential backoff
    - Queue monitoring and cleanup
    - Worker process deployment (Docker/PM2/k8s)
  - **Acceptance Criteria:**
    - Reminder jobs can be scheduled and cancelled
    - Daily/weekly report jobs execute correctly
    - Failed jobs retry with proper backoff
    - Completed jobs are cleaned up after 7 days

- [x] 5. Basic Slack Integration & Help System / 基本Slack統合とヘルプシステム
  - Implement core Slack bot with onboarding and help commands
  - **Estimated Hours:** 12
  - **Requirements:** Requirement 1
  - **Blocked by:** Task 1, Task 3
  - **Deliverables:**
    - src/app.ts with Slack Bolt initialization
    - /help command with bilingual support
    - User onboarding flow
    - Basic error handling and logging
  - **Acceptance Criteria:**
    - Bot responds to mentions and DMs
    - /help shows available commands in user's language
    - New users get onboarding message
    - All interactions logged properly

- [ ] 6. Observability Foundation / 可観測性基盤
  - Set up logging, metrics, and tracing infrastructure
  - **Estimated Hours:** 10
  - **Requirements:** System monitoring and debugging
  - **Blocked by:** Task 1
  - **Deliverables:**
    - Winston logging with Loki integration
    - Prometheus metrics collection
    - OpenTelemetry tracing setup
    - Basic Grafana dashboard
  - **Acceptance Criteria:**
    - Structured JSON logs in Loki
    - API response time metrics collected
    - Distributed tracing across services
    - Alert rules for critical failures

- [ ] 7. Multi-language Support / 多言語サポート
  - Implement i18n system with Japanese and English support
  - **Estimated Hours:** 8
  - **Requirements:** Requirement 1
  - **Blocked by:** Task 5
  - **Deliverables:**
    - src/i18n/ with JSON language files
    - Language detection utilities
    - /lang command implementation
    - Travel keywords i18n configuration
  - **Acceptance Criteria:**
    - System detects message language automatically
    - /lang command switches user preference
    - All user-facing messages support both languages
    - Travel keywords work in both languages

- [ ] 8. Security & API Quota Management / セキュリティとAPI制限管理
  - Implement security hardening and API quota protection
  - **Estimated Hours:** 10
  - **Requirements:** System security and cost management
  - **Blocked by:** Task 3
  - **Deliverables:**
    - IAM scope audit for Slack and Google APIs
    - API quota dashboard with Prometheus metrics
    - Circuit breaker for FreeBusy and ChatGPT APIs
    - Secrets rotation playbook
    - Static analysis (SAST) integration
  - **Acceptance Criteria:**
    - All APIs use least-privilege scopes
    - API quota usage is monitored and alerted
    - Circuit breakers prevent API abuse
    - Security vulnerabilities are automatically detected

- [ ] 9. Early Risk Mitigation Spikes / 早期リスク軽減スパイク
  - Conduct proof-of-concept spikes for high-risk components
  - **Estimated Hours:** 6
  - **Requirements:** Risk mitigation
  - **Blocked by:** Task 1
  - **Deliverables:**
    - OAuth refresh loop end-to-end spike (2h)
    - FreeBusy API quality and rate limit spike (2h)
    - BullMQ worker retry mechanism spike (2h)
  - **Acceptance Criteria:**
    - OAuth refresh works reliably under load
    - FreeBusy API limitations are understood
    - Job queue retry logic handles failures gracefully

## Sprint 2: Core Features (Weeks 3-4) / スプリント2: コア機能実装
**Sprint 2 Total Hours:** 93 hours

- [-] 10. Smart Task Management Core / スマートタスク管理コア


  - Implement basic task management with AI prioritization
  - **Estimated Hours:** 12
  - **Requirements:** Requirement 2
  - **Blocked by:** Task 2, Task 3
  - **Deliverables:**
    - src/services/taskService.ts
    - AI prioritization algorithm
    - Task CRUD operations
    - 3-tier hierarchy data model
  - **Acceptance Criteria:**
    - Tasks can be created and managed
    - Priority algorithm uses due date + completion history
    - 3-tier hierarchy (Project ▸ Mid ▸ Sub) is supported

- [x] 10.1 Daily Top 5 Task Display / 日次Top5タスク表示




  - Implement morning 7:30 and /todo today command with priority cards
  - **Estimated Hours:** 3
  - **Requirements:** Requirement 2
  - **Blocked by:** Task 10
  - **Deliverables:**
    - Daily scheduler for 7:30 AM
    - /todo today slash command
    - Block Kit cards with badges and buttons
    - Priority score calculation and sorting
  - **Acceptance Criteria:**
    - Top 5 tasks displayed as cards with 🔥⚡ badges
    - Cards include due dates and 📂 folder buttons





    - ✅ completion buttons work correctly

- [-] 10.2 Folder Quick Access Integration / フォルダクイックアクセス統合
  - Add Drive/Notion/Dropbox folder buttons to task cards
  - **Estimated Hours:** 2
  - **Requirements:** Requirement 2
  - **Blocked by:** Task 10.1
  - **Status:** 🔧 修正中 - ペイロードエラー対応
  - **Issue:** フォルダボタンクリック時に "Slack cannot handle payload" エラー
  - **Progress:** ack()タイミング修正完了、エラーハンドリング修正中
  - **Deliverables:**
    - URL detection for Drive/Notion/Dropbox
    - 📂 button click handlers
    - Access timestamp logging
    - New tab opening functionality
  - **Acceptance Criteria:**
    - Dropbox URLs detected via regex
    - 📂 buttons open URLs in new browser tabs
    - Access timestamps are logged

- [x] 10.3 Intelligent Reminder System / インテリジェントリマインダーシステム


  - Implement dual reminders: day-before 9AM + 3h before free time
  - **Estimated Hours:** 8
  - **Requirements:** Requirement 2
  - **Blocked by:** Task 10, Task 11
  - **Deliverables:**
    - Day-before 9:00 AM reminder scheduler
    - FreeBusy API integration for free time detection
    - 3-hour advance reminder logic
    - Reminder cancellation on completion/snooze
  - **Acceptance Criteria:**
    - P1 tasks trigger reminders at specified times
    - FreeBusy API correctly identifies free calendar slots
    - Reminders stop when task completed or snoozed



- [x] 10.4 AI-Powered Smart Reply System / AI駆動スマート返信システム
  - Implement contextual message analysis and smart reply generation using GPT-4.1-mini
  - **Estimated Hours:** 8
  - **Requirements:** Requirement 2, Requirement 2.5
  - **Blocked by:** Task 10
  - **Status:** ✅ 完了 - Claude Code (Opus 4) 協働完了
  - **Deliverables:**
    - MessageAnalyzer with GPT-4.1-mini integration
    - SmartReplyUIBuilder for contextual Block Kit generation
    - 2-operation workflow (copy text → jump to thread)
    - Scheduling vs. generic request classification
    - 4-quadrant reply options with calendar integration
    - Task creation with proper due date calculation
    - Error handling with graceful fallbacks
  - **Acceptance Criteria:**
    - Message analysis completes within 5 seconds (15s timeout)
    - Scheduling requests show calendar week links
    - Generic requests show 4-quadrant reply options
    - Task creation includes Slack permalink and calculated due dates
    - Zero false positives (manual confirmation required)
    - Graceful fallback on LLM/API failures
    - User ID mapping with automatic user creation

- [ ] 10.9 /mention Command Implementation / /mentionコマンド実装
  - Implement /mention slash command with 72h mention history and filtering
  - **Estimated Hours:** 6
  - **Requirements:** Requirement 2.5 (QRMVP-JP-1.0)
  - **Blocked by:** Task 10.4
  - **Status:** 🆕 新規追加 - 最終仕様書対応
  - **Deliverables:**
    - /mention slash command handler
    - 72h mention search functionality
    - Filter options (unreplied/all)
    - Mention list UI with 3-button interface
    - Integration with existing Smart Reply System
  - **Acceptance Criteria:**
    - /mention shows past 72h unreplied mentions by default
    - /mention all shows all mentions
    - /mention unreply explicitly shows unreplied mentions
    - Each mention has [Quick Reply] [タスク化] [既読] buttons
    - Integrates seamlessly with Task 10.4 Smart Reply System
    - Empty state shows helpful message

- [ ] 10.10 Complete Quick Reply UI Specification / 完全クイック返信UI仕様
  - Implement exact UI specifications from QRMVP-JP-1.0 document
  - **Estimated Hours:** 4
  - **Requirements:** Requirement 2.5 (QRMVP-JP-1.0)
  - **Blocked by:** Task 10.4, Task 10.9
  - **Status:** 🆕 新規追加 - 最終仕様書対応
  - **Deliverables:**
    - Exact scheduling_request UI layout per specification
    - Exact generic_request UI layout per specification
    - Calendar week link generation
    - Manual text selection (no copy buttons)
    - Proper Japanese text formatting
  - **Acceptance Criteria:**
    - UI matches exact specification in QRMVP-JP-1.0
    - Calendar links open correct week view
    - Text is selectable for manual copying
    - No automatic copy/paste functionality
    - All Japanese text formatting is correct

- [ ] 10.11 Enhanced Due Date Calculation / 強化された期限計算
  - Implement precise due date calculation logic from specification
  - **Estimated Hours:** 2
  - **Requirements:** Requirement 2.5 (QRMVP-JP-1.0)
  - **Blocked by:** Task 10.4
  - **Status:** 🆕 新規追加 - 最終仕様書対応
  - **Deliverables:**
    - calculateDue() function implementation
    - Business day calculation (excluding weekends)
    - Scheduling request: candidate date - 1 day at 23:59
    - Generic request: next business day at 18:00
    - JST timezone handling
  - **Acceptance Criteria:**
    - Scheduling tasks due day before proposed date at 23:59 JST
    - Generic tasks due next business day at 18:00 JST
    - Weekend days are properly skipped
    - All calculations use JST timezone

- [ ] 10.12 Legacy Quick Reply Removal / 旧クイック返信削除
  - Remove old 3-button Quick Reply implementation completely
  - **Estimated Hours:** 2
  - **Requirements:** Requirement 2.5 (QRMVP-JP-1.0)
  - **Blocked by:** Task 10.10
  - **Status:** 🆕 新規追加 - 最終仕様書対応
  - **Deliverables:**
    - Remove old quick reply button handlers
    - Remove old UI components
    - Clean up unused code
    - Update any references to old system
  - **Acceptance Criteria:**
    - No old quick reply buttons appear in UI
    - All old handlers are removed
    - Code is clean with no unused imports
    - New system is the only quick reply implementation

- [ ] 10.5 3-Tier Hierarchy Management / 3階層管理
  - Implement project hierarchy with auto-promotion
  - **Estimated Hours:** 4
  - **Requirements:** Requirement 2
  - **Blocked by:** Task 10
  - **Deliverables:**
    - Project/client name detection
    - 3-tier hierarchy suggestion engine
    - Auto-promotion when sub-tasks exceed 5
    - Hierarchy visualization in UI
  - **Acceptance Criteria:**
    - System suggests Project ▸ Mid-task ▸ Sub-task structure
    - Auto-promotion triggers when sub-tasks > 5
    - Client/project names are correctly detected

- [ ] 10.6 Document Summary Engine / 文書要約エンジン
  - Auto-summarize recent files for presentation tasks
  - **Estimated Hours:** 4
  - **Requirements:** Requirement 2
  - **Blocked by:** Task 10, Task 13
  - **Deliverables:**
    - 30-day file search across Drive/Notion/Dropbox
    - AI summarization for 4 key points
    - Presentation task detection
    - Summary integration in task creation
  - **Acceptance Criteria:**
    - Recent files searched when presentation task detected
    - AI summarizes: Project/Background/Participants/Issues
    - Dropbox API integration works correctly

- [ ] 10.7 Task Breakdown Templates / タスク分割テンプレート
  - Generate sub-tasks using templates and vector search
  - **Estimated Hours:** 3
  - **Requirements:** Requirement 2
  - **Blocked by:** Task 10.5
  - **Deliverables:**
    - Task breakdown templates (presentation, development, etc.)
    - Vector search for similar projects
    - 5-6 sub-task generation logic
    - Break button UI integration
  - **Acceptance Criteria:**
    - Break button generates 5-6 relevant sub-tasks
    - Templates cover common task types
    - Vector search finds similar project patterns

- [ ] 10.8 Progress Reporting System / 進捗レポートシステム
  - Generate daily and weekly progress reports
  - **Estimated Hours:** 3
  - **Requirements:** Requirement 2
  - **Blocked by:** Task 10
  - **Deliverables:**
    - Daily 8:00 AM report scheduler
    - Weekly Monday 8:00 AM report scheduler
    - Progress calculation (completed/remaining/new)
    - Channel-specific report delivery
  - **Acceptance Criteria:**
    - Daily reports show yesterday's progress
    - Weekly reports include completion list + top 3 blockers
    - Reports can be sent to specified channels

- [ ] 11. Smart Calendar Integration Core / スマートカレンダー統合コア
  - Implement message action for calendar integration with Google Calendar API
  - **Estimated Hours:** 16
  - **Requirements:** Requirement 3
  - **Blocked by:** Task 2, Task 3
  - **Deliverables:**
    - src/services/calendarService.ts
    - Google Calendar OAuth2 implementation
    - Message action handler for 🗓 Open in Calendar
    - Date/time extraction from messages
    - FreeBusy API integration
  - **Acceptance Criteria:**
    - Message action extracts date/time candidates
    - FreeBusy API shows availability status
    - Ephemeral candidate list displays correctly
    - Week view URLs open in browser

- [ ] 11.1 Calendar Candidate List & Travel Detection / カレンダー候補リストと移動検出
  - Implement candidate display with travel keyword detection
  - **Estimated Hours:** 3
  - **Requirements:** Requirement 3
  - **Blocked by:** Task 11
  - **Deliverables:**
    - Travel keyword detection logic
    - Candidate list UI with icons (✅❌✈️🚶)
    - YAML-based keyword dictionary
    - Click-to-week-view functionality
  - **Acceptance Criteria:**
    - Travel keywords trigger appropriate icons
    - Candidate list shows availability status
    - Week view opens for selected candidates
    - Keyword dictionary is easily configurable

- [ ] 11.2 Reply Draft Generation / 返信下書き生成
  - Generate draft replies for selected time slots
  - **Estimated Hours:** 2
  - **Requirements:** Requirement 3
  - **Blocked by:** Task 11.1
  - **Deliverables:**
    - Draft reply generation logic
    - Multi-candidate reply formatting
    - Slack message input integration
    - Localized reply templates (JP/EN)
  - **Acceptance Criteria:**
    - Single candidate: '10/29(火)14-16時でお願いします'
    - Multiple candidates: 'A時間 または B時間でお願いします'
    - Draft appears in message input without auto-send
    - Templates work in both Japanese and English

- [ ] 11.3 Tentative Booking & Invitation Management / 仮予定と招待管理
  - Create tentative events and manage calendar invitations
  - **Estimated Hours:** 4
  - **Requirements:** Requirement 3
  - **Blocked by:** Task 11.2
  - **Deliverables:**
    - Tentative event creation with sequential naming
    - Google Calendar invitation sending
    - Existing tentative event detection
    - Automatic cleanup of related tentatives
  - **Acceptance Criteria:**
    - Multiple tentatives named as 仮1/N, 仮2/N
    - Calendar invitations sent to detected participants
    - Existing tentatives are detected and managed
    - Confirmed events trigger cleanup of alternatives

- [ ] 11.4 Quick-Open Folder Buttons / クイックフォルダ開封ボタン
  - Add folder access buttons to task cards
  - **Estimated Hours:** 2
  - **Requirements:** Requirement 2
  - **Blocked by:** Task 10
  - **Deliverables:**
    - Folder URL storage in task model
    - 📂 Open Folder button in Block Kit
    - Browser link opening handler
    - Opened timestamp tracking
  - **Acceptance Criteria:**
    - Tasks with folder URLs show Open Folder buttons
    - Buttons open Drive/Notion links in browser
    - Opened timestamps are recorded
    - UI is consistent with existing task cards

- [ ] 11.5 On-Demand Meeting Prep (/prep command) / オンデマンド会議準備
  - Implement /prep slash command for immediate meeting preparation
  - **Estimated Hours:** 4
  - **Requirements:** Requirement 3
  - **Blocked by:** Task 11
  - **Deliverables:**
    - /prep slash command handler
    - Event ID parsing and validation
    - Immediate document collection logic
    - Next meeting auto-detection
  - **Acceptance Criteria:**
    - /prep <eventID> gathers materials within 5 seconds
    - /prep without args detects next meeting automatically
    - Same quality document set as automatic preparation

- [ ] 12. Gmail Integration / Gmail統合
  - Implement Gmail monitoring and email summarization
  - **Estimated Hours:** 8
  - **Requirements:** Requirement 5
  - **Blocked by:** Task 2, Task 3
  - **Deliverables:**
    - src/services/gmailService.ts
    - Email importance detection
    - Email summarization logic
    - Quick action buttons
  - **Acceptance Criteria:**
    - Important emails are detected and summarized
    - Email summaries are sent to Slack
    - Create Task and Remind Later buttons work
    - Email-to-task conversion is seamless

- [ ] 13. Google Drive Integration / Google Drive統合
  - Monitor Google Docs/Sheets for comments and mentions
  - **Estimated Hours:** 10
  - **Requirements:** Requirement 5
  - **Blocked by:** Task 2, Task 3
  - **Deliverables:**
    - src/services/driveService.ts
    - Document comment monitoring
    - Mention detection system
    - Document context extraction
  - **Acceptance Criteria:**
    - Document comments with mentions are detected
    - Relevant sections are quoted in Slack
    - One-click task creation from comments works
    - Document links are properly formatted

## Sprint 3: Integration & Polish (Weeks 5-6) / スプリント3: 統合と仕上げ
**Sprint 3 Total Hours:** 68 hours

- [ ] 14. Emotional Intelligence System / 感情知能システム
  - Implement context-aware communication and stress detection
  - **Estimated Hours:** 8
  - **Requirements:** Requirement 4
  - **Blocked by:** Task 10, Task 11
  - **Deliverables:**
    - src/services/emotionalIntelligence.ts
    - Message pattern analysis
    - Stress detection algorithm
    - Adaptive response system
  - **Acceptance Criteria:**
    - System detects user stress from message patterns
    - Responses adapt to user emotional state
    - Focus mode is automatically triggered
    - Notification batching works during focus time

- [ ] 15. Notion Integration / Notion統合
  - Integrate with Notion API for enhanced task and document management
  - **Estimated Hours:** 8
  - **Requirements:** Requirement 5
  - **Blocked by:** Task 3, Task 10
  - **Deliverables:**
    - src/services/notionService.ts
    - Notion page monitoring
    - Task synchronization
    - Mention detection in Notion
    - Browser-based Notion OAuth connection
  - **Acceptance Criteria:**
    - Users can connect Notion via browser click
    - Notion page updates with mentions are detected
    - Changes are summarized in Slack
    - Task integration with Notion works
    - Bidirectional sync is maintained

- [ ] 16. Quick Action Buttons & UI Polish / クイックアクションボタンとUI仕上げ
  - Implement Slack Block Kit UI components and quick actions
  - **Estimated Hours:** 8
  - **Requirements:** Requirement 1, Requirement 2, Requirement 5
  - **Blocked by:** Task 10, Task 12, Task 13
  - **Deliverables:**
    - src/ui/blockKitComponents.ts
    - Quick action button handlers
    - Interactive message components
    - Improved user experience flows
    - Skeleton screens for empty states (🎉 No tasks)
    - Progress spinners for /prep operations
    - Fallback messages for API failures
  - **Acceptance Criteria:**
    - All interactions use rich Block Kit components
    - Quick action buttons work reliably
    - UI is consistent across all features
    - User feedback is immediate and clear
    - Empty states show helpful messages
    - Loading operations provide clear feedback

- [ ] 17. Testing & Quality Assurance / テストと品質保証
  - Comprehensive testing suite and quality improvements
  - **Estimated Hours:** 32
  - **Requirements:** All Requirements
  - **Blocked by:** Task 14, Task 15, Task 16
  - **Deliverables:**
    - Unit tests with ≥80% coverage
    - Integration tests for key workflows
    - End-to-end tests for critical paths
    - Performance optimization
    - Load/Performance testing with k6 or Artillery
  - **Acceptance Criteria:**
    - All tests pass consistently
    - Code coverage meets requirements
    - Performance benchmarks are met
    - Error handling is comprehensive

- [ ] 17.1 Observability Alert Rules / 可観測性アラートルール
  - Set up comprehensive monitoring alerts and log retention policies
  - **Estimated Hours:** 4
  - **Requirements:** System monitoring and debugging
  - **Blocked by:** Task 17
  - **Deliverables:**
    - Grafana alert rules for critical failures
    - Loki log retention policies
    - Security audit log rules
    - Performance threshold alerts
  - **Acceptance Criteria:**
    - Critical system failures trigger immediate alerts
    - Log retention complies with compliance requirements
    - Security events are properly audited
    - Performance degradation is detected early

- [ ] 18. Documentation & Deployment Prep / ドキュメントとデプロイ準備
  - Create comprehensive documentation and prepare for deployment
  - **Estimated Hours:** 8
  - **Requirements:** All Requirements
  - **Blocked by:** Task 17
  - **Deliverables:**
    - README.md with setup instructions
    - API documentation
    - User guide (JP/EN)
    - Deployment configuration
  - **Acceptance Criteria:**
    - Documentation is complete and accurate
    - Setup process is clearly documented
    - Deployment is automated
    - Both Japanese and English docs are provided

---

## Summary / サマリー

**Total Estimated Hours:** 257 hours
**Duration:** 6 weeks (3 × 2-week sprints)
**Sprint Structure:** Agile 2-week sprints with clear Done Criteria

**Dependencies:**
- Slack Workspace with admin access
- Google Workspace account
- Notion workspace
- AWS account for SES/S3 (Booster features)

**APIs Required:**
- Slack Web API & Events API
- Google Calendar API
- Gmail API
- Google Drive API
- Notion API