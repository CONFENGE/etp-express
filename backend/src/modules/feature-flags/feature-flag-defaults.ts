/**
 * Centralized Feature Flag Defaults (SYS-08)
 *
 * Single source of truth for all feature flag default configurations.
 * Any new feature flag MUST be:
 * 1. Added to the FeatureFlag enum in feature-flags.types.ts
 * 2. Given a default configuration in FEATURE_FLAG_DEFAULTS below
 *
 * This prevents scattered defaults across the codebase and ensures
 * type-safe, documented flag definitions.
 *
 * @see #865 - Feature Flags: Escolha e setup de provider
 * @see #110 - [EPIC] Staged Rollout Strategy
 * @see TD-009.3 SYS-08 - Centralize feature flags defaults
 */

import { FeatureFlag, FeatureFlagConfig } from './feature-flags.types';

/**
 * Type alias for the feature flag defaults record.
 * Enforces that every FeatureFlag enum value has a corresponding config.
 */
export type FeatureFlagDefaults = Record<FeatureFlag, FeatureFlagConfig>;

/**
 * Centralized default configurations for all feature flags.
 *
 * Each flag MUST have:
 * - key: Matches the FeatureFlag enum value
 * - name: Human-readable name for admin UI
 * - description: What this flag controls
 * - defaultValue: Whether the flag is enabled when no Redis override exists
 *
 * Optional fields:
 * - percentage: Percentage-based rollout (0-100)
 * - enabledForUsers: Specific user IDs to enable for
 * - enabledForOrganizations: Specific org IDs to enable for
 * - environments: Per-environment overrides (development/staging/production)
 */
export const FEATURE_FLAG_DEFAULTS: FeatureFlagDefaults = {
  // ============================
  // Staged Rollout Flags (#110)
  // ============================
  [FeatureFlag.STAGED_ROLLOUT_ALPHA]: {
    key: FeatureFlag.STAGED_ROLLOUT_ALPHA,
    name: 'Staged Rollout - Alpha',
    description: 'Enable features for alpha testers (internal team, QA)',
    defaultValue: false,
  },
  [FeatureFlag.STAGED_ROLLOUT_BETA]: {
    key: FeatureFlag.STAGED_ROLLOUT_BETA,
    name: 'Staged Rollout - Beta',
    description: 'Enable features for beta users (early adopters, partners)',
    defaultValue: false,
  },
  [FeatureFlag.STAGED_ROLLOUT_GA]: {
    key: FeatureFlag.STAGED_ROLLOUT_GA,
    name: 'Staged Rollout - GA',
    description: 'Enable features for general availability (all users)',
    defaultValue: true,
  },

  // ============================
  // Feature-Specific Flags
  // ============================
  [FeatureFlag.NEW_DASHBOARD]: {
    key: FeatureFlag.NEW_DASHBOARD,
    name: 'New Dashboard',
    description: 'Enable the redesigned dashboard experience',
    defaultValue: false,
  },
  [FeatureFlag.AI_SUGGESTIONS]: {
    key: FeatureFlag.AI_SUGGESTIONS,
    name: 'AI Suggestions',
    description: 'Enable AI-powered content suggestions during ETP editing',
    defaultValue: true,
  },
  [FeatureFlag.EXPORT_V2]: {
    key: FeatureFlag.EXPORT_V2,
    name: 'Export V2',
    description: 'Enable new export functionality with enhanced formatting',
    defaultValue: false,
  },
  [FeatureFlag.ADVANCED_ANALYTICS]: {
    key: FeatureFlag.ADVANCED_ANALYTICS,
    name: 'Advanced Analytics',
    description: 'Enable advanced analytics dashboard and metrics',
    defaultValue: false,
  },
};

/**
 * Get the default configuration for a specific flag.
 *
 * @param flag - The feature flag to look up
 * @returns The flag configuration, or undefined if not found
 */
export function getFeatureFlagDefault(
  flag: FeatureFlag | string,
): FeatureFlagConfig | undefined {
  return FEATURE_FLAG_DEFAULTS[flag as FeatureFlag];
}

/**
 * Get the default value for a specific flag.
 *
 * @param flag - The feature flag to look up
 * @returns The default boolean value (false if flag not found)
 */
export function getFeatureFlagDefaultValue(
  flag: FeatureFlag | string,
): boolean {
  return FEATURE_FLAG_DEFAULTS[flag as FeatureFlag]?.defaultValue ?? false;
}
