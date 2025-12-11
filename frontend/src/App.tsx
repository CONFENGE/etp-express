import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useNavigate,
} from 'react-router-dom';
import { useEffect, useCallback } from 'react';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { Toaster } from '@/components/ui/toaster';
import { PasswordChangeModal } from '@/components/auth/PasswordChangeModal';
import { AdminProtectedRoute } from '@/components/auth/AdminProtectedRoute';
import { ManagerProtectedRoute } from '@/components/auth/ManagerProtectedRoute';
import { LoadingState } from '@/components/common/LoadingState';
import { useAuth } from '@/hooks/useAuth';
import { setNavigate } from '@/lib/navigation';

// Pages
import { Login } from '@/pages/Login';
import { Register } from '@/pages/Register';
import { Dashboard } from '@/pages/Dashboard';
import { ETPs } from '@/pages/ETPs';
import { ETPEditor } from '@/pages/ETPEditor';
import { NotFound } from '@/pages/NotFound';
import { PrivacyPolicy } from '@/pages/PrivacyPolicy';
import { TermsOfService } from '@/pages/TermsOfService';
import { AdminDashboard, DomainManagement, DomainDetail } from '@/pages/admin';
import { ManagerDashboard, UserManagement } from '@/pages/manager';

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
    <Routes>
      {/* Public Routes */}
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
      <Route path="/privacy" element={<PrivacyPolicy />} />
      <Route path="/terms" element={<TermsOfService />} />

      {/* Protected Routes */}
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

      {/* Admin Routes (System Admin only) */}
      <Route path="/admin" element={<AdminProtectedRoute />}>
        <Route index element={<AdminDashboard />} />
        <Route path="domains" element={<DomainManagement />} />
        <Route path="domains/:id" element={<DomainDetail />} />
      </Route>

      {/* Manager Routes (Domain Manager only) */}
      <Route path="/manager" element={<ManagerProtectedRoute />}>
        <Route index element={<ManagerDashboard />} />
        <Route path="users" element={<UserManagement />} />
      </Route>

      {/* 404 */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <AppRoutes />
        <PasswordChangeModal />
        <Toaster />
      </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App;
