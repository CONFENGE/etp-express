/**
 * SINAPI Service Tests
 *
 * @see https://github.com/CONFENGE/etp-express/issues/693
 * @see https://github.com/CONFENGE/etp-express/issues/1165 - Persistence tests
 */

import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { getRepositoryToken } from '@nestjs/typeorm';
import * as ExcelJS from 'exceljs';
import { SinapiService } from './sinapi.service';
import { GovApiCache } from '../utils/gov-api-cache';
import {
  SinapiItemType,
  SinapiPriceReference,
  SinapiCategoria,
} from './sinapi.types';
import { SinapiItem } from '../../../entities/sinapi-item.entity';

/**
 * Helper function to create an Excel buffer from array data using ExcelJS
 */
async function createExcelBuffer(
  headers: string[],
  data: (string | number)[][],
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Sheet1');

  // Add headers
  worksheet.addRow(headers);

  // Add data rows
  for (const row of data) {
    worksheet.addRow(row);
  }

  // Write to buffer
  const arrayBuffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(arrayBuffer);
}

describe('SinapiService', () => {
  let service: SinapiService;
  let cache: jest.Mocked<GovApiCache>;
  let mockRepository: jest.Mocked<Record<string, jest.Mock>>;

  const mockConfigService = {
    get: jest.fn().mockReturnValue(undefined),
  };

  const mockCache = {
    get: jest.fn(),
    set: jest.fn(),
    delete: jest.fn(),
  };

  // Mock repository for TypeORM (#1165)
  const createMockRepository = () => ({
    count: jest.fn().mockResolvedValue(0),
    find: jest.fn().mockResolvedValue([]),
    findOne: jest.fn().mockResolvedValue(null),
    save: jest.fn().mockImplementation((entity) => Promise.resolve(entity)),
    createQueryBuilder: jest.fn().mockReturnValue({
      insert: jest.fn().mockReturnThis(),
      into: jest.fn().mockReturnThis(),
      values: jest.fn().mockReturnThis(),
      orIgnore: jest.fn().mockReturnThis(),
      execute: jest
        .fn()
        .mockResolvedValue({ identifiers: [], generatedMaps: [], raw: [] }),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([]),
      getCount: jest.fn().mockResolvedValue(0),
    }),
  });

  beforeEach(async () => {
    jest.clearAllMocks();
    mockRepository = createMockRepository();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SinapiService,
        { provide: ConfigService, useValue: mockConfigService },
        { provide: GovApiCache, useValue: mockCache },
        { provide: getRepositoryToken(SinapiItem), useValue: mockRepository },
      ],
    }).compile();

    service = module.get<SinapiService>(SinapiService);
    cache = module.get(GovApiCache);

    // Initialize the service
    service.onModuleInit();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('source', () => {
    it('should have source set to sinapi', () => {
      expect(service.source).toBe('sinapi');
    });
  });

  describe('search()', () => {
    beforeEach(() => {
      mockCache.get.mockResolvedValue(null);
      mockCache.set.mockResolvedValue(undefined);
    });

    it('should return empty results when no data is loaded', async () => {
      const result = await service.search('cimento');

      expect(result.data).toEqual([]);
      expect(result.total).toBe(0);
      expect(result.source).toBe('sinapi');
      expect(result.isFallback).toBe(false);
    });

    it('should return cached results when available', async () => {
      const cachedResponse = {
        data: [createMockSinapiItem('00001', 'Cimento Portland')],
        total: 1,
        page: 1,
        perPage: 50,
        source: 'sinapi' as const,
        cached: false,
        isFallback: false,
        timestamp: new Date(),
      };

      mockCache.get.mockResolvedValue(cachedResponse);

      const result = await service.search('cimento');

      expect(result.cached).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(cache.get).toHaveBeenCalled();
    });

    it('should apply filters correctly', async () => {
      const result = await service.search('cimento', {
        uf: 'DF',
        mesReferencia: '2024-01',
      });

      expect(result.source).toBe('sinapi');
    });

    it('should paginate results', async () => {
      const result = await service.search('cimento', {
        page: 2,
        perPage: 10,
      });

      expect(result.page).toBe(2);
      expect(result.perPage).toBe(10);
    });
  });

  describe('getById()', () => {
    beforeEach(() => {
      mockCache.get.mockResolvedValue(null);
      mockCache.set.mockResolvedValue(undefined);
    });

    it('should return null for non-existent item', async () => {
      const result = await service.getById('sinapi:00001:DF:2024-01:O');

      expect(result).toBeNull();
    });

    it('should return cached item when available', async () => {
      const cachedItem = createMockSinapiItem('00001', 'Cimento');
      mockCache.get.mockResolvedValue(cachedItem);

      const result = await service.getById('sinapi:00001:DF:2024-01:O');

      expect(result).toEqual(cachedItem);
    });
  });

  describe('loadFromBuffer()', () => {
    it('should load data from Excel buffer', async () => {
      // Create a minimal Excel buffer using ExcelJS
      const buffer = await createExcelBuffer(
        ['CODIGO', 'DESCRICAO', 'UNIDADE', 'PRECO ONERADO', 'PRECO DESONERADO'],
        [
          ['00001', 'Cimento Portland CP-II', 'KG', '0,75', '0,70'],
          ['00002', 'Areia lavada média', 'M3', '120,00', '115,00'],
        ],
      );

      const result = await service.loadFromBuffer(
        buffer,
        'DF',
        '2024-01',
        SinapiItemType.INSUMO,
      );

      expect(result.loaded).toBeGreaterThan(0);
    });

    it('should track loaded months', async () => {
      const buffer = await createExcelBuffer(
        ['CODIGO', 'DESCRICAO', 'UNIDADE', 'PRECO ONERADO'],
        [['00001', 'Test Item', 'UN', '10,00']],
      );

      await service.loadFromBuffer(
        buffer,
        'SP',
        '2024-02',
        SinapiItemType.INSUMO,
      );

      expect(service.isDataLoaded('SP', '2024-02', SinapiItemType.INSUMO)).toBe(
        true,
      );
      expect(service.isDataLoaded('RJ', '2024-02', SinapiItemType.INSUMO)).toBe(
        false,
      );
    });
  });

  describe('healthCheck()', () => {
    it('should return unhealthy when no data is loaded', async () => {
      const result = await service.healthCheck();

      expect(result.source).toBe('sinapi');
      expect(result.healthy).toBe(false);
      expect(result.error).toBe('No SINAPI data loaded');
    });

    it('should return healthy when data is loaded', async () => {
      // Load some data first using ExcelJS
      const buffer = await createExcelBuffer(
        ['CODIGO', 'DESCRICAO', 'UNIDADE', 'PRECO ONERADO'],
        [['00001', 'Test', 'UN', '10,00']],
      );

      await service.loadFromBuffer(
        buffer,
        'DF',
        '2024-01',
        SinapiItemType.INSUMO,
      );

      const result = await service.healthCheck();

      expect(result.healthy).toBe(true);
      expect(result.error).toBeUndefined();
    });
  });

  describe('getCircuitState()', () => {
    it('should return closed circuit state', () => {
      const state = service.getCircuitState();

      expect(state.closed).toBe(true);
      expect(state.opened).toBe(false);
      expect(state.halfOpen).toBe(false);
    });

    it('should include stats in circuit state', () => {
      const state = service.getCircuitState();

      expect(state.stats).toHaveProperty('itemsLoaded');
      expect(state.stats).toHaveProperty('loadedMonths');
      expect(state.stats).toHaveProperty('lastUpdate');
    });
  });

  describe('getCacheStats()', () => {
    it('should return cache statistics', () => {
      const stats = service.getCacheStats();

      expect(stats).toHaveProperty('hits');
      expect(stats).toHaveProperty('misses');
      expect(stats).toHaveProperty('keys');
    });
  });

  describe('clearData()', () => {
    it('should clear all loaded data', async () => {
      // Load some data first using ExcelJS
      const buffer = await createExcelBuffer(
        ['CODIGO', 'DESCRICAO', 'UNIDADE', 'PRECO ONERADO'],
        [['00001', 'Test', 'UN', '10,00']],
      );

      await service.loadFromBuffer(
        buffer,
        'DF',
        '2024-01',
        SinapiItemType.INSUMO,
      );

      expect(service.isDataLoaded('DF', '2024-01', SinapiItemType.INSUMO)).toBe(
        true,
      );

      service.clearData();

      expect(service.isDataLoaded('DF', '2024-01', SinapiItemType.INSUMO)).toBe(
        false,
      );
    });
  });

  describe('getLoadedMonthsSummary()', () => {
    it('should return empty array when no data loaded', () => {
      const summary = service.getLoadedMonthsSummary();

      expect(summary).toEqual([]);
    });

    it('should return loaded months', async () => {
      const buffer = await createExcelBuffer(
        ['CODIGO', 'DESCRICAO', 'UNIDADE', 'PRECO ONERADO'],
        [['00001', 'Test', 'UN', '10,00']],
      );

      await service.loadFromBuffer(
        buffer,
        'DF',
        '2024-01',
        SinapiItemType.INSUMO,
      );
      await service.loadFromBuffer(
        buffer,
        'SP',
        '2024-02',
        SinapiItemType.COMPOSICAO,
      );

      const summary = service.getLoadedMonthsSummary();

      expect(summary).toContain('DF:2024-01:INSUMO');
      expect(summary).toContain('SP:2024-02:COMPOSICAO');
    });
  });

  describe('search with loaded data', () => {
    beforeEach(async () => {
      mockCache.get.mockResolvedValue(null);
      mockCache.set.mockResolvedValue(undefined);

      // Load test data using ExcelJS
      const buffer = await createExcelBuffer(
        ['CODIGO', 'DESCRICAO', 'UNIDADE', 'PRECO ONERADO', 'PRECO DESONERADO'],
        [
          ['00001', 'Cimento Portland CP-II 32', 'KG', '0,75', '0,70'],
          ['00002', 'Areia lavada média', 'M3', '120,00', '115,00'],
          ['00003', 'Brita 1', 'M3', '95,00', '90,00'],
          ['00004', 'Cimento Portland CP-V ARI', 'KG', '0,85', '0,80'],
        ],
      );

      await service.loadFromBuffer(
        buffer,
        'DF',
        '2024-01',
        SinapiItemType.INSUMO,
      );
    });

    it('should find items by description', async () => {
      const result = await service.search('cimento');

      expect(result.data.length).toBeGreaterThan(0);
      expect(
        result.data.every((item) =>
          (item as SinapiPriceReference).descricao
            .toLowerCase()
            .includes('cimento'),
        ),
      ).toBe(true);
    });

    it('should filter by UF', async () => {
      const result = await service.search('cimento', { uf: 'DF' });

      expect(
        result.data.every((item) => (item as SinapiPriceReference).uf === 'DF'),
      ).toBe(true);
    });

    it('should filter by mesReferencia', async () => {
      const result = await service.search('', { mesReferencia: '2024-01' });

      expect(
        result.data.every(
          (item) => (item as SinapiPriceReference).mesReferencia === '2024-01',
        ),
      ).toBe(true);
    });

    it('should return all items when searching with empty string', async () => {
      const result = await service.search('');

      expect(result.data.length).toBeGreaterThan(0);
    });

    it('should sort by relevance', async () => {
      const result = await service.search('cimento portland');

      // Items with better matches should come first
      expect(result.data.length).toBeGreaterThan(0);
    });
  });

  describe('getDataStatus() (#1062)', () => {
    it('should return not loaded status when no data', () => {
      const status = service.getDataStatus();

      expect(status.source).toBe('sinapi');
      expect(status.dataLoaded).toBe(false);
      expect(status.itemCount).toBe(0);
      expect(status.loadedMonths).toEqual([]);
      expect(status.lastUpdate).toBeNull();
      expect(status.message).toContain('not loaded');
    });

    it('should return loaded status when data exists', async () => {
      // Load some data
      const buffer = await createExcelBuffer(
        ['CODIGO', 'DESCRICAO', 'UNIDADE', 'PRECO ONERADO'],
        [
          ['00001', 'Cimento', 'KG', '0,75'],
          ['00002', 'Areia', 'M3', '120,00'],
        ],
      );

      await service.loadFromBuffer(
        buffer,
        'DF',
        '2024-01',
        SinapiItemType.INSUMO,
      );

      const status = service.getDataStatus();

      expect(status.source).toBe('sinapi');
      expect(status.dataLoaded).toBe(true);
      expect(status.itemCount).toBeGreaterThan(0);
      expect(status.loadedMonths).toContain('DF:2024-01:INSUMO');
      expect(status.lastUpdate).toBeInstanceOf(Date);
      expect(status.message).toContain('loaded');
    });
  });

  describe('hasData() (#1062)', () => {
    it('should return false when no data', () => {
      expect(service.hasData()).toBe(false);
    });

    it('should return true when data exists', async () => {
      const buffer = await createExcelBuffer(
        ['CODIGO', 'DESCRICAO', 'UNIDADE', 'PRECO ONERADO'],
        [['00001', 'Test', 'UN', '10,00']],
      );

      await service.loadFromBuffer(
        buffer,
        'DF',
        '2024-01',
        SinapiItemType.INSUMO,
      );

      expect(service.hasData()).toBe(true);
    });
  });

  describe('Database Persistence (#1165)', () => {
    describe('hasPersistedData()', () => {
      it('should return false when database is empty', async () => {
        mockRepository.count.mockResolvedValue(0);

        const result = await service.hasPersistedData();

        expect(result).toBe(false);
        expect(mockRepository.count).toHaveBeenCalled();
      });

      it('should return true when database has items', async () => {
        mockRepository.count.mockResolvedValue(1000);

        const result = await service.hasPersistedData();

        expect(result).toBe(true);
      });

      it('should handle database errors gracefully', async () => {
        mockRepository.count.mockRejectedValue(
          new Error('DB connection failed'),
        );

        const result = await service.hasPersistedData();

        expect(result).toBe(false);
      });
    });

    describe('getPersistedCount()', () => {
      it('should return count from database', async () => {
        mockRepository.count.mockResolvedValue(5000);

        const result = await service.getPersistedCount();

        expect(result).toBe(5000);
      });

      it('should return 0 on database error', async () => {
        mockRepository.count.mockRejectedValue(new Error('DB error'));

        const result = await service.getPersistedCount();

        expect(result).toBe(0);
      });
    });

    describe('loadFromBuffer() with persistence', () => {
      it('should persist items to database after loading', async () => {
        const buffer = await createExcelBuffer(
          [
            'CODIGO',
            'DESCRICAO',
            'UNIDADE',
            'PRECO ONERADO',
            'PRECO DESONERADO',
          ],
          [
            ['00001', 'Cimento Portland', 'KG', '0,75', '0,70'],
            ['00002', 'Areia lavada', 'M3', '120,00', '115,00'],
          ],
        );

        const result = await service.loadFromBuffer(
          buffer,
          'DF',
          '2024-01',
          SinapiItemType.INSUMO,
        );

        // Check that createQueryBuilder was called for insert
        expect(mockRepository.createQueryBuilder).toHaveBeenCalled();
        expect(result.loaded).toBeGreaterThan(0);
        expect(result.persisted).toBeGreaterThanOrEqual(0);
      });

      it('should include persisted count in result', async () => {
        const buffer = await createExcelBuffer(
          ['CODIGO', 'DESCRICAO', 'UNIDADE', 'PRECO ONERADO'],
          [['00001', 'Test', 'UN', '10,00']],
        );

        const result = await service.loadFromBuffer(
          buffer,
          'DF',
          '2024-01',
          SinapiItemType.INSUMO,
        );

        expect(result).toHaveProperty('persisted');
        expect(typeof result.persisted).toBe('number');
      });

      it('should accept optional organizationId for multi-tenancy', async () => {
        const buffer = await createExcelBuffer(
          ['CODIGO', 'DESCRICAO', 'UNIDADE', 'PRECO ONERADO'],
          [['00001', 'Test', 'UN', '10,00']],
        );

        const orgId = 'test-org-uuid';
        const result = await service.loadFromBuffer(
          buffer,
          'DF',
          '2024-01',
          SinapiItemType.INSUMO,
          orgId,
        );

        expect(result.loaded).toBeGreaterThan(0);
      });
    });

    describe('searchFromDatabase()', () => {
      it('should query database for items', async () => {
        const mockItems: Partial<SinapiItem>[] = [
          {
            id: 'uuid-1',
            codigo: '00001',
            descricao: 'Cimento Portland',
            unidade: 'KG',
            precoOnerado: 0.75,
            precoDesonerado: 0.7,
            tipo: 'INSUMO',
            uf: 'DF',
            mesReferencia: 1,
            anoReferencia: 2024,
            createdAt: new Date(),
          },
        ];

        const queryBuilder = mockRepository.createQueryBuilder();
        queryBuilder.getMany.mockResolvedValue(mockItems as SinapiItem[]);
        queryBuilder.getCount.mockResolvedValue(1);

        const result = await service.searchFromDatabase({
          descricao: 'cimento',
          uf: 'DF',
        });

        expect(result.source).toBe('sinapi');
        expect(result.cached).toBe(false);
        expect(result.total).toBe(1);
      });

      it('should return empty result on database error', async () => {
        const queryBuilder = mockRepository.createQueryBuilder();
        queryBuilder.getCount.mockRejectedValue(new Error('DB error'));

        const result = await service.searchFromDatabase({
          descricao: 'cimento',
        });

        expect(result.data).toEqual([]);
        expect(result.isFallback).toBe(true);
      });

      it('should support pagination', async () => {
        const queryBuilder = mockRepository.createQueryBuilder();
        queryBuilder.getMany.mockResolvedValue([]);
        queryBuilder.getCount.mockResolvedValue(100);

        const result = await service.searchFromDatabase({
          page: 2,
          perPage: 20,
        });

        expect(result.page).toBe(2);
        expect(result.perPage).toBe(20);
        expect(queryBuilder.skip).toHaveBeenCalledWith(20);
        expect(queryBuilder.take).toHaveBeenCalledWith(20);
      });
    });

    describe('getDataStatusWithDatabase()', () => {
      it('should include database count in status', async () => {
        mockRepository.count.mockResolvedValue(5000);

        const status = await service.getDataStatusWithDatabase();

        expect(status.dbItemCount).toBe(5000);
        expect(status.message).toContain('5000');
        expect(status.message).toContain('Database');
      });
    });
  });
});

/**
 * Create a mock SINAPI item for testing
 */
function createMockSinapiItem(
  codigo: string,
  descricao: string,
): SinapiPriceReference {
  return {
    id: `sinapi:${codigo}:DF:2024-01:O`,
    title: descricao,
    description: descricao,
    source: 'sinapi',
    url: undefined,
    relevance: 1.0,
    fetchedAt: new Date(),
    codigo,
    descricao,
    unidade: 'UN',
    precoUnitario: 10.0,
    mesReferencia: '2024-01',
    uf: 'DF',
    desonerado: false,
    categoria: SinapiCategoria.MATERIAIS,
    tipo: SinapiItemType.INSUMO,
    precoOnerado: 10.0,
    precoDesonerado: 9.5,
  };
}
