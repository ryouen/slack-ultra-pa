---
ultrathink: always
docs_bilingual: "JP first, EN second"
interface_lang: "seamless JP/EN switching"
code_comments: "EN only"
naming_convention: "EN only for functions/classes"
---

# Project Standards / プロジェクト標準

## Tech Stack / 技術スタック
```yaml
runtime: Node.js
language: TypeScript
slack_framework: Slack Bolt
orm: Prisma
database: 
  development: SQLite
  production: PostgreSQL
env_management: .env files
```

## Code Standards / コード標準
```yaml
directory_structure: |
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
  
file_naming: "kebab-case for files, PascalCase for classes"
error_handling: "comprehensive with bilingual messages"
testing: "TDD where applicable"
accessibility: "WCAG 2.1 AA compliance"
```

## Commit Convention / コミット規約
```yaml
commit_style: conventional commits
commit_body_lang: JP
commit_header_lang: EN
```

## Security / セキュリティ
```yaml
api_keys: ".env with proper gitignore"
data_encryption: "at rest and in transit"
logging: "privacy-aware with no sensitive data"
```