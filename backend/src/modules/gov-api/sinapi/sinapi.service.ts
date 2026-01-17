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
 * Data sources (in order of priority):
 * 1. API (Orcamentador) - Primary source via REST API (#1565, #1567)
 * 2. Database (PostgreSQL) - Fallback with persisted data (#1165)
 * 3. Memory (Map) - Legacy fallback for Excel imports
 *
 * @module modules/gov-api/sinapi
 * @see https://github.com/CONFENGE/etp-express/issues/693
 * @see https://github.com/CONFENGE/etp-express/issues/1165
 * @see https://github.com/CONFENGE/etp-express/issues/1567
 */

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike } from 'typeorm';
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
  SinapiSearchFilters,
  SinapiPriceReference,
  SinapiUF,
  SinapiItemType,
  buildSinapiCacheKey,
} from './sinapi.types';
import { SinapiParser, createSinapiParser } from './sinapi-parser';
import { SinapiItem } from '../../../entities/sinapi-item.entity';
import {
  SinapiApiClientService,
  SinapiApiAuthError,
  SinapiApiRateLimitError,
  SinapiApiServerError,
} from './sinapi-api-client.service';
import { SinapiApiInsumo, SinapiApiComposicao } from './sinapi-api.types';

/**
 * In-memory storage for parsed SINAPI data
 * Serves as fallback/cache in addition to database persistence (#1165)
 */
interface SinapiDataStore {
  items: Map<string, SinapiPriceReference>;
  lastUpdate: Date | null;
  loadedMonths: Set<string>;
}

/**
 * Data status response for status endpoint
 */
export interface SinapiDataStatus {
  source: 'sinapi';
  dataLoaded: boolean;
  itemCount: number;
  loadedMonths: string[];
  lastUpdate: Date | null;
  message: string;
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
 * Data source for SINAPI queries (#1567)
 */
enum SinapiDataSource {
  /** API Orcamentador (primary) */
  API = 'api',
  /** PostgreSQL database (fallback) */
  DATABASE = 'database',
  /** In-memory Map (legacy) */
  MEMORY = 'memory',
}

/**
 * SinapiService - SINAPI data ingestion and search service
 *
 * @example
 * ```typescript
 * const service = new SinapiService(configService, cache);
 *
 * // Search for construction materials
 * const results = await service.search('cimento', {
 * uf: 'DF',
 * mesReferencia: '2024-01',
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
   * Current data source for queries (#1567)
   * Defaults to API, falls back to DATABASE then MEMORY
   */
  private currentDataSource: SinapiDataSource = SinapiDataSource.API;

  /**
   * Timestamp of last API failure for circuit-breaker-like behavior
   */
  private lastApiFailure: Date | null = null;

  /**
   * Duration to wait before retrying API after failure (5 minutes)
   */
  private readonly apiRetryDelayMs = 5 * 60 * 1000;

  /**
   * API source identifier
   */
  readonly source = 'sinapi' as const;

  constructor(
    private readonly configService: ConfigService,
    private readonly cache: GovApiCache,
    @InjectRepository(SinapiItem)
    private readonly sinapiRepository: Repository<SinapiItem>,
    private readonly apiClient: SinapiApiClientService,
  ) {}

  /**
   * Initialize parser on module init
   */
  onModuleInit(): void {
    this.parser = createSinapiParser();

    // Check if API is configured and set initial data source
    if (this.apiClient.isConfigured()) {
      this.currentDataSource = SinapiDataSource.API;
      this.logger.log(
        'SinapiService initialized with API as primary data source',
      );
    } else {
      this.currentDataSource = SinapiDataSource.DATABASE;
      this.logger.warn(
        'SINAPI API not configured - using database as primary data source',
      );
    }
  }

  /**
   * Get current data source being used
   */
  getCurrentDataSource(): SinapiDataSource {
    return this.currentDataSource;
  }

  /**
   * Check if API should be retried after failure
   */
  private shouldRetryApi(): boolean {
    if (!this.lastApiFailure) {
      return true;
    }
    const elapsed = Date.now() - this.lastApiFailure.getTime();
    return elapsed > this.apiRetryDelayMs;
  }

  /**
   * Reset API failure state to retry API calls
   */
  resetApiFailure(): void {
    this.lastApiFailure = null;
    if (this.apiClient.isConfigured()) {
      this.currentDataSource = SinapiDataSource.API;
      this.logger.log('API failure state reset - will retry API on next query');
    }
  }

  /**
   * Search for SINAPI items matching the query
   *
   * Uses multi-source strategy (#1567):
   * 1. Try API first (if configured and not in failure state)
   * 2. Fall back to database if API fails
   * 3. Fall back to in-memory store if database fails
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

    // Determine which data source to use
    const useApi =
      this.currentDataSource === SinapiDataSource.API &&
      this.apiClient.isConfigured() &&
      this.shouldRetryApi();

    // Track if we're using a fallback due to API failure
    let isUsingFallback = false;

    // Try API first (#1567)
    if (useApi) {
      try {
        const apiResponse = await this.searchFromApi(query, sinapiFilters);
        const duration = Date.now() - startTime;
        this.logger.log(
          `API search for "${query.substring(0, 30)}..." returned ${apiResponse.data.length}/${apiResponse.total} results in ${duration}ms`,
        );

        // Cache the result
        await this.cache.set(
          'sinapi',
          cacheKey,
          apiResponse,
          CACHE_TTL_SECONDS,
        );

        return apiResponse;
      } catch (error) {
        this.handleApiError(error);
        isUsingFallback = true;
        // Continue to fallback
      }
    }

    // Fallback to database (#1165)
    try {
      const dbResponse = await this.searchFromDatabase(sinapiFilters);
      if (dbResponse.total > 0 || !this.hasData()) {
        const duration = Date.now() - startTime;
        this.logger.log(
          `Database search for "${query.substring(0, 30)}..." returned ${dbResponse.data.length}/${dbResponse.total} results in ${duration}ms${isUsingFallback ? ' (fallback from API)' : ''}`,
        );

        // Cache the result
        await this.cache.set('sinapi', cacheKey, dbResponse, CACHE_TTL_SECONDS);

        return {
          ...dbResponse,
          isFallback: isUsingFallback,
        };
      }
    } catch (error) {
      this.logger.warn(
        `Database search failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      // Continue to memory fallback
    }

    // Final fallback to in-memory store
    try {
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
        isFallback: true,
        timestamp: new Date(),
      };

      // Cache the result
      await this.cache.set('sinapi', cacheKey, response, CACHE_TTL_SECONDS);

      const duration = Date.now() - startTime;
      this.logger.log(
        `Memory search for "${query.substring(0, 30)}..." returned ${paginatedResults.length}/${results.length} results in ${duration}ms (fallback)`,
      );

      return response;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error(
        `All search sources failed for "${query.substring(0, 30)}..." after ${duration}ms: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
      );

      return this.createFallbackResponse();
    }
  }

  /**
   * Search via API (Orcamentador) (#1567)
   *
   * @param query Search query
   * @param filters SINAPI-specific filters
   * @returns API response transformed to standard format
   */
  private async searchFromApi(
    query: string,
    filters: SinapiSearchFilters,
  ): Promise<GovApiResponse<SinapiPriceReference[]>> {
    const page = filters.page || 1;
    const perPage = filters.perPage || DEFAULT_PAGE_SIZE;
    const desonerado = filters.desonerado ?? false;

    // Search both insumos and composicoes for comprehensive results
    const [insumosResponse, composicoesResponse] = await Promise.all([
      this.apiClient.searchInsumos({
        nome: query || undefined,
        codigo: filters.codigo ? parseInt(filters.codigo, 10) : undefined,
        estado: filters.uf,
        referencia: filters.mesReferencia,
        regime: desonerado ? 'DESONERADO' : 'NAO_DESONERADO',
        page,
        limit: perPage,
      }),
      this.apiClient.searchComposicoes({
        nome: query || undefined,
        estado: filters.uf,
        referencia: filters.mesReferencia,
        regime: desonerado ? 'DESONERADO' : 'NAO_DESONERADO',
        page,
        limit: Math.floor(perPage / 2), // Split results between types
      }),
    ]);

    // Transform API responses to SinapiPriceReference format
    const insumoResults = insumosResponse.data.map((insumo) =>
      this.transformApiInsumo(insumo, desonerado),
    );
    const composicaoResults = composicoesResponse.data.map((composicao) =>
      this.transformApiComposicao(composicao, desonerado),
    );

    // Combine results (prioritize insumos)
    const allResults = [...insumoResults, ...composicaoResults];

    // Calculate total from both responses
    const total = insumosResponse.total + composicoesResponse.total;

    return {
      data: allResults,
      total,
      page,
      perPage,
      source: 'sinapi',
      cached: false,
      isFallback: false,
      timestamp: new Date(),
    };
  }

  /**
   * Transform API insumo to SinapiPriceReference
   */
  private transformApiInsumo(
    insumo: SinapiApiInsumo,
    desonerado: boolean,
  ): SinapiPriceReference {
    const preco = desonerado
      ? insumo.preco_desonerado
      : insumo.preco_naodesonerado;
    const mesRef = insumo.referencia || 'unknown';
    const uf = insumo.estado || 'BR';

    return {
      id: `sinapi:${insumo.codigo}:${uf}:${mesRef}:${desonerado ? 'D' : 'O'}`,
      title: insumo.nome,
      description: insumo.nome,
      source: 'sinapi',
      url: undefined,
      relevance: 1.0,
      fetchedAt: new Date(),
      codigo: String(insumo.codigo),
      descricao: insumo.nome,
      unidade: insumo.unidade,
      precoUnitario: preco,
      mesReferencia: mesRef,
      uf: uf as SinapiUF,
      desonerado,
      categoria: insumo.classe || 'SINAPI',
      tipo: SinapiItemType.INSUMO,
      classeId: undefined,
      classeDescricao: insumo.classe,
      precoOnerado: insumo.preco_naodesonerado,
      precoDesonerado: insumo.preco_desonerado,
    };
  }

  /**
   * Transform API composicao to SinapiPriceReference
   */
  private transformApiComposicao(
    composicao: SinapiApiComposicao,
    desonerado: boolean,
  ): SinapiPriceReference {
    const preco = desonerado
      ? composicao.preco_desonerado
      : composicao.preco_naodesonerado;
    const mesRef = composicao.referencia || 'unknown';
    const uf = composicao.estado || 'BR';

    return {
      id: `sinapi:${composicao.codigo}:${uf}:${mesRef}:${desonerado ? 'D' : 'O'}`,
      title: composicao.nome,
      description: composicao.nome,
      source: 'sinapi',
      url: undefined,
      relevance: 1.0,
      fetchedAt: new Date(),
      codigo: String(composicao.codigo),
      descricao: composicao.nome,
      unidade: composicao.unidade,
      precoUnitario: preco,
      mesReferencia: mesRef,
      uf: uf as SinapiUF,
      desonerado,
      categoria: composicao.classe || 'SINAPI',
      tipo: SinapiItemType.COMPOSICAO,
      classeId: undefined,
      classeDescricao: composicao.classe,
      precoOnerado: composicao.preco_naodesonerado,
      precoDesonerado: composicao.preco_desonerado,
    };
  }

  /**
   * Handle API errors and update data source state (#1567)
   */
  private handleApiError(error: unknown): void {
    this.lastApiFailure = new Date();

    if (error instanceof SinapiApiAuthError) {
      this.logger.error('SINAPI API authentication failed - check API key');
      this.currentDataSource = SinapiDataSource.DATABASE;
    } else if (error instanceof SinapiApiRateLimitError) {
      this.logger.warn(
        `SINAPI API rate limit exceeded - retry after ${error.retryAfter}s`,
      );
      // Don't permanently switch to database for rate limits
    } else if (error instanceof SinapiApiServerError) {
      this.logger.warn(`SINAPI API server error (${error.statusCode})`);
      this.currentDataSource = SinapiDataSource.DATABASE;
    } else {
      this.logger.warn(
        `SINAPI API unavailable: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      this.currentDataSource = SinapiDataSource.DATABASE;
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
   * Parses the Excel file and persists data to both:
   * 1. Database (TypeORM) for persistence (#1165)
   * 2. In-memory Map for fast fallback access
   *
   * @param buffer Excel file buffer
   * @param uf State (UF)
   * @param mesReferencia Reference month (YYYY-MM)
   * @param tipo Item type (insumo or composicao)
   * @param organizationId Optional organization ID for multi-tenancy
   */
  async loadFromBuffer(
    buffer: Buffer,
    uf: SinapiUF,
    mesReferencia: string,
    tipo: SinapiItemType,
    organizationId?: string,
  ): Promise<{ loaded: number; errors: number; persisted: number }> {
    const startTime = Date.now();

    try {
      const result = await this.parser.parseFromBuffer(buffer, {
        uf,
        mesReferencia,
        tipo,
      });

      // Store items in memory (fallback/cache)
      for (const item of result.items) {
        this.dataStore.items.set(item.id, item);
      }

      // Persist to database (#1165)
      const [anoRef, mesRef] = mesReferencia.split('-').map(Number);
      let persistedCount = 0;

      const entitiesToSave = result.items.map((item) => ({
        organizationId: organizationId || null,
        codigo: item.codigo,
        descricao: item.descricao,
        unidade: item.unidade,
        precoOnerado: item.precoOnerado,
        precoDesonerado: item.precoDesonerado,
        tipo: item.tipo as 'INSUMO' | 'COMPOSICAO',
        uf: item.uf,
        mesReferencia: mesRef,
        anoReferencia: anoRef,
        classeId: item.classeId || null,
        classeDescricao: item.classeDescricao || null,
        metadata: null as Record<string, unknown> | null,
      }));

      // Use upsert to avoid duplicates (based on codigo + uf + mes/ano)
      if (entitiesToSave.length > 0) {
        // Batch insert in chunks to avoid memory issues
        const BATCH_SIZE = 500;
        for (let i = 0; i < entitiesToSave.length; i += BATCH_SIZE) {
          const batch = entitiesToSave.slice(i, i + BATCH_SIZE);
          try {
            await this.sinapiRepository
              .createQueryBuilder()
              .insert()
              .into(SinapiItem)
              // eslint-disable-next-line @typescript-eslint/no-explicit-any -- TypeORM InsertQueryBuilder requires any for JSONB metadata
              .values(batch as any)
              .orIgnore() // Skip duplicates
              .execute();
            persistedCount += batch.length;
          } catch (dbError) {
            this.logger.warn(
              `Batch ${i / BATCH_SIZE + 1} partial save: ${dbError instanceof Error ? dbError.message : 'Unknown error'}`,
            );
          }
        }
      }

      // Track loaded month
      const monthKey = `${uf}:${mesReferencia}:${tipo}`;
      this.dataStore.loadedMonths.add(monthKey);
      this.dataStore.lastUpdate = new Date();

      const duration = Date.now() - startTime;
      this.logger.log(
        `Loaded ${result.count} SINAPI items for ${uf}/${mesReferencia}/${tipo} in ${duration}ms ` +
          `(${persistedCount} persisted to DB, ${result.errors.length} errors)`,
      );

      return {
        loaded: result.count,
        errors: result.errors.length,
        persisted: persistedCount,
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
   * Check API health (#1567)
   *
   * Checks health in order of priority:
   * 1. API (Orcamentador)
   * 2. Database
   * 3. In-memory store
   */
  async healthCheck(): Promise<GovApiHealthStatus> {
    const startTime = Date.now();

    // Check API first if configured
    if (this.apiClient.isConfigured()) {
      try {
        const apiStatus = await this.apiClient.checkStatus();
        const latency = Date.now() - startTime;

        if (apiStatus.status === 'online') {
          // Reset any previous failure state
          this.lastApiFailure = null;
          this.currentDataSource = SinapiDataSource.API;

          return {
            source: 'sinapi',
            healthy: true,
            latencyMs: latency,
            lastCheck: new Date(),
            circuitState: 'closed',
          };
        }
      } catch (error) {
        this.logger.warn(
          `API health check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        );
      }
    }

    // Fallback to database check
    const dbCount = await this.getPersistedCount();
    if (dbCount > 0) {
      const latency = Date.now() - startTime;
      return {
        source: 'sinapi',
        healthy: true,
        latencyMs: latency,
        lastCheck: new Date(),
        error: 'API unavailable, using database fallback',
        circuitState: 'open',
      };
    }

    // Final fallback to in-memory check
    const hasData = this.dataStore.items.size > 0;
    const latency = Date.now() - startTime;

    return {
      source: 'sinapi',
      healthy: hasData,
      latencyMs: latency,
      lastCheck: new Date(),
      error: hasData
        ? 'API and database unavailable, using memory fallback'
        : 'No SINAPI data available from any source',
      circuitState: hasData ? 'half-open' : 'open',
    };
  }

  /**
   * Get current circuit breaker state (#1567)
   *
   * Now includes API client state information.
   */
  getCircuitState(): {
    opened: boolean;
    halfOpen: boolean;
    closed: boolean;
    stats: Record<string, unknown>;
  } {
    // Determine circuit state based on current data source
    const isApiAvailable =
      this.currentDataSource === SinapiDataSource.API && !this.lastApiFailure;
    const isRecovering = this.lastApiFailure !== null && this.shouldRetryApi();

    return {
      opened: !isApiAvailable && !isRecovering,
      halfOpen: isRecovering,
      closed: isApiAvailable,
      stats: {
        currentDataSource: this.currentDataSource,
        apiConfigured: this.apiClient.isConfigured(),
        lastApiFailure: this.lastApiFailure,
        rateLimitInfo: this.apiClient.getRateLimitInfo(),
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
   * Get comprehensive data status for monitoring (#1062)
   *
   * Returns detailed information about the data store state,
   * useful for status endpoints and debugging.
   *
   * @returns Data status with load information
   */
  getDataStatus(): SinapiDataStatus {
    const dataLoaded = this.dataStore.items.size > 0;
    const itemCount = this.dataStore.items.size;
    const loadedMonths = Array.from(this.dataStore.loadedMonths);
    const lastUpdate = this.dataStore.lastUpdate;

    let message: string;
    if (!dataLoaded) {
      message =
        'SINAPI data not loaded. Use scheduled sync or manual trigger to load data.';
    } else {
      message = `SINAPI data loaded: ${itemCount} items from ${loadedMonths.length} month(s)`;
    }

    return {
      source: 'sinapi',
      dataLoaded,
      itemCount,
      loadedMonths,
      lastUpdate,
      message,
    };
  }

  /**
   * Check if any data is loaded
   */
  hasData(): boolean {
    return this.dataStore.items.size > 0;
  }

  /**
   * Check if data exists in database (#1165)
   *
   * @returns True if database has SINAPI items
   */
  async hasPersistedData(): Promise<boolean> {
    try {
      const count = await this.sinapiRepository.count();
      return count > 0;
    } catch (error) {
      this.logger.warn(
        `Failed to check persisted data: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      return false;
    }
  }

  /**
   * Get count of items in database (#1165)
   *
   * @returns Number of persisted items
   */
  async getPersistedCount(): Promise<number> {
    try {
      return await this.sinapiRepository.count();
    } catch (error) {
      this.logger.warn(
        `Failed to get persisted count: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      return 0;
    }
  }

  /**
   * Search items in database (#1165)
   *
   * Queries PostgreSQL directly for persistence-aware searches.
   *
   * @param filters Search filters
   * @returns Paginated results from database
   */
  async searchFromDatabase(
    filters: SinapiSearchFilters,
  ): Promise<GovApiResponse<SinapiPriceReference[]>> {
    const startTime = Date.now();
    const page = filters.page || 1;
    const perPage = filters.perPage || DEFAULT_PAGE_SIZE;

    try {
      // Build where clause
      const whereClause: Record<string, unknown> = {};

      if (filters.uf) {
        whereClause.uf = filters.uf;
      }

      if (filters.mesReferencia) {
        const [ano, mes] = filters.mesReferencia.split('-').map(Number);
        whereClause.anoReferencia = ano;
        whereClause.mesReferencia = mes;
      }

      if (filters.tipo) {
        whereClause.tipo = filters.tipo;
      }

      if (filters.codigo) {
        whereClause.codigo = ILike(`%${filters.codigo}%`);
      }

      // Use query builder for more complex searches
      const queryBuilder = this.sinapiRepository
        .createQueryBuilder('sinapi')
        .where(whereClause);

      // Text search on description
      if (filters.descricao) {
        queryBuilder.andWhere(
          `to_tsvector('portuguese', sinapi.descricao) @@ plainto_tsquery('portuguese', :query)`,
          { query: filters.descricao },
        );
      }

      // Price filters
      if (filters.precoMinimo !== undefined) {
        queryBuilder.andWhere(
          '(sinapi.precoOnerado >= :minPrice OR sinapi.precoDesonerado >= :minPrice)',
          { minPrice: filters.precoMinimo },
        );
      }

      if (filters.precoMaximo !== undefined) {
        queryBuilder.andWhere(
          '(sinapi.precoOnerado <= :maxPrice OR sinapi.precoDesonerado <= :maxPrice)',
          { maxPrice: filters.precoMaximo },
        );
      }

      // Get total count
      const total = await queryBuilder.getCount();

      // Apply pagination and get results
      const items = await queryBuilder
        .orderBy('sinapi.codigo', 'ASC')
        .skip((page - 1) * perPage)
        .take(perPage)
        .getMany();

      // Transform to SinapiPriceReference
      const results: SinapiPriceReference[] = items.map((item) =>
        this.entityToReference(item, filters.desonerado ?? false),
      );

      const duration = Date.now() - startTime;
      this.logger.log(
        `Database search returned ${results.length}/${total} results in ${duration}ms`,
      );

      return {
        data: results,
        total,
        page,
        perPage,
        source: 'sinapi',
        cached: false,
        isFallback: false,
        timestamp: new Date(),
      };
    } catch (error) {
      this.logger.error(
        `Database search failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      return this.createFallbackResponse();
    }
  }

  /**
   * Convert database entity to SinapiPriceReference (#1165)
   */
  private entityToReference(
    entity: SinapiItem,
    desonerado: boolean,
  ): SinapiPriceReference {
    const preco = desonerado
      ? Number(entity.precoDesonerado)
      : Number(entity.precoOnerado);
    const mesRef = `${entity.anoReferencia}-${String(entity.mesReferencia).padStart(2, '0')}`;

    return {
      id: `sinapi:${entity.codigo}:${entity.uf}:${mesRef}:${desonerado ? 'D' : 'O'}`,
      title: entity.descricao,
      description: entity.descricao,
      source: 'sinapi',
      url: undefined,
      relevance: 1.0,
      fetchedAt: entity.createdAt,
      codigo: entity.codigo,
      descricao: entity.descricao,
      unidade: entity.unidade,
      precoUnitario: preco,
      mesReferencia: mesRef,
      uf: entity.uf,
      desonerado,
      categoria: entity.classeDescricao || 'SINAPI',
      tipo: entity.tipo as SinapiItemType,
      classeId: entity.classeId || undefined,
      classeDescricao: entity.classeDescricao || undefined,
      precoOnerado: Number(entity.precoOnerado),
      precoDesonerado: Number(entity.precoDesonerado),
    };
  }

  /**
   * Get data status including database (#1165)
   */
  async getDataStatusWithDatabase(): Promise<
    SinapiDataStatus & { dbItemCount: number }
  > {
    const baseStatus = this.getDataStatus();
    const dbItemCount = await this.getPersistedCount();

    return {
      ...baseStatus,
      dbItemCount,
      message: `${baseStatus.message}. Database: ${dbItemCount} items persisted.`,
    };
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
