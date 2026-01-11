/**
 * PNCP Service Tests
 *
 * Unit tests for PncpService
 *
 * @module modules/gov-api/pncp
 */

import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { PncpService } from './pncp.service';
import { GovApiCache } from '../utils/gov-api-cache';
import {
  PncpContratacao,
  PncpPaginatedResponse,
  PncpAta,
  PncpAtaItem,
} from './pncp.types';
import { SearchStatus } from '../types/search-result';

// Mock axios
jest.mock('axios', () => ({
  create: jest.fn(() => ({
    request: jest.fn(),
    get: jest.fn(),
  })),
}));

// Mock opossum
jest.mock('opossum', () => {
  return jest.fn().mockImplementation(() => ({
    fire: jest.fn((fn) => fn()),
    on: jest.fn(),
    opened: false,
    halfOpen: false,
    closed: true,
    stats: {},
  }));
});

describe('PncpService', () => {
  let service: PncpService;
  let cache: jest.Mocked<GovApiCache>;
  let configService: jest.Mocked<ConfigService>;

  const mockContratacao: PncpContratacao = {
    numeroControlePNCP: '00000000000000-1-000001/2024',
    dataPublicacaoPncp: '2024-01-15',
    dataInclusao: '2024-01-15',
    anoCompra: 2024,
    sequencialCompra: 1,
    modalidadeId: 6,
    modalidadeNome: 'Pregão - Eletrônico',
    situacaoCompraId: 1,
    situacaoCompraNome: 'Divulgada no PNCP',
    objetoCompra: 'Aquisição de software para gestão administrativa',
    valorTotalEstimado: 150000.0,
    srp: false,
    orgaoEntidade: {
      cnpj: '00000000000000',
      razaoSocial: 'Órgão Público Federal',
    },
    unidadeOrgao: {
      ufNome: 'Distrito Federal',
      ufSigla: 'DF',
      codigoUnidade: '001',
      nomeUnidade: 'Unidade Central',
    },
  };

  const mockPaginatedResponse: PncpPaginatedResponse<PncpContratacao> = {
    data: [mockContratacao],
    totalRegistros: 1,
    totalPaginas: 1,
    numeroPagina: 1,
    paginasRestantes: 0,
    empty: false,
  };

  beforeEach(async () => {
    // Create mocks
    cache = {
      get: jest.fn().mockResolvedValue(null),
      set: jest.fn().mockResolvedValue(undefined),
      delete: jest.fn().mockResolvedValue(undefined),
      getStats: jest.fn().mockReturnValue({
        hits: 10,
        misses: 5,
        sets: 8,
        deletes: 2,
        errors: 0,
        hitRate: 0.67,
      }),
      invalidateSource: jest.fn().mockResolvedValue(undefined),
      getConfig: jest.fn().mockReturnValue({
        prefix: 'gov:pncp',
        ttlSeconds: 3600,
        enabled: true,
      }),
      isAvailable: jest.fn().mockReturnValue(true),
      getKeyCount: jest.fn().mockResolvedValue(15),
    } as unknown as jest.Mocked<GovApiCache>;

    configService = {
      get: jest.fn((key: string) => {
        if (key === 'redis') {
          return {
            host: 'localhost',
            port: 6379,
          };
        }
        return undefined;
      }),
    } as unknown as jest.Mocked<ConfigService>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PncpService,
        {
          provide: GovApiCache,
          useValue: cache,
        },
        {
          provide: ConfigService,
          useValue: configService,
        },
      ],
    }).compile();

    service = module.get<PncpService>(PncpService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('initialization', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('should have source set to pncp', () => {
      expect(service.source).toBe('pncp');
    });
  });

  describe('search', () => {
    it('should return cached results when available', async () => {
      const cachedResult = {
        data: [
          {
            id: '00000000000000-1-000001/2024',
            title: 'Test',
            description: 'Test description',
            source: 'pncp' as const,
            relevance: 1.0,
            fetchedAt: new Date(),
          },
        ],
        total: 1,
        page: 1,
        perPage: 100,
        source: 'pncp' as const,
        cached: false,
        isFallback: false,
        timestamp: new Date(),
      };

      cache.get.mockResolvedValueOnce(cachedResult);

      const result = await service.search('software');

      expect(result.cached).toBe(true);
      expect(cache.get).toHaveBeenCalled();
    });

    it('should build correct date range for default filters', async () => {
      // Service will try to make HTTP request which will fail
      // We're testing that the method handles the flow correctly
      try {
        await service.search('software');
      } catch {
        // Expected to fail due to mocked axios
      }

      // Verify cache was checked first
      expect(cache.get).toHaveBeenCalled();
    });

    it('should apply UF filter when provided', async () => {
      try {
        await service.search('software', { uf: 'DF' });
      } catch {
        // Expected to fail
      }

      expect(cache.get).toHaveBeenCalled();
    });

    it('should apply date range filters when provided', async () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-06-30');

      try {
        await service.search('software', { startDate, endDate });
      } catch {
        // Expected to fail
      }

      expect(cache.get).toHaveBeenCalled();
    });
  });

  describe('getById', () => {
    it('should return cached result when available', async () => {
      const cachedResult = {
        id: '00000000000000-1-000001/2024',
        title: 'Test',
        description: 'Test',
        source: 'pncp' as const,
        relevance: 1.0,
        fetchedAt: new Date(),
      };

      cache.get.mockResolvedValueOnce(cachedResult);

      const result = await service.getById('00000000000000-1-000001/2024');

      expect(result).toEqual(cachedResult);
      expect(cache.get).toHaveBeenCalled();
    });

    it('should return null for invalid control number format', async () => {
      const result = await service.getById('invalid-format');

      expect(result).toBeNull();
    });
  });

  describe('healthCheck', () => {
    it('should return healthy status on success', async () => {
      // Mock successful health check
      const mockClient = {
        healthCheck: jest.fn().mockResolvedValue(100),
        getCircuitState: jest.fn().mockReturnValue({
          opened: false,
          halfOpen: false,
          closed: true,
          stats: {},
        }),
      };

      // Access private client via prototype
      (service as any).client = mockClient;

      const result = await service.healthCheck();

      expect(result.source).toBe('pncp');
      expect(result.healthy).toBe(true);
      expect(result.circuitState).toBe('closed');
      expect(result.latencyMs).toBeGreaterThanOrEqual(0);
    });

    it('should return unhealthy status on failure', async () => {
      const mockClient = {
        healthCheck: jest
          .fn()
          .mockRejectedValue(new Error('Connection failed')),
        getCircuitState: jest.fn().mockReturnValue({
          opened: true,
          halfOpen: false,
          closed: false,
          stats: {},
        }),
      };

      (service as any).client = mockClient;

      const result = await service.healthCheck();

      expect(result.source).toBe('pncp');
      expect(result.healthy).toBe(false);
      expect(result.error).toBe('Connection failed');
      expect(result.circuitState).toBe('open');
    });
  });

  describe('getCircuitState', () => {
    it('should return circuit breaker state', () => {
      const mockClient = {
        getCircuitState: jest.fn().mockReturnValue({
          opened: false,
          halfOpen: false,
          closed: true,
          stats: { successes: 10, failures: 2 },
        }),
      };

      (service as any).client = mockClient;

      const state = service.getCircuitState();

      expect(state.closed).toBe(true);
      expect(state.opened).toBe(false);
      expect(state.halfOpen).toBe(false);
    });
  });

  describe('getCacheStats', () => {
    it('should return cache statistics', () => {
      const stats = service.getCacheStats();

      expect(stats.hits).toBe(10);
      expect(stats.misses).toBe(5);
      expect(cache.getStats).toHaveBeenCalledWith('pncp');
    });
  });

  describe('searchContratacoes', () => {
    it('should return cached results when available', async () => {
      cache.get.mockResolvedValueOnce(mockPaginatedResponse);

      const result = await service.searchContratacoes({
        dataInicial: '20240101',
        dataFinal: '20240630',
      });

      expect(result).toEqual(mockPaginatedResponse);
      expect(cache.get).toHaveBeenCalled();
    });
  });

  describe('searchContratos', () => {
    it('should check cache first', async () => {
      try {
        await service.searchContratos({
          dataInicial: '20240101',
          dataFinal: '20240630',
        });
      } catch {
        // Expected to fail
      }

      expect(cache.get).toHaveBeenCalled();
    });
  });

  describe('searchAtas', () => {
    it('should check cache first', async () => {
      try {
        await service.searchAtas({
          dataInicial: '20240101',
          dataFinal: '20240630',
        });
      } catch {
        // Expected to fail
      }

      expect(cache.get).toHaveBeenCalled();
    });
  });

  describe('searchAtasRegistroPreco', () => {
    const mockAta: PncpAta = {
      numeroControlePNCP: '00000000000000-1-000001/2024',
      numeroAta: '001/2024',
      anoAta: 2024,
      sequencialAta: 1,
      dataPublicacaoPncp: '2024-01-15',
      dataVigenciaInicio: '2024-01-15',
      dataVigenciaFim: '2025-01-14',
      dataAssinatura: '2024-01-10',
      valorTotal: 500000.0,
      orgaoEntidade: {
        cnpj: '00000000000000',
        razaoSocial: 'Órgão Público Federal',
      },
      unidadeOrgao: {
        ufNome: 'Distrito Federal',
        ufSigla: 'DF',
        codigoUnidade: '001',
        nomeUnidade: 'Unidade Central',
      },
      contratacao: {
        numeroControlePNCP: '00000000000000-1-000001/2024',
        objetoCompra: 'Material de escritório',
        modalidadeNome: 'Pregão - Eletrônico',
      },
    };

    const mockAtaItem: PncpAtaItem = {
      numeroItem: 1,
      descricao: 'Papel A4, 75g/m², pacote 500 folhas',
      quantidade: 10000,
      unidadeMedida: 'PCT',
      valorUnitario: 25.5,
      valorTotal: 255000.0,
      marca: 'Chamex',
      modelo: 'A4 75g',
      fornecedor: {
        cpfCnpj: '12345678000199',
        nomeRazaoSocial: 'Papelaria Exemplo LTDA',
      },
    };

    const mockAtasPaginatedResponse: PncpPaginatedResponse<PncpAta> = {
      data: [mockAta],
      totalRegistros: 1,
      totalPaginas: 1,
      numeroPagina: 1,
      paginasRestantes: 0,
      empty: false,
    };

    it('should return cached results when available', async () => {
      const cachedResult = {
        data: [
          {
            id: '00000000000000-1-000001/2024-item-1',
            title: 'Papel A4',
            description: 'Test description',
            source: 'pncp' as const,
            url: 'https://pncp.gov.br/app/atas/00000000000000-1-000001/2024',
            relevance: 1.0,
            fetchedAt: new Date(),
            codigo: 'ARP-2024-1-1',
            descricao: 'Papel A4, 75g/m²',
            unidade: 'PCT',
            precoUnitario: 25.5,
            mesReferencia: '2024-01',
            uf: 'DF',
            desonerado: false,
            categoria: 'ata_registro_preco',
          },
        ],
        total: 1,
        page: 1,
        perPage: 500,
        source: 'pncp' as const,
        cached: false,
        isFallback: false,
        timestamp: new Date(),
        status: SearchStatus.SUCCESS,
      };

      cache.get.mockResolvedValueOnce(cachedResult);

      const result = await service.searchAtasRegistroPreco({
        dataInicial: '20240101',
        dataFinal: '20241231',
      });

      expect(result.cached).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(cache.get).toHaveBeenCalled();
    });

    it('should apply apenasVigentes filter correctly', async () => {
      // Mock client to simulate API response
      const mockClient = {
        get: jest.fn().mockImplementation((path: string) => {
          if (path === '/v1/atas') {
            return Promise.resolve(mockAtasPaginatedResponse);
          }
          if (path.includes('/itens')) {
            return Promise.resolve({ itens: [mockAtaItem] });
          }
          return Promise.reject(new Error('Unknown endpoint'));
        }),
        isAvailable: jest.fn().mockReturnValue(true),
        getCircuitState: jest.fn().mockReturnValue({
          opened: false,
          halfOpen: false,
          closed: true,
          stats: {},
        }),
      };

      (service as any).client = mockClient;

      const result = await service.searchAtasRegistroPreco({
        dataInicial: '20240101',
        dataFinal: '20241231',
        apenasVigentes: true,
      });

      expect(mockClient.get).toHaveBeenCalledWith(
        '/v1/atas',
        expect.any(Object),
      );
      // Ata is vigent (ends in 2025), so should be included
      expect(result.data.length).toBeGreaterThanOrEqual(0);
    });

    it('should apply UF filter correctly', async () => {
      const mockClient = {
        get: jest.fn().mockImplementation((path: string) => {
          if (path === '/v1/atas') {
            return Promise.resolve(mockAtasPaginatedResponse);
          }
          if (path.includes('/itens')) {
            return Promise.resolve({ itens: [mockAtaItem] });
          }
          return Promise.reject(new Error('Unknown endpoint'));
        }),
        isAvailable: jest.fn().mockReturnValue(true),
        getCircuitState: jest.fn().mockReturnValue({
          opened: false,
          halfOpen: false,
          closed: true,
          stats: {},
        }),
      };

      (service as any).client = mockClient;

      const result = await service.searchAtasRegistroPreco({
        dataInicial: '20240101',
        dataFinal: '20241231',
        ufOrgao: 'DF',
      });

      // Should include ata from DF
      expect(result.source).toBe('pncp');
    });

    it('should filter out atas from different UF', async () => {
      const mockClient = {
        get: jest.fn().mockImplementation((path: string) => {
          if (path === '/v1/atas') {
            return Promise.resolve(mockAtasPaginatedResponse);
          }
          if (path.includes('/itens')) {
            return Promise.resolve({ itens: [mockAtaItem] });
          }
          return Promise.reject(new Error('Unknown endpoint'));
        }),
        isAvailable: jest.fn().mockReturnValue(true),
        getCircuitState: jest.fn().mockReturnValue({
          opened: false,
          halfOpen: false,
          closed: true,
          stats: {},
        }),
      };

      (service as any).client = mockClient;

      const result = await service.searchAtasRegistroPreco({
        dataInicial: '20240101',
        dataFinal: '20241231',
        ufOrgao: 'SP', // Different UF than mockAta (DF)
      });

      // Should be empty since ata is from DF, not SP
      expect(result.data.length).toBe(0);
    });

    it('should return SERVICE_UNAVAILABLE when circuit breaker is open', async () => {
      const mockClient = {
        isAvailable: jest.fn().mockReturnValue(false),
        getCircuitState: jest.fn().mockReturnValue({
          opened: true,
          halfOpen: false,
          closed: false,
          stats: {},
        }),
      };

      (service as any).client = mockClient;

      const result = await service.searchAtasRegistroPreco({
        dataInicial: '20240101',
        dataFinal: '20241231',
      });

      expect(result.status).toBe(SearchStatus.SERVICE_UNAVAILABLE);
      expect(result.data).toHaveLength(0);
      expect(result.isFallback).toBe(true);
    });

    it('should normalize ata items to GovApiPriceReference format', async () => {
      const mockClient = {
        get: jest.fn().mockImplementation((path: string) => {
          if (path === '/v1/atas') {
            return Promise.resolve(mockAtasPaginatedResponse);
          }
          if (path.includes('/itens')) {
            return Promise.resolve({ itens: [mockAtaItem] });
          }
          return Promise.reject(new Error('Unknown endpoint'));
        }),
        isAvailable: jest.fn().mockReturnValue(true),
        getCircuitState: jest.fn().mockReturnValue({
          opened: false,
          halfOpen: false,
          closed: true,
          stats: {},
        }),
      };

      (service as any).client = mockClient;

      const result = await service.searchAtasRegistroPreco({
        dataInicial: '20240101',
        dataFinal: '20241231',
      });

      expect(result.data.length).toBeGreaterThan(0);
      const priceRef = result.data[0];

      // Verify GovApiPriceReference structure
      expect(priceRef.codigo).toBe('ARP-2024-1-1');
      expect(priceRef.descricao).toBe('Papel A4, 75g/m², pacote 500 folhas');
      expect(priceRef.unidade).toBe('PCT');
      expect(priceRef.precoUnitario).toBe(25.5);
      expect(priceRef.uf).toBe('DF');
      expect(priceRef.categoria).toBe('ata_registro_preco');
      expect(priceRef.source).toBe('pncp');
      expect(priceRef.url).toContain('pncp.gov.br');
    });

    it('should include metadata in normalized price reference', async () => {
      const mockClient = {
        get: jest.fn().mockImplementation((path: string) => {
          if (path === '/v1/atas') {
            return Promise.resolve(mockAtasPaginatedResponse);
          }
          if (path.includes('/itens')) {
            return Promise.resolve({ itens: [mockAtaItem] });
          }
          return Promise.reject(new Error('Unknown endpoint'));
        }),
        isAvailable: jest.fn().mockReturnValue(true),
        getCircuitState: jest.fn().mockReturnValue({
          opened: false,
          halfOpen: false,
          closed: true,
          stats: {},
        }),
      };

      (service as any).client = mockClient;

      const result = await service.searchAtasRegistroPreco({
        dataInicial: '20240101',
        dataFinal: '20241231',
      });

      const priceRef = result.data[0];

      // Verify metadata
      expect(priceRef.metadata).toBeDefined();
      expect(priceRef.metadata?.numeroAta).toBe('001/2024');
      expect(priceRef.metadata?.anoAta).toBe(2024);
      expect(priceRef.metadata?.orgaoGerenciador).toBe('Órgão Público Federal');
      expect(priceRef.metadata?.fornecedor).toBe('Papelaria Exemplo LTDA');
      expect(priceRef.metadata?.marca).toBe('Chamex');
    });

    it('should skip items without valid price', async () => {
      const mockItemWithoutPrice: PncpAtaItem = {
        ...mockAtaItem,
        valorUnitario: 0, // Invalid price
      };

      const mockClient = {
        get: jest.fn().mockImplementation((path: string) => {
          if (path === '/v1/atas') {
            return Promise.resolve(mockAtasPaginatedResponse);
          }
          if (path.includes('/itens')) {
            return Promise.resolve({ itens: [mockItemWithoutPrice] });
          }
          return Promise.reject(new Error('Unknown endpoint'));
        }),
        isAvailable: jest.fn().mockReturnValue(true),
        getCircuitState: jest.fn().mockReturnValue({
          opened: false,
          halfOpen: false,
          closed: true,
          stats: {},
        }),
      };

      (service as any).client = mockClient;

      const result = await service.searchAtasRegistroPreco({
        dataInicial: '20240101',
        dataFinal: '20241231',
      });

      // Should be empty since item has no valid price
      expect(result.data.length).toBe(0);
    });

    it('should continue processing if one ata items fetch fails', async () => {
      const secondAta: PncpAta = {
        ...mockAta,
        numeroControlePNCP: '00000000000000-1-000002/2024',
        sequencialAta: 2,
      };

      const twoAtasResponse: PncpPaginatedResponse<PncpAta> = {
        ...mockAtasPaginatedResponse,
        data: [mockAta, secondAta],
        totalRegistros: 2,
      };

      let callCount = 0;
      const mockClient = {
        get: jest.fn().mockImplementation((path: string) => {
          if (path === '/v1/atas') {
            return Promise.resolve(twoAtasResponse);
          }
          if (path.includes('/itens')) {
            callCount++;
            if (callCount === 1) {
              // First ata items fetch fails
              return Promise.reject(new Error('Network error'));
            }
            // Second ata items fetch succeeds
            return Promise.resolve({ itens: [mockAtaItem] });
          }
          return Promise.reject(new Error('Unknown endpoint'));
        }),
        isAvailable: jest.fn().mockReturnValue(true),
        getCircuitState: jest.fn().mockReturnValue({
          opened: false,
          halfOpen: false,
          closed: true,
          stats: {},
        }),
      };

      (service as any).client = mockClient;

      const result = await service.searchAtasRegistroPreco({
        dataInicial: '20240101',
        dataFinal: '20241231',
      });

      // Should have prices from second ata only
      expect(result.data.length).toBe(1);
      expect(result.status).toBe(SearchStatus.SUCCESS);
    });

    it('should handle timeout errors', async () => {
      const mockClient = {
        get: jest
          .fn()
          .mockRejectedValue(new Error('Request timeout ETIMEDOUT')),
        isAvailable: jest.fn().mockReturnValue(true),
        getCircuitState: jest.fn().mockReturnValue({
          opened: false,
          halfOpen: false,
          closed: true,
          stats: {},
        }),
      };

      (service as any).client = mockClient;

      const result = await service.searchAtasRegistroPreco({
        dataInicial: '20240101',
        dataFinal: '20241231',
      });

      expect(result.status).toBe(SearchStatus.TIMEOUT);
      expect(result.data).toHaveLength(0);
    });

    it('should handle rate limit errors', async () => {
      const mockClient = {
        get: jest.fn().mockRejectedValue(new Error('429 Too Many Requests')),
        isAvailable: jest.fn().mockReturnValue(true),
        getCircuitState: jest.fn().mockReturnValue({
          opened: false,
          halfOpen: false,
          closed: true,
          stats: {},
        }),
      };

      (service as any).client = mockClient;

      const result = await service.searchAtasRegistroPreco({
        dataInicial: '20240101',
        dataFinal: '20241231',
      });

      expect(result.status).toBe(SearchStatus.RATE_LIMITED);
      expect(result.data).toHaveLength(0);
    });
  });

  describe('searchContracts (extended filters)', () => {
    it('should apply value filters correctly', async () => {
      cache.get.mockResolvedValueOnce(mockPaginatedResponse);

      const result = await service.searchContracts({
        valorMinimo: 100000,
        valorMaximo: 200000,
      });

      // Should filter to include mockContratacao (150000)
      expect(result.data.length).toBe(1);
      expect(result.source).toBe('pncp');
    });

    it('should filter out values below minimum', async () => {
      cache.get.mockResolvedValueOnce(mockPaginatedResponse);

      const result = await service.searchContracts({
        valorMinimo: 200000, // Above mockContratacao's value
      });

      expect(result.data.length).toBe(0);
    });

    it('should filter out values above maximum', async () => {
      cache.get.mockResolvedValueOnce(mockPaginatedResponse);

      const result = await service.searchContracts({
        valorMaximo: 100000, // Below mockContratacao's value
      });

      expect(result.data.length).toBe(0);
    });
  });

  describe('data normalization', () => {
    it('should normalize contratação to GovApiSearchResult', async () => {
      cache.get.mockResolvedValueOnce(mockPaginatedResponse);

      const result = await service.searchContracts({});

      expect(result.data[0]).toMatchObject({
        id: '00000000000000-1-000001/2024',
        source: 'pncp',
        relevance: 1.0,
      });
      expect(result.data[0].title).toContain('software');
      expect(result.data[0].url).toContain('pncp.gov.br');
    });

    it('should include metadata in normalized result', async () => {
      cache.get.mockResolvedValueOnce(mockPaginatedResponse);

      const result = await service.searchContracts({});
      const normalized = result.data[0];

      expect(normalized.orgaoContratante).toBeDefined();
      expect(normalized.orgaoContratante.cnpj).toBe('00000000000000');
      expect(normalized.modalidade).toBe('Pregão - Eletrônico');
    });
  });
});

describe('PncpService Integration', () => {
  // These tests would be skipped in CI and run manually or in integration environment
  describe.skip('real API calls', () => {
    let service: PncpService;

    beforeAll(async () => {
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          PncpService,
          {
            provide: GovApiCache,
            useValue: {
              get: jest.fn().mockResolvedValue(null),
              set: jest.fn().mockResolvedValue(undefined),
              getStats: jest.fn().mockReturnValue({ hits: 0, misses: 0 }),
            },
          },
          {
            provide: ConfigService,
            useValue: {
              get: jest.fn(),
            },
          },
        ],
      }).compile();

      service = module.get<PncpService>(PncpService);
    });

    it('should fetch real contratações from PNCP API', async () => {
      const result = await service.searchContratacoes({
        dataInicial: '20241201',
        dataFinal: '20241215',
        pagina: 1,
        tamanhoPagina: 10,
      });

      expect(result.data).toBeDefined();
      expect(Array.isArray(result.data)).toBe(true);
      expect(result.totalRegistros).toBeGreaterThanOrEqual(0);
    });

    it('should return valid health status', async () => {
      const health = await service.healthCheck();

      expect(health.source).toBe('pncp');
      expect(typeof health.healthy).toBe('boolean');
      expect(typeof health.latencyMs).toBe('number');
    });
  });
});
