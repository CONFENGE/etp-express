import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserRole } from '../../entities/user.entity';
import { Etp } from '../../entities/etp.entity';

/**
 * Default ETP limit for demo users.
 */
const DEFAULT_ETP_LIMIT = 3;

/**
 * Guard that enforces ETP creation limit for demo users.
 * Blocks demo users who have reached their etpLimitCount.
 * Part of Demo User Management System (Issue #1442).
 *
 * Features:
 * - Checks if user is a DEMO role
 * - Counts user's current ETPs
 * - Compares against etpLimitCount (default 3)
 * - If limit reached: sets isActive = false and throws ForbiddenException
 * - Non-demo users bypass this guard completely
 *
 * @remarks
 * Apply this guard to ETP creation endpoints (POST /etps).
 * Should be applied AFTER JwtAuthGuard so user is populated in request.
 *
 * @example
 * ```typescript
 * @Post()
 * @UseGuards(DemoUserEtpLimitGuard)
 * async create(@Body() dto: CreateEtpDto) { ... }
 * ```
 */
@Injectable()
export class DemoUserEtpLimitGuard implements CanActivate {
  private readonly logger = new Logger(DemoUserEtpLimitGuard.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Etp)
    private readonly etpRepository: Repository<Etp>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // If no user, allow (JwtAuthGuard will handle authentication)
    if (!user) {
      return true;
    }

    // Only apply to DEMO users
    if (user.role !== UserRole.DEMO) {
      return true;
    }

    // Get current ETP count for this user
    const etpCount = await this.etpRepository.count({
      where: { createdById: user.id },
    });

    // Get the user's ETP limit (default 3)
    const limit = user.etpLimitCount ?? DEFAULT_ETP_LIMIT;

    // Check if user has reached limit
    if (etpCount >= limit) {
      this.logger.warn(
        `Demo user ${user.id} (${user.email}) reached ETP limit: ${etpCount}/${limit}`,
      );

      // Block the user account
      await this.userRepository.update(user.id, { isActive: false });

      this.logger.log(
        `Demo user ${user.id} (${user.email}) account blocked due to ETP limit`,
      );

      throw new ForbiddenException({
        code: 'DEMO_ETP_LIMIT_REACHED',
        message:
          'Limite de ETPs atingido. Sua conta demo está bloqueada para criação.',
        etpCount,
        limit,
      });
    }

    return true;
  }
}
