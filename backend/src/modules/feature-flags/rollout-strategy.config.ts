/**
 * Rollout Strategy Configuration
 *
 * Defines the staged rollout phases (Alpha, Beta, GA) with their
 * criteria, percentage targets, and progression metrics.
 *
 * @see #867 - Staged Rollout: Estrategia Alpha/Beta/GA
 * @see #110 - [EPIC] Staged Rollout Strategy
 */

/**
 * Rollout phase identifiers
 */
export enum RolloutPhase {
  ALPHA = 'alpha',
  BETA = 'beta',
  GA = 'ga',
}

/**
 * Metrics thresholds for phase progression
 */
export interface PhaseMetrics {
  /** Maximum error rate (%) to advance to next phase */
  errorRateThreshold: number;

  /** Minimum hours a feature must be in this phase before advancing */
  minDurationHours: number;

  /** Minimum number of active users before advancing */
  minActiveUsers: number;

  /** Minimum satisfaction score (1-5) from feedback */
  minSatisfactionScore: number;
}

/**
 * Phase configuration
 */
export interface PhaseConfig {
  /** Target percentage of users for this phase */
  percentage: number;

  /** Description of user criteria for this phase */
  criteria: string[];

  /** Metrics thresholds for advancing to next phase */
  metrics: PhaseMetrics;

  /** Related feature flags for this phase */
  featureFlags: string[];
}

/**
 * Complete rollout strategy configuration
 */
export interface RolloutStrategyConfig {
  alpha: PhaseConfig;
  beta: PhaseConfig;
  ga: PhaseConfig;
}

/**
 * Default rollout strategy configuration
 *
 * Alpha: 5% - Internal testers and power users (24h minimum)
 * Beta: 25% - Early adopters with feedback (72h minimum)
 * GA: 100% - All users (stable release)
 */
export const ROLLOUT_STRATEGY: RolloutStrategyConfig = {
  alpha: {
    percentage: 5,
    criteria: [
      'internal_testers',
      'power_users',
      'development_team',
      'qa_team',
    ],
    metrics: {
      errorRateThreshold: 5.0, // Allow 5% error rate in alpha
      minDurationHours: 24,
      minActiveUsers: 10,
      minSatisfactionScore: 3.0,
    },
    featureFlags: ['staged_rollout_alpha'],
  },
  beta: {
    percentage: 25,
    criteria: [
      'early_adopters',
      'feedback_providers',
      'beta_testers',
      'partner_organizations',
    ],
    metrics: {
      errorRateThreshold: 2.0, // Stricter in beta
      minDurationHours: 72,
      minActiveUsers: 50,
      minSatisfactionScore: 3.5,
    },
    featureFlags: ['staged_rollout_beta'],
  },
  ga: {
    percentage: 100,
    criteria: ['all_users'],
    metrics: {
      errorRateThreshold: 1.0, // Very strict in GA
      minDurationHours: 0, // No minimum for GA
      minActiveUsers: 0, // No minimum for GA
      minSatisfactionScore: 0, // No minimum for GA
    },
    featureFlags: ['staged_rollout_ga'],
  },
};

/**
 * Phase progression order
 */
export const PHASE_ORDER: RolloutPhase[] = [
  RolloutPhase.ALPHA,
  RolloutPhase.BETA,
  RolloutPhase.GA,
];

/**
 * Get the next phase in progression
 *
 * @param currentPhase - Current rollout phase
 * @returns Next phase or null if at GA
 */
export function getNextPhase(currentPhase: RolloutPhase): RolloutPhase | null {
  const currentIndex = PHASE_ORDER.indexOf(currentPhase);
  if (currentIndex === -1 || currentIndex >= PHASE_ORDER.length - 1) {
    return null;
  }
  return PHASE_ORDER[currentIndex + 1];
}

/**
 * Get the previous phase for rollback
 *
 * @param currentPhase - Current rollout phase
 * @returns Previous phase or null if at Alpha
 */
export function getPreviousPhase(
  currentPhase: RolloutPhase,
): RolloutPhase | null {
  const currentIndex = PHASE_ORDER.indexOf(currentPhase);
  if (currentIndex <= 0) {
    return null;
  }
  return PHASE_ORDER[currentIndex - 1];
}

/**
 * Get phase configuration
 *
 * @param phase - Rollout phase
 * @returns Phase configuration
 */
export function getPhaseConfig(phase: RolloutPhase): PhaseConfig {
  return ROLLOUT_STRATEGY[phase];
}

/**
 * Check if metrics meet phase requirements for advancement
 *
 * @param phase - Current phase
 * @param metrics - Current metrics
 * @returns Whether metrics meet advancement criteria
 */
export function canAdvancePhase(
  phase: RolloutPhase,
  metrics: Partial<PhaseMetrics>,
): boolean {
  const config = getPhaseConfig(phase);
  const { errorRateThreshold, minDurationHours, minActiveUsers } =
    config.metrics;

  // Check error rate
  if (
    metrics.errorRateThreshold !== undefined &&
    metrics.errorRateThreshold > errorRateThreshold
  ) {
    return false;
  }

  // Check duration (hours spent in phase)
  if (
    metrics.minDurationHours !== undefined &&
    metrics.minDurationHours < minDurationHours
  ) {
    return false;
  }

  // Check active users
  if (
    metrics.minActiveUsers !== undefined &&
    metrics.minActiveUsers < minActiveUsers
  ) {
    return false;
  }

  return true;
}
