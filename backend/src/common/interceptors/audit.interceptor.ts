import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { AuditService } from '../../modules/audit/audit.service';

/**
 * Interceptor for auditing access to personal data (LGPD Art. 37, Art. 50)
 *
 * @remarks
 * This interceptor logs access to sensitive resources for LGPD compliance.
 * It tracks who accessed what data, when, and from where.
 *
 * Resources tracked:
 * - User profile access (GET /users/me, GET /auth/me)
 * - User data exports
 * - ETP access and modifications
 *
 * @example
 * ```ts
 * @UseInterceptors(AuditInterceptor)
 * @Get('me')
 * async getProfile(@CurrentUser() user: User) { ... }
 * ```
 */
@Injectable()
export class AuditInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AuditInterceptor.name);

  constructor(private readonly auditService: AuditService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const method = request.method;
    const url = request.url;
    const ip = request.ip || request.headers['x-forwarded-for'];
    const userAgent = request.headers['user-agent'];

    // Skip if no authenticated user
    if (!user?.id) {
      return next.handle();
    }

    // Determine if this is a sensitive operation that needs logging
    const sensitivePatterns = this.getSensitivePatterns();
    const matchedPattern = sensitivePatterns.find(
      (pattern) =>
        pattern.method === method && this.matchPath(url, pattern.pathPattern),
    );

    if (!matchedPattern) {
      return next.handle();
    }

    const startTime = Date.now();

    return next.handle().pipe(
      tap({
        next: async () => {
          // Log successful access to sensitive data
          try {
            const resourceId = this.extractResourceId(url, matchedPattern);

            await this.auditService.logDataAccess(
              user.id,
              matchedPattern.resource,
              resourceId || 'self',
              {
                ip,
                userAgent,
                operation: matchedPattern.operation,
              },
            );

            this.logger.debug(
              `Audit logged: ${user.email} ${matchedPattern.operation} ${matchedPattern.resource}:${resourceId || 'self'} (${Date.now() - startTime}ms)`,
            );
          } catch (error) {
            // Don't fail the request if audit logging fails
            this.logger.error(
              `Failed to log audit: ${error instanceof Error ? error.message : 'Unknown error'}`,
            );
          }
        },
        error: async (error) => {
          // Optionally log failed access attempts too
          this.logger.warn(
            `Failed access attempt: ${user.email} ${matchedPattern.operation} ${matchedPattern.resource} - ${error?.message}`,
          );
        },
      }),
    );
  }

  /**
   * Define sensitive paths that need audit logging
   */
  private getSensitivePatterns(): Array<{
    method: string;
    pathPattern: string;
    resource: string;
    operation: string;
  }> {
    return [
      // User profile access
      {
        method: 'GET',
        pathPattern: '/auth/me',
        resource: 'User',
        operation: 'profile_view',
      },
      {
        method: 'GET',
        pathPattern: '/users/me',
        resource: 'User',
        operation: 'profile_view',
      },
      {
        method: 'GET',
        pathPattern: '/users/:id',
        resource: 'User',
        operation: 'profile_view',
      },
      {
        method: 'PATCH',
        pathPattern: '/users/:id',
        resource: 'User',
        operation: 'profile_update',
      },
      {
        method: 'PUT',
        pathPattern: '/users/:id',
        resource: 'User',
        operation: 'profile_update',
      },

      // Data export (LGPD portability)
      {
        method: 'GET',
        pathPattern: '/users/me/export',
        resource: 'User',
        operation: 'data_export',
      },
      {
        method: 'GET',
        pathPattern: '/privacy/export',
        resource: 'User',
        operation: 'data_export',
      },

      // ETP access (contains user-generated content)
      {
        method: 'GET',
        pathPattern: '/etps/:id',
        resource: 'ETP',
        operation: 'read',
      },
      {
        method: 'PATCH',
        pathPattern: '/etps/:id',
        resource: 'ETP',
        operation: 'update',
      },
      {
        method: 'DELETE',
        pathPattern: '/etps/:id',
        resource: 'ETP',
        operation: 'delete',
      },

      // Section access
      {
        method: 'GET',
        pathPattern: '/sections/:id',
        resource: 'Section',
        operation: 'read',
      },
      {
        method: 'PATCH',
        pathPattern: '/sections/:id',
        resource: 'Section',
        operation: 'update',
      },
    ];
  }

  /**
   * Match a URL against a path pattern
   * Supports :param placeholders
   */
  private matchPath(url: string, pattern: string): boolean {
    // Remove query string
    const urlPath = url.split('?')[0];

    // Convert pattern to regex
    const regexPattern = pattern
      .replace(/:[a-zA-Z]+/g, '[^/]+') // Replace :param with regex
      .replace(/\//g, '\\/'); // Escape slashes

    const regex = new RegExp(`^${regexPattern}$`);
    return regex.test(urlPath);
  }

  /**
   * Extract resource ID from URL based on pattern
   */
  private extractResourceId(
    url: string,
    pattern: { pathPattern: string },
  ): string | null {
    const urlParts = url.split('?')[0].split('/');
    const patternParts = pattern.pathPattern.split('/');

    for (let i = 0; i < patternParts.length; i++) {
      if (patternParts[i].startsWith(':')) {
        return urlParts[i] || null;
      }
    }

    return null;
  }
}

/**
 * Custom decorator to mark routes as requiring audit logging
 * Use this for fine-grained control over which routes are audited
 */
export const AUDIT_METADATA_KEY = 'audit:enabled';

export function AuditLog(options?: {
  resource?: string;
  operation?: string;
}): MethodDecorator {
  return (
    target: object,
    propertyKey: string | symbol,
    descriptor: PropertyDescriptor,
  ) => {
    Reflect.defineMetadata(
      AUDIT_METADATA_KEY,
      { enabled: true, ...options },
      descriptor.value,
    );
    return descriptor;
  };
}
