import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useAuthStore } from './authStore';
import { apiHelpers } from '@/lib/api';
import type { User, LoginCredentials, RegisterData } from '@/types/user';

// Mock apiHelpers module
vi.mock('@/lib/api', () => ({
  apiHelpers: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('authStore', () => {
  // Mock data fixtures
  const mockUser: User = {
    id: 'user-1',
    email: 'test@example.com',
    name: 'Test User',
    role: 'user',
    organization: {
      id: 'org-1',
      name: 'Test Organization',
    },
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  };

  const mockAuthResponse = {
    user: mockUser,
    // Note: token is NOT included - httpOnly cookies handle auth
  };

  const mockCredentials: LoginCredentials = {
    email: 'test@example.com',
    password: 'password123',
  };

  const mockRegisterData: RegisterData = {
    email: 'new@example.com',
    password: 'password123',
    name: 'New User',
    lgpdConsent: true,
    internationalTransferConsent: true,
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Clear localStorage mock to prevent persisted state from interfering
    vi.mocked(localStorage.getItem).mockReturnValue(null);
    vi.mocked(localStorage.setItem).mockImplementation(() => {});
    vi.mocked(localStorage.removeItem).mockImplementation(() => {});

    // Reset store state - use persist's clearStorage and rehydrate pattern
    useAuthStore.persist.clearStorage();
    useAuthStore.setState({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      isAuthInitialized: false,
      error: null,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Initial state', () => {
    it('should start with null user and unauthenticated', () => {
      const { result } = renderHook(() => useAuthStore());

      expect(result.current.user).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.isAuthInitialized).toBe(false);
      expect(result.current.error).toBeNull();
    });
  });

  describe('login', () => {
    it('should authenticate user on successful login', async () => {
      vi.mocked(apiHelpers.post).mockResolvedValue(mockAuthResponse);

      const { result } = renderHook(() => useAuthStore());

      await act(async () => {
        await result.current.login(mockCredentials);
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(apiHelpers.post).toHaveBeenCalledWith(
        '/auth/login',
        mockCredentials,
      );
      expect(result.current.user).toEqual(mockUser);
      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.error).toBeNull();
    });

    it('should set loading state during login', async () => {
      let resolveLogin: (value: unknown) => void;
      const loginPromise = new Promise((resolve) => {
        resolveLogin = resolve;
      });
      vi.mocked(apiHelpers.post).mockReturnValue(loginPromise as never);

      const { result } = renderHook(() => useAuthStore());

      // Start login but don't await
      act(() => {
        result.current.login(mockCredentials);
      });

      // Loading should be true during request
      expect(result.current.isLoading).toBe(true);

      // Resolve the login
      await act(async () => {
        resolveLogin!(mockAuthResponse);
        await loginPromise.catch(() => {});
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });

    it('should set error on login failure', async () => {
      const errorMessage = 'Invalid credentials';
      vi.mocked(apiHelpers.post).mockRejectedValue(new Error(errorMessage));

      // Use try-catch since the error is re-thrown
      try {
        await act(async () => {
          await useAuthStore.getState().login(mockCredentials);
        });
      } catch {
        // Expected to throw
      }

      // Directly check store state
      const state = useAuthStore.getState();
      expect(state.isAuthenticated).toBe(false);
      expect(state.error).toBe(errorMessage);
      expect(state.isLoading).toBe(false);
    });
  });

  describe('register', () => {
    it('should authenticate user on successful registration', async () => {
      vi.mocked(apiHelpers.post).mockResolvedValue(mockAuthResponse);

      const { result } = renderHook(() => useAuthStore());

      await act(async () => {
        await result.current.register(mockRegisterData);
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(apiHelpers.post).toHaveBeenCalledWith(
        '/auth/register',
        mockRegisterData,
      );
      expect(result.current.user).toEqual(mockUser);
      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.error).toBeNull();
    });

    it('should set error on registration failure', async () => {
      const errorMessage = 'Email already registered';
      vi.mocked(apiHelpers.post).mockRejectedValue(new Error(errorMessage));

      // Use try-catch since the error is re-thrown
      try {
        await act(async () => {
          await useAuthStore.getState().register(mockRegisterData);
        });
      } catch {
        // Expected to throw
      }

      // Directly check store state
      const state = useAuthStore.getState();
      expect(state.isAuthenticated).toBe(false);
      expect(state.error).toBe(errorMessage);
      expect(state.isLoading).toBe(false);
    });
  });

  describe('logout', () => {
    it('should call backend logout and clear auth state', async () => {
      vi.mocked(apiHelpers.post).mockResolvedValue({});

      const { result } = renderHook(() => useAuthStore());

      // Setup: authenticate first
      act(() => {
        useAuthStore.setState({
          user: mockUser,
          isAuthenticated: true,
        });
      });

      expect(result.current.isAuthenticated).toBe(true);

      await act(async () => {
        await result.current.logout();
      });

      expect(apiHelpers.post).toHaveBeenCalledWith('/auth/logout');
      expect(result.current.user).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
    });

    it('should clear auth state even if backend logout fails', async () => {
      vi.mocked(apiHelpers.post).mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() => useAuthStore());

      // Setup: authenticate first
      act(() => {
        useAuthStore.setState({
          user: mockUser,
          isAuthenticated: true,
        });
      });

      await act(async () => {
        await result.current.logout();
      });

      // State should still be cleared even if API call fails
      expect(result.current.user).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
    });
  });

  describe('clearAuth', () => {
    it('should clear local auth state without API call', () => {
      const { result } = renderHook(() => useAuthStore());

      // Setup: authenticate
      act(() => {
        useAuthStore.setState({
          user: mockUser,
          isAuthenticated: true,
          isAuthInitialized: true,
          error: 'some error',
        });
      });

      act(() => {
        result.current.clearAuth();
      });

      expect(result.current.user).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.error).toBeNull();
      // isAuthInitialized should remain true to prevent flash after logout
      expect(result.current.isAuthInitialized).toBe(true);
      // API should NOT be called
      expect(apiHelpers.post).not.toHaveBeenCalled();
    });
  });

  describe('checkAuth', () => {
    it('should return false and set isAuthInitialized when not authenticated', async () => {
      const { result } = renderHook(() => useAuthStore());

      let isValid: boolean;
      await act(async () => {
        isValid = await result.current.checkAuth();
      });

      expect(isValid!).toBe(false);
      expect(result.current.isAuthInitialized).toBe(true);
      // API should not be called if already not authenticated
      expect(apiHelpers.get).not.toHaveBeenCalled();
    });

    it('should validate auth and update user on success', async () => {
      vi.mocked(apiHelpers.get).mockResolvedValue({ user: mockUser });

      const { result } = renderHook(() => useAuthStore());

      // Setup: set isAuthenticated to trigger API call
      act(() => {
        useAuthStore.setState({
          isAuthenticated: true,
          user: { ...mockUser, name: 'Old Name' },
        });
      });

      let isValid: boolean;
      await act(async () => {
        isValid = await result.current.checkAuth();
      });

      expect(isValid!).toBe(true);
      expect(apiHelpers.get).toHaveBeenCalledWith('/auth/me');
      expect(result.current.user).toEqual(mockUser);
      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.isAuthInitialized).toBe(true);
    });

    it('should clear auth and set isAuthInitialized on validation failure', async () => {
      vi.mocked(apiHelpers.get).mockRejectedValue(new Error('Token expired'));

      const { result } = renderHook(() => useAuthStore());

      // Setup: set isAuthenticated
      act(() => {
        useAuthStore.setState({
          isAuthenticated: true,
          user: mockUser,
        });
      });

      let isValid: boolean;
      await act(async () => {
        isValid = await result.current.checkAuth();
      });

      expect(isValid!).toBe(false);
      expect(result.current.user).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.isAuthInitialized).toBe(true);
    });
  });

  describe('clearError', () => {
    it('should clear error state', () => {
      const { result } = renderHook(() => useAuthStore());

      // Setup: set error
      act(() => {
        useAuthStore.setState({ error: 'Some error' });
      });

      expect(result.current.error).toBe('Some error');

      act(() => {
        result.current.clearError();
      });

      expect(result.current.error).toBeNull();
    });
  });

  describe('setUser', () => {
    it('should update user data', () => {
      const { result } = renderHook(() => useAuthStore());

      const updatedUser = { ...mockUser, name: 'Updated Name' };

      act(() => {
        result.current.setUser(updatedUser);
      });

      expect(result.current.user).toEqual(updatedUser);
    });
  });

  describe('changePassword', () => {
    const changePasswordData = {
      oldPassword: 'OldPassword123!',
      newPassword: 'NewPassword456!',
    };

    const userWithMustChange: User = {
      ...mockUser,
      mustChangePassword: true,
    };

    const userAfterPasswordChange: User = {
      ...mockUser,
      mustChangePassword: false,
    };

    it('should change password and update user state', async () => {
      vi.mocked(apiHelpers.post).mockResolvedValue({
        user: userAfterPasswordChange,
        message: 'Senha alterada com sucesso',
      });

      const { result } = renderHook(() => useAuthStore());

      // Setup: authenticate with mustChangePassword
      act(() => {
        useAuthStore.setState({
          user: userWithMustChange,
          isAuthenticated: true,
        });
      });

      await act(async () => {
        await result.current.changePassword(changePasswordData);
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(apiHelpers.post).toHaveBeenCalledWith(
        '/auth/change-password',
        changePasswordData,
      );
      expect(result.current.user?.mustChangePassword).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('should set loading state during password change', async () => {
      let resolveChange: (value: unknown) => void;
      const changePromise = new Promise((resolve) => {
        resolveChange = resolve;
      });
      vi.mocked(apiHelpers.post).mockReturnValue(changePromise as never);

      const { result } = renderHook(() => useAuthStore());

      // Setup
      act(() => {
        useAuthStore.setState({
          user: userWithMustChange,
          isAuthenticated: true,
        });
      });

      // Start password change but don't await
      act(() => {
        result.current.changePassword(changePasswordData);
      });

      // Loading should be true during request
      expect(result.current.isLoading).toBe(true);

      // Resolve the change
      await act(async () => {
        resolveChange!({
          user: userAfterPasswordChange,
          message: 'Senha alterada com sucesso',
        });
        await changePromise.catch(() => {});
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });

    it('should set error on password change failure', async () => {
      const errorMessage = 'Senha atual incorreta';
      vi.mocked(apiHelpers.post).mockRejectedValue({ message: errorMessage });

      // Setup: authenticate
      act(() => {
        useAuthStore.setState({
          user: userWithMustChange,
          isAuthenticated: true,
        });
      });

      // Use try-catch since the error is re-thrown
      try {
        await act(async () => {
          await useAuthStore.getState().changePassword(changePasswordData);
        });
      } catch {
        // Expected to throw
      }

      // Directly check store state
      const state = useAuthStore.getState();
      expect(state.error).toBe(errorMessage);
      expect(state.isLoading).toBe(false);
      // User should NOT be updated on failure
      expect(state.user?.mustChangePassword).toBe(true);
    });
  });

  describe('Security - No token in state', () => {
    it('should NOT store token in state after login', async () => {
      const responseWithToken = {
        user: mockUser,
        token: 'jwt-token-should-not-be-stored',
      };
      vi.mocked(apiHelpers.post).mockResolvedValue(responseWithToken);

      const { result } = renderHook(() => useAuthStore());

      await act(async () => {
        await result.current.login(mockCredentials);
      });

      // Verify token is NOT in state (security requirement)
      // The state type doesn't have 'token' anymore, so we check the raw state
      const state = useAuthStore.getState();
      expect('token' in state).toBe(false);
      expect(result.current.user).toEqual(mockUser);
      expect(result.current.isAuthenticated).toBe(true);
    });

    it('should NOT store token in state after register', async () => {
      const responseWithToken = {
        user: mockUser,
        token: 'jwt-token-should-not-be-stored',
      };
      vi.mocked(apiHelpers.post).mockResolvedValue(responseWithToken);

      const { result } = renderHook(() => useAuthStore());

      await act(async () => {
        await result.current.register(mockRegisterData);
      });

      // Verify token is NOT in state (security requirement)
      const state = useAuthStore.getState();
      expect('token' in state).toBe(false);
      expect(result.current.user).toEqual(mockUser);
    });
  });
});
