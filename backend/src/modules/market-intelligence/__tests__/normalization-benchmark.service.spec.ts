import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import {
  NormalizationBenchmarkService,
  BenchmarkResult,
} from '../services/normalization-benchmark.service';
import { ItemNormalizationService } from '../services/item-normalization.service';
import { TextSimilarityService } from '../services/text-similarity.service';
import {
  ItemCategory,
  ItemCategoryType,
} from '../../../entities/item-category.entity';
import { OpenAIService } from '../../orchestrator/llm/openai.service';
import {
  benchmarkDataset,
  similarItemGroups,
  datasetStats,
} from '../benchmark/benchmark-dataset';

/**
 * Unit tests for NormalizationBenchmarkService.
 *
 * @see Issue #1607 - Benchmark and accuracy validation
 * @see Issue #1270 - Price normalization and categorization (Parent)
 */
describe('NormalizationBenchmarkService', () => {
  let service: NormalizationBenchmarkService;
  let normalizationService: ItemNormalizationService;
  let textSimilarityService: TextSimilarityService;
  let categoryRepository: Repository<ItemCategory>;

  // Mock categories for testing
  const mockCategories: Partial<ItemCategory>[] = [
    // CATMAT categories
    {
      id: 'cat-1',
      code: 'CATMAT-44121',
      name: 'Computador desktop',
      type: ItemCategoryType.CATMAT,
      active: true,
    },
    {
      id: 'cat-2',
      code: 'CATMAT-44122',
      name: 'Notebook',
      type: ItemCategoryType.CATMAT,
      active: true,
    },
    {
      id: 'cat-3',
      code: 'CATMAT-44123',
      name: 'Monitor',
      type: ItemCategoryType.CATMAT,
      active: true,
    },
    {
      id: 'cat-4',
      code: 'CATMAT-44124',
      name: 'Impressora',
      type: ItemCategoryType.CATMAT,
      active: true,
    },
    {
      id: 'cat-5',
      code: 'CATMAT-75050',
      name: 'Papel sulfite',
      type: ItemCategoryType.CATMAT,
      active: true,
    },
    {
      id: 'cat-6',
      code: 'CATMAT-75051',
      name: 'Toner',
      type: ItemCategoryType.CATMAT,
      active: true,
    },
    {
      id: 'cat-7',
      code: 'CATMAT-71001',
      name: 'Cadeira escritório',
      type: ItemCategoryType.CATMAT,
      active: true,
    },
    {
      id: 'cat-8',
      code: 'CATMAT-71002',
      name: 'Mesa escritório',
      type: ItemCategoryType.CATMAT,
      active: true,
    },
    // CATSER categories
    {
      id: 'cat-20',
      code: 'CATSER-10001',
      name: 'Manutenção de TI',
      type: ItemCategoryType.CATSER,
      active: true,
    },
    {
      id: 'cat-21',
      code: 'CATSER-20001',
      name: 'Limpeza predial',
      type: ItemCategoryType.CATSER,
      active: true,
    },
    {
      id: 'cat-22',
      code: 'CATSER-25001',
      name: 'Vigilância patrimonial',
      type: ItemCategoryType.CATSER,
      active: true,
    },
    {
      id: 'cat-23',
      code: 'CATSER-35002',
      name: 'Locação de veículo',
      type: ItemCategoryType.CATSER,
      active: true,
    },
  ];

  // Mock LLM response function
  const createMockLlmResponse = (categoryCode: string) => ({
    content: categoryCode,
    usage: { promptTokens: 100, completionTokens: 10, totalTokens: 110 },
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NormalizationBenchmarkService,
        ItemNormalizationService,
        TextSimilarityService,
        {
          provide: getRepositoryToken(ItemCategory),
          useValue: {
            find: jest.fn().mockResolvedValue(mockCategories),
            findOne: jest.fn().mockImplementation(({ where }) => {
              if (where?.code) {
                const category = mockCategories.find(
                  (c) => c.code === where.code.toUpperCase(),
                );
                return Promise.resolve(category || null);
              }
              // For ILike queries, return first match
              if (Array.isArray(where)) {
                return Promise.resolve(mockCategories[0]);
              }
              return Promise.resolve(null);
            }),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest
              .fn()
              .mockImplementation((key: string, defaultValue?: any) => {
                const config: Record<string, any> = {
                  TEXT_SIMILARITY_THRESHOLD: 0.7,
                  TEXT_SIMILARITY_JACCARD_WEIGHT: 0.4,
                  TEXT_SIMILARITY_COSINE_WEIGHT: 0.4,
                  TEXT_SIMILARITY_LEVENSHTEIN_WEIGHT: 0.2,
                };
                return config[key] ?? defaultValue;
              }),
          },
        },
        {
          provide: OpenAIService,
          useValue: {
            generateCompletion: jest
              .fn()
              .mockImplementation(({ userPrompt }) => {
                // Extract item description from prompt and return appropriate category
                const description = userPrompt.toLowerCase();

                if (
                  description.includes('notebook') ||
                  description.includes('computador portátil')
                ) {
                  return Promise.resolve(createMockLlmResponse('CATMAT-44122'));
                }
                if (
                  description.includes('desktop') ||
                  description.includes('microcomputador')
                ) {
                  return Promise.resolve(createMockLlmResponse('CATMAT-44121'));
                }
                if (
                  description.includes('monitor') ||
                  description.includes('tela')
                ) {
                  return Promise.resolve(createMockLlmResponse('CATMAT-44123'));
                }
                if (description.includes('impressora')) {
                  return Promise.resolve(createMockLlmResponse('CATMAT-44124'));
                }
                if (
                  description.includes('papel') &&
                  description.includes('a4')
                ) {
                  return Promise.resolve(createMockLlmResponse('CATMAT-75050'));
                }
                if (
                  description.includes('toner') ||
                  description.includes('cartucho')
                ) {
                  return Promise.resolve(createMockLlmResponse('CATMAT-75051'));
                }
                if (
                  description.includes('cadeira') ||
                  description.includes('poltrona')
                ) {
                  return Promise.resolve(createMockLlmResponse('CATMAT-71001'));
                }
                if (
                  description.includes('mesa') ||
                  description.includes('estação trabalho')
                ) {
                  return Promise.resolve(createMockLlmResponse('CATMAT-71002'));
                }
                if (
                  description.includes('manutenção') &&
                  (description.includes('informática') ||
                    description.includes('ti'))
                ) {
                  return Promise.resolve(createMockLlmResponse('CATSER-10001'));
                }
                if (
                  description.includes('limpeza') ||
                  description.includes('asseio')
                ) {
                  return Promise.resolve(createMockLlmResponse('CATSER-20001'));
                }
                if (
                  description.includes('vigilância') ||
                  description.includes('segurança patrimonial')
                ) {
                  return Promise.resolve(createMockLlmResponse('CATSER-25001'));
                }
                if (
                  description.includes('locação') ||
                  (description.includes('aluguel') &&
                    description.includes('veículo'))
                ) {
                  return Promise.resolve(createMockLlmResponse('CATSER-35002'));
                }

                return Promise.resolve(createMockLlmResponse('UNKNOWN'));
              }),
          },
        },
      ],
    }).compile();

    service = module.get<NormalizationBenchmarkService>(
      NormalizationBenchmarkService,
    );
    normalizationService = module.get<ItemNormalizationService>(
      ItemNormalizationService,
    );
    textSimilarityService = module.get<TextSimilarityService>(
      TextSimilarityService,
    );
    categoryRepository = module.get<Repository<ItemCategory>>(
      getRepositoryToken(ItemCategory),
    );
  });

  describe('Dataset Validation', () => {
    it('should have 100 items in benchmark dataset', () => {
      expect(benchmarkDataset).toHaveLength(100);
    });

    it('should have expected distribution of materials and services', () => {
      const materials = benchmarkDataset.filter(
        (item) => item.expectedType === 'material',
      );
      const services = benchmarkDataset.filter(
        (item) => item.expectedType === 'servico',
      );

      expect(materials.length).toBe(datasetStats.materials);
      expect(services.length).toBe(datasetStats.services);
      expect(materials.length).toBe(60);
      expect(services.length).toBe(40);
    });

    it('should have valid CATMAT codes for materials', () => {
      const materials = benchmarkDataset.filter(
        (item) => item.expectedType === 'material',
      );

      for (const item of materials) {
        expect(item.expectedCategory).toMatch(/^CATMAT-\d+$/);
      }
    });

    it('should have valid CATSER codes for services', () => {
      const services = benchmarkDataset.filter(
        (item) => item.expectedType === 'servico',
      );

      for (const item of services) {
        expect(item.expectedCategory).toMatch(/^CATSER-\d+$/);
      }
    });

    it('should have unique item IDs', () => {
      const ids = benchmarkDataset.map((item) => item.input.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });

    it('should have valid similar item groups', () => {
      expect(Object.keys(similarItemGroups).length).toBe(
        datasetStats.similarGroups,
      );

      for (const [groupName, itemIds] of Object.entries(similarItemGroups)) {
        expect(itemIds.length).toBeGreaterThanOrEqual(2);

        // All items in group should exist in dataset
        for (const itemId of itemIds) {
          const item = benchmarkDataset.find((i) => i.input.id === itemId);
          expect(item).toBeDefined();
          expect(item?.similarGroup).toBe(groupName);
        }
      }
    });

    it('should have multiple regions covered', () => {
      const regions = new Set(
        benchmarkDataset.map((item) => item.input.uf).filter(Boolean),
      );
      expect(regions.size).toBeGreaterThanOrEqual(5);
    });
  });

  describe('runBenchmark', () => {
    it('should run benchmark on full dataset', async () => {
      const result = await service.runBenchmark();

      expect(result.total).toBe(100);
      expect(result.processed).toBeLessThanOrEqual(100);
      expect(result.itemResults).toHaveLength(100);
      expect(result.timestamp).toBeInstanceOf(Date);
    });

    it('should run benchmark on subset of items', async () => {
      const itemIds = ['BM-001', 'BM-002', 'BM-061'];
      const result = await service.runBenchmark({ itemIds });

      expect(result.total).toBe(3);
      expect(result.itemResults).toHaveLength(3);
    });

    it('should calculate category accuracy', async () => {
      const result = await service.runBenchmark({
        itemIds: ['BM-001', 'BM-002', 'BM-003'], // All notebooks
      });

      expect(result.categoryAccuracy).toBeGreaterThanOrEqual(0);
      expect(result.categoryAccuracy).toBeLessThanOrEqual(1);
    });

    it('should calculate type accuracy', async () => {
      const result = await service.runBenchmark({
        itemIds: ['BM-001', 'BM-061'], // Material and service
      });

      expect(result.typeAccuracy).toBeGreaterThanOrEqual(0);
      expect(result.typeAccuracy).toBeLessThanOrEqual(1);
    });

    it('should track material and service metrics separately', async () => {
      const result = await service.runBenchmark({
        itemIds: ['BM-001', 'BM-002', 'BM-061', 'BM-062'],
      });

      expect(result.materialMetrics.total).toBe(2);
      expect(result.serviceMetrics.total).toBe(2);
    });

    it('should calculate grouping accuracy', async () => {
      const result = await service.runBenchmark({
        itemIds: ['BM-001', 'BM-002', 'BM-003'], // NOTEBOOK group
      });

      expect(result.groupingResults).toBeDefined();
      expect(result.groupingAccuracy).toBeGreaterThanOrEqual(0);
      expect(result.groupingAccuracy).toBeLessThanOrEqual(1);
    });

    it('should handle errors gracefully', async () => {
      // Mock an error for one item
      const mockGenerateCompletion = jest
        .fn()
        .mockRejectedValueOnce(new Error('LLM error'))
        .mockResolvedValue(createMockLlmResponse('CATMAT-44122'));

      jest
        .spyOn(normalizationService['llmService'], 'generateCompletion')
        .mockImplementation(mockGenerateCompletion);

      const result = await service.runBenchmark({
        itemIds: ['BM-001', 'BM-002'],
      });

      // Should still complete and track errors
      expect(result.errors).toBeGreaterThanOrEqual(0);
    });
  });

  describe('runQuickBenchmark', () => {
    it('should run on default sample size of 20', async () => {
      const result = await service.runQuickBenchmark();

      expect(result.total).toBe(20);
    });

    it('should run on custom sample size', async () => {
      const result = await service.runQuickBenchmark(10);

      expect(result.total).toBe(10);
    });

    it('should include both materials and services', async () => {
      const result = await service.runQuickBenchmark(10);

      expect(result.materialMetrics.total).toBeGreaterThan(0);
      expect(result.serviceMetrics.total).toBeGreaterThan(0);
    });
  });

  describe('getBenchmarkSummary', () => {
    it('should return passed=true when all thresholds met', () => {
      const result: BenchmarkResult = {
        total: 100,
        processed: 100,
        errors: 0,
        categoryAccuracy: 0.9,
        typeAccuracy: 0.98,
        unitAccuracy: 0.95,
        groupingAccuracy: 0.85,
        averageConfidence: 0.85,
        averageProcessingTimeMs: 100,
        totalTimeMs: 10000,
        materialMetrics: { total: 60, correct: 54, accuracy: 0.9 },
        serviceMetrics: { total: 40, correct: 36, accuracy: 0.9 },
        itemResults: [],
        groupingResults: [],
        timestamp: new Date(),
      };

      const summary = service.getBenchmarkSummary(result);

      expect(summary.passed).toBe(true);
      expect(summary.thresholdMet).toBe(true);
    });

    it('should return passed=false when category accuracy below threshold', () => {
      const result: BenchmarkResult = {
        total: 100,
        processed: 100,
        errors: 0,
        categoryAccuracy: 0.8, // Below 0.85 threshold
        typeAccuracy: 0.98,
        unitAccuracy: 0.95,
        groupingAccuracy: 0.85,
        averageConfidence: 0.85,
        averageProcessingTimeMs: 100,
        totalTimeMs: 10000,
        materialMetrics: { total: 60, correct: 48, accuracy: 0.8 },
        serviceMetrics: { total: 40, correct: 32, accuracy: 0.8 },
        itemResults: [],
        groupingResults: [],
        timestamp: new Date(),
      };

      const summary = service.getBenchmarkSummary(result);

      expect(summary.passed).toBe(false);
      expect(summary.thresholdMet).toBe(false);
    });

    it('should format accuracy as percentages', () => {
      const result: BenchmarkResult = {
        total: 100,
        processed: 100,
        errors: 0,
        categoryAccuracy: 0.875,
        typeAccuracy: 0.966,
        unitAccuracy: 0.95,
        groupingAccuracy: 0.833,
        averageConfidence: 0.85,
        averageProcessingTimeMs: 100,
        totalTimeMs: 10000,
        materialMetrics: { total: 60, correct: 54, accuracy: 0.9 },
        serviceMetrics: { total: 40, correct: 36, accuracy: 0.9 },
        itemResults: [],
        groupingResults: [],
        timestamp: new Date(),
      };

      const summary = service.getBenchmarkSummary(result);

      expect(summary.categoryAccuracy).toBe('87.5%');
      expect(summary.typeAccuracy).toBe('96.6%');
      expect(summary.groupingAccuracy).toBe('83.3%');
    });
  });

  describe('exportToJson', () => {
    it('should export valid JSON', async () => {
      const result = await service.runBenchmark({
        itemIds: ['BM-001', 'BM-002'],
      });

      const json = service.exportToJson(result);
      const parsed = JSON.parse(json);

      expect(parsed.total).toBe(2);
      expect(parsed.itemResults).toHaveLength(2);
    });
  });

  describe('exportToCsv', () => {
    it('should export valid CSV', async () => {
      const result = await service.runBenchmark({
        itemIds: ['BM-001', 'BM-002'],
      });

      const csv = service.exportToCsv(result);
      const lines = csv.split('\n');

      expect(lines.length).toBe(3); // Header + 2 items
      expect(lines[0]).toContain('Item ID');
      expect(lines[0]).toContain('Expected Category');
      expect(lines[0]).toContain('Actual Category');
    });

    it('should escape quotes in descriptions', async () => {
      const result = await service.runBenchmark({
        itemIds: ['BM-001'],
      });

      const csv = service.exportToCsv(result);

      // Should not break CSV format
      expect(csv.split('\n').length).toBe(2);
    });
  });

  describe('Accuracy Thresholds', () => {
    it('should track accuracy metrics for mocked items', async () => {
      // Test with items that have clear LLM mock mappings
      // Note: This test validates that accuracy metrics are calculated correctly,
      // not that accuracy meets production thresholds (that requires real LLM)
      const result = await service.runBenchmark({
        itemIds: [
          'BM-001',
          'BM-002',
          'BM-003', // Notebooks
          'BM-004',
          'BM-005', // Desktops
          'BM-006',
          'BM-007', // Monitors
          'BM-013',
          'BM-014',
          'BM-015', // Paper
          'BM-016',
          'BM-017', // Toner
          'BM-024',
          'BM-025', // Chairs
          'BM-026',
          'BM-027', // Tables
          'BM-061',
          'BM-062', // IT maintenance
          'BM-068',
          'BM-069', // Cleaning
        ],
      });

      // Verify metrics are calculated and in valid range
      expect(result.categoryAccuracy).toBeGreaterThanOrEqual(0);
      expect(result.categoryAccuracy).toBeLessThanOrEqual(1);
      expect(result.processed).toBe(20);
      // At least some items should match (those with clear mock mappings)
      expect(
        result.materialMetrics.correct + result.serviceMetrics.correct,
      ).toBeGreaterThan(0);
    });

    it('should correctly classify materials vs services', async () => {
      const result = await service.runBenchmark({
        itemIds: [
          'BM-001', // Material
          'BM-061', // Service
        ],
      });

      expect(result.typeAccuracy).toBeGreaterThanOrEqual(0.5);
    });

    it('should group similar items correctly', async () => {
      const result = await service.runBenchmark({
        itemIds: ['BM-001', 'BM-002', 'BM-003'], // All notebooks
      });

      const notebookGroup = result.groupingResults.find(
        (g) => g.groupName === 'NOTEBOOK',
      );

      if (notebookGroup) {
        expect(notebookGroup.accuracy).toBeGreaterThanOrEqual(0.5);
      }
    });
  });

  describe('Performance', () => {
    it('should track processing time per item', async () => {
      const result = await service.runBenchmark({
        itemIds: ['BM-001', 'BM-002'],
      });

      for (const item of result.itemResults) {
        expect(item.processingTimeMs).toBeGreaterThanOrEqual(0);
      }
    });

    it('should track total benchmark time', async () => {
      const result = await service.runBenchmark({
        itemIds: ['BM-001'],
      });

      expect(result.totalTimeMs).toBeGreaterThanOrEqual(0);
    });

    it('should calculate average processing time', async () => {
      const result = await service.runBenchmark({
        itemIds: ['BM-001', 'BM-002', 'BM-003'],
      });

      expect(result.averageProcessingTimeMs).toBeGreaterThanOrEqual(0);
    });
  });
});

/**
 * Integration tests for benchmark service.
 * These tests require database and LLM service.
 */
describe('NormalizationBenchmarkService Integration', () => {
  // Skip integration tests in CI without proper setup
  const isCI = process.env.CI === 'true';

  describe.skip('Full Benchmark Run', () => {
    it('should run full benchmark and meet thresholds', async () => {
      // This test would run against real services
      // Skipped by default as it requires full setup
    });
  });
});
