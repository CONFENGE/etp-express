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
 *   id: '123',
 *   email: 'user@example.com',
 *   name: 'João Silva',
 *   role: UserRole.USER,
 *   orgao: 'CONFENGE',
 *   cargo: 'Analista',
 *   isActive: true,
 *   lastLoginAt: new Date(),
 *   createdAt: new Date(),
 *   updatedAt: new Date(),
 *   etps: [],
 *   auditLogs: []
 * };
 * ```
 */
export type UserWithoutPassword = Omit<User, 'password'>;
