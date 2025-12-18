/**
 * Government Data Sync Service Tests
 *
 * Unit tests for GovDataSyncService scheduled job management.
 *
 * @module modules/gov-data-sync
 * @see https://github.com/CONFENGE/etp-express/issues/698
 */

import { Test, TestingModule } from '@nestjs/testing';
import { getQueueToken } from '@nestjs/bullmq';
import { GovDataSyncService } from './gov-data-sync.service';
import {
  GOV_DATA_SYNC_QUEUE,
  SINAPI_SYNC_JOB,
  SICRO_SYNC_JOB,
  GOV_CACHE_REFRESH_JOB,
} from './gov-data-sync.types';

describe('GovDataSyncService', () => {
  let service: GovDataSyncService;
  let mockQueue: {
    add: jest.Mock;
    getWaitingCount: jest.Mock;
    getActiveCount: jest.Mock;
    getCompletedCount: jest.Mock;
    getFailedCount: jest.Mock;
    getDelayedCount: jest.Mock;
    getJobs: jest.Mock;
  };

  beforeEach(async () => {
    mockQueue = {
      add: jest.fn().mockResolvedValue({ id: 'test-job-id' }),
      getWaitingCount: jest.fn().mockResolvedValue(0),
      getActiveCount: jest.fn().mockResolvedValue(0),
      getCompletedCount: jest.fn().mockResolvedValue(5),
      getFailedCount: jest.fn().mockResolvedValue(1),
      getDelayedCount: jest.fn().mockResolvedValue(2),
      getJobs: jest.fn().mockResolvedValue([]),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GovDataSyncService,
        {
          provide: getQueueToken(GOV_DATA_SYNC_QUEUE),
          useValue: mockQueue,
        },
      ],
    }).compile();

    service = module.get<GovDataSyncService>(GovDataSyncService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('addSinapiSyncJob', () => {
    it('should add SINAPI sync job to queue', async () => {
      const jobId = await service.addSinapiSyncJob({
        mesReferencia: '2024-12',
        tipo: 'ALL',
      });

      expect(jobId).toBe('test-job-id');
      expect(mockQueue.add).toHaveBeenCalledWith(
        SINAPI_SYNC_JOB,
        expect.objectContaining({
          mesReferencia: '2024-12',
          tipo: 'ALL',
        }),
        expect.objectContaining({
          attempts: 3,
          backoff: expect.any(Object),
        }),
      );
    });

    it('should add SINAPI sync job with default options', async () => {
      const jobId = await service.addSinapiSyncJob();

      expect(jobId).toBe('test-job-id');
      expect(mockQueue.add).toHaveBeenCalledWith(
        SINAPI_SYNC_JOB,
        {},
        expect.any(Object),
      );
    });

    it('should add SINAPI sync job for specific UF', async () => {
      const jobId = await service.addSinapiSyncJob({
        uf: 'DF',
        mesReferencia: '2024-12',
      });

      expect(jobId).toBe('test-job-id');
      expect(mockQueue.add).toHaveBeenCalledWith(
        SINAPI_SYNC_JOB,
        expect.objectContaining({
          uf: 'DF',
          mesReferencia: '2024-12',
        }),
        expect.any(Object),
      );
    });
  });

  describe('addSicroSyncJob', () => {
    it('should add SICRO sync job to queue', async () => {
      const jobId = await service.addSicroSyncJob({
        mesReferencia: '2024-10',
        tipo: 'COMPOSICAO',
      });

      expect(jobId).toBe('test-job-id');
      expect(mockQueue.add).toHaveBeenCalledWith(
        SICRO_SYNC_JOB,
        expect.objectContaining({
          mesReferencia: '2024-10',
          tipo: 'COMPOSICAO',
        }),
        expect.objectContaining({
          attempts: 3,
        }),
      );
    });

    it('should add SICRO sync job with force option', async () => {
      const jobId = await service.addSicroSyncJob({
        force: true,
      });

      expect(jobId).toBe('test-job-id');
      expect(mockQueue.add).toHaveBeenCalledWith(
        SICRO_SYNC_JOB,
        expect.objectContaining({
          force: true,
        }),
        expect.any(Object),
      );
    });
  });

  describe('addCacheRefreshJob', () => {
    it('should add cache refresh job to queue', async () => {
      const jobId = await service.addCacheRefreshJob({
        cacheType: 'sinapi',
        maxAgeHours: 72,
      });

      expect(jobId).toBe('test-job-id');
      expect(mockQueue.add).toHaveBeenCalledWith(
        GOV_CACHE_REFRESH_JOB,
        expect.objectContaining({
          cacheType: 'sinapi',
          maxAgeHours: 72,
        }),
        expect.any(Object),
      );
    });

    it('should add cache refresh job for all caches', async () => {
      const jobId = await service.addCacheRefreshJob({
        cacheType: 'all',
      });

      expect(jobId).toBe('test-job-id');
      expect(mockQueue.add).toHaveBeenCalledWith(
        GOV_CACHE_REFRESH_JOB,
        expect.objectContaining({
          cacheType: 'all',
        }),
        expect.any(Object),
      );
    });
  });

  describe('getQueueStats', () => {
    it('should return queue statistics', async () => {
      const stats = await service.getQueueStats();

      expect(stats).toEqual({
        waiting: 0,
        active: 0,
        completed: 5,
        failed: 1,
        delayed: 2,
      });

      expect(mockQueue.getWaitingCount).toHaveBeenCalled();
      expect(mockQueue.getActiveCount).toHaveBeenCalled();
      expect(mockQueue.getCompletedCount).toHaveBeenCalled();
      expect(mockQueue.getFailedCount).toHaveBeenCalled();
      expect(mockQueue.getDelayedCount).toHaveBeenCalled();
    });
  });

  describe('getRecentJobs', () => {
    it('should return recent jobs with formatted data', async () => {
      const mockJobs = [
        {
          id: 'job-1',
          name: SINAPI_SYNC_JOB,
          progress: 100,
          data: { uf: 'DF' },
          timestamp: Date.now(),
          finishedOn: Date.now(),
          failedReason: null,
        },
        {
          id: 'job-2',
          name: SICRO_SYNC_JOB,
          progress: 50,
          data: { uf: 'SP' },
          timestamp: Date.now(),
          processedOn: Date.now(),
          finishedOn: null,
          failedReason: null,
        },
      ];
      mockQueue.getJobs.mockResolvedValue(mockJobs);

      const jobs = await service.getRecentJobs(10);

      expect(jobs).toHaveLength(2);
      expect(jobs[0].id).toBe('job-1');
      expect(jobs[0].state).toBe('completed');
      expect(jobs[1].id).toBe('job-2');
      expect(jobs[1].state).toBe('active');
    });

    it('should handle failed jobs correctly', async () => {
      const mockJobs = [
        {
          id: 'job-1',
          name: SINAPI_SYNC_JOB,
          progress: 30,
          data: {},
          timestamp: Date.now(),
          finishedOn: Date.now(),
          failedReason: 'Connection error',
        },
      ];
      mockQueue.getJobs.mockResolvedValue(mockJobs);

      const jobs = await service.getRecentJobs(10);

      expect(jobs[0].state).toBe('failed');
      expect(jobs[0].failedReason).toBe('Connection error');
    });
  });

  describe('triggerSinapiSync', () => {
    it('should trigger manual SINAPI sync', async () => {
      const jobId = await service.triggerSinapiSync('DF', '2024-12', true);

      expect(jobId).toBe('test-job-id');
      expect(mockQueue.add).toHaveBeenCalledWith(
        SINAPI_SYNC_JOB,
        expect.objectContaining({
          uf: 'DF',
          mesReferencia: '2024-12',
          tipo: 'ALL',
          force: true,
        }),
        expect.any(Object),
      );
    });

    it('should use current month when not specified', async () => {
      const jobId = await service.triggerSinapiSync();

      expect(jobId).toBe('test-job-id');
      expect(mockQueue.add).toHaveBeenCalledWith(
        SINAPI_SYNC_JOB,
        expect.objectContaining({
          mesReferencia: expect.stringMatching(/^\d{4}-\d{2}$/),
          tipo: 'ALL',
          force: false,
        }),
        expect.any(Object),
      );
    });
  });

  describe('triggerSicroSync', () => {
    it('should trigger manual SICRO sync', async () => {
      const jobId = await service.triggerSicroSync('SP', '2024-10', true);

      expect(jobId).toBe('test-job-id');
      expect(mockQueue.add).toHaveBeenCalledWith(
        SICRO_SYNC_JOB,
        expect.objectContaining({
          uf: 'SP',
          mesReferencia: '2024-10',
          tipo: 'ALL',
          force: true,
        }),
        expect.any(Object),
      );
    });
  });

  describe('triggerCacheRefresh', () => {
    it('should trigger manual cache refresh', async () => {
      const jobId = await service.triggerCacheRefresh('sinapi');

      expect(jobId).toBe('test-job-id');
      expect(mockQueue.add).toHaveBeenCalledWith(
        GOV_CACHE_REFRESH_JOB,
        expect.objectContaining({
          cacheType: 'sinapi',
        }),
        expect.any(Object),
      );
    });

    it('should refresh all caches when not specified', async () => {
      const jobId = await service.triggerCacheRefresh();

      expect(jobId).toBe('test-job-id');
      expect(mockQueue.add).toHaveBeenCalledWith(
        GOV_CACHE_REFRESH_JOB,
        expect.objectContaining({
          cacheType: 'all',
        }),
        expect.any(Object),
      );
    });
  });

  describe('scheduled jobs', () => {
    it('should have scheduleSinapiSync method', () => {
      expect(service.scheduleSinapiSync).toBeDefined();
    });

    it('should have scheduleSicroSync method', () => {
      expect(service.scheduleSicroSync).toBeDefined();
    });

    it('should have scheduleCacheRefresh method', () => {
      expect(service.scheduleCacheRefresh).toBeDefined();
    });
  });
});
