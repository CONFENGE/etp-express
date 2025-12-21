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
});
