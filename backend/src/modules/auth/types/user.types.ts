import { User } from '../../../entities/user.entity';

/**
 * User object without password field.
 *
 * @remarks
 * Used for safe user data representation after authentication.
 * Omits the password field to prevent accidental exposure in API responses
 * or internal data flows.
 *
 * @see User - Full user entity with all fields
 *
 * @example
 * ```ts
 * const safeUser: UserWithoutPassword = {
 * id: '123',
 * email: 'user@example.com',
 * name: 'João Silva',
 * role: UserRole.USER,
 * cargo: 'Analista',
 * organizationId: 'org-uuid',
 * organization: { ... },
 * isActive: true,
 * lastLoginAt: new Date(),
 * createdAt: new Date(),
 * updatedAt: new Date(),
 * etps: [],
 * auditLogs: []
 * };
 * ```
 */
export type UserWithoutPassword = Omit<User, 'password'>;

/**
 * JWT payload structure for authentication tokens.
 *
 * @remarks
 * Includes organizationId for Multi-Tenancy B2G (MT-03).
 * Includes mustChangePassword for M8: Domain Management - forces password change on first login.
 * Used to enforce data isolation and organization-scoped access control.
 *
 * @see JwtStrategy - Validates and extracts this payload
 *
 * @example
 * ```ts
 * const payload: JwtPayload = {
 * sub: 'user-uuid',
 * email: 'user@lages.sc.gov.br',
 * name: 'João Silva',
 * role: 'user',
 * organizationId: 'org-uuid',
 * mustChangePassword: false
 * };
 * ```
 */
export interface JwtPayload {
  sub: string;
  email: string;
  name: string;
  role: string;
  organizationId: string;
  /**
   * Indicates if user must change password on next action.
   * True for new users created by Domain Managers (M8: Gestão de Domínios).
   */
  mustChangePassword: boolean;
}
