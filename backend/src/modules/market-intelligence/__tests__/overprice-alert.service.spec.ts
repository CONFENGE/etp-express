import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { OverpriceAlertService } from '../services/overprice-alert.service';
import { RegionalBenchmarkService } from '../services/regional-benchmark.service';
import { TextSimilarityService } from '../services/text-similarity.service';
import {
  OverpriceAlert,
  AlertLevel,
} from '../../../entities/overprice-alert.entity';
import {
  ItemCategory,
  ItemCategoryType,
} from '../../../entities/item-category.entity';
import { OrgaoPorte } from '../../../entities/price-benchmark.entity';
import { PriceRisk } from '../dto/regional-benchmark.dto';

/**
 * Unit tests for OverpriceAlertService.
 *
 * @see Issue #1272 - [Analytics-d] Sistema de alertas de sobrepreço
 * @see Issue #1268 - [Analytics] Inteligência de Mercado (Parent)
 */
describe('OverpriceAlertService', () => {
  let service: OverpriceAlertService;
  let alertRepo: Repository<OverpriceAlert>;
  let categoryRepo: Repository<ItemCategory>;
  let benchmarkService: RegionalBenchmarkService;
  let textSimilarityService: TextSimilarityService;
  let configService: ConfigService;

  // Mock category
  const mockCategory: Partial<ItemCategory> = {
    id: 'cat-001',
    code: 'CATMAT-44122',
    name: 'Microcomputador',
    type: ItemCategoryType.CATMAT,
    description: 'Microcomputador desktop para uso administrativo',
    keywords: ['computador', 'desktop', 'pc', 'microcomputador'],
    active: true,
  };

  // Mock benchmark response
  const mockBenchmarkResponse = {
    id: 'bench-001',
    categoryId: 'cat-001',
    categoryCode: 'CATMAT-44122',
    categoryName: 'Microcomputador',
    uf: 'SP',
    orgaoPorte: OrgaoPorte.TODOS,
    avgPrice: 3500.0,
    medianPrice: 3200.0,
    priceRange: {
      min: 1500.0,
      max: 8500.0,
      p25: 2800.0,
      p75: 4200.0,
    },
    stdDev: 850.0,
    sampleCount: 245,
    unit: 'UN',
    period: {
      start: new Date('2025-01-01'),
      end: new Date('2026-01-01'),
    },
    updatedAt: new Date(),
  };

  // Mock alert
  const mockAlert: Partial<OverpriceAlert> = {
    id: 'alert-001',
    etpId: 'etp-001',
    categoryId: 'cat-001',
    itemDescription: 'Microcomputador Desktop Intel Core i5',
    informedPrice: 5000.0,
    medianPrice: 3200.0,
    percentageAbove: 56.25,
    alertLevel: AlertLevel.WARNING,
    suggestion: 'Test suggestion',
    uf: 'SP',
    suggestedPriceLow: 2800.0,
    suggestedPriceHigh: 4200.0,
    benchmarkSampleCount: 245,
    acknowledgedAt: null,
    acknowledgedBy: null,
    acknowledgeNote: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    category: mockCategory as ItemCategory,
  };

  // Create mock query builder
  const createMockQueryBuilder = () => ({
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    groupBy: jest.fn().mockReturnThis(),
    clone: jest.fn().mockReturnThis(),
    getRawMany: jest.fn().mockResolvedValue([]),
    getRawOne: jest.fn().mockResolvedValue(null),
    getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
    getCount: jest.fn().mockResolvedValue(0),
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OverpriceAlertService,
        {
          provide: getRepositoryToken(OverpriceAlert),
          useValue: {
            findOne: jest.fn(),
            find: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            count: jest.fn(),
            createQueryBuilder: jest.fn(() => createMockQueryBuilder()),
          },
        },
        {
          provide: getRepositoryToken(ItemCategory),
          useValue: {
            findOne: jest.fn(),
            find: jest.fn(),
          },
        },
        {
          provide: RegionalBenchmarkService,
          useValue: {
            comparePriceToBenchmark: jest.fn(),
          },
        },
        {
          provide: TextSimilarityService,
          useValue: {
            jaccardSimilarity: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<OverpriceAlertService>(OverpriceAlertService);
    alertRepo = module.get<Repository<OverpriceAlert>>(
      getRepositoryToken(OverpriceAlert),
    );
    categoryRepo = module.get<Repository<ItemCategory>>(
      getRepositoryToken(ItemCategory),
    );
    benchmarkService = module.get<RegionalBenchmarkService>(
      RegionalBenchmarkService,
    );
    textSimilarityService = module.get<TextSimilarityService>(
      TextSimilarityService,
    );
    configService = module.get<ConfigService>(ConfigService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('checkPrice', () => {
    it('should return OK alert for price within acceptable range', async () => {
      // Price 10% above median
      const dto = {
        price: 3520.0, // 10% above 3200
        itemDescription: 'Microcomputador Desktop',
        uf: 'SP',
        categoryId: 'cat-001',
        persistAlert: false,
      };

      jest
        .spyOn(benchmarkService, 'comparePriceToBenchmark')
        .mockResolvedValue({
          inputPrice: dto.price,
          benchmark: mockBenchmarkResponse,
          deviation: 10.0,
          percentile: 60,
          risk: PriceRisk.LOW,
          suggestion: 'Test suggestion',
        });

      const result = await service.checkPrice(dto);

      expect(result.alertLevel).toBe(AlertLevel.OK);
      expect(result.percentageAbove).toBe(10.0);
      expect(result.benchmarkAvailable).toBe(true);
      expect(result.persisted).toBe(false);
    });

    it('should return ATTENTION alert for price 20-40% above median', async () => {
      // Price 30% above median
      const dto = {
        price: 4160.0, // 30% above 3200
        itemDescription: 'Microcomputador Desktop',
        uf: 'SP',
        categoryId: 'cat-001',
        persistAlert: false,
      };

      jest
        .spyOn(benchmarkService, 'comparePriceToBenchmark')
        .mockResolvedValue({
          inputPrice: dto.price,
          benchmark: mockBenchmarkResponse,
          deviation: 30.0,
          percentile: 75,
          risk: PriceRisk.MEDIUM,
          suggestion: 'Test suggestion',
        });

      const result = await service.checkPrice(dto);

      expect(result.alertLevel).toBe(AlertLevel.ATTENTION);
      expect(result.percentageAbove).toBe(30.0);
    });

    it('should return WARNING alert for price 40-60% above median', async () => {
      // Price 50% above median
      const dto = {
        price: 4800.0, // 50% above 3200
        itemDescription: 'Microcomputador Desktop',
        uf: 'SP',
        categoryId: 'cat-001',
        persistAlert: false,
      };

      jest
        .spyOn(benchmarkService, 'comparePriceToBenchmark')
        .mockResolvedValue({
          inputPrice: dto.price,
          benchmark: mockBenchmarkResponse,
          deviation: 50.0,
          percentile: 85,
          risk: PriceRisk.HIGH,
          suggestion: 'Test suggestion',
        });

      const result = await service.checkPrice(dto);

      expect(result.alertLevel).toBe(AlertLevel.WARNING);
      expect(result.percentageAbove).toBe(50.0);
    });

    it('should return CRITICAL alert for price >60% above median', async () => {
      // Price 70% above median
      const dto = {
        price: 5440.0, // 70% above 3200
        itemDescription: 'Microcomputador Desktop',
        uf: 'SP',
        categoryId: 'cat-001',
        persistAlert: false,
      };

      jest
        .spyOn(benchmarkService, 'comparePriceToBenchmark')
        .mockResolvedValue({
          inputPrice: dto.price,
          benchmark: mockBenchmarkResponse,
          deviation: 70.0,
          percentile: 95,
          risk: PriceRisk.CRITICAL,
          suggestion: 'Test suggestion',
        });

      const result = await service.checkPrice(dto);

      expect(result.alertLevel).toBe(AlertLevel.CRITICAL);
      expect(result.percentageAbove).toBe(70.0);
    });

    it('should persist alert when persistAlert is true', async () => {
      const dto = {
        price: 5000.0,
        itemDescription: 'Microcomputador Desktop',
        uf: 'SP',
        categoryId: 'cat-001',
        etpId: 'etp-001',
        persistAlert: true,
      };

      jest
        .spyOn(benchmarkService, 'comparePriceToBenchmark')
        .mockResolvedValue({
          inputPrice: dto.price,
          benchmark: mockBenchmarkResponse,
          deviation: 56.25,
          percentile: 90,
          risk: PriceRisk.HIGH,
          suggestion: 'Test suggestion',
        });

      jest
        .spyOn(alertRepo, 'create')
        .mockReturnValue(mockAlert as OverpriceAlert);
      jest
        .spyOn(alertRepo, 'save')
        .mockResolvedValue(mockAlert as OverpriceAlert);

      const result = await service.checkPrice(dto);

      expect(result.persisted).toBe(true);
      expect(result.alertId).toBe('alert-001');
      expect(alertRepo.create).toHaveBeenCalled();
      expect(alertRepo.save).toHaveBeenCalled();
    });

    it('should find category by code when categoryId not provided', async () => {
      const dto = {
        price: 5000.0,
        itemDescription: 'Microcomputador Desktop',
        uf: 'SP',
        categoryCode: 'CATMAT-44122',
        persistAlert: false,
      };

      jest
        .spyOn(categoryRepo, 'findOne')
        .mockResolvedValue(mockCategory as ItemCategory);
      jest
        .spyOn(benchmarkService, 'comparePriceToBenchmark')
        .mockResolvedValue({
          inputPrice: dto.price,
          benchmark: mockBenchmarkResponse,
          deviation: 56.25,
          percentile: 90,
          risk: PriceRisk.HIGH,
          suggestion: 'Test suggestion',
        });

      const result = await service.checkPrice(dto);

      expect(categoryRepo.findOne).toHaveBeenCalledWith({
        where: { code: 'CATMAT-44122' },
      });
      expect(result.category?.code).toBe('CATMAT-44122');
    });

    it('should return no benchmark response when category not found', async () => {
      const dto = {
        price: 5000.0,
        itemDescription: 'Unknown Item XYZ',
        uf: 'SP',
        persistAlert: false,
      };

      jest.spyOn(categoryRepo, 'findOne').mockResolvedValue(null);
      jest.spyOn(categoryRepo, 'find').mockResolvedValue([]);

      const result = await service.checkPrice(dto);

      expect(result.benchmarkAvailable).toBe(false);
      expect(result.alertLevel).toBe(AlertLevel.OK);
      expect(result.suggestion).toContain('Não foi possível comparar');
    });

    it('should handle benchmark not found gracefully', async () => {
      const dto = {
        price: 5000.0,
        itemDescription: 'Microcomputador Desktop',
        uf: 'SP',
        categoryId: 'cat-001',
        persistAlert: false,
      };

      jest
        .spyOn(categoryRepo, 'findOne')
        .mockResolvedValue(mockCategory as ItemCategory);
      jest
        .spyOn(benchmarkService, 'comparePriceToBenchmark')
        .mockRejectedValue(new NotFoundException('Benchmark not found'));

      const result = await service.checkPrice(dto);

      expect(result.benchmarkAvailable).toBe(false);
    });
  });

  describe('acknowledgeAlert', () => {
    it('should acknowledge an alert successfully', async () => {
      const alertId = 'alert-001';
      const userId = 'user-001';
      const dto = { note: 'Price justified by superior technical specs' };

      jest
        .spyOn(alertRepo, 'findOne')
        .mockResolvedValue(mockAlert as OverpriceAlert);
      jest.spyOn(alertRepo, 'save').mockResolvedValue({
        ...mockAlert,
        acknowledgedAt: new Date(),
        acknowledgedBy: userId,
        acknowledgeNote: dto.note,
      } as OverpriceAlert);

      const result = await service.acknowledgeAlert(alertId, userId, dto);

      expect(result.acknowledgedBy).toBe(userId);
      expect(result.acknowledgeNote).toBe(dto.note);
      expect(alertRepo.save).toHaveBeenCalled();
    });

    it('should throw NotFoundException when alert not found', async () => {
      jest.spyOn(alertRepo, 'findOne').mockResolvedValue(null);

      await expect(
        service.acknowledgeAlert('invalid-id', 'user-001', {}),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when alert already acknowledged', async () => {
      const acknowledgedAlert = {
        ...mockAlert,
        acknowledgedAt: new Date(),
        acknowledgedBy: 'user-001',
      };

      jest
        .spyOn(alertRepo, 'findOne')
        .mockResolvedValue(acknowledgedAlert as OverpriceAlert);

      await expect(
        service.acknowledgeAlert('alert-001', 'user-002', {}),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getAlertsByEtp', () => {
    it('should return alerts for an ETP', async () => {
      const alerts = [mockAlert];
      jest
        .spyOn(alertRepo, 'find')
        .mockResolvedValue(alerts as OverpriceAlert[]);

      const result = await service.getAlertsByEtp('etp-001');

      expect(result).toHaveLength(1);
      expect(result[0].etpId).toBe('etp-001');
      expect(alertRepo.find).toHaveBeenCalledWith({
        where: { etpId: 'etp-001' },
        relations: ['category'],
        order: { createdAt: 'DESC' },
      });
    });

    it('should return empty array when no alerts found', async () => {
      jest.spyOn(alertRepo, 'find').mockResolvedValue([]);

      const result = await service.getAlertsByEtp('etp-002');

      expect(result).toHaveLength(0);
    });
  });

  describe('getAlertById', () => {
    it('should return alert by ID', async () => {
      jest
        .spyOn(alertRepo, 'findOne')
        .mockResolvedValue(mockAlert as OverpriceAlert);

      const result = await service.getAlertById('alert-001');

      expect(result.id).toBe('alert-001');
    });

    it('should throw NotFoundException when alert not found', async () => {
      jest.spyOn(alertRepo, 'findOne').mockResolvedValue(null);

      await expect(service.getAlertById('invalid-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getAlertSummary', () => {
    it('should return alert summary statistics', async () => {
      const mockQueryBuilder = createMockQueryBuilder();
      mockQueryBuilder.getRawMany.mockResolvedValue([
        { level: 'OK', count: '5' },
        { level: 'ATTENTION', count: '3' },
        { level: 'WARNING', count: '2' },
        { level: 'CRITICAL', count: '1' },
      ]);
      mockQueryBuilder.getCount
        .mockResolvedValueOnce(4) // acknowledged
        .mockResolvedValueOnce(11); // total
      mockQueryBuilder.getRawOne.mockResolvedValue({ avg: '35.5' });

      jest
        .spyOn(alertRepo, 'createQueryBuilder')
        .mockReturnValue(mockQueryBuilder as any);

      const result = await service.getAlertSummary();

      expect(result.byLevel.ok).toBe(5);
      expect(result.byLevel.attention).toBe(3);
      expect(result.byLevel.warning).toBe(2);
      expect(result.byLevel.critical).toBe(1);
    });
  });

  describe('getThresholds', () => {
    it('should return current threshold configuration', () => {
      const thresholds = service.getThresholds();

      expect(thresholds.attention).toBe(20);
      expect(thresholds.warning).toBe(40);
      expect(thresholds.critical).toBe(60);
    });
  });

  describe('suggestion generation', () => {
    it('should generate positive message for price below median', async () => {
      const dto = {
        price: 3000.0, // Below median of 3200
        itemDescription: 'Microcomputador Desktop',
        uf: 'SP',
        categoryId: 'cat-001',
        persistAlert: false,
      };

      jest
        .spyOn(benchmarkService, 'comparePriceToBenchmark')
        .mockResolvedValue({
          inputPrice: dto.price,
          benchmark: mockBenchmarkResponse,
          deviation: -6.25,
          percentile: 40,
          risk: PriceRisk.LOW,
          suggestion: 'Test suggestion',
        });

      const result = await service.checkPrice(dto);

      expect(result.suggestion).toContain('abaixo ou igual');
      expect(result.suggestion).toContain('Excelente valor');
    });
  });
});
