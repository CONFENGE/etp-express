import * as Sentry from '@sentry/nestjs';
import { nodeProfilingIntegration } from '@sentry/profiling-node';

/**
 * Inicializa configuração do Sentry para monitoramento de erros em produção
 *
 * Features:
 * - Error tracking: Captura exceptions automaticamente
 * - Performance monitoring: Traces HTTP requests e DB queries
 * - Profiling: Performance profiling do Node.js
 * - Release tracking: Vincula erros a versões específicas do código
 *
 * @see https://docs.sentry.io/platforms/node/guides/nestjs/
 */
export const initSentry = () => {
  const dsn = process.env.SENTRY_DSN;

  if (!dsn) {
    console.warn(
      '[Sentry] SENTRY_DSN not configured. Error tracking disabled.',
    );
    return;
  }

  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV || 'development',
    release: process.env.RAILWAY_GIT_COMMIT_SHA || 'local',

    // Traces Sample Rate: 10% das requests em produção
    // Aumentar para 100% em development para debug
    tracesSampleRate:
      parseFloat(process.env.SENTRY_TRACES_SAMPLE_RATE || '0') ||
      (process.env.NODE_ENV === 'production' ? 0.1 : 1.0),

    // Profiling Sample Rate: 10% das transactions
    profilesSampleRate: 0.1,

    // Integrations
    integrations: [
      // HTTP tracing: Rastreia requests HTTP (express/fastify)
      Sentry.httpIntegration(),

      // Postgres integration: Rastreia queries SQL
      Sentry.postgresIntegration(),

      // Node profiling: CPU/Memory profiling
      nodeProfilingIntegration(),
    ],

    // Before send hook: Sanitizar dados sensíveis
    beforeSend(event, _hint) {
      // Remover dados sensíveis de headers
      if (event.request?.headers) {
        delete event.request.headers.authorization;
        delete event.request.headers.cookie;
      }

      // Não enviar erros de validação (400) em produção
      if (
        process.env.NODE_ENV === 'production' &&
        event.exception?.values?.[0]?.type === 'BadRequestException'
      ) {
        return null;
      }

      return event;
    },

    // Ignorar certos tipos de erro
    ignoreErrors: [
      'NavigationDuplicated',
      'Non-Error promise rejection captured',
    ],
  });

  console.log(
    `[Sentry] Initialized for environment: ${process.env.NODE_ENV || 'development'}`,
  );
};
