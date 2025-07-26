import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { JaegerExporter } from '@opentelemetry/exporter-jaeger';
import { Resource } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
import { logger } from '@/utils/logger';

/**
 * Initialize OpenTelemetry tracing
 */
export function initializeTracing(): void {
  try {
    // Skip tracing if disabled
    if (process.env.TRACING_ENABLED !== 'true') {
      logger.info('OpenTelemetry tracing disabled');
      return;
    }

    const jaegerExporter = new JaegerExporter({
      endpoint: process.env.JAEGER_ENDPOINT || 'http://localhost:14268/api/traces',
    });

    const sdk = new NodeSDK({
      resource: new Resource({
        [SemanticResourceAttributes.SERVICE_NAME]: 'slack-personal-assistant',
        [SemanticResourceAttributes.SERVICE_VERSION]: process.env.npm_package_version || '1.0.0',
        [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: process.env.NODE_ENV || 'development',
      }),
      traceExporter: jaegerExporter,
      instrumentations: [
        getNodeAutoInstrumentations({
          // Disable some instrumentations that might be too verbose
          '@opentelemetry/instrumentation-fs': {
            enabled: false,
          },
          '@opentelemetry/instrumentation-dns': {
            enabled: false,
          },
        }),
      ],
    });

    sdk.start();
    logger.info('OpenTelemetry tracing initialized successfully');

    // Graceful shutdown
    process.on('SIGTERM', () => {
      sdk.shutdown()
        .then(() => logger.info('OpenTelemetry terminated'))
        .catch((error) => logger.error('Error terminating OpenTelemetry', error))
        .finally(() => process.exit(0));
    });

  } catch (error) {
    logger.error('Failed to initialize OpenTelemetry tracing', { error });
  }
}

// Export tracing utilities
export { trace, context, SpanStatusCode, SpanKind } from '@opentelemetry/api';