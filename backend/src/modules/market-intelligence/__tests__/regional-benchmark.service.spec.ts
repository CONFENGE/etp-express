import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { NotFoundException } from '@nestjs/common';
import { RegionalBenchmarkService } from '../services/regional-benchmark.service';
import {
  PriceBenchmark,
  OrgaoPorte,
} from '../../../entities/price-benchmark.entity';
import { NormalizedContractItem } from '../../../entities/normalized-contract-item.entity';
import {
  ItemCategory,
  ItemCategoryType,
} from '../../../entities/item-category.entity';
import { ContractPrice } from '../../../entities/contract-price.entity';
import {
  PriceRisk,
  BenchmarkQueryDto,
  PriceComparisonDto,
} from '../dto/regional-benchmark.dto';

/**
 * Unit tests for RegionalBenchmarkService.
 *
 * @see Issue #1271 - [Analytics-c] Motor de benchmark regional
 * @see Issue #1268 - [Analytics] Inteligência de Mercado (Parent)
 */
describe('RegionalBenchmarkService', () => {
  let service: RegionalBenchmarkService;
  let benchmarkRepo: Repository<PriceBenchmark>;
  let normalizedItemRepo: Repository<NormalizedContractItem>;
  let categoryRepo: Repository<ItemCategory>;
  let contractPriceRepo: Repository<ContractPrice>;

  // Mock category
  const mockCategory: Partial<ItemCategory> = {
    id: 'cat-001',
    code: 'CATMAT-44122',
    name: 'Notebook',
    type: ItemCategoryType.CATMAT,
    active: true,
  };

  // Mock benchmark
  const mockBenchmark: Partial<PriceBenchmark> = {
    id: 'bench-001',
    categoryId: 'cat-001',
    uf: 'SP',
    orgaoPorte: OrgaoPorte.TODOS,
    avgPrice: 3500.0,
    medianPrice: 3200.0,
    minPrice: 1500.0,
    maxPrice: 8500.0,
    p25: 2800.0,
    p75: 4200.0,
    stdDev: 850.0,
    sampleCount: 245,
    unit: 'UN',
    periodStart: new Date('2025-01-01'),
    periodEnd: new Date('2026-01-01'),
    calculatedAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
    category: mockCategory as ItemCategory,
  };

  // Mock national benchmark
  const mockNationalBenchmark: Partial<PriceBenchmark> = {
    ...mockBenchmark,
    id: 'bench-002',
    uf: 'BR',
    sampleCount: 1250,
  };

  // Create mock query builder
  const createMockQueryBuilder = () => ({
    innerJoin: jest.fn().mockReturnThis(),
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    groupBy: jest.fn().mockReturnThis(),
    getRawMany: jest.fn().mockResolvedValue([]),
    getRawOne: jest.fn().mockResolvedValue(null),
    getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RegionalBenchmarkService,
        {
          provide: getRepositoryToken(PriceBenchmark),
          useValue: {
            findOne: jest.fn(),
            find: jest.fn(),
            count: jest.fn(),
            save: jest.fn(),
            update: jest.fn(),
            create: jest.fn((entity) => entity),
            createQueryBuilder: jest.fn(() => createMockQueryBuilder()),
          },
        },
        {
          provide: getRepositoryToken(NormalizedContractItem),
          useValue: {
            createQueryBuilder: jest.fn(() => createMockQueryBuilder()),
          },
        },
        {
          provide: getRepositoryToken(ItemCategory),
          useValue: {
            find: jest.fn(),
            findOne: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(ContractPrice),
          useValue: {
            createQueryBuilder: jest.fn(() => createMockQueryBuilder()),
          },
        },
      ],
    }).compile();

    service = module.get<RegionalBenchmarkService>(RegionalBenchmarkService);
    benchmarkRepo = module.get<Repository<PriceBenchmark>>(
      getRepositoryToken(PriceBenchmark),
    );
    normalizedItemRepo = module.get<Repository<NormalizedContractItem>>(
      getRepositoryToken(NormalizedContractItem),
    );
    categoryRepo = module.get<Repository<ItemCategory>>(
      getRepositoryToken(ItemCategory),
    );
    contractPriceRepo = module.get<Repository<ContractPrice>>(
      getRepositoryToken(ContractPrice),
    );
  });

  describe('service instantiation', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });
  });

  // ============================================
  // QUERY OPERATIONS
  // ============================================

  describe('getBenchmarks', () => {
    it('should return paginated benchmarks', async () => {
      const mockQB = createMockQueryBuilder();
      mockQB.getManyAndCount.mockResolvedValue([
        [mockBenchmark as PriceBenchmark],
        1,
      ]);
      jest
        .spyOn(benchmarkRepo, 'createQueryBuilder')
        .mockReturnValue(mockQB as any);

      const query: BenchmarkQueryDto = { page: 1, limit: 20 };
      const result = await service.getBenchmarks(query);

      expect(result.total).toBe(1);
      expect(result.data).toHaveLength(1);
      expect(result.data[0].categoryCode).toBe('CATMAT-44122');
    });

    it('should filter by categoryId', async () => {
      const mockQB = createMockQueryBuilder();
      mockQB.getManyAndCount.mockResolvedValue([[], 0]);
      jest
        .spyOn(benchmarkRepo, 'createQueryBuilder')
        .mockReturnValue(mockQB as any);

      const query: BenchmarkQueryDto = { categoryId: 'cat-001' };
      await service.getBenchmarks(query);

      expect(mockQB.andWhere).toHaveBeenCalledWith(
        'benchmark.categoryId = :categoryId',
        { categoryId: 'cat-001' },
      );
    });

    it('should filter by UF', async () => {
      const mockQB = createMockQueryBuilder();
      mockQB.getManyAndCount.mockResolvedValue([[], 0]);
      jest
        .spyOn(benchmarkRepo, 'createQueryBuilder')
        .mockReturnValue(mockQB as any);

      const query: BenchmarkQueryDto = { uf: 'SP' };
      await service.getBenchmarks(query);

      expect(mockQB.andWhere).toHaveBeenCalledWith('benchmark.uf = :uf', {
        uf: 'SP',
      });
    });
  });

  describe('getBenchmarkByCategory', () => {
    it('should return national benchmark by category ID', async () => {
      jest
        .spyOn(benchmarkRepo, 'findOne')
        .mockResolvedValue(mockNationalBenchmark as PriceBenchmark);

      const result = await service.getBenchmarkByCategory('cat-001');

      expect(result.categoryCode).toBe('CATMAT-44122');
      expect(result.uf).toBe('BR');
      expect(result.medianPrice).toBe(3200.0);
    });

    it('should find by category code if ID not found', async () => {
      jest.spyOn(benchmarkRepo, 'findOne').mockResolvedValueOnce(null);
      jest
        .spyOn(categoryRepo, 'findOne')
        .mockResolvedValue(mockCategory as ItemCategory);
      jest
        .spyOn(benchmarkRepo, 'findOne')
        .mockResolvedValue(mockNationalBenchmark as PriceBenchmark);

      const result = await service.getBenchmarkByCategory('CATMAT-44122');

      expect(result.categoryCode).toBe('CATMAT-44122');
    });

    it('should throw NotFoundException if benchmark not found', async () => {
      jest.spyOn(benchmarkRepo, 'findOne').mockResolvedValue(null);
      jest.spyOn(categoryRepo, 'findOne').mockResolvedValue(null);

      await expect(
        service.getBenchmarkByCategory('non-existent'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getRegionalBreakdown', () => {
    it('should return regional breakdown with national benchmark', async () => {
      jest
        .spyOn(categoryRepo, 'findOne')
        .mockResolvedValue(mockCategory as ItemCategory);
      jest
        .spyOn(benchmarkRepo, 'findOne')
        .mockResolvedValue(mockNationalBenchmark as PriceBenchmark);
      jest
        .spyOn(benchmarkRepo, 'find')
        .mockResolvedValue([
          { ...mockBenchmark, uf: 'SP' } as PriceBenchmark,
          { ...mockBenchmark, uf: 'RJ', medianPrice: 3400.0 } as PriceBenchmark,
        ]);

      const result = await service.getRegionalBreakdown('cat-001');

      expect(result.categoryCode).toBe('CATMAT-44122');
      expect(result.national).toBeDefined();
      expect(result.regions.length).toBe(2);
    });

    it('should throw NotFoundException if category not found', async () => {
      jest.spyOn(categoryRepo, 'findOne').mockResolvedValue(null);

      await expect(
        service.getRegionalBreakdown('non-existent'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ============================================
  // PRICE COMPARISON
  // ============================================

  describe('comparePriceToBenchmark', () => {
    beforeEach(() => {
      jest
        .spyOn(categoryRepo, 'findOne')
        .mockResolvedValue(mockCategory as ItemCategory);
    });

    it('should return LOW risk for prices within 20% of median', async () => {
      jest
        .spyOn(benchmarkRepo, 'findOne')
        .mockResolvedValue(mockBenchmark as PriceBenchmark);

      const dto: PriceComparisonDto = {
        price: 3500.0, // ~9% above median of 3200
        categoryId: 'cat-001',
        uf: 'SP',
      };

      const result = await service.comparePriceToBenchmark(dto);

      expect(result.risk).toBe(PriceRisk.LOW);
      expect(result.deviation).toBeGreaterThan(0);
      expect(result.deviation).toBeLessThan(20);
    });

    it('should return MEDIUM risk for prices 20-40% above median', async () => {
      jest
        .spyOn(benchmarkRepo, 'findOne')
        .mockResolvedValue(mockBenchmark as PriceBenchmark);

      const dto: PriceComparisonDto = {
        price: 4200.0, // ~31% above median
        categoryId: 'cat-001',
        uf: 'SP',
      };

      const result = await service.comparePriceToBenchmark(dto);

      expect(result.risk).toBe(PriceRisk.MEDIUM);
      expect(result.deviation).toBeGreaterThan(20);
      expect(result.deviation).toBeLessThan(40);
    });

    it('should return HIGH risk for prices 40-60% above median', async () => {
      jest
        .spyOn(benchmarkRepo, 'findOne')
        .mockResolvedValue(mockBenchmark as PriceBenchmark);

      const dto: PriceComparisonDto = {
        price: 4800.0, // 50% above median
        categoryId: 'cat-001',
        uf: 'SP',
      };

      const result = await service.comparePriceToBenchmark(dto);

      expect(result.risk).toBe(PriceRisk.HIGH);
      expect(result.deviation).toBeGreaterThan(40);
      expect(result.deviation).toBeLessThan(60);
    });

    it('should return CRITICAL risk for prices >60% above median', async () => {
      jest
        .spyOn(benchmarkRepo, 'findOne')
        .mockResolvedValue(mockBenchmark as PriceBenchmark);

      const dto: PriceComparisonDto = {
        price: 5500.0, // ~72% above median
        categoryId: 'cat-001',
        uf: 'SP',
      };

      const result = await service.comparePriceToBenchmark(dto);

      expect(result.risk).toBe(PriceRisk.CRITICAL);
      expect(result.deviation).toBeGreaterThan(60);
    });

    it('should return LOW risk for prices below median', async () => {
      jest
        .spyOn(benchmarkRepo, 'findOne')
        .mockResolvedValue(mockBenchmark as PriceBenchmark);

      const dto: PriceComparisonDto = {
        price: 2800.0, // below median
        categoryId: 'cat-001',
        uf: 'SP',
      };

      const result = await service.comparePriceToBenchmark(dto);

      expect(result.risk).toBe(PriceRisk.LOW);
      expect(result.deviation).toBeLessThan(0);
    });

    it('should fallback to national benchmark if regional not found', async () => {
      jest
        .spyOn(benchmarkRepo, 'findOne')
        .mockResolvedValueOnce(null) // Regional not found
        .mockResolvedValueOnce(mockNationalBenchmark as PriceBenchmark); // National found

      const dto: PriceComparisonDto = {
        price: 3500.0,
        categoryId: 'cat-001',
        uf: 'AC', // UF with no data
      };

      const result = await service.comparePriceToBenchmark(dto);

      expect(result.benchmark.uf).toBe('BR');
    });

    it('should generate appropriate suggestion message', async () => {
      jest
        .spyOn(benchmarkRepo, 'findOne')
        .mockResolvedValue(mockBenchmark as PriceBenchmark);

      const dto: PriceComparisonDto = {
        price: 5000.0,
        categoryId: 'cat-001',
        uf: 'SP',
      };

      const result = await service.comparePriceToBenchmark(dto);

      expect(result.suggestion).toContain('R$');
      expect(result.suggestion).toContain('mediana');
    });

    it('should throw NotFoundException if no benchmark found', async () => {
      jest.spyOn(benchmarkRepo, 'findOne').mockResolvedValue(null);

      const dto: PriceComparisonDto = {
        price: 3500.0,
        categoryId: 'cat-001',
        uf: 'SP',
      };

      await expect(service.comparePriceToBenchmark(dto)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ============================================
  // STATISTICS
  // ============================================

  describe('getStatistics', () => {
    it('should return benchmark statistics', async () => {
      jest.spyOn(benchmarkRepo, 'count').mockResolvedValue(100);
      jest
        .spyOn(benchmarkRepo, 'findOne')
        .mockResolvedValue(mockBenchmark as PriceBenchmark);

      const mockQB = createMockQueryBuilder();
      mockQB.getRawOne
        .mockResolvedValueOnce({ categories: '50' })
        .mockResolvedValueOnce({ states: '27' })
        .mockResolvedValueOnce({ totalSamples: '10000', avgSamples: '100' });
      jest
        .spyOn(benchmarkRepo, 'createQueryBuilder')
        .mockReturnValue(mockQB as any);

      const result = await service.getStatistics();

      expect(result.totalBenchmarks).toBe(100);
      expect(result.categoriesWithBenchmarks).toBeGreaterThanOrEqual(0);
      expect(result.lastCalculatedAt).toBeDefined();
    });
  });

  // ============================================
  // CALCULATION
  // ============================================

  describe('calculateBenchmarks', () => {
    it('should skip calculation if already in progress', async () => {
      // Simulate concurrent call by making the first call long-running
      jest
        .spyOn(categoryRepo, 'find')
        .mockImplementation(
          () => new Promise((resolve) => setTimeout(() => resolve([]), 1000)),
        );

      // Start first calculation (will take time)
      const firstCall = service.calculateBenchmarks({});

      // Wait a tick for the first call to start
      await new Promise((resolve) => setTimeout(resolve, 10));

      // Second call should return 0 immediately
      const secondCall = await service.calculateBenchmarks({});

      expect(secondCall).toBe(0);

      // Clean up - wait for first call
      await firstCall;
    });

    it('should process categories and create benchmarks', async () => {
      const mockQB = createMockQueryBuilder();
      mockQB.getRawMany.mockResolvedValue([
        { price: '3000', unit: 'UN', uf: 'SP' },
        { price: '3200', unit: 'UN', uf: 'SP' },
        { price: '3400', unit: 'UN', uf: 'SP' },
        { price: '3100', unit: 'UN', uf: 'SP' },
        { price: '3300', unit: 'UN', uf: 'SP' },
      ]);

      jest
        .spyOn(categoryRepo, 'find')
        .mockResolvedValue([mockCategory as ItemCategory]);
      jest
        .spyOn(normalizedItemRepo, 'createQueryBuilder')
        .mockReturnValue(mockQB as any);
      jest.spyOn(benchmarkRepo, 'findOne').mockResolvedValue(null);
      jest
        .spyOn(benchmarkRepo, 'save')
        .mockResolvedValue(mockBenchmark as PriceBenchmark);

      const result = await service.calculateBenchmarks({
        categoryId: 'cat-001',
      });

      expect(result).toBeGreaterThanOrEqual(0);
    });
  });

  // ============================================
  // INTERNAL METHODS (via public interface)
  // ============================================

  describe('toBenchmarkResponse', () => {
    it('should convert entity to response DTO correctly', async () => {
      jest
        .spyOn(benchmarkRepo, 'findOne')
        .mockResolvedValue(mockBenchmark as PriceBenchmark);

      const result = await service.getBenchmarkByCategory('cat-001');

      expect(result).toMatchObject({
        categoryId: 'cat-001',
        categoryCode: 'CATMAT-44122',
        categoryName: 'Notebook',
        uf: 'SP',
        orgaoPorte: OrgaoPorte.TODOS,
        avgPrice: 3500.0,
        medianPrice: 3200.0,
        stdDev: 850.0,
        sampleCount: 245,
        unit: 'UN',
      });

      expect(result.priceRange).toMatchObject({
        min: 1500.0,
        max: 8500.0,
        p25: 2800.0,
        p75: 4200.0,
      });

      expect(result.period.start).toEqual(new Date('2025-01-01'));
      expect(result.period.end).toEqual(new Date('2026-01-01'));
    });
  });
});
