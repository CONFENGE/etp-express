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
 * Data persistence (#1165):
 * - Data is now persisted to PostgreSQL via TypeORM
 * - In-memory Map serves as fallback/cache
 * - Redis cache for fast searches
 *
 * @module modules/gov-api/sicro
 * @see https://github.com/CONFENGE/etp-express/issues/694
 * @see https://github.com/CONFENGE/etp-express/issues/1165
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
  SicroSearchFilters,
  SicroPriceReference,
  SicroUF,
  SicroItemType,
  SicroModoTransporte,
  buildSicroCacheKey,
  formatMesReferencia,
} from './sicro.types';
import { SicroParser, createSicroParser } from './sicro-parser';
import { SicroItem } from '../../../entities/sicro-item.entity';

/**
 * In-memory storage for parsed SICRO data
 * Serves as fallback/cache in addition to database persistence (#1165)
 */
interface SicroDataStore {
  items: Map<string, SicroPriceReference>;
  lastUpdate: Date | null;
  loadedMonths: Set<string>;
}

/**
 * Data status response for status endpoint
 */
export interface SicroDataStatus {
  source: 'sicro';
  dataLoaded: boolean;
  itemCount: number;
  loadedMonths: string[];
  lastUpdate: Date | null;
  message: string;
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
 * uf: 'DF',
 * mesReferencia: '2024-01',
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
    @InjectRepository(SicroItem)
    private readonly sicroRepository: Repository<SicroItem>,
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
   * Parses the Excel file and persists data to both:
   * 1. Database (TypeORM) for persistence (#1165)
   * 2. In-memory Map for fast fallback access
   *
   * @param buffer Excel file buffer
   * @param uf State (UF)
   * @param mesReferencia Reference month (YYYY-MM)
   * @param tipo Item type (insumo or composicao)
   * @param modoTransporte Transport mode (optional)
   * @param organizationId Optional organization ID for multi-tenancy
   */
  async loadFromBuffer(
    buffer: Buffer,
    uf: SicroUF,
    mesReferencia: string,
    tipo: SicroItemType,
    modoTransporte?: SicroModoTransporte,
    organizationId?: string,
  ): Promise<{ loaded: number; errors: number; persisted: number }> {
    const startTime = Date.now();

    try {
      const result = await this.parser.parseFromBuffer(buffer, {
        uf,
        mesReferencia,
        tipo,
        modoTransporte,
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
        categoriaId: item.categoriaId || null,
        categoriaDescricao: item.categoriaDescricao || null,
        modoTransporte: item.modoTransporte || null,
        metadata: (item.custoMaoDeObra || item.custoMaterial
          ? {
              custoMaoDeObra: item.custoMaoDeObra,
              custoMaterial: item.custoMaterial,
              custoEquipamento: item.custoEquipamento,
              custoTransporte: item.custoTransporte,
            }
          : null) as Record<string, unknown> | null,
      }));

      // Use upsert to avoid duplicates (based on codigo + uf + mes/ano)
      if (entitiesToSave.length > 0) {
        // Batch insert in chunks to avoid memory issues
        const BATCH_SIZE = 500;
        for (let i = 0; i < entitiesToSave.length; i += BATCH_SIZE) {
          const batch = entitiesToSave.slice(i, i + BATCH_SIZE);
          try {
            await this.sicroRepository
              .createQueryBuilder()
              .insert()
              .into(SicroItem)
              .values(batch as any) // Type assertion for JSONB metadata field
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
      const monthKey = `${uf}:${mesReferencia}:${tipo}:${modoTransporte || 'ALL'}`;
      this.dataStore.loadedMonths.add(monthKey);
      this.dataStore.lastUpdate = new Date();

      const duration = Date.now() - startTime;
      this.logger.log(
        `Loaded ${result.count} SICRO items for ${uf} ${mesReferencia} ${tipo} in ${duration}ms ` +
          `(${persistedCount} persisted to DB, ${result.errors.length} errors)`,
      );

      return {
        loaded: result.count,
        errors: result.errors.length,
        persisted: persistedCount,
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error(
        `Failed to load SICRO data after ${duration}ms: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
      );

      return { loaded: 0, errors: 1, persisted: 0 };
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
   * Get comprehensive data status for monitoring (#1062)
   *
   * Returns detailed information about the data store state,
   * useful for status endpoints and debugging.
   *
   * @returns Data status with load information
   */
  getDataStatus(): SicroDataStatus {
    const dataLoaded = this.dataStore.items.size > 0;
    const itemCount = this.dataStore.items.size;
    const loadedMonths = Array.from(this.dataStore.loadedMonths);
    const lastUpdate = this.dataStore.lastUpdate;

    let message: string;
    if (!dataLoaded) {
      message =
        'SICRO data not loaded. Use scheduled sync or manual trigger to load data.';
    } else {
      message = `SICRO data loaded: ${itemCount} items from ${loadedMonths.length} month(s)`;
    }

    return {
      source: 'sicro',
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
   * @returns True if database has SICRO items
   */
  async hasPersistedData(): Promise<boolean> {
    try {
      const count = await this.sicroRepository.count();
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
      return await this.sicroRepository.count();
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
    filters: SicroSearchFilters,
  ): Promise<GovApiResponse<SicroPriceReference[]>> {
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

      if (filters.modoTransporte) {
        whereClause.modoTransporte = filters.modoTransporte;
      }

      if (filters.codigo) {
        whereClause.codigo = ILike(`%${filters.codigo}%`);
      }

      // Use query builder for more complex searches
      const queryBuilder = this.sicroRepository
        .createQueryBuilder('sicro')
        .where(whereClause);

      // Text search on description
      if (filters.descricao) {
        queryBuilder.andWhere(
          `to_tsvector('portuguese', sicro.descricao) @@ plainto_tsquery('portuguese', :query)`,
          { query: filters.descricao },
        );
      }

      // Price filters
      if (filters.precoMinimo !== undefined) {
        queryBuilder.andWhere(
          '(sicro.precoOnerado >= :minPrice OR sicro.precoDesonerado >= :minPrice)',
          { minPrice: filters.precoMinimo },
        );
      }

      if (filters.precoMaximo !== undefined) {
        queryBuilder.andWhere(
          '(sicro.precoOnerado <= :maxPrice OR sicro.precoDesonerado <= :maxPrice)',
          { maxPrice: filters.precoMaximo },
        );
      }

      // Get total count
      const total = await queryBuilder.getCount();

      // Apply pagination and get results
      const items = await queryBuilder
        .orderBy('sicro.codigo', 'ASC')
        .skip((page - 1) * perPage)
        .take(perPage)
        .getMany();

      // Transform to SicroPriceReference
      const results: SicroPriceReference[] = items.map((item) =>
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
        source: 'sicro',
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
   * Convert database entity to SicroPriceReference (#1165)
   */
  private entityToReference(
    entity: SicroItem,
    desonerado: boolean,
  ): SicroPriceReference {
    const preco = desonerado
      ? Number(entity.precoDesonerado)
      : Number(entity.precoOnerado);
    const mesRef = `${entity.anoReferencia}-${String(entity.mesReferencia).padStart(2, '0')}`;

    return {
      id: `sicro:${entity.codigo}:${entity.uf}:${mesRef}:${desonerado ? 'D' : 'O'}`,
      title: entity.descricao,
      description: entity.descricao,
      source: 'sicro',
      url: `https://www.gov.br/dnit/pt-br/assuntos/planejamento-e-pesquisa/custos-e-pagamentos/sicro/${entity.uf.toLowerCase()}`,
      relevance: 1.0,
      fetchedAt: entity.createdAt,
      codigo: entity.codigo,
      descricao: entity.descricao,
      unidade: entity.unidade,
      precoUnitario: preco,
      mesReferencia: mesRef,
      uf: entity.uf,
      desonerado,
      categoria: entity.categoriaDescricao || 'SICRO',
      tipo: entity.tipo as SicroItemType,
      categoriaId: entity.categoriaId || undefined,
      categoriaDescricao: entity.categoriaDescricao || undefined,
      precoOnerado: Number(entity.precoOnerado),
      precoDesonerado: Number(entity.precoDesonerado),
      modoTransporte:
        (entity.modoTransporte as SicroModoTransporte) || undefined,
      custoMaoDeObra: entity.metadata?.custoMaoDeObra,
      custoMaterial: entity.metadata?.custoMaterial,
      custoEquipamento: entity.metadata?.custoEquipamento,
      custoTransporte: entity.metadata?.custoTransporte,
    };
  }

  /**
   * Get data status including database (#1165)
   */
  async getDataStatusWithDatabase(): Promise<
    SicroDataStatus & { dbItemCount: number }
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
