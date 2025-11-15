import React from 'react';
import ReactDOM from 'react-dom/client';
import * as Sentry from '@sentry/react';
import App from './App.tsx';
import './index.css';
import { initSentry } from './config/sentry.config';

// Initialize Sentry before rendering
initSentry();

// Error fallback component
const ErrorFallback = () => (
  <div style={{
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100vh',
    padding: '20px',
    textAlign: 'center'
  }}>
    <h1 style={{ fontSize: '2rem', marginBottom: '1rem' }}>Ops! Algo deu errado</h1>
    <p style={{ marginBottom: '2rem', color: '#666' }}>
      Ocorreu um erro inesperado. Nossa equipe foi notificada e está trabalhando para resolver.
    </p>
    <button
      onClick={() => window.location.reload()}
      style={{
        padding: '0.75rem 1.5rem',
        fontSize: '1rem',
        backgroundColor: '#3b82f6',
        color: 'white',
        border: 'none',
        borderRadius: '0.375rem',
        cursor: 'pointer'
      }}
    >
      Recarregar Página
    </button>
  </div>
);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Sentry.ErrorBoundary fallback={ErrorFallback} showDialog>
      <App />
    </Sentry.ErrorBoundary>
  </React.StrictMode>
);
