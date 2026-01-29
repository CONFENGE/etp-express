import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not, IsNull } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User, ApiPlan } from '../../entities/user.entity';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

/**
 * API Key Authentication Guard
 *
 * Authenticates users via X-API-Key header for public API endpoints.
 * Validates API Key against users table and enforces rate limiting quotas.
 *
 * Rate Limits by Plan:
 * - FREE: 100 requests/month
 * - PRO: 5,000 requests/month
 * - ENTERPRISE: Unlimited
 *
 * Usage:
 * - Applied via @ApiKey() decorator on controllers/endpoints
 * - Bypasses JWT authentication when API Key is provided
 * - Returns 401 if API Key missing/invalid
 * - Returns 429 if quota exceeded (handled by throttler guard)
 *
 * Part of M13: Market Intelligence - Public API (#1686)
 *
 * @see Issue #1686
 * @see PublicPricesController
 */
@Injectable()
export class ApiKeyGuard implements CanActivate {
  private readonly logger = new Logger(ApiKeyGuard.name);

  constructor(
    private reflector: Reflector,
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Check if endpoint is public (allows anonymous access)
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const apiKey = request.headers['x-api-key'];

    if (!apiKey) {
      throw new UnauthorizedException({
        statusCode: 401,
        message: 'API Key is required',
        error: 'Unauthorized',
        details: 'Please provide a valid API Key in the X-API-Key header',
      });
    }

    // TD-001: Dual-read API key validation (hash-first, plaintext fallback)
    const user = await this.validateApiKey(apiKey);

    if (!user) {
      throw new ForbiddenException({
        statusCode: 403,
        message: 'Invalid API Key',
        error: 'Forbidden',
        details: 'The provided API Key is not valid or has been revoked',
      });
    }

    if (!user.isActive) {
      throw new ForbiddenException({
        statusCode: 403,
        message: 'User account is inactive',
        error: 'Forbidden',
        details: 'Your account has been deactivated. Please contact support.',
      });
    }

    // Attach user to request for downstream use (e.g., ApiUsageService)
    request.user = user;

    // Attach API plan to request for rate limiting
    request.apiPlan = user.apiPlan;

    return true;
  }

  /**
   * Validates API key using dual-read strategy (TD-001 Security Hardening).
   * 1. First tries plaintext match (legacy, for transition period)
   * 2. If no plaintext match, tries bcrypt comparison against all hashed keys
   *
   * During transition: both paths work. After migration completes,
   * plaintext column will be removed and only hash comparison will remain.
   */
  private async validateApiKey(
    apiKey: string,
  ): Promise<Pick<
    User,
    'id' | 'email' | 'name' | 'apiPlan' | 'isActive'
  > | null> {
    // Path 1: Try plaintext match (legacy - fast O(1) DB lookup)
    const userByPlaintext = await this.usersRepository.findOne({
      where: { apiKey },
      select: ['id', 'email', 'name', 'apiKey', 'apiPlan', 'isActive'],
    });

    if (userByPlaintext) {
      return userByPlaintext;
    }

    // Path 2: Try hashed key comparison (secure path)
    const usersWithHash = await this.usersRepository.find({
      where: { apiKeyHash: Not(IsNull()) },
      select: ['id', 'email', 'name', 'apiKeyHash', 'apiPlan', 'isActive'],
    });

    for (const user of usersWithHash) {
      if (user.apiKeyHash) {
        const isMatch = await bcrypt.compare(apiKey, user.apiKeyHash);
        if (isMatch) {
          return user;
        }
      }
    }

    return null;
  }

  /**
   * Get monthly quota for a given API plan
   */
  static getQuotaForPlan(plan: ApiPlan): number {
    const quotas: Record<ApiPlan, number> = {
      [ApiPlan.FREE]: 100,
      [ApiPlan.PRO]: 5000,
      [ApiPlan.ENTERPRISE]: Number.MAX_SAFE_INTEGER, // Unlimited
    };

    return quotas[plan] || quotas[ApiPlan.FREE];
  }

  /**
   * Check if quota is exceeded (for 429 Too Many Requests)
   * This is a helper method - actual rate limiting is handled by throttler
   */
  static isQuotaExceeded(usage: number, plan: ApiPlan): boolean {
    const quota = ApiKeyGuard.getQuotaForPlan(plan);
    return usage >= quota;
  }
}
