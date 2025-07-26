import { oauthTokenService } from './oauthTokenService';
import { secretsManagerService } from './secretsManagerService';
import { logger } from '@/utils/logger';
import { Client } from '@notionhq/client';

/**
 * Notion OAuth Service
 * Handles Notion OAuth flows and API integration
 */
export class NotionOAuthService {
  private readonly NOTION_OAUTH_URL = 'https://api.notion.com/v1/oauth/authorize';
  private readonly NOTION_TOKEN_URL = 'https://api.notion.com/v1/oauth/token';
  
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly redirectUri: string;

  constructor() {
    this.clientId = '';
    this.clientSecret = '';
    this.redirectUri = '';
    this.initializeCredentials();
  }

  /**
   * Initialize OAuth credentials from Secrets Manager
   */
  private async initializeCredentials(): Promise<void> {
    try {
      const credentials = await secretsManagerService.getNotionOAuthCredentials();
      
      this.clientId = credentials.clientId;
      this.clientSecret = credentials.clientSecret;
      this.redirectUri = credentials.redirectUri;

      if (!this.clientId || !this.clientSecret) {
        logger.warn('Notion OAuth credentials not configured in Secrets Manager');
      } else {
        logger.info('Notion OAuth credentials loaded from Secrets Manager');
      }
    } catch (error) {
      logger.error('Failed to load Notion OAuth credentials from Secrets Manager', { error });
      
      // Fallback to environment variables
      this.clientId = process.env.NOTION_CLIENT_ID || '';
      this.clientSecret = process.env.NOTION_CLIENT_SECRET || '';
      this.redirectUri = process.env.NOTION_REDIRECT_URI || 'http://localhost:3000/auth/notion/callback';
    }
  }

  /**
   * Generate Notion OAuth authorization URL
   */
  generateAuthUrl(userId: string): string {
    try {
      const state = JSON.stringify({ userId, provider: 'NOTION' });
      
      const params = new URLSearchParams({
        client_id: this.clientId,
        response_type: 'code',
        owner: 'user',
        redirect_uri: this.redirectUri,
        state: state
      });

      const authUrl = `${this.NOTION_OAUTH_URL}?${params.toString()}`;

      logger.info('Generated Notion OAuth URL', { userId });

      return authUrl;
    } catch (error) {
      logger.error('Failed to generate Notion OAuth URL', { error, userId });
      throw new Error('Failed to generate authorization URL');
    }
  }

  /**
   * Handle OAuth callback and exchange code for tokens
   */
  async handleCallback(code: string, state: string): Promise<{
    userId: string;
    provider: string;
    success: boolean;
  }> {
    try {
      // Parse state parameter
      const { userId, provider } = JSON.parse(state);

      // Exchange authorization code for tokens
      const tokenResponse = await fetch(this.NOTION_TOKEN_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64')}`
        },
        body: JSON.stringify({
          grant_type: 'authorization_code',
          code: code,
          redirect_uri: this.redirectUri
        })
      });

      if (!tokenResponse.ok) {
        const errorData = await tokenResponse.text();
        throw new Error(`Token exchange failed: ${errorData}`);
      }

      const tokenData = await tokenResponse.json();

      if (!tokenData.access_token) {
        throw new Error('No access token received from Notion');
      }

      // Store tokens securely
      await oauthTokenService.storeToken(
        userId,
        'NOTION',
        tokenData.access_token,
        undefined, // Notion doesn't provide refresh tokens
        undefined, // Notion tokens don't expire
        'read,write' // Default scope
      );

      logger.info('Notion OAuth callback processed successfully', {
        userId,
        provider,
        workspaceId: tokenData.workspace_id,
        workspaceName: tokenData.workspace_name
      });

      return {
        userId,
        provider,
        success: true
      };
    } catch (error) {
      logger.error('Failed to handle Notion OAuth callback', { error, code: code.substring(0, 10) });
      throw new Error('Failed to process OAuth callback');
    }
  }

  /**
   * Get valid Notion access token
   */
  async getValidToken(userId: string): Promise<string> {
    try {
      const tokenData = await oauthTokenService.getToken(userId, 'NOTION');
      
      if (!tokenData) {
        throw new Error('No Notion token found');
      }

      // Notion tokens don't expire, so just return the access token
      return tokenData.accessToken;
    } catch (error) {
      logger.error('Failed to get valid Notion token', { error, userId });
      throw new Error('Failed to get valid token');
    }
  }

  /**
   * Create authenticated Notion client
   */
  async createAuthenticatedClient(userId: string): Promise<Client> {
    try {
      const accessToken = await this.getValidToken(userId);
      
      const client = new Client({
        auth: accessToken,
        notionVersion: '2022-06-28'
      });

      return client;
    } catch (error) {
      logger.error('Failed to create authenticated Notion client', { error, userId });
      throw new Error('Failed to create authenticated client');
    }
  }

  /**
   * Test Notion API access
   */
  async testNotionAccess(userId: string): Promise<boolean> {
    try {
      const client = await this.createAuthenticatedClient(userId);

      // Simple test: get user info
      const response = await client.users.me({});

      logger.info('Notion access test successful', {
        userId,
        notionUserId: response.id,
        userName: response.name
      });

      return true;
    } catch (error) {
      logger.error('Notion access test failed', { error, userId });
      return false;
    }
  }

  /**
   * Get user's Notion pages
   */
  async getUserPages(userId: string, pageSize: number = 10): Promise<any[]> {
    try {
      const client = await this.createAuthenticatedClient(userId);

      const response = await client.search({
        filter: {
          property: 'object',
          value: 'page'
        },
        page_size: pageSize
      });

      return response.results;
    } catch (error) {
      logger.error('Failed to get Notion pages', { error, userId });
      throw new Error('Failed to get Notion pages');
    }
  }

  /**
   * Get user's Notion databases
   */
  async getUserDatabases(userId: string, pageSize: number = 10): Promise<any[]> {
    try {
      const client = await this.createAuthenticatedClient(userId);

      const response = await client.search({
        filter: {
          property: 'object',
          value: 'database'
        },
        page_size: pageSize
      });

      return response.results;
    } catch (error) {
      logger.error('Failed to get Notion databases', { error, userId });
      throw new Error('Failed to get Notion databases');
    }
  }

  /**
   * Revoke Notion OAuth token
   */
  async revokeToken(userId: string): Promise<void> {
    try {
      // Notion doesn't have a revoke endpoint, so just remove from our database
      await oauthTokenService.removeToken(userId, 'NOTION');

      logger.info('Notion OAuth token revoked successfully', { userId });
    } catch (error) {
      logger.error('Failed to revoke Notion OAuth token', { error, userId });
      throw new Error('Failed to revoke token');
    }
  }
}

// Export singleton instance
export const notionOAuthService = new NotionOAuthService();