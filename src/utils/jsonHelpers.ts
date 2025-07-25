import { logger } from '@/utils/logger';

/**
 * Safely parse JSON with error handling
 * @param json - JSON string to parse
 * @param fallback - Fallback value if parsing fails
 * @returns Parsed object or fallback value
 */
export function safeJsonParse<T = any>(
  json: string | null | undefined,
  fallback: T
): T {
  if (!json) return fallback;
  
  try {
    return JSON.parse(json) as T;
  } catch (error) {
    logger.warn('JSON parse error', { 
      error: error instanceof Error ? error.message : 'Unknown error',
      json: json.substring(0, 100) // Log first 100 chars only
    });
    return fallback;
  }
}

/**
 * Safely stringify JSON with error handling
 * @param obj - Object to stringify
 * @param fallback - Fallback value if stringify fails
 * @returns JSON string or fallback
 */
export function safeJsonStringify(
  obj: any,
  fallback: string = '{}'
): string {
  try {
    return JSON.stringify(obj);
  } catch (error) {
    logger.warn('JSON stringify error', {
      error: error instanceof Error ? error.message : 'Unknown error',
      type: typeof obj
    });
    return fallback;
  }
}

/**
 * Parse JSON with validation
 * @param json - JSON string to parse
 * @param validator - Validation function
 * @returns Parsed and validated object or null
 */
export function parseJsonWithValidation<T>(
  json: string,
  validator: (obj: any) => obj is T
): T | null {
  try {
    const parsed = JSON.parse(json);
    if (validator(parsed)) {
      return parsed;
    } else {
      logger.warn('JSON validation failed', { json: json.substring(0, 100) });
      return null;
    }
  } catch (error) {
    logger.warn('JSON parse error', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    return null;
  }
}

/**
 * Type guard for checking if a value is a valid JSON object
 */
export function isJsonObject(value: any): value is Record<string, any> {
  return value !== null && 
         typeof value === 'object' && 
         !Array.isArray(value) &&
         !(value instanceof Date);
}

/**
 * Type guard for checking if a value is a valid JSON array
 */
export function isJsonArray(value: any): value is any[] {
  return Array.isArray(value);
}