import {
  createBrowserRouter,
  RouterProvider,
  Navigate,
  Outlet,
  useNavigate,
} from 'react-router';
import { useEffect, useCallback, lazy, Suspense } from 'react';
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
const UserManual = lazy(() =>
  import('@/pages/UserManual').then((m) => ({ default: m.UserManual })),
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
 * Protected Route Component
 *
 * Shows loading spinner while auth state is being validated.
 * Prevents "flash of login" on page refresh for authenticated users.
 *
 * With the state-driven navigation in Login/Register (#943, #944),
 * auth state is reliably synchronized, making recovery timeouts unnecessary.
 */
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isAuthInitialized } = useAuth();

  // Show loading while auth check is in progress
  if (!isAuthInitialized) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <LoadingState message="Verificando autenticação..." size="lg" />
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
 * Root Layout Component
 * Initializes global navigation and validates auth on mount.
 * Wraps all routes with common providers and UI elements.
 *
 * On app startup, checkAuth() validates the persisted auth state against
 * the backend. This prevents the "flash of login" issue where ProtectedRoute
 * would redirect to login before knowing if the user is actually authenticated.
 */
function RootLayout() {
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
    <>
      <Suspense fallback={<RouteLoadingFallback />}>
        <Outlet />
      </Suspense>
      <PasswordChangeModal />
      <Toaster />
      <AppTour />
    </>
  );
}

/**
 * Data Router configuration (#984)
 * Using createBrowserRouter to support useBlocker hook for unsaved changes warning.
 * This is required by React Router v6.4+ for data APIs like useBlocker.
 */
const router = createBrowserRouter([
  {
    element: <RootLayout />,
    children: [
      // Public Routes - Login/Register loaded eagerly for fast initial render
      {
        path: '/login',
        element: (
          <PublicRoute>
            <Login />
          </PublicRoute>
        ),
      },
      {
        path: '/register',
        element: (
          <PublicRoute>
            <Register />
          </PublicRoute>
        ),
      },
      {
        path: '/forgot-password',
        element: (
          <PublicRoute>
            <ForgotPassword />
          </PublicRoute>
        ),
      },
      {
        path: '/reset-password',
        element: (
          <PublicRoute>
            <ResetPassword />
          </PublicRoute>
        ),
      },
      { path: '/privacy', element: <PrivacyPolicy /> },
      { path: '/terms', element: <TermsOfService /> },
      { path: '/user-manual', element: <UserManual /> },

      // Protected Routes - Lazy-loaded for reduced initial bundle
      {
        path: '/',
        element: (
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        ),
      },
      {
        path: '/dashboard',
        element: (
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        ),
      },
      {
        path: '/etps',
        element: (
          <ProtectedRoute>
            <ETPs />
          </ProtectedRoute>
        ),
      },
      {
        path: '/etps/:id',
        element: (
          <ProtectedRoute>
            <ETPEditor />
          </ProtectedRoute>
        ),
      },
      {
        path: '/analysis',
        element: (
          <ProtectedRoute>
            <AnalysisPage />
          </ProtectedRoute>
        ),
      },

      // Admin Routes (System Admin only) - Lazy-loaded
      {
        path: '/admin',
        element: <AdminProtectedRoute />,
        children: [
          { index: true, element: <AdminDashboard /> },
          { path: 'domains', element: <DomainManagement /> },
          { path: 'domains/:id', element: <DomainDetail /> },
          { path: 'audit-export', element: <AuditLogsExport /> },
        ],
      },

      // Manager Routes (Domain Manager only) - Lazy-loaded
      {
        path: '/manager',
        element: <ManagerProtectedRoute />,
        children: [
          { index: true, element: <ManagerDashboard /> },
          { path: 'users', element: <UserManagement /> },
        ],
      },

      // 404 - Loaded eagerly for fast error display
      { path: '*', element: <NotFound /> },
    ],
  },
]);

function App() {
  return (
    <ErrorBoundary>
      <RouterProvider router={router} />
    </ErrorBoundary>
  );
}

export default App;
