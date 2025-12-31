import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { ComprasGovService } from './compras-gov.service';
import { GovApiCache } from '../utils/gov-api-cache';
import { GovApiClient } from '../utils/gov-api-client';
import {
  ComprasGovLicitacaoRaw,
  ComprasGovListResponse,
  ComprasGovModalidade,
} from './compras-gov.types';

// Mock GovApiClient
jest.mock('../utils/gov-api-client', () => ({
  GovApiClient: jest.fn().mockImplementation(() => ({
    get: jest.fn(),
    healthCheck: jest.fn(),
    getCircuitState: jest.fn().mockReturnValue({
      opened: false,
      halfOpen: false,
      closed: true,
      stats: {},
    }),
    isAvailable: jest.fn().mockReturnValue(true),
    getRateLimitStats: jest.fn().mockReturnValue({
      current: 0,
      max: 60,
      windowMs: 60000,
    }),
  })),
  createGovApiClient: jest.fn().mockImplementation(() => ({
    get: jest.fn(),
    healthCheck: jest.fn(),
    getCircuitState: jest.fn().mockReturnValue({
      opened: false,
      halfOpen: false,
      closed: true,
      stats: {},
    }),
    isAvailable: jest.fn().mockReturnValue(true),
    getRateLimitStats: jest.fn().mockReturnValue({
      current: 0,
      max: 60,
      windowMs: 60000,
    }),
  })),
}));

describe('ComprasGovService', () => {
  let service: ComprasGovService;
  let mockCache: jest.Mocked<GovApiCache>;
  let mockClient: jest.Mocked<GovApiClient>;

  const mockLicitacao: ComprasGovLicitacaoRaw = {
    identificador: 'PREGAO-12345-2024',
    numero_aviso: 12345,
    objeto: 'Aquisicao de licencas de software para gestao publica',
    modalidade: ComprasGovModalidade.PREGAO,
    modalidade_descricao: 'Pregao',
    data_publicacao: '2024-06-15T00:00:00Z',
    data_abertura_proposta: '2024-06-30T10:00:00Z',
    uasg: 170001,
    uasg_nome: 'MINISTERIO DA FAZENDA',
    uf_uasg: 'DF',
    situacao_aviso: 'Publicado',
    valor_estimado_total: 500000,
    pregao_eletronico: true,
  };

  const mockApiResponse: ComprasGovListResponse<ComprasGovLicitacaoRaw> = {
    _embedded: {
      licitacoes: [mockLicitacao],
    },
    total: 1,
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    // Create mock cache
    mockCache = {
      get: jest.fn().mockResolvedValue(null),
      set: jest.fn().mockResolvedValue(undefined),
      delete: jest.fn().mockResolvedValue(undefined),
      invalidateSource: jest.fn().mockResolvedValue(undefined),
      getStats: jest.fn().mockReturnValue({ hits: 0, misses: 0, hitRate: 0 }),
      getAllStats: jest.fn(),
      getConfig: jest.fn(),
      isAvailable: jest.fn().mockReturnValue(true),
      getKeyCount: jest.fn().mockResolvedValue(0),
      onModuleDestroy: jest.fn(),
    } as unknown as jest.Mocked<GovApiCache>;

    // Create mock client
    mockClient = {
      get: jest.fn(),
      post: jest.fn(),
      healthCheck: jest.fn(),
      getCircuitState: jest.fn().mockReturnValue({
        opened: false,
        halfOpen: false,
        closed: true,
        stats: {},
      }),
      isAvailable: jest.fn().mockReturnValue(true),
      getRateLimitStats: jest.fn().mockReturnValue({
        current: 0,
        max: 60,
        windowMs: 60000,
      }),
    } as unknown as jest.Mocked<GovApiClient>;

    // Mock createGovApiClient to return our mock
    const { createGovApiClient } = require('../utils/gov-api-client');
    createGovApiClient.mockReturnValue(mockClient);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ComprasGovService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue(null),
          },
        },
        {
          provide: GovApiCache,
          useValue: mockCache,
        },
      ],
    }).compile();

    service = module.get<ComprasGovService>(ComprasGovService);

    // Trigger onModuleInit to initialize client
    service.onModuleInit();
  });

  describe('initialization', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('should have source set to comprasgov', () => {
      expect(service.source).toBe('comprasgov');
    });

    it('should initialize client on module init', () => {
      const { createGovApiClient } = require('../utils/gov-api-client');
      expect(createGovApiClient).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({
          baseUrl: 'https://compras.dados.gov.br',
          source: 'comprasgov',
        }),
      );
    });
  });

  describe('search()', () => {
    it('should search licitacoes by keyword', async () => {
      mockClient.get.mockResolvedValue(mockApiResponse);

      const result = await service.search('software');

      expect(mockClient.get).toHaveBeenCalledWith(
        '/licitacoes/v1/licitacoes.json',
        expect.objectContaining({
          params: expect.objectContaining({
            objeto: 'software',
          }),
        }),
      );

      expect(result.data).toHaveLength(1);
      expect(result.data[0].description).toContain('software');
      expect(result.source).toBe('comprasgov');
      expect(result.cached).toBe(false);
      expect(result.isFallback).toBe(false);
    });

    it('should return cached results if available', async () => {
      const cachedResponse = {
        data: [
          {
            id: 'CACHED-123',
            title: 'Cached Result',
            description: 'From cache',
            source: 'comprasgov',
            relevance: 1.0,
            fetchedAt: new Date(),
          },
        ],
        total: 1,
        page: 1,
        perPage: 100,
        source: 'comprasgov',
        cached: true,
        isFallback: false,
        timestamp: new Date(),
      };

      mockCache.get.mockResolvedValue(cachedResponse);

      const result = await service.search('software');

      expect(mockCache.get).toHaveBeenCalled();
      expect(mockClient.get).not.toHaveBeenCalled();
      expect(result.cached).toBe(true);
    });

    it('should apply date filters correctly', async () => {
      mockClient.get.mockResolvedValue(mockApiResponse);

      await service.search('software', {
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-12-31'),
      });

      expect(mockClient.get).toHaveBeenCalledWith(
        '/licitacoes/v1/licitacoes.json',
        expect.objectContaining({
          params: expect.objectContaining({
            objeto: 'software',
            data_publicacao_min: '2024-01-01',
            data_publicacao_max: '2024-12-31',
          }),
        }),
      );
    });

    it('should apply UF filter correctly', async () => {
      mockClient.get.mockResolvedValue(mockApiResponse);

      await service.search('software', { uf: 'DF' });

      expect(mockClient.get).toHaveBeenCalledWith(
        '/licitacoes/v1/licitacoes.json',
        expect.objectContaining({
          params: expect.objectContaining({
            objeto: 'software',
            uf_uasg: 'DF',
          }),
        }),
      );
    });

    it('should apply modalidade filter correctly', async () => {
      mockClient.get.mockResolvedValue(mockApiResponse);

      await service.search('software', { modalidade: 'pregao' });

      expect(mockClient.get).toHaveBeenCalledWith(
        '/licitacoes/v1/licitacoes.json',
        expect.objectContaining({
          params: expect.objectContaining({
            objeto: 'software',
            modalidade: ComprasGovModalidade.PREGAO,
          }),
        }),
      );
    });

    it('should apply value range filters correctly', async () => {
      mockClient.get.mockResolvedValue(mockApiResponse);

      await service.search('software', {
        valorMinimo: 100000,
        valorMaximo: 1000000,
      });

      expect(mockClient.get).toHaveBeenCalledWith(
        '/licitacoes/v1/licitacoes.json',
        expect.objectContaining({
          params: expect.objectContaining({
            objeto: 'software',
            valor_estimado_total_min: 100000,
            valor_estimado_total_max: 1000000,
          }),
        }),
      );
    });

    it('should handle pagination correctly', async () => {
      mockClient.get.mockResolvedValue(mockApiResponse);

      await service.search('software', { page: 2, perPage: 50 });

      expect(mockClient.get).toHaveBeenCalledWith(
        '/licitacoes/v1/licitacoes.json',
        expect.objectContaining({
          params: expect.objectContaining({
            objeto: 'software',
            offset: 50, // (page 2 - 1) * 50 = 50
          }),
        }),
      );
    });

    it('should return fallback response when circuit breaker is open', async () => {
      mockClient.isAvailable.mockReturnValue(false);

      const result = await service.search('software');

      expect(mockClient.get).not.toHaveBeenCalled();
      expect(result.data).toEqual([]);
      expect(result.isFallback).toBe(true);
    });

    it('should return fallback response on API error', async () => {
      mockClient.get.mockRejectedValue(new Error('API unavailable'));

      const result = await service.search('software');

      expect(result.data).toEqual([]);
      expect(result.isFallback).toBe(true);
    });

    it('should cache successful results', async () => {
      mockClient.get.mockResolvedValue(mockApiResponse);

      await service.search('software');

      expect(mockCache.set).toHaveBeenCalledWith(
        'comprasgov',
        expect.any(String),
        expect.objectContaining({
          data: expect.any(Array),
          source: 'comprasgov',
        }),
        3600, // 1 hour TTL
      );
    });

    it('should transform API response to GovApiContract format', async () => {
      mockClient.get.mockResolvedValue(mockApiResponse);

      const result = await service.search('software');

      expect(result.data[0]).toMatchObject({
        id: 'PREGAO-12345-2024',
        title: expect.stringContaining('Pregao'),
        description: expect.stringContaining('software'),
        source: 'comprasgov',
        objeto: expect.stringContaining('software'),
        modalidade: 'Pregao',
        status: 'Publicado',
        uasg: 170001,
        numeroAviso: 12345,
        pregaoEletronico: true,
      });
    });

    it('should handle empty API response', async () => {
      mockClient.get.mockResolvedValue({
        _embedded: {
          licitacoes: [],
        },
        total: 0,
      });

      const result = await service.search('nonexistent');

      expect(result.data).toEqual([]);
      expect(result.total).toBe(0);
    });

    it('should handle API response without _embedded', async () => {
      // Some endpoints return array directly
      mockClient.get.mockResolvedValue([mockLicitacao]);

      const result = await service.search('software');

      expect(result.data).toHaveLength(1);
    });
  });

  describe('getById()', () => {
    it('should get licitacao by ID', async () => {
      mockClient.get.mockResolvedValue(mockLicitacao);

      const result = await service.getById('PREGAO-12345-2024');

      expect(mockClient.get).toHaveBeenCalledWith(
        '/licitacoes/id/PREGAO-12345-2024.json',
      );
      expect(result).toMatchObject({
        id: 'PREGAO-12345-2024',
        source: 'comprasgov',
      });
    });

    it('should return cached result if available', async () => {
      const cachedContract = {
        id: 'CACHED-123',
        title: 'Cached Contract',
        source: 'comprasgov',
      };

      mockCache.get.mockResolvedValue(cachedContract);

      const result = await service.getById('CACHED-123');

      expect(mockCache.get).toHaveBeenCalled();
      expect(mockClient.get).not.toHaveBeenCalled();
      expect(result).toEqual(cachedContract);
    });

    it('should return null when circuit breaker is open', async () => {
      mockClient.isAvailable.mockReturnValue(false);

      const result = await service.getById('PREGAO-12345-2024');

      expect(mockClient.get).not.toHaveBeenCalled();
      expect(result).toBeNull();
    });

    it('should return null on API error', async () => {
      mockClient.get.mockRejectedValue(new Error('Not found'));

      const result = await service.getById('NONEXISTENT-ID');

      expect(result).toBeNull();
    });

    it('should cache successful result', async () => {
      mockClient.get.mockResolvedValue(mockLicitacao);

      await service.getById('PREGAO-12345-2024');

      expect(mockCache.set).toHaveBeenCalledWith(
        'comprasgov',
        expect.stringContaining('licitacao:PREGAO-12345-2024'),
        expect.any(Object),
        3600,
      );
    });

    it('should return null for empty response', async () => {
      mockClient.get.mockResolvedValue(null);

      const result = await service.getById('EMPTY-ID');

      expect(result).toBeNull();
    });
  });

  describe('healthCheck()', () => {
    it('should return healthy status on successful check', async () => {
      mockClient.healthCheck.mockResolvedValue(100);

      const result = await service.healthCheck();

      expect(result).toMatchObject({
        source: 'comprasgov',
        healthy: true,
        latencyMs: expect.any(Number),
        lastCheck: expect.any(Date),
        circuitState: 'closed',
      });
    });

    it('should return unhealthy status on failed check', async () => {
      mockClient.healthCheck.mockRejectedValue(new Error('Connection refused'));

      const result = await service.healthCheck();

      expect(result).toMatchObject({
        source: 'comprasgov',
        healthy: false,
        error: 'Connection refused',
        circuitState: expect.any(String),
      });
    });

    it('should reflect circuit breaker state', async () => {
      mockClient.getCircuitState.mockReturnValue({
        opened: true,
        halfOpen: false,
        closed: false,
        stats: {},
      });
      mockClient.healthCheck.mockResolvedValue(100);

      const result = await service.healthCheck();

      expect(result.circuitState).toBe('open');
    });

    it('should reflect half-open circuit state', async () => {
      mockClient.getCircuitState.mockReturnValue({
        opened: false,
        halfOpen: true,
        closed: false,
        stats: {},
      });
      mockClient.healthCheck.mockResolvedValue(100);

      const result = await service.healthCheck();

      expect(result.circuitState).toBe('half-open');
    });
  });

  describe('getCircuitState()', () => {
    it('should return circuit breaker state from client', () => {
      const expectedState = {
        opened: false,
        halfOpen: false,
        closed: true,
        stats: { failures: 0 },
      };
      mockClient.getCircuitState.mockReturnValue(expectedState);

      const result = service.getCircuitState();

      expect(result).toEqual(expectedState);
    });
  });

  describe('getCacheStats()', () => {
    it('should return cache statistics', () => {
      const stats = service.getCacheStats();

      expect(stats).toMatchObject({
        hits: expect.any(Number),
        misses: expect.any(Number),
        keys: expect.any(Number),
      });
    });

    it('should track cache hits', async () => {
      const cachedResponse = {
        data: [],
        total: 0,
        page: 1,
        perPage: 100,
        source: 'comprasgov',
        cached: true,
        isFallback: false,
        timestamp: new Date(),
      };

      mockCache.get.mockResolvedValue(cachedResponse);

      await service.search('software');

      const stats = service.getCacheStats();
      expect(stats.hits).toBe(1);
    });

    it('should track cache misses', async () => {
      mockCache.get.mockResolvedValue(null);
      mockClient.get.mockResolvedValue(mockApiResponse);

      await service.search('software');

      const stats = service.getCacheStats();
      expect(stats.misses).toBe(1);
    });
  });

  describe('filter mapping', () => {
    it('should map concorrencia modalidade', async () => {
      mockClient.get.mockResolvedValue(mockApiResponse);

      await service.search('software', { modalidade: 'concorrencia' });

      expect(mockClient.get).toHaveBeenCalledWith(
        '/licitacoes/v1/licitacoes.json',
        expect.objectContaining({
          params: expect.objectContaining({
            modalidade: ComprasGovModalidade.CONCORRENCIA,
          }),
        }),
      );
    });

    it('should map dispensa modalidade', async () => {
      mockClient.get.mockResolvedValue(mockApiResponse);

      await service.search('software', { modalidade: 'dispensa' });

      expect(mockClient.get).toHaveBeenCalledWith(
        '/licitacoes/v1/licitacoes.json',
        expect.objectContaining({
          params: expect.objectContaining({
            modalidade: ComprasGovModalidade.DISPENSA,
          }),
        }),
      );
    });

    it('should ignore unknown modalidade', async () => {
      mockClient.get.mockResolvedValue(mockApiResponse);

      await service.search('software', { modalidade: 'unknown' });

      expect(mockClient.get).toHaveBeenCalledWith(
        '/licitacoes/v1/licitacoes.json',
        expect.objectContaining({
          params: expect.not.objectContaining({
            modalidade: expect.anything(),
          }),
        }),
      );
    });

    it('should map CNPJ filter', async () => {
      mockClient.get.mockResolvedValue(mockApiResponse);

      await service.search('software', { cnpj: '12345678000190' });

      expect(mockClient.get).toHaveBeenCalledWith(
        '/licitacoes/v1/licitacoes.json',
        expect.objectContaining({
          params: expect.objectContaining({
            cnpj_vencedor: '12345678000190',
          }),
        }),
      );
    });

    it('should map orgao filter', async () => {
      mockClient.get.mockResolvedValue(mockApiResponse);

      await service.search('software', { orgao: '170001' });

      expect(mockClient.get).toHaveBeenCalledWith(
        '/licitacoes/v1/licitacoes.json',
        expect.objectContaining({
          params: expect.objectContaining({
            orgao: 170001,
          }),
        }),
      );
    });
  });
});
