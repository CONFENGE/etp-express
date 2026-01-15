import React from 'react';
import ReactDOM from 'react-dom/client';
import * as Sentry from '@sentry/react';
import App from './App.tsx';
import './index.css';
import { initSentry } from './config/sentry.config';
import { ErrorFallback } from './components/ErrorFallback';

// Import touch target audit script (auto-runs in dev mode)
import './scripts/audit-touch-targets';

/**
 * Enable MSW for CI environment (Lighthouse CI)
 * @see #1488 - MSW mocking for Lighthouse CI
 */
async function enableMocking() {
  // Enable MSW in CI mode only
  if (import.meta.env.VITE_USE_MSW === 'true') {
    const { worker } = await import('./mocks/browser');
    await worker.start({
      onUnhandledRequest: 'bypass', // Don't warn for unhandled requests
    });
    console.log('[MSW] Mocking enabled for CI environment');
  }
}

// Initialize Sentry before rendering
initSentry();

enableMocking().then(() => {
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <Sentry.ErrorBoundary fallback={ErrorFallback} showDialog>
        <App />
      </Sentry.ErrorBoundary>
    </React.StrictMode>,
  );
});
