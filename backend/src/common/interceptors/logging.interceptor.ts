import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Request, Response } from 'express';
import { WinstonLoggerService } from '../services/winston-logger.service';
import { getRequestId } from '../context/request-context';

/**
 * Extended Request interface with user context
 */
interface AuthenticatedRequest extends Request {
  user?: {
    id?: string;
    organizationId?: string;
  };
}

/**
 * HTTP Logging Interceptor with Structured JSON Output (#652)
 *
 * Logs all HTTP requests and responses in structured JSON format for
 * easy aggregation and analysis in observability tools.
 *
 * Log fields:
 * - timestamp: ISO 8601 format
 * - level: info for success, error for failures
 * - message: Event description
 * - eventType: http_request, http_response, http_error
 * - method: HTTP method (GET, POST, etc.)
 * - path: Request path
 * - statusCode: HTTP status code
 * - durationMs: Request duration in milliseconds
 * - userId: Authenticated user ID (if available)
 * - organizationId: User's organization (if available)
 * - ip: Client IP address
 * - userAgent: Client user agent string
 * - requestId: Unique request identifier for log correlation (#653)
 *
 * @see https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html
 */
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger: WinstonLoggerService;

  constructor() {
    this.logger = new WinstonLoggerService();
    this.logger.setContext('HTTP');
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const ctx = context.switchToHttp();
    const request = ctx.getRequest<AuthenticatedRequest>();
    const response = ctx.getResponse<Response>();
    const { method, url, ip } = request;

    const startTime = Date.now();
    const userAgent = request.get('user-agent') || '';

    // Extract user context if authenticated
    const userId = request.user?.id;
    const organizationId = request.user?.organizationId;

    // Get request ID from AsyncLocalStorage context (#653)
    const requestId = getRequestId();

    // Log incoming request
    this.logger.logRequest({
      method,
      path: url,
      ip: this.sanitizeIp(ip),
      userAgent: this.truncateUserAgent(userAgent),
      userId,
      organizationId,
      requestId,
    });

    return next.handle().pipe(
      tap({
        next: () => {
          const durationMs = Date.now() - startTime;
          const { statusCode } = response;

          // Log successful response
          this.logger.logResponse({
            method,
            path: url,
            statusCode,
            durationMs,
            userId,
            organizationId,
            requestId,
          });
        },
        error: (error: Error & { status?: number }) => {
          const durationMs = Date.now() - startTime;

          // Log error response
          this.logger.logError({
            method,
            path: url,
            durationMs,
            error: error.message,
            stack: error.stack,
            statusCode: error.status,
            userId,
            organizationId,
            requestId,
          });
        },
      }),
    );
  }

  /**
   * Sanitize IP address for logging
   * Removes IPv6 prefix from IPv4 addresses
   */
  private sanitizeIp(ip: string | undefined): string | undefined {
    if (!ip) return undefined;
    // Remove ::ffff: prefix from IPv4 addresses mapped to IPv6
    return ip.replace(/^::ffff:/, '');
  }

  /**
   * Truncate long user agent strings to prevent log bloat
   */
  private truncateUserAgent(userAgent: string): string {
    const maxLength = 200;
    if (userAgent.length > maxLength) {
      return userAgent.substring(0, maxLength) + '...';
    }
    return userAgent;
  }
}
