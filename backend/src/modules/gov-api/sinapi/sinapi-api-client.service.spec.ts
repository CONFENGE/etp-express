/**
 * SINAPI API Client Service Tests
 *
 * @see https://github.com/CONFENGE/etp-express/issues/1565
 */

import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { of, throwError } from 'rxjs';
import { AxiosResponse, AxiosError, InternalAxiosRequestConfig } from 'axios';
import {
  SinapiApiClientService,
  SinapiApiAuthError,
  SinapiApiRateLimitError,
  SinapiApiNotFoundError,
  SinapiApiServerError,
} from './sinapi-api-client.service';
import { GovApiCache } from '../utils/gov-api-cache';
import {
  SinapiApiInsumo,
  SinapiApiComposicao,
  SinapiApiPaginatedResponse,
  SinapiApiStatus,
  SinapiApiEstado,
} from './sinapi-api.types';

describe('SinapiApiClientService', () => {
  let service: SinapiApiClientService;
  let httpService: jest.Mocked<HttpService>;
  let cache: jest.Mocked<GovApiCache>;
  let configService: jest.Mocked<ConfigService>;

  const mockConfigService = {
    get: jest.fn((key: string) => {
      const config: Record<string, string | number | boolean | undefined> = {
        SINAPI_API_URL: 'https://api.test.com/v1',
        SINAPI_API_KEY: 'test-api-key',
        SINAPI_API_TIMEOUT: 30000,
        SINAPI_API_CACHE_TTL: 86400,
        SINAPI_API_ENABLE_RETRY: true,
        SINAPI_API_MAX_RETRIES: 3,
      };
      return config[key];
    }),
  };

  const mockHttpService = {
    request: jest.fn(),
  };

  const mockCache = {
    get: jest.fn(),
    set: jest.fn(),
  };

  /**
   * Create a mock Axios response
   */
  function createMockResponse<T>(
    data: T,
    status: number = 200,
    headers: Record<string, string> = {},
  ): AxiosResponse<T> {
    return {
      data,
      status,
      statusText: 'OK',
      headers: {
        'x-ratelimit-limit': '1000',
        'x-ratelimit-remaining': '999',
        'x-ratelimit-reset': String(Date.now() + 60000),
        'x-ratelimit-monthly-limit': '10000',
        'x-ratelimit-monthly-used': '100',
        'x-ratelimit-monthly-remaining': '9900',
        ...headers,
      },
      config: {} as InternalAxiosRequestConfig,
    };
  }

  /**
   * Create a mock Axios error
   */
  function createMockAxiosError(
    status: number,
    message: string = 'Error',
    headers: Record<string, string> = {},
  ): AxiosError {
    const error = new Error(message) as AxiosError;
    error.isAxiosError = true;
    error.response = {
      data: { message },
      status,
      statusText: 'Error',
      headers: {
        'x-ratelimit-limit': '1000',
        'x-ratelimit-remaining': '0',
        ...headers,
      },
      config: {} as InternalAxiosRequestConfig,
    };
    error.config = {} as InternalAxiosRequestConfig;
    return error;
  }

  beforeEach(async () => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SinapiApiClientService,
        { provide: ConfigService, useValue: mockConfigService },
        { provide: HttpService, useValue: mockHttpService },
        { provide: GovApiCache, useValue: mockCache },
      ],
    }).compile();

    service = module.get<SinapiApiClientService>(SinapiApiClientService);
    httpService = module.get(HttpService);
    cache = module.get(GovApiCache);
    configService = module.get(ConfigService);

    // Initialize the service
    service.onModuleInit();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('initialization', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('should be configured with API key', () => {
      expect(service.isConfigured()).toBe(true);
    });

    it('should not be configured without API key', async () => {
      const unconfiguredConfigService = {
        get: jest.fn().mockReturnValue(undefined),
      };

      const module = await Test.createTestingModule({
        providers: [
          SinapiApiClientService,
          { provide: ConfigService, useValue: unconfiguredConfigService },
          { provide: HttpService, useValue: mockHttpService },
          { provide: GovApiCache, useValue: mockCache },
        ],
      }).compile();

      const unconfiguredService =
        module.get<SinapiApiClientService>(SinapiApiClientService);
      unconfiguredService.onModuleInit();

      expect(unconfiguredService.isConfigured()).toBe(false);
    });
  });

  describe('searchInsumos()', () => {
    const mockInsumos: SinapiApiPaginatedResponse<SinapiApiInsumo> = {
      data: [
        {
          codigo: 1,
          nome: 'Cimento Portland CP-II',
          unidade: 'KG',
          preco_desonerado: 0.7,
          preco_naodesonerado: 0.75,
          tipo: 'MATERIAL',
          classe: 'Materiais de Construção',
          estado: 'DF',
          referencia: '2024-01-01',
        },
      ],
      total: 1,
      page: 1,
      limit: 50,
      pages: 1,
    };

    it('should search insumos with filters', async () => {
      cache.get.mockResolvedValue(null);
      httpService.request.mockReturnValue(
        of(createMockResponse(mockInsumos)),
      );

      const result = await service.searchInsumos({
        nome: 'cimento',
        estado: 'DF',
      });

      expect(result.data).toHaveLength(1);
      expect(result.data[0].nome).toBe('Cimento Portland CP-II');
      expect(cache.set).toHaveBeenCalled();
    });

    it('should return cached results when available', async () => {
      cache.get.mockResolvedValue(mockInsumos);

      const result = await service.searchInsumos({ nome: 'cimento' });

      expect(result).toEqual(mockInsumos);
      expect(httpService.request).not.toHaveBeenCalled();
    });

    it('should cache results after fetching', async () => {
      cache.get.mockResolvedValue(null);
      httpService.request.mockReturnValue(
        of(createMockResponse(mockInsumos)),
      );

      await service.searchInsumos({ nome: 'cimento' });

      expect(cache.set).toHaveBeenCalledWith(
        'sinapi',
        expect.stringContaining('sinapi:api:insumos'),
        mockInsumos,
        86400, // CACHE_TTL.PRICES
      );
    });
  });

  describe('getInsumo()', () => {
    const mockInsumo: SinapiApiInsumo = {
      codigo: 12345,
      nome: 'Cimento Portland',
      unidade: 'KG',
      preco_desonerado: 0.7,
      preco_naodesonerado: 0.75,
      tipo: 'MATERIAL',
    };

    it('should get insumo by code', async () => {
      cache.get.mockResolvedValue(null);
      httpService.request.mockReturnValue(
        of(createMockResponse(mockInsumo)),
      );

      const result = await service.getInsumo(12345, 'DF');

      expect(result).toEqual(mockInsumo);
      expect(httpService.request).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'GET',
          url: expect.stringContaining('/insumos/12345'),
        }),
      );
    });

    it('should return null for non-existent insumo', async () => {
      cache.get.mockResolvedValue(null);
      httpService.request.mockReturnValue(
        throwError(() => createMockAxiosError(404, 'Not found')),
      );

      const result = await service.getInsumo(99999, 'DF');

      expect(result).toBeNull();
    });
  });

  describe('searchComposicoes()', () => {
    const mockComposicoes: SinapiApiPaginatedResponse<SinapiApiComposicao> = {
      data: [
        {
          codigo: 100,
          nome: 'Alvenaria de blocos cerâmicos',
          unidade: 'M2',
          preco_desonerado: 45.0,
          preco_naodesonerado: 50.0,
          classe: 'Paredes e Painéis',
        },
      ],
      total: 1,
      page: 1,
      limit: 50,
      pages: 1,
    };

    it('should search composicoes', async () => {
      cache.get.mockResolvedValue(null);
      httpService.request.mockReturnValue(
        of(createMockResponse(mockComposicoes)),
      );

      const result = await service.searchComposicoes({ nome: 'alvenaria' });

      expect(result.data).toHaveLength(1);
      expect(result.data[0].nome).toBe('Alvenaria de blocos cerâmicos');
    });
  });

  describe('getComposicaoDetails()', () => {
    it('should return null for non-existent composicao', async () => {
      cache.get.mockResolvedValue(null);
      httpService.request.mockReturnValue(
        throwError(() => createMockAxiosError(404, 'Not found')),
      );

      const result = await service.getComposicaoDetails(99999, 'DF');

      expect(result).toBeNull();
    });
  });

  describe('getEstados()', () => {
    const mockEstados: SinapiApiEstado[] = [
      { sigla: 'DF', nome: 'Distrito Federal', regiao: 'Centro-Oeste', disponivel: true },
      { sigla: 'SP', nome: 'São Paulo', regiao: 'Sudeste', disponivel: true },
    ];

    it('should get list of estados', async () => {
      cache.get.mockResolvedValue(null);
      httpService.request.mockReturnValue(
        of(createMockResponse(mockEstados)),
      );

      const result = await service.getEstados();

      expect(result).toHaveLength(2);
      expect(result[0].sigla).toBe('DF');
    });

    it('should cache estados with long TTL', async () => {
      cache.get.mockResolvedValue(null);
      httpService.request.mockReturnValue(
        of(createMockResponse(mockEstados)),
      );

      await service.getEstados();

      expect(cache.set).toHaveBeenCalledWith(
        'sinapi',
        expect.any(String),
        mockEstados,
        604800, // CACHE_TTL.STATIC (7 days)
      );
    });
  });

  describe('checkStatus()', () => {
    const mockStatus: SinapiApiStatus = {
      status: 'online',
      versao: '1.0.0',
      timestamp: new Date().toISOString(),
    };

    it('should check API status', async () => {
      httpService.request.mockReturnValue(
        of(createMockResponse(mockStatus)),
      );

      const result = await service.checkStatus();

      expect(result.status).toBe('online');
    });

    it('should not cache status checks', async () => {
      httpService.request.mockReturnValue(
        of(createMockResponse(mockStatus)),
      );

      await service.checkStatus();

      expect(cache.get).not.toHaveBeenCalled();
      expect(cache.set).not.toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    beforeEach(() => {
      cache.get.mockResolvedValue(null);
    });

    it('should throw SinapiApiAuthError on 401', async () => {
      httpService.request.mockReturnValue(
        throwError(() => createMockAxiosError(401, 'Unauthorized')),
      );

      await expect(service.searchInsumos({ nome: 'test' })).rejects.toThrow(
        SinapiApiAuthError,
      );
    });

    it('should throw SinapiApiAuthError on 403', async () => {
      httpService.request.mockReturnValue(
        throwError(() => createMockAxiosError(403, 'Forbidden')),
      );

      await expect(service.searchInsumos({ nome: 'test' })).rejects.toThrow(
        SinapiApiAuthError,
      );
    });

    it('should throw SinapiApiNotFoundError on 404', async () => {
      httpService.request.mockReturnValue(
        throwError(() => createMockAxiosError(404, 'Not found')),
      );

      await expect(service.searchInsumos({ nome: 'test' })).rejects.toThrow(
        SinapiApiNotFoundError,
      );
    });

    it('should throw SinapiApiRateLimitError on 429', async () => {
      // Configure service without retries for this test
      const noRetryConfigService = {
        get: jest.fn((key: string) => {
          if (key === 'SINAPI_API_ENABLE_RETRY') return false;
          if (key === 'SINAPI_API_KEY') return 'test-key';
          if (key === 'SINAPI_API_URL') return 'https://test.com/v1';
          return undefined;
        }),
      };

      const module = await Test.createTestingModule({
        providers: [
          SinapiApiClientService,
          { provide: ConfigService, useValue: noRetryConfigService },
          { provide: HttpService, useValue: mockHttpService },
          { provide: GovApiCache, useValue: mockCache },
        ],
      }).compile();

      const noRetryService = module.get<SinapiApiClientService>(SinapiApiClientService);
      noRetryService.onModuleInit();

      httpService.request.mockReturnValue(
        throwError(() =>
          createMockAxiosError(429, 'Too many requests', { 'retry-after': '60' }),
        ),
      );

      await expect(noRetryService.searchInsumos({ nome: 'test' })).rejects.toThrow(
        SinapiApiRateLimitError,
      );
    });

    it('should throw SinapiApiServerError on 5xx', async () => {
      // Configure service without retries for this test
      const noRetryConfigService = {
        get: jest.fn((key: string) => {
          if (key === 'SINAPI_API_ENABLE_RETRY') return false;
          if (key === 'SINAPI_API_KEY') return 'test-key';
          if (key === 'SINAPI_API_URL') return 'https://test.com/v1';
          return undefined;
        }),
      };

      const module = await Test.createTestingModule({
        providers: [
          SinapiApiClientService,
          { provide: ConfigService, useValue: noRetryConfigService },
          { provide: HttpService, useValue: mockHttpService },
          { provide: GovApiCache, useValue: mockCache },
        ],
      }).compile();

      const noRetryService = module.get<SinapiApiClientService>(SinapiApiClientService);
      noRetryService.onModuleInit();

      httpService.request.mockReturnValue(
        throwError(() => createMockAxiosError(500, 'Internal server error')),
      );

      await expect(noRetryService.searchInsumos({ nome: 'test' })).rejects.toThrow(
        SinapiApiServerError,
      );
    });

    it('should throw Error when API key not configured', async () => {
      const unconfiguredService = new SinapiApiClientService(
        { get: jest.fn().mockReturnValue(undefined) } as unknown as ConfigService,
        mockHttpService as unknown as HttpService,
        mockCache as unknown as GovApiCache,
      );
      unconfiguredService.onModuleInit();

      await expect(unconfiguredService.searchInsumos({ nome: 'test' })).rejects.toThrow(
        SinapiApiAuthError,
      );
    });
  });

  describe('rate limit handling', () => {
    beforeEach(() => {
      cache.get.mockResolvedValue(null);
    });

    it('should extract rate limit info from response headers', async () => {
      const mockData: SinapiApiPaginatedResponse<SinapiApiInsumo> = {
        data: [],
        total: 0,
        page: 1,
        limit: 50,
        pages: 0,
      };

      httpService.request.mockReturnValue(
        of(
          createMockResponse(mockData, 200, {
            'x-ratelimit-limit': '1000',
            'x-ratelimit-remaining': '500',
            'x-ratelimit-reset': '1700000000',
            'x-ratelimit-monthly-limit': '10000',
            'x-ratelimit-monthly-used': '5000',
            'x-ratelimit-monthly-remaining': '5000',
          }),
        ),
      );

      await service.searchInsumos({ nome: 'test' });

      const rateLimitInfo = service.getRateLimitInfo();
      expect(rateLimitInfo).not.toBeNull();
      expect(rateLimitInfo?.limit).toBe(1000);
      expect(rateLimitInfo?.remaining).toBe(500);
    });

    it('should detect when approaching rate limit', async () => {
      const mockData: SinapiApiPaginatedResponse<SinapiApiInsumo> = {
        data: [],
        total: 0,
        page: 1,
        limit: 50,
        pages: 0,
      };

      httpService.request.mockReturnValue(
        of(
          createMockResponse(mockData, 200, {
            'x-ratelimit-limit': '1000',
            'x-ratelimit-remaining': '50', // 5% remaining
          }),
        ),
      );

      await service.searchInsumos({ nome: 'test' });

      expect(service.isApproachingRateLimit()).toBe(true);
    });

    it('should not indicate approaching limit when plenty remaining', async () => {
      const mockData: SinapiApiPaginatedResponse<SinapiApiInsumo> = {
        data: [],
        total: 0,
        page: 1,
        limit: 50,
        pages: 0,
      };

      httpService.request.mockReturnValue(
        of(
          createMockResponse(mockData, 200, {
            'x-ratelimit-limit': '1000',
            'x-ratelimit-remaining': '800', // 80% remaining
          }),
        ),
      );

      await service.searchInsumos({ nome: 'test' });

      expect(service.isApproachingRateLimit()).toBe(false);
    });

    it('should return false for isApproachingRateLimit when no requests made', () => {
      expect(service.isApproachingRateLimit()).toBe(false);
    });

    it('should return null for getRateLimitInfo when no requests made', () => {
      expect(service.getRateLimitInfo()).toBeNull();
    });
  });

  describe('retry logic', () => {
    beforeEach(() => {
      cache.get.mockResolvedValue(null);
    });

    it('should retry on server error', async () => {
      jest.useRealTimers(); // Use real timers for this test

      const mockData: SinapiApiPaginatedResponse<SinapiApiInsumo> = {
        data: [],
        total: 0,
        page: 1,
        limit: 50,
        pages: 0,
      };

      // First call fails, second succeeds
      httpService.request
        .mockReturnValueOnce(
          throwError(() => createMockAxiosError(503, 'Service unavailable')),
        )
        .mockReturnValueOnce(of(createMockResponse(mockData)));

      const result = await service.searchInsumos({ nome: 'test' });

      expect(result).toEqual(mockData);
      expect(httpService.request).toHaveBeenCalledTimes(2);

      jest.useFakeTimers(); // Restore fake timers
    }, 15000); // Extended timeout for retry delays

    it('should not retry on 4xx errors (except 429)', async () => {
      // Configure service without retries for this test
      const noRetryConfigService = {
        get: jest.fn((key: string) => {
          if (key === 'SINAPI_API_ENABLE_RETRY') return false;
          if (key === 'SINAPI_API_KEY') return 'test-key';
          if (key === 'SINAPI_API_URL') return 'https://test.com/v1';
          return undefined;
        }),
      };

      const module = await Test.createTestingModule({
        providers: [
          SinapiApiClientService,
          { provide: ConfigService, useValue: noRetryConfigService },
          { provide: HttpService, useValue: mockHttpService },
          { provide: GovApiCache, useValue: mockCache },
        ],
      }).compile();

      const noRetryService = module.get<SinapiApiClientService>(SinapiApiClientService);
      noRetryService.onModuleInit();

      httpService.request.mockReturnValue(
        throwError(() => createMockAxiosError(400, 'Bad request')),
      );

      await expect(noRetryService.searchInsumos({ nome: 'test' })).rejects.toThrow();
      expect(httpService.request).toHaveBeenCalledTimes(1);
    });

    it('should not retry on auth errors', async () => {
      httpService.request.mockReturnValue(
        throwError(() => createMockAxiosError(401, 'Unauthorized')),
      );

      await expect(service.searchInsumos({ nome: 'test' })).rejects.toThrow(
        SinapiApiAuthError,
      );
      expect(httpService.request).toHaveBeenCalledTimes(1);
    });
  });

  describe('getHistorico()', () => {
    it('should get price history', async () => {
      const mockHistory = [
        { referencia: '2024-01-01', preco_desonerado: 0.7, preco_naodesonerado: 0.75, variacao: 0 },
        { referencia: '2023-12-01', preco_desonerado: 0.68, preco_naodesonerado: 0.73, variacao: -2.9 },
      ];

      cache.get.mockResolvedValue(null);
      httpService.request.mockReturnValue(
        of(createMockResponse(mockHistory)),
      );

      const result = await service.getHistorico(12345, 'DF', '12');

      expect(result).toHaveLength(2);
      expect(result[0].referencia).toBe('2024-01-01');
    });
  });

  describe('getEncargos()', () => {
    it('should get encargos sociais', async () => {
      const mockEncargos = {
        estado: 'DF',
        regime: 'NAO_DESONERADO' as const,
        referencia: '2024-01-01',
        encargos: {
          horista: 118.45,
          mensalista: 68.72,
        },
      };

      cache.get.mockResolvedValue(null);
      httpService.request.mockReturnValue(
        of(createMockResponse(mockEncargos)),
      );

      const result = await service.getEncargos('DF', 'NAO_DESONERADO');

      expect(result.estado).toBe('DF');
      expect(result.encargos.horista).toBe(118.45);
    });
  });

  describe('getIndicadores()', () => {
    it('should get economic indicators', async () => {
      const mockIndicadores = {
        referencia: '2024-01-01',
        cub: { DF: 1850.45, SP: 1920.30 },
        incc: 0.45,
        igpm: 0.38,
      };

      cache.get.mockResolvedValue(null);
      httpService.request.mockReturnValue(
        of(createMockResponse(mockIndicadores)),
      );

      const result = await service.getIndicadores();

      expect(result.incc).toBe(0.45);
      expect(result.cub?.DF).toBe(1850.45);
    });
  });

  describe('getLastUpdate()', () => {
    it('should get last update info', async () => {
      const mockUpdate = {
        ultima_atualizacao: '2024-01-15',
        referencia_disponivel: '2024-01',
        estados_atualizados: ['DF', 'SP', 'RJ'],
      };

      cache.get.mockResolvedValue(null);
      httpService.request.mockReturnValue(
        of(createMockResponse(mockUpdate)),
      );

      const result = await service.getLastUpdate();

      expect(result.referencia_disponivel).toBe('2024-01');
      expect(result.estados_atualizados).toContain('DF');
    });
  });

  describe('getUsage()', () => {
    it('should get API usage statistics', async () => {
      const mockUsage = {
        total_requests: 5000,
        monthly_requests: 500,
        monthly_limit: 10000,
        reset_date: '2024-02-01',
        plan: 'professional',
      };

      httpService.request.mockReturnValue(
        of(createMockResponse(mockUsage)),
      );

      const result = await service.getUsage();

      expect(result.monthly_requests).toBe(500);
      expect(result.plan).toBe('professional');
    });

    it('should not cache usage statistics', async () => {
      const mockUsage = {
        total_requests: 5000,
        monthly_requests: 500,
        monthly_limit: 10000,
        reset_date: '2024-02-01',
        plan: 'professional',
      };

      httpService.request.mockReturnValue(
        of(createMockResponse(mockUsage)),
      );

      await service.getUsage();

      expect(cache.get).not.toHaveBeenCalled();
      expect(cache.set).not.toHaveBeenCalled();
    });
  });
});

describe('Error classes', () => {
  describe('SinapiApiAuthError', () => {
    it('should have correct name and message', () => {
      const error = new SinapiApiAuthError('Custom auth error');
      expect(error.name).toBe('SinapiApiAuthError');
      expect(error.message).toBe('Custom auth error');
    });

    it('should use default message', () => {
      const error = new SinapiApiAuthError();
      expect(error.message).toBe('Authentication failed');
    });
  });

  describe('SinapiApiRateLimitError', () => {
    it('should have retryAfter property', () => {
      const error = new SinapiApiRateLimitError('Rate limited', 120);
      expect(error.name).toBe('SinapiApiRateLimitError');
      expect(error.retryAfter).toBe(120);
    });

    it('should include rate limit info when provided', () => {
      const rateLimitInfo = {
        limit: 1000,
        remaining: 0,
        reset: Date.now() + 60000,
        monthlyLimit: 10000,
        monthlyUsed: 10000,
        monthlyRemaining: 0,
      };
      const error = new SinapiApiRateLimitError('Rate limited', 60, rateLimitInfo);
      expect(error.rateLimitInfo).toEqual(rateLimitInfo);
    });
  });

  describe('SinapiApiNotFoundError', () => {
    it('should have correct name', () => {
      const error = new SinapiApiNotFoundError('Item not found');
      expect(error.name).toBe('SinapiApiNotFoundError');
    });
  });

  describe('SinapiApiServerError', () => {
    it('should have statusCode property', () => {
      const error = new SinapiApiServerError('Server error', 502);
      expect(error.name).toBe('SinapiApiServerError');
      expect(error.statusCode).toBe(502);
    });

    it('should use default status code 500', () => {
      const error = new SinapiApiServerError();
      expect(error.statusCode).toBe(500);
    });
  });
});
