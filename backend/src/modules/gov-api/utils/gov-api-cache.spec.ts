import { ConfigService } from '@nestjs/config';
import { GovApiCache } from './gov-api-cache';
import { GovApiSource } from '../interfaces/gov-api.interface';

// Mock ioredis
jest.mock('ioredis', () => {
 return jest.fn().mockImplementation(() => ({
 get: jest.fn(),
 setex: jest.fn(),
 del: jest.fn(),
 keys: jest.fn().mockResolvedValue([]),
 quit: jest.fn().mockResolvedValue('OK'),
 connect: jest.fn().mockResolvedValue(undefined),
 on: jest.fn(),
 }));
});

import Redis from 'ioredis';
const MockedRedis = Redis as jest.MockedClass<typeof Redis>;

describe('GovApiCache', () => {
 let cache: GovApiCache;
 let configService: ConfigService;
 let mockRedisInstance: jest.Mocked<Redis>;

 beforeEach(() => {
 jest.clearAllMocks();

 // Setup mock Redis instance
 mockRedisInstance = {
 get: jest.fn(),
 setex: jest.fn(),
 del: jest.fn(),
 keys: jest.fn().mockResolvedValue([]),
 quit: jest.fn().mockResolvedValue('OK'),
 connect: jest.fn().mockResolvedValue(undefined),
 on: jest.fn(),
 } as unknown as jest.Mocked<Redis>;

 MockedRedis.mockImplementation(() => mockRedisInstance);

 // Setup config service with Redis config
 configService = {
 get: jest
 .fn()
 .mockImplementation((key: string, defaultValue?: unknown) => {
 if (key === 'redis') {
 return {
 host: 'localhost',
 port: 6379,
 password: undefined,
 db: 0,
 };
 }
 return defaultValue;
 }),
 } as unknown as ConfigService;

 // Create cache instance
 cache = new GovApiCache(configService);

 // Simulate successful connection
 const connectCallback = (mockRedisInstance.on as jest.Mock).mock.calls.find(
 ([event]) => event === 'connect',
 )?.[1];
 if (connectCallback) {
 connectCallback();
 }
 });

 afterEach(async () => {
 await cache.onModuleDestroy();
 });

 describe('constructor', () => {
 it('should initialize with default configurations for all sources', () => {
 const sources: GovApiSource[] = ['pncp', 'comprasgov', 'sinapi', 'sicro'];

 sources.forEach((source) => {
 const config = cache.getConfig(source);
 expect(config).toBeDefined();
 expect(config?.prefix).toContain('gov:');
 expect(config?.ttlSeconds).toBeGreaterThan(0);
 expect(config?.enabled).toBe(true);
 });
 });

 it('should setup Redis connection handlers', () => {
 expect(mockRedisInstance.on).toHaveBeenCalledWith(
 'connect',
 expect.any(Function),
 );
 expect(mockRedisInstance.on).toHaveBeenCalledWith(
 'error',
 expect.any(Function),
 );
 expect(mockRedisInstance.on).toHaveBeenCalledWith(
 'close',
 expect.any(Function),
 );
 });

 it('should handle missing Redis configuration gracefully', () => {
 const noRedisConfigService = {
 get: jest.fn().mockReturnValue(undefined),
 } as unknown as ConfigService;

 const cacheWithoutRedis = new GovApiCache(noRedisConfigService);

 expect(cacheWithoutRedis.isAvailable()).toBe(false);
 });
 });

 describe('get()', () => {
 it('should return cached value on hit', async () => {
 const testData = { items: [{ id: '1', name: 'Test' }] };
 mockRedisInstance.get.mockResolvedValue(JSON.stringify(testData));

 const result = await cache.get<typeof testData>('pncp', 'test-key');

 expect(result).toEqual(testData);
 });

 it('should return null on cache miss', async () => {
 mockRedisInstance.get.mockResolvedValue(null);

 const result = await cache.get('pncp', 'nonexistent-key');

 expect(result).toBeNull();
 });

 it('should return null when cache is not available', async () => {
 // Simulate connection closed
 const closeCallback = (mockRedisInstance.on as jest.Mock).mock.calls.find(
 ([event]) => event === 'close',
 )?.[1];
 if (closeCallback) {
 closeCallback();
 }

 const result = await cache.get('pncp', 'test-key');

 expect(result).toBeNull();
 });

 it('should return null on Redis error', async () => {
 mockRedisInstance.get.mockRejectedValue(new Error('Redis error'));

 const result = await cache.get('pncp', 'test-key');

 expect(result).toBeNull();
 });

 it('should track cache hits and misses', async () => {
 // First call - miss
 mockRedisInstance.get.mockResolvedValue(null);
 await cache.get('pncp', 'test-key');

 // Second call - hit
 mockRedisInstance.get.mockResolvedValue(JSON.stringify({ data: 'test' }));
 await cache.get('pncp', 'test-key');

 const stats = cache.getStats('pncp');
 expect(stats.misses).toBe(1);
 expect(stats.hits).toBe(1);
 });
 });

 describe('set()', () => {
 it('should set value in cache with default TTL', async () => {
 const testData = { items: [{ id: '1' }] };

 await cache.set('pncp', 'test-key', testData);

 expect(mockRedisInstance.setex).toHaveBeenCalledWith(
 expect.stringContaining('gov:pncp:'),
 3600, // Default PNCP TTL
 JSON.stringify(testData),
 );
 });

 it('should use custom TTL when provided', async () => {
 const testData = { data: 'test' };
 const customTtl = 7200;

 await cache.set('pncp', 'test-key', testData, customTtl);

 expect(mockRedisInstance.setex).toHaveBeenCalledWith(
 expect.any(String),
 customTtl,
 expect.any(String),
 );
 });

 it('should use longer TTL for price reference sources', async () => {
 const testData = { price: 100 };

 await cache.set('sinapi', 'price-key', testData);

 expect(mockRedisInstance.setex).toHaveBeenCalledWith(
 expect.stringContaining('gov:sinapi:'),
 604800, // 7 days for SINAPI
 expect.any(String),
 );
 });

 it('should track set operations', async () => {
 await cache.set('pncp', 'key1', { data: 1 });
 await cache.set('pncp', 'key2', { data: 2 });

 const stats = cache.getStats('pncp');
 expect(stats.sets).toBe(2);
 });

 it('should not set when cache is disabled', async () => {
 // Create cache with disabled config
 const disabledConfigService = {
 get: jest
 .fn()
 .mockImplementation((key: string, defaultValue?: unknown) => {
 if (key === 'redis') {
 return { host: 'localhost', port: 6379, db: 0 };
 }
 if (key === 'GOV_API_CACHE_PNCP_ENABLED') {
 return false;
 }
 return defaultValue;
 }),
 } as unknown as ConfigService;

 const disabledCache = new GovApiCache(disabledConfigService);
 await disabledCache.set('pncp', 'test-key', { data: 'test' });

 expect(mockRedisInstance.setex).not.toHaveBeenCalled();
 });
 });

 describe('delete()', () => {
 it('should delete value from cache', async () => {
 await cache.delete('pncp', 'test-key');

 expect(mockRedisInstance.del).toHaveBeenCalledWith(
 expect.stringContaining('gov:pncp:'),
 );
 });

 it('should track delete operations', async () => {
 await cache.delete('pncp', 'key1');
 await cache.delete('pncp', 'key2');

 const stats = cache.getStats('pncp');
 expect(stats.deletes).toBe(2);
 });

 it('should handle Redis errors gracefully', async () => {
 mockRedisInstance.del.mockRejectedValue(new Error('Redis error'));

 // Should not throw
 await expect(cache.delete('pncp', 'test-key')).resolves.toBeUndefined();
 });
 });

 describe('invalidateSource()', () => {
 it('should delete all keys for a source', async () => {
 mockRedisInstance.keys.mockResolvedValue([
 'gov:pncp:key1',
 'gov:pncp:key2',
 'gov:pncp:key3',
 ]);

 await cache.invalidateSource('pncp');

 expect(mockRedisInstance.keys).toHaveBeenCalledWith('gov:pncp:*');
 expect(mockRedisInstance.del).toHaveBeenCalledWith(
 'gov:pncp:key1',
 'gov:pncp:key2',
 'gov:pncp:key3',
 );
 });

 it('should do nothing if no keys found', async () => {
 mockRedisInstance.keys.mockResolvedValue([]);

 await cache.invalidateSource('pncp');

 expect(mockRedisInstance.del).not.toHaveBeenCalled();
 });
 });

 describe('getStats()', () => {
 it('should return stats with hit rate', async () => {
 // Generate some cache activity
 mockRedisInstance.get.mockResolvedValue(null);
 await cache.get('pncp', 'miss1');
 await cache.get('pncp', 'miss2');

 mockRedisInstance.get.mockResolvedValue(JSON.stringify({ data: 'test' }));
 await cache.get('pncp', 'hit1');

 const stats = cache.getStats('pncp');

 expect(stats.hits).toBe(1);
 expect(stats.misses).toBe(2);
 expect(stats.hitRate).toBeCloseTo(1 / 3);
 });

 it('should return zero hit rate with no requests', () => {
 const stats = cache.getStats('pncp');

 expect(stats.hitRate).toBe(0);
 });
 });

 describe('getAllStats()', () => {
 it('should return stats for all sources', () => {
 const allStats = cache.getAllStats();

 expect(allStats).toHaveProperty('pncp');
 expect(allStats).toHaveProperty('comprasgov');
 expect(allStats).toHaveProperty('sinapi');
 expect(allStats).toHaveProperty('sicro');
 });
 });

 describe('getConfig()', () => {
 it('should return config for valid source', () => {
 const config = cache.getConfig('pncp');

 expect(config).toEqual({
 prefix: 'gov:pncp',
 ttlSeconds: 3600,
 enabled: true,
 });
 });

 it('should return config with different TTL for price sources', () => {
 const sinapiConfig = cache.getConfig('sinapi');
 const sicroConfig = cache.getConfig('sicro');

 expect(sinapiConfig?.ttlSeconds).toBe(604800); // 7 days
 expect(sicroConfig?.ttlSeconds).toBe(604800); // 7 days
 });
 });

 describe('isAvailable()', () => {
 it('should return true when Redis is connected', () => {
 expect(cache.isAvailable()).toBe(true);
 });

 it('should return false when Redis is disconnected', () => {
 // Simulate connection closed
 const closeCallback = (mockRedisInstance.on as jest.Mock).mock.calls.find(
 ([event]) => event === 'close',
 )?.[1];
 if (closeCallback) {
 closeCallback();
 }

 expect(cache.isAvailable()).toBe(false);
 });
 });

 describe('getKeyCount()', () => {
 it('should return number of cached keys for source', async () => {
 mockRedisInstance.keys.mockResolvedValue([
 'gov:pncp:key1',
 'gov:pncp:key2',
 'gov:pncp:key3',
 ]);

 const count = await cache.getKeyCount('pncp');

 expect(count).toBe(3);
 });

 it('should return 0 when no keys exist', async () => {
 mockRedisInstance.keys.mockResolvedValue([]);

 const count = await cache.getKeyCount('pncp');

 expect(count).toBe(0);
 });

 it('should return 0 on error', async () => {
 mockRedisInstance.keys.mockRejectedValue(new Error('Redis error'));

 const count = await cache.getKeyCount('pncp');

 expect(count).toBe(0);
 });
 });

 describe('onModuleDestroy()', () => {
 it('should disconnect Redis on module destroy', async () => {
 await cache.onModuleDestroy();

 expect(mockRedisInstance.quit).toHaveBeenCalled();
 });
 });

 describe('key hashing', () => {
 it('should generate consistent hashes for same key', async () => {
 mockRedisInstance.get.mockResolvedValue(null);

 await cache.get('pncp', 'test query');
 await cache.get('pncp', 'test query');

 // Both calls should use the same key
 const calls = mockRedisInstance.get.mock.calls;
 expect(calls[0][0]).toBe(calls[1][0]);
 });

 it('should normalize keys before hashing', async () => {
 mockRedisInstance.get.mockResolvedValue(null);

 await cache.get('pncp', ' test query ');
 await cache.get('pncp', 'test query');

 // Normalized keys should be the same
 const calls = mockRedisInstance.get.mock.calls;
 expect(calls[0][0]).toBe(calls[1][0]);
 });

 it('should be case-insensitive', async () => {
 mockRedisInstance.get.mockResolvedValue(null);

 await cache.get('pncp', 'TEST QUERY');
 await cache.get('pncp', 'test query');

 // Case-insensitive keys should be the same
 const calls = mockRedisInstance.get.mock.calls;
 expect(calls[0][0]).toBe(calls[1][0]);
 });
 });
});
