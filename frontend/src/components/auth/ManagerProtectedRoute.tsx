import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import type { UserRole } from '@/types/user';

/**
 * Protected route component for Domain Manager pages.
 *
 * @security
 * Only allows access to users with role: domain_manager.
 * Redirects unauthenticated users to /login.
 * Redirects unauthorized users (wrong role) to / (home).
 *
 * Uses React Router's Outlet for nested routes.
 */
export function ManagerProtectedRoute() {
  const { user, isAuthenticated } = useAuthStore();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  const domainManagerRole: UserRole = 'domain_manager';
  if (user?.role !== domainManagerRole) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
