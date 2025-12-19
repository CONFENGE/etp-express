import { create } from 'zustand';
import { apiHelpers } from '@/lib/api';

/**
 * Domain user entity for Domain Manager operations.
 * Represents a user within the Domain Manager's authorized domain.
 */
export interface DomainUser {
 id: string;
 email: string;
 name: string;
 cargo?: string;
 isActive: boolean;
 mustChangePassword: boolean;
 createdAt: string;
 lastLoginAt?: string;
}

/**
 * Quota information for a domain.
 */
export interface QuotaInfo {
 currentUsers: number;
 maxUsers: number;
 available: number;
 percentUsed: number;
}

/**
 * DTO for creating a new domain user.
 */
export interface CreateDomainUserDto {
 email: string;
 name: string;
 cargo?: string;
}

/**
 * DTO for updating a domain user.
 */
export interface UpdateDomainUserDto {
 name?: string;
 cargo?: string;
 isActive?: boolean;
}

/**
 * Manager state store for Domain Manager user management.
 *
 * @security
 * Only accessible to users with role: domain_manager.
 * All API calls are protected by backend guards.
 */
interface ManagerState {
 users: DomainUser[];
 quota: QuotaInfo | null;
 loading: boolean;
 error: string | null;

 fetchUsers: () => Promise<void>;
 fetchQuota: () => Promise<void>;
 createUser: (data: CreateDomainUserDto) => Promise<void>;
 updateUser: (id: string, data: UpdateDomainUserDto) => Promise<void>;
 deleteUser: (id: string) => Promise<void>;
 resetUserPassword: (id: string) => Promise<void>;
 clearError: () => void;
}

export const useManagerStore = create<ManagerState>((set, get) => ({
 users: [],
 quota: null,
 loading: false,
 error: null,

 /**
 * Fetches all users in the Domain Manager's domain.
 */
 fetchUsers: async () => {
 set({ loading: true, error: null });
 try {
 const response = await apiHelpers.get<DomainUser[]>(
 '/domain-manager/users',
 );
 set({ users: response, loading: false });
 } catch (error) {
 const errorMessage =
 error instanceof Error ? error.message : 'Failed to fetch users';
 set({ error: errorMessage, loading: false });
 }
 },

 /**
 * Fetches quota information for the domain.
 */
 fetchQuota: async () => {
 try {
 const response = await apiHelpers.get<QuotaInfo>('/domain-manager/quota');
 set({ quota: response });
 } catch (error) {
 const errorMessage =
 error instanceof Error ? error.message : 'Failed to fetch quota';
 set({ error: errorMessage });
 }
 },

 /**
 * Creates a new user in the domain.
 * Automatically refreshes user list and quota on success.
 */
 createUser: async (data: CreateDomainUserDto) => {
 set({ loading: true, error: null });
 try {
 await apiHelpers.post('/domain-manager/users', data);
 await Promise.all([get().fetchUsers(), get().fetchQuota()]);
 } catch (error) {
 const errorMessage =
 error instanceof Error ? error.message : 'Failed to create user';
 set({ error: errorMessage });
 throw error;
 } finally {
 set({ loading: false });
 }
 },

 /**
 * Updates a user in the domain.
 * Automatically refreshes user list on success.
 */
 updateUser: async (id: string, data: UpdateDomainUserDto) => {
 set({ loading: true, error: null });
 try {
 await apiHelpers.patch(`/domain-manager/users/${id}`, data);
 await get().fetchUsers();
 } catch (error) {
 const errorMessage =
 error instanceof Error ? error.message : 'Failed to update user';
 set({ error: errorMessage });
 throw error;
 } finally {
 set({ loading: false });
 }
 },

 /**
 * Deactivates (soft-deletes) a user in the domain.
 * Automatically refreshes user list and quota on success.
 */
 deleteUser: async (id: string) => {
 set({ loading: true, error: null });
 try {
 await apiHelpers.delete(`/domain-manager/users/${id}`);
 await Promise.all([get().fetchUsers(), get().fetchQuota()]);
 } catch (error) {
 const errorMessage =
 error instanceof Error ? error.message : 'Failed to delete user';
 set({ error: errorMessage });
 throw error;
 } finally {
 set({ loading: false });
 }
 },

 /**
 * Resets a user's password to the default.
 * Automatically refreshes user list on success.
 */
 resetUserPassword: async (id: string) => {
 set({ loading: true, error: null });
 try {
 await apiHelpers.post(`/domain-manager/users/${id}/reset-password`, {});
 await get().fetchUsers();
 } catch (error) {
 const errorMessage =
 error instanceof Error ? error.message : 'Failed to reset password';
 set({ error: errorMessage });
 throw error;
 } finally {
 set({ loading: false });
 }
 },

 clearError: () => set({ error: null }),
}));
