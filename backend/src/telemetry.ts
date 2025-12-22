/**
 * OpenTelemetry Configuration for ETP Express Backend
 *
 * This module initializes the OpenTelemetry SDK for distributed tracing.
 * It MUST be imported at the very top of main.ts, before any other imports,
 * to ensure all modules are properly instrumented.
 *
 * @see https://opentelemetry.io/docs/instrumentation/js/
 * @since Issue #857
 */

import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';

const isProduction = process.env.NODE_ENV === 'production';

// Configure OTLP exporter for traces
// Railway/Sentry/Jaeger compatible endpoint
const traceExporter = new OTLPTraceExporter({
  url:
    process.env.OTEL_EXPORTER_OTLP_ENDPOINT ||
    'http://localhost:4318/v1/traces',
  headers: process.env.OTEL_EXPORTER_OTLP_HEADERS
    ? JSON.parse(process.env.OTEL_EXPORTER_OTLP_HEADERS)
    : undefined,
});

// Create SDK with auto-instrumentation
export const otelSdk = new NodeSDK({
  serviceName: process.env.OTEL_SERVICE_NAME || 'etp-express-backend',
  traceExporter,
  instrumentations: [
    getNodeAutoInstrumentations({
      // Disable noisy/unnecessary instrumentations
      '@opentelemetry/instrumentation-fs': { enabled: false },
      '@opentelemetry/instrumentation-dns': { enabled: false },
      // Configure HTTP instrumentation
      '@opentelemetry/instrumentation-http': {
        enabled: true,
        ignoreIncomingRequestHook: (request) => {
          // Ignore health check endpoints to reduce noise
          const url = request.url || '';
          return url.includes('/api/health');
        },
      },
      // Configure Express instrumentation
      '@opentelemetry/instrumentation-express': {
        enabled: true,
      },
    }),
  ],
  // Additional resource attributes
  resourceDetectors: [],
});

// Start the SDK
try {
  otelSdk.start();
  if (!isProduction) {
    // eslint-disable-next-line no-console
    console.log('[OpenTelemetry] SDK initialized successfully');
  }
} catch (error) {
  console.error('[OpenTelemetry] Failed to initialize SDK:', error);
}

// Graceful shutdown handler
// Note: main.ts also handles SIGTERM, but we ensure SDK cleanup here
const shutdownOtel = async (): Promise<void> => {
  try {
    await otelSdk.shutdown();
    if (!isProduction) {
      // eslint-disable-next-line no-console
      console.log('[OpenTelemetry] SDK shut down successfully');
    }
  } catch (error) {
    console.error('[OpenTelemetry] Error shutting down SDK:', error);
  }
};

process.on('SIGTERM', shutdownOtel);
process.on('SIGINT', shutdownOtel);
