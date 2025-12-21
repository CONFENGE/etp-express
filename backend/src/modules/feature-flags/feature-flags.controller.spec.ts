import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { FeatureFlagsController } from './feature-flags.controller';
import { FeatureFlagsService } from './feature-flags.service';
import { FeatureFlagGuard } from './guards/feature-flag.guard';
import { FeatureFlag } from './feature-flags.types';

/**
 * Feature Flags Controller Tests
 *
 * @see #865 - Feature Flags: Escolha e setup de provider
 */
describe('FeatureFlagsController', () => {
  let controller: FeatureFlagsController;
  let service: FeatureFlagsService;

  const mockUser = {
    userId: 'user-123',
    organizationId: 'org-456',
  };

  const mockFeatureFlagsService = {
    getAllFlags: jest.fn(),
    getConfigurations: jest.fn(),
    evaluate: jest.fn(),
    isEnabled: jest.fn(),
    setFlag: jest.fn(),
    deleteFlag: jest.fn(),
    isRedisAvailable: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [FeatureFlagsController],
      providers: [
        {
          provide: FeatureFlagsService,
          useValue: mockFeatureFlagsService,
        },
        {
          provide: Reflector,
          useValue: { getAllAndOverride: jest.fn() },
        },
        FeatureFlagGuard,
      ],
    }).compile();

    controller = module.get<FeatureFlagsController>(FeatureFlagsController);
    service = module.get<FeatureFlagsService>(FeatureFlagsService);

    // Reset mocks
    jest.clearAllMocks();
  });

  describe('getAllFlags', () => {
    it('should return all flags for the current user', async () => {
      const expectedFlags = {
        [FeatureFlag.NEW_DASHBOARD]: false,
        [FeatureFlag.AI_SUGGESTIONS]: true,
      };

      mockFeatureFlagsService.getAllFlags.mockResolvedValue(expectedFlags);

      const result = await controller.getAllFlags(mockUser);

      expect(result).toEqual(expectedFlags);
      expect(mockFeatureFlagsService.getAllFlags).toHaveBeenCalledWith({
        userId: mockUser.userId,
        organizationId: mockUser.organizationId,
      });
    });
  });

  describe('getConfigurations', () => {
    it('should return all flag configurations', () => {
      const expectedConfigs = {
        [FeatureFlag.NEW_DASHBOARD]: {
          key: FeatureFlag.NEW_DASHBOARD,
          name: 'New Dashboard',
          description: 'Enable the new dashboard design',
          defaultValue: false,
        },
      };

      mockFeatureFlagsService.getConfigurations.mockReturnValue(
        expectedConfigs,
      );

      const result = controller.getConfigurations();

      expect(result).toEqual(expectedConfigs);
    });
  });

  describe('checkFlag', () => {
    it('should return evaluation for a specific flag', async () => {
      const expectedEvaluation = {
        key: FeatureFlag.NEW_DASHBOARD,
        enabled: false,
        reason: 'default',
        evaluatedAt: new Date(),
      };

      mockFeatureFlagsService.evaluate.mockResolvedValue(expectedEvaluation);

      const result = await controller.checkFlag(
        FeatureFlag.NEW_DASHBOARD,
        mockUser,
      );

      expect(result).toEqual(expectedEvaluation);
      expect(mockFeatureFlagsService.evaluate).toHaveBeenCalledWith(
        FeatureFlag.NEW_DASHBOARD,
        {
          userId: mockUser.userId,
          organizationId: mockUser.organizationId,
        },
      );
    });
  });

  describe('setFlag', () => {
    it('should set a flag globally', async () => {
      mockFeatureFlagsService.setFlag.mockResolvedValue(undefined);

      const result = await controller.setFlag(FeatureFlag.NEW_DASHBOARD, {
        enabled: true,
      });

      expect(result).toEqual({
        success: true,
        flag: FeatureFlag.NEW_DASHBOARD,
        enabled: true,
      });
      expect(mockFeatureFlagsService.setFlag).toHaveBeenCalledWith(
        FeatureFlag.NEW_DASHBOARD,
        true,
        { userId: undefined, organizationId: undefined, percentage: undefined },
      );
    });

    it('should set a flag for a specific user', async () => {
      mockFeatureFlagsService.setFlag.mockResolvedValue(undefined);

      const result = await controller.setFlag(FeatureFlag.NEW_DASHBOARD, {
        enabled: true,
        userId: 'user-789',
      });

      expect(result.success).toBe(true);
      expect(mockFeatureFlagsService.setFlag).toHaveBeenCalledWith(
        FeatureFlag.NEW_DASHBOARD,
        true,
        {
          userId: 'user-789',
          organizationId: undefined,
          percentage: undefined,
        },
      );
    });

    it('should set a flag with percentage rollout', async () => {
      mockFeatureFlagsService.setFlag.mockResolvedValue(undefined);

      const result = await controller.setFlag(FeatureFlag.NEW_DASHBOARD, {
        enabled: true,
        percentage: 50,
      });

      expect(result.success).toBe(true);
      expect(mockFeatureFlagsService.setFlag).toHaveBeenCalledWith(
        FeatureFlag.NEW_DASHBOARD,
        true,
        { userId: undefined, organizationId: undefined, percentage: 50 },
      );
    });
  });

  describe('deleteFlag', () => {
    it('should delete a flag override', async () => {
      mockFeatureFlagsService.deleteFlag.mockResolvedValue(undefined);

      await controller.deleteFlag(FeatureFlag.NEW_DASHBOARD);

      expect(mockFeatureFlagsService.deleteFlag).toHaveBeenCalledWith(
        FeatureFlag.NEW_DASHBOARD,
        { userId: undefined, organizationId: undefined },
      );
    });

    it('should delete a user-specific override', async () => {
      mockFeatureFlagsService.deleteFlag.mockResolvedValue(undefined);

      await controller.deleteFlag(FeatureFlag.NEW_DASHBOARD, 'user-789');

      expect(mockFeatureFlagsService.deleteFlag).toHaveBeenCalledWith(
        FeatureFlag.NEW_DASHBOARD,
        { userId: 'user-789', organizationId: undefined },
      );
    });
  });

  describe('getHealth', () => {
    it('should return healthy status when Redis is connected', () => {
      mockFeatureFlagsService.isRedisAvailable.mockReturnValue(true);

      const result = controller.getHealth();

      expect(result).toEqual({
        status: 'healthy',
        redisConnected: true,
        message: 'Feature flags service is fully operational',
      });
    });

    it('should return degraded status when Redis is not connected', () => {
      mockFeatureFlagsService.isRedisAvailable.mockReturnValue(false);

      const result = controller.getHealth();

      expect(result).toEqual({
        status: 'degraded',
        redisConnected: false,
        message:
          'Feature flags service is running with defaults only (Redis unavailable)',
      });
    });
  });
});

describe('FeatureFlagGuard', () => {
  let guard: FeatureFlagGuard;
  let reflector: Reflector;
  let service: FeatureFlagsService;

  const mockExecutionContext = {
    getHandler: jest.fn(),
    getClass: jest.fn(),
    switchToHttp: jest.fn().mockReturnValue({
      getRequest: jest.fn().mockReturnValue({
        user: { userId: 'user-123', organizationId: 'org-456' },
      }),
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FeatureFlagGuard,
        {
          provide: Reflector,
          useValue: { getAllAndOverride: jest.fn() },
        },
        {
          provide: FeatureFlagsService,
          useValue: { isEnabled: jest.fn() },
        },
      ],
    }).compile();

    guard = module.get<FeatureFlagGuard>(FeatureFlagGuard);
    reflector = module.get<Reflector>(Reflector);
    service = module.get<FeatureFlagsService>(FeatureFlagsService);

    jest.clearAllMocks();
  });

  it('should allow access when no flag is required', async () => {
    (reflector.getAllAndOverride as jest.Mock).mockReturnValue(undefined);

    const result = await guard.canActivate(mockExecutionContext as any);

    expect(result).toBe(true);
  });

  it('should allow access when flag is enabled', async () => {
    (reflector.getAllAndOverride as jest.Mock).mockReturnValue(
      FeatureFlag.NEW_DASHBOARD,
    );
    (service.isEnabled as jest.Mock).mockResolvedValue(true);

    const result = await guard.canActivate(mockExecutionContext as any);

    expect(result).toBe(true);
  });

  it('should deny access when flag is disabled', async () => {
    (reflector.getAllAndOverride as jest.Mock).mockReturnValue(
      FeatureFlag.NEW_DASHBOARD,
    );
    (service.isEnabled as jest.Mock).mockResolvedValue(false);

    await expect(
      guard.canActivate(mockExecutionContext as any),
    ).rejects.toThrow(ForbiddenException);
  });
});
