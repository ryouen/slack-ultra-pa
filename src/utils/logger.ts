import winston from 'winston';
import { config } from '@/config/environment';
import { trace } from '@opentelemetry/api';

// Custom format to add tracing information
const tracingFormat = winston.format((info: any) => {
  const span = trace.getActiveSpan();
  if (span) {
    const spanContext = span.spanContext();
    info['traceId'] = spanContext.traceId;
    info['spanId'] = spanContext.spanId;
  }
  return info;
});

/**
 * Winston logger configuration for structured logging
 * Outputs JSON format for production, pretty format for development
 * Includes OpenTelemetry tracing information
 */
const logger = winston.createLogger({
  level: config.observability.logLevel,
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    tracingFormat(),
    config.server.nodeEnv === 'production'
      ? winston.format.json()
      : winston.format.combine(
          winston.format.colorize(),
          winston.format.printf((info: any) => {
            const { timestamp, level, message, traceId, spanId, ...meta } = info;
            const traceInfo = traceId ? ` [trace:${String(traceId).slice(-8)} span:${String(spanId || '').slice(-8)}]` : '';
            const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
            return `${timestamp} ${level}:${traceInfo} ${message}${metaStr}`;
          })
        )
  ),
  defaultMeta: {
    service: 'slack-personal-assistant',
    environment: config.server.nodeEnv,
    version: process.env['npm_package_version'] || '1.0.0',
  },
  transports: [
    new winston.transports.Console(),
    // Add file transport for production
    ...(config.server.nodeEnv === 'production'
      ? [
          new winston.transports.File({
            filename: 'logs/error.log',
            level: 'error',
            format: winston.format.json(),
          }),
          new winston.transports.File({
            filename: 'logs/combined.log',
            format: winston.format.json(),
          }),
        ]
      : []),
  ],
});

// Add Loki transport if configured
if (process.env['LOKI_URL']) {
  try {
    // Note: winston-loki would need to be installed separately
    // For now, we'll use HTTP transport to send to Loki
    logger.add(new winston.transports.Http({
      host: process.env['LOKI_HOST'] || 'localhost',
      port: parseInt(process.env['LOKI_PORT'] || '3100'),
      path: '/loki/api/v1/push',
      ssl: process.env['LOKI_SSL'] === 'true',
    }));
    
    logger.info('Loki transport configured');
  } catch (error) {
    logger.warn('Failed to configure Loki transport', { error });
  }
}

export { logger };