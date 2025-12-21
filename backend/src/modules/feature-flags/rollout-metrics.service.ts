import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import {
  RolloutPhase,
  ROLLOUT_STRATEGY,
  getNextPhase,
  getPreviousPhase,
  getPhaseConfig,
  canAdvancePhase,
} from './rollout-strategy.config';

/**
 * Rollout status for a feature
 */
export interface RolloutStatus {
  featureKey: string;
  currentPhase: RolloutPhase;
  phaseStartedAt: Date;
  phaseDurationHours: number;
  metrics: RolloutMetrics;
  canAdvance: boolean;
  canRollback: boolean;
  nextPhase: RolloutPhase | null;
  previousPhase: RolloutPhase | null;
}

/**
 * Rollout metrics for a feature
 */
export interface RolloutMetrics {
  activeUsers: number;
  errorRate: number;
  successRate: number;
  averageResponseTime: number;
  totalRequests: number;
  lastUpdated: Date;
}

/**
 * Rollout Metrics Service
 *
 * Tracks and manages rollout phase progression metrics.
 * Uses Redis for persistence and caching.
 *
 * @see #867 - Staged Rollout: Estrategia Alpha/Beta/GA
 * @see #110 - [EPIC] Staged Rollout Strategy
 */
@Injectable()
export class RolloutMetricsService {
  private readonly logger = new Logger(RolloutMetricsService.name);
  private redis: Redis | null = null;
  private readonly redisPrefix = 'rollout:';

  constructor(private readonly configService: ConfigService) {}

  /**
   * Initialize Redis connection
   */
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
          'Redis not configured, rollout metrics will use in-memory storage only',
        );
        return;
      }

      this.redis = new Redis({
        host: redisConfig.host,
        port: redisConfig.port,
        password: redisConfig.password,
        db: redisConfig.db || 0,
        maxRetriesPerRequest: 3,
        lazyConnect: true,
      });

      this.redis.on('error', (err) => {
        this.logger.warn(`Redis error: ${err.message}`);
      });

      await this.redis.connect();
      this.logger.log('Rollout metrics Redis connected');
    } catch (error) {
      this.logger.warn(
        `Failed to connect to Redis: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      this.redis = null;
    }
  }

  /**
   * Get the current rollout status for a feature
   *
   * @param featureKey - Feature key to check
   * @returns Current rollout status
   */
  async getStatus(featureKey: string): Promise<RolloutStatus> {
    const phase = await this.getCurrentPhase(featureKey);
    const phaseStartedAt = await this.getPhaseStartTime(featureKey);
    const phaseDurationHours = this.calculateDurationHours(phaseStartedAt);
    const metrics = await this.getMetrics(featureKey);

    const phaseConfig = getPhaseConfig(phase);
    const canAdvance = canAdvancePhase(phase, {
      errorRateThreshold: metrics.errorRate,
      minDurationHours: phaseDurationHours,
      minActiveUsers: metrics.activeUsers,
    });

    return {
      featureKey,
      currentPhase: phase,
      phaseStartedAt,
      phaseDurationHours,
      metrics,
      canAdvance: canAdvance && phase !== RolloutPhase.GA,
      canRollback: phase !== RolloutPhase.ALPHA,
      nextPhase: getNextPhase(phase),
      previousPhase: getPreviousPhase(phase),
    };
  }

  /**
   * Get the current phase for a feature
   *
   * @param featureKey - Feature key
   * @returns Current rollout phase
   */
  async getCurrentPhase(featureKey: string): Promise<RolloutPhase> {
    if (!this.redis) {
      return RolloutPhase.ALPHA;
    }

    const phase = await this.redis.get(
      `${this.redisPrefix}${featureKey}:phase`,
    );
    if (phase && Object.values(RolloutPhase).includes(phase as RolloutPhase)) {
      return phase as RolloutPhase;
    }

    return RolloutPhase.ALPHA;
  }

  /**
   * Get the phase start time for a feature
   *
   * @param featureKey - Feature key
   * @returns Phase start time
   */
  private async getPhaseStartTime(featureKey: string): Promise<Date> {
    if (!this.redis) {
      return new Date();
    }

    const startTime = await this.redis.get(
      `${this.redisPrefix}${featureKey}:phase_started_at`,
    );
    if (startTime) {
      return new Date(parseInt(startTime, 10));
    }

    return new Date();
  }

  /**
   * Calculate duration in hours since a given time
   *
   * @param startTime - Start time
   * @returns Duration in hours
   */
  private calculateDurationHours(startTime: Date): number {
    const now = new Date();
    const diffMs = now.getTime() - startTime.getTime();
    return Math.floor(diffMs / (1000 * 60 * 60));
  }

  /**
   * Get metrics for a feature
   *
   * @param featureKey - Feature key
   * @returns Rollout metrics
   */
  async getMetrics(featureKey: string): Promise<RolloutMetrics> {
    if (!this.redis) {
      return this.getDefaultMetrics();
    }

    const metricsJson = await this.redis.get(
      `${this.redisPrefix}${featureKey}:metrics`,
    );
    if (metricsJson) {
      try {
        const parsed = JSON.parse(metricsJson);
        return {
          ...parsed,
          lastUpdated: new Date(parsed.lastUpdated),
        };
      } catch {
        return this.getDefaultMetrics();
      }
    }

    return this.getDefaultMetrics();
  }

  /**
   * Get default metrics
   */
  private getDefaultMetrics(): RolloutMetrics {
    return {
      activeUsers: 0,
      errorRate: 0,
      successRate: 100,
      averageResponseTime: 0,
      totalRequests: 0,
      lastUpdated: new Date(),
    };
  }

  /**
   * Update metrics for a feature
   *
   * @param featureKey - Feature key
   * @param metrics - Partial metrics to update
   */
  async updateMetrics(
    featureKey: string,
    metrics: Partial<RolloutMetrics>,
  ): Promise<void> {
    if (!this.redis) {
      this.logger.warn('Redis not available, cannot update metrics');
      return;
    }

    const currentMetrics = await this.getMetrics(featureKey);
    const updatedMetrics: RolloutMetrics = {
      ...currentMetrics,
      ...metrics,
      lastUpdated: new Date(),
    };

    await this.redis.set(
      `${this.redisPrefix}${featureKey}:metrics`,
      JSON.stringify(updatedMetrics),
    );

    this.logger.debug(`Updated metrics for ${featureKey}`);
  }

  /**
   * Advance a feature to the next rollout phase
   *
   * @param featureKey - Feature key
   * @returns New rollout status
   * @throws Error if cannot advance
   */
  async advancePhase(featureKey: string): Promise<RolloutStatus> {
    const status = await this.getStatus(featureKey);

    if (!status.canAdvance) {
      throw new Error(
        `Cannot advance ${featureKey} from ${status.currentPhase}: metrics not met or already at GA`,
      );
    }

    const nextPhase = status.nextPhase!;
    await this.setPhase(featureKey, nextPhase);

    this.logger.log(
      `Advanced ${featureKey} from ${status.currentPhase} to ${nextPhase}`,
    );

    return this.getStatus(featureKey);
  }

  /**
   * Rollback a feature to the previous rollout phase
   *
   * @param featureKey - Feature key
   * @returns New rollout status
   * @throws Error if cannot rollback
   */
  async rollbackPhase(featureKey: string): Promise<RolloutStatus> {
    const status = await this.getStatus(featureKey);

    if (!status.canRollback) {
      throw new Error(
        `Cannot rollback ${featureKey} from ${status.currentPhase}: already at Alpha`,
      );
    }

    const previousPhase = status.previousPhase!;
    await this.setPhase(featureKey, previousPhase);

    this.logger.warn(
      `Rolled back ${featureKey} from ${status.currentPhase} to ${previousPhase}`,
    );

    return this.getStatus(featureKey);
  }

  /**
   * Set the current phase for a feature
   *
   * @param featureKey - Feature key
   * @param phase - New phase
   */
  async setPhase(featureKey: string, phase: RolloutPhase): Promise<void> {
    if (!this.redis) {
      this.logger.warn('Redis not available, cannot set phase');
      return;
    }

    const now = Date.now();
    await this.redis.set(`${this.redisPrefix}${featureKey}:phase`, phase);
    await this.redis.set(
      `${this.redisPrefix}${featureKey}:phase_started_at`,
      now.toString(),
    );

    this.logger.log(`Set ${featureKey} phase to ${phase}`);
  }

  /**
   * Initialize a new feature rollout
   *
   * @param featureKey - Feature key
   * @returns Initial rollout status
   */
  async initializeRollout(featureKey: string): Promise<RolloutStatus> {
    await this.setPhase(featureKey, RolloutPhase.ALPHA);
    await this.updateMetrics(featureKey, this.getDefaultMetrics());

    this.logger.log(`Initialized rollout for ${featureKey}`);

    return this.getStatus(featureKey);
  }

  /**
   * Get rollout configuration for display
   */
  getRolloutConfiguration(): typeof ROLLOUT_STRATEGY {
    return ROLLOUT_STRATEGY;
  }

  /**
   * Record a request for metrics tracking
   *
   * @param featureKey - Feature key
   * @param success - Whether the request was successful
   * @param responseTime - Response time in ms
   */
  async recordRequest(
    featureKey: string,
    success: boolean,
    responseTime: number,
  ): Promise<void> {
    const metrics = await this.getMetrics(featureKey);

    const totalRequests = metrics.totalRequests + 1;
    const successfulRequests = success
      ? Math.round((metrics.successRate / 100) * metrics.totalRequests) + 1
      : Math.round((metrics.successRate / 100) * metrics.totalRequests);

    const successRate = (successfulRequests / totalRequests) * 100;
    const errorRate = 100 - successRate;

    const averageResponseTime =
      (metrics.averageResponseTime * metrics.totalRequests + responseTime) /
      totalRequests;

    await this.updateMetrics(featureKey, {
      totalRequests,
      successRate,
      errorRate,
      averageResponseTime,
    });
  }

  /**
   * Record an active user
   *
   * @param featureKey - Feature key
   * @param userId - User ID
   */
  async recordActiveUser(featureKey: string, userId: string): Promise<void> {
    if (!this.redis) {
      return;
    }

    const key = `${this.redisPrefix}${featureKey}:active_users`;
    await this.redis.sadd(key, userId);
    await this.redis.expire(key, 24 * 60 * 60); // 24 hours TTL

    const count = await this.redis.scard(key);
    await this.updateMetrics(featureKey, { activeUsers: count });
  }

  /**
   * Check if Redis is available
   */
  isRedisAvailable(): boolean {
    return this.redis?.status === 'ready';
  }
}
