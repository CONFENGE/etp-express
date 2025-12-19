import { useAuthStore } from '@/store/authStore';

/**
 * Hook for accessing authentication state and actions.
 *
 * @security
 * JWT tokens are stored in httpOnly cookies (not accessible via JS).
 * This hook only exposes non-sensitive user data and auth actions.
 */
export function useAuth() {
 const {
 user,
 isAuthenticated,
 isLoading,
 isAuthInitialized,
 login,
 register,
 logout,
 checkAuth,
 } = useAuthStore();

 return {
 user,
 isAuthenticated,
 isLoading,
 /** True after initial auth validation completes (prevents flash on refresh) */
 isAuthInitialized,
 login,
 register,
 logout,
 checkAuth,
 };
}
