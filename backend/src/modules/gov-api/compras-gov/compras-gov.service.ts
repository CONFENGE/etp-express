/**
 * Compras.gov.br (SIASG) Service
 *
 * Integration with Compras.gov.br API for government procurement data.
 * Implements IGovApiService interface for unified government API access.
 *
 * API Documentation: https://compras.dados.gov.br/docs/
 *
 * Features:
 * - Search licitacoes (bids) by keyword
 * - Filter by period, organization, modality
 * - Pagination support
 * - Redis cache with 1h TTL (configurable)
 * - Circuit breaker for resilience
 * - Graceful fallback on API unavailability
 *
 * @module modules/gov-api/compras-gov
 * @see https://github.com/CONFENGE/etp-express/issues/691
 */

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  IGovApiService,
  GovApiResponse,
  GovApiSearchResult,
  GovApiFilterOptions,
  GovApiHealthStatus,
  ContractSearchFilters,
} from '../interfaces/gov-api.interface';
import { GovApiClient, createGovApiClient } from '../utils/gov-api-client';
import { GovApiCache } from '../utils/gov-api-cache';
import {
  ComprasGovLicitacaoRaw,
  ComprasGovSearchFilters,
  ComprasGovListResponse,
  ComprasGovContract,
  transformLicitacaoToContract,
  buildCacheKey,
  ComprasGovModalidade,
} from './compras-gov.types';
import { SearchStatus, getStatusMessage } from '../types/search-result';

/**
 * Compras.gov.br API base URL
 */
const COMPRAS_GOV_BASE_URL = 'https://compras.dados.gov.br';

/**
 * Default pagination size (API maximum is 500)
 */
const DEFAULT_PAGE_SIZE = 100;

/**
 * Cache TTL in seconds (1 hour)
 */
const CACHE_TTL_SECONDS = 3600;

/**
 * ComprasGovService - Integration with Compras.gov.br API
 *
 * Provides access to Brazilian federal government procurement data:
 * - Licitacoes (bids/tenders)
 * - Contratos (contracts)
 * - Materiais (CATMAT catalog)
 * - Servicos (CATSER catalog)
 *
 * @example
 * ```typescript
 * const service = new ComprasGovService(configService, cache);
 *
 * // Search for software-related bids
 * const results = await service.search('software', {
 *   startDate: new Date('2024-01-01'),
 *   uf: 'DF',
 * });
 *
 * // Get specific bid by ID
 * const bid = await service.getById('PREGAO-12345-2024');
 * ```
 */
@Injectable()
export class ComprasGovService implements IGovApiService, OnModuleInit {
  private readonly logger = new Logger(ComprasGovService.name);
  private client!: GovApiClient;
  private cacheStats = { hits: 0, misses: 0, keys: 0 };

  /**
   * API source identifier
   */
  readonly source = 'comprasgov' as const;

  constructor(
    private readonly configService: ConfigService,
    private readonly cache: GovApiCache,
  ) {}

  /**
   * Initialize the HTTP client on module init
   */
  onModuleInit(): void {
    this.client = createGovApiClient(this.configService, {
      baseUrl: COMPRAS_GOV_BASE_URL,
      source: 'comprasgov',
      timeout: 30000, // 30s timeout for government APIs
      headers: {
        Accept: 'application/json',
      },
      circuitBreaker: {
        timeout: 30000,
        errorThresholdPercentage: 50,
        resetTimeout: 60000,
        volumeThreshold: 5,
      },
      retry: {
        maxRetries: 3,
        baseDelay: 2000,
        maxDelay: 15000,
      },
      rateLimit: {
        maxRequests: 60, // Conservative rate for government API
        windowMs: 60000,
        throwOnLimit: false,
      },
    });

    this.logger.log('ComprasGovService initialized');
  }

  /**
   * Search for licitacoes (bids) matching the query
   *
   * @param query Search query for the objeto (purpose) field
   * @param filters Optional filters for date range, organization, etc.
   * @returns Paginated search results
   */
  async search(
    query: string,
    filters?: GovApiFilterOptions | ContractSearchFilters,
  ): Promise<GovApiResponse<GovApiSearchResult[]>> {
    const startTime = Date.now();

    // Build API-specific filters
    const apiFilters = this.buildApiFilters(query, filters);
    const cacheKey = buildCacheKey('licitacoes', apiFilters);

    // Try cache first
    const cached = await this.cache.get<GovApiResponse<ComprasGovContract[]>>(
      'comprasgov',
      cacheKey,
    );

    if (cached) {
      this.cacheStats.hits++;
      this.logger.debug(`Cache hit for search: "${query.substring(0, 50)}..."`);
      return {
        ...cached,
        cached: true,
        status: cached.status || SearchStatus.SUCCESS,
      };
    }

    this.cacheStats.misses++;

    // Check circuit breaker before making request
    if (!this.client.isAvailable()) {
      this.logger.warn(
        'Circuit breaker is open, returning SERVICE_UNAVAILABLE response',
      );
      return this.createServiceUnavailableResponse('Circuit breaker is open');
    }

    try {
      // Make API request
      const params = this.buildQueryParams(apiFilters);
      const response = await this.client.get<
        ComprasGovListResponse<ComprasGovLicitacaoRaw>
      >('/licitacoes/v1/licitacoes.json', { params });

      // Transform response
      const licitacoes =
        response._embedded?.licitacoes ||
        (response as unknown as ComprasGovLicitacaoRaw[]) ||
        [];
      const contracts = licitacoes.map(transformLicitacaoToContract);

      // Calculate pagination info
      const page = Math.floor((apiFilters.offset || 0) / DEFAULT_PAGE_SIZE) + 1;
      const total = response.total || licitacoes.length;

      const result: GovApiResponse<ComprasGovContract[]> = {
        data: contracts,
        total,
        page,
        perPage: DEFAULT_PAGE_SIZE,
        source: 'comprasgov',
        cached: false,
        isFallback: false,
        timestamp: new Date(),
        status: SearchStatus.SUCCESS,
        statusMessage: getStatusMessage(SearchStatus.SUCCESS),
      };

      // Cache the result
      await this.cache.set('comprasgov', cacheKey, result, CACHE_TTL_SECONDS);

      const duration = Date.now() - startTime;
      this.logger.log(
        `Search for "${query.substring(0, 30)}..." returned ${contracts.length} results in ${duration}ms`,
      );

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `Search failed for "${query.substring(0, 30)}..." after ${duration}ms: ${errorMessage}`,
      );

      // Determine specific error type
      const isTimeout =
        errorMessage.includes('timeout') || errorMessage.includes('ETIMEDOUT');
      const isRateLimited =
        errorMessage.includes('429') || errorMessage.includes('rate limit');

      if (isTimeout) {
        return this.createTimeoutResponse(errorMessage);
      }
      if (isRateLimited) {
        return this.createRateLimitedResponse(errorMessage);
      }

      // Return service unavailable response instead of throwing
      return this.createServiceUnavailableResponse(errorMessage);
    }
  }

  /**
   * Get a specific licitacao by ID
   *
   * @param id Licitacao identifier
   * @returns Single contract or null if not found
   */
  async getById(id: string): Promise<GovApiSearchResult | null> {
    const cacheKey = `licitacao:${id}`;

    // Try cache first
    const cached = await this.cache.get<ComprasGovContract>(
      'comprasgov',
      cacheKey,
    );

    if (cached) {
      this.cacheStats.hits++;
      return cached;
    }

    this.cacheStats.misses++;

    if (!this.client.isAvailable()) {
      this.logger.warn('Circuit breaker is open, cannot fetch by ID');
      return null;
    }

    try {
      const response = await this.client.get<ComprasGovLicitacaoRaw>(
        `/licitacoes/id/${id}.json`,
      );

      if (!response) {
        return null;
      }

      const contract = transformLicitacaoToContract(response);

      // Cache the result
      await this.cache.set('comprasgov', cacheKey, contract, CACHE_TTL_SECONDS);

      return contract;
    } catch (error) {
      this.logger.error(
        `Failed to get licitacao by ID "${id}": ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
      );
      return null;
    }
  }

  /**
   * Check API health and connectivity
   *
   * @returns Health status including latency
   */
  async healthCheck(): Promise<GovApiHealthStatus> {
    const startTime = Date.now();

    try {
      // Use a simple endpoint to check connectivity
      await this.client.healthCheck(
        '/licitacoes/v1/licitacoes.json?offset=0',
        5000,
      );

      const latency = Date.now() - startTime;
      const circuitState = this.client.getCircuitState();

      return {
        source: 'comprasgov',
        healthy: true,
        latencyMs: latency,
        lastCheck: new Date(),
        circuitState: circuitState.opened
          ? 'open'
          : circuitState.halfOpen
            ? 'half-open'
            : 'closed',
      };
    } catch (error) {
      const latency = Date.now() - startTime;
      const circuitState = this.client.getCircuitState();

      return {
        source: 'comprasgov',
        healthy: false,
        latencyMs: latency,
        lastCheck: new Date(),
        error: error instanceof Error ? error.message : 'Unknown error',
        circuitState: circuitState.opened
          ? 'open'
          : circuitState.halfOpen
            ? 'half-open'
            : 'closed',
      };
    }
  }

  /**
   * Get current circuit breaker state
   */
  getCircuitState(): {
    opened: boolean;
    halfOpen: boolean;
    closed: boolean;
    stats: Record<string, unknown>;
  } {
    return this.client.getCircuitState();
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { hits: number; misses: number; keys: number } {
    return { ...this.cacheStats };
  }

  /**
   * Build API-specific filters from generic filters
   */
  private buildApiFilters(
    query: string,
    filters?: GovApiFilterOptions | ContractSearchFilters,
  ): ComprasGovSearchFilters {
    const apiFilters: ComprasGovSearchFilters = {
      objeto: query,
    };

    if (!filters) {
      return apiFilters;
    }

    // Map generic filters to API-specific params
    if (filters.startDate) {
      apiFilters.data_publicacao_min = this.formatDate(filters.startDate);
    }

    if (filters.endDate) {
      apiFilters.data_publicacao_max = this.formatDate(filters.endDate);
    }

    if (filters.uf) {
      apiFilters.uf_uasg = filters.uf;
    }

    if (filters.orgao) {
      apiFilters.orgao = parseInt(filters.orgao, 10);
    }

    // Map ContractSearchFilters specific fields
    const contractFilters = filters as ContractSearchFilters;

    if (contractFilters.modalidade) {
      const modalidadeMap: Record<string, ComprasGovModalidade> = {
        concorrencia: ComprasGovModalidade.CONCORRENCIA,
        'tomada de precos': ComprasGovModalidade.TOMADA_PRECOS,
        convite: ComprasGovModalidade.CONVITE,
        concurso: ComprasGovModalidade.CONCURSO,
        leilao: ComprasGovModalidade.LEILAO,
        dispensa: ComprasGovModalidade.DISPENSA,
        inexigibilidade: ComprasGovModalidade.INEXIGIBILIDADE,
        pregao: ComprasGovModalidade.PREGAO,
        rdc: ComprasGovModalidade.RDC,
      };

      const normalizedModalidade = contractFilters.modalidade.toLowerCase();
      if (normalizedModalidade in modalidadeMap) {
        apiFilters.modalidade = modalidadeMap[normalizedModalidade];
      }
    }

    if (contractFilters.valorMinimo) {
      apiFilters.valor_estimado_total_min = contractFilters.valorMinimo;
    }

    if (contractFilters.valorMaximo) {
      apiFilters.valor_estimado_total_max = contractFilters.valorMaximo;
    }

    if (contractFilters.cnpj) {
      apiFilters.cnpj_vencedor = contractFilters.cnpj;
    }

    // Pagination
    if (filters.page && filters.perPage) {
      apiFilters.offset = (filters.page - 1) * filters.perPage;
    }

    return apiFilters;
  }

  /**
   * Build query params object for Axios
   */
  private buildQueryParams(
    filters: ComprasGovSearchFilters,
  ): Record<string, string | number | boolean> {
    const params: Record<string, string | number | boolean> = {};

    // Only include non-undefined values
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        params[key] = value;
      }
    });

    return params;
  }

  /**
   * Format date to YYYY-MM-DD string
   */
  private formatDate(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  /**
   * Create a fallback response for when API is unavailable
   * @deprecated Use createServiceUnavailableResponse instead
   */
  private createFallbackResponse(): GovApiResponse<ComprasGovContract[]> {
    return this.createServiceUnavailableResponse('Service unavailable');
  }

  /**
   * Create a SERVICE_UNAVAILABLE response when API is down or circuit breaker is open
   */
  private createServiceUnavailableResponse(
    error: string,
  ): GovApiResponse<ComprasGovContract[]> {
    return {
      data: [],
      total: 0,
      page: 1,
      perPage: DEFAULT_PAGE_SIZE,
      source: 'comprasgov',
      cached: false,
      isFallback: true,
      timestamp: new Date(),
      status: SearchStatus.SERVICE_UNAVAILABLE,
      statusMessage: getStatusMessage(SearchStatus.SERVICE_UNAVAILABLE),
      sourceStatuses: [
        {
          name: 'comprasgov',
          status: SearchStatus.SERVICE_UNAVAILABLE,
          error,
        },
      ],
    };
  }

  /**
   * Create a TIMEOUT response when request times out
   */
  private createTimeoutResponse(
    error: string,
  ): GovApiResponse<ComprasGovContract[]> {
    return {
      data: [],
      total: 0,
      page: 1,
      perPage: DEFAULT_PAGE_SIZE,
      source: 'comprasgov',
      cached: false,
      isFallback: true,
      timestamp: new Date(),
      status: SearchStatus.TIMEOUT,
      statusMessage: getStatusMessage(SearchStatus.TIMEOUT),
      sourceStatuses: [
        {
          name: 'comprasgov',
          status: SearchStatus.TIMEOUT,
          error,
        },
      ],
    };
  }

  /**
   * Create a RATE_LIMITED response when rate limit is exceeded
   */
  private createRateLimitedResponse(
    error: string,
  ): GovApiResponse<ComprasGovContract[]> {
    return {
      data: [],
      total: 0,
      page: 1,
      perPage: DEFAULT_PAGE_SIZE,
      source: 'comprasgov',
      cached: false,
      isFallback: true,
      timestamp: new Date(),
      status: SearchStatus.RATE_LIMITED,
      statusMessage: getStatusMessage(SearchStatus.RATE_LIMITED),
      sourceStatuses: [
        {
          name: 'comprasgov',
          status: SearchStatus.RATE_LIMITED,
          error,
        },
      ],
    };
  }
}
