import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  NormalizationPipelineService,
  ProcessingResult,
} from '../services/normalization-pipeline.service';
import { ItemNormalizationService } from '../services/item-normalization.service';
import {
  NormalizedContractItem,
  ClassificationMethod,
} from '../../../entities/normalized-contract-item.entity';
import {
  ContractPrice,
  ContractPriceModalidade,
  ContractPriceFonte,
} from '../../../entities/contract-price.entity';
import {
  ItemCategory,
  ItemCategoryType,
} from '../../../entities/item-category.entity';
import { NormalizedItem, ContractItem } from '../dto/normalized-item.dto';

describe('NormalizationPipelineService', () => {
  let service: NormalizationPipelineService;
  let normalizationService: jest.Mocked<ItemNormalizationService>;
  let normalizedItemRepo: jest.Mocked<Repository<NormalizedContractItem>>;
  let contractPriceRepo: jest.Mocked<Repository<ContractPrice>>;
  let categoryRepo: jest.Mocked<Repository<ItemCategory>>;

  const mockCategory: ItemCategory = {
    id: 'cat-uuid-1',
    code: 'CATMAT-44122',
    name: 'Material de Escritório',
    type: ItemCategoryType.CATMAT,
    parentCode: null,
    parent: null,
    children: [],
    description: 'Materiais diversos de escritório',
    level: 0,
    keywords: ['papel', 'caneta', 'escritorio'],
    commonUnits: ['UN', 'PCT', 'CX'],
    active: true,
    itemCount: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockContractPrice: ContractPrice = {
    id: 'cp-uuid-1',
    organizationId: 'org-uuid-1',
    organization: null,
    codigoItem: 'ITEM-001',
    descricao: 'Papel A4 500 folhas',
    unidade: 'PACOTE',
    precoUnitario: 25.0 as unknown as number,
    quantidade: 100 as unknown as number,
    valorTotal: 2500.0 as unknown as number,
    dataHomologacao: new Date('2026-01-15'),
    modalidade: ContractPriceModalidade.PREGAO_ELETRONICO,
    fonte: ContractPriceFonte.PNCP,
    externalId: 'PNCP-2026-001',
    uasgCodigo: '123456',
    uasgNome: 'Órgão Teste',
    uf: 'SP',
    municipio: 'São Paulo',
    cnpjFornecedor: '12345678000199',
    razaoSocial: 'Fornecedor Teste LTDA',
    numeroProcesso: '2026/001',
    urlOrigem: 'https://pncp.gov.br/item/1',
    metadata: { codigoCatmat: 'CATMAT-44122' },
    fetchedAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockNormalizedResult: NormalizedItem = {
    id: 'cp-uuid-1',
    description: 'Papel A4 500 folhas',
    unit: 'PACOTE',
    source: 'pncp',
    category: {
      id: mockCategory.id,
      code: mockCategory.code,
      name: mockCategory.name,
      type: mockCategory.type,
    },
    normalizedUnit: 'PCT',
    features: {
      description: 'papel a4 500 folhas',
      keywords: ['papel', 'a4', 'folhas'],
      unit: 'PACOTE',
      estimatedCategory: 'material',
    },
    confidence: 0.85,
    classificationMethod: 'llm',
    normalizedAt: new Date(),
    requiresReview: false,
  };

  beforeEach(async () => {
    const mockNormalizedItemRepo = {
      find: jest.fn(),
      findOne: jest.fn(),
      save: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
      createQueryBuilder: jest.fn(() => ({
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
        getRawOne: jest.fn().mockResolvedValue({ avg: 0.75 }),
        getRawMany: jest.fn().mockResolvedValue([]),
      })),
    };

    const mockContractPriceRepo = {
      find: jest.fn(),
      count: jest.fn(),
    };

    const mockCategoryRepo = {
      update: jest.fn(),
    };

    const mockNormalizationService = {
      normalizeItem: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NormalizationPipelineService,
        {
          provide: ItemNormalizationService,
          useValue: mockNormalizationService,
        },
        {
          provide: getRepositoryToken(NormalizedContractItem),
          useValue: mockNormalizedItemRepo,
        },
        {
          provide: getRepositoryToken(ContractPrice),
          useValue: mockContractPriceRepo,
        },
        {
          provide: getRepositoryToken(ItemCategory),
          useValue: mockCategoryRepo,
        },
      ],
    }).compile();

    service = module.get<NormalizationPipelineService>(
      NormalizationPipelineService,
    );
    normalizationService = module.get(ItemNormalizationService);
    normalizedItemRepo = module.get(getRepositoryToken(NormalizedContractItem));
    contractPriceRepo = module.get(getRepositoryToken(ContractPrice));
    categoryRepo = module.get(getRepositoryToken(ItemCategory));
  });

  describe('processNewItems', () => {
    it('should process unprocessed items successfully', async () => {
      // Setup: 2 unprocessed items
      normalizedItemRepo.createQueryBuilder.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      } as any);

      contractPriceRepo.find.mockResolvedValue([
        mockContractPrice,
        { ...mockContractPrice, id: 'cp-uuid-2' },
      ]);

      normalizedItemRepo.findOne.mockResolvedValue(null);
      normalizationService.normalizeItem.mockResolvedValue(
        mockNormalizedResult,
      );
      normalizedItemRepo.save.mockImplementation((entity) =>
        Promise.resolve({
          ...entity,
          id: 'norm-uuid-1',
        } as NormalizedContractItem),
      );
      normalizedItemRepo.count.mockResolvedValue(1);

      const result = await service.processNewItems({ batchSize: 10 });

      expect(result.processed).toBe(2);
      expect(result.successful).toBe(2);
      expect(result.errors).toBe(0);
      expect(normalizationService.normalizeItem).toHaveBeenCalledTimes(2);
    });

    it('should flag low confidence items for review', async () => {
      normalizedItemRepo.createQueryBuilder.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      } as any);

      contractPriceRepo.find.mockResolvedValue([mockContractPrice]);
      normalizedItemRepo.findOne.mockResolvedValue(null);

      const lowConfidenceResult: NormalizedItem = {
        ...mockNormalizedResult,
        confidence: 0.4,
        requiresReview: true,
        category: null,
      };

      normalizationService.normalizeItem.mockResolvedValue(lowConfidenceResult);
      normalizedItemRepo.save.mockImplementation((entity) =>
        Promise.resolve({
          ...entity,
          id: 'norm-uuid-1',
          requiresReview: true,
        } as NormalizedContractItem),
      );

      const result = await service.processNewItems({
        confidenceThreshold: 0.7,
      });

      expect(result.lowConfidence).toBe(1);
      expect(result.successful).toBe(1);
    });

    it('should handle errors gracefully', async () => {
      normalizedItemRepo.createQueryBuilder.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      } as any);

      contractPriceRepo.find.mockResolvedValue([mockContractPrice]);
      normalizedItemRepo.findOne.mockResolvedValue(null);
      normalizationService.normalizeItem.mockRejectedValue(
        new Error('Normalization failed'),
      );

      const result = await service.processNewItems();

      expect(result.errors).toBe(1);
      expect(result.errorDetails).toHaveLength(1);
      expect(result.errorDetails[0].error).toBe('Normalization failed');
    });

    it('should skip if already processing', async () => {
      // Simulate processing in progress
      (service as any).isProcessing = true;

      const result = await service.processNewItems();

      expect(result.processed).toBe(0);
      expect(result.processingTimeMs).toBe(0);

      // Reset for other tests
      (service as any).isProcessing = false;
    });
  });

  describe('processItem', () => {
    it('should skip already processed items', async () => {
      const existingNormalized = {
        id: 'norm-uuid-1',
        originalItemId: mockContractPrice.id,
      } as NormalizedContractItem;

      normalizedItemRepo.findOne.mockResolvedValue(existingNormalized);

      const result = await service.processItem(mockContractPrice);

      expect(result).toEqual(existingNormalized);
      expect(normalizationService.normalizeItem).not.toHaveBeenCalled();
    });

    it('should process new item and save result', async () => {
      normalizedItemRepo.findOne.mockResolvedValue(null);
      normalizationService.normalizeItem.mockResolvedValue(
        mockNormalizedResult,
      );

      const savedRecord = {
        id: 'norm-uuid-1',
        originalItemId: mockContractPrice.id,
        categoryId: mockCategory.id,
        confidence: 0.85,
        requiresReview: false,
      } as NormalizedContractItem;

      normalizedItemRepo.save.mockResolvedValue(savedRecord);
      normalizedItemRepo.count.mockResolvedValue(5);

      const result = await service.processItem(mockContractPrice);

      expect(result).toBeDefined();
      expect(normalizedItemRepo.save).toHaveBeenCalled();
      expect(categoryRepo.update).toHaveBeenCalledWith(mockCategory.id, {
        itemCount: 5,
      });
    });

    it('should mark item for review when confidence is low', async () => {
      normalizedItemRepo.findOne.mockResolvedValue(null);

      const lowConfidenceResult: NormalizedItem = {
        ...mockNormalizedResult,
        confidence: 0.3,
        category: null,
        requiresReview: true,
      };

      normalizationService.normalizeItem.mockResolvedValue(lowConfidenceResult);
      normalizedItemRepo.save.mockImplementation((entity) =>
        Promise.resolve({
          ...entity,
          id: 'norm-uuid-1',
        } as NormalizedContractItem),
      );

      const result = await service.processItem(mockContractPrice, 0.7);

      expect(result?.requiresReview).toBe(true);
    });
  });

  describe('getUnprocessedItems', () => {
    it('should return items not yet processed', async () => {
      normalizedItemRepo.createQueryBuilder.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        getMany: jest
          .fn()
          .mockResolvedValue([{ originalItemId: 'processed-id' }]),
      } as any);

      contractPriceRepo.find.mockResolvedValue([
        mockContractPrice,
        { ...mockContractPrice, id: 'processed-id' },
      ]);

      const result = await service.getUnprocessedItems(10);

      // Should filter out the processed one
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(mockContractPrice.id);
    });
  });

  describe('getStatistics', () => {
    it('should return correct pipeline statistics', async () => {
      contractPriceRepo.count.mockResolvedValue(100);
      normalizedItemRepo.count
        .mockResolvedValueOnce(80) // total normalized
        .mockResolvedValueOnce(10) // review pending
        .mockResolvedValueOnce(5); // review completed

      normalizedItemRepo.createQueryBuilder.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({ avg: '0.75' }),
        getRawMany: jest.fn().mockResolvedValue([
          { method: 'llm', count: '60' },
          { method: 'source', count: '20' },
        ]),
      } as any);

      const stats = await service.getStatistics();

      expect(stats.totalItems).toBe(100);
      expect(stats.processedItems).toBe(80);
      expect(stats.pendingItems).toBe(20);
      expect(stats.reviewPending).toBe(10);
      expect(stats.reviewCompleted).toBe(5);
      expect(stats.averageConfidence).toBe(0.75);
      expect(stats.byMethod[ClassificationMethod.LLM]).toBe(60);
      expect(stats.byMethod[ClassificationMethod.SOURCE]).toBe(20);
    });
  });

  describe('getItemsForReview', () => {
    it('should return items requiring review ordered by confidence', async () => {
      const reviewItems = [
        {
          id: 'norm-1',
          confidence: 0.3,
          requiresReview: true,
          manuallyReviewed: false,
        },
        {
          id: 'norm-2',
          confidence: 0.4,
          requiresReview: true,
          manuallyReviewed: false,
        },
      ] as NormalizedContractItem[];

      normalizedItemRepo.find.mockResolvedValue(reviewItems);

      const result = await service.getItemsForReview(50, 0);

      expect(result).toHaveLength(2);
      expect(normalizedItemRepo.find).toHaveBeenCalledWith({
        where: { requiresReview: true, manuallyReviewed: false },
        relations: ['originalItem', 'category'],
        order: { confidence: 'ASC', createdAt: 'DESC' },
        skip: 0,
        take: 50,
      });
    });
  });

  describe('reprocessLowConfidenceItems', () => {
    it('should delete and reprocess low confidence items', async () => {
      const lowConfidenceItem = {
        id: 'norm-1',
        originalItemId: mockContractPrice.id,
        confidence: 0.3,
        manuallyReviewed: false,
        originalItem: mockContractPrice,
      } as NormalizedContractItem;

      normalizedItemRepo.find.mockResolvedValue([lowConfidenceItem]);
      normalizedItemRepo.delete.mockResolvedValue({ affected: 1, raw: {} });
      normalizedItemRepo.findOne.mockResolvedValue(null);
      normalizationService.normalizeItem.mockResolvedValue({
        ...mockNormalizedResult,
        confidence: 0.8,
      });
      normalizedItemRepo.save.mockImplementation((entity) =>
        Promise.resolve({
          ...entity,
          id: 'norm-new',
          confidence: 0.8,
        } as NormalizedContractItem),
      );
      normalizedItemRepo.count.mockResolvedValue(1);

      const result = await service.reprocessLowConfidenceItems(0.5, 50);

      expect(result.processed).toBe(1);
      expect(normalizedItemRepo.delete).toHaveBeenCalledWith(
        lowConfidenceItem.id,
      );
      expect(normalizationService.normalizeItem).toHaveBeenCalled();
    });
  });

  describe('scheduledNormalization', () => {
    it('should call processNewItems when scheduled', async () => {
      normalizedItemRepo.createQueryBuilder.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      } as any);
      contractPriceRepo.find.mockResolvedValue([]);

      await service.scheduledNormalization();

      // Verify the method runs without error
      expect(contractPriceRepo.find).toHaveBeenCalled();
    });
  });

  describe('classification method mapping', () => {
    it('should correctly map classification methods', async () => {
      normalizedItemRepo.findOne.mockResolvedValue(null);
      normalizedItemRepo.save.mockImplementation((entity) =>
        Promise.resolve({
          ...entity,
          id: 'norm-uuid-1',
        } as NormalizedContractItem),
      );
      normalizedItemRepo.count.mockResolvedValue(1);

      // Test different classification methods
      const methods = ['source', 'llm', 'similarity', 'manual'];

      for (const method of methods) {
        normalizationService.normalizeItem.mockResolvedValue({
          ...mockNormalizedResult,
          classificationMethod: method as any,
        });

        await service.processItem(
          { ...mockContractPrice, id: `cp-${method}` },
          0.7,
        );
      }

      expect(normalizedItemRepo.save).toHaveBeenCalledTimes(4);
    });
  });
});
