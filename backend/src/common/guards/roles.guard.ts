import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { UserRole } from '../../entities/user.entity';

/**
 * Guard that enforces role-based access control.
 * Checks if the authenticated user has one of the required roles.
 *
 * Execution order (configured in app.module.ts):
 * 1. JwtAuthGuard - Authenticates user
 * 2. TenantGuard - Checks if organization is active
 * 3. RolesGuard - Checks if user has required role(s)
 *
 * @remarks
 * - If no @Roles decorator is present, access is granted (default allow)
 * - If @Roles decorator is present, user must have at least one of the specified roles
 * - Compatible with @Public() decorator (skips guard execution for public routes)
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // Get required roles from @Roles decorator
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    // If no roles are specified, allow access (default behavior)
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    // Extract user from request (populated by JwtAuthGuard)
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // If no user, deny access (should never happen after JwtAuthGuard)
    if (!user) {
      return false;
    }

    // Check if user has at least one of the required roles
    return requiredRoles.some((role) => user.role === role);
  }
}
