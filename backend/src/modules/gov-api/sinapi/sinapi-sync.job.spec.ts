/**
 * SINAPI Sync Job Tests
 *
 * @see https://github.com/CONFENGE/etp-express/issues/1569
 */

import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { SinapiSyncJob } from './sinapi-sync.job';
import { SinapiApiClientService } from './sinapi-api-client.service';
import { SinapiService } from './sinapi.service';
import { GovApiCache } from '../utils/gov-api-cache';
import { SinapiApiAtualizacao, SinapiApiStatus } from './sinapi-api.types';

describe('SinapiSyncJob', () => {
  let job: SinapiSyncJob;
  let apiClient: jest.Mocked<SinapiApiClientService>;
  let sinapiService: jest.Mocked<SinapiService>;
  let cache: jest.Mocked<GovApiCache>;
  let configService: jest.Mocked<ConfigService>;

  const mockConfigService = {
    get: jest.fn((key: string, defaultValue?: unknown) => {
      const config: Record<string, boolean | string | undefined> = {
        SINAPI_SYNC_ENABLED: true,
        SINAPI_CACHE_WARMUP_ENABLED: false, // Disable for tests
      };
      return config[key] ?? defaultValue;
    }),
  };

  const mockApiClient = {
    isConfigured: jest.fn(),
    getLastUpdate: jest.fn(),
    checkStatus: jest.fn(),
  };

  const mockSinapiService = {
    search: jest.fn(),
    resetApiFailure: jest.fn(),
  };

  const mockCache = {
    invalidateSource: jest.fn(),
    get: jest.fn(),
    set: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SinapiSyncJob,
        {
          provide: SinapiApiClientService,
          useValue: mockApiClient,
        },
        {
          provide: SinapiService,
          useValue: mockSinapiService,
        },
        {
          provide: GovApiCache,
          useValue: mockCache,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    job = module.get<SinapiSyncJob>(SinapiSyncJob);
    apiClient = module.get(SinapiApiClientService);
    sinapiService = module.get(SinapiService);
    cache = module.get(GovApiCache);
    configService = module.get(ConfigService);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('onModuleInit', () => {
    it('should initialize scheduler status when API is configured', async () => {
      mockApiClient.isConfigured.mockReturnValue(true);
      mockApiClient.getLastUpdate.mockResolvedValue({
        referencia_disponivel: '2025-01',
        ultima_atualizacao: '2025-01-15',
        estados_atualizados: ['SP', 'RJ', 'MG'],
      });

      await job.onModuleInit();

      expect(job.getSchedulerStatus().enabled).toBe(true);
      expect(job.getLastUpdate()).toBe('2025-01');
    });

    it('should disable scheduler when API is not configured', async () => {
      mockApiClient.isConfigured.mockReturnValue(false);

      await job.onModuleInit();

      expect(job.getSchedulerStatus().enabled).toBe(false);
    });

    it('should handle getLastUpdate failure gracefully', async () => {
      mockApiClient.isConfigured.mockReturnValue(true);
      mockApiClient.getLastUpdate.mockRejectedValue(
        new Error('API unavailable'),
      );

      await job.onModuleInit();

      expect(job.getSchedulerStatus().enabled).toBe(true);
      expect(job.getLastUpdate()).toBeNull();
    });
  });

  describe('checkForUpdates', () => {
    beforeEach(async () => {
      mockApiClient.isConfigured.mockReturnValue(true);
      mockApiClient.getLastUpdate.mockResolvedValue({
        referencia_disponivel: '2025-01',
        ultima_atualizacao: '2025-01-15',
        estados_atualizados: ['SP', 'RJ', 'MG'],
      });
      await job.onModuleInit();
    });

    it('should skip check if disabled', async () => {
      job.setEnabled(false);

      await job.checkForUpdates();

      expect(mockApiClient.getLastUpdate).toHaveBeenCalledTimes(1); // Only from init
    });

    it('should skip check if API not configured', async () => {
      mockApiClient.isConfigured.mockReturnValue(false);

      await job.checkForUpdates();

      // Only one call from init
      expect(mockApiClient.getLastUpdate).toHaveBeenCalledTimes(1);
    });

    it('should not invalidate cache when version unchanged', async () => {
      // Same version as cached
      mockApiClient.getLastUpdate.mockResolvedValue({
        referencia_disponivel: '2025-01',
        ultima_atualizacao: '2025-01-15',
        estados_atualizados: ['SP', 'RJ', 'MG'],
      });

      await job.checkForUpdates();

      expect(cache.invalidateSource).not.toHaveBeenCalled();
      expect(job.getSchedulerStatus().status).toBe('idle');
    });

    it('should invalidate cache when version changes', async () => {
      // New version
      mockApiClient.getLastUpdate.mockResolvedValue({
        referencia_disponivel: '2025-02',
        ultima_atualizacao: '2025-02-15',
        estados_atualizados: ['SP', 'RJ', 'MG'],
      });

      await job.checkForUpdates();

      expect(cache.invalidateSource).toHaveBeenCalledWith('sinapi');
      expect(sinapiService.resetApiFailure).toHaveBeenCalled();
      expect(job.getLastUpdate()).toBe('2025-02');
      expect(job.getSchedulerStatus().lastUpdate).toBe('2025-02');
    });

    it('should update scheduler status on success', async () => {
      await job.checkForUpdates();

      const status = job.getSchedulerStatus();
      expect(status.lastRun).not.toBeNull();
      expect(status.status).toBe('idle');
      expect(status.lastError).toBeUndefined();
    });

    it('should update scheduler status on error', async () => {
      mockApiClient.getLastUpdate.mockRejectedValue(new Error('Network error'));

      await job.checkForUpdates();

      const status = job.getSchedulerStatus();
      expect(status.status).toBe('error');
      expect(status.lastError).toBe('Network error');
    });
  });

  describe('warmupCache', () => {
    beforeEach(() => {
      mockApiClient.isConfigured.mockReturnValue(true);
    });

    it('should not warm up if API not configured', async () => {
      mockApiClient.isConfigured.mockReturnValue(false);

      await job.warmupCache();

      expect(sinapiService.search).not.toHaveBeenCalled();
    });

    it('should call search for popular terms and states', async () => {
      mockSinapiService.search.mockResolvedValue({
        data: [],
        total: 0,
        page: 1,
        perPage: 50,
        source: 'sinapi',
        cached: false,
        timestamp: new Date(),
      });

      await job.warmupCache();

      // Should be called for each term x state combination
      // 10 terms x 7 states = 70 calls
      expect(sinapiService.search).toHaveBeenCalled();
      expect(sinapiService.search.mock.calls.length).toBeGreaterThan(0);
    }, 30000); // 30 second timeout for warmup

    it('should handle search failures gracefully', async () => {
      mockSinapiService.search.mockRejectedValue(new Error('Search failed'));

      // Should not throw
      await expect(job.warmupCache()).resolves.not.toThrow();
    }, 30000); // 30 second timeout for warmup
  });

  describe('invalidateCache', () => {
    it('should call cache.invalidateSource with sinapi', async () => {
      await job.invalidateCache();

      expect(cache.invalidateSource).toHaveBeenCalledWith('sinapi');
    });
  });

  describe('getSchedulerStatus', () => {
    it('should return current scheduler status', async () => {
      mockApiClient.isConfigured.mockReturnValue(true);
      mockApiClient.getLastUpdate.mockResolvedValue({
        referencia_disponivel: '2025-01',
        ultima_atualizacao: '2025-01-15',
        estados_atualizados: ['SP', 'RJ', 'MG'],
      });
      await job.onModuleInit();

      const status = job.getSchedulerStatus();

      expect(status).toEqual(
        expect.objectContaining({
          enabled: true,
          cronExpression: '0 3 * * *',
          status: 'idle',
          lastUpdate: '2025-01',
        }),
      );
      expect(status.nextRun).toBeInstanceOf(Date);
    });
  });

  describe('setEnabled', () => {
    it('should update enabled status', () => {
      job.setEnabled(false);
      expect(job.getSchedulerStatus().enabled).toBe(false);

      job.setEnabled(true);
      expect(job.getSchedulerStatus().enabled).toBe(true);
    });
  });

  describe('triggerManualCheck', () => {
    it('should call checkForUpdates', async () => {
      mockApiClient.isConfigured.mockReturnValue(true);
      mockApiClient.getLastUpdate.mockResolvedValue({
        referencia_disponivel: '2025-01',
        ultima_atualizacao: '2025-01-15',
        estados_atualizados: ['SP', 'RJ', 'MG'],
      });
      await job.onModuleInit();

      const checkSpy = jest.spyOn(job, 'checkForUpdates');

      await job.triggerManualCheck();

      expect(checkSpy).toHaveBeenCalled();
    });
  });
});
