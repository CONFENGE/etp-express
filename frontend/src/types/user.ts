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
   * User's position/title in the organization.
   */
  cargo?: string | null;
  /**
   * Whether the user account is active.
   */
  isActive?: boolean;
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
  /**
   * Timestamp of user's last login.
   * Used for audit trail and session management.
   * @see LGPD Art. 37 - audit requirements
   */
  lastLoginAt?: string | null;
  /**
   * Timestamp when user consented to LGPD terms.
   * Required for LGPD Art. 7º, I compliance.
   */
  lgpdConsentAt?: string | null;
  /**
   * Version of LGPD terms accepted by user.
   * Enables audit trail per LGPD Art. 8º, §4º.
   */
  lgpdConsentVersion?: string | null;
  /**
   * Timestamp when user consented to international data transfer.
   * Required for LGPD Art. 33 compliance (USA servers: Railway, OpenAI, Exa).
   */
  internationalTransferConsentAt?: string | null;
  /**
   * Timestamp when user requested account deletion (soft delete).
   * Required for LGPD Art. 18, VI compliance (direito de exclusão).
   * Account will be permanently deleted after 30 days (hard delete).
   */
  deletedAt?: string | null;
  /**
   * Maximum number of ETPs a demo user can create.
   * Only applies to users with role DEMO.
   * Null for non-demo users (unlimited).
   * Default is 3 for demo users.
   * @see #1439 Demo User Management System
   */
  etpLimitCount?: number | null;
  /**
   * ID of the Authorized Domain this user belongs to.
   * @see M8: Gestão de Domínios Institucionais
   */
  authorizedDomainId?: string | null;
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
