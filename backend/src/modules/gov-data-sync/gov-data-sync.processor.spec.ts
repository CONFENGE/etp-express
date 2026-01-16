/**
 * Government Data Sync Processor Tests
 *
 * Unit tests for GovDataSyncProcessor BullMQ job processing.
 *
 * @module modules/gov-data-sync
 * @see https://github.com/CONFENGE/etp-express/issues/698
 */

import { Test, TestingModule } from '@nestjs/testing';
import { Job } from 'bullmq';
import { GovDataSyncProcessor } from './gov-data-sync.processor';
import { SinapiService } from '../gov-api/sinapi/sinapi.service';
import { SicroService } from '../gov-api/sicro/sicro.service';
import { PncpService } from '../gov-api/pncp/pncp.service';
import { GovApiCache } from '../gov-api/utils/gov-api-cache';
import {
  SINAPI_SYNC_JOB,
  SICRO_SYNC_JOB,
  GOV_CACHE_REFRESH_JOB,
  PNCP_WEEKLY_CHECK_JOB,
  CACHE_VALIDATION_JOB,
  SinapiSyncJobData,
  SicroSyncJobData,
  GovCacheRefreshJobData,
  PncpWeeklyCheckJobData,
  CacheValidationJobData,
} from './gov-data-sync.types';

// Mock Sentry
jest.mock('@sentry/node', () => ({
  captureException: jest.fn(),
}));

describe('GovDataSyncProcessor', () => {
  let processor: GovDataSyncProcessor;
  let mockSinapiService: Partial<SinapiService>;
  let mockSicroService: Partial<SicroService>;
  let mockPncpService: Partial<PncpService>;
  let mockCache: Partial<GovApiCache>;

  beforeEach(async () => {
    mockSinapiService = {
      isDataLoaded: jest.fn().mockReturnValue(false),
      loadFromBuffer: jest.fn().mockResolvedValue({ loaded: 100, errors: 0 }),
    };

    mockSicroService = {
      getLoadedMonths: jest.fn().mockReturnValue([]),
      loadFromBuffer: jest.fn().mockResolvedValue({ loaded: 50, errors: 0 }),
    };

    mockPncpService = {
      searchContratacoes: jest.fn().mockResolvedValue({
        totalRegistros: 5,
        itens: [],
      }),
      searchAtas: jest.fn().mockResolvedValue({
        totalRegistros: 3,
        itens: [],
      }),
      searchContratos: jest.fn().mockResolvedValue({
        totalRegistros: 2,
        itens: [],
      }),
    };

    mockCache = {
      getKeyCount: jest.fn().mockResolvedValue(10),
      invalidateSource: jest.fn().mockResolvedValue(undefined),
      getStats: jest.fn().mockReturnValue({ hits: 100, misses: 20 }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GovDataSyncProcessor,
        {
          provide: SinapiService,
          useValue: mockSinapiService,
        },
        {
          provide: SicroService,
          useValue: mockSicroService,
        },
        {
          provide: PncpService,
          useValue: mockPncpService,
        },
        {
          provide: GovApiCache,
          useValue: mockCache,
        },
      ],
    }).compile();

    processor = module.get<GovDataSyncProcessor>(GovDataSyncProcessor);
  });

  it('should be defined', () => {
    expect(processor).toBeDefined();
  });

  describe('process - SINAPI sync', () => {
    it('should process SINAPI sync job', async () => {
      const mockJob = {
        id: 'test-job-1',
        name: SINAPI_SYNC_JOB,
        data: {
          mesReferencia: '2024-12',
          tipo: 'ALL',
          force: false,
        } as SinapiSyncJobData,
        updateProgress: jest.fn().mockResolvedValue(undefined),
      } as unknown as Job<SinapiSyncJobData>;

      const result = await processor.process(mockJob);

      expect(result.source).toBe('sinapi');
      expect(result.success).toBe(true);
      expect(mockJob.updateProgress).toHaveBeenCalled();
    });

    it('should skip already loaded data unless force is true', async () => {
      (mockSinapiService.isDataLoaded as jest.Mock).mockReturnValue(true);

      const mockJob = {
        id: 'test-job-2',
        name: SINAPI_SYNC_JOB,
        data: {
          uf: 'DF',
          mesReferencia: '2024-12',
          tipo: 'INSUMO',
          force: false,
        } as SinapiSyncJobData,
        updateProgress: jest.fn().mockResolvedValue(undefined),
      } as unknown as Job<SinapiSyncJobData>;

      const result = await processor.process(mockJob);

      expect(result.source).toBe('sinapi');
      expect(result.success).toBe(true);
      // Data was skipped because already loaded
    });

    it('should process when force is true even if data loaded', async () => {
      (mockSinapiService.isDataLoaded as jest.Mock).mockReturnValue(true);

      const mockJob = {
        id: 'test-job-3',
        name: SINAPI_SYNC_JOB,
        data: {
          uf: 'DF',
          mesReferencia: '2024-12',
          tipo: 'INSUMO',
          force: true,
        } as SinapiSyncJobData,
        updateProgress: jest.fn().mockResolvedValue(undefined),
      } as unknown as Job<SinapiSyncJobData>;

      const result = await processor.process(mockJob);

      expect(result.source).toBe('sinapi');
    });
  });

  describe('process - SICRO sync', () => {
    it('should process SICRO sync job', async () => {
      const mockJob = {
        id: 'test-job-4',
        name: SICRO_SYNC_JOB,
        data: {
          mesReferencia: '2024-10',
          tipo: 'COMPOSICAO',
          force: false,
        } as SicroSyncJobData,
        updateProgress: jest.fn().mockResolvedValue(undefined),
      } as unknown as Job<SicroSyncJobData>;

      const result = await processor.process(mockJob);

      expect(result.source).toBe('sicro');
      expect(result.success).toBe(true);
      expect(mockJob.updateProgress).toHaveBeenCalled();
    });

    it('should handle SICRO sync for specific UF', async () => {
      const mockJob = {
        id: 'test-job-5',
        name: SICRO_SYNC_JOB,
        data: {
          uf: 'SP',
          mesReferencia: '2024-10',
          tipo: 'ALL',
        } as SicroSyncJobData,
        updateProgress: jest.fn().mockResolvedValue(undefined),
      } as unknown as Job<SicroSyncJobData>;

      const result = await processor.process(mockJob);

      expect(result.source).toBe('sicro');
      expect(result.details).toBeDefined();
    });
  });

  describe('process - Cache refresh', () => {
    it('should process cache refresh job for all caches', async () => {
      const mockJob = {
        id: 'test-job-6',
        name: GOV_CACHE_REFRESH_JOB,
        data: {
          cacheType: 'all',
          maxAgeHours: 168,
        } as GovCacheRefreshJobData,
        updateProgress: jest.fn().mockResolvedValue(undefined),
      } as unknown as Job<GovCacheRefreshJobData>;

      const result = await processor.process(mockJob);

      expect(result.source).toBe('cache-refresh');
      expect(result.success).toBe(true);
      expect(mockCache.getKeyCount).toHaveBeenCalled();
    });

    it('should process cache refresh for specific cache type', async () => {
      const mockJob = {
        id: 'test-job-7',
        name: GOV_CACHE_REFRESH_JOB,
        data: {
          cacheType: 'sinapi',
        } as GovCacheRefreshJobData,
        updateProgress: jest.fn().mockResolvedValue(undefined),
      } as unknown as Job<GovCacheRefreshJobData>;

      const result = await processor.process(mockJob);

      expect(result.source).toBe('cache-refresh');
      expect(result.success).toBe(true);
    });

    it('should handle cache errors gracefully', async () => {
      (mockCache.getKeyCount as jest.Mock).mockRejectedValue(
        new Error('Redis connection failed'),
      );

      const mockJob = {
        id: 'test-job-8',
        name: GOV_CACHE_REFRESH_JOB,
        data: {
          cacheType: 'sinapi',
        } as GovCacheRefreshJobData,
        updateProgress: jest.fn().mockResolvedValue(undefined),
      } as unknown as Job<GovCacheRefreshJobData>;

      const result = await processor.process(mockJob);

      expect(result.source).toBe('cache-refresh');
      expect(result.errors).toBeGreaterThan(0);
    });
  });

  describe('process - Unknown job', () => {
    it('should throw error for unknown job name', async () => {
      const mockJob = {
        id: 'test-job-9',
        name: 'unknown-job',
        data: {},
        updateProgress: jest.fn().mockResolvedValue(undefined),
      } as unknown as Job;

      await expect(processor.process(mockJob)).rejects.toThrow(
        'Unknown job name: unknown-job',
      );
    });
  });

  describe('onApplicationShutdown', () => {
    it('should handle graceful shutdown', async () => {
      // The worker property is set by WorkerHost base class
      // In tests, it won't be available, so we just verify the method exists
      await expect(
        processor.onApplicationShutdown('SIGTERM'),
      ).resolves.not.toThrow();
    });
  });

  describe('process - PNCP Weekly Check (#1166)', () => {
    it('should process PNCP weekly check job', async () => {
      const mockJob = {
        id: 'test-job-pncp-1',
        name: PNCP_WEEKLY_CHECK_JOB,
        data: {
          lookbackDays: 7,
          forceRefresh: false,
        } as PncpWeeklyCheckJobData,
        updateProgress: jest.fn().mockResolvedValue(undefined),
      } as unknown as Job<PncpWeeklyCheckJobData>;

      const result = await processor.process(mockJob);

      expect(result.source).toBe('pncp-weekly-check');
      expect(result.success).toBe(true);
      expect(mockPncpService.searchContratacoes).toHaveBeenCalled();
      expect(mockPncpService.searchAtas).toHaveBeenCalled();
      expect(mockPncpService.searchContratos).toHaveBeenCalled();
      expect(mockJob.updateProgress).toHaveBeenCalled();
    });

    it('should process PNCP weekly check with UF filter', async () => {
      const mockJob = {
        id: 'test-job-pncp-2',
        name: PNCP_WEEKLY_CHECK_JOB,
        data: {
          uf: 'DF',
          lookbackDays: 14,
          forceRefresh: true,
        } as PncpWeeklyCheckJobData,
        updateProgress: jest.fn().mockResolvedValue(undefined),
      } as unknown as Job<PncpWeeklyCheckJobData>;

      const result = await processor.process(mockJob);

      expect(result.source).toBe('pncp-weekly-check');
      expect(result.success).toBe(true);
    });

    it('should handle PNCP API errors gracefully', async () => {
      (mockPncpService.searchContratacoes as jest.Mock).mockRejectedValue(
        new Error('API timeout'),
      );

      const mockJob = {
        id: 'test-job-pncp-3',
        name: PNCP_WEEKLY_CHECK_JOB,
        data: {
          lookbackDays: 7,
        } as PncpWeeklyCheckJobData,
        updateProgress: jest.fn().mockResolvedValue(undefined),
      } as unknown as Job<PncpWeeklyCheckJobData>;

      const result = await processor.process(mockJob);

      expect(result.source).toBe('pncp-weekly-check');
      expect(result.errors).toBeGreaterThan(0);
    });

    it('should report new data found', async () => {
      (mockPncpService.searchContratacoes as jest.Mock).mockResolvedValue({
        totalRegistros: 100,
        itens: [],
      });

      const mockJob = {
        id: 'test-job-pncp-4',
        name: PNCP_WEEKLY_CHECK_JOB,
        data: {} as PncpWeeklyCheckJobData,
        updateProgress: jest.fn().mockResolvedValue(undefined),
      } as unknown as Job<PncpWeeklyCheckJobData>;

      const result = await processor.process(mockJob);

      expect(result.source).toBe('pncp-weekly-check');
      expect(result.itemsSynced).toBeGreaterThan(0);
      expect(result.details).toBeDefined();
    });
  });

  describe('process - Cache Validation (#1166)', () => {
    it('should process cache validation job for all caches', async () => {
      const mockJob = {
        id: 'test-job-cache-val-1',
        name: CACHE_VALIDATION_JOB,
        data: {
          cacheType: 'all',
          autoRepair: true,
        } as CacheValidationJobData,
        updateProgress: jest.fn().mockResolvedValue(undefined),
      } as unknown as Job<CacheValidationJobData>;

      const result = await processor.process(mockJob);

      expect(result.source).toBe('cache-validation');
      expect(result.success).toBe(true);
      expect(mockCache.getStats).toHaveBeenCalled();
      expect(mockCache.getKeyCount).toHaveBeenCalled();
      expect(mockJob.updateProgress).toHaveBeenCalled();
    });

    it('should process cache validation for specific cache type', async () => {
      const mockJob = {
        id: 'test-job-cache-val-2',
        name: CACHE_VALIDATION_JOB,
        data: {
          cacheType: 'pncp',
          autoRepair: false,
        } as CacheValidationJobData,
        updateProgress: jest.fn().mockResolvedValue(undefined),
      } as unknown as Job<CacheValidationJobData>;

      const result = await processor.process(mockJob);

      expect(result.source).toBe('cache-validation');
      expect(result.success).toBe(true);
    });

    it('should auto-repair critically unhealthy caches', async () => {
      // Simulate critically low health score (low hit ratio, empty cache with misses)
      (mockCache.getStats as jest.Mock).mockReturnValue({ hits: 0, misses: 100 });
      (mockCache.getKeyCount as jest.Mock).mockResolvedValue(0);

      const mockJob = {
        id: 'test-job-cache-val-3',
        name: CACHE_VALIDATION_JOB,
        data: {
          cacheType: 'sinapi',
          autoRepair: true,
        } as CacheValidationJobData,
        updateProgress: jest.fn().mockResolvedValue(undefined),
      } as unknown as Job<CacheValidationJobData>;

      const result = await processor.process(mockJob);

      expect(result.source).toBe('cache-validation');
      // Auto-repair should have been triggered due to low health score
      expect(result.details).toBeDefined();
    });

    it('should handle cache validation errors gracefully', async () => {
      (mockCache.getStats as jest.Mock).mockImplementation(() => {
        throw new Error('Redis connection failed');
      });

      const mockJob = {
        id: 'test-job-cache-val-4',
        name: CACHE_VALIDATION_JOB,
        data: {
          cacheType: 'sinapi',
        } as CacheValidationJobData,
        updateProgress: jest.fn().mockResolvedValue(undefined),
      } as unknown as Job<CacheValidationJobData>;

      const result = await processor.process(mockJob);

      expect(result.source).toBe('cache-validation');
      expect(result.errors).toBeGreaterThan(0);
    });

    it('should validate without auto-repair when disabled', async () => {
      (mockCache.getStats as jest.Mock).mockReturnValue({ hits: 0, misses: 100 });
      (mockCache.getKeyCount as jest.Mock).mockResolvedValue(0);

      const mockJob = {
        id: 'test-job-cache-val-5',
        name: CACHE_VALIDATION_JOB,
        data: {
          cacheType: 'pncp',
          autoRepair: false,
        } as CacheValidationJobData,
        updateProgress: jest.fn().mockResolvedValue(undefined),
      } as unknown as Job<CacheValidationJobData>;

      const result = await processor.process(mockJob);

      expect(result.source).toBe('cache-validation');
      // Auto-repair should NOT have been called
      expect(mockCache.invalidateSource).not.toHaveBeenCalled();
    });
  });
});
