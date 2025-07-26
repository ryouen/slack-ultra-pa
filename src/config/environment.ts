import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

interface Config {
  server: {
    port: number;
    nodeEnv: string;
  };
  slack: {
    botToken: string;
    signingSecret: string;
    socketMode: boolean;
    appToken?: string;
    clientId?: string;
    clientSecret?: string;
    stateSecret?: string;
    redirectUri?: string;
  };
  database: {
    url: string;
  };
  redis: {
    url: string;
  };
  google: {
    clientId?: string;
    clientSecret?: string;
  };
  notion: {
    token?: string;
  };
  dropbox: {
    clientId?: string;
    clientSecret?: string;
  };
  observability: {
    logLevel: string;
    metricsPort: number;
  };
  openai?: {
    apiKey?: string;
    model?: string;
    maxTokens?: number;
    temperature?: number;
  };
}

function validateRequiredEnvVars(): void {
  // OAuth mode check
  const isOAuthEnabled = process.env['SLACK_OAUTH_ENABLED'] === 'true';
  
  // Base required variables
  const required = [
    'SLACK_SIGNING_SECRET',
    'DATABASE_URL',
    'REDIS_URL',
  ];
  
  // Add conditional requirements
  if (!isOAuthEnabled) {
    required.push('SLACK_BOT_TOKEN');
  } else {
    // OAuth mode requires different variables
    const oauthRequired = ['SLACK_CLIENT_ID', 'SLACK_CLIENT_SECRET', 'SLACK_STATE_SECRET'];
    required.push(...oauthRequired);
  }

  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
}

// Validate environment variables on startup
validateRequiredEnvVars();

export const config: Config = {
  server: {
    port: parseInt(process.env['PORT'] ?? '3000', 10),
    nodeEnv: process.env['NODE_ENV'] ?? 'development',
  },
  slack: {
    botToken: process.env['SLACK_BOT_TOKEN'] || '',  // OAuth mode may not have token
    signingSecret: process.env['SLACK_SIGNING_SECRET']!,
    socketMode: process.env['SLACK_SOCKET_MODE'] === 'true',
    appToken: process.env['SLACK_APP_TOKEN'] || undefined,
    clientId: process.env['SLACK_CLIENT_ID'] || undefined,
    clientSecret: process.env['SLACK_CLIENT_SECRET'] || undefined,
    stateSecret: process.env['SLACK_STATE_SECRET'] || 'my-state-secret',
    redirectUri: process.env['SLACK_REDIRECT_URI'] || 'https://kind-mice-follow.loca.lt/slack/oauth/redirect',
  },
  database: {
    url: process.env['DATABASE_URL']!,
  },
  redis: {
    url: process.env['REDIS_URL']!,
  },
  google: {
    clientId: process.env['GOOGLE_CLIENT_ID'] || undefined,
    clientSecret: process.env['GOOGLE_CLIENT_SECRET'] || undefined,
  },
  notion: {
    token: process.env['NOTION_TOKEN'] || undefined,
  },
  dropbox: {
    clientId: process.env['DROPBOX_CLIENT_ID'] || undefined,
    clientSecret: process.env['DROPBOX_CLIENT_SECRET'] || undefined,
  },
  observability: {
    logLevel: process.env['LOG_LEVEL'] ?? 'info',
    metricsPort: parseInt(process.env['METRICS_PORT'] ?? '9091', 10),
  },
  openai: process.env['OPENAI_API_KEY'] ? {
    apiKey: process.env['OPENAI_API_KEY'],
    model: process.env['OPENAI_MODEL'] ?? 'gpt-4-turbo-preview',
    maxTokens: parseInt(process.env['OPENAI_MAX_TOKENS'] ?? '300', 10),
    temperature: parseFloat(process.env['OPENAI_TEMPERATURE'] ?? '0.7'),
  } : undefined,
};