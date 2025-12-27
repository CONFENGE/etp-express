import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route, Navigate } from 'react-router';
import { useAuthStore } from '@/store/authStore';

// Mock the authStore
vi.mock('@/store/authStore', () => ({
  useAuthStore: vi.fn(),
}));

// Mock navigation singleton
vi.mock('@/lib/navigation', () => ({
  setNavigate: vi.fn(),
}));

// Mock components
vi.mock('@/components/common/LoadingState', () => ({
  LoadingState: ({ message }: { message: string }) => (
    <div data-testid="loading-state">{message}</div>
  ),
}));

/**
 * ProtectedRoute Component (extracted from App.tsx for isolated testing)
 * This mirrors the actual implementation in App.tsx
 */
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isAuthInitialized } = useAuthStore();

  if (!isAuthInitialized) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div data-testid="loading-state">Verificando autenticação...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

describe('ProtectedRoute - Auth State Handling', () => {
  function setupMock(
    overrides: Partial<{
      isAuthenticated: boolean;
      isAuthInitialized: boolean;
      isLoading: boolean;
      user: { id: string; email: string; name: string; role: string } | null;
      checkAuth: () => Promise<void>;
    }> = {},
  ) {
    vi.mocked(useAuthStore).mockReturnValue({
      user: null,
      isAuthenticated: false,
      isAuthInitialized: true,
      isLoading: false,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
      checkAuth: vi.fn(),
      clearAuth: vi.fn(),
      setAuthFromRegister: vi.fn(),
      ...overrides,
    } as unknown as ReturnType<typeof useAuthStore>);
  }

  function renderProtectedRoute(initialEntries = ['/dashboard']) {
    return render(
      <MemoryRouter initialEntries={initialEntries}>
        <Routes>
          <Route
            path="/login"
            element={<div data-testid="login-page">Login Page</div>}
          />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <div data-testid="dashboard-page">Dashboard Page</div>
              </ProtectedRoute>
            }
          />
        </Routes>
      </MemoryRouter>,
    );
  }

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('AC1: isAuthInitialized=false shows loading', () => {
    it('should show loading state when auth is not initialized', () => {
      setupMock({
        isAuthInitialized: false,
        isAuthenticated: false,
      });

      renderProtectedRoute();

      expect(screen.getByTestId('loading-state')).toBeInTheDocument();
      expect(
        screen.getByText('Verificando autenticação...'),
      ).toBeInTheDocument();
      expect(screen.queryByTestId('login-page')).not.toBeInTheDocument();
      expect(screen.queryByTestId('dashboard-page')).not.toBeInTheDocument();
    });

    it('should not redirect while loading', () => {
      setupMock({
        isAuthInitialized: false,
        isAuthenticated: false,
      });

      renderProtectedRoute();

      // Should not show login page (no premature redirect)
      expect(screen.queryByTestId('login-page')).not.toBeInTheDocument();
    });
  });

  describe('AC2: isAuthInitialized=true, isAuthenticated=false redirects to /login', () => {
    it('should redirect to login when not authenticated', () => {
      setupMock({
        isAuthInitialized: true,
        isAuthenticated: false,
      });

      renderProtectedRoute();

      expect(screen.getByTestId('login-page')).toBeInTheDocument();
      expect(screen.queryByTestId('dashboard-page')).not.toBeInTheDocument();
      expect(screen.queryByTestId('loading-state')).not.toBeInTheDocument();
    });

    it('should not show loading state when auth check completed but not authenticated', () => {
      setupMock({
        isAuthInitialized: true,
        isAuthenticated: false,
      });

      renderProtectedRoute();

      expect(
        screen.queryByText('Verificando autenticação...'),
      ).not.toBeInTheDocument();
    });
  });

  describe('AC3: isAuthInitialized=true, isAuthenticated=true renders children', () => {
    it('should render children when authenticated', () => {
      setupMock({
        isAuthInitialized: true,
        isAuthenticated: true,
        user: {
          id: '1',
          email: 'user@test.com',
          name: 'Test User',
          role: 'user',
        },
      });

      renderProtectedRoute();

      expect(screen.getByTestId('dashboard-page')).toBeInTheDocument();
      expect(screen.getByText('Dashboard Page')).toBeInTheDocument();
      expect(screen.queryByTestId('login-page')).not.toBeInTheDocument();
      expect(screen.queryByTestId('loading-state')).not.toBeInTheDocument();
    });

    it('should not show loading when authenticated', () => {
      setupMock({
        isAuthInitialized: true,
        isAuthenticated: true,
        user: {
          id: '1',
          email: 'user@test.com',
          name: 'Test User',
          role: 'user',
        },
      });

      renderProtectedRoute();

      expect(
        screen.queryByText('Verificando autenticação...'),
      ).not.toBeInTheDocument();
    });
  });

  describe('AC4: Transition from unauthenticated to authenticated without flash', () => {
    it('should render children immediately after auth state changes to authenticated', async () => {
      // Start with loading state
      setupMock({
        isAuthInitialized: false,
        isAuthenticated: false,
      });

      const { rerender } = renderProtectedRoute();

      // Verify loading state is shown
      expect(screen.getByTestId('loading-state')).toBeInTheDocument();

      // Simulate auth check completing with authenticated user
      setupMock({
        isAuthInitialized: true,
        isAuthenticated: true,
        user: {
          id: '1',
          email: 'user@test.com',
          name: 'Test User',
          role: 'user',
        },
      });

      // Re-render with new state
      await act(async () => {
        rerender(
          <MemoryRouter initialEntries={['/dashboard']}>
            <Routes>
              <Route
                path="/login"
                element={<div data-testid="login-page">Login Page</div>}
              />
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <div data-testid="dashboard-page">Dashboard Page</div>
                  </ProtectedRoute>
                }
              />
            </Routes>
          </MemoryRouter>,
        );
      });

      // Should immediately show dashboard without flash of login
      expect(screen.getByTestId('dashboard-page')).toBeInTheDocument();
      expect(screen.queryByTestId('login-page')).not.toBeInTheDocument();
    });

    it('should not show login flash when transitioning from loading to authenticated', async () => {
      // Track if login page was ever shown
      let loginWasShown = false;

      // Start with uninitialized state
      setupMock({
        isAuthInitialized: false,
        isAuthenticated: false,
      });

      const { rerender } = renderProtectedRoute();

      // Check if login page appears (it shouldn't during loading)
      if (screen.queryByTestId('login-page')) {
        loginWasShown = true;
      }

      // Transition directly to authenticated
      setupMock({
        isAuthInitialized: true,
        isAuthenticated: true,
        user: {
          id: '1',
          email: 'user@test.com',
          name: 'Test User',
          role: 'user',
        },
      });

      await act(async () => {
        rerender(
          <MemoryRouter initialEntries={['/dashboard']}>
            <Routes>
              <Route
                path="/login"
                element={<div data-testid="login-page">Login Page</div>}
              />
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <div data-testid="dashboard-page">Dashboard Page</div>
                  </ProtectedRoute>
                }
              />
            </Routes>
          </MemoryRouter>,
        );
      });

      // Login page should never have been shown
      expect(loginWasShown).toBe(false);
      expect(screen.getByTestId('dashboard-page')).toBeInTheDocument();
    });

    it('should correctly handle rapid state transitions', async () => {
      // Start with loading
      setupMock({ isAuthInitialized: false, isAuthenticated: false });

      const { rerender } = renderProtectedRoute();
      expect(screen.getByTestId('loading-state')).toBeInTheDocument();

      // Quick transition to authenticated
      setupMock({
        isAuthInitialized: true,
        isAuthenticated: true,
        user: {
          id: '1',
          email: 'user@test.com',
          name: 'Test User',
          role: 'user',
        },
      });

      await act(async () => {
        rerender(
          <MemoryRouter initialEntries={['/dashboard']}>
            <Routes>
              <Route
                path="/login"
                element={<div data-testid="login-page">Login Page</div>}
              />
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <div data-testid="dashboard-page">Dashboard Page</div>
                  </ProtectedRoute>
                }
              />
            </Routes>
          </MemoryRouter>,
        );
      });

      await waitFor(() => {
        expect(screen.getByTestId('dashboard-page')).toBeInTheDocument();
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle isAuthenticated=true but isAuthInitialized=false correctly', () => {
      // Edge case: authenticated but not initialized (shouldn't happen normally)
      setupMock({
        isAuthInitialized: false,
        isAuthenticated: true,
      });

      renderProtectedRoute();

      // Should still show loading until initialized
      expect(screen.getByTestId('loading-state')).toBeInTheDocument();
    });

    it('should redirect when auth check fails after successful cookie', async () => {
      // Start as authenticated
      setupMock({
        isAuthInitialized: true,
        isAuthenticated: true,
        user: {
          id: '1',
          email: 'user@test.com',
          name: 'Test User',
          role: 'user',
        },
      });

      const { rerender } = renderProtectedRoute();
      expect(screen.getByTestId('dashboard-page')).toBeInTheDocument();

      // Token expires, user becomes unauthenticated
      setupMock({
        isAuthInitialized: true,
        isAuthenticated: false,
        user: null,
      });

      await act(async () => {
        rerender(
          <MemoryRouter initialEntries={['/dashboard']}>
            <Routes>
              <Route
                path="/login"
                element={<div data-testid="login-page">Login Page</div>}
              />
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <div data-testid="dashboard-page">Dashboard Page</div>
                  </ProtectedRoute>
                }
              />
            </Routes>
          </MemoryRouter>,
        );
      });

      // Should redirect to login
      expect(screen.getByTestId('login-page')).toBeInTheDocument();
    });
  });
});
