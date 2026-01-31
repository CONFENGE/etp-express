/**
 * Edital Comparison Service Tests
 *
 * Tests for edital comparison logic.
 *
 * @see Issue #1698 - Create REST API for edital extraction and comparison
 */

import { Test, TestingModule } from '@nestjs/testing';
import { EditalComparisonService } from './edital-comparison.service';
import { EditalExtractedData } from '../dto/edital-extracted-data.dto';

describe('EditalComparisonService', () => {
  let service: EditalComparisonService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [EditalComparisonService],
    }).compile();

    service = module.get<EditalComparisonService>(EditalComparisonService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('compareEditais', () => {
    it('should compare two editais with matching items', () => {
      const editalA: EditalExtractedData = {
        tipo: 'Pregao Eletronico',
        numero: '001/2025',
        objeto: 'Aquisicao de equipamentos',
        valorTotal: 100000,
        lotes: [
          {
            numero: 1,
            descricao: 'Equipamentos',
            itens: [
              {
                codigo: '001',
                descricao: 'Notebook',
                quantidade: 5,
                unidade: 'UN',
                precoUnitario: 3500.0,
                precoTotal: 17500.0,
              },
              {
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
        tipo: 'Pregao Eletronico',
        numero: '002/2025',
        objeto: 'Aquisicao de equipamentos',
        valorTotal: 110000,
        lotes: [
          {
            numero: 1,
            descricao: 'Equipamentos',
            itens: [
              {
                codigo: '001',
                descricao: 'Notebook',
                quantidade: 5,
                unidade: 'UN',
                precoUnitario: 3800.0,
                precoTotal: 19000.0,
              },
              {
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
      const editalA: EditalExtractedData = {
        tipo: 'Pregao Eletronico',
        numero: '001/2025',
        objeto: 'Aquisicao de equipamentos',
        lotes: [
          {
            numero: 1,
            descricao: 'Equipamentos',
            itens: [
              {
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
        tipo: 'Pregao Eletronico',
        numero: '002/2025',
        objeto: 'Aquisicao de equipamentos',
        lotes: [
          {
            numero: 1,
            descricao: 'Equipamentos',
            itens: [
              {
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
      const editalA: EditalExtractedData = {
        tipo: 'Pregao Eletronico',
        numero: '001/2025',
        objeto: 'Aquisicao de equipamentos',
        lotes: [
          {
            numero: 1,
            descricao: 'Equipamentos',
            itens: [
              {
                codigo: '001',
                descricao: 'Notebook',
                quantidade: 5,
                unidade: 'UN',
                precoUnitario: 3500.0,
                precoTotal: 17500.0,
              },
              {
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
        tipo: 'Pregao Eletronico',
        numero: '002/2025',
        objeto: 'Aquisicao de equipamentos',
        lotes: [
          {
            numero: 1,
            descricao: 'Equipamentos',
            itens: [
              {
                codigo: '001',
                descricao: 'Notebook',
                quantidade: 5,
                unidade: 'UN',
                precoUnitario: 3500.0,
                precoTotal: 17500.0,
              },
              {
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
      const editalA: EditalExtractedData = {
        tipo: 'Pregao Eletronico',
        numero: '001/2025',
        objeto: 'Aquisicao de equipamentos',
        valorTotal: 100000,
        lotes: [
          {
            numero: 1,
            descricao: 'Equipamentos',
            itens: [
              {
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
        tipo: 'Pregao Eletronico',
        numero: '002/2025',
        objeto: 'Aquisicao de equipamentos',
        valorTotal: 150000,
        lotes: [
          {
            numero: 1,
            descricao: 'Equipamentos',
            itens: [
              {
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
      const editalA: EditalExtractedData = {
        tipo: 'Pregao Eletronico',
        numero: '001/2025',
        objeto: 'Aquisicao de equipamentos',
        lotes: [
          {
            numero: 1,
            descricao: 'Lote 1',
            itens: [
              {
                codigo: '001',
                descricao: 'Item A',
                quantidade: 1,
                unidade: 'UN',
              },
            ],
          },
          {
            numero: 2,
            descricao: 'Lote 2',
            itens: [
              {
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
        tipo: 'Pregao Eletronico',
        numero: '002/2025',
        objeto: 'Aquisicao de equipamentos',
        lotes: [
          {
            numero: 1,
            descricao: 'Lote unico',
            itens: [
              {
                codigo: '001',
                descricao: 'Item A',
                quantidade: 1,
                unidade: 'UN',
              },
              {
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
});
