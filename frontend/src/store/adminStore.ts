import { create } from 'zustand';
import { apiHelpers } from '@/lib/api';
import { getContextualErrorMessage } from '@/lib/api-errors';

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
 * Aligned with backend GlobalStatistics interface.
 */
export interface GlobalStatistics {
  totalDomains: number;
  activeDomains: number;
  inactiveDomains: number;
  totalUsers: number;
  totalOrganizations: number;
  totalEtps: number;
  domainsByOrganization: { organizationName: string; domainCount: number }[];
}

/**
 * DTO for creating a new authorized domain.
 */
export interface CreateDomainDto {
  domain: string;
  institutionName: string;
  maxUsers: number;
}

/**
 * Single user entry in the productivity ranking.
 * Part of advanced metrics feature (Issue #1367).
 */
export interface ProductivityRankingItem {
  position: number;
  userId: string;
  userName: string;
  userEmail: string;
  etpsCreated: number;
  etpsCompleted: number;
  completionRate: number;
}

/**
 * Response interface for productivity ranking.
 * Part of advanced metrics feature (Issue #1367).
 */
export interface ProductivityRankingResponse {
  ranking: ProductivityRankingItem[];
  totalUsers: number;
  page: number;
  limit: number;
  totalPages: number;
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
  productivityRanking: ProductivityRankingResponse | null;
  loading: boolean;
  rankingLoading: boolean;
  error: string | null;

  fetchDomains: () => Promise<void>;
  fetchStatistics: () => Promise<void>;
  fetchProductivityRanking: (
    periodDays?: number,
    page?: number,
    limit?: number,
  ) => Promise<void>;
  createDomain: (data: CreateDomainDto) => Promise<void>;
  deleteDomain: (id: string) => Promise<void>;
  assignManager: (domainId: string, userId: string) => Promise<void>;
  clearError: () => void;
}

export const useAdminStore = create<AdminState>((set, get) => ({
  domains: [],
  statistics: null,
  productivityRanking: null,
  loading: false,
  rankingLoading: false,
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
      set({
        error: getContextualErrorMessage('carregar', 'domínios', error),
        loading: false,
      });
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
      set({
        error: getContextualErrorMessage('carregar', 'estatísticas', error),
      });
    }
  },

  /**
   * Fetches productivity ranking of users.
   * Part of advanced metrics feature (Issue #1367).
   */
  fetchProductivityRanking: async (
    periodDays: number = 0,
    page: number = 1,
    limit: number = 10,
  ) => {
    set({ rankingLoading: true });
    try {
      const params = new URLSearchParams();
      if (periodDays > 0) params.append('periodDays', periodDays.toString());
      params.append('page', page.toString());
      params.append('limit', limit.toString());

      const response = await apiHelpers.get<ProductivityRankingResponse>(
        `/system-admin/metrics/productivity-ranking?${params.toString()}`,
      );
      set({ productivityRanking: response, rankingLoading: false });
    } catch (error) {
      set({
        error: getContextualErrorMessage(
          'carregar',
          'ranking de produtividade',
          error,
        ),
        rankingLoading: false,
      });
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
      set({
        error: getContextualErrorMessage('criar', 'domínio', error),
        loading: false,
      });
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
      set({
        error: getContextualErrorMessage('excluir', 'domínio', error),
        loading: false,
      });
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
      set({
        error: getContextualErrorMessage('atribuir', 'gestor', error),
        loading: false,
      });
      throw error;
    }
  },

  clearError: () => set({ error: null }),
}));
