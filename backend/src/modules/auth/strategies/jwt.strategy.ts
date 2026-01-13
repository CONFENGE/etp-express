import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../../users/users.service';
import { JwtPayload } from '../types/user.types';
import * as jwt from 'jsonwebtoken';
import { Request } from 'express';

/**
 * Cookie name for JWT authentication token.
 * Must match AUTH_COOKIE_NAME in auth.controller.ts
 */
export const JWT_COOKIE_NAME = 'jwt';

/**
 * Custom JWT extractor that reads from httpOnly cookie.
 *
 * @security
 * - Extracts JWT from httpOnly cookie (not accessible via JavaScript)
 * - Eliminates XSS token theft vulnerability
 * - Fallback to Authorization header for API compatibility
 *
 * @param req - Express request object
 * @returns JWT token string or null if not found
 */
const cookieExtractor = (req: Request): string | null => {
  // Primary: Extract from httpOnly cookie
  if (req?.cookies?.[JWT_COOKIE_NAME]) {
    return req.cookies[JWT_COOKIE_NAME];
  }

  // Fallback: Extract from Authorization header (for Swagger/API testing)
  const authHeader = req?.headers?.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }

  return null;
};

/**
 * JWT authentication strategy with dual-key support for zero-downtime secret rotation.
 *
 * @remarks
 * During secret rotation, this strategy accepts tokens signed with both:
 * - JWT_SECRET (primary/new secret)
 * - JWT_SECRET_OLD (secondary/old secret, temporary during rotation)
 *
 * This allows seamless rotation without invalidating active user sessions.
 *
 * @security
 * - JWT extracted from httpOnly cookie (XSS protection)
 * - Fallback to Bearer token for API compatibility
 *
 * @see docs/SECRET_ROTATION_PROCEDURES.md for rotation procedures
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  private readonly logger = new Logger(JwtStrategy.name);
  private readonly secrets: string[];

  constructor(
    private configService: ConfigService,
    private usersService: UsersService,
  ) {
    // Get all available secrets (primary + fallback)
    const primarySecret = configService.get<string>('JWT_SECRET');
    const oldSecret = configService.get<string>('JWT_SECRET_OLD');

    // Build secrets array (primary first, then old if exists)
    const secrets: string[] = [];
    if (primarySecret) {
      secrets.push(primarySecret);
    }
    if (oldSecret) {
      secrets.push(oldSecret);
    }

    // Use secretOrKeyProvider for dynamic secret validation
    // Extract JWT from httpOnly cookie (primary) or Authorization header (fallback)
    super({
      jwtFromRequest: cookieExtractor,
      ignoreExpiration: false,
      passReqToCallback: true,
      secretOrKeyProvider: (
        _request: Request,
        rawJwtToken: string,
        done: (err: Error | null, secret?: string) => void,
      ) => {
        // Try each secret until one validates
        for (const secret of secrets) {
          try {
            jwt.verify(rawJwtToken, secret);
            return done(null, secret);
          } catch {
            // Token invalid with this secret, try next
            continue;
          }
        }

        // No secret validated the token
        return done(new UnauthorizedException('Token inválido'));
      },
    });

    this.secrets = secrets;

    // Log auth mode on startup
    this.logger.log(
      'JWT Strategy initialized: using httpOnly cookie extraction (with Bearer fallback)',
    );

    // Log dual-key status on startup
    if (oldSecret) {
      this.logger.warn(
        'Dual-key rotation mode active: accepting both JWT_SECRET and JWT_SECRET_OLD',
      );
    }
  }

  /**
   * Validates JWT payload and returns user data.
   *
   * @remarks
   * When passReqToCallback is true, validate receives (req, payload).
   * The request object is available for additional context if needed.
   *
   * Uses findOneWithOrganization() to load organization relation
   * for TenantGuard kill switch validation (MT-04).
   *
   * Demo User Management (#1446): Blocked demo users (isDemoBlocked=true)
   * are allowed to authenticate for read-only access. The isDemoBlocked
   * flag from JWT payload is propagated to request.user for route guards.
   *
   * @param _req - Express request object (unused, but required by passport)
   * @param payload - Decoded JWT payload
   * @returns User data for request context including organization and isDemoBlocked
   * @throws {UnauthorizedException} If user is invalid or inactive (except blocked demo users)
   */
  async validate(_req: Request, payload: JwtPayload) {
    const user = await this.usersService.findOneWithOrganization(payload.sub);

    // Demo User Management (#1446): Allow blocked demo users to login in read-only mode
    // They have role=DEMO and isActive=false after reaching their ETP limit
    const isDemoBlocked = payload.isDemoBlocked ?? false;

    if (!user || (!user.isActive && !isDemoBlocked)) {
      throw new UnauthorizedException('Usuário inválido ou inativo');
    }

    // MT-03: Return organizationId for Multi-Tenancy data isolation
    // MT-04: Include organization for TenantGuard kill switch validation
    // Demo User Management (#1446): Include isDemoBlocked from JWT payload
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      organizationId: user.organizationId,
      organization: user.organization,
      ...(isDemoBlocked && { isDemoBlocked: true }),
    };
  }
}
