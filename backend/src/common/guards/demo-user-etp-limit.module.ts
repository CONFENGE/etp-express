import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DemoUserEtpLimitGuard } from './demo-user-etp-limit.guard';
import { User } from '../../entities/user.entity';
import { Etp } from '../../entities/etp.entity';

/**
 * Module providing DemoUserEtpLimitGuard with its dependencies.
 * Part of Demo User Management System (Issue #1442).
 *
 * @remarks
 * This module encapsulates the DemoUserEtpLimitGuard and its repository dependencies.
 * Import this module in any feature module that needs to enforce ETP limits for demo users.
 *
 * The guard:
 * - Checks if user is a DEMO role
 * - Counts current ETPs for the user
 * - Blocks creation if limit reached
 * - Auto-blocks user account on limit reached
 *
 * @example
 * ```typescript
 * @Module({
 *   imports: [
 *     DemoUserEtpLimitModule, // Enable DemoUserEtpLimitGuard
 *   ],
 *   controllers: [EtpsController],
 * })
 * export class EtpsModule {}
 * ```
 */
@Module({
  imports: [TypeOrmModule.forFeature([User, Etp])],
  providers: [DemoUserEtpLimitGuard],
  exports: [DemoUserEtpLimitGuard, TypeOrmModule],
})
export class DemoUserEtpLimitModule {}
