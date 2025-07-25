import { logger } from '@/utils/logger';
import { WebClient } from '@slack/web-api';

/**
 * Custom error classes for better error handling
 */
export class AppError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500,
    public isOperational: boolean = true
  ) {
    super(message);
    this.name = 'AppError';
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super(message, 'VALIDATION_ERROR', 400);
    this.name = 'ValidationError';
  }
}

export class NotFoundError extends AppError {
  constructor(message: string) {
    super(message, 'NOT_FOUND', 404);
    this.name = 'NotFoundError';
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string) {
    super(message, 'UNAUTHORIZED', 401);
    this.name = 'UnauthorizedError';
  }
}

export class RateLimitError extends AppError {
  constructor(message: string) {
    super(message, 'RATE_LIMIT_EXCEEDED', 429);
    this.name = 'RateLimitError';
  }
}

/**
 * Error response formatter
 */
export interface ErrorResponse {
  error: {
    code: string;
    message: string;
    timestamp: string;
    requestId?: string;
  };
}

/**
 * Format error for API response
 */
export function formatErrorResponse(
  error: Error | AppError,
  requestId?: string
): ErrorResponse {
  const isAppError = error instanceof AppError;
  
  return {
    error: {
      code: isAppError ? error.code : 'INTERNAL_ERROR',
      message: isAppError && error.isOperational ? error.message : 'Internal server error',
      timestamp: new Date().toISOString(),
      requestId
    }
  };
}

/**
 * Send error message to Slack user
 */
export async function sendErrorToSlack(
  client: WebClient,
  channelId: string,
  userId: string,
  error: Error | AppError,
  language: 'ja' | 'en' = 'ja'
): Promise<void> {
  try {
    const errorMessages = {
      ja: {
        title: '[WARNING] エラーが発生しました',
        generic: '申し訳ございません。処理中にエラーが発生しました。',
        tryAgain: 'しばらく待ってから再度お試しください。',
        validation: '入力内容に問題があります。',
        notFound: '指定されたデータが見つかりません。',
        rateLimit: 'リクエストが多すぎます。しばらくお待ちください。',
        unauthorized: '権限がありません。'
      },
      en: {
        title: '[WARNING] An error occurred',
        generic: 'Sorry, an error occurred while processing your request.',
        tryAgain: 'Please try again later.',
        validation: 'There is an issue with your input.',
        notFound: 'The requested data was not found.',
        rateLimit: 'Too many requests. Please wait a moment.',
        unauthorized: 'You do not have permission.'
      }
    };

    const messages = errorMessages[language];
    let specificMessage = messages.generic;

    if (error instanceof ValidationError) {
      specificMessage = messages.validation;
    } else if (error instanceof NotFoundError) {
      specificMessage = messages.notFound;
    } else if (error instanceof RateLimitError) {
      specificMessage = messages.rateLimit;
    } else if (error instanceof UnauthorizedError) {
      specificMessage = messages.unauthorized;
    }

    await client.chat.postEphemeral({
      channel: channelId,
      user: userId,
      text: messages.title,
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `${messages.title}\n\n${specificMessage}\n${messages.tryAgain}`
          }
        }
      ]
    });
  } catch (slackError) {
    logger.error('Failed to send error message to Slack', { 
      originalError: error,
      slackError 
    });
  }
}

/**
 * Async error handler wrapper
 */
export function asyncHandler<T extends (...args: any[]) => Promise<any>>(fn: T): T {
  return (async (...args: Parameters<T>) => {
    try {
      return await fn(...args);
    } catch (error) {
      logger.error('Unhandled async error', { 
        error,
        function: fn.name 
      });
      throw error;
    }
  }) as T;
}

/**
 * Retry async operation with exponential backoff
 */
export async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  options: {
    maxRetries?: number;
    initialDelayMs?: number;
    maxDelayMs?: number;
    onRetry?: (error: Error, attempt: number) => void;
  } = {}
): Promise<T> {
  const {
    maxRetries = 3,
    initialDelayMs = 1000,
    maxDelayMs = 10000,
    onRetry
  } = options;

  let lastError: Error;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;
      
      if (attempt < maxRetries - 1) {
        const delay = Math.min(
          initialDelayMs * Math.pow(2, attempt),
          maxDelayMs
        );
        
        if (onRetry) {
          onRetry(lastError, attempt + 1);
        }
        
        logger.warn('Retrying operation', {
          attempt: attempt + 1,
          maxRetries,
          delay,
          error: lastError.message
        });
        
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError!;
}

/**
 * Global error handler for unhandled rejections
 */
export function setupGlobalErrorHandlers(): void {
  process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Rejection', {
      reason,
      promise
    });
  });

  process.on('uncaughtException', (error) => {
    logger.error('Uncaught Exception', { error });
    // Give time to log before exit
    setTimeout(() => {
      process.exit(1);
    }, 1000);
  });
}