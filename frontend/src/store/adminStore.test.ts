import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import {
  useAdminStore,
  AuthorizedDomain,
  GlobalStatistics,
  CreateDomainDto,
} from './adminStore';
import { apiHelpers } from '@/lib/api';

// Mock apiHelpers module
vi.mock('@/lib/api', () => ({
  apiHelpers: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('adminStore', () => {
  // Mock data fixtures
  const mockDomains: AuthorizedDomain[] = [
    {
      id: 'domain-1',
      domain: 'example.com',
      createdAt: '2024-01-01T00:00:00Z',
      maxUsers: 10,
      isActive: true,
      managerId: 'user-1',
      managerName: 'John Doe',
    },
    {
      id: 'domain-2',
      domain: 'test.org',
      createdAt: '2024-02-01T00:00:00Z',
      maxUsers: 5,
      isActive: false,
    },
  ];

  const mockStatistics: GlobalStatistics = {
    totalDomains: 10,
    activeDomains: 8,
    totalUsers: 100,
    activeUsers: 85,
  };

  const mockCreateDomainDto: CreateDomainDto = {
    domain: 'new-domain.com',
    maxUsers: 15,
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Reset store state
    useAdminStore.setState({
      domains: [],
      statistics: null,
      loading: false,
      error: null,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Initial state', () => {
    it('should start with empty domains and no statistics', () => {
      const { result } = renderHook(() => useAdminStore());

      expect(result.current.domains).toEqual([]);
      expect(result.current.statistics).toBeNull();
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBeNull();
    });
  });

  describe('fetchDomains', () => {
    it('should fetch domains successfully', async () => {
      vi.mocked(apiHelpers.get).mockResolvedValue(mockDomains);

      const { result } = renderHook(() => useAdminStore());

      await act(async () => {
        await result.current.fetchDomains();
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(apiHelpers.get).toHaveBeenCalledWith('/system-admin/domains');
      expect(result.current.domains).toEqual(mockDomains);
      expect(result.current.error).toBeNull();
    });

    it('should set loading state during fetch', async () => {
      let resolveFetch: (value: unknown) => void;
      const fetchPromise = new Promise((resolve) => {
        resolveFetch = resolve;
      });
      vi.mocked(apiHelpers.get).mockReturnValue(fetchPromise as never);

      const { result } = renderHook(() => useAdminStore());

      // Start fetch but don't await
      act(() => {
        result.current.fetchDomains();
      });

      // Loading should be true during request
      expect(result.current.loading).toBe(true);

      // Resolve the fetch
      await act(async () => {
        resolveFetch!(mockDomains);
        await fetchPromise.catch(() => {});
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });
    });

    it('should set error on fetch failure', async () => {
      const errorMessage = 'Failed to fetch domains';
      vi.mocked(apiHelpers.get).mockRejectedValue(new Error(errorMessage));

      await act(async () => {
        await useAdminStore.getState().fetchDomains();
      });

      const state = useAdminStore.getState();
      expect(state.error).toBe(errorMessage);
      expect(state.loading).toBe(false);
      expect(state.domains).toEqual([]);
    });
  });

  describe('fetchStatistics', () => {
    it('should fetch statistics successfully', async () => {
      vi.mocked(apiHelpers.get).mockResolvedValue(mockStatistics);

      const { result } = renderHook(() => useAdminStore());

      await act(async () => {
        await result.current.fetchStatistics();
      });

      expect(apiHelpers.get).toHaveBeenCalledWith('/system-admin/statistics');
      expect(result.current.statistics).toEqual(mockStatistics);
    });

    it('should set error on fetch failure', async () => {
      const errorMessage = 'Failed to fetch statistics';
      vi.mocked(apiHelpers.get).mockRejectedValue(new Error(errorMessage));

      await act(async () => {
        await useAdminStore.getState().fetchStatistics();
      });

      const state = useAdminStore.getState();
      expect(state.error).toBe(errorMessage);
      expect(state.statistics).toBeNull();
    });
  });

  describe('createDomain', () => {
    it('should create domain and refresh list', async () => {
      vi.mocked(apiHelpers.post).mockResolvedValue({ id: 'new-domain' });
      vi.mocked(apiHelpers.get).mockResolvedValue([
        ...mockDomains,
        { ...mockCreateDomainDto, id: 'new-domain', isActive: true },
      ]);

      const { result } = renderHook(() => useAdminStore());

      await act(async () => {
        await result.current.createDomain(mockCreateDomainDto);
      });

      expect(apiHelpers.post).toHaveBeenCalledWith(
        '/system-admin/domains',
        mockCreateDomainDto,
      );
      expect(apiHelpers.get).toHaveBeenCalledWith('/system-admin/domains');
      expect(result.current.domains).toHaveLength(3);
    });

    it('should set error on create failure', async () => {
      const errorMessage = 'Domain already exists';
      vi.mocked(apiHelpers.post).mockRejectedValue(new Error(errorMessage));

      try {
        await act(async () => {
          await useAdminStore.getState().createDomain(mockCreateDomainDto);
        });
      } catch {
        // Expected to throw
      }

      const state = useAdminStore.getState();
      expect(state.error).toBe(errorMessage);
      expect(state.loading).toBe(false);
    });
  });

  describe('deleteDomain', () => {
    it('should delete domain and refresh list', async () => {
      const domainIdToDelete = 'domain-1';
      vi.mocked(apiHelpers.delete).mockResolvedValue({});
      vi.mocked(apiHelpers.get).mockResolvedValue(
        mockDomains.filter((d) => d.id !== domainIdToDelete),
      );

      const { result } = renderHook(() => useAdminStore());

      // Setup: add domains first
      act(() => {
        useAdminStore.setState({ domains: mockDomains });
      });

      await act(async () => {
        await result.current.deleteDomain(domainIdToDelete);
      });

      expect(apiHelpers.delete).toHaveBeenCalledWith(
        `/system-admin/domains/${domainIdToDelete}`,
      );
      expect(apiHelpers.get).toHaveBeenCalledWith('/system-admin/domains');
      expect(result.current.domains).toHaveLength(1);
      expect(result.current.domains[0].id).toBe('domain-2');
    });

    it('should set error on delete failure', async () => {
      const errorMessage = 'Cannot delete domain with users';
      vi.mocked(apiHelpers.delete).mockRejectedValue(new Error(errorMessage));

      try {
        await act(async () => {
          await useAdminStore.getState().deleteDomain('domain-1');
        });
      } catch {
        // Expected to throw
      }

      const state = useAdminStore.getState();
      expect(state.error).toBe(errorMessage);
      expect(state.loading).toBe(false);
    });
  });

  describe('assignManager', () => {
    it('should assign manager and refresh list', async () => {
      const domainId = 'domain-2';
      const userId = 'user-2';
      const updatedDomains = mockDomains.map((d) =>
        d.id === domainId
          ? { ...d, managerId: userId, managerName: 'Jane Doe' }
          : d,
      );

      vi.mocked(apiHelpers.post).mockResolvedValue({});
      vi.mocked(apiHelpers.get).mockResolvedValue(updatedDomains);

      const { result } = renderHook(() => useAdminStore());

      // Setup: add domains first
      act(() => {
        useAdminStore.setState({ domains: mockDomains });
      });

      await act(async () => {
        await result.current.assignManager(domainId, userId);
      });

      expect(apiHelpers.post).toHaveBeenCalledWith(
        `/system-admin/domains/${domainId}/manager`,
        { userId },
      );
      expect(apiHelpers.get).toHaveBeenCalledWith('/system-admin/domains');
      const domain2 = result.current.domains.find((d) => d.id === domainId);
      expect(domain2?.managerId).toBe(userId);
    });

    it('should set error on assign failure', async () => {
      const errorMessage = 'User not found';
      vi.mocked(apiHelpers.post).mockRejectedValue(new Error(errorMessage));

      try {
        await act(async () => {
          await useAdminStore
            .getState()
            .assignManager('domain-1', 'invalid-user');
        });
      } catch {
        // Expected to throw
      }

      const state = useAdminStore.getState();
      expect(state.error).toBe(errorMessage);
      expect(state.loading).toBe(false);
    });
  });

  describe('clearError', () => {
    it('should clear error state', () => {
      const { result } = renderHook(() => useAdminStore());

      // Setup: set error
      act(() => {
        useAdminStore.setState({ error: 'Some error' });
      });

      expect(result.current.error).toBe('Some error');

      act(() => {
        result.current.clearError();
      });

      expect(result.current.error).toBeNull();
    });
  });

  describe('Loading states', () => {
    it('should manage loading state during createDomain', async () => {
      let resolveCreate: (value: unknown) => void;
      const createPromise = new Promise((resolve) => {
        resolveCreate = resolve;
      });
      vi.mocked(apiHelpers.post).mockReturnValue(createPromise as never);

      const { result } = renderHook(() => useAdminStore());

      // Start create but don't await
      act(() => {
        result.current.createDomain(mockCreateDomainDto);
      });

      expect(result.current.loading).toBe(true);

      // Resolve and setup fetchDomains mock
      vi.mocked(apiHelpers.get).mockResolvedValue(mockDomains);

      await act(async () => {
        resolveCreate!({});
        await createPromise.catch(() => {});
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });
    });

    it('should manage loading state during deleteDomain', async () => {
      let resolveDelete: (value: unknown) => void;
      const deletePromise = new Promise((resolve) => {
        resolveDelete = resolve;
      });
      vi.mocked(apiHelpers.delete).mockReturnValue(deletePromise as never);

      const { result } = renderHook(() => useAdminStore());

      // Start delete but don't await
      act(() => {
        result.current.deleteDomain('domain-1');
      });

      expect(result.current.loading).toBe(true);

      // Resolve and setup fetchDomains mock
      vi.mocked(apiHelpers.get).mockResolvedValue([]);

      await act(async () => {
        resolveDelete!({});
        await deletePromise.catch(() => {});
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });
    });
  });
});
