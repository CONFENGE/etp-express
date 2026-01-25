import { Test, TestingModule } from '@nestjs/testing';
import { PublicPricesController } from './public-prices.controller';
import { RegionalBenchmarkService } from '../services/regional-benchmark.service';
import { ItemNormalizationService } from '../services/item-normalization.service';
import { BenchmarkQueryDto } from '../dto/regional-benchmark.dto';
import { PublicPriceSearchDto } from '../dto/public-prices.dto';
import { ItemCategoryType } from '../../../entities/item-category.entity';
import { OrgaoPorte } from '../../../entities/price-benchmark.entity';
import { getRepositoryToken } from '@nestjs/typeorm';
import { User } from '../../../entities/user.entity';
import { Reflector } from '@nestjs/core';
import { ApiKeyGuard } from '../../../common/guards/api-key.guard';
import { ApiKeyThrottlerGuard } from '../../../common/guards/api-key-throttler.guard';

describe('PublicPricesController', () => {
  let controller: PublicPricesController;
  let regionalBenchmarkService: jest.Mocked<RegionalBenchmarkService>;
  let itemNormalizationService: jest.Mocked<ItemNormalizationService>;

  const mockBenchmarks = [
    {
      id: '550e8400-e29b-41d4-a716-446655440000',
      categoryId: '660e8400-e29b-41d4-a716-446655440001',
      categoryCode: 'CATMAT-44122',
      categoryName: 'Microcomputador',
      uf: 'SP',
      orgaoPorte: OrgaoPorte.MEDIO,
      avgPrice: 3650.0,
      medianPrice: 3500.0,
      priceRange: {
        min: 2800.0,
        max: 4200.0,
        p25: 3200.0,
        p75: 3900.0,
      },
      stdDev: 450.0,
      sampleCount: 87,
      unit: 'UN',
      period: {
        start: new Date('2025-01-25'),
        end: new Date('2026-01-25'),
      },
      updatedAt: new Date('2026-01-25T04:00:00.000Z'),
    },
  ];

  const mockCategories = [
    {
      id: '660e8400-e29b-41d4-a716-446655440001',
      code: 'CATMAT-44122',
      name: 'Microcomputador',
      description: 'Equipamentos de informática',
      type: ItemCategoryType.CATMAT,
      parentCode: null,
      parent: null,
      children: [],
      level: 0,
      active: true,
      patterns: [],
      keywords: [],
      normalizedContractItems: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: '770e8400-e29b-41d4-a716-446655440002',
      code: 'CATMAT-45001',
      name: 'Impressora',
      description: 'Equipamentos de impressão',
      type: ItemCategoryType.CATMAT,
      parentCode: null,
      parent: null,
      children: [],
      level: 0,
      active: true,
      patterns: [],
      keywords: [],
      normalizedContractItems: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: '880e8400-e29b-41d4-a716-446655440003',
      code: 'CATSER-17012',
      name: 'Serviços de Limpeza',
      description: 'Serviços de limpeza e conservação',
      type: ItemCategoryType.CATSER,
      parentCode: null,
      parent: null,
      children: [],
      level: 0,
      active: true,
      patterns: [],
      keywords: [],
      normalizedContractItems: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ] as any[];

  beforeEach(async () => {
    const mockRegionalBenchmarkService = {
      getBenchmarks: jest.fn(),
    };

    const mockItemNormalizationService = {
      getCategories: jest.fn(),
    };

    const mockUserRepository = {
      findOne: jest.fn(),
    };

    const mockReflector = {
      getAllAndOverride: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [PublicPricesController],
      providers: [
        {
          provide: RegionalBenchmarkService,
          useValue: mockRegionalBenchmarkService,
        },
        {
          provide: ItemNormalizationService,
          useValue: mockItemNormalizationService,
        },
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepository,
        },
        {
          provide: Reflector,
          useValue: mockReflector,
        },
      ],
    })
      .overrideGuard(ApiKeyGuard)
      .useValue({ canActivate: jest.fn().mockReturnValue(true) })
      .overrideGuard(ApiKeyThrottlerGuard)
      .useValue({ canActivate: jest.fn().mockReturnValue(true) })
      .compile();

    controller = module.get<PublicPricesController>(PublicPricesController);
    regionalBenchmarkService = module.get(RegionalBenchmarkService);
    itemNormalizationService = module.get(ItemNormalizationService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('GET /prices/benchmark', () => {
    it('should return benchmarks with pagination metadata', async () => {
      const query: BenchmarkQueryDto = {
        categoryCode: 'CATMAT-44122',
        uf: 'SP',
        limit: 20,
        page: 1,
      };

      regionalBenchmarkService.getBenchmarks.mockResolvedValue({
        data: mockBenchmarks,
        total: 1,
      });

      const result = await controller.getBenchmark(query);

      expect(result).toEqual({
        data: mockBenchmarks,
        total: 1,
        page: 1,
        limit: 20,
        totalPages: 1,
      });

      expect(regionalBenchmarkService.getBenchmarks).toHaveBeenCalledWith(
        query,
      );
    });

    it('should use default pagination values when not provided', async () => {
      const query: BenchmarkQueryDto = {};

      regionalBenchmarkService.getBenchmarks.mockResolvedValue({
        data: mockBenchmarks,
        total: 1,
      });

      const result = await controller.getBenchmark(query);

      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
    });

    it('should calculate total pages correctly', async () => {
      const query: BenchmarkQueryDto = { limit: 10, page: 1 };

      // Mock 25 benchmarks
      const manyBenchmarks = Array(25)
        .fill(mockBenchmarks[0])
        .map((b, i) => ({ ...b, id: `id-${i}` }));

      regionalBenchmarkService.getBenchmarks.mockResolvedValue({
        data: manyBenchmarks,
        total: 25,
      });

      const result = await controller.getBenchmark(query);

      expect(result.total).toBe(25);
      expect(result.totalPages).toBe(3); // 25 / 10 = 3 pages
    });

    it('should handle empty results', async () => {
      const query: BenchmarkQueryDto = { categoryCode: 'INVALID' };

      regionalBenchmarkService.getBenchmarks.mockResolvedValue({
        data: [],
        total: 0,
      });

      const result = await controller.getBenchmark(query);

      expect(result.data).toEqual([]);
      expect(result.total).toBe(0);
      expect(result.totalPages).toBe(0);
    });
  });

  describe('GET /prices/search', () => {
    it('should return empty results (not implemented yet)', async () => {
      const query: PublicPriceSearchDto = {
        query: 'microcomputador',
        limit: 20,
        offset: 0,
      };

      const result = await controller.searchPrices(query);

      expect(result).toEqual({
        data: [],
        total: 0,
        limit: 20,
        offset: 0,
      });
    });

    it('should use default limit and offset when not provided', async () => {
      const query: PublicPriceSearchDto = {
        query: 'teste',
      };

      const result = await controller.searchPrices(query);

      expect(result.limit).toBe(20);
      expect(result.offset).toBe(0);
    });
  });

  describe('GET /prices/categories', () => {
    it('should return list of categories with metadata', async () => {
      itemNormalizationService.getCategories.mockResolvedValue(mockCategories);

      const result = await controller.getCategories();

      expect(result.total).toBe(3);
      expect(result.data).toHaveLength(3);

      expect(result.data[0]).toEqual({
        id: mockCategories[0].id,
        code: mockCategories[0].code,
        name: mockCategories[0].name,
        type: mockCategories[0].type,
        benchmarkCount: 0, // TODO: Will be populated in #1686
        active: true,
      });

      expect(itemNormalizationService.getCategories).toHaveBeenCalled();
    });

    it('should handle inactive categories correctly', async () => {
      const categoriesWithInactive = [
        ...mockCategories,
        {
          id: '990e8400-e29b-41d4-a716-446655440004',
          code: 'CATMAT-99999',
          name: 'Obsolete Item',
          description: 'Inactive category',
          type: ItemCategoryType.CATMAT,
          parentCode: null,
          parent: null,
          children: [],
          level: 0,
          active: false,
          patterns: [],
          keywords: [],
          normalizedContractItems: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ] as any[];

      itemNormalizationService.getCategories.mockResolvedValue(
        categoriesWithInactive,
      );

      const result = await controller.getCategories();

      expect(result.total).toBe(4);

      const inactiveCategory = result.data.find(
        (c) => c.code === 'CATMAT-99999',
      );
      expect(inactiveCategory?.active).toBe(false);
    });

    it('should handle empty categories list', async () => {
      itemNormalizationService.getCategories.mockResolvedValue([]);

      const result = await controller.getCategories();

      expect(result.data).toEqual([]);
      expect(result.total).toBe(0);
    });
  });

  describe('Integration Scenarios', () => {
    it('should log API calls for monitoring', async () => {
      const logSpy = jest.spyOn(controller['logger'], 'log');

      const query: BenchmarkQueryDto = { categoryCode: 'CATMAT-44122' };
      regionalBenchmarkService.getBenchmarks.mockResolvedValue({
        data: mockBenchmarks,
        total: 1,
      });

      await controller.getBenchmark(query);

      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('Public API: GET /prices/benchmark'),
      );
    });

    it('should handle service errors gracefully', async () => {
      const query: BenchmarkQueryDto = {};

      regionalBenchmarkService.getBenchmarks.mockRejectedValue(
        new Error('Database connection failed'),
      );

      await expect(controller.getBenchmark(query)).rejects.toThrow(
        'Database connection failed',
      );
    });
  });
});
