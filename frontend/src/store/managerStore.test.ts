import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import {
  useManagerStore,
  DomainUser,
  QuotaInfo,
  CreateDomainUserDto,
  UpdateDomainUserDto,
} from './managerStore';
import { apiHelpers } from '@/lib/api';

// Mock apiHelpers module
vi.mock('@/lib/api', () => ({
  apiHelpers: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('managerStore', () => {
  // Mock data fixtures
  const mockUsers: DomainUser[] = [
    {
      id: 'user-1',
      email: 'joao@lages.sc.gov.br',
      name: 'Joao Silva',
      cargo: 'Tecnico Administrativo',
      isActive: true,
      mustChangePassword: false,
      createdAt: '2024-01-01T00:00:00Z',
      lastLoginAt: '2024-06-01T10:00:00Z',
    },
    {
      id: 'user-2',
      email: 'maria@lages.sc.gov.br',
      name: 'Maria Santos',
      cargo: 'Analista',
      isActive: true,
      mustChangePassword: true,
      createdAt: '2024-02-01T00:00:00Z',
    },
  ];

  const mockQuota: QuotaInfo = {
    currentUsers: 7,
    maxUsers: 10,
    available: 3,
    percentUsed: 70,
  };

  const mockCreateUserDto: CreateDomainUserDto = {
    email: 'pedro@lages.sc.gov.br',
    name: 'Pedro Costa',
    cargo: 'Assistente',
  };

  const mockUpdateUserDto: UpdateDomainUserDto = {
    name: 'Joao Silva Junior',
    cargo: 'Coordenador',
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Reset store state
    useManagerStore.setState({
      users: [],
      quota: null,
      loading: false,
      error: null,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Initial state', () => {
    it('should start with empty users and no quota', () => {
      const { result } = renderHook(() => useManagerStore());

      expect(result.current.users).toEqual([]);
      expect(result.current.quota).toBeNull();
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBeNull();
    });
  });

  describe('fetchUsers', () => {
    it('should fetch users successfully', async () => {
      vi.mocked(apiHelpers.get).mockResolvedValue(mockUsers);

      const { result } = renderHook(() => useManagerStore());

      await act(async () => {
        await result.current.fetchUsers();
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(apiHelpers.get).toHaveBeenCalledWith('/domain-manager/users');
      expect(result.current.users).toEqual(mockUsers);
      expect(result.current.error).toBeNull();
    });

    it('should set loading state during fetch', async () => {
      let resolveFetch: (value: unknown) => void;
      const fetchPromise = new Promise((resolve) => {
        resolveFetch = resolve;
      });
      vi.mocked(apiHelpers.get).mockReturnValue(fetchPromise as never);

      const { result } = renderHook(() => useManagerStore());

      // Start fetch but don't await
      act(() => {
        result.current.fetchUsers();
      });

      // Loading should be true during request
      expect(result.current.loading).toBe(true);

      // Resolve the fetch
      await act(async () => {
        resolveFetch!(mockUsers);
        await fetchPromise.catch(() => {});
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });
    });

    it('should set error on fetch failure', async () => {
      const errorMessage = 'Failed to fetch users';
      vi.mocked(apiHelpers.get).mockRejectedValue(new Error(errorMessage));

      await act(async () => {
        await useManagerStore.getState().fetchUsers();
      });

      const state = useManagerStore.getState();
      expect(state.error).not.toBeNull(); // Error message is now user-friendly Portuguese
      expect(state.loading).toBe(false);
      expect(state.users).toEqual([]);
    });
  });

  describe('fetchQuota', () => {
    it('should fetch quota successfully', async () => {
      vi.mocked(apiHelpers.get).mockResolvedValue(mockQuota);

      const { result } = renderHook(() => useManagerStore());

      await act(async () => {
        await result.current.fetchQuota();
      });

      expect(apiHelpers.get).toHaveBeenCalledWith('/domain-manager/quota');
      expect(result.current.quota).toEqual(mockQuota);
    });

    it('should set error on fetch failure', async () => {
      const errorMessage = 'Failed to fetch quota';
      vi.mocked(apiHelpers.get).mockRejectedValue(new Error(errorMessage));

      await act(async () => {
        await useManagerStore.getState().fetchQuota();
      });

      const state = useManagerStore.getState();
      expect(state.error).not.toBeNull(); // Error message is now user-friendly Portuguese
      expect(state.quota).toBeNull();
    });
  });

  describe('createUser', () => {
    it('should create user and refresh list', async () => {
      const newUser: DomainUser = {
        id: 'user-3',
        email: mockCreateUserDto.email,
        name: mockCreateUserDto.name,
        cargo: mockCreateUserDto.cargo,
        isActive: true,
        mustChangePassword: true,
        createdAt: '2024-06-01T00:00:00Z',
      };

      vi.mocked(apiHelpers.post).mockResolvedValue(newUser);
      vi.mocked(apiHelpers.get)
        .mockResolvedValueOnce([...mockUsers, newUser]) // fetchUsers
        .mockResolvedValueOnce({ ...mockQuota, currentUsers: 8, available: 2 }); // fetchQuota

      const { result } = renderHook(() => useManagerStore());

      await act(async () => {
        await result.current.createUser(mockCreateUserDto);
      });

      expect(apiHelpers.post).toHaveBeenCalledWith(
        '/domain-manager/users',
        mockCreateUserDto,
      );
      expect(apiHelpers.get).toHaveBeenCalledWith('/domain-manager/users');
      expect(apiHelpers.get).toHaveBeenCalledWith('/domain-manager/quota');
      expect(result.current.users).toHaveLength(3);
    });

    it('should set error on create failure', async () => {
      const errorMessage = 'Quota exceeded';
      vi.mocked(apiHelpers.post).mockRejectedValue(new Error(errorMessage));

      try {
        await act(async () => {
          await useManagerStore.getState().createUser(mockCreateUserDto);
        });
      } catch {
        // Expected to throw
      }

      const state = useManagerStore.getState();
      expect(state.error).not.toBeNull(); // Error message is now user-friendly Portuguese
      expect(state.loading).toBe(false);
    });
  });

  describe('updateUser', () => {
    it('should update user and refresh list', async () => {
      const updatedUser: DomainUser = {
        ...mockUsers[0],
        name: mockUpdateUserDto.name!,
        cargo: mockUpdateUserDto.cargo,
      };
      const updatedUsers = [updatedUser, mockUsers[1]];

      vi.mocked(apiHelpers.patch).mockResolvedValue(updatedUser);
      vi.mocked(apiHelpers.get).mockResolvedValue(updatedUsers);

      const { result } = renderHook(() => useManagerStore());

      // Setup: add users first
      act(() => {
        useManagerStore.setState({ users: mockUsers });
      });

      await act(async () => {
        await result.current.updateUser('user-1', mockUpdateUserDto);
      });

      expect(apiHelpers.patch).toHaveBeenCalledWith(
        '/domain-manager/users/user-1',
        mockUpdateUserDto,
      );
      expect(apiHelpers.get).toHaveBeenCalledWith('/domain-manager/users');
      expect(result.current.users[0].name).toBe(mockUpdateUserDto.name);
    });

    it('should set error on update failure', async () => {
      const errorMessage = 'User not found';
      vi.mocked(apiHelpers.patch).mockRejectedValue(new Error(errorMessage));

      try {
        await act(async () => {
          await useManagerStore
            .getState()
            .updateUser('invalid-id', mockUpdateUserDto);
        });
      } catch {
        // Expected to throw
      }

      const state = useManagerStore.getState();
      expect(state.error).not.toBeNull(); // Error message is now user-friendly Portuguese
      expect(state.loading).toBe(false);
    });
  });

  describe('deleteUser', () => {
    it('should delete user and refresh list', async () => {
      const userIdToDelete = 'user-1';
      vi.mocked(apiHelpers.delete).mockResolvedValue({
        message: 'User deactivated',
      });
      vi.mocked(apiHelpers.get)
        .mockResolvedValueOnce(mockUsers.filter((u) => u.id !== userIdToDelete))
        .mockResolvedValueOnce({ ...mockQuota, currentUsers: 6, available: 4 });

      const { result } = renderHook(() => useManagerStore());

      // Setup: add users first
      act(() => {
        useManagerStore.setState({ users: mockUsers });
      });

      await act(async () => {
        await result.current.deleteUser(userIdToDelete);
      });

      expect(apiHelpers.delete).toHaveBeenCalledWith(
        `/domain-manager/users/${userIdToDelete}`,
      );
      expect(apiHelpers.get).toHaveBeenCalledWith('/domain-manager/users');
      expect(apiHelpers.get).toHaveBeenCalledWith('/domain-manager/quota');
      expect(result.current.users).toHaveLength(1);
      expect(result.current.users[0].id).toBe('user-2');
    });

    it('should set error on delete failure', async () => {
      const errorMessage = 'Cannot delete admin user';
      vi.mocked(apiHelpers.delete).mockRejectedValue(new Error(errorMessage));

      try {
        await act(async () => {
          await useManagerStore.getState().deleteUser('user-1');
        });
      } catch {
        // Expected to throw
      }

      const state = useManagerStore.getState();
      expect(state.error).not.toBeNull(); // Error message is now user-friendly Portuguese
      expect(state.loading).toBe(false);
    });
  });

  describe('resetUserPassword', () => {
    it('should reset user password and refresh list', async () => {
      const userId = 'user-2';
      const userWithPasswordReset = {
        ...mockUsers[1],
        mustChangePassword: true,
      };
      const updatedUsers = [mockUsers[0], userWithPasswordReset];

      vi.mocked(apiHelpers.post).mockResolvedValue({
        message: 'Password reset',
      });
      vi.mocked(apiHelpers.get).mockResolvedValue(updatedUsers);

      const { result } = renderHook(() => useManagerStore());

      // Setup: add users first
      act(() => {
        useManagerStore.setState({ users: mockUsers });
      });

      await act(async () => {
        await result.current.resetUserPassword(userId);
      });

      expect(apiHelpers.post).toHaveBeenCalledWith(
        `/domain-manager/users/${userId}/reset-password`,
        {},
      );
      expect(apiHelpers.get).toHaveBeenCalledWith('/domain-manager/users');
    });

    it('should set error on password reset failure', async () => {
      const errorMessage = 'Cannot reset admin password';
      vi.mocked(apiHelpers.post).mockRejectedValue(new Error(errorMessage));

      try {
        await act(async () => {
          await useManagerStore.getState().resetUserPassword('user-1');
        });
      } catch {
        // Expected to throw
      }

      const state = useManagerStore.getState();
      expect(state.error).not.toBeNull(); // Error message is now user-friendly Portuguese
      expect(state.loading).toBe(false);
    });
  });

  describe('clearError', () => {
    it('should clear error state', () => {
      const { result } = renderHook(() => useManagerStore());

      // Setup: set error
      act(() => {
        useManagerStore.setState({ error: 'Some error' });
      });

      expect(result.current.error).toBe('Some error');

      act(() => {
        result.current.clearError();
      });

      expect(result.current.error).toBeNull();
    });
  });

  describe('Loading states', () => {
    it('should manage loading state during createUser', async () => {
      let resolveCreate: (value: unknown) => void;
      const createPromise = new Promise((resolve) => {
        resolveCreate = resolve;
      });
      vi.mocked(apiHelpers.post).mockReturnValue(createPromise as never);

      const { result } = renderHook(() => useManagerStore());

      // Start create but don't await
      act(() => {
        result.current.createUser(mockCreateUserDto);
      });

      expect(result.current.loading).toBe(true);

      // Resolve and setup fetchUsers/fetchQuota mocks
      vi.mocked(apiHelpers.get)
        .mockResolvedValueOnce(mockUsers)
        .mockResolvedValueOnce(mockQuota);

      await act(async () => {
        resolveCreate!({});
        await createPromise.catch(() => {});
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });
    });

    it('should manage loading state during deleteUser', async () => {
      let resolveDelete: (value: unknown) => void;
      const deletePromise = new Promise((resolve) => {
        resolveDelete = resolve;
      });
      vi.mocked(apiHelpers.delete).mockReturnValue(deletePromise as never);

      const { result } = renderHook(() => useManagerStore());

      // Start delete but don't await
      act(() => {
        result.current.deleteUser('user-1');
      });

      expect(result.current.loading).toBe(true);

      // Resolve and setup fetchUsers/fetchQuota mocks
      vi.mocked(apiHelpers.get)
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce(mockQuota);

      await act(async () => {
        resolveDelete!({});
        await deletePromise.catch(() => {});
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });
    });

    it('should manage loading state during updateUser', async () => {
      let resolveUpdate: (value: unknown) => void;
      const updatePromise = new Promise((resolve) => {
        resolveUpdate = resolve;
      });
      vi.mocked(apiHelpers.patch).mockReturnValue(updatePromise as never);

      const { result } = renderHook(() => useManagerStore());

      // Start update but don't await
      act(() => {
        result.current.updateUser('user-1', mockUpdateUserDto);
      });

      expect(result.current.loading).toBe(true);

      // Resolve and setup fetchUsers mock
      vi.mocked(apiHelpers.get).mockResolvedValueOnce(mockUsers);

      await act(async () => {
        resolveUpdate!({});
        await updatePromise.catch(() => {});
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });
    });

    it('should manage loading state during resetUserPassword', async () => {
      let resolveReset: (value: unknown) => void;
      const resetPromise = new Promise((resolve) => {
        resolveReset = resolve;
      });
      vi.mocked(apiHelpers.post).mockReturnValue(resetPromise as never);

      const { result } = renderHook(() => useManagerStore());

      // Start reset but don't await
      act(() => {
        result.current.resetUserPassword('user-1');
      });

      expect(result.current.loading).toBe(true);

      // Resolve and setup fetchUsers mock
      vi.mocked(apiHelpers.get).mockResolvedValueOnce(mockUsers);

      await act(async () => {
        resolveReset!({});
        await resetPromise.catch(() => {});
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });
    });

    it('should reset loading state on createUser success path', async () => {
      vi.mocked(apiHelpers.post).mockResolvedValue({});
      vi.mocked(apiHelpers.get)
        .mockResolvedValueOnce(mockUsers)
        .mockResolvedValueOnce(mockQuota);

      const { result } = renderHook(() => useManagerStore());

      await act(async () => {
        await result.current.createUser(mockCreateUserDto);
      });

      // Verify loading is false after successful operation
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('should reset loading state on updateUser success path', async () => {
      vi.mocked(apiHelpers.patch).mockResolvedValue({});
      vi.mocked(apiHelpers.get).mockResolvedValueOnce(mockUsers);

      const { result } = renderHook(() => useManagerStore());

      await act(async () => {
        await result.current.updateUser('user-1', mockUpdateUserDto);
      });

      // Verify loading is false after successful operation
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('should reset loading state on deleteUser success path', async () => {
      vi.mocked(apiHelpers.delete).mockResolvedValue({});
      vi.mocked(apiHelpers.get)
        .mockResolvedValueOnce(mockUsers)
        .mockResolvedValueOnce(mockQuota);

      const { result } = renderHook(() => useManagerStore());

      await act(async () => {
        await result.current.deleteUser('user-1');
      });

      // Verify loading is false after successful operation
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('should reset loading state on resetUserPassword success path', async () => {
      vi.mocked(apiHelpers.post).mockResolvedValue({});
      vi.mocked(apiHelpers.get).mockResolvedValueOnce(mockUsers);

      const { result } = renderHook(() => useManagerStore());

      await act(async () => {
        await result.current.resetUserPassword('user-1');
      });

      // Verify loading is false after successful operation
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBeNull();
    });
  });
});
