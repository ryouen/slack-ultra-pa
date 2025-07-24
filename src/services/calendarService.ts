// Calendar Service - Smart Calendar Integration
// Implements calendar functionality as per design document

import { DateTimeCandidate, FreeBusyOptions, AvailabilityStatus, TentativeEvent } from '@/types';

export interface CalendarService {
  // Message to Calendar Candidates / メッセージからカレンダー候補
  extractDateTimeCandidates(message: string): Promise<DateTimeCandidate[]>;
  
  // FreeBusy Status Check / FreeBusy状況確認
  checkAvailability(candidates: DateTimeCandidate[], options: FreeBusyOptions): Promise<AvailabilityStatus[]>;
  
  // Tentative Booking Management / 仮予定管理
  createTentativeEvents(candidates: DateTimeCandidate[]): Promise<TentativeEvent[]>;
  
  // Week View URL Generation / 週ビューURL生成
  generateWeekViewUrl(date: Date): string;
}

// Placeholder implementation - will be implemented in later tasks
export class CalendarServiceImpl implements CalendarService {
  async extractDateTimeCandidates(message: string): Promise<DateTimeCandidate[]> {
    // TODO: Implement in task 11
    throw new Error('Not implemented yet');
  }

  async checkAvailability(candidates: DateTimeCandidate[], options: FreeBusyOptions): Promise<AvailabilityStatus[]> {
    // TODO: Implement in task 11
    throw new Error('Not implemented yet');
  }

  async createTentativeEvents(candidates: DateTimeCandidate[]): Promise<TentativeEvent[]> {
    // TODO: Implement in task 11.3
    throw new Error('Not implemented yet');
  }

  generateWeekViewUrl(date: Date): string {
    // TODO: Implement in task 11
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `https://calendar.google.com/calendar/u/0/r/week/${year}/${month}/${day}`;
  }
}