import {
 Injectable,
 CanActivate,
 ExecutionContext,
 ForbiddenException,
 Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { AuditService } from '../../modules/audit/audit.service';

/**
 * TenantGuard - Kill Switch for Multi-Tenancy B2G (MT-04).
 *
 * Blocks all users from suspended organizations (organization.isActive = false).
 * Applied globally to all routes except those marked with @Public().
 *
 * Execution order (configured in app.module.ts):
 * 1. JwtAuthGuard - Authenticates user and populates request.user
 * 2. TenantGuard - Checks if user's organization is active
 * 3. RolesGuard - Checks if user has required role(s)
 *
 * @remarks
 * - Returns 403 Forbidden if organization is suspended
 * - Logs all blocked access attempts via AuditService.logTenantBlocked()
 * - Skips check for @Public() routes (login, register, health checks)
 * - User entity must have eager-loaded organization relation for this guard to work
 *
 * @example
 * Organization suspended:
 * - User from suspended org tries to access /etps
 * - TenantGuard detects organization.isActive = false
 * - Returns 403 with message: "Access denied: Your organization has been suspended. Contact support."
 * - Logs event to audit_logs table
 *
 * Organization reactivated:
 * - Admin calls PATCH /organizations/:id/reactivate
 * - organization.isActive = true
 * - Users from this org can access platform again
 */
@Injectable()
export class TenantGuard implements CanActivate {
 private readonly logger = new Logger(TenantGuard.name);

 constructor(
 private reflector: Reflector,
 private auditService: AuditService,
 ) {}

 async canActivate(context: ExecutionContext): Promise<boolean> {
 // Skip tenant check for public routes (login, register, health)
 const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
 context.getHandler(),
 context.getClass(),
 ]);

 if (isPublic) {
 return true;
 }

 // Extract user from request (populated by JwtAuthGuard)
 const request = context.switchToHttp().getRequest();
 const user = request.user;

 // If no user, allow (JwtAuthGuard will handle authentication)
 if (!user) {
 return true;
 }

 // Check if user's organization is active
 if (!user.organization) {
 this.logger.error(
 `User ${user.id} has no organization relation (eager loading failed?)`,
 );
 throw new ForbiddenException(
 'Access denied: Organization information unavailable',
 );
 }

 // KILL SWITCH: Block if organization is suspended
 if (!user.organization.isActive) {
 // Log blocked access attempt (audit trail)
 await this.auditService.logTenantBlocked(user.id, {
 organizationId: user.organization.id,
 organizationName: user.organization.name,
 ip: request.ip,
 userAgent: request.headers['user-agent'],
 route: request.url,
 method: request.method,
 });

 this.logger.warn(
 `Tenant access BLOCKED: User ${user.id} (${user.email}) from suspended organization ${user.organization.name} attempted to access ${request.method} ${request.url}`,
 );

 throw new ForbiddenException(
 'Access denied: Your organization has been suspended. Contact support.',
 );
 }

 // Organization is active - allow access
 return true;
 }
}
