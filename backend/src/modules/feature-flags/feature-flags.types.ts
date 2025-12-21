/**
 * Feature Flags Types
 *
 * Type definitions for the feature flags system.
 * @see #865 - Feature Flags: Escolha e setup de provider
 */

/**
 * Available feature flags in the system.
 * Add new flags here as they are needed.
 */
export enum FeatureFlag {
  // Staged rollout flags (#110)
  STAGED_ROLLOUT_ALPHA = 'staged_rollout_alpha',
  STAGED_ROLLOUT_BETA = 'staged_rollout_beta',
  STAGED_ROLLOUT_GA = 'staged_rollout_ga',

  // Feature-specific flags (add as needed)
  NEW_DASHBOARD = 'new_dashboard',
  AI_SUGGESTIONS = 'ai_suggestions',
  EXPORT_V2 = 'export_v2',
  ADVANCED_ANALYTICS = 'advanced_analytics',
}

/**
 * Feature flag configuration
 */
export interface FeatureFlagConfig {
  /** Unique flag key */
  key: string;

  /** Human-readable name */
  name: string;

  /** Description of what this flag controls */
  description: string;

  /** Whether the flag is enabled by default */
  defaultValue: boolean;

  /** Percentage of users to enable (0-100), overrides defaultValue */
  percentage?: number;

  /** Specific user IDs for which this flag is enabled */
  enabledForUsers?: string[];

  /** Specific organization IDs for which this flag is enabled */
  enabledForOrganizations?: string[];

  /** Environment-specific overrides */
  environments?: {
    development?: boolean;
    staging?: boolean;
    production?: boolean;
  };
}

/**
 * Context for evaluating feature flags
 */
export interface FeatureFlagContext {
  /** User ID (if authenticated) */
  userId?: string;

  /** Organization ID (for multi-tenant flags) */
  organizationId?: string;

  /** Current environment */
  environment?: 'development' | 'staging' | 'production';

  /** Additional custom attributes for targeting */
  attributes?: Record<string, string | number | boolean>;
}

/**
 * Result of a feature flag evaluation
 */
export interface FeatureFlagEvaluation {
  /** Flag key that was evaluated */
  key: string;

  /** Whether the flag is enabled */
  enabled: boolean;

  /** Reason for the evaluation result */
  reason:
    | 'default'
    | 'cache'
    | 'user_override'
    | 'org_override'
    | 'percentage'
    | 'environment'
    | 'redis';

  /** Timestamp of evaluation */
  evaluatedAt: Date;
}

/**
 * Feature flag module options
 */
export interface FeatureFlagsModuleOptions {
  /** Redis key prefix for feature flags */
  redisPrefix?: string;

  /** Default flags configuration */
  defaults?: Partial<Record<FeatureFlag, FeatureFlagConfig>>;

  /** Cache TTL in seconds */
  cacheTtlSeconds?: number;
}
