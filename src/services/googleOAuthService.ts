import { oauthTokenService } from './oauthTokenService';
import { secretsManagerService } from './secretsManagerService';
import { logger } from '@/utils/logger';
import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';

/**
 * Google OAuth Service
 * Handles Google Calendar, Drive, and Gmail OAuth flows
 */
export class GoogleOAuthService {
  private oauth2Client: OAuth2Client;
  private readonly SCOPES = {
    GOOGLE_CALENDAR: [
      'https://www.googleapis.com/auth/calendar.readonly',
      'https://www.googleapis.com/auth/calendar.events'
    ],
    GOOGLE_DRIVE: [
      'https://www.googleapis.com/auth/drive.readonly',
      'https://www.googleapis.com/auth/drive.metadata.readonly'
    ],
    GMAIL: [
      'https://www.googleapis.com/auth/gmail.readonly'
    ]
  };

  constructor() {
    // Initialize with empty credentials, will be loaded from Secrets Manager
    this.oauth2Client = new google.auth.OAuth2();
    this.initializeCredentials();
  }

  /**
   * Initialize OAuth credentials from Secrets Manager
   */
  private async initializeCredentials(): Promise<void> {
    try {
      const credentials = await secretsManagerService.getGoogleOAuthCredentials();
      
      this.oauth2Client = new google.auth.OAuth2(
        credentials.clientId,
        credentials.clientSecret,
        credentials.redirectUri
      );

      logger.info('Google OAuth credentials loaded from Secrets Manager');
    } catch (error) {
      logger.error('Failed to load Google OAuth credentials from Secrets Manager', { error });
      
      // Fallback to environment variables
      this.oauth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/auth/google/callback'
      );
    }
  }

  /**
   * Generate Google OAuth authorization URL
   */
  generateAuthUrl(userId: string, provider: 'GOOGLE_CALENDAR' | 'GOOGLE_DRIVE' | 'GMAIL'): string {
    try {
      const scopes = this.SCOPES[provider];
      
      const authUrl = this.oauth2Client.generateAuthUrl({
        access_type: 'offline', // Required for refresh token
        scope: scopes,
        state: JSON.stringify({ userId, provider }), // Pass user context
        prompt: 'consent' // Force consent to get refresh token
      });

      logger.info('Generated Google OAuth URL', {
        userId,
        provider,
        scopes: scopes.length
      });

      return authUrl;
    } catch (error) {
      logger.error('Failed to generate Google OAuth URL', { error, userId, provider });
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
      const { tokens } = await this.oauth2Client.getToken(code);

      if (!tokens.access_token) {
        throw new Error('No access token received');
      }

      // Calculate expiration date
      const expiresAt = tokens.expiry_date ? new Date(tokens.expiry_date) : undefined;

      // Store tokens securely
      await oauthTokenService.storeToken(
        userId,
        provider,
        tokens.access_token,
        tokens.refresh_token,
        expiresAt,
        tokens.scope
      );

      logger.info('Google OAuth callback processed successfully', {
        userId,
        provider,
        hasRefreshToken: !!tokens.refresh_token,
        expiresAt: expiresAt?.toISOString()
      });

      return {
        userId,
        provider,
        success: true
      };
    } catch (error) {
      logger.error('Failed to handle Google OAuth callback', { error, code: code.substring(0, 10) });
      throw new Error('Failed to process OAuth callback');
    }
  }

  /**
   * Refresh Google access token
   */
  async refreshToken(userId: string, provider: string): Promise<string> {
    try {
      const tokenData = await oauthTokenService.getToken(userId, provider);
      
      if (!tokenData || !tokenData.refreshToken) {
        throw new Error('No refresh token available');
      }

      // Set refresh token
      this.oauth2Client.setCredentials({
        refresh_token: tokenData.refreshToken
      });

      // Refresh the token
      const { credentials } = await this.oauth2Client.refreshAccessToken();

      if (!credentials.access_token) {
        throw new Error('Failed to refresh access token');
      }

      // Calculate new expiration
      const expiresAt = credentials.expiry_date ? new Date(credentials.expiry_date) : undefined;

      // Update stored token
      await oauthTokenService.storeToken(
        userId,
        provider,
        credentials.access_token,
        credentials.refresh_token || tokenData.refreshToken, // Keep existing refresh token if not provided
        expiresAt,
        tokenData.scope
      );

      // Update refresh timestamp
      await oauthTokenService.updateRefreshTimestamp(userId, provider);

      logger.info('Google token refreshed successfully', {
        userId,
        provider,
        expiresAt: expiresAt?.toISOString()
      });

      return credentials.access_token;
    } catch (error) {
      logger.error('Failed to refresh Google token', { error, userId, provider });
      
      // If refresh fails, invalidate the token
      await oauthTokenService.invalidateToken(userId, provider);
      
      throw new Error('Failed to refresh token');
    }
  }

  /**
   * Get valid Google access token (refresh if necessary)
   */
  async getValidToken(userId: string, provider: string): Promise<string> {
    try {
      const tokenData = await oauthTokenService.getToken(userId, provider);
      
      if (!tokenData) {
        throw new Error(`No token found for provider: ${provider}`);
      }

      // Check if token is expired
      if (oauthTokenService.isTokenExpired(tokenData.expiresAt)) {
        logger.info('Token expired, refreshing...', { userId, provider });
        return await this.refreshToken(userId, provider);
      }

      return tokenData.accessToken;
    } catch (error) {
      logger.error('Failed to get valid Google token', { error, userId, provider });
      throw new Error('Failed to get valid token');
    }
  }

  /**
   * Create authenticated Google API client
   */
  async createAuthenticatedClient(userId: string, provider: string): Promise<OAuth2Client> {
    try {
      const accessToken = await this.getValidToken(userId, provider);
      
      const client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        process.env.GOOGLE_REDIRECT_URI
      );

      client.setCredentials({
        access_token: accessToken
      });

      return client;
    } catch (error) {
      logger.error('Failed to create authenticated Google client', { error, userId, provider });
      throw new Error('Failed to create authenticated client');
    }
  }

  /**
   * Test Google Calendar API access
   */
  async testCalendarAccess(userId: string): Promise<boolean> {
    try {
      const auth = await this.createAuthenticatedClient(userId, 'GOOGLE_CALENDAR');
      const calendar = google.calendar({ version: 'v3', auth });

      // Simple test: get calendar list
      const response = await calendar.calendarList.list({
        maxResults: 1
      });

      logger.info('Google Calendar access test successful', {
        userId,
        calendarsFound: response.data.items?.length || 0
      });

      return true;
    } catch (error) {
      logger.error('Google Calendar access test failed', { error, userId });
      return false;
    }
  }

  /**
   * Revoke Google OAuth token
   */
  async revokeToken(userId: string, provider: string): Promise<void> {
    try {
      const tokenData = await oauthTokenService.getToken(userId, provider);
      
      if (tokenData) {
        // Revoke token with Google
        this.oauth2Client.setCredentials({
          access_token: tokenData.accessToken
        });
        
        await this.oauth2Client.revokeCredentials();
      }

      // Remove from our database
      await oauthTokenService.removeToken(userId, provider);

      logger.info('Google OAuth token revoked successfully', { userId, provider });
    } catch (error) {
      logger.error('Failed to revoke Google OAuth token', { error, userId, provider });
      throw new Error('Failed to revoke token');
    }
  }

  /**
   * Get user's Google Calendar events
   */
  async getCalendarEvents(userId: string, timeMin?: Date, timeMax?: Date): Promise<any[]> {
    try {
      const auth = await this.createAuthenticatedClient(userId, 'GOOGLE_CALENDAR');
      const calendar = google.calendar({ version: 'v3', auth });

      const response = await calendar.events.list({
        calendarId: 'primary',
        timeMin: timeMin?.toISOString(),
        timeMax: timeMax?.toISOString(),
        maxResults: 50,
        singleEvents: true,
        orderBy: 'startTime'
      });

      return response.data.items || [];
    } catch (error) {
      logger.error('Failed to get calendar events', { error, userId });
      throw new Error('Failed to get calendar events');
    }
  }

  /**
   * Get user's free/busy information
   */
  async getFreeBusy(userId: string, timeMin: Date, timeMax: Date): Promise<any> {
    try {
      const auth = await this.createAuthenticatedClient(userId, 'GOOGLE_CALENDAR');
      const calendar = google.calendar({ version: 'v3', auth });

      const response = await calendar.freebusy.query({
        requestBody: {
          timeMin: timeMin.toISOString(),
          timeMax: timeMax.toISOString(),
          items: [{ id: 'primary' }]
        }
      });

      return response.data.calendars?.primary || {};
    } catch (error) {
      logger.error('Failed to get free/busy information', { error, userId });
      throw new Error('Failed to get free/busy information');
    }
  }
}

// Export singleton instance
export const googleOAuthService = new GoogleOAuthService();