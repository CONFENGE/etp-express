/**
 * Government API Redis Cache Strategy
 *
 * Provides Redis-based caching with:
 * - Configurable TTL per API source
 * - Cache key namespacing
 * - Compression for large payloads
 * - Cache statistics tracking
 * - In-memory fallback when Redis is unavailable
 *
 * @module modules/gov-api/utils/gov-api-cache
 */

import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { createHash } from 'crypto';
import NodeCache from 'node-cache';
import * as Sentry from '@sentry/nestjs';
import {
  GovApiSource,
  GovApiCacheConfig,
} from '../interfaces/gov-api.interface';

/**
 * Memory cache configuration for fallback mode
 */
const MEMORY_CACHE_CONFIG = {
  maxKeys: 500, // Maximum number of keys to store
  stdTTL: 30 * 60, // 30 minutes TTL
  checkperiod: 60, // Check for expired keys every 60 seconds
};

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
  fallbackHits: number;
}

/**
 * GovApiCache - Redis-based cache for government API responses
 *
 * Features:
 * - Per-source TTL configuration
 * - Automatic key generation with SHA-256 hashing
 * - Cache statistics for monitoring
 * - Graceful degradation on Redis failures
 * - In-memory fallback when Redis is unavailable
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

  /**
   * In-memory fallback cache when Redis is unavailable
   */
  private readonly memoryCache: NodeCache;

  /**
   * Flag to prevent repeated Sentry alerts during fallback mode
   */
  private fallbackAlertSent = false;

  constructor(private readonly configService: ConfigService) {
    // Initialize memory cache for fallback
    this.memoryCache = new NodeCache({
      maxKeys: MEMORY_CACHE_CONFIG.maxKeys,
      stdTTL: MEMORY_CACHE_CONFIG.stdTTL,
      checkperiod: MEMORY_CACHE_CONFIG.checkperiod,
      useClones: false, // For performance, don't clone on get
    });

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
        fallbackHits: 0,
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
        this.fallbackAlertSent = false; // Reset alert flag on reconnection
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
   * Get value from in-memory fallback cache
   *
   * @param source API source
   * @param key Cache key
   * @returns Cached value or null if not found
   */
  private getFromMemoryFallback<T>(
    source: GovApiSource,
    key: string,
  ): T | null {
    const fullKey = this.buildKey(source, key);
    const stats = this.stats.get(source)!;

    try {
      const value = this.memoryCache.get<T>(fullKey);

      if (value !== undefined) {
        stats.fallbackHits++;

        // Send Sentry alert on first fallback hit (only once per Redis downtime)
        if (!this.fallbackAlertSent) {
          this.fallbackAlertSent = true;
          Sentry.captureMessage(
            `GovApiCache fallback mode active: Redis unavailable, using in-memory cache for ${source}`,
            'warning',
          );
          this.logger.warn(
            `Fallback mode active: Using in-memory cache for ${source}`,
          );
        }

        this.logger.debug(
          `Memory fallback HIT: ${source}:${key.substring(0, 50)}...`,
        );
        return value;
      }

      return null;
    } catch (error) {
      this.logger.error(
        `Memory fallback get error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      return null;
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

    if (!config?.enabled) {
      stats.misses++;
      return null;
    }

    // Try Redis first if available
    if (this.redis && this.isConnected) {
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
        // Fall through to memory fallback
      }
    }

    // Redis unavailable or error - try memory fallback
    const memoryResult = this.getFromMemoryFallback<T>(source, key);
    if (memoryResult !== null) {
      return memoryResult;
    }

    stats.misses++;
    return null;
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

    if (!config?.enabled) {
      return;
    }

    const fullKey = this.buildKey(source, key);
    const ttl = ttlOverride || config.ttlSeconds;
    const serialized = JSON.stringify(value);

    // Always persist to memory cache as backup
    try {
      this.memoryCache.set(fullKey, value, ttl);
    } catch (error) {
      this.logger.error(
        `Memory cache set error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }

    // Try to persist to Redis if available
    if (this.redis && this.isConnected) {
      try {
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
    } else {
      // Only memory cache available
      stats.sets++;
      this.logger.debug(
        `Memory Cache SET: ${source}:${key.substring(0, 50)}... (TTL: ${ttl}s)`,
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
    const fullKey = this.buildKey(source, key);

    // Delete from memory cache
    try {
      this.memoryCache.del(fullKey);
    } catch (error) {
      this.logger.error(
        `Memory cache delete error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }

    // Delete from Redis if available
    if (this.redis && this.isConnected) {
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
    } else {
      stats.deletes++;
    }
  }

  /**
   * Invalidate all cache entries for a specific source
   *
   * @param source API source
   */
  async invalidateSource(source: GovApiSource): Promise<void> {
    const config = this.configs.get(source);

    if (!config) {
      return;
    }

    // Clear matching keys from memory cache
    const memoryKeys = this.memoryCache.keys();
    const sourcePrefix = `${config.prefix}:`;
    const keysToDelete = memoryKeys.filter((k) => k.startsWith(sourcePrefix));
    if (keysToDelete.length > 0) {
      this.memoryCache.del(keysToDelete);
      this.logger.log(
        `Invalidated ${keysToDelete.length} memory cache entries for ${source}`,
      );
    }

    // Clear from Redis if available
    if (this.redis && this.isConnected) {
      try {
        const pattern = `${config.prefix}:*`;
        const keys = await this.redis.keys(pattern);

        if (keys.length > 0) {
          await this.redis.del(...keys);
          this.logger.log(
            `Invalidated ${keys.length} Redis cache entries for ${source}`,
          );
        }
      } catch (error) {
        this.logger.error(
          `Cache invalidation error for ${source}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        );
      }
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
   * Check if cache is operating in fallback mode (Redis unavailable)
   */
  isInFallbackMode(): boolean {
    return !this.isConnected && this.redis !== null;
  }

  /**
   * Get memory cache statistics
   */
  getMemoryCacheStats(): { keys: number; hits: number; misses: number } {
    const stats = this.memoryCache.getStats();
    return {
      keys: this.memoryCache.keys().length,
      hits: stats.hits,
      misses: stats.misses,
    };
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
    // Clean up memory cache
    this.memoryCache.flushAll();
    this.memoryCache.close();

    // Clean up Redis
    if (this.redis) {
      await this.redis.quit();
      this.logger.log('Redis cache disconnected');
    }
  }
}
