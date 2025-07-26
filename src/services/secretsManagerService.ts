import { logger } from '@/utils/logger';

/**
 * Secrets Manager Service
 * Handles secure secret storage and retrieval
 * Supports AWS Secrets Manager and GCP Secret Manager
 */
export class SecretsManagerService {
  private provider: 'aws' | 'gcp' | 'env';

  constructor() {
    // Determine provider based on environment
    if (process.env.AWS_REGION && process.env.AWS_ACCESS_KEY_ID) {
      this.provider = 'aws';
    } else if (process.env.GOOGLE_CLOUD_PROJECT) {
      this.provider = 'gcp';
    } else {
      this.provider = 'env';
      logger.warn('Using environment variables for secrets (not recommended for production)');
    }

    logger.info('Secrets Manager initialized', { provider: this.provider });
  }

  /**
   * Get secret value
   */
  async getSecret(secretName: string): Promise<string | null> {
    try {
      switch (this.provider) {
        case 'aws':
          return await this.getAWSSecret(secretName);
        case 'gcp':
          return await this.getGCPSecret(secretName);
        case 'env':
          return process.env[secretName] || null;
        default:
          throw new Error(`Unsupported secrets provider: ${this.provider}`);
      }
    } catch (error) {
      logger.error('Failed to get secret', { error, secretName });
      return null;
    }
  }

  /**
   * Get secret from AWS Secrets Manager
   */
  private async getAWSSecret(secretName: string): Promise<string | null> {
    try {
      // Lazy load AWS SDK to avoid dependency issues
      const { SecretsManagerClient, GetSecretValueCommand } = await import('@aws-sdk/client-secrets-manager');
      
      const client = new SecretsManagerClient({
        region: process.env.AWS_REGION || 'us-east-1'
      });

      const command = new GetSecretValueCommand({
        SecretId: secretName
      });

      const response = await client.send(command);
      
      if (response.SecretString) {
        // Try to parse as JSON first
        try {
          const parsed = JSON.parse(response.SecretString);
          return parsed[secretName] || response.SecretString;
        } catch {
          // Return as plain string if not JSON
          return response.SecretString;
        }
      }

      return null;
    } catch (error) {
      logger.error('Failed to get AWS secret', { error, secretName });
      return null;
    }
  }

  /**
   * Get secret from GCP Secret Manager
   */
  private async getGCPSecret(secretName: string): Promise<string | null> {
    try {
      // Lazy load GCP SDK to avoid dependency issues
      const { SecretManagerServiceClient } = await import('@google-cloud/secret-manager');
      
      const client = new SecretManagerServiceClient();
      const projectId = process.env.GOOGLE_CLOUD_PROJECT;

      if (!projectId) {
        throw new Error('GOOGLE_CLOUD_PROJECT environment variable not set');
      }

      const name = `projects/${projectId}/secrets/${secretName}/versions/latest`;
      
      const [version] = await client.accessSecretVersion({ name });
      
      if (version.payload?.data) {
        return version.payload.data.toString();
      }

      return null;
    } catch (error) {
      logger.error('Failed to get GCP secret', { error, secretName });
      return null;
    }
  }

  /**
   * Store secret (for development/testing)
   */
  async storeSecret(secretName: string, secretValue: string): Promise<boolean> {
    try {
      switch (this.provider) {
        case 'aws':
          return await this.storeAWSSecret(secretName, secretValue);
        case 'gcp':
          return await this.storeGCPSecret(secretName, secretValue);
        case 'env':
          logger.warn('Cannot store secrets in environment variables');
          return false;
        default:
          return false;
      }
    } catch (error) {
      logger.error('Failed to store secret', { error, secretName });
      return false;
    }
  }

  /**
   * Store secret in AWS Secrets Manager
   */
  private async storeAWSSecret(secretName: string, secretValue: string): Promise<boolean> {
    try {
      const { SecretsManagerClient, CreateSecretCommand, UpdateSecretCommand } = await import('@aws-sdk/client-secrets-manager');
      
      const client = new SecretsManagerClient({
        region: process.env.AWS_REGION || 'us-east-1'
      });

      try {
        // Try to update existing secret
        const updateCommand = new UpdateSecretCommand({
          SecretId: secretName,
          SecretString: secretValue
        });
        
        await client.send(updateCommand);
        logger.info('AWS secret updated successfully', { secretName });
      } catch (updateError) {
        // If update fails, try to create new secret
        const createCommand = new CreateSecretCommand({
          Name: secretName,
          SecretString: secretValue,
          Description: `Secret for ${secretName}`
        });
        
        await client.send(createCommand);
        logger.info('AWS secret created successfully', { secretName });
      }

      return true;
    } catch (error) {
      logger.error('Failed to store AWS secret', { error, secretName });
      return false;
    }
  }

  /**
   * Store secret in GCP Secret Manager
   */
  private async storeGCPSecret(secretName: string, secretValue: string): Promise<boolean> {
    try {
      const { SecretManagerServiceClient } = await import('@google-cloud/secret-manager');
      
      const client = new SecretManagerServiceClient();
      const projectId = process.env.GOOGLE_CLOUD_PROJECT;

      if (!projectId) {
        throw new Error('GOOGLE_CLOUD_PROJECT environment variable not set');
      }

      const parent = `projects/${projectId}`;

      try {
        // Try to create the secret
        await client.createSecret({
          parent,
          secretId: secretName,
          secret: {
            replication: {
              automatic: {}
            }
          }
        });
        logger.info('GCP secret created successfully', { secretName });
      } catch (createError) {
        // Secret might already exist, continue to add version
        logger.debug('GCP secret already exists, adding version', { secretName });
      }

      // Add secret version
      const secretPath = `projects/${projectId}/secrets/${secretName}`;
      await client.addSecretVersion({
        parent: secretPath,
        payload: {
          data: Buffer.from(secretValue)
        }
      });

      logger.info('GCP secret version added successfully', { secretName });
      return true;
    } catch (error) {
      logger.error('Failed to store GCP secret', { error, secretName });
      return false;
    }
  }

  /**
   * Get OAuth encryption key
   */
  async getOAuthEncryptionKey(): Promise<string> {
    const key = await this.getSecret('OAUTH_ENCRYPTION_KEY');
    
    if (!key) {
      logger.warn('OAuth encryption key not found in secrets manager, using environment variable');
      return process.env.OAUTH_ENCRYPTION_KEY || 'default-key-change-in-production';
    }

    return key;
  }

  /**
   * Get Google OAuth credentials
   */
  async getGoogleOAuthCredentials(): Promise<{
    clientId: string;
    clientSecret: string;
    redirectUri: string;
  }> {
    const [clientId, clientSecret, redirectUri] = await Promise.all([
      this.getSecret('GOOGLE_CLIENT_ID'),
      this.getSecret('GOOGLE_CLIENT_SECRET'),
      this.getSecret('GOOGLE_REDIRECT_URI')
    ]);

    return {
      clientId: clientId || process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: clientSecret || process.env.GOOGLE_CLIENT_SECRET || '',
      redirectUri: redirectUri || process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/auth/google/callback'
    };
  }

  /**
   * Get Notion OAuth credentials
   */
  async getNotionOAuthCredentials(): Promise<{
    clientId: string;
    clientSecret: string;
    redirectUri: string;
  }> {
    const [clientId, clientSecret, redirectUri] = await Promise.all([
      this.getSecret('NOTION_CLIENT_ID'),
      this.getSecret('NOTION_CLIENT_SECRET'),
      this.getSecret('NOTION_REDIRECT_URI')
    ]);

    return {
      clientId: clientId || process.env.NOTION_CLIENT_ID || '',
      clientSecret: clientSecret || process.env.NOTION_CLIENT_SECRET || '',
      redirectUri: redirectUri || process.env.NOTION_REDIRECT_URI || 'http://localhost:3000/auth/notion/callback'
    };
  }
}

// Export singleton instance
export const secretsManagerService = new SecretsManagerService();