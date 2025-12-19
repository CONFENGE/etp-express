import {
 Injectable,
 CanActivate,
 ExecutionContext,
 ForbiddenException,
} from '@nestjs/common';
import { UserRole } from '../../../entities/user.entity';

/**
 * Guard that restricts access to DOMAIN_MANAGER role only.
 *
 * This guard validates:
 * 1. User is authenticated
 * 2. User has DOMAIN_MANAGER role
 * 3. User has an assigned authorized domain
 *
 * @remarks
 * DOMAIN_MANAGER can only manage users within their assigned domain.
 * The domain validation is performed in the service layer.
 *
 * @see DomainManagerService
 *
 * @example
 * ```typescript
 * @Controller('domain-manager')
 * @UseGuards(JwtAuthGuard, DomainManagerGuard)
 * export class DomainManagerController {
 * // All endpoints require DOMAIN_MANAGER role
 * }
 * ```
 */
@Injectable()
export class DomainManagerGuard implements CanActivate {
 canActivate(context: ExecutionContext): boolean {
 const request = context.switchToHttp().getRequest();
 const user = request.user;

 if (!user) {
 throw new ForbiddenException('Access denied: Authentication required');
 }

 if (user.role !== UserRole.DOMAIN_MANAGER) {
 throw new ForbiddenException(
 'Access denied: Only Domain Managers can access this resource',
 );
 }

 if (!user.authorizedDomainId) {
 throw new ForbiddenException(
 'Access denied: No authorized domain assigned to this manager',
 );
 }

 return true;
 }
}
