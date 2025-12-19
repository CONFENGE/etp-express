import { create } from 'zustand';
import { apiHelpers } from '@/lib/api';

/**
 * Authorized domain entity for System Admin management.
 * Represents an institutional domain that users can register with.
 */
export interface AuthorizedDomain {
  id: string;
  domain: string;
  createdAt: string;
  maxUsers: number;
  isActive: boolean;
  managerId?: string;
  managerName?: string;
  currentUsers?: number;
}

/**
 * Global platform statistics for System Admin dashboard.
 */
export interface GlobalStatistics {
  totalDomains: number;
  activeDomains: number;
  totalUsers: number;
  activeUsers: number;
}

/**
 * DTO for creating a new authorized domain.
 */
export interface CreateDomainDto {
  domain: string;
  maxUsers: number;
}

/**
 * Admin state store for System Admin domain management.
 *
 * @security
 * Only accessible to users with role: system_admin.
 * All API calls are protected by backend guards.
 */
interface AdminState {
  domains: AuthorizedDomain[];
  statistics: GlobalStatistics | null;
  loading: boolean;
  error: string | null;

  fetchDomains: () => Promise<void>;
  fetchStatistics: () => Promise<void>;
  createDomain: (data: CreateDomainDto) => Promise<void>;
  deleteDomain: (id: string) => Promise<void>;
  assignManager: (domainId: string, userId: string) => Promise<void>;
  clearError: () => void;
}

export const useAdminStore = create<AdminState>((set, get) => ({
  domains: [],
  statistics: null,
  loading: false,
  error: null,

  /**
   * Fetches all authorized domains.
   */
  fetchDomains: async () => {
    set({ loading: true, error: null });
    try {
      const response = await apiHelpers.get<AuthorizedDomain[]>(
        '/system-admin/domains',
      );
      set({ domains: response, loading: false });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to fetch domains';
      set({ error: errorMessage, loading: false });
    }
  },

  /**
   * Fetches global platform statistics.
   */
  fetchStatistics: async () => {
    try {
      const response = await apiHelpers.get<GlobalStatistics>(
        '/system-admin/statistics',
      );
      set({ statistics: response });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to fetch statistics';
      set({ error: errorMessage });
    }
  },

  /**
   * Creates a new authorized domain.
   * Automatically refreshes domain list on success.
   */
  createDomain: async (data: CreateDomainDto) => {
    set({ loading: true, error: null });
    try {
      await apiHelpers.post('/system-admin/domains', data);
      await get().fetchDomains();
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to create domain';
      set({ error: errorMessage, loading: false });
      throw error;
    }
  },

  /**
   * Deletes an authorized domain by ID.
   * Automatically refreshes domain list on success.
   */
  deleteDomain: async (id: string) => {
    set({ loading: true, error: null });
    try {
      await apiHelpers.delete(`/system-admin/domains/${id}`);
      await get().fetchDomains();
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to delete domain';
      set({ error: errorMessage, loading: false });
      throw error;
    }
  },

  /**
   * Assigns a user as domain manager.
   * Automatically refreshes domain list on success.
   */
  assignManager: async (domainId: string, userId: string) => {
    set({ loading: true, error: null });
    try {
      await apiHelpers.post(`/system-admin/domains/${domainId}/manager`, {
        userId,
      });
      await get().fetchDomains();
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to assign manager';
      set({ error: errorMessage, loading: false });
      throw error;
    }
  },

  clearError: () => set({ error: null }),
}));
