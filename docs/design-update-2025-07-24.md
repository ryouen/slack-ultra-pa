# Design Update: /todo today Command Restructuring
Date: 2025-07-24
Author: Claude Opus 4

## Problem Statement
The original `/todo today` command had a fundamental design flaw where mention display was controlled by task count. Mentions were only shown when there were zero tasks, which doesn't make logical sense.

## Root Cause Analysis
- **Incorrect Design Philosophy**: Tasks and mentions were treated as mutually exclusive
- **Poor User Experience**: Users with tasks couldn't see their pending mentions
- **Logical Inconsistency**: Unprocessed mentions should always be visible regardless of task count

## Solution Architecture

### New Display Logic
```
/todo today
├── Task Section (if tasks exist)
│   ├── Header: "Top 5 Priority Tasks Today"
│   └── For each task:
│       ├── Task details (title, description, due date)
│       └── Action buttons (Complete, Folder)
│
└── Mention Section (if PENDING mentions exist)
    ├── Header: "Recent Mentions (Past 3 Business Days)"
    └── For each mention:
        ├── Channel and message preview
        └── Action buttons (Add Task, Ignore, Quick Reply)
```

### Key Changes
1. **Independent Sections**: Tasks and mentions are displayed independently
2. **Always Check Both**: Both `getTasksCount()` and `collectRecentMentions()` are called
3. **Unified Response**: Single response message with all relevant information

### Code Structure
```typescript
// Simplified logic
const tasksCount = await taskService.getTasksCount(user.id);
const recentMentions = await taskService.collectRecentMentions(user.id);

const responseBlocks = [];

// Add tasks if any
if (tasksCount > 0) {
  // Add task blocks
}

// Add mentions if any
if (recentMentions.length > 0) {
  // Add mention blocks with 3 action buttons each
}

// Send unified response
await respond({ blocks: responseBlocks });
```

## Design Principles Going Forward

### 1. Independence of Concepts
- Different entities (tasks, mentions, reminders) should be handled independently
- Don't create artificial dependencies between unrelated features

### 2. Complete Information Display
- Users should see all relevant information in one command
- Don't hide information based on unrelated conditions

### 3. Structural Simplicity
- Avoid nested conditionals where possible
- Build response incrementally
- Keep logic linear and easy to follow

### 4. Minimal UI Elements
- Remove emojis for better cross-platform compatibility
- Use clear text labels instead of icons
- Focus on functionality over decoration

## Impact on Other Features
- **Mention Detection**: No changes needed
- **Task Creation**: Works independently
- **Quick Reply**: Fully functional with all mentions

## Future Considerations
- Consider pagination if tasks/mentions exceed Slack's block limits
- Add filters for mention types (questions, requests, FYI)
- Enable customization of display order (tasks first vs mentions first)

## For Kiro Integration
This update should be reflected in:
- `.kiro/specs/slack-personal-assistant/design.md` - Update the UI/UX section
- `.kiro/specs/slack-personal-assistant/tasks.md` - Mark related tasks as complete
- Consider this new pattern for other list displays in the application