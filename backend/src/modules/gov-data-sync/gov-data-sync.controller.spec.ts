/**
 * Government Data Sync Controller Tests
 *
 * @see https://github.com/CONFENGE/etp-express/issues/1062
 */

import { Test, TestingModule } from '@nestjs/testing';
import { GovDataSyncController } from './gov-data-sync.controller';
import { GovDataSyncService, GovDataStatus } from './gov-data-sync.service';
import { SinapiDataStatus } from '../gov-api/sinapi/sinapi.service';
import { SicroDataStatus } from '../gov-api/sicro/sicro.service';

describe('GovDataSyncController', () => {
  let controller: GovDataSyncController;
  let service: jest.Mocked<GovDataSyncService>;

  const mockSinapiStatus: SinapiDataStatus = {
    source: 'sinapi',
    dataLoaded: true,
    itemCount: 100,
    loadedMonths: ['DF:2024-01:INSUMO'],
    lastUpdate: new Date(),
    message: 'SINAPI data loaded: 100 items from 1 month(s)',
  };

  const mockSicroStatus: SicroDataStatus = {
    source: 'sicro',
    dataLoaded: true,
    itemCount: 50,
    loadedMonths: ['DF:2024-01:COMPOSICAO:RODOVIARIO'],
    lastUpdate: new Date(),
    message: 'SICRO data loaded: 50 items from 1 month(s)',
  };

  const mockGovDataStatus: GovDataStatus = {
    sinapi: mockSinapiStatus,
    sicro: mockSicroStatus,
    allDataLoaded: true,
    summary: 'All data loaded: SINAPI (100 items), SICRO (50 items)',
  };

  const mockQueueStats = {
    waiting: 0,
    active: 1,
    completed: 10,
    failed: 0,
    delayed: 0,
  };

  beforeEach(async () => {
    const mockService = {
      getDataStatus: jest.fn().mockReturnValue(mockGovDataStatus),
      getSinapiStatus: jest.fn().mockReturnValue(mockSinapiStatus),
      getSicroStatus: jest.fn().mockReturnValue(mockSicroStatus),
      getQueueStats: jest.fn().mockResolvedValue(mockQueueStats),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [GovDataSyncController],
      providers: [
        {
          provide: GovDataSyncService,
          useValue: mockService,
        },
      ],
    }).compile();

    controller = module.get<GovDataSyncController>(GovDataSyncController);
    service = module.get(GovDataSyncService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getStatus()', () => {
    it('should return combined gov data status', () => {
      const result = controller.getStatus();

      expect(result).toEqual(mockGovDataStatus);
      expect(service.getDataStatus).toHaveBeenCalled();
    });

    it('should include both SINAPI and SICRO status', () => {
      const result = controller.getStatus();

      expect(result.sinapi).toBeDefined();
      expect(result.sicro).toBeDefined();
      expect(result.allDataLoaded).toBe(true);
      expect(result.summary).toContain('All data loaded');
    });
  });

  describe('getSinapiStatus()', () => {
    it('should return SINAPI data status', () => {
      const result = controller.getSinapiStatus();

      expect(result).toEqual(mockSinapiStatus);
      expect(service.getSinapiStatus).toHaveBeenCalled();
    });

    it('should include source and data loaded flag', () => {
      const result = controller.getSinapiStatus();

      expect(result.source).toBe('sinapi');
      expect(result.dataLoaded).toBe(true);
      expect(result.itemCount).toBe(100);
    });
  });

  describe('getSicroStatus()', () => {
    it('should return SICRO data status', () => {
      const result = controller.getSicroStatus();

      expect(result).toEqual(mockSicroStatus);
      expect(service.getSicroStatus).toHaveBeenCalled();
    });

    it('should include source and data loaded flag', () => {
      const result = controller.getSicroStatus();

      expect(result.source).toBe('sicro');
      expect(result.dataLoaded).toBe(true);
      expect(result.itemCount).toBe(50);
    });
  });

  describe('getQueueStats()', () => {
    it('should return queue statistics', async () => {
      const result = await controller.getQueueStats();

      expect(result).toEqual(mockQueueStats);
      expect(service.getQueueStats).toHaveBeenCalled();
    });

    it('should include all queue state counts', async () => {
      const result = await controller.getQueueStats();

      expect(result.waiting).toBe(0);
      expect(result.active).toBe(1);
      expect(result.completed).toBe(10);
      expect(result.failed).toBe(0);
      expect(result.delayed).toBe(0);
    });
  });

  describe('status when no data loaded', () => {
    beforeEach(() => {
      const emptyStatus: GovDataStatus = {
        sinapi: {
          source: 'sinapi',
          dataLoaded: false,
          itemCount: 0,
          loadedMonths: [],
          lastUpdate: null,
          message: 'SINAPI data not loaded.',
        },
        sicro: {
          source: 'sicro',
          dataLoaded: false,
          itemCount: 0,
          loadedMonths: [],
          lastUpdate: null,
          message: 'SICRO data not loaded.',
        },
        allDataLoaded: false,
        summary: 'No data loaded. Sync jobs may be pending or failed.',
      };

      service.getDataStatus.mockReturnValue(emptyStatus);
    });

    it('should return not loaded status', () => {
      const result = controller.getStatus();

      expect(result.allDataLoaded).toBe(false);
      expect(result.summary).toContain('No data loaded');
    });
  });
});
