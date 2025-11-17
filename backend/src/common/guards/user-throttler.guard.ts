import { Injectable, ExecutionContext } from '@nestjs/common';
import { ThrottlerGuard, ThrottlerException } from '@nestjs/throttler';

/**
 * Custom throttler guard that limits requests by authenticated user ID instead of IP address.
 *
 * @remarks
 * Standard ThrottlerGuard uses IP address as tracker, which allows abuse scenarios:
 * - Multiple users behind same IP (corporate NAT) share the same limit
 * - Single user with multiple IPs can bypass limits
 *
 * This guard extracts user.id from JWT token (injected by JwtAuthGuard) and uses it
 * as the rate limiting tracker.
 *
 * **IMPORTANT**: This guard MUST be used together with JwtAuthGuard, as it relies on
 * request.user being populated by the authentication layer.
 *
 * @example
 * ```typescript
 * @Controller('sections')
 * @UseGuards(JwtAuthGuard)  // REQUIRED: Must come BEFORE UserThrottlerGuard
 * export class SectionsController {
 *   @Post('etp/:etpId/generate')
 *   @UseGuards(UserThrottlerGuard)  // Apply user-based rate limiting
 *   @Throttle(5, 60)  // 5 requests per 60 seconds per user
 *   async generateSection() { ... }
 * }
 * ```
 *
 * @see {@link https://docs.nestjs.com/security/rate-limiting | NestJS Rate Limiting}
 */
@Injectable()
export class UserThrottlerGuard extends ThrottlerGuard {
  /**
   * Extracts the user ID from the authenticated request to use as rate limiting tracker.
   *
   * @param context - Execution context containing HTTP request
   * @returns User ID string from JWT token (request.user.id)
   *
   * @throws {ThrottlerException} If request.user or request.user.id is undefined
   *
   * @remarks
   * This method is called by ThrottlerGuard to determine the unique identifier
   * for rate limiting. It replaces the default IP-based tracking with user ID tracking.
   *
   * If user is not authenticated (missing request.user), throws ThrottlerException
   * to prevent unauthenticated requests from bypassing rate limits.
   */
  protected async getTracker(req: Record<string, any>): Promise<string> {
    // Extract user from request (populated by JwtAuthGuard)
    const user = req.user;

    if (!user || !user.id) {
      // If no user in request, throw error - rate limiting requires authentication
      // This should never happen if JwtAuthGuard is properly configured BEFORE this guard
      throw new ThrottlerException(
        'Rate limiting requer autenticação. Usuário não identificado.',
      );
    }

    // Return user ID as tracker instead of IP address
    return user.id;
  }

  /**
   * Generates the cache key for storing rate limit data.
   *
   * @param context - Execution context
   * @param suffix - Tracker suffix (user ID from getTracker)
   * @param name - Throttler name
   * @returns Cache key string in format: "user-{userId}-{throttlerName}"
   *
   * @remarks
   * This method customizes the cache key to include "user-" prefix for clarity.
   * Default format would be just "{userId}-{throttlerName}".
   *
   * Cache keys are used by ThrottlerStorage to track request counts per time window.
   *
   * @example
   * generateKey(context, "123e4567-e89b-12d3-a456-426614174000", "default") returns:
   * "user-123e4567-e89b-12d3-a456-426614174000-default"
   */
  protected generateKey(
    context: ExecutionContext,
    suffix: string,
    name: string,
  ): string {
    // Format: "user-{userId}-{throttlerName}"
    return `user-${suffix}-${name}`;
  }

  /**
   * Customizes the error message when rate limit is exceeded.
   *
   * @param context - Execution context
   * @returns Custom error message in Portuguese
   *
   * @remarks
   * This method overrides the default English error message with a Portuguese message
   * that provides clear guidance to the user about rate limits and retry timing.
   *
   * The default message would be: "ThrottlerException: Too Many Requests"
   */
  protected async getErrorMessage(context: ExecutionContext): Promise<string> {
    return 'Limite de requisições excedido. Você pode fazer até 5 gerações de seção por minuto. Aguarde alguns segundos e tente novamente.';
  }
}
