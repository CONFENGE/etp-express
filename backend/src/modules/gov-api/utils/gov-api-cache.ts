/**
 * Government API Redis Cache Strategy
 *
 * Provides Redis-based caching with:
 * - Configurable TTL per API source
 * - Cache key namespacing
 * - Compression for large payloads
 * - Cache statistics tracking
 *
 * @module modules/gov-api/utils/gov-api-cache
 */

import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { createHash } from 'crypto';
import {
 GovApiSource,
 GovApiCacheConfig,
} from '../interfaces/gov-api.interface';

/**
 * Default cache configurations per API source
 */
const DEFAULT_CACHE_CONFIGS: Record<GovApiSource, GovApiCacheConfig> = {
 pncp: {
 prefix: 'gov:pncp',
 ttlSeconds: 3600, // 1 hour - contracts update frequently
 enabled: true,
 },
 comprasgov: {
 prefix: 'gov:comprasgov',
 ttlSeconds: 3600, // 1 hour
 enabled: true,
 },
 sinapi: {
 prefix: 'gov:sinapi',
 ttlSeconds: 604800, // 7 days - prices update monthly
 enabled: true,
 },
 sicro: {
 prefix: 'gov:sicro',
 ttlSeconds: 604800, // 7 days - prices update monthly
 enabled: true,
 },
};

/**
 * Cache statistics
 */
interface CacheStats {
 hits: number;
 misses: number;
 sets: number;
 deletes: number;
 errors: number;
}

/**
 * GovApiCache - Redis-based cache for government API responses
 *
 * Features:
 * - Per-source TTL configuration
 * - Automatic key generation with SHA-256 hashing
 * - Cache statistics for monitoring
 * - Graceful degradation on Redis failures
 *
 * @example
 * ```typescript
 * const cache = new GovApiCache(configService);
 *
 * // Set cache
 * await cache.set('pncp', 'query:software', data);
 *
 * // Get from cache
 * const cached = await cache.get<SearchResult[]>('pncp', 'query:software');
 * ```
 */
@Injectable()
export class GovApiCache implements OnModuleDestroy {
 private readonly logger = new Logger(GovApiCache.name);
 private redis: Redis | null = null;
 private readonly configs: Map<GovApiSource, GovApiCacheConfig> = new Map();
 private readonly stats: Map<GovApiSource, CacheStats> = new Map();
 private isConnected = false;

 constructor(private readonly configService: ConfigService) {
 // Initialize cache configurations
 this.initializeConfigs();

 // Initialize Redis connection
 this.initializeRedis();
 }

 /**
 * Initialize cache configurations for each API source
 */
 private initializeConfigs(): void {
 const sources: GovApiSource[] = ['pncp', 'comprasgov', 'sinapi', 'sicro'];

 sources.forEach((source) => {
 // Allow override via environment variables
 const envPrefix = `GOV_API_CACHE_${source.toUpperCase()}`;
 const ttl = this.configService.get<number>(
 `${envPrefix}_TTL`,
 DEFAULT_CACHE_CONFIGS[source].ttlSeconds,
 );
 const enabled = this.configService.get<boolean>(
 `${envPrefix}_ENABLED`,
 DEFAULT_CACHE_CONFIGS[source].enabled,
 );

 this.configs.set(source, {
 prefix: DEFAULT_CACHE_CONFIGS[source].prefix,
 ttlSeconds: ttl,
 enabled,
 });

 // Initialize stats for each source
 this.stats.set(source, {
 hits: 0,
 misses: 0,
 sets: 0,
 deletes: 0,
 errors: 0,
 });
 });
 }

 /**
 * Initialize Redis connection
 */
 private initializeRedis(): void {
 const redisConfig = this.configService.get('redis');

 if (!redisConfig) {
 this.logger.warn('Redis configuration not found, cache will be disabled');
 return;
 }

 try {
 this.redis = new Redis({
 host: redisConfig.host,
 port: redisConfig.port,
 password: redisConfig.password,
 db: redisConfig.db || 0,
 lazyConnect: true,
 retryStrategy: (times) => {
 if (times > 3) {
 this.logger.error(
 'Failed to connect to Redis after 3 attempts, cache disabled',
 );
 return null;
 }
 return Math.min(times * 1000, 3000);
 },
 });

 this.redis!.on('connect', () => {
 this.isConnected = true;
 this.logger.log('Redis cache connected');
 });

 this.redis!.on('error', (error) => {
 this.isConnected = false;
 this.logger.error(`Redis error: ${error.message}`);
 });

 this.redis!.on('close', () => {
 this.isConnected = false;
 this.logger.warn('Redis connection closed');
 });

 // Connect asynchronously
 this.redis!.connect().catch((error) => {
 this.logger.error(`Failed to connect to Redis: ${error.message}`);
 });
 } catch (error) {
 this.logger.error(
 `Failed to initialize Redis: ${error instanceof Error ? error.message : 'Unknown error'}`,
 );
 }
 }

 /**
 * Get value from cache
 *
 * @param source API source
 * @param key Cache key (will be hashed and prefixed)
 * @returns Cached value or null if not found
 */
 async get<T>(source: GovApiSource, key: string): Promise<T | null> {
 const config = this.configs.get(source);
 const stats = this.stats.get(source)!;

 if (!config?.enabled || !this.redis || !this.isConnected) {
 stats.misses++;
 return null;
 }

 const fullKey = this.buildKey(source, key);

 try {
 const cached = await this.redis.get(fullKey);

 if (cached) {
 stats.hits++;
 this.logger.debug(`Cache HIT: ${source}:${key.substring(0, 50)}...`);
 return JSON.parse(cached) as T;
 }

 stats.misses++;
 this.logger.debug(`Cache MISS: ${source}:${key.substring(0, 50)}...`);
 return null;
 } catch (error) {
 stats.errors++;
 this.logger.error(
 `Cache get error for ${source}: ${error instanceof Error ? error.message : 'Unknown error'}`,
 );
 return null;
 }
 }

 /**
 * Set value in cache
 *
 * @param source API source
 * @param key Cache key (will be hashed and prefixed)
 * @param value Value to cache
 * @param ttlOverride Optional TTL override in seconds
 */
 async set<T>(
 source: GovApiSource,
 key: string,
 value: T,
 ttlOverride?: number,
 ): Promise<void> {
 const config = this.configs.get(source);
 const stats = this.stats.get(source)!;

 if (!config?.enabled || !this.redis || !this.isConnected) {
 return;
 }

 const fullKey = this.buildKey(source, key);
 const ttl = ttlOverride || config.ttlSeconds;

 try {
 const serialized = JSON.stringify(value);
 await this.redis.setex(fullKey, ttl, serialized);
 stats.sets++;
 this.logger.debug(
 `Cache SET: ${source}:${key.substring(0, 50)}... (TTL: ${ttl}s)`,
 );
 } catch (error) {
 stats.errors++;
 this.logger.error(
 `Cache set error for ${source}: ${error instanceof Error ? error.message : 'Unknown error'}`,
 );
 }
 }

 /**
 * Delete value from cache
 *
 * @param source API source
 * @param key Cache key
 */
 async delete(source: GovApiSource, key: string): Promise<void> {
 const stats = this.stats.get(source)!;

 if (!this.redis || !this.isConnected) {
 return;
 }

 const fullKey = this.buildKey(source, key);

 try {
 await this.redis.del(fullKey);
 stats.deletes++;
 this.logger.debug(`Cache DELETE: ${source}:${key.substring(0, 50)}...`);
 } catch (error) {
 stats.errors++;
 this.logger.error(
 `Cache delete error for ${source}: ${error instanceof Error ? error.message : 'Unknown error'}`,
 );
 }
 }

 /**
 * Invalidate all cache entries for a specific source
 *
 * @param source API source
 */
 async invalidateSource(source: GovApiSource): Promise<void> {
 const config = this.configs.get(source);

 if (!config || !this.redis || !this.isConnected) {
 return;
 }

 try {
 const pattern = `${config.prefix}:*`;
 const keys = await this.redis.keys(pattern);

 if (keys.length > 0) {
 await this.redis.del(...keys);
 this.logger.log(
 `Invalidated ${keys.length} cache entries for ${source}`,
 );
 }
 } catch (error) {
 this.logger.error(
 `Cache invalidation error for ${source}: ${error instanceof Error ? error.message : 'Unknown error'}`,
 );
 }
 }

 /**
 * Build full cache key with prefix and hashing
 *
 * @param source API source
 * @param key Raw key
 * @returns Full cache key
 */
 private buildKey(source: GovApiSource, key: string): string {
 const config = this.configs.get(source)!;

 // Normalize and hash the key
 const normalized = key.trim().toLowerCase().replace(/\s+/g, ' ');
 const hash = createHash('sha256').update(normalized).digest('hex');

 return `${config.prefix}:${hash}`;
 }

 /**
 * Get cache statistics for a specific source
 *
 * @param source API source
 * @returns Cache statistics
 */
 getStats(source: GovApiSource): CacheStats & { hitRate: number } {
 const stats = this.stats.get(source)!;
 const total = stats.hits + stats.misses;
 const hitRate = total > 0 ? stats.hits / total : 0;

 return {
 ...stats,
 hitRate,
 };
 }

 /**
 * Get aggregated cache statistics for all sources
 */
 getAllStats(): Record<GovApiSource, CacheStats & { hitRate: number }> {
 const result = {} as Record<GovApiSource, CacheStats & { hitRate: number }>;

 this.stats.forEach((stats, source) => {
 result[source] = this.getStats(source);
 });

 return result;
 }

 /**
 * Get cache configuration for a source
 *
 * @param source API source
 * @returns Cache configuration
 */
 getConfig(source: GovApiSource): GovApiCacheConfig | undefined {
 return this.configs.get(source);
 }

 /**
 * Check if cache is connected and available
 */
 isAvailable(): boolean {
 return this.redis !== null && this.isConnected;
 }

 /**
 * Get number of cached keys for a source
 *
 * @param source API source
 * @returns Number of keys
 */
 async getKeyCount(source: GovApiSource): Promise<number> {
 const config = this.configs.get(source);

 if (!config || !this.redis || !this.isConnected) {
 return 0;
 }

 try {
 const pattern = `${config.prefix}:*`;
 const keys = await this.redis.keys(pattern);
 return keys.length;
 } catch {
 return 0;
 }
 }

 /**
 * Cleanup on module destroy
 */
 async onModuleDestroy(): Promise<void> {
 if (this.redis) {
 await this.redis.quit();
 this.logger.log('Redis cache disconnected');
 }
 }
}
