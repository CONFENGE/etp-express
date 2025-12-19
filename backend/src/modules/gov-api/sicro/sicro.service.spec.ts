/**
 * SICRO Service Tests
 *
 * Unit tests for SicroService
 *
 * @module modules/gov-api/sicro
 */

import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import * as ExcelJS from 'exceljs';
import { SicroService } from './sicro.service';
import { GovApiCache } from '../utils/gov-api-cache';
import {
 SicroPriceReference,
 SicroItemType,
 SicroCategoria,
 SicroModoTransporte,
} from './sicro.types';

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

describe('SicroService', () => {
 let service: SicroService;
 let cache: jest.Mocked<GovApiCache>;
 let configService: jest.Mocked<ConfigService>;

 const mockSicroItem: SicroPriceReference = {
 id: 'sicro:TER001:DF:2024-01:O',
 title: 'Escavacao mecanica de vala em material de 1a categoria',
 description: 'Escavacao mecanica de vala em material de 1a categoria - m3',
 source: 'sicro',
 url: 'https://www.gov.br/dnit/pt-br/assuntos/planejamento-e-pesquisa/custos-e-pagamentos/sicro/df',
 relevance: 1.0,
 fetchedAt: new Date(),
 codigo: 'TER001',
 descricao: 'Escavacao mecanica de vala em material de 1a categoria',
 unidade: 'm3',
 precoUnitario: 12.5,
 mesReferencia: '2024-01',
 uf: 'DF',
 desonerado: false,
 categoria: SicroCategoria.TERRAPLANAGEM,
 tipo: SicroItemType.COMPOSICAO,
 precoOnerado: 12.5,
 precoDesonerado: 10.2,
 modoTransporte: SicroModoTransporte.RODOVIARIO,
 custoMaoDeObra: 3.0,
 custoMaterial: 2.0,
 custoEquipamento: 5.5,
 custoTransporte: 2.0,
 };

 const mockSicroInsumo: SicroPriceReference = {
 id: 'sicro:INS001:DF:2024-01:O',
 title: 'Cimento Portland CP-32',
 description: 'Cimento Portland CP-32 - kg',
 source: 'sicro',
 url: 'https://www.gov.br/dnit/pt-br/assuntos/planejamento-e-pesquisa/custos-e-pagamentos/sicro/df',
 relevance: 1.0,
 fetchedAt: new Date(),
 codigo: 'INS001',
 descricao: 'Cimento Portland CP-32',
 unidade: 'kg',
 precoUnitario: 0.85,
 mesReferencia: '2024-01',
 uf: 'DF',
 desonerado: false,
 categoria: 'MATERIAIS',
 tipo: SicroItemType.INSUMO,
 precoOnerado: 0.85,
 precoDesonerado: 0.72,
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
 prefix: 'gov:sicro',
 ttlSeconds: 86400,
 enabled: true,
 }),
 isAvailable: jest.fn().mockReturnValue(true),
 getKeyCount: jest.fn().mockResolvedValue(100),
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
 SicroService,
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

 service = module.get<SicroService>(SicroService);
 service.onModuleInit();
 });

 afterEach(() => {
 jest.clearAllMocks();
 service.clearData();
 });

 describe('initialization', () => {
 it('should be defined', () => {
 expect(service).toBeDefined();
 });

 it('should have source set to sicro', () => {
 expect(service.source).toBe('sicro');
 });

 it('should initialize with empty data store', () => {
 expect(service.getItemsCount()).toBe(0);
 expect(service.getLoadedMonths()).toHaveLength(0);
 });
 });

 describe('search', () => {
 beforeEach(() => {
 // Add mock data to service's data store
 (service as any).dataStore.items.set(mockSicroItem.id, mockSicroItem);
 (service as any).dataStore.items.set(mockSicroInsumo.id, mockSicroInsumo);
 });

 it('should return cached results when available', async () => {
 const cachedResult = {
 data: [mockSicroItem],
 total: 1,
 page: 1,
 perPage: 50,
 source: 'sicro' as const,
 cached: false,
 isFallback: false,
 timestamp: new Date(),
 };

 cache.get.mockResolvedValueOnce(cachedResult);

 const result = await service.search('escavacao');

 expect(result.cached).toBe(true);
 expect(cache.get).toHaveBeenCalled();
 });

 it('should search data store when cache miss', async () => {
 cache.get.mockResolvedValueOnce(null);

 const result = await service.search('escavacao');

 expect(result.data).toHaveLength(1);
 expect((result.data[0] as SicroPriceReference).codigo).toBe('TER001');
 expect(result.cached).toBe(false);
 expect(cache.set).toHaveBeenCalled();
 });

 it('should filter by UF', async () => {
 const result = await service.search('', { uf: 'DF' });

 expect(result.data.length).toBeGreaterThan(0);
 result.data.forEach((item) => {
 expect((item as SicroPriceReference).uf).toBe('DF');
 });
 });

 it('should filter by codigo', async () => {
 const result = await service.search('', {
 codigo: 'TER001',
 } as any);

 expect(result.data).toHaveLength(1);
 expect((result.data[0] as SicroPriceReference).codigo).toBe('TER001');
 });

 it('should apply pagination', async () => {
 const result = await service.search('', { page: 1, perPage: 1 });

 expect(result.data).toHaveLength(1);
 expect(result.page).toBe(1);
 expect(result.perPage).toBe(1);
 expect(result.total).toBe(2);
 });

 it('should return empty result for no match', async () => {
 const result = await service.search('nonexistent');

 expect(result.data).toHaveLength(0);
 expect(result.total).toBe(0);
 });
 });

 describe('searchWithFilters', () => {
 beforeEach(() => {
 (service as any).dataStore.items.set(mockSicroItem.id, mockSicroItem);
 (service as any).dataStore.items.set(mockSicroInsumo.id, mockSicroInsumo);
 });

 it('should filter by tipo', async () => {
 const result = await service.searchWithFilters({
 tipo: SicroItemType.COMPOSICAO,
 });

 expect(result.data.length).toBeGreaterThan(0);
 result.data.forEach((item) => {
 expect(item.tipo).toBe(SicroItemType.COMPOSICAO);
 });
 });

 it('should filter by categoria', async () => {
 const result = await service.searchWithFilters({
 categoria: SicroCategoria.TERRAPLANAGEM,
 });

 expect(result.data).toHaveLength(1);
 expect(result.data[0].categoria).toBe(SicroCategoria.TERRAPLANAGEM);
 });

 it('should filter by modoTransporte', async () => {
 const result = await service.searchWithFilters({
 modoTransporte: SicroModoTransporte.RODOVIARIO,
 });

 expect(result.data.length).toBeGreaterThan(0);
 result.data.forEach((item) => {
 expect(item.modoTransporte).toBe(SicroModoTransporte.RODOVIARIO);
 });
 });

 it('should filter by price range', async () => {
 const result = await service.searchWithFilters({
 precoMinimo: 10,
 precoMaximo: 15,
 });

 expect(result.data).toHaveLength(1);
 expect(result.data[0].precoUnitario).toBeGreaterThanOrEqual(10);
 expect(result.data[0].precoUnitario).toBeLessThanOrEqual(15);
 });

 it('should filter by desonerado', async () => {
 const result = await service.searchWithFilters({
 desonerado: false,
 });

 result.data.forEach((item) => {
 expect(item.desonerado).toBe(false);
 });
 });

 it('should combine multiple filters', async () => {
 const result = await service.searchWithFilters({
 uf: 'DF',
 tipo: SicroItemType.COMPOSICAO,
 mesReferencia: '2024-01',
 });

 expect(result.data).toHaveLength(1);
 expect(result.data[0].codigo).toBe('TER001');
 });
 });

 describe('getById', () => {
 beforeEach(() => {
 (service as any).dataStore.items.set(mockSicroItem.id, mockSicroItem);
 });

 it('should return cached result when available', async () => {
 cache.get.mockResolvedValueOnce(mockSicroItem);

 const result = await service.getById('sicro:TER001:DF:2024-01:O');

 expect(result).toEqual(mockSicroItem);
 expect(cache.get).toHaveBeenCalled();
 });

 it('should return item from data store when cache miss', async () => {
 cache.get.mockResolvedValueOnce(null);

 const result = await service.getById('sicro:TER001:DF:2024-01:O');

 expect(result).toEqual(mockSicroItem);
 expect(cache.set).toHaveBeenCalled();
 });

 it('should return null for non-existent id', async () => {
 cache.get.mockResolvedValueOnce(null);

 const result = await service.getById('sicro:NONEXISTENT:DF:2024-01:O');

 expect(result).toBeNull();
 });
 });

 describe('healthCheck', () => {
 it('should return unhealthy when no data loaded', async () => {
 const result = await service.healthCheck();

 expect(result.source).toBe('sicro');
 expect(result.healthy).toBe(false);
 expect(result.error).toBe('No SICRO data loaded');
 expect(result.circuitState).toBe('closed');
 });

 it('should return healthy when data is loaded', async () => {
 (service as any).dataStore.items.set(mockSicroItem.id, mockSicroItem);

 const result = await service.healthCheck();

 expect(result.source).toBe('sicro');
 expect(result.healthy).toBe(true);
 expect(result.error).toBeUndefined();
 expect(result.latencyMs).toBeGreaterThanOrEqual(0);
 });
 });

 describe('getCircuitState', () => {
 it('should return circuit breaker state', () => {
 (service as any).dataStore.items.set(mockSicroItem.id, mockSicroItem);
 (service as any).dataStore.loadedMonths.add(
 'DF:2024-01:COMPOSICAO:RODOVIARIO',
 );
 (service as any).dataStore.lastUpdate = new Date();

 const state = service.getCircuitState();

 expect(state.closed).toBe(true);
 expect(state.opened).toBe(false);
 expect(state.halfOpen).toBe(false);
 expect(state.stats.itemsLoaded).toBe(1);
 expect(state.stats.loadedMonths).toBe(1);
 expect(state.stats.lastUpdate).toBeDefined();
 });
 });

 describe('getCacheStats', () => {
 it('should return cache statistics', () => {
 (service as any).cacheStats = { hits: 5, misses: 3, keys: 10 };
 (service as any).dataStore.items.set(mockSicroItem.id, mockSicroItem);

 const stats = service.getCacheStats();

 expect(stats.hits).toBe(5);
 expect(stats.misses).toBe(3);
 expect(stats.keys).toBe(1);
 });
 });

 describe('getLoadedMonths', () => {
 it('should return list of loaded months', () => {
 (service as any).dataStore.loadedMonths.add(
 'DF:2024-01:COMPOSICAO:RODOVIARIO',
 );
 (service as any).dataStore.loadedMonths.add('SP:2024-01:INSUMO:ALL');

 const months = service.getLoadedMonths();

 expect(months).toHaveLength(2);
 expect(months).toContain('DF:2024-01:COMPOSICAO:RODOVIARIO');
 expect(months).toContain('SP:2024-01:INSUMO:ALL');
 });
 });

 describe('getItemsCount', () => {
 it('should return total items count', () => {
 expect(service.getItemsCount()).toBe(0);

 (service as any).dataStore.items.set(mockSicroItem.id, mockSicroItem);
 (service as any).dataStore.items.set(mockSicroInsumo.id, mockSicroInsumo);

 expect(service.getItemsCount()).toBe(2);
 });
 });

 describe('clearData', () => {
 it('should clear all data', () => {
 (service as any).dataStore.items.set(mockSicroItem.id, mockSicroItem);
 (service as any).dataStore.loadedMonths.add(
 'DF:2024-01:COMPOSICAO:RODOVIARIO',
 );
 (service as any).dataStore.lastUpdate = new Date();

 service.clearData();

 expect(service.getItemsCount()).toBe(0);
 expect(service.getLoadedMonths()).toHaveLength(0);
 expect((service as any).dataStore.lastUpdate).toBeNull();
 });
 });

 describe('loadFromBuffer', () => {
 it('should load data from valid Excel buffer', async () => {
 // Create a simple mock Excel buffer using ExcelJS
 const headers = [
 'CODIGO',
 'DESCRICAO',
 'UNIDADE',
 'PRECO ONERADO',
 'PRECO DESONERADO',
 ];
 const data = [['TER001', 'Escavacao mecanica', 'm3', '12.50', '10.20']];
 const buffer = await createExcelBuffer(headers, data);

 const result = await service.loadFromBuffer(
 buffer,
 'DF',
 '2024-01',
 SicroItemType.COMPOSICAO,
 SicroModoTransporte.RODOVIARIO,
 );

 expect(result.loaded).toBeGreaterThan(0);
 expect(result.errors).toBe(0);
 expect(service.getItemsCount()).toBeGreaterThan(0);
 });

 it('should track loaded months after loading', async () => {
 // Create a simple mock Excel buffer using ExcelJS
 const headers = ['CODIGO', 'DESCRICAO', 'UNIDADE'];
 const data = [['TEST', 'Test', 'un']];
 const buffer = await createExcelBuffer(headers, data);

 await service.loadFromBuffer(
 buffer,
 'SP',
 '2024-02',
 SicroItemType.INSUMO,
 );

 const loadedMonths = service.getLoadedMonths();
 expect(loadedMonths).toContain('SP:2024-02:INSUMO:ALL');
 });

 it('should return errors count for invalid data', async () => {
 const invalidBuffer = Buffer.from('not a valid excel file');

 const result = await service.loadFromBuffer(
 invalidBuffer,
 'DF',
 '2024-01',
 SicroItemType.COMPOSICAO,
 );

 expect(result.loaded).toBe(0);
 expect(result.errors).toBe(1);
 });
 });

 describe('search result sorting', () => {
 beforeEach(() => {
 const items: SicroPriceReference[] = [
 {
 ...mockSicroItem,
 id: 'sicro:ZZZ001:DF:2024-01:O',
 codigo: 'ZZZ001',
 descricao: 'Zebra service',
 },
 {
 ...mockSicroItem,
 id: 'sicro:AAA001:DF:2024-01:O',
 codigo: 'AAA001',
 descricao: 'Alpha service',
 },
 {
 ...mockSicroItem,
 id: 'sicro:TER001:DF:2024-01:O',
 codigo: 'TER001',
 descricao: 'Terraplanagem service',
 },
 ];

 items.forEach((item) => {
 (service as any).dataStore.items.set(item.id, item);
 });
 });

 it('should sort by codigo when no query', async () => {
 const result = await service.search('');

 expect((result.data[0] as SicroPriceReference).codigo).toBe('AAA001');
 expect((result.data[1] as SicroPriceReference).codigo).toBe('TER001');
 expect((result.data[2] as SicroPriceReference).codigo).toBe('ZZZ001');
 });

 it('should prioritize items starting with query', async () => {
 const result = await service.search('terra');

 expect((result.data[0] as SicroPriceReference).codigo).toBe('TER001');
 });
 });
});

describe('SicroService Types', () => {
 describe('buildSicroId', () => {
 it('should build correct ID format', async () => {
 const { buildSicroId } = await import('./sicro.types');

 const id = buildSicroId('TER001', 'DF', '2024-01', false);
 expect(id).toBe('sicro:TER001:DF:2024-01:O');

 const idDes = buildSicroId('TER001', 'DF', '2024-01', true);
 expect(idDes).toBe('sicro:TER001:DF:2024-01:D');
 });
 });

 describe('buildSicroCacheKey', () => {
 it('should build cache key from filters', async () => {
 const { buildSicroCacheKey } = await import('./sicro.types');

 const key = buildSicroCacheKey({
 descricao: 'Test',
 uf: 'DF',
 mesReferencia: '2024-01',
 });

 expect(key).toContain('search');
 expect(key).toContain('desc:test');
 expect(key).toContain('uf:DF');
 expect(key).toContain('mes:2024-01');
 });
 });

 describe('formatMesReferencia', () => {
 it('should handle YYYY-MM format', async () => {
 const { formatMesReferencia } = await import('./sicro.types');

 expect(formatMesReferencia('2024-01')).toBe('2024-01');
 });

 it('should handle YYYYMM format', async () => {
 const { formatMesReferencia } = await import('./sicro.types');

 expect(formatMesReferencia('202401')).toBe('2024-01');
 });

 it('should handle MM/YYYY format', async () => {
 const { formatMesReferencia } = await import('./sicro.types');

 expect(formatMesReferencia('01/2024')).toBe('2024-01');
 });
 });
});
