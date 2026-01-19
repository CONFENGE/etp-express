import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { ItemNormalizationController } from '../controllers/item-normalization.controller';
import {
  NormalizedContractItem,
  ClassificationMethod,
} from '../../../entities/normalized-contract-item.entity';
import {
  ItemCategory,
  ItemCategoryType,
} from '../../../entities/item-category.entity';
import {
  ContractPrice,
  ContractPriceModalidade,
  ContractPriceFonte,
} from '../../../entities/contract-price.entity';
import { ReviewItemDto } from '../dto/review-item.dto';

describe('ItemNormalizationController', () => {
  let controller: ItemNormalizationController;
  let normalizedItemRepo: Repository<NormalizedContractItem>;
  let categoryRepo: Repository<ItemCategory>;

  // Mock data
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

  const mockNormalizedItem: NormalizedContractItem = {
    id: 'norm-uuid-1',
    originalItemId: mockContractPrice.id,
    originalItem: mockContractPrice,
    categoryId: mockCategory.id,
    category: mockCategory,
    normalizedDescription: 'PAPEL A4 BRANCO 500 FOLHAS',
    normalizedUnit: 'PCT',
    normalizedPrice: 25.0,
    confidence: 0.65,
    classificationMethod: ClassificationMethod.LLM,
    requiresReview: true,
    manuallyReviewed: false,
    reviewedBy: null,
    reviewedAt: null,
    reviewNotes: null,
    keywords: ['papel', 'a4', 'folhas'],
    estimatedType: 'material',
    processingTimeMs: 150,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockQueryBuilder = {
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    getMany: jest.fn(),
    getRawOne: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ItemNormalizationController],
      providers: [
        {
          provide: getRepositoryToken(NormalizedContractItem),
          useValue: {
            findOne: jest.fn(),
            count: jest.fn(),
            save: jest.fn(),
            createQueryBuilder: jest.fn(() => mockQueryBuilder),
          },
        },
        {
          provide: getRepositoryToken(ItemCategory),
          useValue: {
            findOne: jest.fn(),
            createQueryBuilder: jest.fn(() => mockQueryBuilder),
          },
        },
      ],
    }).compile();

    controller = module.get<ItemNormalizationController>(
      ItemNormalizationController,
    );
    normalizedItemRepo = module.get<Repository<NormalizedContractItem>>(
      getRepositoryToken(NormalizedContractItem),
    );
    categoryRepo = module.get<Repository<ItemCategory>>(
      getRepositoryToken(ItemCategory),
    );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getPendingReview', () => {
    it('should return items pending review with default parameters', async () => {
      const mockItems = [mockNormalizedItem];
      mockQueryBuilder.getMany.mockResolvedValue(mockItems);

      const result = await controller.getPendingReview();

      expect(result).toEqual(mockItems);
      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        'item.manuallyReviewed = :reviewed',
        { reviewed: false },
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'item.confidence >= :minConf',
        { minConf: 0 },
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'item.confidence <= :maxConf',
        { maxConf: 0.7 },
      );
      expect(mockQueryBuilder.take).toHaveBeenCalledWith(20);
    });

    it('should apply custom confidence filters', async () => {
      mockQueryBuilder.getMany.mockResolvedValue([]);

      await controller.getPendingReview(50, 0.2, 0.5);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'item.confidence >= :minConf',
        { minConf: 0.2 },
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'item.confidence <= :maxConf',
        { maxConf: 0.5 },
      );
      expect(mockQueryBuilder.take).toHaveBeenCalledWith(50);
    });

    it('should filter by category type when specified', async () => {
      mockQueryBuilder.getMany.mockResolvedValue([]);

      await controller.getPendingReview(20, 0, 0.7, 'CATMAT');

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'category.type = :categoryType',
        { categoryType: 'CATMAT' },
      );
    });

    it('should clamp limit to valid range', async () => {
      mockQueryBuilder.getMany.mockResolvedValue([]);

      await controller.getPendingReview(500); // Exceeds max of 100

      expect(mockQueryBuilder.take).toHaveBeenCalledWith(100);
    });
  });

  describe('reviewItem', () => {
    const userId = 'user-uuid-1';

    it('should update item with new category', async () => {
      const newCategory: ItemCategory = {
        ...mockCategory,
        id: 'cat-uuid-2',
        code: 'CATSER-10391',
        name: 'Serviços de TI',
        type: ItemCategoryType.CATSER,
      };

      const dto: ReviewItemDto = {
        categoryCode: 'CATSER-10391',
        reviewNotes: 'Reclassificado para serviço',
      };

      jest
        .spyOn(normalizedItemRepo, 'findOne')
        .mockResolvedValue({ ...mockNormalizedItem });
      jest.spyOn(categoryRepo, 'findOne').mockResolvedValue(newCategory);
      jest
        .spyOn(normalizedItemRepo, 'save')
        .mockImplementation(async (item) => item as NormalizedContractItem);

      const result = await controller.reviewItem(
        mockNormalizedItem.id,
        dto,
        userId,
      );

      expect(result.category).toEqual(newCategory);
      expect(result.categoryId).toEqual(newCategory.id);
      expect(result.manuallyReviewed).toBe(true);
      expect(result.confidence).toBe(1.0);
      expect(result.classificationMethod).toBe(ClassificationMethod.MANUAL);
      expect(result.reviewedBy).toBe(userId);
      expect(result.reviewNotes).toBe('Reclassificado para serviço');
      expect(result.requiresReview).toBe(false);
    });

    it('should update item with new description', async () => {
      const dto: ReviewItemDto = {
        normalizedDescription: 'PAPEL SULFITE A4 75G BRANCO RESMA 500 FL',
      };

      jest
        .spyOn(normalizedItemRepo, 'findOne')
        .mockResolvedValue({ ...mockNormalizedItem });
      jest
        .spyOn(normalizedItemRepo, 'save')
        .mockImplementation(async (item) => item as NormalizedContractItem);

      const result = await controller.reviewItem(
        mockNormalizedItem.id,
        dto,
        userId,
      );

      expect(result.normalizedDescription).toBe(
        'PAPEL SULFITE A4 75G BRANCO RESMA 500 FL',
      );
      expect(result.manuallyReviewed).toBe(true);
      expect(result.confidence).toBe(1.0);
    });

    it('should throw NotFoundException if item not found', async () => {
      jest.spyOn(normalizedItemRepo, 'findOne').mockResolvedValue(null);

      await expect(
        controller.reviewItem('non-existent-id', {}, userId),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if category not found', async () => {
      const dto: ReviewItemDto = {
        categoryCode: 'INVALID-CODE',
      };

      jest
        .spyOn(normalizedItemRepo, 'findOne')
        .mockResolvedValue({ ...mockNormalizedItem });
      jest.spyOn(categoryRepo, 'findOne').mockResolvedValue(null);

      await expect(
        controller.reviewItem(mockNormalizedItem.id, dto, userId),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getCategories', () => {
    it('should return active categories with default parameters', async () => {
      const mockCategories = [mockCategory];
      mockQueryBuilder.getMany.mockResolvedValue(mockCategories);

      const result = await controller.getCategories();

      expect(result).toEqual(mockCategories);
      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        'category.active = :active',
        { active: true },
      );
      expect(mockQueryBuilder.take).toHaveBeenCalledWith(50);
    });

    it('should filter by category type', async () => {
      mockQueryBuilder.getMany.mockResolvedValue([]);

      await controller.getCategories('CATMAT');

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'category.type = :type',
        { type: 'CATMAT' },
      );
    });

    it('should search by name or code', async () => {
      mockQueryBuilder.getMany.mockResolvedValue([]);

      await controller.getCategories(undefined, 'papel');

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        '(category.name ILIKE :search OR category.code ILIKE :search)',
        { search: '%papel%' },
      );
    });

    it('should clamp limit to valid range', async () => {
      mockQueryBuilder.getMany.mockResolvedValue([]);

      await controller.getCategories(undefined, undefined, 500);

      expect(mockQueryBuilder.take).toHaveBeenCalledWith(200);
    });
  });

  describe('getStats', () => {
    it('should return normalization statistics', async () => {
      jest
        .spyOn(normalizedItemRepo, 'count')
        .mockImplementation(async (options) => {
          if (!options) return 1000; // total
          if ((options as any).where?.manuallyReviewed === true) return 250; // reviewed
          if ((options as any).where?.confidence) return 180; // lowConfidence
          return 0;
        });
      mockQueryBuilder.getRawOne.mockResolvedValue({ avgConfidence: '0.82' });

      const result = await controller.getStats();

      expect(result.total).toBe(1000);
      expect(result.reviewed).toBe(250);
      expect(result.pending).toBe(750);
      expect(result.lowConfidence).toBe(180);
      expect(result.accuracy).toBeCloseTo(0.25, 2);
      expect(result.averageConfidence).toBe(0.82);
    });

    it('should handle empty database', async () => {
      jest.spyOn(normalizedItemRepo, 'count').mockResolvedValue(0);
      mockQueryBuilder.getRawOne.mockResolvedValue({ avgConfidence: null });

      const result = await controller.getStats();

      expect(result.total).toBe(0);
      expect(result.reviewed).toBe(0);
      expect(result.pending).toBe(0);
      expect(result.lowConfidence).toBe(0);
      expect(result.accuracy).toBe(0);
      expect(result.averageConfidence).toBe(0);
    });
  });

  describe('getItem', () => {
    it('should return item by ID', async () => {
      jest
        .spyOn(normalizedItemRepo, 'findOne')
        .mockResolvedValue(mockNormalizedItem);

      const result = await controller.getItem(mockNormalizedItem.id);

      expect(result).toEqual(mockNormalizedItem);
      expect(normalizedItemRepo.findOne).toHaveBeenCalledWith({
        where: { id: mockNormalizedItem.id },
        relations: ['category', 'originalItem'],
      });
    });

    it('should throw NotFoundException if item not found', async () => {
      jest.spyOn(normalizedItemRepo, 'findOne').mockResolvedValue(null);

      await expect(controller.getItem('non-existent-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
