import { App } from '@slack/bolt';
import { logger } from '@/utils/logger';

let cachedBotUserId: string | null = null;

/**
 * Bot User IDを取得（キャッシュ付き）
 * 起動時に一度だけ実行し、以降はキャッシュから返す
 */
export async function resolveBotUserId(app: App): Promise<string> {
  if (cachedBotUserId) {
    return cachedBotUserId;
  }

  try {
    const authResult = await app.client.auth.test();
    if (!authResult.user_id) {
      throw new Error('Failed to get bot user ID');
    }
    
    cachedBotUserId = authResult.user_id;
    logger.info('Bot User ID resolved', { botUserId: cachedBotUserId });
    
    return cachedBotUserId;
  } catch (error) {
    logger.error('Failed to resolve bot user ID', { error });
    throw error;
  }
}

/**
 * キャッシュされたBot User IDを取得
 * resolveBotUserIdが事前に呼ばれている必要がある
 */
export function getBotUserId(): string {
  if (!cachedBotUserId) {
    throw new Error('Bot User ID not initialized. Call resolveBotUserId first.');
  }
  return cachedBotUserId;
}