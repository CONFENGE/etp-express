import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useNavigate,
} from 'react-router-dom';
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
 * Shows loading spinner while auth state is being validated.
 * Prevents "flash of login" on page refresh for authenticated users.
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
