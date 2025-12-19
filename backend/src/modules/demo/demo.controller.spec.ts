import { Test, TestingModule } from '@nestjs/testing';
import { DemoController } from './demo.controller';
import { DemoService, DemoResetResult } from './demo.service';

describe('DemoController', () => {
  let controller: DemoController;
  let service: DemoService;

  const mockDemoService = {
    resetDemoData: jest.fn(),
    getDemoStatistics: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DemoController],
      providers: [
        {
          provide: DemoService,
          useValue: mockDemoService,
        },
      ],
    }).compile();

    controller = module.get<DemoController>(DemoController);
    service = module.get<DemoService>(DemoService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('resetDemoData', () => {
    it('should call DemoService.resetDemoData and return result', async () => {
      const mockResult: DemoResetResult = {
        success: true,
        timestamp: new Date(),
        deletedEtps: 5,
        deletedSections: 25,
        deletedVersions: 10,
        deletedAuditLogs: 50,
        createdEtps: 3,
      };

      mockDemoService.resetDemoData.mockResolvedValue(mockResult);

      const result = await controller.resetDemoData();

      expect(mockDemoService.resetDemoData).toHaveBeenCalled();
      expect(result).toEqual(mockResult);
    });

    it('should return error result when reset fails', async () => {
      const mockResult: DemoResetResult = {
        success: false,
        timestamp: new Date(),
        deletedEtps: 0,
        deletedSections: 0,
        deletedVersions: 0,
        deletedAuditLogs: 0,
        createdEtps: 0,
        error: 'Demo organization not found',
      };

      mockDemoService.resetDemoData.mockResolvedValue(mockResult);

      const result = await controller.resetDemoData();

      expect(result.success).toBe(false);
      expect(result.error).toBe('Demo organization not found');
    });
  });

  describe('getDemoStatistics', () => {
    it('should call DemoService.getDemoStatistics and return result', async () => {
      const mockStats = {
        organizationId: 'demo-org-id',
        organizationName: 'Demonstração ETP Express',
        etpCount: 5,
        userCount: 1,
        lastResetInfo: 'Resets daily at 00:00 UTC',
      };

      mockDemoService.getDemoStatistics.mockResolvedValue(mockStats);

      const result = await controller.getDemoStatistics();

      expect(mockDemoService.getDemoStatistics).toHaveBeenCalled();
      expect(result).toEqual(mockStats);
    });

    it('should return null values when demo not configured', async () => {
      const mockStats = {
        organizationId: null,
        organizationName: null,
        etpCount: 0,
        userCount: 0,
        lastResetInfo: 'Demo organization not configured',
      };

      mockDemoService.getDemoStatistics.mockResolvedValue(mockStats);

      const result = await controller.getDemoStatistics();

      expect(result.organizationId).toBeNull();
      expect(result.organizationName).toBeNull();
    });
  });
});
