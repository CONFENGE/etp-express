import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { UserRole } from '../../../entities/user.entity';

/**
 * Guard that restricts access to SYSTEM_ADMIN role only.
 *
 * This guard is specifically designed for System Administrator operations
 * in M8: Gestão de Domínios Institucionais.
 *
 * @remarks
 * Unlike the generic RolesGuard, this guard:
 * - Is stricter (only SYSTEM_ADMIN, no fallback)
 * - Provides a specific error message for unauthorized access
 * - Can be used at controller or method level
 *
 * @example
 * ```typescript
 * @Controller('system-admin')
 * @UseGuards(JwtAuthGuard, SystemAdminGuard)
 * export class SystemAdminController {
 *   // All endpoints require SYSTEM_ADMIN role
 * }
 * ```
 */
@Injectable()
export class SystemAdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('Access denied: Authentication required');
    }

    if (user.role !== UserRole.SYSTEM_ADMIN) {
      throw new ForbiddenException(
        'Access denied: Only System Administrators can access this resource',
      );
    }

    return true;
  }
}
