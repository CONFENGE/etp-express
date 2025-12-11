import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  User,
  LoginCredentials,
  RegisterData,
  AuthResponse,
} from '@/types/user';
import { apiHelpers } from '@/lib/api';

/**
 * DTO for password change request.
 */
interface ChangePasswordData {
  oldPassword: string;
  newPassword: string;
}

/**
 * Authentication state store using httpOnly cookie strategy.
 *
 * @security
 * JWT tokens are stored in httpOnly cookies (set by backend) and are NOT
 * accessible via JavaScript. This eliminates XSS token theft vulnerability.
 *
 * The frontend only stores:
 * - user: Non-sensitive user profile data (for UI rendering)
 * - isAuthenticated: Derived from successful login/cookie validation
 * - isAuthInitialized: Indicates if initial auth check has completed
 *
 * Token storage is handled entirely by the browser via httpOnly cookies.
 */
interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  /** Indicates if the initial auth check has completed (prevents flash on refresh) */
  isAuthInitialized: boolean;
  error: string | null;

  login: (credentials: LoginCredentials) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
  setUser: (user: User) => void;
  checkAuth: () => Promise<boolean>;
  clearAuth: () => void;
  changePassword: (data: ChangePasswordData) => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      isAuthInitialized: false,
      error: null,

      /**
       * Authenticates user with credentials.
       * Backend sets httpOnly cookie with JWT token.
       */
      login: async (credentials: LoginCredentials) => {
        set({ isLoading: true, error: null });
        try {
          const response = await apiHelpers.post<AuthResponse>(
            '/auth/login',
            credentials,
          );

          // Token is set in httpOnly cookie by backend - we only store user data
          set({
            user: response.user,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          });
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : 'Erro ao fazer login';
          set({
            error: errorMessage,
            isLoading: false,
            isAuthenticated: false,
          });
          throw error;
        }
      },

      /**
       * Registers new user account.
       * Backend sets httpOnly cookie with JWT token.
       */
      register: async (data: RegisterData) => {
        set({ isLoading: true, error: null });
        try {
          const response = await apiHelpers.post<AuthResponse>(
            '/auth/register',
            data,
          );

          // Token is set in httpOnly cookie by backend - we only store user data
          set({
            user: response.user,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          });
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : 'Erro ao registrar';
          set({
            error: errorMessage,
            isLoading: false,
            isAuthenticated: false,
          });
          throw error;
        }
      },

      /**
       * Logs out user by calling backend logout endpoint.
       * Backend clears the httpOnly cookie.
       */
      logout: async () => {
        try {
          // Call backend to clear httpOnly cookie
          await apiHelpers.post('/auth/logout');
        } catch {
          // Ignore logout errors - clear state anyway
        } finally {
          get().clearAuth();
        }
      },

      /**
       * Clears local auth state without calling backend.
       * Used by API interceptor on 401 responses.
       * Preserves isAuthInitialized to avoid re-triggering auth check.
       */
      clearAuth: () => {
        set({
          user: null,
          isAuthenticated: false,
          error: null,
          // Keep isAuthInitialized true to prevent flash after logout
          isAuthInitialized: true,
        });
      },

      clearError: () => set({ error: null }),

      setUser: (user: User) => set({ user }),

      /**
       * Validates authentication by checking if the cookie-based token is valid.
       * Makes a request to /auth/me which will succeed if cookie is valid.
       *
       * On app startup, this validates persisted auth state against the backend.
       * This prevents the "flash of login" issue where ProtectedRoute renders
       * before we know if the user is actually authenticated.
       *
       * @returns true if authenticated, false otherwise
       */
      checkAuth: async (): Promise<boolean> => {
        // Skip if no persisted auth state (user never logged in)
        if (!get().isAuthenticated && !get().user) {
          set({ isAuthInitialized: true });
          return false;
        }

        try {
          const response = await apiHelpers.get<{ user: User }>('/auth/me');
          set({
            user: response.user,
            isAuthenticated: true,
            isAuthInitialized: true,
          });
          return true;
        } catch {
          get().clearAuth();
          set({ isAuthInitialized: true });
          return false;
        }
      },

      /**
       * Changes user password.
       * Backend validates old password and updates to new one.
       * Sets mustChangePassword to false on the returned user.
       */
      changePassword: async (data: ChangePasswordData) => {
        set({ isLoading: true, error: null });
        try {
          const response = await apiHelpers.post<{
            user: User;
            message: string;
          }>('/auth/change-password', data);

          // Update user with mustChangePassword: false
          set({
            user: response.user,
            isLoading: false,
            error: null,
          });
        } catch (error) {
          const errorMessage =
            error instanceof Error
              ? error.message
              : (error as { message?: string })?.message ||
                'Erro ao alterar senha';
          set({
            error: errorMessage,
            isLoading: false,
          });
          throw error;
        }
      },
    }),
    {
      name: 'auth-storage',
      // Only persist non-sensitive user data for UI - token is in httpOnly cookie
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    },
  ),
);
