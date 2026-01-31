/**
 * Edital Comparison Service Tests
 *
 * Tests for edital comparison logic including multi-edital price analysis.
 *
 * @see Issue #1697 - [INTEL-1545d] Implementar EditalComparisonService para análise de preços
 * @see Issue #1698 - Create REST API for edital extraction and comparison
 */

import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EditalComparisonService } from './edital-comparison.service';
import {
            numero: 1,
  EditalExtractedData,
  EditalTipo,
} from '../dto/edital-extracted-data.dto';
import { EditalItemNormalizationService } from './edital-item-normalization.service';
import { ItemNormalizationService } from '../../market-intelligence/services/item-normalization.service';
import { ItemCategory } from '../../../entities/item-category.entity';
import { AnomaliaCategoria } from '../dto/comparison-report.dto';

describe('EditalComparisonService', () => {
            numero: 1,
  let service: EditalComparisonService;
  let normalizationService: EditalItemNormalizationService;

  // Mock repository
  const mockCategoryRepository = {
            numero: 1,
    findOne: jest.fn(),
    find: jest.fn(),
  };

  // Mock ItemNormalizationService
  const mockItemNormalizationService = {
            numero: 1,
    normalizeItem: jest.fn(),
    normalizeUnit: jest.fn((unit: string) => unit.toLowerCase()),
  };

  beforeEach(async () => {
            numero: 1,
    const module: TestingModule = await Test.createTestingModule({
            numero: 1,
      providers: [
        EditalComparisonService,
        EditalItemNormalizationService,
        {
            numero: 1,
          provide: getRepositoryToken(ItemCategory),
          useValue: mockCategoryRepository,
        },
        {
            numero: 1,
          provide: ItemNormalizationService,
          useValue: mockItemNormalizationService,
        },
      ],
    }).compile();

    service = module.get<EditalComparisonService>(EditalComparisonService);
    normalizationService = module.get<EditalItemNormalizationService>(
      EditalItemNormalizationService,
    );

    // Reset mocks
    jest.clearAllMocks();
  });

  it('should be defined', () => {
            numero: 1,
    expect(service).toBeDefined();
  });

  describe('compareEditais', () => {
            numero: 1,
    it('should compare two editais with matching items', () => {
            numero: 1,
      const editalA: EditalExtractedData = {
            numero: 1,
        tipo: EditalTipo.PREGAO,
        objeto: 'Aquisicao de equipamentos',
        valorTotal: 100000,
        lotes: [
          {
            numero: 1,
            descricao: 'Equipamentos',
            itens: [
              {
            numero: 1,
                codigo: '001',
                descricao: 'Notebook',
                quantidade: 5,
                unidade: 'UN',
                precoUnitario: 3500.0,
                precoTotal: 17500.0,
              },
              {
            numero: 1,
                codigo: '002',
                descricao: 'Mouse',
                quantidade: 10,
                unidade: 'UN',
                precoUnitario: 50.0,
                precoTotal: 500.0,
              },
            ],
          },
        ],
      };

      const editalB: EditalExtractedData = {
            numero: 1,
        tipo: EditalTipo.PREGAO,
        objeto: 'Aquisicao de equipamentos',
        valorTotal: 110000,
        lotes: [
          {
            numero: 1,
            descricao: 'Equipamentos',
            itens: [
              {
            numero: 1,
                codigo: '001',
                descricao: 'Notebook',
                quantidade: 5,
                unidade: 'UN',
                precoUnitario: 3800.0,
                precoTotal: 19000.0,
              },
              {
            numero: 1,
                codigo: '002',
                descricao: 'Mouse',
                quantidade: 10,
                unidade: 'UN',
                precoUnitario: 52.0,
                precoTotal: 520.0,
              },
            ],
          },
        ],
      };

      const result = service.compareEditais(editalA, editalB);

      expect(result.summary.totalItemsA).toBe(2);
      expect(result.summary.totalItemsB).toBe(2);
      expect(result.summary.matchingItems).toBe(2);
      expect(result.summary.uniqueToA).toBe(0);
      expect(result.summary.uniqueToB).toBe(0);
      expect(result.itemComparisons).toHaveLength(2);
    });

    it('should identify price differences', () => {
            numero: 1,
      const editalA: EditalExtractedData = {
            numero: 1,
        tipo: EditalTipo.PREGAO,
        objeto: 'Aquisicao de equipamentos',
        lotes: [
          {
            numero: 1,
            descricao: 'Equipamentos',
            itens: [
              {
            numero: 1,
                codigo: '001',
                descricao: 'Notebook',
                quantidade: 5,
                unidade: 'UN',
                precoUnitario: 3000.0,
                precoTotal: 15000.0,
              },
            ],
          },
        ],
      };

      const editalB: EditalExtractedData = {
            numero: 1,
        tipo: EditalTipo.PREGAO,
        objeto: 'Aquisicao de equipamentos',
        lotes: [
          {
            numero: 1,
            descricao: 'Equipamentos',
            itens: [
              {
            numero: 1,
                codigo: '001',
                descricao: 'Notebook',
                quantidade: 5,
                unidade: 'UN',
                precoUnitario: 3600.0, // 20% increase
                precoTotal: 18000.0,
              },
            ],
          },
        ],
      };

      const result = service.compareEditais(editalA, editalB);

      const comparison = result.itemComparisons[0];
      expect(comparison.status).toBe('price_difference');
      expect(comparison.priceDifferencePercent).toBeCloseTo(20, 1);
      expect(comparison.priceDifferenceAbsolute).toBe(600);
    });

    it('should identify unique items', () => {
            numero: 1,
      const editalA: EditalExtractedData = {
            numero: 1,
        tipo: EditalTipo.PREGAO,
        objeto: 'Aquisicao de equipamentos',
        lotes: [
          {
            numero: 1,
            descricao: 'Equipamentos',
            itens: [
              {
            numero: 1,
                codigo: '001',
                descricao: 'Notebook',
                quantidade: 5,
                unidade: 'UN',
                precoUnitario: 3500.0,
                precoTotal: 17500.0,
              },
              {
            numero: 1,
                codigo: '002',
                descricao: 'Mouse',
                quantidade: 10,
                unidade: 'UN',
              },
            ],
          },
        ],
      };

      const editalB: EditalExtractedData = {
            numero: 1,
        tipo: EditalTipo.PREGAO,
        objeto: 'Aquisicao de equipamentos',
        lotes: [
          {
            numero: 1,
            descricao: 'Equipamentos',
            itens: [
              {
            numero: 1,
                codigo: '001',
                descricao: 'Notebook',
                quantidade: 5,
                unidade: 'UN',
                precoUnitario: 3500.0,
                precoTotal: 17500.0,
              },
              {
            numero: 1,
                codigo: '003',
                descricao: 'Teclado',
                quantidade: 10,
                unidade: 'UN',
              },
            ],
          },
        ],
      };

      const result = service.compareEditais(editalA, editalB);

      expect(result.summary.matchingItems).toBe(1);
      expect(result.summary.uniqueToA).toBe(1);
      expect(result.summary.uniqueToB).toBe(1);

      const uniqueA = result.itemComparisons.find((c) => c.codigo === '002');
      const uniqueB = result.itemComparisons.find((c) => c.codigo === '003');

      expect(uniqueA?.status).toBe('unique_to_a');
      expect(uniqueB?.status).toBe('unique_to_b');
    });

    it('should generate insights', () => {
            numero: 1,
      const editalA: EditalExtractedData = {
            numero: 1,
        tipo: EditalTipo.PREGAO,
        objeto: 'Aquisicao de equipamentos',
        valorTotal: 100000,
        lotes: [
          {
            numero: 1,
            descricao: 'Equipamentos',
            itens: [
              {
            numero: 1,
                codigo: '001',
                descricao: 'Notebook',
                quantidade: 5,
                unidade: 'UN',
                precoUnitario: 3500.0,
                precoTotal: 17500.0,
              },
            ],
          },
        ],
      };

      const editalB: EditalExtractedData = {
            numero: 1,
        tipo: EditalTipo.PREGAO,
        objeto: 'Aquisicao de equipamentos',
        valorTotal: 150000,
        lotes: [
          {
            numero: 1,
            descricao: 'Equipamentos',
            itens: [
              {
            numero: 1,
                codigo: '001',
                descricao: 'Notebook',
                quantidade: 5,
                unidade: 'UN',
                precoUnitario: 4000.0,
                precoTotal: 20000.0,
              },
            ],
          },
        ],
      };

      const result = service.compareEditais(editalA, editalB);

      expect(result.insights).toBeDefined();
      expect(result.insights.length).toBeGreaterThan(0);
      expect(result.insights[0]).toContain('Similaridade de escopo');
    });

    it('should handle editais with multiple lotes', () => {
            numero: 1,
      const editalA: EditalExtractedData = {
            numero: 1,
        tipo: EditalTipo.PREGAO,
        objeto: 'Aquisicao de equipamentos',
        lotes: [
          {
            numero: 1,
            descricao: 'Lote 1',
            numero: 1,
            itens: [
              {
            numero: 1,
                codigo: '001',
                descricao: 'Item A',
                quantidade: 1,
                unidade: 'UN',
              },
            ],
          },
          {
            numero: 1,
            descricao: 'Lote 2',
            numero: 1,
            itens: [
              {
            numero: 1,
                codigo: '002',
                descricao: 'Item B',
                quantidade: 1,
                unidade: 'UN',
              },
            ],
          },
        ],
      };

      const editalB: EditalExtractedData = {
            numero: 1,
        tipo: EditalTipo.PREGAO,
        objeto: 'Aquisicao de equipamentos',
        lotes: [
          {
            numero: 1,
            descricao: 'Lote unico',
            numero: 1,
            itens: [
              {
            numero: 1,
                codigo: '001',
                descricao: 'Item A',
                quantidade: 1,
                unidade: 'UN',
              },
              {
            numero: 1,
                codigo: '002',
                descricao: 'Item B',
                quantidade: 1,
                unidade: 'UN',
              },
            ],
          },
        ],
      };

      const result = service.compareEditais(editalA, editalB);

      expect(result.summary.totalItemsA).toBe(2);
      expect(result.summary.totalItemsB).toBe(2);
      expect(result.summary.matchingItems).toBe(2);
    });
  });

  describe('compareMultipleEditais', () => {
            numero: 1,
    beforeEach(() => {
            numero: 1,
      // Mock normalization service to return predictable normalized items
      mockItemNormalizationService.normalizeItem.mockImplementation(
        (item: any) => ({
            numero: 1,
          features: {
            numero: 1,
            description: item.description.toLowerCase(),
            keywords: item.description.toLowerCase().split(' '),
          },
          normalizedUnit: item.unit.toLowerCase(),
          category: {
            numero: 1,
            code: 'CATMAT-12345',
            name: 'Equipamentos',
            type: 'CATMAT',
          },
          confidence: 0.9,
          requiresReview: false,
        }),
      );
    });

    it('should analyze multiple editais and detect price outliers', async () => {
            numero: 1,
      const edital1: EditalExtractedData = {
            numero: 1,
        tipo: EditalTipo.PREGAO,
        objeto: 'Aquisicao de equipamentos',
        lotes: [
          {
            numero: 1,
            descricao: 'Equipamentos',
            itens: [
              {
            numero: 1,
                codigo: '001',
                descricao: 'Notebook',
                quantidade: 5,
                unidade: 'UN',
                precoUnitario: 3000.0,
                precoTotal: 15000.0,
              },
            ],
          },
        ],
      };

      const edital2: EditalExtractedData = {
            numero: 1,
        tipo: EditalTipo.PREGAO,
        objeto: 'Aquisicao de equipamentos',
        lotes: [
          {
            numero: 1,
            descricao: 'Equipamentos',
            itens: [
              {
            numero: 1,
                codigo: '001',
                descricao: 'Notebook',
                quantidade: 5,
                unidade: 'UN',
                precoUnitario: 3100.0,
                precoTotal: 15500.0,
              },
            ],
          },
        ],
      };

      const edital3: EditalExtractedData = {
            numero: 1,
        tipo: EditalTipo.PREGAO,
        objeto: 'Aquisicao de equipamentos',
        lotes: [
          {
            numero: 1,
            descricao: 'Equipamentos',
            itens: [
              {
            numero: 1,
                codigo: '001',
                descricao: 'Notebook',
                quantidade: 5,
                unidade: 'UN',
                precoUnitario: 5000.0, // Outlier (much higher)
                precoTotal: 25000.0,
              },
            ],
          },
        ],
      };

      const report = await service.compareMultipleEditais(
        [edital1, edital2, edital3],
        ['edital-001', 'edital-002', 'edital-003'],
      );

      expect(report).toBeDefined();
      expect(report.editaisAnalisados).toEqual([
        'edital-001',
        'edital-002',
        'edital-003',
      ]);
      expect(report.totalItens).toBeGreaterThan(0);
      expect(report.itensComparados.length).toBeGreaterThan(0);

      // Check if outlier was detected
      const notebookComparison = report.itensComparados.find((item) =>
        item.descricao.includes('notebook'),
      );
      expect(notebookComparison).toBeDefined();
      expect(notebookComparison!.ocorrencias).toBe(3);
      expect(notebookComparison!.outliers.length).toBeGreaterThan(0);

      // Verify statistics
      expect(notebookComparison!.precoMedio).toBeGreaterThan(0);
      expect(notebookComparison!.precoMediana).toBeGreaterThan(0);
      expect(notebookComparison!.desvio).toBeGreaterThan(0);
    });

    it('should categorize outliers correctly (atenção vs sobrepreço)', async () => {
            numero: 1,
      const edital1: EditalExtractedData = {
            numero: 1,
        tipo: EditalTipo.PREGAO,
        objeto: 'Aquisicao',
        lotes: [
          {
            numero: 1,
            descricao: 'Lote 1',
            numero: 1,
            itens: [
              {
            numero: 1,
                codigo: '001',
                descricao: 'Mouse',
                quantidade: 10,
                unidade: 'UN',
                precoUnitario: 50.0,
                precoTotal: 500.0,
              },
            ],
          },
        ],
      };

      const edital2: EditalExtractedData = {
            numero: 1,
        tipo: EditalTipo.PREGAO,
        objeto: 'Aquisicao',
        lotes: [
          {
            numero: 1,
            descricao: 'Lote 1',
            numero: 1,
            itens: [
              {
            numero: 1,
                codigo: '001',
                descricao: 'Mouse',
                quantidade: 10,
                unidade: 'UN',
                precoUnitario: 52.0,
                precoTotal: 520.0,
              },
            ],
          },
        ],
      };

      const edital3: EditalExtractedData = {
            numero: 1,
        tipo: EditalTipo.PREGAO,
        objeto: 'Aquisicao',
        lotes: [
          {
            numero: 1,
            descricao: 'Lote 1',
            numero: 1,
            itens: [
              {
            numero: 1,
                codigo: '001',
                descricao: 'Mouse',
                quantidade: 10,
                unidade: 'UN',
                precoUnitario: 51.0,
                precoTotal: 510.0,
              },
            ],
          },
        ],
      };

      const edital4: EditalExtractedData = {
            numero: 1,
        tipo: EditalTipo.PREGAO,
        objeto: 'Aquisicao',
        lotes: [
          {
            numero: 1,
            descricao: 'Lote 1',
            numero: 1,
            itens: [
              {
            numero: 1,
                codigo: '001',
                descricao: 'Mouse',
                quantidade: 10,
                unidade: 'UN',
                precoUnitario: 200.0, // Extreme outlier (sobrepreço)
                precoTotal: 2000.0,
              },
            ],
          },
        ],
      };

      const report = await service.compareMultipleEditais(
        [edital1, edital2, edital3, edital4],
        ['edital-001', 'edital-002', 'edital-003', 'edital-004'],
      );

      const mouseComparison = report.itensComparados.find((item) =>
        item.descricao.includes('mouse'),
      );
      expect(mouseComparison).toBeDefined();
      expect(mouseComparison!.outliers.length).toBeGreaterThan(0);

      // Check for sobrepreço alert
      expect(report.alertasSobrepreco).toBeGreaterThan(0);

      // Verify outlier categorization
      const sobreprecoOutlier = mouseComparison!.outliers.find(
        (o) => o.categoria === AnomaliaCategoria.SOBREPRECO,
      );
      expect(sobreprecoOutlier).toBeDefined();
      expect(Math.abs(sobreprecoOutlier!.zScore)).toBeGreaterThan(3);
    });

    it('should calculate confidence score based on sample size', async () => {
            numero: 1,
      const editais: EditalExtractedData[] = [];
      const editalIds: string[] = [];

      // Create 5 editais with same item at similar prices
      for (let i = 0; i < 5; i++) {
            numero: 1,
        editais.push({
            numero: 1,
          tipo: EditalTipo.PREGAO,
          objeto: 'Aquisicao',
          lotes: [
            {
            numero: 1,
              descricao: 'Lote 1',
            numero: 1,
              itens: [
                {
            numero: 1,
                  codigo: '001',
                  descricao: 'Teclado',
                  quantidade: 10,
                  unidade: 'UN',
                  precoUnitario: 100.0 + i * 5, // Small variation
                  precoTotal: (100.0 + i * 5) * 10,
                },
              ],
            },
          ],
        });
        editalIds.push(`edital-00${i + 1}`);
      }

      const report = await service.compareMultipleEditais(editais, editalIds);

      expect(report.confiabilidade).toBeGreaterThan(0);
      expect(report.confiabilidade).toBeLessThanOrEqual(100);

      // More editais should give higher confidence
      expect(report.confiabilidade).toBeGreaterThan(50);
    });

    it('should require at least 2 editais for comparison', async () => {
            numero: 1,
      const edital1: EditalExtractedData = {
            numero: 1,
        tipo: EditalTipo.PREGAO,
        objeto: 'Aquisicao',
        lotes: [],
      };

      await expect(
        service.compareMultipleEditais([edital1], ['edital-001']),
      ).rejects.toThrow('At least 2 editais are required for comparison');
    });

    it('should handle editais with no matching items', async () => {
            numero: 1,
      const edital1: EditalExtractedData = {
            numero: 1,
        tipo: EditalTipo.PREGAO,
        objeto: 'Aquisicao A',
        lotes: [
          {
            numero: 1,
            descricao: 'Lote 1',
            numero: 1,
            itens: [
              {
            numero: 1,
                codigo: '001',
                descricao: 'Item A',
                quantidade: 1,
                unidade: 'UN',
                precoUnitario: 100.0,
                precoTotal: 100.0,
              },
            ],
          },
        ],
      };

      const edital2: EditalExtractedData = {
            numero: 1,
        tipo: EditalTipo.PREGAO,
        objeto: 'Aquisicao B',
        lotes: [
          {
            numero: 1,
            descricao: 'Lote 1',
            numero: 1,
            itens: [
              {
            numero: 1,
                codigo: '002',
                descricao: 'Item B',
                quantidade: 1,
                unidade: 'UN',
                precoUnitario: 200.0,
                precoTotal: 200.0,
              },
            ],
          },
        ],
      };

      // Mock different matching keys for different items
      let callCount = 0;
      mockItemNormalizationService.normalizeItem.mockImplementation(
        (item: any) => ({
            numero: 1,
          features: {
            numero: 1,
            description: item.description.toLowerCase(),
            keywords: item.description.toLowerCase().split(' '),
          },
          normalizedUnit: item.unit.toLowerCase(),
          category: {
            numero: 1,
            code: callCount++ === 0 ? 'CATMAT-111' : 'CATMAT-222',
            name: 'Category',
            type: 'CATMAT',
          },
          confidence: 0.9,
          requiresReview: false,
        }),
      );

      const report = await service.compareMultipleEditais(
        [edital1, edital2],
        ['edital-001', 'edital-002'],
      );

      expect(report).toBeDefined();
      // Items should not match due to different matching keys
      // Should have 0 items with multiple occurrences
      expect(report.totalItens).toBe(0);
    });

    it('should sort items with outliers first', async () => {
            numero: 1,
      const edital1: EditalExtractedData = {
            numero: 1,
        tipo: EditalTipo.PREGAO,
        objeto: 'Aquisicao',
        lotes: [
          {
            numero: 1,
            descricao: 'Lote 1',
            numero: 1,
            itens: [
              {
            numero: 1,
                codigo: '001',
                descricao: 'Normal Item',
                quantidade: 1,
                unidade: 'UN',
                precoUnitario: 100.0,
                precoTotal: 100.0,
              },
              {
            numero: 1,
                codigo: '002',
                descricao: 'Outlier Item',
                quantidade: 1,
                unidade: 'UN',
                precoUnitario: 100.0,
                precoTotal: 100.0,
              },
            ],
          },
        ],
      };

      const edital2: EditalExtractedData = {
            numero: 1,
        tipo: EditalTipo.PREGAO,
        objeto: 'Aquisicao',
        lotes: [
          {
            numero: 1,
            descricao: 'Lote 1',
            numero: 1,
            itens: [
              {
            numero: 1,
                codigo: '001',
                descricao: 'Normal Item',
                quantidade: 1,
                unidade: 'UN',
                precoUnitario: 105.0,
                precoTotal: 105.0,
              },
              {
            numero: 1,
                codigo: '002',
                descricao: 'Outlier Item',
                quantidade: 1,
                unidade: 'UN',
                precoUnitario: 500.0, // Outlier
                precoTotal: 500.0,
              },
            ],
          },
        ],
      };

      const report = await service.compareMultipleEditais(
        [edital1, edital2],
        ['edital-001', 'edital-002'],
      );

      if (report.itensComparados.length > 1) {
            numero: 1,
        // Items with outliers should be first
        const firstItem = report.itensComparados[0];
        expect(firstItem.outliers.length).toBeGreaterThan(0);
      }
    });
  });
});
