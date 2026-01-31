/**
 * Tests for EditalItemNormalizationService
 *
 * @module modules/pageindex/services/edital-item-normalization.spec
 * @see Issue #1696 - Implementar normalização de itens para comparação
 */

import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EditalItemNormalizationService } from './edital-item-normalization.service';
import { ItemNormalizationService } from '../../market-intelligence/services/item-normalization.service';
import {
  ItemCategory,
  ItemCategoryType,
} from '../../../entities/item-category.entity';
import { EditalItem } from '../dto/edital-extracted-data.dto';

describe('EditalItemNormalizationService', () => {
  let service: EditalItemNormalizationService;
  let itemNormalizationService: ItemNormalizationService;
  let categoryRepository: Repository<ItemCategory>;

  // Mock categories
  const mockCategoryNotebook: ItemCategory = {
    id: 'cat-1',
    code: 'CATMAT-44122',
    name: 'Computadores e periféricos',
    type: ItemCategoryType.CATMAT,
    parentCode: null,
    parent: null,
    children: [],
    description: 'Equipamentos de informática',
    level: 0,
    keywords: ['computador', 'notebook', 'desktop', 'pc'],
    commonUnits: ['UN', 'PCT'],
    active: true,
    itemCount: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockCategoryServico: ItemCategory = {
    id: 'cat-2',
    code: 'CATSER-10391',
    name: 'Serviços de TI',
    type: ItemCategoryType.CATSER,
    parentCode: null,
    parent: null,
    children: [],
    description: 'Serviços de tecnologia da informação',
    level: 0,
    keywords: ['suporte', 'manutencao', 'ti', 'tecnologia'],
    commonUnits: ['H', 'DIA', 'MES'],
    active: true,
    itemCount: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EditalItemNormalizationService,
        {
          provide: ItemNormalizationService,
          useValue: {
            normalizeItem: jest.fn(),
            normalizeUnit: jest.fn(),
            extractFeatures: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(ItemCategory),
          useValue: {
            findOne: jest.fn(),
            find: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<EditalItemNormalizationService>(
      EditalItemNormalizationService,
    );
    itemNormalizationService = module.get<ItemNormalizationService>(
      ItemNormalizationService,
    );
    categoryRepository = module.get<Repository<ItemCategory>>(
      getRepositoryToken(ItemCategory),
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('normalizeItem', () => {
    it('should normalize a single item with CATMAT code', async () => {
      const editalItem: EditalItem = {
        codigo: '001',
        descricao: 'NOTEBOOK CORE I5 8GB RAM',
        quantidade: 10,
        unidade: 'UNIDADE',
        precoUnitario: 3500.0,
      };

      // Mock ItemNormalizationService response
      jest.spyOn(itemNormalizationService, 'normalizeItem').mockResolvedValue({
        id: '001',
        description: 'NOTEBOOK CORE I5 8GB RAM',
        unit: 'UNIDADE',
        quantity: 10,
        unitPrice: 3500.0,
        source: 'manual',
        category: {
          id: 'cat-1',
          code: 'CATMAT-44122',
          name: 'Computadores e periféricos',
          type: ItemCategoryType.CATMAT,
        },
        normalizedUnit: 'UN',
        features: {
          description: 'notebook core i5 8gb ram',
          keywords: ['notebook', 'core', 'i5', '8gb', 'ram'],
          unit: 'UNIDADE',
          estimatedCategory: 'material',
          quantity: 10,
          price: 3500.0,
        },
        confidence: 0.95,
        classificationMethod: 'llm',
        normalizedAt: new Date(),
        requiresReview: false,
      });

      const result = await service.normalizeItem(editalItem);

      expect(result).toBeDefined();
      expect(result.originalDescricao).toBe('NOTEBOOK CORE I5 8GB RAM');
      expect(result.descricaoNormalizada).toBe('notebook core i5 8gb ram');
      expect(result.unidadePadrao).toBe('UN');
      expect(result.categoria).toBe('CATMAT-44122');
      expect(result.categoriaNome).toBe('Computadores e periféricos');
      expect(result.confidence).toBe(0.95);
      expect(result.requiresReview).toBe(false);
      expect(result.matchingKey).toBeDefined();
      expect(result.matchingKey.length).toBe(16); // SHA-256 first 16 chars
    });

    it('should normalize item with CATSER code', async () => {
      const editalItem: EditalItem = {
        codigo: 'CATSER-10391',
        descricao: 'Serviço de manutenção de TI',
        quantidade: 100,
        unidade: 'HORA',
        precoUnitario: 150.0,
      };

      jest.spyOn(itemNormalizationService, 'normalizeItem').mockResolvedValue({
        id: 'CATSER-10391',
        description: 'Serviço de manutenção de TI',
        unit: 'HORA',
        quantity: 100,
        unitPrice: 150.0,
        source: 'manual',
        catserCode: 'CATSER-10391',
        category: {
          id: 'cat-2',
          code: 'CATSER-10391',
          name: 'Serviços de TI',
          type: ItemCategoryType.CATSER,
        },
        normalizedUnit: 'H',
        features: {
          description: 'servico de manutencao de ti',
          keywords: ['servico', 'manutencao', 'ti'],
          unit: 'HORA',
          estimatedCategory: 'servico',
          quantity: 100,
          price: 150.0,
        },
        confidence: 1.0, // High confidence from source
        classificationMethod: 'source',
        normalizedAt: new Date(),
        requiresReview: false,
      });

      const result = await service.normalizeItem(editalItem);

      expect(result.categoria).toBe('CATSER-10391');
      expect(result.categoriaType).toBe(ItemCategoryType.CATSER);
      expect(result.confidence).toBe(1.0);
    });

    it('should handle normalization failure gracefully', async () => {
      const editalItem: EditalItem = {
        codigo: '999',
        descricao: 'Item inválido',
        quantidade: 1,
        unidade: 'UN',
      };

      jest
        .spyOn(itemNormalizationService, 'normalizeItem')
        .mockRejectedValue(new Error('Normalization failed'));

      jest
        .spyOn(itemNormalizationService, 'normalizeUnit')
        .mockReturnValue('UN');

      const result = await service.normalizeItem(editalItem);

      expect(result.confidence).toBe(0.1);
      expect(result.requiresReview).toBe(true);
      expect(result.categoria).toBeNull();
    });
  });

  describe('normalizeItems (batch)', () => {
    it('should normalize multiple items successfully', async () => {
      const items: EditalItem[] = [
        {
          codigo: '001',
          descricao: 'NOTEBOOK',
          quantidade: 5,
          unidade: 'UN',
          precoUnitario: 3500.0,
        },
        {
          codigo: '002',
          descricao: 'MOUSE',
          quantidade: 10,
          unidade: 'UN',
          precoUnitario: 50.0,
        },
      ];

      // Mock successful normalization for both items
      jest
        .spyOn(itemNormalizationService, 'normalizeItem')
        .mockResolvedValueOnce({
          id: '001',
          description: 'NOTEBOOK',
          unit: 'UN',
          source: 'manual',
          category: {
            id: 'cat-1',
            code: 'CATMAT-44122',
            name: 'Computadores',
            type: ItemCategoryType.CATMAT,
          },
          normalizedUnit: 'UN',
          features: {
            description: 'notebook',
            keywords: ['notebook'],
            unit: 'UN',
            estimatedCategory: 'material',
          },
          confidence: 0.9,
          classificationMethod: 'llm',
          normalizedAt: new Date(),
          requiresReview: false,
        })
        .mockResolvedValueOnce({
          id: '002',
          description: 'MOUSE',
          unit: 'UN',
          source: 'manual',
          category: {
            id: 'cat-1',
            code: 'CATMAT-44122',
            name: 'Computadores',
            type: ItemCategoryType.CATMAT,
          },
          normalizedUnit: 'UN',
          features: {
            description: 'mouse',
            keywords: ['mouse'],
            unit: 'UN',
            estimatedCategory: 'material',
          },
          confidence: 0.85,
          classificationMethod: 'llm',
          normalizedAt: new Date(),
          requiresReview: false,
        });

      const result = await service.normalizeItems(items);

      expect(result.items).toHaveLength(2);
      expect(result.stats.total).toBe(2);
      expect(result.stats.classified).toBe(2);
      expect(result.stats.requiresReview).toBe(0);
      expect(result.stats.averageConfidence).toBeCloseTo(0.875, 2);
      expect(result.stats.processingTimeMs).toBeGreaterThan(0);
    });

    it('should handle partial failures in batch normalization', async () => {
      const items: EditalItem[] = [
        {
          codigo: '001',
          descricao: 'NOTEBOOK',
          quantidade: 5,
          unidade: 'UN',
        },
        {
          codigo: '002',
          descricao: 'INVALID',
          quantidade: 1,
          unidade: 'UN',
        },
      ];

      // Mock: first item succeeds, second fails
      jest
        .spyOn(itemNormalizationService, 'normalizeItem')
        .mockResolvedValueOnce({
          id: '001',
          description: 'NOTEBOOK',
          unit: 'UN',
          source: 'manual',
          category: {
            id: 'cat-1',
            code: 'CATMAT-44122',
            name: 'Computadores',
            type: ItemCategoryType.CATMAT,
          },
          normalizedUnit: 'UN',
          features: {
            description: 'notebook',
            keywords: ['notebook'],
            unit: 'UN',
            estimatedCategory: 'material',
          },
          confidence: 0.9,
          classificationMethod: 'llm',
          normalizedAt: new Date(),
          requiresReview: false,
        })
        .mockRejectedValueOnce(new Error('Failed'));

      jest
        .spyOn(itemNormalizationService, 'normalizeUnit')
        .mockReturnValue('UN');

      const result = await service.normalizeItems(items);

      expect(result.items).toHaveLength(2);
      expect(result.stats.classified).toBe(1); // Only first item classified
      expect(result.stats.requiresReview).toBe(1); // Second item requires review
    });
  });

  describe('matchItems', () => {
    it('should match items with exact matching keys', async () => {
      const itemsA: any[] = [
        {
          originalCodigo: '001',
          descricaoNormalizada: 'notebook',
          unidadePadrao: 'UN',
          categoria: 'CATMAT-44122',
          matchingKey: 'abc123',
          keywords: ['notebook'],
          confidence: 0.9,
        },
      ];

      const itemsB: any[] = [
        {
          originalCodigo: '002',
          descricaoNormalizada: 'notebook',
          unidadePadrao: 'UN',
          categoria: 'CATMAT-44122',
          matchingKey: 'abc123', // Same key = exact match
          keywords: ['notebook'],
          confidence: 0.9,
        },
      ];

      const matches = await service.matchItems(itemsA, itemsB);

      expect(matches).toHaveLength(1);
      expect(matches[0].matchType).toBe('exact_match');
      expect(matches[0].similarityScore).toBe(100);
      expect(matches[0].matchConfidence).toBe(1.0);
    });

    it('should match items by CATMAT category', async () => {
      const itemsA: any[] = [
        {
          originalCodigo: '001',
          descricaoNormalizada: 'notebook dell',
          unidadePadrao: 'UN',
          categoria: 'CATMAT-44122',
          matchingKey: 'key1',
          keywords: ['notebook', 'dell'],
          confidence: 0.9,
        },
      ];

      const itemsB: any[] = [
        {
          originalCodigo: '002',
          descricaoNormalizada: 'notebook hp',
          unidadePadrao: 'UN',
          categoria: 'CATMAT-44122', // Same category
          matchingKey: 'key2', // Different key
          keywords: ['notebook', 'hp'],
          confidence: 0.85,
        },
      ];

      const matches = await service.matchItems(itemsA, itemsB);

      expect(matches).toHaveLength(1);
      expect(matches[0].matchType).toBe('category_match');
      expect(matches[0].similarityScore).toBeGreaterThan(80); // Base 80 + similarity boost
    });

    it('should match items by description similarity', async () => {
      const itemsA: any[] = [
        {
          originalCodigo: '001',
          descricaoNormalizada: 'mouse optico usb',
          unidadePadrao: 'UN',
          categoria: null,
          matchingKey: 'key1',
          keywords: ['mouse', 'optico', 'usb'],
          confidence: 0.7,
        },
      ];

      const itemsB: any[] = [
        {
          originalCodigo: '002',
          descricaoNormalizada: 'mouse usb sem fio',
          unidadePadrao: 'UN',
          categoria: null,
          matchingKey: 'key2',
          keywords: ['mouse', 'usb', 'sem', 'fio'],
          confidence: 0.7,
        },
      ];

      const matches = await service.matchItems(itemsA, itemsB);

      expect(matches).toHaveLength(1);
      expect(matches[0].matchType).toBe('description_match');
      expect(matches[0].similarityScore).toBeGreaterThan(50); // Keyword overlap
    });

    it('should not match items with low similarity', async () => {
      const itemsA: any[] = [
        {
          originalCodigo: '001',
          descricaoNormalizada: 'notebook',
          unidadePadrao: 'UN',
          categoria: null,
          matchingKey: 'key1',
          keywords: ['notebook'],
          confidence: 0.7,
        },
      ];

      const itemsB: any[] = [
        {
          originalCodigo: '002',
          descricaoNormalizada: 'impressora',
          unidadePadrao: 'UN',
          categoria: null,
          matchingKey: 'key2',
          keywords: ['impressora'],
          confidence: 0.7,
        },
      ];

      const matches = await service.matchItems(itemsA, itemsB);

      expect(matches).toHaveLength(0); // No match below threshold (50)
    });

    it('should handle one-to-one matching (no duplicates)', async () => {
      const itemsA: any[] = [
        {
          originalCodigo: 'A1',
          descricaoNormalizada: 'item comum',
          unidadePadrao: 'UN',
          categoria: 'CATMAT-12345',
          matchingKey: 'key1',
          keywords: ['item', 'comum'],
          confidence: 0.9,
        },
        {
          originalCodigo: 'A2',
          descricaoNormalizada: 'item comum',
          unidadePadrao: 'UN',
          categoria: 'CATMAT-12345',
          matchingKey: 'key2',
          keywords: ['item', 'comum'],
          confidence: 0.9,
        },
      ];

      const itemsB: any[] = [
        {
          originalCodigo: 'B1',
          descricaoNormalizada: 'item comum',
          unidadePadrao: 'UN',
          categoria: 'CATMAT-12345',
          matchingKey: 'key3',
          keywords: ['item', 'comum'],
          confidence: 0.9,
        },
      ];

      const matches = await service.matchItems(itemsA, itemsB);

      // Only one match should be made (best match wins, no duplicates)
      expect(matches).toHaveLength(1);
    });
  });

  describe('generateMatchingKey', () => {
    it('should generate consistent keys for identical items', () => {
      const key1 = (service as any).generateMatchingKey(
        'notebook core i5',
        'UN',
        'CATMAT-44122',
      );
      const key2 = (service as any).generateMatchingKey(
        'notebook core i5',
        'UN',
        'CATMAT-44122',
      );

      expect(key1).toBe(key2);
      expect(key1.length).toBe(16);
    });

    it('should generate different keys for different items', () => {
      const key1 = (service as any).generateMatchingKey(
        'notebook',
        'UN',
        'CATMAT-44122',
      );
      const key2 = (service as any).generateMatchingKey(
        'mouse',
        'UN',
        'CATMAT-44122',
      );

      expect(key1).not.toBe(key2);
    });

    it('should handle null category code', () => {
      const key = (service as any).generateMatchingKey(
        'notebook',
        'UN',
        null,
      );

      expect(key).toBeDefined();
      expect(key.length).toBe(16);
    });
  });

  describe('extractCATMATCode', () => {
    it('should extract CATMAT code from item code', () => {
      const code = (service as any).extractCATMATCode('CATMAT-44122');
      expect(code).toBe('CATMAT-44122');
    });

    it('should extract CATMAT code without hyphen', () => {
      const code = (service as any).extractCATMATCode('CATMAT44122');
      expect(code).toBeDefined();
    });

    it('should return undefined for non-CATMAT codes', () => {
      const code = (service as any).extractCATMATCode('001');
      expect(code).toBeUndefined();
    });
  });

  describe('extractCATSERCode', () => {
    it('should extract CATSER code from item code', () => {
      const code = (service as any).extractCATSERCode('CATSER-10391');
      expect(code).toBe('CATSER-10391');
    });

    it('should return undefined for non-CATSER codes', () => {
      const code = (service as any).extractCATSERCode('002');
      expect(code).toBeUndefined();
    });
  });

  describe('calculateDescriptionSimilarity', () => {
    it('should calculate high similarity for identical keywords', () => {
      const similarity = (service as any).calculateDescriptionSimilarity(
        ['notebook', 'core', 'i5'],
        ['notebook', 'core', 'i5'],
      );

      expect(similarity).toBe(1.0); // Perfect match
    });

    it('should calculate partial similarity for overlapping keywords', () => {
      const similarity = (service as any).calculateDescriptionSimilarity(
        ['notebook', 'dell', 'i5'],
        ['notebook', 'hp', 'i5'],
      );

      expect(similarity).toBeGreaterThan(0);
      expect(similarity).toBeLessThan(1.0); // Partial overlap
    });

    it('should return 0 for completely different keywords', () => {
      const similarity = (service as any).calculateDescriptionSimilarity(
        ['notebook'],
        ['impressora'],
      );

      expect(similarity).toBe(0);
    });

    it('should return 0 for empty keyword arrays', () => {
      const similarity = (service as any).calculateDescriptionSimilarity(
        [],
        [],
      );

      expect(similarity).toBe(0);
    });
  });
});
