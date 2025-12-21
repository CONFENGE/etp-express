import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import {
  FeatureFlag,
  FeatureFlagConfig,
  FeatureFlagContext,
  FeatureFlagEvaluation,
} from './feature-flags.types';

/**
 * Feature Flags Service
 *
 * Redis-based feature flags implementation with fallback to defaults.
 * Provides percentage-based rollouts, user/org targeting, and environment overrides.
 *
 * @see #865 - Feature Flags: Escolha e setup de provider
 * @see #110 - [EPIC] Staged Rollout Strategy
 */
@Injectable()
export class FeatureFlagsService implements OnModuleInit {
  private readonly logger = new Logger(FeatureFlagsService.name);
  private redis: Redis | null = null;
  private readonly redisPrefix = 'ff:';
  private readonly cacheTtlSeconds = 60;

  /** In-memory cache for performance */
  private cache = new Map<string, { value: boolean; expiresAt: number }>();

  /** Default flag configurations */
  private readonly defaults: Record<string, FeatureFlagConfig> = {
    [FeatureFlag.STAGED_ROLLOUT_ALPHA]: {
      key: FeatureFlag.STAGED_ROLLOUT_ALPHA,
      name: 'Staged Rollout - Alpha',
      description: 'Enable features for alpha testers',
      defaultValue: false,
    },
    [FeatureFlag.STAGED_ROLLOUT_BETA]: {
      key: FeatureFlag.STAGED_ROLLOUT_BETA,
      name: 'Staged Rollout - Beta',
      description: 'Enable features for beta users',
      defaultValue: false,
    },
    [FeatureFlag.STAGED_ROLLOUT_GA]: {
      key: FeatureFlag.STAGED_ROLLOUT_GA,
      name: 'Staged Rollout - GA',
      description: 'Enable features for general availability',
      defaultValue: true,
    },
    [FeatureFlag.NEW_DASHBOARD]: {
      key: FeatureFlag.NEW_DASHBOARD,
      name: 'New Dashboard',
      description: 'Enable the new dashboard design',
      defaultValue: false,
    },
    [FeatureFlag.AI_SUGGESTIONS]: {
      key: FeatureFlag.AI_SUGGESTIONS,
      name: 'AI Suggestions',
      description: 'Enable AI-powered suggestions',
      defaultValue: true,
    },
    [FeatureFlag.EXPORT_V2]: {
      key: FeatureFlag.EXPORT_V2,
      name: 'Export V2',
      description: 'Enable new export functionality',
      defaultValue: false,
    },
    [FeatureFlag.ADVANCED_ANALYTICS]: {
      key: FeatureFlag.ADVANCED_ANALYTICS,
      name: 'Advanced Analytics',
      description: 'Enable advanced analytics features',
      defaultValue: false,
    },
  };

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit(): Promise<void> {
    await this.initializeRedis();
  }

  /**
   * Initialize Redis connection
   */
  private async initializeRedis(): Promise<void> {
    try {
      const redisConfig = this.configService.get('redis');

      if (!redisConfig?.host) {
        this.logger.warn(
          'Redis not configured, feature flags will use defaults only',
        );
        return;
      }

      this.redis = new Redis({
        host: redisConfig.host,
        port: redisConfig.port,
        password: redisConfig.password,
        db: redisConfig.db || 0,
        maxRetriesPerRequest: 3,
        retryStrategy: (times: number) => {
          if (times > 3) {
            this.logger.warn('Redis connection failed, using defaults');
            return null; // Stop retrying
          }
          return Math.min(times * 200, 1000);
        },
        lazyConnect: true,
      });

      this.redis.on('error', (err) => {
        this.logger.warn(`Redis error: ${err.message}, using defaults`);
      });

      this.redis.on('connect', () => {
        this.logger.log('Feature flags Redis connected');
      });

      await this.redis.connect();
    } catch (error) {
      this.logger.warn(
        `Failed to connect to Redis: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      this.redis = null;
    }
  }

  /**
   * Check if a feature flag is enabled
   *
   * @param flag - The feature flag to check
   * @param context - Optional context for evaluation
   * @returns Whether the flag is enabled
   */
  async isEnabled(
    flag: FeatureFlag | string,
    context?: FeatureFlagContext,
  ): Promise<boolean> {
    const evaluation = await this.evaluate(flag, context);
    return evaluation.enabled;
  }

  /**
   * Evaluate a feature flag with full context
   *
   * @param flag - The feature flag to evaluate
   * @param context - Optional context for evaluation
   * @returns Full evaluation result
   */
  async evaluate(
    flag: FeatureFlag | string,
    context?: FeatureFlagContext,
  ): Promise<FeatureFlagEvaluation> {
    const key = String(flag);
    const config = this.defaults[key];
    const now = Date.now();

    // Check in-memory cache first
    const cached = this.cache.get(key);
    if (cached && cached.expiresAt > now) {
      return {
        key,
        enabled: cached.value,
        reason: 'redis',
        evaluatedAt: new Date(),
      };
    }

    // Check Redis if available
    if (this.redis) {
      try {
        // Check user-specific override
        if (context?.userId) {
          const userOverride = await this.redis.get(
            `${this.redisPrefix}${key}:user:${context.userId}`,
          );
          if (userOverride !== null) {
            const enabled = userOverride === 'true';
            this.updateCache(key, enabled);
            return {
              key,
              enabled,
              reason: 'user_override',
              evaluatedAt: new Date(),
            };
          }
        }

        // Check organization-specific override
        if (context?.organizationId) {
          const orgOverride = await this.redis.get(
            `${this.redisPrefix}${key}:org:${context.organizationId}`,
          );
          if (orgOverride !== null) {
            const enabled = orgOverride === 'true';
            this.updateCache(key, enabled);
            return {
              key,
              enabled,
              reason: 'org_override',
              evaluatedAt: new Date(),
            };
          }
        }

        // Check global flag value
        const globalValue = await this.redis.get(`${this.redisPrefix}${key}`);
        if (globalValue !== null) {
          const enabled = globalValue === 'true';
          this.updateCache(key, enabled);
          return {
            key,
            enabled,
            reason: 'redis',
            evaluatedAt: new Date(),
          };
        }

        // Check percentage rollout
        const percentage = await this.redis.get(
          `${this.redisPrefix}${key}:percentage`,
        );
        if (percentage !== null) {
          const pct = parseInt(percentage, 10);
          const hash = this.hashString(
            `${key}:${context?.userId || context?.organizationId || 'global'}`,
          );
          const enabled = hash % 100 < pct;
          this.updateCache(key, enabled);
          return {
            key,
            enabled,
            reason: 'percentage',
            evaluatedAt: new Date(),
          };
        }
      } catch (error) {
        this.logger.warn(
          `Redis error evaluating flag ${key}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        );
      }
    }

    // Check environment override
    const env = context?.environment || this.getEnvironment();
    if (config?.environments?.[env] !== undefined) {
      const enabled = config.environments[env];
      return {
        key,
        enabled,
        reason: 'environment',
        evaluatedAt: new Date(),
      };
    }

    // Return default value
    const enabled = config?.defaultValue ?? false;
    return {
      key,
      enabled,
      reason: 'default',
      evaluatedAt: new Date(),
    };
  }

  /**
   * Set a feature flag value
   *
   * @param flag - The feature flag to set
   * @param enabled - Whether to enable the flag
   * @param options - Optional targeting options
   */
  async setFlag(
    flag: FeatureFlag | string,
    enabled: boolean,
    options?: { userId?: string; organizationId?: string; percentage?: number },
  ): Promise<void> {
    const key = String(flag);

    if (!this.redis) {
      this.logger.warn('Redis not available, cannot set flag');
      return;
    }

    try {
      if (options?.userId) {
        await this.redis.set(
          `${this.redisPrefix}${key}:user:${options.userId}`,
          enabled.toString(),
        );
      } else if (options?.organizationId) {
        await this.redis.set(
          `${this.redisPrefix}${key}:org:${options.organizationId}`,
          enabled.toString(),
        );
      } else if (options?.percentage !== undefined) {
        await this.redis.set(
          `${this.redisPrefix}${key}:percentage`,
          options.percentage.toString(),
        );
      } else {
        await this.redis.set(`${this.redisPrefix}${key}`, enabled.toString());
      }

      // Invalidate cache
      this.cache.delete(key);

      this.logger.log(`Feature flag ${key} set to ${enabled}`);
    } catch (error) {
      this.logger.error(
        `Failed to set flag ${key}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw error;
    }
  }

  /**
   * Delete a feature flag override
   *
   * @param flag - The feature flag to delete
   * @param options - Optional targeting options
   */
  async deleteFlag(
    flag: FeatureFlag | string,
    options?: { userId?: string; organizationId?: string },
  ): Promise<void> {
    const key = String(flag);

    if (!this.redis) {
      return;
    }

    try {
      if (options?.userId) {
        await this.redis.del(
          `${this.redisPrefix}${key}:user:${options.userId}`,
        );
      } else if (options?.organizationId) {
        await this.redis.del(
          `${this.redisPrefix}${key}:org:${options.organizationId}`,
        );
      } else {
        await this.redis.del(`${this.redisPrefix}${key}`);
        await this.redis.del(`${this.redisPrefix}${key}:percentage`);
      }

      this.cache.delete(key);
      this.logger.log(`Feature flag ${key} deleted`);
    } catch (error) {
      this.logger.error(
        `Failed to delete flag ${key}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Get all available feature flags with their current state
   */
  async getAllFlags(
    context?: FeatureFlagContext,
  ): Promise<Record<string, boolean>> {
    const flags: Record<string, boolean> = {};

    for (const key of Object.values(FeatureFlag)) {
      flags[key] = await this.isEnabled(key, context);
    }

    return flags;
  }

  /**
   * Get all flag configurations
   */
  getConfigurations(): Record<string, FeatureFlagConfig> {
    return { ...this.defaults };
  }

  /**
   * Check if Redis is available
   */
  isRedisAvailable(): boolean {
    return this.redis?.status === 'ready';
  }

  /**
   * Update in-memory cache
   */
  private updateCache(key: string, value: boolean): void {
    this.cache.set(key, {
      value,
      expiresAt: Date.now() + this.cacheTtlSeconds * 1000,
    });
  }

  /**
   * Get current environment
   */
  private getEnvironment(): 'development' | 'staging' | 'production' {
    const env = this.configService.get<string>('NODE_ENV', 'development');
    if (env === 'production') return 'production';
    if (env === 'staging') return 'staging';
    return 'development';
  }

  /**
   * Simple hash function for percentage-based rollouts
   */
  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash);
  }
}
