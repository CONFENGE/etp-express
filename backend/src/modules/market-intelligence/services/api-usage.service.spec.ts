import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, Between, MoreThanOrEqual } from 'typeorm';
import { ApiUsageService } from './api-usage.service';
import { ApiUsage } from '../entities/api-usage.entity';
import { User } from '../../../entities/user.entity';

/**
 * ApiUsageService Unit Tests
 *
 * Tests for API usage tracking and metrics service.
 *
 * Related:
 * - Parent Issue: #1275 - API de consulta de preços para terceiros
 * - Current Issue: #1688 - Criar ApiUsage entity e tracking de métricas
 *
 * @author ETP Express Team
 * @since 2026-01-25
 */
describe('ApiUsageService', () => {
  let service: ApiUsageService;
  let repository: Repository<ApiUsage>;

  const mockUser = {
    id: 'test-user-uuid',
    email: 'test@example.com',
  } as unknown as User;

  const mockRepository = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ApiUsageService,
        {
          provide: getRepositoryToken(ApiUsage),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<ApiUsageService>(ApiUsageService);
    repository = module.get<Repository<ApiUsage>>(getRepositoryToken(ApiUsage));

    // Reset mocks
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('trackRequest', () => {
    it('should track an API request successfully', async () => {
      const mockUsage = {
        user: mockUser,
        endpoint: '/api/v1/prices/benchmark',
        method: 'GET',
        statusCode: 200,
        responseTime: 150,
        quota: 1,
      };

      mockRepository.create.mockReturnValue(mockUsage);
      mockRepository.save.mockResolvedValue(mockUsage);

      await service.trackRequest(
        mockUser,
        '/api/v1/prices/benchmark',
        'GET',
        200,
        150,
      );

      expect(mockRepository.create).toHaveBeenCalledWith({
        user: mockUser,
        endpoint: '/api/v1/prices/benchmark',
        method: 'GET',
        statusCode: 200,
        responseTime: 150,
        quota: 1,
      });
      expect(mockRepository.save).toHaveBeenCalledWith(mockUsage);
    });

    it('should use custom quota value', async () => {
      const mockUsage = {
        user: mockUser,
        endpoint: '/api/v1/prices/search',
        method: 'POST',
        statusCode: 200,
        responseTime: 300,
        quota: 5,
      };

      mockRepository.create.mockReturnValue(mockUsage);
      mockRepository.save.mockResolvedValue(mockUsage);

      await service.trackRequest(
        mockUser,
        '/api/v1/prices/search',
        'POST',
        200,
        300,
        5,
      );

      expect(mockRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ quota: 5 }),
      );
    });

    it('should not throw when tracking fails', async () => {
      mockRepository.create.mockReturnValue({});
      mockRepository.save.mockRejectedValue(new Error('Database error'));

      await expect(
        service.trackRequest(
          mockUser,
          '/api/v1/prices/benchmark',
          'GET',
          200,
          150,
        ),
      ).resolves.not.toThrow();
    });
  });

  describe('getUserUsage', () => {
    it('should return aggregated usage metrics', async () => {
      const startDate = new Date('2026-01-01');
      const endDate = new Date('2026-01-31');

      const mockUsageRecords = [
        {
          statusCode: 200,
          responseTime: 100,
          quota: 1,
          endpoint: '/api/v1/prices/benchmark',
        },
        {
          statusCode: 200,
          responseTime: 150,
          quota: 1,
          endpoint: '/api/v1/prices/benchmark',
        },
        {
          statusCode: 404,
          responseTime: 50,
          quota: 1,
          endpoint: '/api/v1/prices/search',
        },
        {
          statusCode: 200,
          responseTime: 200,
          quota: 2,
          endpoint: '/api/v1/prices/search',
        },
      ];

      mockRepository.find.mockResolvedValue(mockUsageRecords);

      const result = await service.getUserUsage(
        'test-user-uuid',
        startDate,
        endDate,
      );

      expect(mockRepository.find).toHaveBeenCalledWith({
        where: {
          user: { id: 'test-user-uuid' },
          createdAt: Between(startDate, endDate),
        },
      });

      expect(result).toEqual({
        totalRequests: 4,
        successfulRequests: 3,
        failedRequests: 1,
        averageResponseTime: 125, // (100 + 150 + 50 + 200) / 4
        quotaConsumed: 5, // 1 + 1 + 1 + 2
        topEndpoints: [
          { endpoint: '/api/v1/prices/benchmark', count: 2 },
          { endpoint: '/api/v1/prices/search', count: 2 },
        ],
      });
    });

    it('should handle empty usage records', async () => {
      const startDate = new Date('2026-01-01');
      const endDate = new Date('2026-01-31');

      mockRepository.find.mockResolvedValue([]);

      const result = await service.getUserUsage(
        'test-user-uuid',
        startDate,
        endDate,
      );

      expect(result).toEqual({
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 0,
        averageResponseTime: 0,
        quotaConsumed: 0,
        topEndpoints: [],
      });
    });

    it('should calculate top 5 endpoints', async () => {
      const startDate = new Date('2026-01-01');
      const endDate = new Date('2026-01-31');

      const mockUsageRecords = Array.from({ length: 10 }, (_, i) => ({
        statusCode: 200,
        responseTime: 100,
        quota: 1,
        endpoint: `/api/v1/endpoint${i % 7}`, // 7 different endpoints
      }));

      mockRepository.find.mockResolvedValue(mockUsageRecords);

      const result = await service.getUserUsage(
        'test-user-uuid',
        startDate,
        endDate,
      );

      expect(result.topEndpoints).toHaveLength(5);
      expect(result.topEndpoints[0].count).toBeGreaterThanOrEqual(
        result.topEndpoints[1].count,
      );
    });
  });

  describe('checkQuota', () => {
    it('should return quota status for current billing period', async () => {
      const now = new Date('2026-01-15');
      jest.spyOn(global, 'Date').mockImplementation(() => now);

      const mockUsageRecords = [{ quota: 10 }, { quota: 15 }, { quota: 5 }];

      mockRepository.find.mockResolvedValue(mockUsageRecords);

      const result = await service.checkQuota('test-user-uuid', 1000);

      expect(result).toMatchObject({
        totalQuota: 1000,
        consumedQuota: 30, // 10 + 15 + 5
        remainingQuota: 970, // 1000 - 30
      });

      expect(result.periodStart).toEqual(new Date('2026-01-01'));
      expect(result.periodEnd).toEqual(new Date('2026-01-31T23:59:59'));

      jest.restoreAllMocks();
    });

    it('should not allow negative remaining quota', async () => {
      mockRepository.find.mockResolvedValue([{ quota: 600 }, { quota: 600 }]);

      const result = await service.checkQuota('test-user-uuid', 1000);

      expect(result.remainingQuota).toBe(0); // Max(0, 1000 - 1200) = 0
    });

    it('should query usage records from period start', async () => {
      const now = new Date('2026-01-15');
      jest.spyOn(global, 'Date').mockImplementation(() => now);

      mockRepository.find.mockResolvedValue([]);

      await service.checkQuota('test-user-uuid', 1000);

      expect(mockRepository.find).toHaveBeenCalledWith({
        where: {
          user: { id: 'test-user-uuid' },
          createdAt: MoreThanOrEqual(new Date('2026-01-01')),
        },
      });

      jest.restoreAllMocks();
    });
  });

  describe('getRecentUsage', () => {
    it('should return recent usage records with default limit', async () => {
      const mockRecords = Array.from({ length: 50 }, (_, i) => ({
        id: i,
        endpoint: '/api/v1/test',
      }));

      mockRepository.find.mockResolvedValue(mockRecords);

      const result = await service.getRecentUsage('test-user-uuid');

      expect(mockRepository.find).toHaveBeenCalledWith({
        where: { user: { id: 'test-user-uuid' } },
        order: { createdAt: 'DESC' },
        take: 100,
      });

      expect(result).toEqual(mockRecords);
    });

    it('should respect custom limit', async () => {
      mockRepository.find.mockResolvedValue([]);

      await service.getRecentUsage('test-user-uuid', 25);

      expect(mockRepository.find).toHaveBeenCalledWith({
        where: { user: { id: 'test-user-uuid' } },
        order: { createdAt: 'DESC' },
        take: 25,
      });
    });
  });
});
