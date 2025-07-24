import winston from 'winston';
import { config } from '@/config/environment';

/**
 * Winston logger configuration for structured logging
 * Outputs JSON format for production, pretty format for development
 */
const logger = winston.createLogger({
  level: config.observability.logLevel,
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    config.server.nodeEnv === 'production'
      ? winston.format.json()
      : winston.format.combine(
          winston.format.colorize(),
          winston.format.simple()
        )
  ),
  defaultMeta: {
    service: 'slack-personal-assistant',
    environment: config.server.nodeEnv,
  },
  transports: [
    new winston.transports.Console(),
    // Add file transport for production
    ...(config.server.nodeEnv === 'production'
      ? [
          new winston.transports.File({
            filename: 'logs/error.log',
            level: 'error',
          }),
          new winston.transports.File({
            filename: 'logs/combined.log',
          }),
        ]
      : []),
  ],
});

export { logger };