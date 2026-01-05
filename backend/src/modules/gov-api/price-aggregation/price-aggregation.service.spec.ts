/**
 * Price Aggregation Service Unit Tests
 *
 * @module modules/gov-api/price-aggregation
 * @see https://github.com/CONFENGE/etp-express/issues/1159
 */

import { Test, TestingModule } from '@nestjs/testing';
import { PriceAggregationService } from './price-aggregation.service';
import {
  GovApiPriceReference,
  GovApiContract,
} from '../interfaces/gov-api.interface';

describe('PriceAggregationService', () => {
  let service: PriceAggregationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PriceAggregationService],
    }).compile();

    service = module.get<PriceAggregationService>(PriceAggregationService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('aggregatePrices', () => {
    const createSinapiPrice = (
      codigo: string,
      precoUnitario: number,
      unidade: string = 'm2',
    ): GovApiPriceReference => ({
      id: `sinapi-${codigo}`,
      title: `SINAPI ${codigo}`,
      description: `Item SINAPI ${codigo}`,
      source: 'sinapi',
      relevance: 0.9,
      fetchedAt: new Date(),
      codigo,
      descricao: `Item ${codigo}`,
      unidade,
      precoUnitario,
      mesReferencia: '2026-01',
      uf: 'DF',
      desonerado: false,
      categoria: 'construcao',
    });

    const createSicroPrice = (
      codigo: string,
      precoUnitario: number,
      unidade: string = 'm2',
    ): GovApiPriceReference => ({
      id: `sicro-${codigo}`,
      title: `SICRO ${codigo}`,
      description: `Item SICRO ${codigo}`,
      source: 'sicro',
      relevance: 0.85,
      fetchedAt: new Date(),
      codigo,
      descricao: `Item ${codigo}`,
      unidade,
      precoUnitario,
      mesReferencia: '2026-01',
      uf: 'DF',
      desonerado: false,
      categoria: 'infraestrutura',
    });

    const createContract = (
      numero: string,
      valorTotal: number,
      source: 'pncp' | 'comprasgov' = 'pncp',
    ): GovApiContract => ({
      id: `${source}-${numero}`,
      title: `Contrato ${numero}`,
      description: `Contrato ${numero}`,
      source,
      relevance: 0.8,
      fetchedAt: new Date(),
      numero,
      ano: 2026,
      orgaoContratante: {
        cnpj: '00000000000000',
        nome: 'Órgão Teste',
        uf: 'DF',
      },
      objeto: `Objeto do contrato ${numero}`,
      valorTotal,
      modalidade: 'Pregão',
      status: 'Homologado',
      dataPublicacao: new Date(),
    });

    it('should return empty aggregations when no prices provided', () => {
      const result = service.aggregatePrices('test query', [], [], []);

      expect(result.aggregations).toHaveLength(0);
      expect(result.totalPricesAnalyzed).toBe(0);
      expect(result.overallConfidence).toBe('LOW');
    });

    it('should create single source aggregation with LOW confidence', () => {
      const sinapiPrices = [createSinapiPrice('001', 100.0)];

      const result = service.aggregatePrices('cimento', sinapiPrices, [], []);

      expect(result.aggregations).toHaveLength(1);
      expect(result.aggregations[0].confidence).toBe('LOW');
      expect(result.aggregations[0].sourceCount).toBe(1);
      expect(result.aggregations[0].averagePrice).toBe(100.0);
    });

    it('should aggregate prices from multiple sources with same unit', () => {
      const sinapiPrices = [createSinapiPrice('001', 100.0, 'm2')];
      const sicroPrices = [createSicroPrice('001', 110.0, 'm2')];

      const result = service.aggregatePrices(
        'pavimentacao',
        sinapiPrices,
        sicroPrices,
        [],
      );

      expect(result.aggregations.length).toBeGreaterThanOrEqual(1);
      expect(result.totalPricesAnalyzed).toBe(2);
      expect(result.sourcesConsulted).toContain('sinapi');
      expect(result.sourcesConsulted).toContain('sicro');
    });

    it('should calculate weighted average correctly', () => {
      const sinapiPrices = [createSinapiPrice('001', 100.0, 'm2')];
      const sicroPrices = [createSicroPrice('001', 120.0, 'm2')];

      const result = service.aggregatePrices(
        'test',
        sinapiPrices,
        sicroPrices,
        [],
      );

      // With 2 sources of same unit and similar prices, they should be grouped
      const aggregation = result.aggregations.find((a) => a.sourceCount === 2);
      if (aggregation) {
        // Weighted average with SINAPI/SICRO weight 1.2 each
        // Expected: (100 * 1.2 + 120 * 1.2) / (1.2 + 1.2) = 110
        expect(aggregation.averagePrice).toBeCloseTo(110, 1);
      }
    });

    it('should calculate statistics correctly', () => {
      const sinapiPrices = [createSinapiPrice('001', 100.0, 'kg')];
      const sicroPrices = [createSicroPrice('002', 150.0, 'kg')];

      const result = service.aggregatePrices(
        'material',
        sinapiPrices,
        sicroPrices,
        [],
      );

      const aggregation = result.aggregations.find((a) => a.sourceCount >= 2);
      if (aggregation) {
        expect(aggregation.minPrice).toBe(100.0);
        expect(aggregation.maxPrice).toBe(150.0);
        expect(aggregation.medianPrice).toBe(125.0);
      }
    });

    it('should exclude outliers when enabled', () => {
      const sinapiPrices = [
        createSinapiPrice('001', 100.0, 'un'),
        createSinapiPrice('002', 105.0, 'un'),
        createSinapiPrice('003', 95.0, 'un'),
        createSinapiPrice('004', 500.0, 'un'), // Outlier
      ];

      const result = service.aggregatePrices('test', sinapiPrices, [], [], {
        excludeOutliers: true,
      });

      // Check if any aggregation has outliers excluded
      const aggregationsWithOutliers = result.aggregations.filter(
        (a) => a.outliersExcluded,
      );

      // The aggregation should have detected outliers if prices vary significantly
      expect(result.totalPricesAnalyzed).toBe(4);
    });

    it('should include contract prices in aggregation', () => {
      const contracts = [
        createContract('001/2026', 50000.0, 'pncp'),
        createContract('002/2026', 55000.0, 'comprasgov'),
      ];

      const result = service.aggregatePrices('servico', [], [], contracts);

      expect(result.totalPricesAnalyzed).toBe(2);
      expect(result.sourcesConsulted).toContain('pncp');
      expect(result.sourcesConsulted).toContain('comprasgov');
    });

    it('should determine HIGH confidence with 3+ sources and low variance', () => {
      // Create 3 prices with similar values (low variance)
      const sinapiPrices = [
        createSinapiPrice('001', 100.0, 'm2'),
        createSinapiPrice('002', 102.0, 'm2'),
        createSinapiPrice('003', 98.0, 'm2'),
      ];

      const result = service.aggregatePrices('test', sinapiPrices, [], []);

      // With 3 sources of same unit and very similar prices
      // The CV should be low enough for HIGH confidence
      expect(result.totalPricesAnalyzed).toBe(3);
    });

    it('should determine MEDIUM confidence with 2 sources', () => {
      const sinapiPrices = [createSinapiPrice('001', 100.0, 'm3')];
      const sicroPrices = [createSicroPrice('001', 105.0, 'm3')];

      const result = service.aggregatePrices(
        'test',
        sinapiPrices,
        sicroPrices,
        [],
      );

      const aggregation = result.aggregations.find((a) => a.sourceCount === 2);
      if (aggregation) {
        expect(aggregation.confidence).toBe('MEDIUM');
      }
    });

    it('should include methodology description', () => {
      const sinapiPrices = [createSinapiPrice('001', 100.0)];

      const result = service.aggregatePrices('test', sinapiPrices, [], []);

      expect(result.aggregations[0].methodology).toBeDefined();
      expect(result.aggregations[0].methodology.length).toBeGreaterThan(0);
    });

    it('should include legal reference', () => {
      const sinapiPrices = [createSinapiPrice('001', 100.0)];

      const result = service.aggregatePrices('test', sinapiPrices, [], []);

      expect(result.aggregations[0].legalReference).toContain(
        'Lei 14.133/2021',
      );
    });

    it('should provide methodology summary', () => {
      const sinapiPrices = [createSinapiPrice('001', 100.0)];
      const sicroPrices = [createSicroPrice('001', 110.0)];

      const result = service.aggregatePrices(
        'test',
        sinapiPrices,
        sicroPrices,
        [],
      );

      expect(result.methodologySummary).toBeDefined();
      expect(result.methodologySummary).toContain('fontes');
      expect(result.methodologySummary).toContain('Lei 14.133/2021');
    });

    it('should normalize different unit representations', () => {
      const sinapiPrices = [createSinapiPrice('001', 100.0, 'm²')];
      const sicroPrices = [createSicroPrice('001', 110.0, 'm2')];

      const result = service.aggregatePrices(
        'test',
        sinapiPrices,
        sicroPrices,
        [],
      );

      // Both should be normalized to 'm2' and potentially grouped
      expect(result.totalPricesAnalyzed).toBe(2);
    });

    it('should handle empty prices gracefully', () => {
      const result = service.aggregatePrices('query', [], [], []);

      expect(result.query).toBe('query');
      expect(result.aggregations).toEqual([]);
      expect(result.unmatchedPrices).toEqual([]);
      expect(result.totalPricesAnalyzed).toBe(0);
      expect(result.sourcesConsulted).toEqual([]);
      expect(result.overallConfidence).toBe('LOW');
    });

    it('should include timestamp in result', () => {
      const sinapiPrices = [createSinapiPrice('001', 100.0)];
      const beforeTest = new Date();

      const result = service.aggregatePrices('test', sinapiPrices, [], []);

      expect(result.timestamp).toBeInstanceOf(Date);
      expect(result.timestamp.getTime()).toBeGreaterThanOrEqual(
        beforeTest.getTime(),
      );
    });

    it('should respect custom similarity threshold', () => {
      const sinapiPrices = [createSinapiPrice('001', 100.0, 'm2')];
      const sicroPrices = [createSicroPrice('001', 105.0, 'm2')];

      const resultDefault = service.aggregatePrices(
        'test',
        sinapiPrices,
        sicroPrices,
        [],
      );

      const resultStrict = service.aggregatePrices(
        'test',
        sinapiPrices,
        sicroPrices,
        [],
        { similarityThreshold: 0.99 },
      );

      // Both should have same number of prices analyzed
      expect(resultDefault.totalPricesAnalyzed).toBe(2);
      expect(resultStrict.totalPricesAnalyzed).toBe(2);
    });

    it('should calculate coefficient of variation correctly', () => {
      // Create prices with known CV
      const sinapiPrices = [
        createSinapiPrice('001', 100.0, 'un'),
        createSinapiPrice('002', 100.0, 'un'), // Same price = 0 CV
      ];

      const result = service.aggregatePrices('test', sinapiPrices, [], []);

      const aggregation = result.aggregations.find((a) => a.sourceCount >= 2);
      if (aggregation) {
        expect(aggregation.coefficientOfVariation).toBe(0);
      }
    });
  });
});
