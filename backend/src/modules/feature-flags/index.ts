/**
 * Feature Flags Module Exports
 *
 * @see #865 - Feature Flags: Escolha e setup de provider
 * @see #867 - Staged Rollout: Estrategia Alpha/Beta/GA
 */

export * from './feature-flags.module';
export * from './feature-flags.service';
export * from './feature-flags.types';
export * from './decorators/feature-flag.decorator';
export * from './guards/feature-flag.guard';
export * from './rollout-strategy.config';
export * from './rollout-metrics.service';
