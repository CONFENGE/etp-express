/**
 * User roles for hierarchical access control (M8: Gestão de Domínios Institucionais).
 */
export type UserRole =
  | 'system_admin'
  | 'domain_manager'
  | 'admin'
  | 'user'
  | 'viewer'
  | 'demo';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  organization?: {
    id: string;
    name: string;
  };
  organizationId?: string;
  /**
   * Flag indicating user must change password on next login.
   * Required for M8: Domain management - new users created by Domain Managers
   * must change their initial password.
   */
  mustChangePassword?: boolean;
  /**
   * Flag indicating demo user has reached their ETP limit and is blocked.
   * True for demo users (role=DEMO) who have reached their ETP creation limit.
   * Frontend uses this to enable read-only mode (view ETPs but not create new ones).
   * @see #1446 Demo User Management System
   */
  isDemoBlocked?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  name: string;
  lgpdConsent: boolean;
  internationalTransferConsent: boolean;
}

/**
 * Auth response from login/register endpoints.
 *
 * @security
 * With httpOnly cookie strategy:
 * - token: Present in response but stored in httpOnly cookie by backend (not accessible via JS)
 * - user: Non-sensitive user data for UI rendering
 *
 * The token field will be deprecated after backend migration to cookie-only auth (#505).
 */
export interface AuthResponse {
  token?: string; // Optional - will be removed after #505 backend migration
  user: User;
}
