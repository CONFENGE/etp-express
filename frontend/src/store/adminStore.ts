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
 * Demo user entity for System Admin management.
 * Represents a demo account with ETP creation limits.
 * Part of Demo User Management System (Issue #1444).
 */
export interface DemoUser {
  id: string;
  email: string;
  name: string;
  etpLimitCount: number;
  etpCreatedCount: number;
  isActive: boolean;
  isBlocked: boolean;
  createdAt: string;
  lastLoginAt: string | null;
}

/**
 * Extended demo user with generated password.
 * Only returned on creation - password cannot be retrieved later.
 * Part of Demo User Management System (Issue #1444).
 */
export interface DemoUserWithPassword extends DemoUser {
  generatedPassword: string;
}

/**
 * DTO for creating a new demo user account.
 * Part of Demo User Management System (Issue #1444).
 */
export interface CreateDemoUserDto {
  email: string;
  name: string;
  etpLimitCount?: number;
}

/**
 * Admin state store for System Admin domain and demo user management.
 *
 * @security
 * Only accessible to users with role: system_admin.
 * All API calls are protected by backend guards.
 */
interface AdminState {
  domains: AuthorizedDomain[];
  statistics: GlobalStatistics | null;
  productivityRanking: ProductivityRankingResponse | null;
  demoUsers: DemoUser[];
  loading: boolean;
  rankingLoading: boolean;
  demoUsersLoading: boolean;
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

  fetchDemoUsers: () => Promise<void>;
  createDemoUser: (data: CreateDemoUserDto) => Promise<DemoUserWithPassword>;
  deleteDemoUser: (id: string) => Promise<void>;
  resetDemoUser: (id: string) => Promise<void>;

  clearError: () => void;
}

export const useAdminStore = create<AdminState>((set, get) => ({
  domains: [],
  statistics: null,
  productivityRanking: null,
  demoUsers: [],
  loading: false,
  rankingLoading: false,
  demoUsersLoading: false,
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

  /**
   * Fetches all demo users.
   * Part of Demo User Management System (Issue #1444).
   */
  fetchDemoUsers: async () => {
    set({ demoUsersLoading: true, error: null });
    try {
      const response = await apiHelpers.get<DemoUser[]>(
        '/system-admin/demo-users',
      );
      set({ demoUsers: response, demoUsersLoading: false });
    } catch (error) {
      set({
        error: getContextualErrorMessage('carregar', 'usuários demo', error),
        demoUsersLoading: false,
      });
    }
  },

  /**
   * Creates a new demo user account.
   * Returns DemoUserWithPassword containing the generated password.
   * Password is shown ONCE only - cannot be retrieved later.
   * Part of Demo User Management System (Issue #1444).
   */
  createDemoUser: async (
    data: CreateDemoUserDto,
  ): Promise<DemoUserWithPassword> => {
    set({ demoUsersLoading: true, error: null });
    try {
      const response = await apiHelpers.post<DemoUserWithPassword>(
        '/system-admin/demo-users',
        data,
      );
      await get().fetchDemoUsers();
      return response;
    } catch (error) {
      set({
        error: getContextualErrorMessage('criar', 'usuário demo', error),
        demoUsersLoading: false,
      });
      throw error;
    }
  },

  /**
   * Deletes a demo user account by ID.
   * Automatically refreshes demo user list on success.
   * Part of Demo User Management System (Issue #1444).
   */
  deleteDemoUser: async (id: string) => {
    set({ demoUsersLoading: true, error: null });
    try {
      await apiHelpers.delete(`/system-admin/demo-users/${id}`);
      await get().fetchDemoUsers();
    } catch (error) {
      set({
        error: getContextualErrorMessage('excluir', 'usuário demo', error),
        demoUsersLoading: false,
      });
      throw error;
    }
  },

  /**
   * Resets a demo user's ETP count to 0, unblocking them.
   * Automatically refreshes demo user list on success.
   * Part of Demo User Management System (Issue #1444).
   */
  resetDemoUser: async (id: string) => {
    set({ demoUsersLoading: true, error: null });
    try {
      await apiHelpers.patch(`/system-admin/demo-users/${id}/reset`);
      await get().fetchDemoUsers();
    } catch (error) {
      set({
        error: getContextualErrorMessage('resetar', 'usuário demo', error),
        demoUsersLoading: false,
      });
      throw error;
    }
  },

  clearError: () => set({ error: null }),
}));
