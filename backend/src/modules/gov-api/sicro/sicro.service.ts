/**
 * SICRO Service
 *
 * Service for SICRO (Sistema de Custos Referenciais de Obras) data ingestion and search.
 *
 * SICRO is the Brazilian national reference system for transportation infrastructure
 * costs, published by DNIT and mandatory for works bid by DNIT (Decree 7.983/2013).
 *
 * Unlike other gov APIs, SICRO data is provided via Excel spreadsheets
 * that need to be downloaded and parsed.
 *
 * @module modules/gov-api/sicro
 * @see https://github.com/CONFENGE/etp-express/issues/694
 */

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  IGovApiService,
  GovApiResponse,
  GovApiSearchResult,
  GovApiFilterOptions,
  GovApiHealthStatus,
  PriceSearchFilters,
} from '../interfaces/gov-api.interface';
import { GovApiCache } from '../utils/gov-api-cache';
import {
  SicroSearchFilters,
  SicroPriceReference,
  SicroUF,
  SicroItemType,
  SicroModoTransporte,
  buildSicroCacheKey,
  formatMesReferencia,
} from './sicro.types';
import { SicroParser, createSicroParser } from './sicro-parser';

/**
 * In-memory storage for parsed SICRO data
 * In production, this should be replaced with database storage
 */
interface SicroDataStore {
  items: Map<string, SicroPriceReference>;
  lastUpdate: Date | null;
  loadedMonths: Set<string>;
}

/**
 * Cache TTL in seconds (24 hours for SICRO since data is monthly)
 */
const CACHE_TTL_SECONDS = 86400;

/**
 * Default results per page
 */
const DEFAULT_PAGE_SIZE = 50;

/**
 * SicroService - SICRO data ingestion and search service
 *
 * @example
 * ```typescript
 * const service = new SicroService(configService, cache);
 *
 * // Search for road construction services
 * const results = await service.search('terraplanagem', {
 *   uf: 'DF',
 *   mesReferencia: '2024-01',
 * });
 *
 * // Get specific item by code
 * const item = await service.getById('sicro:00001:DF:2024-01:O');
 * ```
 */
@Injectable()
export class SicroService implements IGovApiService, OnModuleInit {
  private readonly logger = new Logger(SicroService.name);
  private parser!: SicroParser;
  private dataStore: SicroDataStore = {
    items: new Map(),
    lastUpdate: null,
    loadedMonths: new Set(),
  };
  private cacheStats = { hits: 0, misses: 0, keys: 0 };

  /**
   * API source identifier
   */
  readonly source = 'sicro' as const;

  constructor(
    private readonly configService: ConfigService,
    private readonly cache: GovApiCache,
  ) {}

  /**
   * Initialize parser on module init
   */
  onModuleInit(): void {
    this.parser = createSicroParser();
    this.logger.log('SicroService initialized');
  }

  /**
   * Search for SICRO items matching the query
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

    // Build SICRO-specific filters
    const sicroFilters = this.buildSicroFilters(query, filters);
    const cacheKey = buildSicroCacheKey(sicroFilters);

    // Try cache first
    const cached = await this.cache.get<GovApiResponse<SicroPriceReference[]>>(
      'sicro',
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
      const results = this.searchDataStore(sicroFilters);

      // Apply pagination
      const page = sicroFilters.page || 1;
      const perPage = sicroFilters.perPage || DEFAULT_PAGE_SIZE;
      const start = (page - 1) * perPage;
      const paginatedResults = results.slice(start, start + perPage);

      const response: GovApiResponse<SicroPriceReference[]> = {
        data: paginatedResults,
        total: results.length,
        page,
        perPage,
        source: 'sicro',
        cached: false,
        isFallback: false,
        timestamp: new Date(),
      };

      // Cache the result
      await this.cache.set('sicro', cacheKey, response, CACHE_TTL_SECONDS);

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
   * Get a specific SICRO item by ID
   *
   * @param id Item identifier (format: sicro:codigo:uf:mesRef:D|O)
   * @returns Single item or null if not found
   */
  async getById(id: string): Promise<GovApiSearchResult | null> {
    const cacheKey = `item:${id}`;

    // Try cache first
    const cached = await this.cache.get<SicroPriceReference>('sicro', cacheKey);

    if (cached) {
      this.cacheStats.hits++;
      return cached;
    }

    this.cacheStats.misses++;

    // Look up in data store
    const item = this.dataStore.items.get(id);

    if (item) {
      // Cache the result
      await this.cache.set('sicro', cacheKey, item, CACHE_TTL_SECONDS);
      return item;
    }

    return null;
  }

  /**
   * Load SICRO data from Excel buffer
   *
   * @param buffer Excel file buffer
   * @param uf State (UF)
   * @param mesReferencia Reference month (YYYY-MM)
   * @param tipo Item type (insumo or composicao)
   * @param modoTransporte Transport mode (optional)
   */
  async loadFromBuffer(
    buffer: Buffer,
    uf: SicroUF,
    mesReferencia: string,
    tipo: SicroItemType,
    modoTransporte?: SicroModoTransporte,
  ): Promise<{ loaded: number; errors: number }> {
    const startTime = Date.now();

    try {
      const result = await this.parser.parseFromBuffer(buffer, {
        uf,
        mesReferencia,
        tipo,
        modoTransporte,
      });

      // Store items in data store
      for (const item of result.items) {
        this.dataStore.items.set(item.id, item);
      }

      // Track loaded month
      const monthKey = `${uf}:${mesReferencia}:${tipo}:${modoTransporte || 'ALL'}`;
      this.dataStore.loadedMonths.add(monthKey);
      this.dataStore.lastUpdate = new Date();

      const duration = Date.now() - startTime;
      this.logger.log(
        `Loaded ${result.count} SICRO items for ${uf} ${mesReferencia} ${tipo} in ${duration}ms (${result.errors.length} errors)`,
      );

      return {
        loaded: result.count,
        errors: result.errors.length,
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error(
        `Failed to load SICRO data after ${duration}ms: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
      );

      return { loaded: 0, errors: 1 };
    }
  }

  /**
   * Load SICRO data from file path
   *
   * @param filePath Path to Excel file
   * @param uf State (UF)
   * @param mesReferencia Reference month (YYYY-MM)
   * @param tipo Item type (insumo or composicao)
   * @param modoTransporte Transport mode (optional)
   */
  async loadFromFile(
    filePath: string,
    uf: SicroUF,
    mesReferencia: string,
    tipo: SicroItemType,
    modoTransporte?: SicroModoTransporte,
  ): Promise<{ loaded: number; errors: number }> {
    const startTime = Date.now();

    try {
      const result = await this.parser.parseFromFile(filePath, {
        uf,
        mesReferencia,
        tipo,
        modoTransporte,
      });

      // Store items in data store
      for (const item of result.items) {
        this.dataStore.items.set(item.id, item);
      }

      // Track loaded month
      const monthKey = `${uf}:${mesReferencia}:${tipo}:${modoTransporte || 'ALL'}`;
      this.dataStore.loadedMonths.add(monthKey);
      this.dataStore.lastUpdate = new Date();

      const duration = Date.now() - startTime;
      this.logger.log(
        `Loaded ${result.count} SICRO items from ${filePath} in ${duration}ms (${result.errors.length} errors)`,
      );

      return {
        loaded: result.count,
        errors: result.errors.length,
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error(
        `Failed to load SICRO file ${filePath} after ${duration}ms: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
      );

      return { loaded: 0, errors: 1 };
    }
  }

  /**
   * Search with SICRO-specific filters
   *
   * @param filters SICRO search filters
   * @returns Paginated search results
   */
  async searchWithFilters(
    filters: SicroSearchFilters,
  ): Promise<GovApiResponse<SicroPriceReference[]>> {
    const cacheKey = buildSicroCacheKey(filters);

    // Try cache first
    const cached = await this.cache.get<GovApiResponse<SicroPriceReference[]>>(
      'sicro',
      cacheKey,
    );

    if (cached) {
      this.cacheStats.hits++;
      return { ...cached, cached: true };
    }

    this.cacheStats.misses++;

    const results = this.searchDataStore(filters);

    const page = filters.page || 1;
    const perPage = filters.perPage || DEFAULT_PAGE_SIZE;
    const start = (page - 1) * perPage;
    const paginatedResults = results.slice(start, start + perPage);

    const response: GovApiResponse<SicroPriceReference[]> = {
      data: paginatedResults,
      total: results.length,
      page,
      perPage,
      source: 'sicro',
      cached: false,
      isFallback: false,
      timestamp: new Date(),
    };

    await this.cache.set('sicro', cacheKey, response, CACHE_TTL_SECONDS);

    return response;
  }

  /**
   * Check SICRO service health
   *
   * @returns Health status
   */
  async healthCheck(): Promise<GovApiHealthStatus> {
    const startTime = Date.now();

    try {
      // Check if we have any data loaded
      const hasData = this.dataStore.items.size > 0;
      const latencyMs = Date.now() - startTime;

      return {
        source: 'sicro',
        healthy: hasData,
        latencyMs,
        lastCheck: new Date(),
        circuitState: 'closed',
        error: hasData ? undefined : 'No SICRO data loaded',
      };
    } catch (error) {
      return {
        source: 'sicro',
        healthy: false,
        latencyMs: Date.now() - startTime,
        lastCheck: new Date(),
        circuitState: 'open',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get current circuit breaker state
   * SICRO uses file-based loading, so circuit breaker is always closed
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
   * Get cache statistics for this API
   */
  getCacheStats(): { hits: number; misses: number; keys: number } {
    return {
      hits: this.cacheStats.hits,
      misses: this.cacheStats.misses,
      keys: this.dataStore.items.size,
    };
  }

  /**
   * Get list of loaded months
   */
  getLoadedMonths(): string[] {
    return Array.from(this.dataStore.loadedMonths);
  }

  /**
   * Get total items count
   */
  getItemsCount(): number {
    return this.dataStore.items.size;
  }

  /**
   * Clear all loaded data
   */
  clearData(): void {
    this.dataStore.items.clear();
    this.dataStore.loadedMonths.clear();
    this.dataStore.lastUpdate = null;
    this.logger.log('SICRO data store cleared');
  }

  /**
   * Build SICRO-specific filters from generic filters
   */
  private buildSicroFilters(
    query: string,
    filters?: GovApiFilterOptions | PriceSearchFilters,
  ): SicroSearchFilters {
    const sicroFilters: SicroSearchFilters = {
      descricao: query || undefined,
      page: filters?.page || 1,
      perPage: filters?.perPage || DEFAULT_PAGE_SIZE,
    };

    if (filters?.uf) {
      sicroFilters.uf = filters.uf as SicroUF;
    }

    // Handle PriceSearchFilters
    const priceFilters = filters as PriceSearchFilters;
    if (priceFilters?.mesReferencia) {
      sicroFilters.mesReferencia = formatMesReferencia(
        priceFilters.mesReferencia,
      );
    }
    if (priceFilters?.codigo) {
      sicroFilters.codigo = priceFilters.codigo;
    }
    if (priceFilters?.desonerado !== undefined) {
      sicroFilters.desonerado = priceFilters.desonerado;
    }

    return sicroFilters;
  }

  /**
   * Search items in data store
   */
  private searchDataStore(filters: SicroSearchFilters): SicroPriceReference[] {
    const results: SicroPriceReference[] = [];
    const queryLower = filters.descricao?.toLowerCase();

    for (const item of this.dataStore.items.values()) {
      // Filter by description
      if (queryLower && !item.descricao.toLowerCase().includes(queryLower)) {
        continue;
      }

      // Filter by codigo
      if (filters.codigo && !item.codigo.includes(filters.codigo)) {
        continue;
      }

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

      // Filter by tipo
      if (filters.tipo && item.tipo !== filters.tipo) {
        continue;
      }

      // Filter by categoria
      if (filters.categoria && item.categoria !== filters.categoria) {
        continue;
      }

      // Filter by modo transporte
      if (
        filters.modoTransporte &&
        item.modoTransporte !== filters.modoTransporte
      ) {
        continue;
      }

      // Filter by desonerado
      if (
        filters.desonerado !== undefined &&
        item.desonerado !== filters.desonerado
      ) {
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

      results.push(item);
    }

    // Sort by relevance (description match quality) then by codigo
    if (queryLower) {
      results.sort((a, b) => {
        const aStartsWith = a.descricao.toLowerCase().startsWith(queryLower);
        const bStartsWith = b.descricao.toLowerCase().startsWith(queryLower);

        if (aStartsWith && !bStartsWith) return -1;
        if (!aStartsWith && bStartsWith) return 1;

        return a.codigo.localeCompare(b.codigo);
      });
    } else {
      results.sort((a, b) => a.codigo.localeCompare(b.codigo));
    }

    return results;
  }

  /**
   * Create fallback response for errors
   */
  private createFallbackResponse(): GovApiResponse<SicroPriceReference[]> {
    return {
      data: [],
      total: 0,
      page: 1,
      perPage: DEFAULT_PAGE_SIZE,
      source: 'sicro',
      cached: false,
      isFallback: true,
      timestamp: new Date(),
    };
  }
}
