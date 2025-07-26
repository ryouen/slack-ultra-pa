import { PrismaClient } from '@prisma/client';
import { logger } from '@/utils/logger';
import { getPrismaClient } from '@/config/database';
import { secretsManagerService } from './secretsManagerService';
import crypto from 'crypto';

/**
 * OAuth Token Management Service
 * Handles secure token storage, refresh, and provider management
 */
export class OAuthTokenService {
  private prisma: PrismaClient;
  private encryptionKey: string;

  constructor() {
    this.prisma = getPrismaClient();
    this.encryptionKey = ''; // Will be loaded from Secrets Manager
    this.initializeEncryptionKey();
  }

  /**
   * Initialize encryption key from Secrets Manager
   */
  private async initializeEncryptionKey(): Promise<void> {
    try {
      this.encryptionKey = await secretsManagerService.getOAuthEncryptionKey();
      logger.info('OAuth encryption key loaded from Secrets Manager');
    } catch (error) {
      logger.error('Failed to load encryption key from Secrets Manager', { error });
      this.encryptionKey = 'default-key-change-in-production';
    }
  }

  /**
   * Encrypt sensitive token data
   */
  private encrypt(text: string): string {
    try {
      const algorithm = 'aes-256-gcm';
      const iv = crypto.randomBytes(16);
      const cipher = crypto.createCipher(algorithm, this.encryptionKey);
      
      let encrypted = cipher.update(text, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      const authTag = cipher.getAuthTag();
      
      // Combine iv, authTag, and encrypted data
      return iv.toString('hex') + ':' + authTag.toString('hex') + ':' + encrypted;
    } catch (error) {
      logger.error('Token encryption failed', { error });
      throw new Error('Failed to encrypt token');
    }
  }

  /**
   * Decrypt sensitive token data
   */
  private decrypt(encryptedText: string): string {
    try {
      const algorithm = 'aes-256-gcm';
      const parts = encryptedText.split(':');
      
      if (parts.length !== 3) {
        throw new Error('Invalid encrypted token format');
      }
      
      const iv = Buffer.from(parts[0]!, 'hex');
      const authTag = Buffer.from(parts[1]!, 'hex');
      const encrypted = parts[2]!;
      
      const decipher = crypto.createDecipher(algorithm, this.encryptionKey);
      decipher.setAuthTag(authTag);
      
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return decrypted;
    } catch (error) {
      logger.error('Token decryption failed', { error });
      throw new Error('Failed to decrypt token');
    }
  }

  /**
   * Store OAuth token securely
   */
  async storeToken(
    userId: string,
    provider: string,
    accessToken: string,
    refreshToken?: string,
    expiresAt?: Date,
    scope?: string
  ): Promise<void> {
    try {
      const encryptedAccessToken = this.encrypt(accessToken);
      const encryptedRefreshToken = refreshToken ? this.encrypt(refreshToken) : null;

      await this.prisma.oAuthToken.upsert({
        where: {
          userId_provider: {
            userId,
            provider
          }
        },
        update: {
          accessToken: encryptedAccessToken,
          refreshToken: encryptedRefreshToken,
          expiresAt: expiresAt || null,
          scope: scope || '',
          lastRefresh: new Date(),
          isValid: true,
          updatedAt: new Date()
        },
        create: {
          userId,
          provider,
          accessToken: encryptedAccessToken,
          refreshToken: encryptedRefreshToken,
          expiresAt: expiresAt || null,
          scope: scope || '',
          tokenType: 'Bearer',
          isValid: true
        }
      });

      logger.info('OAuth token stored successfully', {
        userId,
        provider,
        hasRefreshToken: !!refreshToken,
        expiresAt: expiresAt?.toISOString()
      });
    } catch (error) {
      logger.error('Failed to store OAuth token', { error, userId, provider });
      throw new Error('Failed to store OAuth token');
    }
  }

  /**
   * Retrieve and decrypt OAuth token
   */
  async getToken(userId: string, provider: string): Promise<{
    accessToken: string;
    refreshToken?: string;
    expiresAt?: Date;
    scope: string;
    isValid: boolean;
  } | null> {
    try {
      const tokenRecord = await this.prisma.oAuthToken.findUnique({
        where: {
          userId_provider: {
            userId,
            provider
          }
        }
      });

      if (!tokenRecord || !tokenRecord.isValid) {
        return null;
      }

      const accessToken = this.decrypt(tokenRecord.accessToken);
      const refreshToken = tokenRecord.refreshToken ? this.decrypt(tokenRecord.refreshToken) : undefined;

      return {
        accessToken,
        refreshToken,
        expiresAt: tokenRecord.expiresAt || undefined,
        scope: tokenRecord.scope,
        isValid: tokenRecord.isValid
      };
    } catch (error) {
      logger.error('Failed to retrieve OAuth token', { error, userId, provider });
      throw new Error('Failed to retrieve OAuth token');
    }
  }

  /**
   * Check if token is expired
   */
  isTokenExpired(expiresAt?: Date): boolean {
    if (!expiresAt) {
      return false; // No expiration date means token doesn't expire
    }
    
    // Add 5 minute buffer to prevent edge cases
    const bufferTime = 5 * 60 * 1000; // 5 minutes in milliseconds
    return new Date().getTime() > (expiresAt.getTime() - bufferTime);
  }

  /**
   * Get user's connected providers
   */
  async getUserProviders(userId: string): Promise<Array<{
    provider: string;
    connectedAt: Date;
    expiresAt?: Date;
    scope: string;
    isValid: boolean;
  }>> {
    try {
      const tokens = await this.prisma.oAuthToken.findMany({
        where: { 
          userId,
          isValid: true 
        },
        select: {
          provider: true,
          createdAt: true,
          expiresAt: true,
          scope: true,
          isValid: true
        }
      });

      return tokens.map(token => ({
        provider: token.provider,
        connectedAt: token.createdAt,
        expiresAt: token.expiresAt || undefined,
        scope: token.scope,
        isValid: token.isValid
      }));
    } catch (error) {
      logger.error('Failed to get user providers', { error, userId });
      throw new Error('Failed to get user providers');
    }
  }

  /**
   * Remove OAuth token
   */
  async removeToken(userId: string, provider: string): Promise<void> {
    try {
      await this.prisma.oAuthToken.delete({
        where: {
          userId_provider: {
            userId,
            provider
          }
        }
      });

      logger.info('OAuth token removed successfully', { userId, provider });
    } catch (error) {
      logger.error('Failed to remove OAuth token', { error, userId, provider });
      throw new Error('Failed to remove OAuth token');
    }
  }

  /**
   * Mark token as invalid
   */
  async invalidateToken(userId: string, provider: string): Promise<void> {
    try {
      await this.prisma.oAuthToken.update({
        where: {
          userId_provider: {
            userId,
            provider
          }
        },
        data: {
          isValid: false,
          updatedAt: new Date()
        }
      });

      logger.info('OAuth token invalidated', { userId, provider });
    } catch (error) {
      logger.error('Failed to invalidate OAuth token', { error, userId, provider });
      throw new Error('Failed to invalidate OAuth token');
    }
  }

  /**
   * Update token refresh timestamp
   */
  async updateRefreshTimestamp(userId: string, provider: string): Promise<void> {
    try {
      await this.prisma.oAuthToken.update({
        where: {
          userId_provider: {
            userId,
            provider
          }
        },
        data: {
          lastRefresh: new Date(),
          updatedAt: new Date()
        }
      });
    } catch (error) {
      logger.error('Failed to update refresh timestamp', { error, userId, provider });
      // Don't throw error for this non-critical operation
    }
  }
}

// Export singleton instance with lazy initialization
let _instance: OAuthTokenService | null = null;
export const getOAuthTokenService = () => {
  if (!_instance) {
    _instance = new OAuthTokenService();
  }
  return _instance;
};

// For backward compatibility - create a proxy object
export const oauthTokenService = new Proxy({} as OAuthTokenService, {
  get(_target, prop) {
    return getOAuthTokenService()[prop as keyof OAuthTokenService];
  }
});