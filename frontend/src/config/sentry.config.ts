import * as Sentry from '@sentry/react';

/**
 * Inicializa configuração do Sentry para monitoramento de erros frontend
 *
 * Features:
 * - Error tracking: Captura exceptions e promise rejections
 * - Performance monitoring: Rastreia navegação e component renders
 * - Session Replay: Grava sessões de usuários com erros
 * - Breadcrumbs: Rastreia interações do usuário antes do erro
 *
 * @see https://docs.sentry.io/platforms/javascript/guides/react/
 */
export const initSentry = () => {
  const dsn = import.meta.env.VITE_SENTRY_DSN;

  if (!dsn) {
    console.warn(
      '[Sentry] VITE_SENTRY_DSN not configured. Error tracking disabled.',
    );
    return;
  }

  Sentry.init({
    dsn,
    environment: import.meta.env.MODE || 'development',

    // Traces Sample Rate: 10% das navegações em produção
    integrations: [
      // Browser tracing: Rastreia navegação (React Router)
      Sentry.browserTracingIntegration(),

      // Replay: Grava sessões para debugging
      Sentry.replayIntegration({
        // Mask all text/input fields for privacy
        maskAllText: true,
        blockAllMedia: true,
      }),
    ],

    // Performance Monitoring
    tracesSampleRate: import.meta.env.MODE === 'production' ? 0.1 : 1.0,

    // Session Replay
    replaysSessionSampleRate: 0.1, // 10% de todas as sessões
    replaysOnErrorSampleRate: 1.0, // 100% das sessões com erro

    // Before send hook: Sanitizar dados sensíveis
    beforeSend(event, hint) {
      // Remover dados sensíveis de breadcrumbs (ex: inputs de password)
      if (event.breadcrumbs) {
        event.breadcrumbs = event.breadcrumbs.map((breadcrumb) => {
          if (breadcrumb.category === 'ui.input') {
            breadcrumb.message = '[Filtered]';
          }
          return breadcrumb;
        });
      }

      // Não enviar erros de network timeout em development
      if (
        import.meta.env.MODE === 'development' &&
        hint.originalException?.toString().includes('NetworkError')
      ) {
        return null;
      }

      return event;
    },

    // Ignorar certos tipos de erro
    ignoreErrors: [
      // Erros comuns do browser que não podemos controlar
      'ResizeObserver loop limit exceeded',
      'Non-Error promise rejection captured',
      // Erros de extensões do Chrome
      'chrome-extension://',
      'moz-extension://',
    ],
  });

  console.log(
    `[Sentry] Initialized for environment: ${import.meta.env.MODE || 'development'}`,
  );
};
