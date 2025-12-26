import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useNavigate,
} from 'react-router';
import { useEffect, useCallback, useState, lazy, Suspense } from 'react';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { Toaster } from '@/components/ui/toaster';
import { PasswordChangeModal } from '@/components/auth/PasswordChangeModal';
import { AppTour } from '@/components/tour';
import { AdminProtectedRoute } from '@/components/auth/AdminProtectedRoute';
import { ManagerProtectedRoute } from '@/components/auth/ManagerProtectedRoute';
import { LoadingState } from '@/components/common/LoadingState';
import { useAuth } from '@/hooks/useAuth';
import { setNavigate } from '@/lib/navigation';

// Lazy-loaded Pages for code splitting
// Critical path pages (login/register) loaded eagerly for fast initial render
import { Login } from '@/pages/Login';
import { Register } from '@/pages/Register';
import { NotFound } from '@/pages/NotFound';

// Non-critical pages lazy-loaded for reduced initial bundle size
const Dashboard = lazy(() =>
  import('@/pages/Dashboard').then((m) => ({ default: m.Dashboard })),
);
const ETPs = lazy(() =>
  import('@/pages/ETPs').then((m) => ({ default: m.ETPs })),
);
const ETPEditor = lazy(() =>
  import('@/pages/ETPEditor').then((m) => ({ default: m.ETPEditor })),
);
const PrivacyPolicy = lazy(() =>
  import('@/pages/PrivacyPolicy').then((m) => ({ default: m.PrivacyPolicy })),
);
const TermsOfService = lazy(() =>
  import('@/pages/TermsOfService').then((m) => ({ default: m.TermsOfService })),
);
const ForgotPassword = lazy(() =>
  import('@/pages/ForgotPassword').then((m) => ({ default: m.ForgotPassword })),
);
const ResetPassword = lazy(() =>
  import('@/pages/ResetPassword').then((m) => ({ default: m.ResetPassword })),
);
const AnalysisPage = lazy(() =>
  import('@/pages/AnalysisPage').then((m) => ({ default: m.AnalysisPage })),
);

// Admin pages - lazy-loaded (only accessed by system admins)
const AdminDashboard = lazy(() =>
  import('@/pages/admin/AdminDashboard').then((m) => ({
    default: m.AdminDashboard,
  })),
);
const DomainManagement = lazy(() =>
  import('@/pages/admin/DomainManagement').then((m) => ({
    default: m.DomainManagement,
  })),
);
const DomainDetail = lazy(() =>
  import('@/pages/admin/DomainDetail').then((m) => ({
    default: m.DomainDetail,
  })),
);
const AuditLogsExport = lazy(() =>
  import('@/pages/admin/AuditLogsExport').then((m) => ({
    default: m.AuditLogsExport,
  })),
);

// Manager pages - lazy-loaded (only accessed by domain managers)
const ManagerDashboard = lazy(() =>
  import('@/pages/manager/ManagerDashboard').then((m) => ({
    default: m.ManagerDashboard,
  })),
);
const UserManagement = lazy(() =>
  import('@/pages/manager/UserManagement').then((m) => ({
    default: m.UserManagement,
  })),
);

/**
 * Route loading fallback component.
 * Displays centered loading state while lazy-loaded pages are fetched.
 */
function RouteLoadingFallback() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <LoadingState message="Carregando página..." size="lg" />
    </div>
  );
}

/**
 * Recovery timeout thresholds for auth state validation
 */
const AUTH_RECOVERY_CONFIG = {
  /** Initial timeout before showing extended message (3s) */
  SLOW_THRESHOLD_MS: 3000,
  /** Timeout before attempting recovery (8s) */
  RECOVERY_THRESHOLD_MS: 8000,
  /** Maximum wait before forcing redirect to login (15s) */
  MAX_WAIT_MS: 15000,
};

/**
 * Protected Route Component with Recovery Mechanism
 *
 * Shows loading spinner while auth state is being validated.
 * Prevents "flash of login" on page refresh for authenticated users.
 *
 * Recovery mechanism (issue #931):
 * - After 3s: Shows "taking longer than expected" message
 * - After 8s: Attempts to re-check auth state
 * - After 15s: Redirects to login with error message
 *
 * This prevents users from being stuck in infinite loading.
 */
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isAuthInitialized, checkAuth } = useAuth();
  const [loadingPhase, setLoadingPhase] = useState<
    'initial' | 'slow' | 'recovering' | 'timeout'
  >('initial');
  const [recoveryAttempted, setRecoveryAttempted] = useState(false);

  // Recovery mechanism: handle extended loading states
  useEffect(() => {
    if (isAuthInitialized) {
      // Reset state when auth is initialized
      setLoadingPhase('initial');
      setRecoveryAttempted(false);
      return;
    }

    // Timer for slow loading message (3s)
    const slowTimer = setTimeout(() => {
      if (!isAuthInitialized) {
        setLoadingPhase('slow');
        if (import.meta.env.DEV) {
          console.warn(
            '[ProtectedRoute] Auth check taking longer than expected (3s)',
          );
        }
      }
    }, AUTH_RECOVERY_CONFIG.SLOW_THRESHOLD_MS);

    // Timer for recovery attempt (8s)
    const recoveryTimer = setTimeout(() => {
      if (!isAuthInitialized && !recoveryAttempted) {
        setLoadingPhase('recovering');
        setRecoveryAttempted(true);
        if (import.meta.env.DEV) {
          console.warn('[ProtectedRoute] Attempting auth recovery (8s)');
        }
        // Attempt to re-check auth
        checkAuth().catch(() => {
          // If recovery fails, timeout phase will handle it
        });
      }
    }, AUTH_RECOVERY_CONFIG.RECOVERY_THRESHOLD_MS);

    // Timer for max wait (15s) - redirect to login
    const maxWaitTimer = setTimeout(() => {
      if (!isAuthInitialized) {
        setLoadingPhase('timeout');
        if (import.meta.env.DEV) {
          console.error(
            '[ProtectedRoute] Auth check timeout (15s) - redirecting to login',
          );
        }
      }
    }, AUTH_RECOVERY_CONFIG.MAX_WAIT_MS);

    return () => {
      clearTimeout(slowTimer);
      clearTimeout(recoveryTimer);
      clearTimeout(maxWaitTimer);
    };
  }, [isAuthInitialized, recoveryAttempted, checkAuth]);

  // Handle timeout - redirect to login
  if (loadingPhase === 'timeout') {
    return <Navigate to="/login" replace />;
  }

  // Show loading while auth check is in progress
  if (!isAuthInitialized) {
    const message =
      loadingPhase === 'slow' || loadingPhase === 'recovering'
        ? 'Isso está demorando mais que o esperado...'
        : 'Verificando autenticação...';

    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="flex flex-col items-center gap-4">
          <LoadingState message={message} size="lg" />
          {loadingPhase === 'recovering' && (
            <p className="text-sm text-muted-foreground animate-pulse">
              Tentando reconectar...
            </p>
          )}
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

/**
 * Public Route Component (redirect if authenticated)
 * Shows loading spinner while auth state is being validated.
 * Prevents unnecessary redirect to login for authenticated users.
 */
function PublicRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isAuthInitialized } = useAuth();

  // Show loading while auth check is in progress
  if (!isAuthInitialized) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <LoadingState message="Verificando autenticação..." size="lg" />
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}

/**
 * AppRoutes Component
 * Initializes global navigation and validates auth on mount.
 * Must be inside BrowserRouter to use useNavigate hook.
 *
 * On app startup, checkAuth() validates the persisted auth state against
 * the backend. This prevents the "flash of login" issue where ProtectedRoute
 * would redirect to login before knowing if the user is actually authenticated.
 */
function AppRoutes() {
  const navigate = useNavigate();
  const { checkAuth } = useAuth();

  // Memoize checkAuth to prevent unnecessary re-renders
  const validateAuth = useCallback(() => {
    checkAuth();
  }, [checkAuth]);

  // Initialize global navigation singleton on mount
  useEffect(() => {
    setNavigate(navigate);
  }, [navigate]);

  // Validate auth state on app startup
  useEffect(() => {
    validateAuth();
  }, [validateAuth]);

  return (
    <Suspense fallback={<RouteLoadingFallback />}>
      <Routes>
        {/* Public Routes - Login/Register loaded eagerly for fast initial render */}
        <Route
          path="/login"
          element={
            <PublicRoute>
              <Login />
            </PublicRoute>
          }
        />
        <Route
          path="/register"
          element={
            <PublicRoute>
              <Register />
            </PublicRoute>
          }
        />
        <Route
          path="/forgot-password"
          element={
            <PublicRoute>
              <ForgotPassword />
            </PublicRoute>
          }
        />
        <Route
          path="/reset-password"
          element={
            <PublicRoute>
              <ResetPassword />
            </PublicRoute>
          }
        />
        <Route path="/privacy" element={<PrivacyPolicy />} />
        <Route path="/terms" element={<TermsOfService />} />

        {/* Protected Routes - Lazy-loaded for reduced initial bundle */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/etps"
          element={
            <ProtectedRoute>
              <ETPs />
            </ProtectedRoute>
          }
        />
        <Route
          path="/etps/:id"
          element={
            <ProtectedRoute>
              <ETPEditor />
            </ProtectedRoute>
          }
        />
        <Route
          path="/analysis"
          element={
            <ProtectedRoute>
              <AnalysisPage />
            </ProtectedRoute>
          }
        />

        {/* Admin Routes (System Admin only) - Lazy-loaded */}
        <Route path="/admin" element={<AdminProtectedRoute />}>
          <Route index element={<AdminDashboard />} />
          <Route path="domains" element={<DomainManagement />} />
          <Route path="domains/:id" element={<DomainDetail />} />
          <Route path="audit-export" element={<AuditLogsExport />} />
        </Route>

        {/* Manager Routes (Domain Manager only) - Lazy-loaded */}
        <Route path="/manager" element={<ManagerProtectedRoute />}>
          <Route index element={<ManagerDashboard />} />
          <Route path="users" element={<UserManagement />} />
        </Route>

        {/* 404 - Loaded eagerly for fast error display */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <AppRoutes />
        <PasswordChangeModal />
        <Toaster />
        <AppTour />
      </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App;
