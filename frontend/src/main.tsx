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

    // Pre-populate both localStorage AND cookies with mock authentication
    // Lighthouse headless Chrome sometimes clears localStorage, so we use both
    const mockToken = 'mock-ci-token-12345';
    const mockUser = {
      id: 'ci-user-123',
      email: 'ci-test@example.com',
      name: 'CI Test User',
      role: 'user',
    };

    // Set localStorage
    localStorage.setItem('authToken', mockToken);
    localStorage.setItem('user', JSON.stringify(mockUser));

    // Set cookie (persists across navigations in headless Chrome)
    document.cookie = `authToken=${mockToken}; path=/; SameSite=Strict`;
    document.cookie = `user=${encodeURIComponent(
      JSON.stringify(mockUser),
    )}; path=/; SameSite=Strict`;

    await worker.start({
      onUnhandledRequest: 'bypass', // Don't warn for unhandled requests
      // Wait for service worker to be ready before continuing
      serviceWorker: {
        url: '/mockServiceWorker.js',
      },
      // Ensure service worker is active before rendering
      waitUntilReady: true,
    });

    // Additional delay for headless Chrome (Lighthouse CI)
    await new Promise((resolve) => setTimeout(resolve, 500));

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
