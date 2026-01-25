import { Injectable, ExecutionContext } from '@nestjs/common';
import { ThrottlerGuard, ThrottlerException } from '@nestjs/throttler';
import { Request } from 'express';
import { ApiPlan } from '../../entities/user.entity';
import { ApiKeyGuard } from './api-key.guard';

interface RequestWithApiUser extends Request {
  user?: { id: string; apiPlan?: ApiPlan };
  apiPlan?: ApiPlan;
}

/**
 * API Key Throttler Guard
 *
 * Enforces rate limiting for Public API based on subscription plan.
 * Extends ThrottlerGuard to use user ID + plan-specific quotas.
 *
 * Rate Limits:
 * - FREE: 100 requests/month
 * - PRO: 5,000 requests/month
 * - ENTERPRISE: Unlimited (999,999 req/month placeholder)
 *
 * Implementation:
 * - Uses user ID as tracker key (not IP)
 * - Dynamically adjusts limit based on API plan
 * - Tracks monthly quota (TTL: 30 days)
 * - Returns 429 with X-RateLimit headers when exceeded
 *
 * Usage:
 * ```typescript
 * @Controller('api/v1/prices')
 * @UseGuards(ApiKeyGuard, ApiKeyThrottlerGuard)
 * export class PublicPricesController { ... }
 * ```
 *
 * Part of M13: Market Intelligence - Public API (#1686)
 *
 * @see ApiKeyGuard
 * @see Issue #1686
 */
@Injectable()
export class ApiKeyThrottlerGuard extends ThrottlerGuard {
  /**
   * Generate tracker key based on user ID from API Key auth
   */
  protected async getTracker(req: Request): Promise<string> {
    const reqWithUser = req as RequestWithApiUser;
    const user = reqWithUser.user;

    // Priority 1: User ID from API Key authentication
    if (user && user.id) {
      return `api-user-${user.id}`;
    }

    // Fallback to IP if no user (should not happen with ApiKeyGuard)
    if (req.ip) {
      return `api-ip-${req.ip}`;
    }

    return 'api-unknown';
  }

  /**
   * Get rate limit for current request based on API plan
   */
  protected async getLimit(
    _context: ExecutionContext,
    _throttler: string,
  ): Promise<number> {
    const req = _context.switchToHttp().getRequest() as RequestWithApiUser;
    const apiPlan = req.apiPlan || ApiPlan.FREE;

    return ApiKeyGuard.getQuotaForPlan(apiPlan);
  }

  /**
   * Get TTL (time window) for rate limiting
   * Using monthly quota: 30 days = 2,592,000,000 ms
   */
  protected async getTtl(_context: ExecutionContext): Promise<number> {
    return 30 * 24 * 60 * 60 * 1000; // 30 days in milliseconds
  }

  /**
   * Throw custom exception when rate limit exceeded
   */
  protected async throwThrottlingException(
    context: ExecutionContext,
  ): Promise<void> {
    const req = context.switchToHttp().getRequest() as RequestWithApiUser;
    const apiPlan = req.apiPlan || ApiPlan.FREE;
    const limit = ApiKeyGuard.getQuotaForPlan(apiPlan);

    const planNames: Record<ApiPlan, string> = {
      [ApiPlan.FREE]: 'Free',
      [ApiPlan.PRO]: 'Pro',
      [ApiPlan.ENTERPRISE]: 'Enterprise',
    };

    throw new ThrottlerException(
      `API quota exceeded. Plan: ${planNames[apiPlan]} (${limit} requests/month). ` +
        'Upgrade your plan or wait for quota reset at the start of next month.',
    );
  }
}
