import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { FeatureFlagsService } from './feature-flags.service';
import { FeatureFlag, FeatureFlagContext } from './feature-flags.types';

/**
 * Feature Flags Service Tests
 *
 * @see #865 - Feature Flags: Escolha e setup de provider
 */
describe('FeatureFlagsService', () => {
  let service: FeatureFlagsService;
  let configService: ConfigService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FeatureFlagsService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, defaultValue?: unknown) => {
              const values: Record<string, unknown> = {
                NODE_ENV: 'test',
                redis: null, // No Redis in tests
              };
              return values[key] ?? defaultValue;
            }),
          },
        },
      ],
    }).compile();

    service = module.get<FeatureFlagsService>(FeatureFlagsService);
    configService = module.get<ConfigService>(ConfigService);

    // Initialize the service
    await service.onModuleInit();
  });

  describe('isEnabled', () => {
    it('should return default value when Redis is not available', async () => {
      // AI_SUGGESTIONS defaults to true
      const result = await service.isEnabled(FeatureFlag.AI_SUGGESTIONS);
      expect(result).toBe(true);

      // NEW_DASHBOARD defaults to false
      const result2 = await service.isEnabled(FeatureFlag.NEW_DASHBOARD);
      expect(result2).toBe(false);
    });

    it('should accept string flag keys', async () => {
      const result = await service.isEnabled('ai_suggestions');
      expect(result).toBe(true);
    });

    it('should return false for unknown flags', async () => {
      const result = await service.isEnabled('unknown_flag');
      expect(result).toBe(false);
    });
  });

  describe('evaluate', () => {
    it('should return full evaluation with reason', async () => {
      const evaluation = await service.evaluate(FeatureFlag.STAGED_ROLLOUT_GA);

      expect(evaluation).toMatchObject({
        key: FeatureFlag.STAGED_ROLLOUT_GA,
        enabled: true,
        reason: 'default',
      });
      expect(evaluation.evaluatedAt).toBeInstanceOf(Date);
    });

    it('should include context in evaluation', async () => {
      const context: FeatureFlagContext = {
        userId: 'user-123',
        organizationId: 'org-456',
      };

      const evaluation = await service.evaluate(
        FeatureFlag.NEW_DASHBOARD,
        context,
      );

      expect(evaluation).toMatchObject({
        key: FeatureFlag.NEW_DASHBOARD,
        enabled: false,
        reason: 'default',
      });
    });
  });

  describe('getAllFlags', () => {
    it('should return all flags with their current state', async () => {
      const flags = await service.getAllFlags();

      expect(flags).toHaveProperty(FeatureFlag.STAGED_ROLLOUT_ALPHA);
      expect(flags).toHaveProperty(FeatureFlag.STAGED_ROLLOUT_BETA);
      expect(flags).toHaveProperty(FeatureFlag.STAGED_ROLLOUT_GA);
      expect(flags).toHaveProperty(FeatureFlag.NEW_DASHBOARD);
      expect(flags).toHaveProperty(FeatureFlag.AI_SUGGESTIONS);
      expect(flags).toHaveProperty(FeatureFlag.EXPORT_V2);
      expect(flags).toHaveProperty(FeatureFlag.ADVANCED_ANALYTICS);
    });

    it('should return boolean values for all flags', async () => {
      const flags = await service.getAllFlags();

      Object.values(flags).forEach((value) => {
        expect(typeof value).toBe('boolean');
      });
    });
  });

  describe('getConfigurations', () => {
    it('should return all flag configurations', () => {
      const configs = service.getConfigurations();

      expect(Object.keys(configs).length).toBeGreaterThan(0);

      // Check structure of a configuration
      const config = configs[FeatureFlag.AI_SUGGESTIONS];
      expect(config).toMatchObject({
        key: FeatureFlag.AI_SUGGESTIONS,
        name: expect.any(String),
        description: expect.any(String),
        defaultValue: expect.any(Boolean),
      });
    });
  });

  describe('isRedisAvailable', () => {
    it('should return false when Redis is not configured', () => {
      expect(service.isRedisAvailable()).toBe(false);
    });
  });

  describe('default flag values', () => {
    it('should have correct defaults for staged rollout flags', async () => {
      expect(await service.isEnabled(FeatureFlag.STAGED_ROLLOUT_ALPHA)).toBe(
        false,
      );
      expect(await service.isEnabled(FeatureFlag.STAGED_ROLLOUT_BETA)).toBe(
        false,
      );
      expect(await service.isEnabled(FeatureFlag.STAGED_ROLLOUT_GA)).toBe(true);
    });

    it('should have correct defaults for feature flags', async () => {
      expect(await service.isEnabled(FeatureFlag.NEW_DASHBOARD)).toBe(false);
      expect(await service.isEnabled(FeatureFlag.AI_SUGGESTIONS)).toBe(true);
      expect(await service.isEnabled(FeatureFlag.EXPORT_V2)).toBe(false);
      expect(await service.isEnabled(FeatureFlag.ADVANCED_ANALYTICS)).toBe(
        false,
      );
    });
  });

  describe('cache behavior', () => {
    it('should cache evaluation results', async () => {
      // First call - should be default
      const result1 = await service.evaluate(FeatureFlag.AI_SUGGESTIONS);
      expect(result1.reason).toBe('default');

      // Second call - would use cache if Redis was available
      const result2 = await service.evaluate(FeatureFlag.AI_SUGGESTIONS);
      expect(result2.enabled).toBe(result1.enabled);
    });
  });

  describe('environment overrides', () => {
    it('should respect environment context in evaluation', async () => {
      const context: FeatureFlagContext = {
        environment: 'production',
      };

      const evaluation = await service.evaluate(
        FeatureFlag.NEW_DASHBOARD,
        context,
      );

      // Without environment override configured, should return default
      expect(evaluation.reason).toBe('default');
    });
  });

  describe('setFlag without Redis', () => {
    it('should warn when setting flag without Redis', async () => {
      const loggerSpy = jest.spyOn(service['logger'], 'warn');

      await service.setFlag(FeatureFlag.NEW_DASHBOARD, true);

      expect(loggerSpy).toHaveBeenCalledWith(
        'Redis not available, cannot set flag',
      );
    });
  });

  describe('deleteFlag without Redis', () => {
    it('should silently return when deleting flag without Redis', async () => {
      // Should not throw
      await expect(
        service.deleteFlag(FeatureFlag.NEW_DASHBOARD),
      ).resolves.toBeUndefined();
    });

    it('should handle user-specific delete without Redis', async () => {
      await expect(
        service.deleteFlag(FeatureFlag.NEW_DASHBOARD, { userId: 'user-123' }),
      ).resolves.toBeUndefined();
    });

    it('should handle org-specific delete without Redis', async () => {
      await expect(
        service.deleteFlag(FeatureFlag.NEW_DASHBOARD, {
          organizationId: 'org-456',
        }),
      ).resolves.toBeUndefined();
    });
  });
});

/**
 * Tests with mocked Redis
 */
describe('FeatureFlagsService with Redis', () => {
  let service: FeatureFlagsService;
  let mockRedis: {
    get: jest.Mock;
    set: jest.Mock;
    del: jest.Mock;
    connect: jest.Mock;
    on: jest.Mock;
    status: string;
  };

  beforeEach(async () => {
    mockRedis = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
      connect: jest.fn().mockResolvedValue(undefined),
      on: jest.fn(),
      status: 'ready',
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FeatureFlagsService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, defaultValue?: unknown) => {
              const values: Record<string, unknown> = {
                NODE_ENV: 'test',
                redis: { host: 'localhost', port: 6379 },
              };
              return values[key] ?? defaultValue;
            }),
          },
        },
      ],
    }).compile();

    service = module.get<FeatureFlagsService>(FeatureFlagsService);

    // Inject mock Redis
    (service as unknown as { redis: typeof mockRedis }).redis = mockRedis;
  });

  describe('evaluate with Redis', () => {
    it('should check user override first', async () => {
      mockRedis.get.mockResolvedValueOnce('true');

      const result = await service.evaluate(FeatureFlag.NEW_DASHBOARD, {
        userId: 'user-123',
      });

      expect(result.enabled).toBe(true);
      expect(result.reason).toBe('user_override');
      expect(mockRedis.get).toHaveBeenCalledWith(
        'ff:new_dashboard:user:user-123',
      );
    });

    it('should check org override when no user override', async () => {
      mockRedis.get
        .mockResolvedValueOnce(null) // user override
        .mockResolvedValueOnce('false'); // org override

      const result = await service.evaluate(FeatureFlag.NEW_DASHBOARD, {
        userId: 'user-123',
        organizationId: 'org-456',
      });

      expect(result.enabled).toBe(false);
      expect(result.reason).toBe('org_override');
    });

    it('should check global value when no overrides', async () => {
      mockRedis.get
        .mockResolvedValueOnce(null) // user override
        .mockResolvedValueOnce(null) // org override
        .mockResolvedValueOnce('true'); // global value

      const result = await service.evaluate(FeatureFlag.NEW_DASHBOARD, {
        userId: 'user-123',
        organizationId: 'org-456',
      });

      expect(result.enabled).toBe(true);
      expect(result.reason).toBe('redis');
    });

    it('should check percentage rollout', async () => {
      mockRedis.get
        .mockResolvedValueOnce(null) // global value
        .mockResolvedValueOnce('50'); // percentage

      const result = await service.evaluate(FeatureFlag.NEW_DASHBOARD);

      expect(result.reason).toBe('percentage');
      expect(typeof result.enabled).toBe('boolean');
    });

    it('should handle Redis errors gracefully', async () => {
      mockRedis.get.mockRejectedValueOnce(new Error('Redis connection failed'));

      const result = await service.evaluate(FeatureFlag.NEW_DASHBOARD);

      expect(result.reason).toBe('default');
    });
  });

  describe('setFlag with Redis', () => {
    it('should set global flag value', async () => {
      await service.setFlag(FeatureFlag.NEW_DASHBOARD, true);

      expect(mockRedis.set).toHaveBeenCalledWith('ff:new_dashboard', 'true');
    });

    it('should set user-specific override', async () => {
      await service.setFlag(FeatureFlag.NEW_DASHBOARD, true, {
        userId: 'user-123',
      });

      expect(mockRedis.set).toHaveBeenCalledWith(
        'ff:new_dashboard:user:user-123',
        'true',
      );
    });

    it('should set org-specific override', async () => {
      await service.setFlag(FeatureFlag.NEW_DASHBOARD, false, {
        organizationId: 'org-456',
      });

      expect(mockRedis.set).toHaveBeenCalledWith(
        'ff:new_dashboard:org:org-456',
        'false',
      );
    });

    it('should set percentage rollout', async () => {
      await service.setFlag(FeatureFlag.NEW_DASHBOARD, true, {
        percentage: 25,
      });

      expect(mockRedis.set).toHaveBeenCalledWith(
        'ff:new_dashboard:percentage',
        '25',
      );
    });

    it('should throw on Redis error when setting', async () => {
      mockRedis.set.mockRejectedValueOnce(new Error('Redis write failed'));

      await expect(
        service.setFlag(FeatureFlag.NEW_DASHBOARD, true),
      ).rejects.toThrow('Redis write failed');
    });
  });

  describe('deleteFlag with Redis', () => {
    it('should delete global flag value', async () => {
      await service.deleteFlag(FeatureFlag.NEW_DASHBOARD);

      expect(mockRedis.del).toHaveBeenCalledWith('ff:new_dashboard');
      expect(mockRedis.del).toHaveBeenCalledWith('ff:new_dashboard:percentage');
    });

    it('should delete user-specific override', async () => {
      await service.deleteFlag(FeatureFlag.NEW_DASHBOARD, {
        userId: 'user-123',
      });

      expect(mockRedis.del).toHaveBeenCalledWith(
        'ff:new_dashboard:user:user-123',
      );
    });

    it('should delete org-specific override', async () => {
      await service.deleteFlag(FeatureFlag.NEW_DASHBOARD, {
        organizationId: 'org-456',
      });

      expect(mockRedis.del).toHaveBeenCalledWith(
        'ff:new_dashboard:org:org-456',
      );
    });

    it('should handle Redis error silently when deleting', async () => {
      mockRedis.del.mockRejectedValueOnce(new Error('Redis delete failed'));

      // Should not throw
      await expect(
        service.deleteFlag(FeatureFlag.NEW_DASHBOARD),
      ).resolves.toBeUndefined();
    });
  });

  describe('isRedisAvailable with Redis', () => {
    it('should return true when Redis is ready', () => {
      expect(service.isRedisAvailable()).toBe(true);
    });

    it('should return false when Redis is not ready', () => {
      mockRedis.status = 'connecting';
      expect(service.isRedisAvailable()).toBe(false);
    });
  });
});
