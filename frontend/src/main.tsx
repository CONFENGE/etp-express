import React from 'react';
import ReactDOM from 'react-dom/client';
import * as Sentry from '@sentry/react';
import App from './App.tsx';
import './index.css';
import { initSentry } from './config/sentry.config';
import { ErrorFallback } from './components/ErrorFallback';

// Import touch target audit script (auto-runs in dev mode)
import './scripts/audit-touch-targets';

// Initialize Sentry before rendering
initSentry();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Sentry.ErrorBoundary fallback={ErrorFallback} showDialog>
      <App />
    </Sentry.ErrorBoundary>
  </React.StrictMode>,
);
