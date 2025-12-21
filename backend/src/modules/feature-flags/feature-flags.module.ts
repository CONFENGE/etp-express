import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { FeatureFlagsService } from './feature-flags.service';
import { FeatureFlagsController } from './feature-flags.controller';
import { FeatureFlagGuard } from './guards/feature-flag.guard';

/**
 * Feature Flags Module
 *
 * Provides feature flag functionality across the application.
 * Uses Redis for dynamic flag management with fallback to defaults.
 *
 * Features:
 * - Redis-based flag storage (when available)
 * - In-memory caching for performance
 * - Percentage-based rollouts
 * - User and organization targeting
 * - Environment-specific overrides
 * - Decorators and guards for easy integration
 *
 * Usage:
 * ```typescript
 * // In a service
 * const enabled = await this.featureFlagsService.isEnabled(FeatureFlag.NEW_DASHBOARD);
 *
 * // In a controller
 * @RequireFeatureFlag(FeatureFlag.NEW_DASHBOARD)
 * @UseGuards(FeatureFlagGuard)
 * @Get('dashboard/v2')
 * async getNewDashboard() { ... }
 * ```
 *
 * @see #865 - Feature Flags: Escolha e setup de provider
 * @see #110 - [EPIC] Staged Rollout Strategy
 */
@Global()
@Module({
  imports: [ConfigModule],
  controllers: [FeatureFlagsController],
  providers: [FeatureFlagsService, FeatureFlagGuard],
  exports: [FeatureFlagsService, FeatureFlagGuard],
})
export class FeatureFlagsModule {}
