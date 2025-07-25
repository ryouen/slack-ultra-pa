/**
 * Google Calendar関連のユーティリティ
 */

/**
 * 指定日付を含む週のGoogle Calendarリンクを生成
 * @param dateStr YYYY-MM-DD形式の日付文字列
 * @returns Google Calendar週表示のURL
 */
export function generateWeekViewUrl(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    
    // 無効な日付の場合は今日を使用
    if (isNaN(date.getTime())) {
      date.setTime(Date.now());
    }

    // 週の開始日（日曜日）を計算
    const weekStart = new Date(date);
    const dayOfWeek = weekStart.getDay();
    weekStart.setDate(weekStart.getDate() - dayOfWeek);

    // Google Calendar URLフォーマット
    // https://calendar.google.com/calendar/u/0/r/week/YYYY/M/D
    const year = weekStart.getFullYear();
    const month = weekStart.getMonth() + 1; // 0-indexedなので+1
    const day = weekStart.getDate();

    return `https://calendar.google.com/calendar/u/0/r/week/${year}/${month}/${day}`;
  } catch (error) {
    // エラー時は現在週のURLを返す
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    const day = now.getDate();
    return `https://calendar.google.com/calendar/u/0/r/week/${year}/${month}/${day}`;
  }
}

/**
 * 次の営業日を計算（土日を除外）
 * @param date 基準日
 * @param daysToAdd 追加する営業日数
 * @returns 次の営業日
 */
export function getNextBusinessDay(date: Date = new Date(), daysToAdd: number = 1): Date {
  const result = new Date(date);
  let addedDays = 0;

  while (addedDays < daysToAdd) {
    result.setDate(result.getDate() + 1);
    const dayOfWeek = result.getDay();
    
    // 土曜(6)と日曜(0)以外の場合にカウント
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      addedDays++;
    }
  }

  return result;
}

/**
 * 期限日時を計算
 * @param type メッセージタイプ
 * @param dates 日程候補（scheduling_requestの場合）
 * @returns 期限のDate
 */
export function calculateDueDate(
  type: 'scheduling_request' | 'generic_request',
  dates?: Array<{ date: string; part_of_day: string }>
): Date {
  if (type === 'scheduling_request' && dates && dates.length > 0) {
    // 最初の候補日の前日23:59 JST
    const targetDate = new Date(dates[0].date);
    targetDate.setDate(targetDate.getDate() - 1);
    targetDate.setHours(23, 59, 59, 999);
    return targetDate;
  } else {
    // generic_request: 翌営業日の18:00 JST
    const nextBizDay = getNextBusinessDay();
    nextBizDay.setHours(18, 0, 0, 0);
    return nextBizDay;
  }
}

/**
 * 日付を日本語フォーマットで表示
 * @param date 日付
 * @returns "M月D日(曜日)"形式の文字列
 */
export function formatDateJapanese(date: Date): string {
  const days = ['日', '月', '火', '水', '木', '金', '土'];
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const dayOfWeek = days[date.getDay()];
  
  return `${month}月${day}日(${dayOfWeek})`;
}