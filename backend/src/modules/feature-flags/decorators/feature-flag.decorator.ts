import { SetMetadata } from '@nestjs/common';
import { FeatureFlag } from '../feature-flags.types';

/**
 * Metadata key for feature flag requirements
 */
export const FEATURE_FLAG_KEY = 'feature_flag';

/**
 * Decorator to require a feature flag to be enabled for an endpoint
 *
 * Usage:
 * ```typescript
 * @RequireFeatureFlag(FeatureFlag.NEW_DASHBOARD)
 * @Get('dashboard/v2')
 * async getNewDashboard() { ... }
 * ```
 *
 * @see #865 - Feature Flags: Escolha e setup de provider
 */
export const RequireFeatureFlag = (flag: FeatureFlag | string) =>
  SetMetadata(FEATURE_FLAG_KEY, flag);
