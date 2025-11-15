/**
 * Error fallback component displayed when Sentry ErrorBoundary catches an error
 *
 * Features:
 * - User-friendly error message
 * - Reload button to recover from error
 * - Centered layout with styled components
 *
 * @see https://docs.sentry.io/platforms/javascript/guides/react/components/errorboundary/
 */
export const ErrorFallback = () => (
  <div
    style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100vh',
      padding: '20px',
      textAlign: 'center',
    }}
  >
    <h1 style={{ fontSize: '2rem', marginBottom: '1rem' }}>
      Ops! Algo deu errado
    </h1>
    <p style={{ marginBottom: '2rem', color: '#666' }}>
      Ocorreu um erro inesperado. Nossa equipe foi notificada e está trabalhando
      para resolver.
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
        cursor: 'pointer',
      }}
    >
      Recarregar Página
    </button>
  </div>
);
