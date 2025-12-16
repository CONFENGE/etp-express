import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { GovSearchService } from './gov-search.service';
import { ComprasGovService } from '../compras-gov/compras-gov.service';
import { PncpService } from '../pncp/pncp.service';
import { SinapiService } from '../sinapi/sinapi.service';
import { SicroService } from '../sicro/sicro.service';
import { ExaService } from '../../search/exa/exa.service';
import {
  GovApiResponse,
  GovApiContract,
  GovApiPriceReference,
} from '../interfaces/gov-api.interface';

describe('GovSearchService', () => {
  let service: GovSearchService;
  let comprasGovService: jest.Mocked<ComprasGovService>;
  let pncpService: jest.Mocked<PncpService>;
  let sinapiService: jest.Mocked<SinapiService>;
  let sicroService: jest.Mocked<SicroService>;
  let exaService: jest.Mocked<ExaService>;

  // Mock data
  const mockComprasGovContract: GovApiContract = {
    id: 'siasg-1',
    title: 'Pavimentação asfáltica',
    description: 'Serviço de pavimentação',
    source: 'comprasgov',
    url: 'https://compras.gov.br/1',
    relevance: 0.9,
    metadata: {},
    fetchedAt: new Date(),
    numero: 'PREGAO-001-2024',
    ano: 2024,
    orgaoContratante: {
      cnpj: '00394460000058',
      nome: 'CONFENGE',
      uf: 'DF',
    },
    objeto: 'Pavimentação asfáltica de ruas',
    valorTotal: 1000000,
    modalidade: 'Pregão',
    status: 'Aberto',
    dataPublicacao: new Date('2024-01-01'),
  };

  const mockPncpContract: GovApiContract = {
    ...mockComprasGovContract,
    id: 'pncp-1',
    source: 'pncp',
    url: 'https://pncp.gov.br/1',
    numero: 'PNCP-001-2024',
    relevance: 0.85,
    objeto: 'Construção de ponte sobre rio municipal',
    orgaoContratante: {
      cnpj: '11111111111111',
      nome: 'Órgão PNCP',
      uf: 'SP',
    },
  };

  const mockSinapiPrice: GovApiPriceReference = {
    id: 'sinapi-1',
    title: 'Concreto FCK 30',
    description: 'Concreto usinado bombeável',
    source: 'sinapi',
    relevance: 0.95,
    metadata: {},
    fetchedAt: new Date(),
    codigo: '001234',
    descricao: 'Concreto usinado bombeável FCK 30 MPa',
    unidade: 'm³',
    precoUnitario: 450.0,
    mesReferencia: '2024-01',
    uf: 'DF',
    desonerado: false,
    categoria: 'Infraestrutura',
  };

  const mockSicroPrice: GovApiPriceReference = {
    ...mockSinapiPrice,
    id: 'sicro-1',
    source: 'sicro',
    codigo: 'SICRO-001',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GovSearchService,
        {
          provide: ComprasGovService,
          useValue: {
            search: jest.fn(),
            healthCheck: jest.fn(),
            getCacheStats: jest.fn(),
          },
        },
        {
          provide: PncpService,
          useValue: {
            search: jest.fn(),
            healthCheck: jest.fn(),
            getCacheStats: jest.fn(),
          },
        },
        {
          provide: SinapiService,
          useValue: {
            search: jest.fn(),
            healthCheck: jest.fn(),
            getCacheStats: jest.fn(),
          },
        },
        {
          provide: SicroService,
          useValue: {
            search: jest.fn(),
            healthCheck: jest.fn(),
            getCacheStats: jest.fn(),
          },
        },
        {
          provide: ExaService,
          useValue: {
            searchSimple: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, defaultValue?: any) => {
              if (key === 'EXA_FALLBACK_THRESHOLD') return 3;
              return defaultValue;
            }),
          },
        },
      ],
    }).compile();

    service = module.get<GovSearchService>(GovSearchService);
    comprasGovService = module.get(ComprasGovService);
    pncpService = module.get(PncpService);
    sinapiService = module.get(SinapiService);
    sicroService = module.get(SicroService);
    exaService = module.get(ExaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('search', () => {
    it('should search contracts from Compras.gov.br and PNCP', async () => {
      // Arrange
      const mockComprasGovResponse: GovApiResponse<GovApiContract[]> = {
        data: [mockComprasGovContract],
        total: 1,
        page: 1,
        perPage: 10,
        source: 'comprasgov',
        cached: false,
        isFallback: false,
        timestamp: new Date(),
      };

      const mockPncpResponse: GovApiResponse<GovApiContract[]> = {
        ...mockComprasGovResponse,
        data: [mockPncpContract],
        source: 'pncp',
      };

      comprasGovService.search.mockResolvedValue(mockComprasGovResponse);
      pncpService.search.mockResolvedValue(mockPncpResponse);

      // Act
      const result = await service.search('pavimentação', {
        enableExaFallback: false, // Disable fallback for this test
      });

      // Assert
      expect(result.contracts).toHaveLength(2);
      expect(result.sources).toContain('compras.gov.br');
      expect(result.sources).toContain('pncp');
      expect(result.fallbackUsed).toBe(false);
      expect(result.totalResults).toBe(2);
      expect(comprasGovService.search).toHaveBeenCalledWith('pavimentação', {
        startDate: undefined,
        endDate: undefined,
        uf: undefined,
        perPage: 10,
      });
      expect(pncpService.search).toHaveBeenCalledWith('pavimentação', {
        startDate: undefined,
        endDate: undefined,
        uf: undefined,
        perPage: 10,
      });
    });

    it('should include SINAPI prices when includePrecos and isConstrucaoCivil are true', async () => {
      // Arrange
      comprasGovService.search.mockResolvedValue({
        data: [mockComprasGovContract],
        total: 1,
        page: 1,
        perPage: 10,
        source: 'comprasgov',
        cached: false,
        isFallback: false,
        timestamp: new Date(),
      });

      pncpService.search.mockResolvedValue({
        data: [mockPncpContract],
        total: 1,
        page: 1,
        perPage: 10,
        source: 'pncp',
        cached: false,
        isFallback: false,
        timestamp: new Date(),
      });

      sinapiService.search.mockResolvedValue({
        data: [mockSinapiPrice],
        total: 1,
        page: 1,
        perPage: 10,
        source: 'sinapi',
        cached: false,
        isFallback: false,
        timestamp: new Date(),
      });

      // Act
      const result = await service.search('concreto', {
        includePrecos: true,
        isConstrucaoCivil: true,
        uf: 'DF',
      });

      // Assert
      expect(result.prices.sinapi).toHaveLength(1);
      expect(result.prices.sinapi[0]).toEqual(mockSinapiPrice);
      expect(result.sources).toContain('sinapi');
      expect(sinapiService.search).toHaveBeenCalledWith('concreto', {
        uf: 'DF',
        mesReferencia: undefined,
        perPage: 10,
      });
    });

    it('should include SICRO prices when includePrecos and isInfrastructure are true', async () => {
      // Arrange
      comprasGovService.search.mockResolvedValue({
        data: [mockComprasGovContract],
        total: 1,
        page: 1,
        perPage: 10,
        source: 'comprasgov',
        cached: false,
        isFallback: false,
        timestamp: new Date(),
      });

      pncpService.search.mockResolvedValue({
        data: [mockPncpContract],
        total: 1,
        page: 1,
        perPage: 10,
        source: 'pncp',
        cached: false,
        isFallback: false,
        timestamp: new Date(),
      });

      sicroService.search.mockResolvedValue({
        data: [mockSicroPrice],
        total: 1,
        page: 1,
        perPage: 10,
        source: 'sicro',
        cached: false,
        isFallback: false,
        timestamp: new Date(),
      });

      // Act
      const result = await service.search('pavimentação', {
        includePrecos: true,
        isInfrastructure: true,
        uf: 'DF',
      });

      // Assert
      expect(result.prices.sicro).toHaveLength(1);
      expect(result.prices.sicro[0]).toEqual(mockSicroPrice);
      expect(result.sources).toContain('sicro');
      expect(sicroService.search).toHaveBeenCalledWith('pavimentação', {
        uf: 'DF',
        mesReferencia: undefined,
        perPage: 10,
      });
    });

    it('should include both SINAPI and SICRO when both flags are true', async () => {
      // Arrange
      comprasGovService.search.mockResolvedValue({
        data: [mockComprasGovContract],
        total: 1,
        page: 1,
        perPage: 10,
        source: 'comprasgov',
        cached: false,
        isFallback: false,
        timestamp: new Date(),
      });

      pncpService.search.mockResolvedValue({
        data: [mockPncpContract],
        total: 1,
        page: 1,
        perPage: 10,
        source: 'pncp',
        cached: false,
        isFallback: false,
        timestamp: new Date(),
      });

      sinapiService.search.mockResolvedValue({
        data: [mockSinapiPrice],
        total: 1,
        page: 1,
        perPage: 10,
        source: 'sinapi',
        cached: false,
        isFallback: false,
        timestamp: new Date(),
      });

      sicroService.search.mockResolvedValue({
        data: [mockSicroPrice],
        total: 1,
        page: 1,
        perPage: 10,
        source: 'sicro',
        cached: false,
        isFallback: false,
        timestamp: new Date(),
      });

      // Act
      const result = await service.search('infraestrutura', {
        includePrecos: true,
        isConstrucaoCivil: true,
        isInfrastructure: true,
      });

      // Assert
      expect(result.prices.sinapi).toHaveLength(1);
      expect(result.prices.sicro).toHaveLength(1);
      expect(result.sources).toContain('sinapi');
      expect(result.sources).toContain('sicro');
    });

    it('should use Exa fallback when results are below threshold', async () => {
      // Arrange
      comprasGovService.search.mockResolvedValue({
        data: [mockComprasGovContract],
        total: 1,
        page: 1,
        perPage: 10,
        source: 'comprasgov',
        cached: false,
        isFallback: false,
        timestamp: new Date(),
      });

      pncpService.search.mockResolvedValue({
        data: [],
        total: 0,
        page: 1,
        perPage: 10,
        source: 'pncp',
        cached: false,
        isFallback: false,
        timestamp: new Date(),
      });

      exaService.searchSimple.mockResolvedValue({
        results: [
          {
            title: 'Exa result 1',
            url: 'https://example.com/1',
            snippet: 'Exa snippet',
            relevance: 0.8,
            source: 'Exa AI',
          },
        ],
        summary: 'Exa search summary',
        sources: ['https://example.com/1'],
        isFallback: false,
      });

      // Act
      const result = await service.search('rare query', {
        enableExaFallback: true,
      });

      // Assert
      expect(result.fallbackUsed).toBe(true);
      expect(result.sources).toContain('exa');
      expect(result.contracts.length).toBeGreaterThan(1);
      expect(exaService.searchSimple).toHaveBeenCalledWith(
        'licitação pública brasil rare query',
      );
    });

    it('should NOT use Exa fallback when enableExaFallback is false', async () => {
      // Arrange
      comprasGovService.search.mockResolvedValue({
        data: [mockComprasGovContract],
        total: 1,
        page: 1,
        perPage: 10,
        source: 'comprasgov',
        cached: false,
        isFallback: false,
        timestamp: new Date(),
      });

      pncpService.search.mockResolvedValue({
        data: [],
        total: 0,
        page: 1,
        perPage: 10,
        source: 'pncp',
        cached: false,
        isFallback: false,
        timestamp: new Date(),
      });

      // Act
      const result = await service.search('rare query', {
        enableExaFallback: false,
      });

      // Assert
      expect(result.fallbackUsed).toBe(false);
      expect(result.sources).not.toContain('exa');
      expect(exaService.searchSimple).not.toHaveBeenCalled();
    });

    it('should deduplicate contracts with same CNPJ and identical objeto', async () => {
      // Arrange
      const duplicate1 = { ...mockComprasGovContract, relevance: 0.9 };
      const duplicate2 = {
        ...mockPncpContract,
        orgaoContratante: mockComprasGovContract.orgaoContratante,
        objeto: mockComprasGovContract.objeto, // Same objeto = same dedup key
        relevance: 0.85,
      };

      comprasGovService.search.mockResolvedValue({
        data: [duplicate1],
        total: 1,
        page: 1,
        perPage: 10,
        source: 'comprasgov',
        cached: false,
        isFallback: false,
        timestamp: new Date(),
      });

      pncpService.search.mockResolvedValue({
        data: [duplicate2 as GovApiContract],
        total: 1,
        page: 1,
        perPage: 10,
        source: 'pncp',
        cached: false,
        isFallback: false,
        timestamp: new Date(),
      });

      // Act
      const result = await service.search('pavimentação');

      // Assert
      // Should keep only 1 (higher relevance)
      expect(result.contracts).toHaveLength(1);
      expect(result.contracts[0].relevance).toBe(0.9);
    });

    it('should NOT deduplicate contracts with different CNPJ', async () => {
      // Arrange
      const contract1 = mockComprasGovContract;
      const contract2 = {
        ...mockPncpContract,
        orgaoContratante: {
          cnpj: '11111111111111',
          nome: 'Outro órgão',
          uf: 'SP',
        },
        objeto: mockComprasGovContract.objeto, // Same object but different CNPJ
      };

      comprasGovService.search.mockResolvedValue({
        data: [contract1],
        total: 1,
        page: 1,
        perPage: 10,
        source: 'comprasgov',
        cached: false,
        isFallback: false,
        timestamp: new Date(),
      });

      pncpService.search.mockResolvedValue({
        data: [contract2 as GovApiContract],
        total: 1,
        page: 1,
        perPage: 10,
        source: 'pncp',
        cached: false,
        isFallback: false,
        timestamp: new Date(),
      });

      // Act
      const result = await service.search('pavimentação');

      // Assert
      // Should keep both (different CNPJs)
      expect(result.contracts).toHaveLength(2);
    });

    it('should handle API errors gracefully and continue with other sources', async () => {
      // Arrange
      comprasGovService.search.mockRejectedValue(new Error('API timeout'));
      pncpService.search.mockResolvedValue({
        data: [mockPncpContract],
        total: 1,
        page: 1,
        perPage: 10,
        source: 'pncp',
        cached: false,
        isFallback: false,
        timestamp: new Date(),
      });

      // Act
      const result = await service.search('test query');

      // Assert
      // Should still return PNCP results
      expect(result.contracts).toHaveLength(1);
      expect(result.contracts[0].source).toBe('pncp');
    });

    it('should sort results by relevance descending', async () => {
      // Arrange
      const lowRelevance = { ...mockComprasGovContract, relevance: 0.5 };
      const highRelevance = { ...mockPncpContract, relevance: 0.95 };

      comprasGovService.search.mockResolvedValue({
        data: [lowRelevance],
        total: 1,
        page: 1,
        perPage: 10,
        source: 'comprasgov',
        cached: false,
        isFallback: false,
        timestamp: new Date(),
      });

      pncpService.search.mockResolvedValue({
        data: [highRelevance],
        total: 1,
        page: 1,
        perPage: 10,
        source: 'pncp',
        cached: false,
        isFallback: false,
        timestamp: new Date(),
      });

      // Act
      const result = await service.search('test');

      // Assert
      expect(result.contracts[0].relevance).toBe(0.95);
      expect(result.contracts[1].relevance).toBe(0.5);
    });
  });

  describe('healthCheck', () => {
    it('should return health status from all sources', async () => {
      // Arrange
      const mockHealthStatus = {
        source: 'comprasgov' as const,
        healthy: true,
        latencyMs: 100,
        lastCheck: new Date(),
        circuitState: 'closed' as const,
      };

      comprasGovService.healthCheck.mockResolvedValue(mockHealthStatus);
      pncpService.healthCheck.mockResolvedValue({
        ...mockHealthStatus,
        source: 'pncp',
      });
      sinapiService.healthCheck.mockResolvedValue({
        ...mockHealthStatus,
        source: 'sinapi',
      });
      sicroService.healthCheck.mockResolvedValue({
        ...mockHealthStatus,
        source: 'sicro',
      });

      // Act
      const result = await service.healthCheck();

      // Assert
      expect(result.comprasGov).toBeDefined();
      expect(result.pncp).toBeDefined();
      expect(result.sinapi).toBeDefined();
      expect(result.sicro).toBeDefined();
      expect(result.comprasGov.healthy).toBe(true);
    });

    it('should handle health check failures gracefully', async () => {
      // Arrange
      comprasGovService.healthCheck.mockRejectedValue(new Error('Timeout'));
      pncpService.healthCheck.mockResolvedValue({
        source: 'pncp',
        healthy: true,
        latencyMs: 100,
        lastCheck: new Date(),
        circuitState: 'closed',
      });
      sinapiService.healthCheck.mockResolvedValue({
        source: 'sinapi',
        healthy: true,
        latencyMs: 100,
        lastCheck: new Date(),
        circuitState: 'closed',
      });
      sicroService.healthCheck.mockResolvedValue({
        source: 'sicro',
        healthy: true,
        latencyMs: 100,
        lastCheck: new Date(),
        circuitState: 'closed',
      });

      // Act
      const result = await service.healthCheck();

      // Assert
      expect(result.comprasGov).toBeNull();
      expect(result.pncp).toBeDefined();
    });
  });

  describe('getCacheStats', () => {
    it('should return cache statistics from all sources', () => {
      // Arrange
      const mockStats = { hits: 10, misses: 5, keys: 15 };
      comprasGovService.getCacheStats.mockReturnValue(mockStats);
      pncpService.getCacheStats.mockReturnValue(mockStats);
      sinapiService.getCacheStats.mockReturnValue(mockStats);
      sicroService.getCacheStats.mockReturnValue(mockStats);

      // Act
      const result = service.getCacheStats();

      // Assert
      expect(result.comprasGov).toEqual(mockStats);
      expect(result.pncp).toEqual(mockStats);
      expect(result.sinapi).toEqual(mockStats);
      expect(result.sicro).toEqual(mockStats);
    });
  });
});
