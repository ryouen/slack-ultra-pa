#!/usr/bin/env node

/**
 * CLAUDE.md自動更新スクリプト
 * 重要な作業完了時に実行して、セッション引き継ぎ情報を最新に保つ
 */

const fs = require('fs');
const path = require('path');

const CLAUDE_MD_PATH = path.join(__dirname, '..', 'CLAUDE.md');

function updateClaudeMd(updates) {
  try {
    let content = fs.readFileSync(CLAUDE_MD_PATH, 'utf8');
    
    // 現在の日付
    const today = new Date().toISOString().split('T')[0];
    
    // 最終更新日を更新
    content = content.replace(
      /\*最終更新: .+\*/,
      `*最終更新: ${today} by Claude Code*`
    );
    
    // 現在の状況セクションを更新（提供された場合）
    if (updates.currentStatus) {
      const statusRegex = /## 📌 現在の状況.*?(?=##|\n$)/s;
      const newStatus = `## 📌 現在の状況（${today}更新）

### 直近の作業内容
${updates.currentStatus}
`;
      content = content.replace(statusRegex, newStatus);
    }
    
    // 次の作業候補を更新（提供された場合）
    if (updates.nextTasks) {
      const tasksRegex = /### 直近の技術的タスク\n[\s\S]*?(?=\n##|\n$)/;
      const newTasks = `### 直近の技術的タスク
${updates.nextTasks}`;
      content = content.replace(tasksRegex, newTasks);
    }
    
    // 重要な注意事項を更新（提供された場合）
    if (updates.importantNotes) {
      const notesRegex = /### 重要な注意事項\n[\s\S]*?(?=\n##|\n$)/;
      const newNotes = `### 重要な注意事項
${updates.importantNotes}`;
      content = content.replace(notesRegex, newNotes);
    }
    
    fs.writeFileSync(CLAUDE_MD_PATH, content);
    console.log('CLAUDE.md updated successfully');
    
  } catch (error) {
    console.error('Error updating CLAUDE.md:', error);
  }
}

// コマンドライン引数から更新内容を取得
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log('Usage: node update-claude-md.js --status "作業内容" --tasks "次のタスク" --notes "注意事項"');
    process.exit(1);
  }
  
  const updates = {};
  for (let i = 0; i < args.length; i += 2) {
    const key = args[i].replace('--', '');
    const value = args[i + 1];
    
    switch(key) {
      case 'status':
        updates.currentStatus = value;
        break;
      case 'tasks':
        updates.nextTasks = value;
        break;
      case 'notes':
        updates.importantNotes = value;
        break;
    }
  }
  
  updateClaudeMd(updates);
}

module.exports = { updateClaudeMd };