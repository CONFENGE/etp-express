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
import { GovApiCache } from '../gov-api/utils/gov-api-cache';
import {
  SINAPI_SYNC_JOB,
  SICRO_SYNC_JOB,
  GOV_CACHE_REFRESH_JOB,
  SinapiSyncJobData,
  SicroSyncJobData,
  GovCacheRefreshJobData,
} from './gov-data-sync.types';

// Mock Sentry
jest.mock('@sentry/node', () => ({
  captureException: jest.fn(),
}));

// Mock Sentry/NestJS (used by GovApiCache for fallback alerts)
jest.mock('@sentry/nestjs', () => ({
  captureMessage: jest.fn(),
  captureException: jest.fn(),
}));

describe('GovDataSyncProcessor', () => {
  let processor: GovDataSyncProcessor;
  let mockSinapiService: Partial<SinapiService>;
  let mockSicroService: Partial<SicroService>;
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

    mockCache = {
      getKeyCount: jest.fn().mockResolvedValue(10),
      invalidateSource: jest.fn().mockResolvedValue(undefined),
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
});
