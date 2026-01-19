import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, ILike } from 'typeorm';
import { ItemNormalizationService } from '../services/item-normalization.service';
import {
  ItemCategory,
  ItemCategoryType,
} from '../../../entities/item-category.entity';
import { OpenAIService } from '../../orchestrator/llm/openai.service';
import { ContractItem } from '../dto/normalized-item.dto';

describe('ItemNormalizationService', () => {
  let service: ItemNormalizationService;
  let categoryRepository: jest.Mocked<Repository<ItemCategory>>;
  let llmService: jest.Mocked<OpenAIService>;

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

  const mockServiceCategory: ItemCategory = {
    id: 'cat-uuid-2',
    code: 'CATSER-10391',
    name: 'Serviços de TI',
    type: ItemCategoryType.CATSER,
    parentCode: null,
    parent: null,
    children: [],
    description: 'Serviços de tecnologia da informação',
    level: 0,
    keywords: ['suporte', 'manutencao', 'ti'],
    commonUnits: ['H', 'MES', 'SV'],
    active: true,
    itemCount: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const mockCategoryRepository = {
      find: jest.fn(),
      findOne: jest.fn(),
    };

    const mockLlmService = {
      generateCompletion: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ItemNormalizationService,
        {
          provide: getRepositoryToken(ItemCategory),
          useValue: mockCategoryRepository,
        },
        {
          provide: OpenAIService,
          useValue: mockLlmService,
        },
      ],
    }).compile();

    service = module.get<ItemNormalizationService>(ItemNormalizationService);
    categoryRepository = module.get(getRepositoryToken(ItemCategory));
    llmService = module.get(OpenAIService);
  });

  describe('normalizeItem', () => {
    it('should normalize item with existing CATMAT code', async () => {
      const item: ContractItem = {
        id: 'item-1',
        description: 'Papel A4 500 folhas',
        unit: 'PACOTE',
        quantity: 100,
        unitPrice: 25.0,
        source: 'pncp',
        catmatCode: 'CATMAT-44122',
      };

      categoryRepository.findOne.mockResolvedValue(mockCategory);

      const result = await service.normalizeItem(item);

      expect(result.category).not.toBeNull();
      expect(result.category?.code).toBe('CATMAT-44122');
      expect(result.confidence).toBe(1.0);
      expect(result.classificationMethod).toBe('source');
      expect(result.normalizedUnit).toBe('PCT');
      expect(result.requiresReview).toBe(false);
    });

    it('should normalize item with LLM classification', async () => {
      const item: ContractItem = {
        id: 'item-2',
        description: 'Notebook Dell Latitude 5420 i5 16GB',
        unit: 'UNIDADE',
        quantity: 50,
        unitPrice: 5500.0,
        source: 'pncp',
      };

      categoryRepository.findOne
        .mockResolvedValueOnce(null) // No existing code
        .mockResolvedValueOnce(mockCategory); // Found by LLM code

      categoryRepository.find.mockResolvedValue([mockCategory]);

      llmService.generateCompletion.mockResolvedValue({
        content: 'CATMAT-44122',
        tokens: 10,
        model: 'gpt-4.1-nano',
        finishReason: 'stop',
      });

      const result = await service.normalizeItem(item);

      expect(result.category).not.toBeNull();
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.classificationMethod).toBe('llm');
      expect(result.normalizedUnit).toBe('UN');
      expect(llmService.generateCompletion).toHaveBeenCalled();
    });

    it('should return low confidence when LLM returns UNKNOWN', async () => {
      const item: ContractItem = {
        id: 'item-3',
        description: 'Item genérico sem descrição clara',
        unit: 'UN',
        source: 'manual',
      };

      categoryRepository.findOne.mockResolvedValue(null);
      categoryRepository.find.mockResolvedValue([mockCategory]);

      llmService.generateCompletion.mockResolvedValue({
        content: 'UNKNOWN',
        tokens: 5,
        model: 'gpt-4.1-nano',
        finishReason: 'stop',
      });

      const result = await service.normalizeItem(item);

      expect(result.category).toBeNull();
      expect(result.confidence).toBe(0.3);
      expect(result.requiresReview).toBe(true);
    });

    it('should handle LLM errors gracefully', async () => {
      const item: ContractItem = {
        id: 'item-4',
        description: 'Teste de erro',
        unit: 'UN',
        source: 'manual',
      };

      categoryRepository.findOne.mockResolvedValue(null);
      categoryRepository.find.mockResolvedValue([mockCategory]);
      llmService.generateCompletion.mockRejectedValue(new Error('LLM Error'));

      const result = await service.normalizeItem(item);

      // LLM error is caught inside classifyWithLlm, which returns confidence 0
      // This triggers low confidence path, not the outer try-catch
      expect(result.category).toBeNull();
      expect(result.confidence).toBe(0);
      expect(result.requiresReview).toBe(true);
      // Review notes will have the default low confidence message
      expect(result.reviewNotes).toBeDefined();
    });
  });

  describe('extractFeatures', () => {
    it('should extract features from item description', () => {
      const item: ContractItem = {
        id: 'feat-1',
        description: 'PAPEL SULFITE A4 BRANCO 75G/M² CAIXA COM 10 RESMAS',
        unit: 'CX',
        quantity: 50,
        source: 'pncp',
      };

      const features = service.extractFeatures(item);

      expect(features.description).toBeDefined();
      expect(features.keywords.length).toBeGreaterThan(0);
      expect(features.keywords).toContain('papel');
      expect(features.keywords).toContain('sulfite');
      expect(features.estimatedCategory).toBe('material');
    });

    it('should estimate CATSER for service descriptions', () => {
      const item: ContractItem = {
        id: 'feat-2',
        description: 'Serviço de manutenção preventiva em ar condicionado',
        unit: 'MENSAL',
        source: 'comprasgov',
      };

      const features = service.extractFeatures(item);

      expect(features.estimatedCategory).toBe('servico');
    });

    it('should estimate CATMAT for material descriptions', () => {
      const item: ContractItem = {
        id: 'feat-3',
        description: 'Computador Desktop Intel Core i7 32GB RAM',
        unit: 'UN',
        source: 'pncp',
      };

      const features = service.extractFeatures(item);

      expect(features.estimatedCategory).toBe('material');
    });
  });

  describe('normalizeUnit', () => {
    it('should normalize common unit variations', () => {
      expect(service.normalizeUnit('UNIDADE')).toBe('UN');
      expect(service.normalizeUnit('UNID.')).toBe('UN');
      expect(service.normalizeUnit('PACOTE')).toBe('PCT');
      expect(service.normalizeUnit('CAIXA')).toBe('CX');
      expect(service.normalizeUnit('QUILOGRAMA')).toBe('KG');
      expect(service.normalizeUnit('LITRO')).toBe('L');
      expect(service.normalizeUnit('METRO QUADRADO')).toBe('M2');
      expect(service.normalizeUnit('METRO CÚBICO')).toBe('M3');
      expect(service.normalizeUnit('HORA')).toBe('H');
      expect(service.normalizeUnit('MENSAL')).toBe('MES');
    });

    it('should return original unit if not in mapping', () => {
      expect(service.normalizeUnit('CUSTOM')).toBe('CUSTOM');
    });

    it('should return UN for empty/null unit', () => {
      expect(service.normalizeUnit('')).toBe('UN');
      expect(service.normalizeUnit(null as any)).toBe('UN');
    });
  });

  describe('getCategories', () => {
    it('should return all active categories', async () => {
      categoryRepository.find.mockResolvedValue([
        mockCategory,
        mockServiceCategory,
      ]);

      const result = await service.getCategories();

      expect(result).toHaveLength(2);
      expect(categoryRepository.find).toHaveBeenCalledWith({
        where: { active: true },
        order: { code: 'ASC' },
      });
    });

    it('should filter by category type', async () => {
      categoryRepository.find.mockResolvedValue([mockCategory]);

      const result = await service.getCategories(ItemCategoryType.CATMAT);

      expect(result).toHaveLength(1);
      expect(categoryRepository.find).toHaveBeenCalledWith({
        where: { active: true, type: ItemCategoryType.CATMAT },
        order: { code: 'ASC' },
      });
    });
  });

  describe('suggestCategories', () => {
    it('should suggest categories based on description', async () => {
      categoryRepository.find.mockResolvedValue([mockCategory]);

      const suggestions = await service.suggestCategories('papel sulfite A4');

      expect(categoryRepository.find).toHaveBeenCalled();
      // Suggestions depend on keyword matching
    });

    it('should limit results', async () => {
      const manyCategories = Array(10)
        .fill(null)
        .map((_, i) => ({
          ...mockCategory,
          id: `cat-uuid-${i}`,
          code: `CATMAT-${44122 + i}`,
        }));

      categoryRepository.find.mockResolvedValue(manyCategories);

      const suggestions = await service.suggestCategories('material', 3);

      expect(suggestions.length).toBeLessThanOrEqual(3);
    });
  });

  describe('integration scenarios', () => {
    it('should handle complete flow for office supplies', async () => {
      const item: ContractItem = {
        id: 'office-1',
        description:
          'Caneta esferográfica azul ponta média caixa c/ 50 unidades',
        unit: 'CX',
        quantity: 20,
        unitPrice: 35.0,
        source: 'pncp',
        sourceReference: 'PNCP-2026-001234',
      };

      categoryRepository.findOne.mockResolvedValue(null);
      categoryRepository.find.mockResolvedValue([mockCategory]);
      llmService.generateCompletion.mockResolvedValue({
        content: 'CATMAT-44122',
        tokens: 8,
        model: 'gpt-4.1-nano',
        finishReason: 'stop',
      });

      const result = await service.normalizeItem(item);

      expect(result.features.keywords).toContain('caneta');
      expect(result.features.estimatedCategory).toBe('material');
      expect(result.normalizedUnit).toBe('CX');
      expect(result.classificationMethod).toBe('llm');
    });

    it('should handle IT service normalization', async () => {
      const item: ContractItem = {
        id: 'it-service-1',
        description:
          'Contratação de serviço de suporte técnico em TI com atendimento remoto',
        unit: 'MENSAL',
        quantity: 12,
        unitPrice: 15000.0,
        source: 'comprasgov',
      };

      categoryRepository.findOne.mockResolvedValue(null);
      categoryRepository.find.mockResolvedValue([mockServiceCategory]);
      llmService.generateCompletion.mockResolvedValue({
        content: 'CATSER-10391',
        tokens: 8,
        model: 'gpt-4.1-nano',
        finishReason: 'stop',
      });

      const result = await service.normalizeItem(item);

      expect(result.features.estimatedCategory).toBe('servico');
      expect(result.normalizedUnit).toBe('MES');
    });
  });
});
