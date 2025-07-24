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
}

function validateRequiredEnvVars(): void {
  const required = [
    'SLACK_BOT_TOKEN',
    'SLACK_SIGNING_SECRET',
    'DATABASE_URL',
    'REDIS_URL',
  ];

  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
}

// Validate environment variables on startup
validateRequiredEnvVars();

export const config: Config = {
  server: {
    port: parseInt(process.env.PORT ?? '3000', 10),
    nodeEnv: process.env.NODE_ENV ?? 'development',
  },
  slack: {
    botToken: process.env.SLACK_BOT_TOKEN!,
    signingSecret: process.env.SLACK_SIGNING_SECRET!,
    socketMode: process.env.SLACK_SOCKET_MODE === 'true',
    appToken: process.env.SLACK_APP_TOKEN,
    clientId: process.env.SLACK_CLIENT_ID,
    clientSecret: process.env.SLACK_CLIENT_SECRET,
    stateSecret: process.env.SLACK_STATE_SECRET || 'my-state-secret',
    redirectUri: process.env.SLACK_REDIRECT_URI || 'https://kind-mice-follow.loca.lt/slack/oauth/redirect',
  },
  database: {
    url: process.env.DATABASE_URL!,
  },
  redis: {
    url: process.env.REDIS_URL!,
  },
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  },
  notion: {
    token: process.env.NOTION_TOKEN,
  },
  dropbox: {
    clientId: process.env.DROPBOX_CLIENT_ID,
    clientSecret: process.env.DROPBOX_CLIENT_SECRET,
  },
  observability: {
    logLevel: process.env.LOG_LEVEL ?? 'info',
    metricsPort: parseInt(process.env.METRICS_PORT ?? '9091', 10),
  },
};