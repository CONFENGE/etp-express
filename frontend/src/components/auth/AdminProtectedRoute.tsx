import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import type { UserRole } from '@/types/user';

/**
 * Protected route component for System Admin pages.
 *
 * @security
 * Only allows access to users with role: system_admin.
 * Redirects unauthenticated users to /login.
 * Redirects unauthorized users (wrong role) to / (home).
 *
 * Uses React Router's Outlet for nested routes.
 */
export function AdminProtectedRoute() {
 const { user, isAuthenticated } = useAuthStore();

 if (!isAuthenticated) {
 return <Navigate to="/login" replace />;
 }

 const systemAdminRole: UserRole = 'system_admin';
 if (user?.role !== systemAdminRole) {
 return <Navigate to="/" replace />;
 }

 return <Outlet />;
}
