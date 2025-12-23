/**
 * Semantic Cache Service for LLM Responses
 *
 * Redis-based caching with:
 * - Configurable TTL per cache type (OpenAI, Exa)
 * - SHA-256 key hashing with normalization
 * - Graceful fallback when Redis unavailable
 * - Cache statistics for monitoring
 *
 * @module modules/cache/semantic-cache
 * @see Issue #811 - Implementar cache Redis para respostas LLM similares
 */

import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { createHash } from 'crypto';

/**
 * Cache type identifiers for LLM services
 */
export type LLMCacheType = 'openai' | 'exa';

/**
 * Configuration for each cache type
 */
interface CacheTypeConfig {
  prefix: string;
  ttlSeconds: number;
  enabled: boolean;
}

/**
 * Cache statistics per type
 */
interface CacheStats {
  hits: number;
  misses: number;
  sets: number;
  errors: number;
}

/**
 * Default configurations per LLM cache type
 */
const DEFAULT_CACHE_CONFIGS: Record<LLMCacheType, CacheTypeConfig> = {
  openai: {
    prefix: 'llm:openai',
    ttlSeconds: 86400, // 24 hours
    enabled: true,
  },
  exa: {
    prefix: 'llm:exa',
    ttlSeconds: 604800, // 7 days
    enabled: true,
  },
};

/**
 * SemanticCacheService - Redis-based cache for LLM responses
 *
 * Features:
 * - Persistent cache across application restarts
 * - Shared cache across multiple instances
 * - Per-service TTL configuration
 * - Automatic key normalization and hashing
 * - Graceful degradation on Redis failures
 *
 * @example
 * ```typescript
 * // Inject in service
 * constructor(private cache: SemanticCacheService) {}
 *
 * // Get cached response
 * const cached = await this.cache.get<LLMResponse>('openai', cacheKey);
 *
 * // Set cache with automatic TTL
 * await this.cache.set('openai', cacheKey, response);
 * ```
 */
@Injectable()
export class SemanticCacheService implements OnModuleDestroy {
  private readonly logger = new Logger(SemanticCacheService.name);
  private redis: Redis | null = null;
  private readonly configs: Map<LLMCacheType, CacheTypeConfig> = new Map();
  private readonly stats: Map<LLMCacheType, CacheStats> = new Map();
  private isConnected = false;

  constructor(private readonly configService: ConfigService) {
    this.initializeConfigs();
    this.initializeRedis();
  }

  /**
   * Initialize cache configurations for each LLM type
   */
  private initializeConfigs(): void {
    const types: LLMCacheType[] = ['openai', 'exa'];

    types.forEach((type) => {
      // Allow override via environment variables
      const envPrefix = `LLM_CACHE_${type.toUpperCase()}`;
      const ttl = this.configService.get<number>(
        `${envPrefix}_TTL`,
        DEFAULT_CACHE_CONFIGS[type].ttlSeconds,
      );
      const enabled = this.configService.get<boolean>(
        `${envPrefix}_ENABLED`,
        DEFAULT_CACHE_CONFIGS[type].enabled,
      );

      this.configs.set(type, {
        prefix: DEFAULT_CACHE_CONFIGS[type].prefix,
        ttlSeconds: ttl,
        enabled,
      });

      // Initialize stats
      this.stats.set(type, {
        hits: 0,
        misses: 0,
        sets: 0,
        errors: 0,
      });
    });

    this.logger.log('Semantic cache configurations initialized');
  }

  /**
   * Initialize Redis connection using existing redis config
   */
  private initializeRedis(): void {
    const redisConfig = this.configService.get('redis');

    if (!redisConfig) {
      this.logger.warn(
        'Redis configuration not found, semantic cache will be disabled',
      );
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
              'Failed to connect to Redis after 3 attempts, semantic cache disabled',
            );
            return null;
          }
          return Math.min(times * 1000, 3000);
        },
      });

      this.redis.on('connect', () => {
        this.isConnected = true;
        this.logger.log('Semantic cache Redis connected');
      });

      this.redis.on('error', (error) => {
        this.isConnected = false;
        this.logger.error(`Semantic cache Redis error: ${error.message}`);
      });

      this.redis.on('close', () => {
        this.isConnected = false;
        this.logger.warn('Semantic cache Redis connection closed');
      });

      // Connect asynchronously
      this.redis.connect().catch((error) => {
        this.logger.error(
          `Failed to connect semantic cache to Redis: ${error.message}`,
        );
      });
    } catch (error) {
      this.logger.error(
        `Failed to initialize semantic cache Redis: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Get value from cache
   *
   * @param type LLM cache type (openai or exa)
   * @param key Raw cache key (will be normalized and hashed)
   * @returns Cached value or null if not found
   */
  async get<T>(type: LLMCacheType, key: string): Promise<T | null> {
    const config = this.configs.get(type);
    const stats = this.stats.get(type)!;

    if (!config?.enabled || !this.redis || !this.isConnected) {
      stats.misses++;
      return null;
    }

    const fullKey = this.buildKey(type, key);

    try {
      const cached = await this.redis.get(fullKey);

      if (cached) {
        stats.hits++;
        this.logger.debug(
          `Semantic cache HIT [${type}]: ${key.substring(0, 32)}...`,
        );
        return JSON.parse(cached) as T;
      }

      stats.misses++;
      this.logger.debug(
        `Semantic cache MISS [${type}]: ${key.substring(0, 32)}...`,
      );
      return null;
    } catch (error) {
      stats.errors++;
      this.logger.error(
        `Semantic cache get error [${type}]: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      return null;
    }
  }

  /**
   * Set value in cache
   *
   * @param type LLM cache type
   * @param key Raw cache key
   * @param value Value to cache
   * @param ttlOverride Optional TTL override in seconds
   */
  async set<T>(
    type: LLMCacheType,
    key: string,
    value: T,
    ttlOverride?: number,
  ): Promise<void> {
    const config = this.configs.get(type);
    const stats = this.stats.get(type)!;

    if (!config?.enabled || !this.redis || !this.isConnected) {
      return;
    }

    const fullKey = this.buildKey(type, key);
    const ttl = ttlOverride || config.ttlSeconds;

    try {
      const serialized = JSON.stringify(value);
      await this.redis.setex(fullKey, ttl, serialized);
      stats.sets++;
      this.logger.debug(
        `Semantic cache SET [${type}]: ${key.substring(0, 32)}... (TTL: ${ttl}s)`,
      );
    } catch (error) {
      stats.errors++;
      this.logger.error(
        `Semantic cache set error [${type}]: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Check if key exists in cache
   *
   * @param type LLM cache type
   * @param key Raw cache key
   * @returns true if key exists
   */
  async has(type: LLMCacheType, key: string): Promise<boolean> {
    if (!this.redis || !this.isConnected) {
      return false;
    }

    const fullKey = this.buildKey(type, key);

    try {
      const exists = await this.redis.exists(fullKey);
      return exists === 1;
    } catch {
      return false;
    }
  }

  /**
   * Delete value from cache
   *
   * @param type LLM cache type
   * @param key Raw cache key
   */
  async delete(type: LLMCacheType, key: string): Promise<void> {
    if (!this.redis || !this.isConnected) {
      return;
    }

    const fullKey = this.buildKey(type, key);

    try {
      await this.redis.del(fullKey);
      this.logger.debug(
        `Semantic cache DELETE [${type}]: ${key.substring(0, 32)}...`,
      );
    } catch (error) {
      this.logger.error(
        `Semantic cache delete error [${type}]: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Build full cache key with prefix and hashing
   *
   * Key is normalized (lowercase, trimmed, collapsed spaces) and hashed with SHA-256
   *
   * @param type LLM cache type
   * @param key Raw key
   * @returns Full cache key
   */
  private buildKey(type: LLMCacheType, key: string): string {
    const config = this.configs.get(type)!;

    // Normalize: trim, lowercase, collapse multiple spaces, normalize unicode
    const normalized = key
      .trim()
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .normalize('NFKC');

    // Hash for consistent key length and avoiding special characters
    const hash = createHash('sha256').update(normalized).digest('hex');

    return `${config.prefix}:${hash}`;
  }

  /**
   * Generate a deterministic cache key from LLM request parameters
   *
   * @param systemPrompt System prompt
   * @param userPrompt User prompt
   * @param model Model name
   * @param temperature Temperature setting
   * @returns Normalized key string for caching
   */
  generateOpenAIKey(
    systemPrompt: string,
    userPrompt: string,
    model: string,
    temperature: number,
  ): string {
    return `${systemPrompt}|${userPrompt}|${model}|${temperature}`;
  }

  /**
   * Generate a cache key for Exa search
   *
   * @param query Search query
   * @param searchType Search type (auto, neural, keyword)
   * @param numResults Number of results
   * @returns Normalized key string for caching
   */
  generateExaKey(
    query: string,
    searchType: string,
    numResults: number,
  ): string {
    return `${searchType}:${numResults}:${query}`;
  }

  /**
   * Get cache statistics for a specific type
   *
   * @param type LLM cache type
   * @returns Cache statistics with hit rate
   */
  getStats(type: LLMCacheType): CacheStats & { hitRate: number } {
    const stats = this.stats.get(type)!;
    const total = stats.hits + stats.misses;
    const hitRate = total > 0 ? stats.hits / total : 0;

    return {
      ...stats,
      hitRate,
    };
  }

  /**
   * Get aggregated statistics for all cache types
   */
  getAllStats(): Record<LLMCacheType, CacheStats & { hitRate: number }> {
    const result = {} as Record<LLMCacheType, CacheStats & { hitRate: number }>;

    this.stats.forEach((_, type) => {
      result[type] = this.getStats(type);
    });

    return result;
  }

  /**
   * Check if cache is connected and available
   */
  isAvailable(): boolean {
    return this.redis !== null && this.isConnected;
  }

  /**
   * Get cache configuration for a type
   */
  getConfig(type: LLMCacheType): CacheTypeConfig | undefined {
    return this.configs.get(type);
  }

  /**
   * Get number of cached keys for a type
   */
  async getKeyCount(type: LLMCacheType): Promise<number> {
    const config = this.configs.get(type);

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
   * Invalidate all cache entries for a specific type
   */
  async invalidateType(type: LLMCacheType): Promise<number> {
    const config = this.configs.get(type);

    if (!config || !this.redis || !this.isConnected) {
      return 0;
    }

    try {
      const pattern = `${config.prefix}:*`;
      const keys = await this.redis.keys(pattern);

      if (keys.length > 0) {
        await this.redis.del(...keys);
        this.logger.log(`Invalidated ${keys.length} cache entries for ${type}`);
      }

      return keys.length;
    } catch (error) {
      this.logger.error(
        `Cache invalidation error for ${type}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      return 0;
    }
  }

  /**
   * Health check for semantic cache
   *
   * @returns Promise with connection status and latency
   */
  async healthCheck(): Promise<{
    status: 'healthy' | 'unhealthy';
    latencyMs: number;
    connected: boolean;
  }> {
    if (!this.redis || !this.isConnected) {
      return {
        status: 'unhealthy',
        latencyMs: 0,
        connected: false,
      };
    }

    const start = Date.now();

    try {
      await this.redis.ping();
      const latencyMs = Date.now() - start;

      return {
        status: 'healthy',
        latencyMs,
        connected: true,
      };
    } catch {
      return {
        status: 'unhealthy',
        latencyMs: Date.now() - start,
        connected: false,
      };
    }
  }

  /**
   * Cleanup on module destroy
   */
  async onModuleDestroy(): Promise<void> {
    if (this.redis) {
      await this.redis.quit();
      this.logger.log('Semantic cache Redis disconnected');
    }
  }
}
