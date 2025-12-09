export interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'user';
  organization: {
    id: string;
    name: string;
  };
  createdAt: string;
  updatedAt: string;
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
