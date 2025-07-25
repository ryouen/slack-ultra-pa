// Type definitions for the Slack Personal Assistant
// Based on the design document specifications

export interface TaskCard {
  id: string;
  title: string;
  priority: 'P1' | 'P2' | 'P3';
  badges: ('[HOT]' | '[QUICK]' | '[URGENT]')[];
  dueDate?: Date;
  folderUrls: FolderUrl[];
  actions: TaskAction[];
}

export interface FolderUrl {
  url: string;
  type: 'drive' | 'notion' | 'dropbox';
  name?: string;
}

export interface TaskAction {
  type: 'complete' | 'snooze' | 'edit' | 'break';
  label: string;
  value: string;
}

export interface DateTimeCandidate {
  startTime: Date;
  endTime: Date;
  status: 'free' | 'busy';
  indicators: ('[TRAVEL]' | '[WALK]' | '[WARNING]')[];
  confidence: number;
}

export interface InboxEntry {
  id: string;
  slackTs: string;
  channelId: string;
  messageText: string;
  status: 'pending' | 'converted_to_task' | 'ignored' | 'quick_replied';
  expiresAt: Date;
}

export interface DocumentSummary {
  projectName: string;
  background: string;
  participants: string[];
  keyIssues: string[];
  relevantFiles: FileReference[];
}

export interface FileReference {
  url: string;
  name: string;
  type: string;
  lastModified: Date;
}

export interface UserContext {
  userId: string;
  timezone: string;
  language: 'ja' | 'en';
  preferences: Record<string, any>;
  taskHistory: any[];
}

export interface UserState {
  isInFocusMode: boolean;
  currentStressLevel: number;
  recentActivity: string[];
}

export interface SlackMention {
  ts: string;
  channel: string;
  user: string;
  text: string;
  thread_ts?: string;
}

export interface MessageContext {
  channel: string;
  user: string;
  text: string;
  timestamp: string;
  thread_ts?: string;
}

export interface UserStyle {
  tone: string;
  commonPhrases: string[];
  responseLength: 'short' | 'medium' | 'long';
  formality: 'casual' | 'formal';
}

export interface HierarchySuggestion {
  level: 'PROJECT' | 'MID_TASK' | 'SUB_TASK';
  suggestedParent?: string;
  suggestedChildren?: string[];
  confidence?: number;
}

export interface FileResult {
  id: string;
  name: string;
  url: string;
  type: string;
  platform: 'drive' | 'notion' | 'dropbox';
  lastModified: Date;
  size?: number;
}

export interface TimeRange {
  start: Date;
  end: Date;
}

export interface Platform {
  name: 'drive' | 'notion' | 'dropbox';
  enabled: boolean;
}

export interface FreeBusyOptions {
  includePrimary: boolean;
  includeSelected: boolean;
  excludeDeclined: boolean;
}

export interface TentativeEvent {
  id: string;
  googleId?: string;
  title: string;
  startTime: Date;
  endTime: Date;
  sequenceNumber?: number;
  totalInGroup?: number;
}

export interface AvailabilityStatus {
  candidate: DateTimeCandidate;
  isFree: boolean;
  conflictingEvents: string[];
}

export interface NotificationBatch {
  notifications: Notification[];
  batchedAt: Date;
  priority: 'low' | 'medium' | 'high';
}

export interface Notification {
  id: string;
  type: string;
  message: string;
  priority: 'low' | 'medium' | 'high';
  scheduledAt: Date;
}

export interface ProgressUpdate {
  message: string;
  estimatedTimeRemaining: number;
  currentStep: string;
  totalSteps: number;
}

export type JobId = string;

// Error types
export interface SystemError extends Error {
  code: string;
  context?: Record<string, any>;
}

export interface GoogleAPIError extends SystemError {
  apiName: string;
  statusCode: number;
}

export interface FallbackResponse {
  success: boolean;
  data?: any;
  fallbackUsed: boolean;
  originalError: string;
}