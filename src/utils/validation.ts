import { logger } from '@/utils/logger';

/**
 * Validate and sanitize user input
 */
export class InputValidator {
  /**
   * Sanitize string input
   */
  static sanitizeString(input: string | undefined, maxLength: number = 1000): string {
    if (!input) return '';
    
    // Remove control characters and trim
    const sanitized = input
      .replace(/[\x00-\x1F\x7F]/g, '') // Remove control characters
      .trim()
      .substring(0, maxLength);
    
    return sanitized;
  }

  /**
   * Validate Slack user ID format
   */
  static isValidSlackUserId(userId: string): boolean {
    // Slack user IDs start with U or W and have 8-11 alphanumeric characters
    return /^[UW][A-Z0-9]{8,11}$/.test(userId);
  }

  /**
   * Validate Slack channel ID format
   */
  static isValidSlackChannelId(channelId: string): boolean {
    // Slack channel IDs start with C, G, or D and have 8-11 alphanumeric characters
    return /^[CGD][A-Z0-9]{8,11}$/.test(channelId);
  }

  /**
   * Validate URL format
   */
  static isValidUrl(url: string): boolean {
    try {
      const urlObj = new URL(url);
      return ['http:', 'https:'].includes(urlObj.protocol);
    } catch {
      return false;
    }
  }

  /**
   * Validate task priority
   */
  static isValidPriority(priority: string): priority is 'P1' | 'P2' | 'P3' {
    return ['P1', 'P2', 'P3'].includes(priority);
  }

  /**
   * Validate task level
   */
  static isValidTaskLevel(level: string): level is 'PROJECT' | 'MID_TASK' | 'SUB_TASK' {
    return ['PROJECT', 'MID_TASK', 'SUB_TASK'].includes(level);
  }

  /**
   * Validate language code
   */
  static isValidLanguage(lang: string): lang is 'ja' | 'en' {
    return ['ja', 'en'].includes(lang);
  }

  /**
   * Validate and parse integer with bounds
   */
  static parseIntWithBounds(
    value: string | undefined,
    min: number,
    max: number,
    defaultValue: number
  ): number {
    if (!value) return defaultValue;
    
    const parsed = parseInt(value, 10);
    if (isNaN(parsed)) return defaultValue;
    
    return Math.max(min, Math.min(max, parsed));
  }

  /**
   * Validate date string
   */
  static isValidDateString(dateStr: string): boolean {
    const date = new Date(dateStr);
    return !isNaN(date.getTime());
  }

  /**
   * Sanitize object for logging (remove sensitive data)
   */
  static sanitizeForLogging(obj: any): any {
    if (!obj || typeof obj !== 'object') return obj;
    
    const sensitiveKeys = ['token', 'password', 'secret', 'key', 'auth'];
    const sanitized = { ...obj };
    
    for (const key of Object.keys(sanitized)) {
      if (sensitiveKeys.some(sensitive => key.toLowerCase().includes(sensitive))) {
        sanitized[key] = '[REDACTED]';
      } else if (typeof sanitized[key] === 'object') {
        sanitized[key] = this.sanitizeForLogging(sanitized[key]);
      }
    }
    
    return sanitized;
  }
}

/**
 * Rate limiter for preventing abuse
 */
export class RateLimiter {
  private requests: Map<string, number[]> = new Map();
  
  constructor(
    private windowMs: number = 60000, // 1 minute
    private maxRequests: number = 60
  ) {}

  /**
   * Check if request is allowed
   */
  isAllowed(key: string): boolean {
    const now = Date.now();
    const requests = this.requests.get(key) || [];
    
    // Remove old requests outside window
    const validRequests = requests.filter(time => now - time < this.windowMs);
    
    if (validRequests.length >= this.maxRequests) {
      logger.warn('Rate limit exceeded', { key, requests: validRequests.length });
      return false;
    }
    
    validRequests.push(now);
    this.requests.set(key, validRequests);
    
    // Cleanup old entries periodically
    if (Math.random() < 0.01) { // 1% chance
      this.cleanup();
    }
    
    return true;
  }

  /**
   * Clean up old entries
   */
  private cleanup(): void {
    const now = Date.now();
    for (const [key, requests] of this.requests.entries()) {
      const validRequests = requests.filter(time => now - time < this.windowMs);
      if (validRequests.length === 0) {
        this.requests.delete(key);
      } else {
        this.requests.set(key, validRequests);
      }
    }
  }
}