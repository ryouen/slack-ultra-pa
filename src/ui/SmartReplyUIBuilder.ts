import { Block, KnownBlock } from '@slack/bolt';
import { AnalysisResult } from '@/llm/MessageAnalyzer';

import { convertToThreadDeepLink } from '@/utils/threadDeepLink';

export class SmartReplyUIBuilder {
  buildUI(analysis: AnalysisResult, messageText: string, metadata?: { originalTs: string; channelId: string; permalink?: string; teamId?: string }): (KnownBlock | Block)[] {
    return analysis.type === 'scheduling_request'
      ? this.buildScheduling(analysis, messageText, metadata)
      : this.buildGeneric(analysis, messageText, metadata);
  }

  private buildScheduling(analysis: AnalysisResult, messageText: string, metadata?: { originalTs: string; channelId: string; permalink?: string; teamId?: string }): (KnownBlock | Block)[] {
    const blocks: (KnownBlock | Block)[] = [
      {
        type: 'section',
        text: { type: 'mrkdwn', text: '📩 *日程調整メッセージを検出しました*' }
      },
      {
        type: 'context',
        elements: [{ type: 'mrkdwn', text: `> ${messageText.substring(0, 100)}${messageText.length > 100 ? '...' : ''}` }]
      }
    ];

    // カレンダーリンク（最初の日付から週を計算）
    if (analysis.dates && analysis.dates.length > 0) {
      const firstDate = analysis.dates[0].date;
      const calendarUrl = this.generateCalendarUrl(firstDate);
      blocks.push({
        type: 'actions',
        elements: [{
          type: 'button',
          text: { type: 'plain_text', text: '📅 該当週カレンダーを開く' },
          url: calendarUrl
        }]
      });
    }

    blocks.push({ type: 'divider' });

    // 4象限返信案（コピーボタンなし、テキストのみ）
    const dateInfo = analysis.dates?.[0];
    const dateStr = dateInfo ? this.formatDate(dateInfo.date) : '';
    const timeStr = dateInfo?.part_of_day === 'morning' ? '午前' : 
                    dateInfo?.part_of_day === 'afternoon' ? '午後' : '夕方';

    blocks.push(
      {
        type: 'section',
        text: { 
          type: 'mrkdwn', 
          text: `🟢 *日程OK（丁寧）*\n> ${dateStr}${timeStr}でしたら大丈夫です。よろしくお願いいたします。` 
        }
      },
      {
        type: 'section',
        text: { 
          type: 'mrkdwn', 
          text: `🟢 *日程OK（カジュアル）*\n> ${dateStr.split('日')[0]}日${timeStr}いけます！` 
        }
      },
      {
        type: 'section',
        text: { 
          type: 'mrkdwn', 
          text: `🔴 *日程NG（丁寧）*\n> 申し訳ありません、その日は難しそうです。別日で再調整できれば幸いです。` 
        }
      },
      {
        type: 'section',
        text: { 
          type: 'mrkdwn', 
          text: `🔴 *日程NG（カジュアル）*\n> ごめん、その日は厳しいかも！また別日で！` 
        }
      }
    );

    blocks.push({ type: 'divider' });

    // 説明文を追加
    blocks.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: '返信する場合は、上記メッセージ案を直接コピーして、下記からスレッドへ飛んでください。'
      }
    });

    // 操作説明
    blocks.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: '📌 *操作:*'
      }
    });

    // 操作ボタン
    const dueDate = this.calculateDueDate(analysis);
    const buttonElements: any[] = [
      {
        type: 'button',
        text: { type: 'plain_text', text: 'タスクとして追加' },
        action_id: 'add_task_from_smart_reply',
        value: JSON.stringify({
          title: `日程調整: ${messageText.substring(0, 50)}${messageText.length > 50 ? '...' : ''}`,
          dueDate: dueDate.toISOString()
        })
      }
    ];

    // Add thread button - only if permalink is available
    if (metadata?.permalink) {
      // Convert to thread deep-link if teamId is available
      const threadUrl = metadata.teamId 
        ? convertToThreadDeepLink(metadata.permalink, metadata.teamId) || metadata.permalink
        : metadata.permalink;
      
      buttonElements.push({
        type: 'button',
        text: { type: 'plain_text', text: 'スレッドへ' },
        url: threadUrl
      });
    }
    // permalinkがない場合はボタンを表示しない（中間メッセージを避けるため）

    blocks.push({
      type: 'actions',
      elements: buttonElements
    });

    return blocks;
  }

  private buildGeneric(analysis: AnalysisResult, messageText: string, metadata?: { originalTs: string; channelId: string; permalink?: string; teamId?: string }): (KnownBlock | Block)[] {
    const blocks: (KnownBlock | Block)[] = [
      {
        type: 'section',
        text: { type: 'mrkdwn', text: '📩 *依頼/確認メッセージを検出しました*' }
      },
      {
        type: 'context',
        elements: [{ type: 'mrkdwn', text: `> ${messageText.substring(0, 100)}${messageText.length > 100 ? '...' : ''}` }]
      },
      { type: 'divider' }
    ];

    // 4象限返信案（コピーボタンなし、テキストのみ）
    if (analysis.intent_variants) {
      blocks.push(
        {
          type: 'section',
          text: { 
            type: 'mrkdwn', 
            text: `🟢 *了解（丁寧）*\n> ${analysis.intent_variants.agree_polite}` 
          }
        },
        {
          type: 'section',
          text: { 
            type: 'mrkdwn', 
            text: `🟢 *了解（カジュアル）*\n> ${analysis.intent_variants.agree_casual}` 
          }
        },
        {
          type: 'section',
          text: { 
            type: 'mrkdwn', 
            text: `🔴 *難しい/要調整（丁寧）*\n> ${analysis.intent_variants.reject_polite}` 
          }
        },
        {
          type: 'section',
          text: { 
            type: 'mrkdwn', 
            text: `🔴 *難しい/要調整（カジュアル）*\n> ${analysis.intent_variants.reject_casual}` 
          }
        }
      );
    }

    blocks.push({ type: 'divider' });

    // 説明文を追加
    blocks.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: '返信する場合は、上記メッセージ案を直接コピーして、下記からスレッドへ飛んでください。'
      }
    });

    // 操作説明
    blocks.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: '📌 *操作:*'
      }
    });

    // 操作ボタン
    const nextBusinessDay = this.getNextBusinessDay(new Date());
    nextBusinessDay.setHours(18, 0, 0, 0);

    const buttonElements: any[] = [
      {
        type: 'button',
        text: { type: 'plain_text', text: 'タスクとして追加' },
        action_id: 'add_task_from_smart_reply',
        value: JSON.stringify({
          title: messageText.substring(0, 100),
          dueDate: nextBusinessDay.toISOString()
        })
      }
    ];

    // Add thread button - only if permalink is available
    if (metadata?.permalink) {
      // Convert to thread deep-link if teamId is available
      const threadUrl = metadata.teamId 
        ? convertToThreadDeepLink(metadata.permalink, metadata.teamId) || metadata.permalink
        : metadata.permalink;
      
      buttonElements.push({
        type: 'button',
        text: { type: 'plain_text', text: 'スレッドへ' },
        url: threadUrl
      });
    }
    // permalinkがない場合はボタンを表示しない（中間メッセージを避けるため）

    blocks.push({
      type: 'actions',
      elements: buttonElements
    });

    return blocks;
  }

  private generateCalendarUrl(dateStr: string): string {
    const date = new Date(dateStr);
    const weekStart = new Date(date);
    weekStart.setDate(date.getDate() - date.getDay()); // 日曜日に調整
    
    const year = weekStart.getFullYear();
    const month = weekStart.getMonth() + 1;
    const day = weekStart.getDate();
    
    return `https://calendar.google.com/calendar/u/0/r/week/${year}/${month}/${day}`;
  }

  private formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    const month = date.getMonth() + 1;
    const day = date.getDate();
    return `${month}月${day}日`;
  }

  private calculateDueDate(analysis: AnalysisResult): Date {
    if (analysis.type === 'scheduling_request' && analysis.dates && analysis.dates.length > 0) {
      // 最初の候補日の前日23:59
      const targetDate = new Date(analysis.dates[0].date);
      targetDate.setDate(targetDate.getDate() - 1);
      targetDate.setHours(23, 59, 59, 999);
      return targetDate;
    }
    // デフォルトは翌営業日18時
    return this.getNextBusinessDay(new Date());
  }

  private getNextBusinessDay(date: Date): Date {
    const next = new Date(date);
    next.setDate(next.getDate() + 1);
    
    while (next.getDay() === 0 || next.getDay() === 6) {
      next.setDate(next.getDate() + 1);
    }
    
    next.setHours(18, 0, 0, 0);
    return next;
  }
}