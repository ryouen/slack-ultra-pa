import { App } from '@slack/bolt';
import { logger } from '@/utils/logger';

/**
 * 統合Inboxコマンド - メンションとタスクを統一ビューで表示
 * これが本来あるべき姿：ユーザーは「やるべきこと」だけを見る
 */
export function registerInboxCommand(app: App): void {
  app.command('/inbox', async ({ command, ack, respond, client }) => {
    await ack();

    try {
      const userId = command.user_id;
      
      // 統合ワークアイテムを取得
      const workItems = await getUnifiedWorkItems(userId);
      
      // インテリジェントな優先順位付け
      const prioritized = await prioritizeWorkItems(workItems, userId);
      
      // コンテキストを考慮した提案
      const suggestions = await generateContextualSuggestions(prioritized, userId);
      
      // 統一されたUIで表示
      const blocks = buildUnifiedInboxUI(prioritized, suggestions);
      
      await respond({
        blocks,
        text: '[INBOX] Your unified workspace'
      });
      
    } catch (error) {
      logger.error('Inbox command error', { error });
      await respond({
        text: '[ERROR] 申し訳ありません。エラーが発生しました。',
        blocks: [{
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: '問題が発生しました。しばらく待ってから再度お試しください。'
          }
        }]
      });
    }
  });
}

interface WorkItem {
  id: string;
  type: 'mention' | 'task' | 'reminder';
  content: string;
  source?: {
    channel: string;
    author: string;
    timestamp: Date;
  };
  priority: number; // 0-1 のスコア
  suggestedAction?: 'reply' | 'delegate' | 'schedule' | 'archive';
  deadline?: Date;
  context?: any;
}

async function getUnifiedWorkItems(userId: string): Promise<WorkItem[]> {
  // メンション、タスク、リマインダーを統合取得
  const [mentions, tasks, reminders] = await Promise.all([
    getMentions(userId),
    getTasks(userId),
    getReminders(userId)
  ]);
  
  // 統一フォーマットに変換
  return [
    ...mentions.map(m => convertMentionToWorkItem(m)),
    ...tasks.map(t => convertTaskToWorkItem(t)),
    ...reminders.map(r => convertReminderToWorkItem(r))
  ];
}

async function prioritizeWorkItems(items: WorkItem[], userId: string): Promise<WorkItem[]> {
  // AIを使った動的優先順位付け
  const userContext = await getUserContext(userId);
  
  return items.map(item => ({
    ...item,
    priority: calculatePriority(item, userContext)
  })).sort((a, b) => b.priority - a.priority);
}

function calculatePriority(item: WorkItem, context: any): number {
  let score = 0;
  
  // 締切の緊急度
  if (item.deadline) {
    const hoursUntilDeadline = (item.deadline.getTime() - Date.now()) / (1000 * 60 * 60);
    if (hoursUntilDeadline < 2) score += 0.5;
    else if (hoursUntilDeadline < 24) score += 0.3;
  }
  
  // メンションは新しいほど優先
  if (item.type === 'mention' && item.source) {
    const hoursSinceMention = (Date.now() - item.source.timestamp.getTime()) / (1000 * 60 * 60);
    if (hoursSinceMention < 1) score += 0.3;
    else if (hoursSinceMention < 4) score += 0.2;
  }
  
  // コンテキストベースの調整
  if (context.currentFocus && item.content.includes(context.currentFocus)) {
    score += 0.2;
  }
  
  return Math.min(score, 1);
}

async function generateContextualSuggestions(items: WorkItem[], userId: string): Promise<string[]> {
  const suggestions: string[] = [];
  
  // 緊急アイテムがある場合
  const urgentItems = items.filter(i => i.priority > 0.7);
  if (urgentItems.length > 0) {
    suggestions.push(`⚡ ${urgentItems.length}件の緊急項目があります。今すぐ対応しましょう。`);
  }
  
  // 未返信メンションが多い場合
  const unrepliedMentions = items.filter(i => i.type === 'mention');
  if (unrepliedMentions.length > 5) {
    suggestions.push('💬 未返信メンションが溜まっています。Quick Replyで効率的に返信しましょう。');
  }
  
  // 今日期限のタスク
  const todayTasks = items.filter(i => 
    i.deadline && 
    i.deadline.toDateString() === new Date().toDateString()
  );
  if (todayTasks.length > 0) {
    suggestions.push(`📅 今日が期限のタスクが${todayTasks.length}件あります。`);
  }
  
  return suggestions;
}

function buildUnifiedInboxUI(items: WorkItem[], suggestions: string[]): any[] {
  const blocks: any[] = [];
  
  // ヘッダー
  blocks.push({
    type: 'header',
    text: {
      type: 'plain_text',
      text: '[INBOX] あなたの統合ワークスペース'
    }
  });
  
  // サジェスチョン
  if (suggestions.length > 0) {
    blocks.push({
      type: 'context',
      elements: suggestions.map(s => ({
        type: 'mrkdwn',
        text: s
      }))
    });
    blocks.push({ type: 'divider' });
  }
  
  // ワークアイテム（最大10件）
  items.slice(0, 10).forEach(item => {
    const emoji = item.type === 'mention' ? '💬' : 
                  item.type === 'task' ? '✅' : '⏰';
    const priorityBar = '🔴'.repeat(Math.ceil(item.priority * 5));
    
    blocks.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `${emoji} ${priorityBar}\n*${item.content}*\n${item.source ? `from @${item.source.author} in #${item.source.channel}` : ''}`
      }
    });
    
    // アクションボタン
    const actions = [];
    if (item.type === 'mention') {
      actions.push({
        type: 'button',
        text: { type: 'plain_text', text: '⚡ Quick Reply' },
        action_id: `quick_reply_${item.id}`,
        style: 'primary'
      });
    }
    
    actions.push({
      type: 'button',
      text: { type: 'plain_text', text: '✅ 完了' },
      action_id: `complete_${item.id}`
    });
    
    if (item.deadline) {
      actions.push({
        type: 'button',
        text: { type: 'plain_text', text: '⏰ スヌーズ' },
        action_id: `snooze_${item.id}`
      });
    }
    
    blocks.push({
      type: 'actions',
      elements: actions
    });
    
    blocks.push({ type: 'divider' });
  });
  
  // フッター
  blocks.push({
    type: 'context',
    elements: [{
      type: 'mrkdwn',
      text: `表示: ${items.slice(0, 10).length}/${items.length}件 | 🎯 AI優先順位付け有効`
    }]
  });
  
  return blocks;
}

// ヘルパー関数（実際の実装では適切なサービスを使用）
async function getMentions(userId: string): Promise<any[]> {
  // TODO: MentionServiceから取得
  return [];
}

async function getTasks(userId: string): Promise<any[]> {
  // TODO: TaskServiceから取得
  return [];
}

async function getReminders(userId: string): Promise<any[]> {
  // TODO: ReminderServiceから取得
  return [];
}

async function getUserContext(userId: string): Promise<any> {
  // TODO: ユーザーのコンテキスト情報を取得
  return {
    currentFocus: null,
    workingHours: { start: 9, end: 18 },
    timezone: 'Asia/Tokyo'
  };
}

function convertMentionToWorkItem(mention: any): WorkItem {
  return {
    id: mention.id,
    type: 'mention',
    content: mention.messageText,
    source: {
      channel: mention.channelName,
      author: mention.authorId,
      timestamp: new Date(mention.createdAt)
    },
    priority: 0 // 後で計算
  };
}

function convertTaskToWorkItem(task: any): WorkItem {
  return {
    id: task.id,
    type: 'task',
    content: task.title,
    deadline: task.dueDate,
    priority: 0 // 後で計算
  };
}

function convertReminderToWorkItem(reminder: any): WorkItem {
  return {
    id: reminder.id,
    type: 'reminder',
    content: reminder.message,
    deadline: reminder.scheduledFor,
    priority: 0 // 後で計算
  };
}