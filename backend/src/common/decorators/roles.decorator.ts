import { SetMetadata } from '@nestjs/common';
import { UserRole } from '../../entities/user.entity';

export const ROLES_KEY = 'roles';

/**
 * Decorator to specify required roles for a route.
 * Used in conjunction with RolesGuard to enforce role-based access control.
 *
 * @param roles - Array of UserRole values required to access the route
 *
 * @example
 * ```typescript
 * @Roles(UserRole.ADMIN)
 * @Post('organizations')
 * async createOrganization() {
 *   // Only accessible by ADMIN users
 * }
 * ```
 *
 * @example
 * ```typescript
 * @Roles(UserRole.ADMIN, UserRole.USER)
 * @Get('dashboard')
 * async getDashboard() {
 *   // Accessible by ADMIN or USER (but not VIEWER)
 * }
 * ```
 */
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);
