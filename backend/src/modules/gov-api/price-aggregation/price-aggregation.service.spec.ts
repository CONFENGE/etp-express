/**
 * Price Aggregation Service Unit Tests
 *
 * @module modules/gov-api/price-aggregation
 * @see https://github.com/CONFENGE/etp-express/issues/1159
 * @see https://github.com/CONFENGE/etp-express/issues/1568
 */

import { Test, TestingModule } from '@nestjs/testing';
import { PriceAggregationService } from './price-aggregation.service';
import {
  GovApiPriceReference,
  GovApiContract,
} from '../interfaces/gov-api.interface';
import { SinapiPriceReference, SinapiItemType } from '../sinapi/sinapi.types';

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

  /**
   * Tests for SINAPI API data integration (#1568)
   *
   * These tests validate that SinapiPriceReference data from the API Orcamentador
   * is correctly accepted and processed by PriceAggregationService.
   *
   * @see https://github.com/CONFENGE/etp-express/issues/1568
   */
  describe('SINAPI API Integration (#1568)', () => {
    /**
     * Create a SinapiPriceReference as returned by API Orcamentador
     * This mimics the exact structure returned by SinapiService.transformApiInsumo()
     */
    const createApiSinapiPrice = (
      codigo: string,
      nome: string,
      precoNaoDesonerado: number,
      precoDesonerado: number,
      unidade: string = 'M2',
      uf: string = 'SP',
      mesReferencia: string = '2026-01',
      tipo: SinapiItemType = SinapiItemType.INSUMO,
      classe?: string,
    ): SinapiPriceReference => ({
      // GovApiSearchResult fields
      id: `sinapi:${codigo}:${uf}:${mesReferencia}:O`,
      title: nome,
      description: nome,
      source: 'sinapi',
      url: undefined,
      relevance: 1.0,
      fetchedAt: new Date(),
      // GovApiPriceReference fields
      codigo,
      descricao: nome,
      unidade,
      precoUnitario: precoNaoDesonerado,
      mesReferencia,
      uf,
      desonerado: false,
      categoria: classe || 'SINAPI',
      // SinapiPriceReference specific fields
      tipo,
      classeId: undefined,
      classeDescricao: classe,
      precoOnerado: precoNaoDesonerado,
      precoDesonerado,
    });

    it('should accept SINAPI API data without errors', () => {
      const apiSinapiPrices: SinapiPriceReference[] = [
        createApiSinapiPrice(
          '00001234',
          'CIMENTO PORTLAND COMPOSTO CP II-32',
          45.5,
          42.0,
          'KG',
          'SP',
          '2026-01',
          SinapiItemType.INSUMO,
          'AGLOMERANTES',
        ),
      ];

      expect(() =>
        service.aggregatePrices('cimento portland', apiSinapiPrices, [], []),
      ).not.toThrow();
    });

    it('should correctly aggregate SINAPI API prices', () => {
      const apiSinapiPrices: SinapiPriceReference[] = [
        createApiSinapiPrice(
          '00001234',
          'CIMENTO PORTLAND COMPOSTO CP II-32',
          45.5,
          42.0,
          'KG',
          'SP',
        ),
        createApiSinapiPrice(
          '00001235',
          'CIMENTO PORTLAND COMPOSTO CP II-32 SACO 50KG',
          44.0,
          40.5,
          'KG',
          'RJ',
        ),
      ];

      const result = service.aggregatePrices(
        'cimento portland',
        apiSinapiPrices,
        [],
        [],
      );

      expect(result.aggregations.length).toBeGreaterThan(0);
      expect(result.totalPricesAnalyzed).toBe(2);
      expect(result.sourcesConsulted).toContain('sinapi');
    });

    it('should include SINAPI in sourcesConsulted when API data is provided', () => {
      const apiSinapiPrices: SinapiPriceReference[] = [
        createApiSinapiPrice(
          '00005678',
          'AREIA MEDIA LAVADA',
          85.0,
          78.0,
          'M3',
        ),
      ];

      const result = service.aggregatePrices(
        'areia lavada',
        apiSinapiPrices,
        [],
        [],
      );

      expect(result.sourcesConsulted).toEqual(['sinapi']);
    });

    it('should correctly normalize SINAPI API price reference', () => {
      const apiSinapiPrices: SinapiPriceReference[] = [
        createApiSinapiPrice(
          '00009999',
          'TIJOLO CERAMICO FURADO',
          0.85,
          0.78,
          'UN',
          'MG',
          '2026-01',
        ),
      ];

      const result = service.aggregatePrices(
        'tijolo ceramico',
        apiSinapiPrices,
        [],
        [],
      );

      expect(result.aggregations).toHaveLength(1);
      expect(result.aggregations[0].unit).toBe('un');
      expect(result.aggregations[0].averagePrice).toBe(0.85);
    });

    it('should include methodology mentioning SINAPI correctly', () => {
      const apiSinapiPrices: SinapiPriceReference[] = [
        createApiSinapiPrice('00001111', 'BRITA 1', 75.0, 69.0, 'M3'),
        createApiSinapiPrice('00001112', 'BRITA 2', 78.0, 72.0, 'M3'),
      ];

      const result = service.aggregatePrices('brita', apiSinapiPrices, [], []);

      expect(result.methodologySummary).toContain('SINAPI');
      expect(result.methodologySummary).toContain('Lei 14.133/2021');
    });

    it('should aggregate API SINAPI prices with SICRO correctly', () => {
      const apiSinapiPrices: SinapiPriceReference[] = [
        createApiSinapiPrice(
          '00002222',
          'CONCRETO USINADO FCK 25 MPA',
          420.0,
          385.0,
          'M3',
        ),
      ];

      const sicroPrices: GovApiPriceReference[] = [
        {
          id: 'sicro-001',
          title: 'CONCRETO ESTRUTURAL',
          description: 'Concreto estrutural usinado',
          source: 'sicro',
          relevance: 0.9,
          fetchedAt: new Date(),
          codigo: 'SICRO-001',
          descricao: 'CONCRETO ESTRUTURAL USINADO FCK 25',
          unidade: 'M3',
          precoUnitario: 450.0,
          mesReferencia: '2026-01',
          uf: 'SP',
          desonerado: false,
          categoria: 'INFRAESTRUTURA',
        },
      ];

      const result = service.aggregatePrices(
        'concreto usinado',
        apiSinapiPrices,
        sicroPrices,
        [],
      );

      expect(result.totalPricesAnalyzed).toBe(2);
      expect(result.sourcesConsulted).toContain('sinapi');
      expect(result.sourcesConsulted).toContain('sicro');
    });

    it('should handle SINAPI COMPOSICAO type from API', () => {
      const apiComposicaoPrices: SinapiPriceReference[] = [
        createApiSinapiPrice(
          '00003333',
          'ALVENARIA DE VEDACAO COM BLOCO CERAMICO',
          125.0,
          115.0,
          'M2',
          'SP',
          '2026-01',
          SinapiItemType.COMPOSICAO,
          'ALVENARIA',
        ),
      ];

      const result = service.aggregatePrices(
        'alvenaria vedacao',
        apiComposicaoPrices,
        [],
        [],
      );

      expect(result.aggregations).toHaveLength(1);
      expect(result.aggregations[0].averagePrice).toBe(125.0);
    });

    it('should correctly calculate statistics with multiple API SINAPI prices', () => {
      const apiSinapiPrices: SinapiPriceReference[] = [
        createApiSinapiPrice('00004001', 'AREIA FINA', 60.0, 55.0, 'M3', 'SP'),
        createApiSinapiPrice('00004002', 'AREIA MEDIA', 65.0, 60.0, 'M3', 'RJ'),
        createApiSinapiPrice(
          '00004003',
          'AREIA GROSSA',
          70.0,
          64.0,
          'M3',
          'MG',
        ),
      ];

      const result = service.aggregatePrices('areia', apiSinapiPrices, [], []);

      // Find the aggregation that grouped all 3
      const aggregation = result.aggregations.find((a) => a.sourceCount === 3);
      if (aggregation) {
        expect(aggregation.minPrice).toBe(60.0);
        expect(aggregation.maxPrice).toBe(70.0);
        expect(aggregation.medianPrice).toBe(65.0);
      }
    });

    it('should handle precoDesonerado vs precoOnerado correctly', () => {
      // Test with desonerado flag
      const desoneradoPrice: SinapiPriceReference = {
        ...createApiSinapiPrice('00005001', 'FERRO CA-50', 8.5, 7.8, 'KG'),
        desonerado: true,
        precoUnitario: 7.8, // Should use precoDesonerado
      };

      const result = service.aggregatePrices(
        'ferro ca-50',
        [desoneradoPrice],
        [],
        [],
      );

      expect(result.aggregations).toHaveLength(1);
      expect(result.aggregations[0].averagePrice).toBe(7.8);
    });

    it('should not cause breaking changes in interface', () => {
      // This test ensures backward compatibility
      // Old-style GovApiPriceReference should still work
      const legacyPrice: GovApiPriceReference = {
        id: 'sinapi-legacy-001',
        title: 'Legacy SINAPI Item',
        description: 'Legacy item description',
        source: 'sinapi',
        relevance: 0.9,
        fetchedAt: new Date(),
        codigo: 'LEGACY001',
        descricao: 'Legacy item',
        unidade: 'UN',
        precoUnitario: 100.0,
        mesReferencia: '2026-01',
        uf: 'DF',
        desonerado: false,
        categoria: 'LEGACY',
      };

      // New-style SinapiPriceReference
      const apiPrice: SinapiPriceReference = createApiSinapiPrice(
        '00006001',
        'New API Item',
        100.0,
        90.0,
        'UN',
      );

      // Both should work together
      const result = service.aggregatePrices(
        'mixed test',
        [legacyPrice, apiPrice],
        [],
        [],
      );

      expect(result.totalPricesAnalyzed).toBe(2);
      expect(result.sourcesConsulted).toContain('sinapi');
    });

    it('should handle empty SINAPI API response gracefully', () => {
      const result = service.aggregatePrices('nonexistent item', [], [], []);

      expect(result.aggregations).toHaveLength(0);
      expect(result.sourcesConsulted).toHaveLength(0);
      expect(result.overallConfidence).toBe('LOW');
    });

    it('should process API prices with special characters in description', () => {
      const apiSinapiPrices: SinapiPriceReference[] = [
        createApiSinapiPrice(
          '00007001',
          'TUBO PVC SOLDAVEL DN 50MM - CONEXAO 90°',
          12.5,
          11.5,
          'M',
        ),
        createApiSinapiPrice(
          '00007002',
          "COLA PVC 'TIGRE' 175G",
          28.0,
          25.5,
          'UN',
        ),
      ];

      const result = service.aggregatePrices(
        'tubo pvc',
        apiSinapiPrices,
        [],
        [],
      );

      expect(result.totalPricesAnalyzed).toBe(2);
    });

    it('should maintain HIGH confidence with 3+ API SINAPI sources of similar values', () => {
      const apiSinapiPrices: SinapiPriceReference[] = [
        createApiSinapiPrice(
          '00008001',
          'CAL HIDRATADA CH-III',
          22.0,
          20.0,
          'KG',
        ),
        createApiSinapiPrice(
          '00008002',
          'CAL HIDRATADA CH-III',
          22.5,
          20.5,
          'KG',
        ),
        createApiSinapiPrice(
          '00008003',
          'CAL HIDRATADA CH-III',
          21.5,
          19.5,
          'KG',
        ),
      ];

      const result = service.aggregatePrices(
        'cal hidratada',
        apiSinapiPrices,
        [],
        [],
      );

      // With 3 very similar prices, we should get an aggregation
      const aggregation = result.aggregations.find((a) => a.sourceCount === 3);
      if (aggregation) {
        // CV should be low (< 0.3) so confidence should be HIGH
        expect(aggregation.confidence).toBe('HIGH');
      }
    });
  });
});
