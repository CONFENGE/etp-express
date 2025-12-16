/**
 * SINAPI Service
 *
 * Service for SINAPI (Sistema Nacional de Pesquisa de Custos e Índices da
 * Construção Civil) data ingestion and search.
 *
 * SINAPI is the Brazilian national reference system for construction costs,
 * published monthly by CAIXA and mandatory for federal public works
 * (Decreto 7.983/2013).
 *
 * Unlike other gov APIs, SINAPI data is provided via Excel spreadsheets
 * that need to be downloaded and parsed.
 *
 * @module modules/gov-api/sinapi
 * @see https://github.com/CONFENGE/etp-express/issues/693
 */

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  IGovApiService,
  GovApiResponse,
  GovApiSearchResult,
  GovApiFilterOptions,
  GovApiHealthStatus,
  GovApiPriceReference,
  PriceSearchFilters,
} from '../interfaces/gov-api.interface';
import { GovApiCache } from '../utils/gov-api-cache';
import {
  SinapiSearchFilters,
  SinapiPriceReference,
  SinapiUF,
  SinapiItemType,
  buildSinapiCacheKey,
  formatMesReferencia,
} from './sinapi.types';
import { SinapiParser, createSinapiParser } from './sinapi-parser';

/**
 * In-memory storage for parsed SINAPI data
 * In production, this should be replaced with database storage
 */
interface SinapiDataStore {
  items: Map<string, SinapiPriceReference>;
  lastUpdate: Date | null;
  loadedMonths: Set<string>;
}

/**
 * Cache TTL in seconds (24 hours for SINAPI since data is monthly)
 */
const CACHE_TTL_SECONDS = 86400;

/**
 * Default results per page
 */
const DEFAULT_PAGE_SIZE = 50;

/**
 * SinapiService - SINAPI data ingestion and search service
 *
 * @example
 * ```typescript
 * const service = new SinapiService(configService, cache);
 *
 * // Search for construction materials
 * const results = await service.search('cimento', {
 *   uf: 'DF',
 *   mesReferencia: '2024-01',
 * });
 *
 * // Get specific item by code
 * const item = await service.getById('sinapi:00001:DF:2024-01:O');
 * ```
 */
@Injectable()
export class SinapiService implements IGovApiService, OnModuleInit {
  private readonly logger = new Logger(SinapiService.name);
  private parser!: SinapiParser;
  private dataStore: SinapiDataStore = {
    items: new Map(),
    lastUpdate: null,
    loadedMonths: new Set(),
  };
  private cacheStats = { hits: 0, misses: 0, keys: 0 };

  /**
   * API source identifier
   */
  readonly source = 'sinapi' as const;

  constructor(
    private readonly configService: ConfigService,
    private readonly cache: GovApiCache,
  ) {}

  /**
   * Initialize parser on module init
   */
  onModuleInit(): void {
    this.parser = createSinapiParser();
    this.logger.log('SinapiService initialized');
  }

  /**
   * Search for SINAPI items matching the query
   *
   * @param query Search query for description field
   * @param filters Optional filters for UF, month, type, etc.
   * @returns Paginated search results
   */
  async search(
    query: string,
    filters?: GovApiFilterOptions | PriceSearchFilters,
  ): Promise<GovApiResponse<GovApiSearchResult[]>> {
    const startTime = Date.now();

    // Build SINAPI-specific filters
    const sinapiFilters = this.buildSinapiFilters(query, filters);
    const cacheKey = buildSinapiCacheKey(sinapiFilters);

    // Try cache first
    const cached = await this.cache.get<GovApiResponse<SinapiPriceReference[]>>(
      'sinapi',
      cacheKey,
    );

    if (cached) {
      this.cacheStats.hits++;
      this.logger.debug(`Cache hit for search: "${query.substring(0, 50)}..."`);
      return {
        ...cached,
        cached: true,
      };
    }

    this.cacheStats.misses++;

    try {
      // Search in data store
      const results = this.searchDataStore(sinapiFilters);

      // Apply pagination
      const page = sinapiFilters.page || 1;
      const perPage = sinapiFilters.perPage || DEFAULT_PAGE_SIZE;
      const start = (page - 1) * perPage;
      const paginatedResults = results.slice(start, start + perPage);

      const response: GovApiResponse<SinapiPriceReference[]> = {
        data: paginatedResults,
        total: results.length,
        page,
        perPage,
        source: 'sinapi',
        cached: false,
        isFallback: false,
        timestamp: new Date(),
      };

      // Cache the result
      await this.cache.set('sinapi', cacheKey, response, CACHE_TTL_SECONDS);

      const duration = Date.now() - startTime;
      this.logger.log(
        `Search for "${query.substring(0, 30)}..." returned ${paginatedResults.length}/${results.length} results in ${duration}ms`,
      );

      return response;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error(
        `Search failed for "${query.substring(0, 30)}..." after ${duration}ms: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
      );

      return this.createFallbackResponse();
    }
  }

  /**
   * Get a specific SINAPI item by ID
   *
   * @param id Item identifier (format: sinapi:codigo:uf:mesRef:D|O)
   * @returns Single item or null if not found
   */
  async getById(id: string): Promise<GovApiSearchResult | null> {
    const cacheKey = `item:${id}`;

    // Try cache first
    const cached = await this.cache.get<SinapiPriceReference>(
      'sinapi',
      cacheKey,
    );

    if (cached) {
      this.cacheStats.hits++;
      return cached;
    }

    this.cacheStats.misses++;

    // Look up in data store
    const item = this.dataStore.items.get(id);

    if (item) {
      // Cache the result
      await this.cache.set('sinapi', cacheKey, item, CACHE_TTL_SECONDS);
      return item;
    }

    return null;
  }

  /**
   * Load SINAPI data from Excel buffer
   *
   * @param buffer Excel file buffer
   * @param uf State (UF)
   * @param mesReferencia Reference month (YYYY-MM)
   * @param tipo Item type (insumo or composicao)
   */
  async loadFromBuffer(
    buffer: Buffer,
    uf: SinapiUF,
    mesReferencia: string,
    tipo: SinapiItemType,
  ): Promise<{ loaded: number; errors: number }> {
    const startTime = Date.now();

    try {
      const result = await this.parser.parseFromBuffer(buffer, {
        uf,
        mesReferencia,
        tipo,
      });

      // Store items in data store
      for (const item of result.items) {
        this.dataStore.items.set(item.id, item);
      }

      // Track loaded month
      const monthKey = `${uf}:${mesReferencia}:${tipo}`;
      this.dataStore.loadedMonths.add(monthKey);
      this.dataStore.lastUpdate = new Date();

      const duration = Date.now() - startTime;
      this.logger.log(
        `Loaded ${result.count} SINAPI items for ${uf}/${mesReferencia}/${tipo} in ${duration}ms (${result.errors.length} errors)`,
      );

      return {
        loaded: result.count,
        errors: result.errors.length,
      };
    } catch (error) {
      this.logger.error(
        `Failed to load SINAPI data: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw error;
    }
  }

  /**
   * Check if data is loaded for a specific month/UF/type
   */
  isDataLoaded(
    uf: SinapiUF,
    mesReferencia: string,
    tipo: SinapiItemType,
  ): boolean {
    const monthKey = `${uf}:${mesReferencia}:${tipo}`;
    return this.dataStore.loadedMonths.has(monthKey);
  }

  /**
   * Get loaded months summary
   */
  getLoadedMonthsSummary(): string[] {
    return Array.from(this.dataStore.loadedMonths);
  }

  /**
   * Check API health (for SINAPI, checks data store status)
   */
  async healthCheck(): Promise<GovApiHealthStatus> {
    const startTime = Date.now();

    const hasData = this.dataStore.items.size > 0;
    const latency = Date.now() - startTime;

    return {
      source: 'sinapi',
      healthy: hasData,
      latencyMs: latency,
      lastCheck: new Date(),
      error: hasData ? undefined : 'No SINAPI data loaded',
      circuitState: 'closed', // SINAPI doesn't use circuit breaker
    };
  }

  /**
   * Get current circuit breaker state (SINAPI doesn't use circuit breaker)
   */
  getCircuitState(): {
    opened: boolean;
    halfOpen: boolean;
    closed: boolean;
    stats: Record<string, unknown>;
  } {
    return {
      opened: false,
      halfOpen: false,
      closed: true,
      stats: {
        itemsLoaded: this.dataStore.items.size,
        loadedMonths: this.dataStore.loadedMonths.size,
        lastUpdate: this.dataStore.lastUpdate,
      },
    };
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { hits: number; misses: number; keys: number } {
    return {
      ...this.cacheStats,
      keys: this.dataStore.items.size,
    };
  }

  /**
   * Clear all loaded data
   */
  clearData(): void {
    this.dataStore.items.clear();
    this.dataStore.loadedMonths.clear();
    this.dataStore.lastUpdate = null;
    this.logger.log('SINAPI data store cleared');
  }

  /**
   * Build SINAPI-specific filters from generic filters
   */
  private buildSinapiFilters(
    query: string,
    filters?: GovApiFilterOptions | PriceSearchFilters,
  ): SinapiSearchFilters {
    const sinapiFilters: SinapiSearchFilters = {
      descricao: query,
    };

    if (!filters) {
      return sinapiFilters;
    }

    // Map generic filters
    if (filters.uf) {
      sinapiFilters.uf = filters.uf as SinapiUF;
    }

    if (filters.page) {
      sinapiFilters.page = filters.page;
    }

    if (filters.perPage) {
      sinapiFilters.perPage = filters.perPage;
    }

    // Map PriceSearchFilters specific fields
    const priceFilters = filters as PriceSearchFilters;

    if (priceFilters.mesReferencia) {
      sinapiFilters.mesReferencia = priceFilters.mesReferencia;
    }

    if (priceFilters.codigo) {
      sinapiFilters.codigo = priceFilters.codigo;
    }

    if (priceFilters.desonerado !== undefined) {
      sinapiFilters.desonerado = priceFilters.desonerado;
    }

    return sinapiFilters;
  }

  /**
   * Search the data store with filters
   */
  private searchDataStore(
    filters: SinapiSearchFilters,
  ): SinapiPriceReference[] {
    const results: SinapiPriceReference[] = [];
    const searchTerms = (filters.descricao || '')
      .toLowerCase()
      .split(/\s+/)
      .filter(Boolean);

    for (const item of this.dataStore.items.values()) {
      // Filter by UF
      if (filters.uf && item.uf !== filters.uf) {
        continue;
      }

      // Filter by reference month
      if (
        filters.mesReferencia &&
        item.mesReferencia !== filters.mesReferencia
      ) {
        continue;
      }

      // Filter by item type
      if (filters.tipo && item.tipo !== filters.tipo) {
        continue;
      }

      // Filter by desonerado
      if (
        filters.desonerado !== undefined &&
        item.desonerado !== filters.desonerado
      ) {
        continue;
      }

      // Filter by codigo
      if (filters.codigo && !item.codigo.includes(filters.codigo)) {
        continue;
      }

      // Filter by price range
      if (
        filters.precoMinimo !== undefined &&
        item.precoUnitario < filters.precoMinimo
      ) {
        continue;
      }

      if (
        filters.precoMaximo !== undefined &&
        item.precoUnitario > filters.precoMaximo
      ) {
        continue;
      }

      // Text search in description
      if (searchTerms.length > 0) {
        const descLower = item.descricao.toLowerCase();
        const matches = searchTerms.every((term) => descLower.includes(term));
        if (!matches) {
          continue;
        }

        // Calculate relevance based on match quality
        const exactMatch = descLower === filters.descricao?.toLowerCase();
        const startsWithMatch = descLower.startsWith(searchTerms[0] || '');
        item.relevance = exactMatch ? 1.0 : startsWithMatch ? 0.9 : 0.7;
      }

      results.push(item);
    }

    // Sort by relevance and then by codigo
    results.sort((a, b) => {
      if (a.relevance !== b.relevance) {
        return b.relevance - a.relevance;
      }
      return a.codigo.localeCompare(b.codigo);
    });

    return results;
  }

  /**
   * Create a fallback response
   */
  private createFallbackResponse(): GovApiResponse<SinapiPriceReference[]> {
    return {
      data: [],
      total: 0,
      page: 1,
      perPage: DEFAULT_PAGE_SIZE,
      source: 'sinapi',
      cached: false,
      isFallback: true,
      timestamp: new Date(),
    };
  }
}
