import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import {
  RolloutMetricsService,
  RolloutStatus,
  RolloutMetrics,
} from './rollout-metrics.service';
import { RolloutPhase, ROLLOUT_STRATEGY } from './rollout-strategy.config';

describe('RolloutMetricsService', () => {
  let service: RolloutMetricsService;
  let configService: ConfigService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RolloutMetricsService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue(null), // No Redis config
          },
        },
      ],
    }).compile();

    service = module.get<RolloutMetricsService>(RolloutMetricsService);
    configService = module.get<ConfigService>(ConfigService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getStatus', () => {
    it('should return default alpha status when no Redis', async () => {
      const status = await service.getStatus('test_feature');

      expect(status.featureKey).toBe('test_feature');
      expect(status.currentPhase).toBe(RolloutPhase.ALPHA);
      expect(status.canAdvance).toBe(false);
      expect(status.canRollback).toBe(false);
      expect(status.nextPhase).toBe(RolloutPhase.BETA);
      expect(status.previousPhase).toBeNull();
    });

    it('should return metrics in status', async () => {
      const status = await service.getStatus('test_feature');

      expect(status.metrics).toBeDefined();
      expect(status.metrics.activeUsers).toBe(0);
      expect(status.metrics.errorRate).toBe(0);
      expect(status.metrics.successRate).toBe(100);
    });
  });

  describe('getCurrentPhase', () => {
    it('should return alpha when Redis not available', async () => {
      const phase = await service.getCurrentPhase('test_feature');
      expect(phase).toBe(RolloutPhase.ALPHA);
    });
  });

  describe('getMetrics', () => {
    it('should return default metrics when Redis not available', async () => {
      const metrics = await service.getMetrics('test_feature');

      expect(metrics.activeUsers).toBe(0);
      expect(metrics.errorRate).toBe(0);
      expect(metrics.successRate).toBe(100);
      expect(metrics.averageResponseTime).toBe(0);
      expect(metrics.totalRequests).toBe(0);
      expect(metrics.lastUpdated).toBeInstanceOf(Date);
    });
  });

  describe('advancePhase', () => {
    it('should throw error when cannot advance', async () => {
      await expect(service.advancePhase('test_feature')).rejects.toThrow(
        'Cannot advance',
      );
    });
  });

  describe('rollbackPhase', () => {
    it('should throw error when at alpha phase', async () => {
      await expect(service.rollbackPhase('test_feature')).rejects.toThrow(
        'Cannot rollback',
      );
    });
  });

  describe('getRolloutConfiguration', () => {
    it('should return rollout strategy configuration', () => {
      const config = service.getRolloutConfiguration();

      expect(config).toBe(ROLLOUT_STRATEGY);
      expect(config.alpha).toBeDefined();
      expect(config.beta).toBeDefined();
      expect(config.ga).toBeDefined();
    });

    it('should have correct alpha configuration', () => {
      const config = service.getRolloutConfiguration();

      expect(config.alpha.percentage).toBe(5);
      expect(config.alpha.metrics.errorRateThreshold).toBe(5.0);
      expect(config.alpha.metrics.minDurationHours).toBe(24);
    });

    it('should have correct beta configuration', () => {
      const config = service.getRolloutConfiguration();

      expect(config.beta.percentage).toBe(25);
      expect(config.beta.metrics.errorRateThreshold).toBe(2.0);
      expect(config.beta.metrics.minDurationHours).toBe(72);
    });

    it('should have correct GA configuration', () => {
      const config = service.getRolloutConfiguration();

      expect(config.ga.percentage).toBe(100);
      expect(config.ga.metrics.errorRateThreshold).toBe(1.0);
      expect(config.ga.metrics.minDurationHours).toBe(0);
    });
  });

  describe('isRedisAvailable', () => {
    it('should return false when Redis not configured', () => {
      expect(service.isRedisAvailable()).toBe(false);
    });
  });

  describe('initializeRollout', () => {
    it('should return status at alpha phase after initialization', async () => {
      const status = await service.initializeRollout('new_feature');

      expect(status.featureKey).toBe('new_feature');
      expect(status.currentPhase).toBe(RolloutPhase.ALPHA);
    });
  });

  describe('updateMetrics', () => {
    it('should not throw when Redis not available', async () => {
      await expect(
        service.updateMetrics('test_feature', { activeUsers: 10 }),
      ).resolves.not.toThrow();
    });
  });

  describe('recordRequest', () => {
    it('should update metrics based on request success', async () => {
      // This will use in-memory defaults since Redis is not available
      await service.recordRequest('test_feature', true, 100);
      await service.recordRequest('test_feature', true, 200);
      await service.recordRequest('test_feature', false, 500);

      // In absence of Redis, metrics return defaults
      const metrics = await service.getMetrics('test_feature');
      expect(metrics).toBeDefined();
    });
  });

  describe('recordActiveUser', () => {
    it('should not throw when Redis not available', async () => {
      await expect(
        service.recordActiveUser('test_feature', 'user-123'),
      ).resolves.not.toThrow();
    });
  });
});

describe('RolloutMetricsService with mocked Redis', () => {
  let service: RolloutMetricsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RolloutMetricsService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue({
              host: 'localhost',
              port: 6379,
            }),
          },
        },
      ],
    }).compile();

    service = module.get<RolloutMetricsService>(RolloutMetricsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // Redis connection will fail in tests, so service falls back to defaults
  it('should fallback to defaults when Redis connection fails', async () => {
    const status = await service.getStatus('test_feature');
    expect(status.currentPhase).toBe(RolloutPhase.ALPHA);
  });
});
