import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import {
  runInRequestContext,
  RequestContextData,
} from '../context/request-context';

/**
 * Extended Request interface with requestId
 */
export interface RequestWithId extends Request {
  requestId: string;
}

/**
 * Request ID Middleware (#653)
 *
 * Generates or propagates a unique request identifier for every HTTP request.
 * This enables request tracing and log correlation across the entire call chain.
 *
 * Behavior:
 * 1. Check for existing X-Request-ID header (from load balancers, API gateways)
 * 2. Generate UUID v4 if no header present
 * 3. Attach requestId to request object for easy access
 * 4. Set X-Request-ID response header for client correlation
 * 5. Establish AsyncLocalStorage context for the entire request lifecycle
 *
 * The request ID can be accessed from anywhere in the code:
 * ```typescript
 * import { getRequestId } from '../context/request-context';
 * const requestId = getRequestId();
 * ```
 *
 * @example Response headers
 * ```
 * HTTP/1.1 200 OK
 * X-Request-ID: 550e8400-e29b-41d4-a716-446655440000
 * ```
 *
 * @see https://docs.nestjs.com/middleware
 */
@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  use(req: RequestWithId, res: Response, next: NextFunction): void {
    // Accept request ID from external sources (load balancers, API gateways)
    // or generate a new UUID v4
    const requestId = this.extractRequestId(req) || uuidv4();

    // Attach to request object for easy access in controllers/services
    req.requestId = requestId;

    // Set response header for client-side correlation
    res.setHeader('X-Request-ID', requestId);

    // Create request context for AsyncLocalStorage propagation
    const context: RequestContextData = {
      requestId,
      startTime: Date.now(),
    };

    // Run the rest of the request in the context
    // This makes requestId available throughout the entire async call chain
    runInRequestContext(context, () => {
      next();
    });
  }

  /**
   * Extract request ID from incoming request headers
   * Supports multiple header formats used by different proxies/load balancers
   *
   * Supported headers (in order of priority):
   * - X-Request-ID (standard)
   * - X-Correlation-ID (AWS ALB, some APM tools)
   * - X-Trace-ID (some tracing systems)
   */
  private extractRequestId(req: Request): string | undefined {
    const headers = ['x-request-id', 'x-correlation-id', 'x-trace-id'];

    for (const header of headers) {
      const value = req.get(header);
      if (value && this.isValidRequestId(value)) {
        return value;
      }
    }

    return undefined;
  }

  /**
   * Validate that a request ID is safe to use
   * Prevents injection attacks and ensures reasonable length
   */
  private isValidRequestId(id: string): boolean {
    // Must be alphanumeric with dashes (UUID format or similar)
    // Max 64 chars to prevent log injection
    const validPattern = /^[a-zA-Z0-9-_]{1,64}$/;
    return validPattern.test(id);
  }
}
