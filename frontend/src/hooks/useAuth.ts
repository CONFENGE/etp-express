import { useAuthStore } from '@/store/authStore';

/**
 * Hook for accessing authentication state and actions.
 *
 * @security
 * JWT tokens are stored in httpOnly cookies (not accessible via JS).
 * This hook only exposes non-sensitive user data and auth actions.
 */
export function useAuth() {
  const { user, isAuthenticated, login, register, logout, checkAuth } =
    useAuthStore();

  return {
    user,
    isAuthenticated,
    login,
    register,
    logout,
    checkAuth,
  };
}
