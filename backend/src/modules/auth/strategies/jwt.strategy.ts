import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../../users/users.service';
import { JwtPayload } from '../types/user.types';
import * as jwt from 'jsonwebtoken';
import { Request } from 'express';

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
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKeyProvider: (
        request: Request,
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

    // Log dual-key status on startup
    if (oldSecret) {
      this.logger.warn(
        'Dual-key rotation mode active: accepting both JWT_SECRET and JWT_SECRET_OLD',
      );
    }
  }

  async validate(payload: JwtPayload) {
    const user = await this.usersService.findOne(payload.sub);

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Usuário inválido ou inativo');
    }

    // MT-03: Return organizationId for Multi-Tenancy data isolation
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      organizationId: user.organizationId,
    };
  }
}
