/**
 * PNCP Service
 *
 * Service for integrating with Portal Nacional de Contratações Públicas API.
 * Implements IGovApiService interface for unified government API access.
 *
 * Features:
 * - Search contratações by date range
 * - Search contratos by date range
 * - Search atas de registro de preços by validity period
 * - Redis caching with 1h TTL
 * - Circuit breaker and rate limiting via GovApiClient
 *
 * @module modules/gov-api/pncp
 * @see https://pncp.gov.br/api/consulta/swagger-ui/index.html
 */

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  IGovApiService,
  GovApiResponse,
  GovApiSearchResult,
  GovApiFilterOptions,
  GovApiHealthStatus,
  ContractSearchFilters,
  GovApiContract,
} from '../interfaces/gov-api.interface';
import { GovApiClient, createGovApiClient } from '../utils/gov-api-client';
import { GovApiCache } from '../utils/gov-api-cache';
import {
  PncpContratacao,
  PncpContrato,
  PncpAta,
  PncpPaginatedResponse,
  PncpContratacaoSearchParams,
  PncpContratoSearchParams,
  PncpAtaSearchParams,
  PNCP_MODALIDADE_NAMES,
} from './pncp.types';
import { SearchStatus, getStatusMessage } from '../types/search-result';

/**
 * PNCP API Base URL
 */
const PNCP_BASE_URL = 'https://pncp.gov.br/api/consulta';

/**
 * Default search period in days
 */
const DEFAULT_SEARCH_DAYS = 30;

/**
 * Maximum page size allowed by PNCP API
 */
const MAX_PAGE_SIZE = 500;

/**
 * PncpService - Integration with Portal Nacional de Contratações Públicas
 *
 * Provides access to public procurement data under Lei 14.133/2021 (Nova Lei de Licitações).
 *
 * @example
 * ```typescript
 * const results = await pncpService.search('software', {
 *   startDate: new Date('2024-01-01'),
 *   endDate: new Date('2024-12-31'),
 *   uf: 'DF',
 * });
 * ```
 */
@Injectable()
export class PncpService implements IGovApiService {
  private readonly logger = new Logger(PncpService.name);
  private readonly client: GovApiClient;
  readonly source = 'pncp' as const;

  constructor(
    private readonly configService: ConfigService,
    private readonly cache: GovApiCache,
  ) {
    this.client = createGovApiClient(configService, {
      baseUrl: PNCP_BASE_URL,
      source: 'pncp',
      timeout: 30000,
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
        maxRequests: 60,
        windowMs: 60000,
        throwOnLimit: false,
      },
    });

    this.logger.log('PncpService initialized');
  }

  /**
   * Search for contracts matching the query
   *
   * @param query Search query (searches in objeto/description)
   * @param filters Optional filters including date range, UF, etc.
   * @returns Paginated search results normalized to GovApiSearchResult format
   */
  async search(
    query: string,
    filters?: GovApiFilterOptions,
  ): Promise<GovApiResponse<GovApiSearchResult[]>> {
    const cacheKey = this.buildCacheKey(
      'search',
      query,
      filters as Record<string, unknown>,
    );

    // Try cache first
    const cached = await this.cache.get<GovApiResponse<GovApiSearchResult[]>>(
      this.source,
      cacheKey,
    );
    if (cached) {
      return {
        ...cached,
        cached: true,
        status: cached.status || SearchStatus.SUCCESS,
      };
    }

    // Check circuit breaker before making request
    if (!this.client.isAvailable()) {
      this.logger.warn(
        'Circuit breaker is open, returning SERVICE_UNAVAILABLE response',
      );
      return this.createServiceUnavailableResponse('Circuit breaker is open');
    }

    // Build date range (default to last 30 days)
    const endDate = filters?.endDate || new Date();
    const startDate =
      filters?.startDate ||
      new Date(endDate.getTime() - DEFAULT_SEARCH_DAYS * 24 * 60 * 60 * 1000);

    const params: PncpContratacaoSearchParams = {
      dataInicial: this.formatDate(startDate),
      dataFinal: this.formatDate(endDate),
      pagina: filters?.page || 1,
      tamanhoPagina: Math.min(filters?.perPage || 100, MAX_PAGE_SIZE),
    };

    // Apply optional filters
    if (filters?.uf) {
      params.ufOrgao = filters.uf;
    }

    try {
      const response = await this.client.get<
        PncpPaginatedResponse<PncpContratacao>
      >('/v1/contratacoes', { params });

      // Filter by query text (PNCP API doesn't support text search directly)
      const queryLower = query.toLowerCase();
      const filteredData = response.data.filter(
        (item) =>
          item.objetoCompra?.toLowerCase().includes(queryLower) ||
          item.informacaoComplementar?.toLowerCase().includes(queryLower),
      );

      // Normalize to GovApiSearchResult
      const normalizedResults = filteredData.map((item) =>
        this.normalizeContratacao(item),
      );

      const result: GovApiResponse<GovApiSearchResult[]> = {
        data: normalizedResults,
        total: response.totalRegistros,
        page: response.numeroPagina,
        perPage: params.tamanhoPagina || 100,
        source: this.source,
        cached: false,
        isFallback: false,
        timestamp: new Date(),
        status: SearchStatus.SUCCESS,
        statusMessage: getStatusMessage(SearchStatus.SUCCESS),
      };

      // Cache the result
      await this.cache.set(this.source, cacheKey, result);

      return result;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Search failed: ${errorMessage}`);

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
   * Get a specific contratação by its PNCP control number
   *
   * @param id PNCP control number (e.g., "00000000000000-1-000001/2024")
   * @returns Single search result or null if not found
   */
  async getById(id: string): Promise<GovApiSearchResult | null> {
    const cacheKey = `getById:${id}`;

    // Try cache first
    const cached = await this.cache.get<GovApiSearchResult>(
      this.source,
      cacheKey,
    );
    if (cached) {
      return cached;
    }

    try {
      // PNCP uses the control number in the URL path
      // Format: /v1/orgaos/{cnpj}/compras/{ano}/{sequencial}
      const parsed = this.parseControlNumber(id);
      if (!parsed) {
        this.logger.warn(`Invalid PNCP control number format: ${id}`);
        return null;
      }

      const response = await this.client.get<PncpContratacao>(
        `/v1/orgaos/${parsed.cnpj}/compras/${parsed.ano}/${parsed.sequencial}`,
      );

      const result = this.normalizeContratacao(response);

      // Cache the result
      await this.cache.set(this.source, cacheKey, result);

      return result;
    } catch (error) {
      if (error instanceof Error && error.message.includes('404')) {
        return null;
      }
      this.logger.error(
        `GetById failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw error;
    }
  }

  /**
   * Search for contratações (procurements) by date range
   *
   * @param params Search parameters
   * @returns Paginated list of contratações
   */
  async searchContratacoes(
    params: PncpContratacaoSearchParams,
  ): Promise<PncpPaginatedResponse<PncpContratacao>> {
    const cacheKey = this.buildCacheKey(
      'contratacoes',
      '',
      params as unknown as Record<string, unknown>,
    );

    const cached = await this.cache.get<PncpPaginatedResponse<PncpContratacao>>(
      this.source,
      cacheKey,
    );
    if (cached) {
      return cached;
    }

    const response = await this.client.get<
      PncpPaginatedResponse<PncpContratacao>
    >('/v1/contratacoes', { params });

    await this.cache.set(this.source, cacheKey, response);

    return response;
  }

  /**
   * Search for contratos (contracts) by publication date
   *
   * @param params Search parameters
   * @returns Paginated list of contratos
   */
  async searchContratos(
    params: PncpContratoSearchParams,
  ): Promise<PncpPaginatedResponse<PncpContrato>> {
    const cacheKey = this.buildCacheKey(
      'contratos',
      '',
      params as unknown as Record<string, unknown>,
    );

    const cached = await this.cache.get<PncpPaginatedResponse<PncpContrato>>(
      this.source,
      cacheKey,
    );
    if (cached) {
      return cached;
    }

    const response = await this.client.get<PncpPaginatedResponse<PncpContrato>>(
      '/v1/contratos',
      { params },
    );

    await this.cache.set(this.source, cacheKey, response);

    return response;
  }

  /**
   * Search for atas de registro de preços by validity period
   *
   * @param params Search parameters
   * @returns Paginated list of atas
   */
  async searchAtas(
    params: PncpAtaSearchParams,
  ): Promise<PncpPaginatedResponse<PncpAta>> {
    const cacheKey = this.buildCacheKey(
      'atas',
      '',
      params as unknown as Record<string, unknown>,
    );

    const cached = await this.cache.get<PncpPaginatedResponse<PncpAta>>(
      this.source,
      cacheKey,
    );
    if (cached) {
      return cached;
    }

    const response = await this.client.get<PncpPaginatedResponse<PncpAta>>(
      '/v1/atas',
      { params },
    );

    await this.cache.set(this.source, cacheKey, response);

    return response;
  }

  /**
   * Search for contracts with extended filters
   *
   * @param filters Contract-specific filters
   * @returns Paginated list of contracts normalized to GovApiContract
   */
  async searchContracts(
    filters: ContractSearchFilters,
  ): Promise<GovApiResponse<GovApiContract[]>> {
    const endDate = filters.endDate || new Date();
    const startDate =
      filters.startDate ||
      new Date(endDate.getTime() - DEFAULT_SEARCH_DAYS * 24 * 60 * 60 * 1000);

    const params: PncpContratacaoSearchParams = {
      dataInicial: this.formatDate(startDate),
      dataFinal: this.formatDate(endDate),
      pagina: filters.page || 1,
      tamanhoPagina: Math.min(filters.perPage || 100, MAX_PAGE_SIZE),
    };

    if (filters.uf) {
      params.ufOrgao = filters.uf;
    }
    if (filters.cnpj) {
      params.cnpjOrgao = filters.cnpj;
    }
    if (filters.modalidade) {
      const modalidadeCode = this.parseModalidade(filters.modalidade);
      if (modalidadeCode) {
        params.codigoModalidadeContratacao = modalidadeCode;
      }
    }
    if (filters.status) {
      const situacaoCode = this.parseSituacao(filters.status);
      if (situacaoCode) {
        params.codigoSituacaoCompra = situacaoCode;
      }
    }

    const response = await this.searchContratacoes(params);

    // Filter by value range if specified
    let filteredData = response.data;
    if (filters.valorMinimo !== undefined) {
      filteredData = filteredData.filter(
        (item) =>
          item.valorTotalEstimado !== undefined &&
          item.valorTotalEstimado >= filters.valorMinimo!,
      );
    }
    if (filters.valorMaximo !== undefined) {
      filteredData = filteredData.filter(
        (item) =>
          item.valorTotalEstimado !== undefined &&
          item.valorTotalEstimado <= filters.valorMaximo!,
      );
    }

    const normalizedContracts = filteredData.map((item) =>
      this.normalizeToContract(item),
    );

    return {
      data: normalizedContracts,
      total: response.totalRegistros,
      page: response.numeroPagina,
      perPage: params.tamanhoPagina || 100,
      source: this.source,
      cached: false,
      isFallback: false,
      timestamp: new Date(),
    };
  }

  /**
   * Check PNCP API health
   *
   * @returns Health status including latency
   */
  async healthCheck(): Promise<GovApiHealthStatus> {
    const startTime = Date.now();

    try {
      // Use a lightweight endpoint for health check
      await this.client.healthCheck(
        '/v1/contratacoes?pagina=1&tamanhoPagina=1',
      );

      const latencyMs = Date.now() - startTime;
      const circuitState = this.client.getCircuitState();

      return {
        source: this.source,
        healthy: true,
        latencyMs,
        lastCheck: new Date(),
        circuitState: circuitState.opened
          ? 'open'
          : circuitState.halfOpen
            ? 'half-open'
            : 'closed',
      };
    } catch (error) {
      const latencyMs = Date.now() - startTime;
      const circuitState = this.client.getCircuitState();

      return {
        source: this.source,
        healthy: false,
        latencyMs,
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
   * Get cache statistics for this API
   */
  getCacheStats(): { hits: number; misses: number; keys: number } {
    const stats = this.cache.getStats(this.source);
    return {
      hits: stats.hits,
      misses: stats.misses,
      keys: 0, // Would need async call to get actual count
    };
  }

  /**
   * Normalize PNCP contratação to standard GovApiSearchResult
   */
  private normalizeContratacao(item: PncpContratacao): GovApiSearchResult {
    return {
      id: item.numeroControlePNCP,
      title: this.truncate(item.objetoCompra, 200),
      description: this.buildDescription(item),
      source: this.source,
      url: `https://pncp.gov.br/app/editais/${item.numeroControlePNCP}`,
      relevance: 1.0,
      metadata: {
        ano: item.anoCompra,
        modalidade: item.modalidadeNome,
        situacao: item.situacaoCompraNome,
        valorEstimado: item.valorTotalEstimado,
        valorHomologado: item.valorTotalHomologado,
        dataPublicacao: item.dataPublicacaoPncp,
        dataAbertura: item.dataAberturaProposta,
        orgao: item.orgaoEntidade?.razaoSocial,
        cnpjOrgao: item.orgaoEntidade?.cnpj,
        uf: item.unidadeOrgao?.ufSigla,
        municipio: item.unidadeOrgao?.municipioNome,
        srp: item.srp,
      },
      fetchedAt: new Date(),
    };
  }

  /**
   * Normalize PNCP contratação to GovApiContract
   */
  private normalizeToContract(item: PncpContratacao): GovApiContract {
    return {
      id: item.numeroControlePNCP,
      title: this.truncate(item.objetoCompra, 200),
      description: this.buildDescription(item),
      source: this.source,
      url: `https://pncp.gov.br/app/editais/${item.numeroControlePNCP}`,
      relevance: 1.0,
      fetchedAt: new Date(),
      numero: item.numeroCompra || item.sequencialCompra.toString(),
      ano: item.anoCompra,
      orgaoContratante: {
        cnpj: item.orgaoEntidade?.cnpj || '',
        nome: item.orgaoEntidade?.razaoSocial || '',
        uf: item.unidadeOrgao?.ufSigla || '',
      },
      objeto: item.objetoCompra,
      valorTotal: item.valorTotalEstimado || 0,
      modalidade: item.modalidadeNome || '',
      status: item.situacaoCompraNome || '',
      dataPublicacao: new Date(item.dataPublicacaoPncp),
      dataAbertura: item.dataAberturaProposta
        ? new Date(item.dataAberturaProposta)
        : undefined,
    };
  }

  /**
   * Build description from contratação data
   */
  private buildDescription(item: PncpContratacao): string {
    const parts: string[] = [];

    if (item.modalidadeNome) {
      parts.push(`Modalidade: ${item.modalidadeNome}`);
    }
    if (item.situacaoCompraNome) {
      parts.push(`Situação: ${item.situacaoCompraNome}`);
    }
    if (item.orgaoEntidade?.razaoSocial) {
      parts.push(`Órgão: ${item.orgaoEntidade.razaoSocial}`);
    }
    if (item.valorTotalEstimado) {
      parts.push(
        `Valor estimado: ${this.formatCurrency(item.valorTotalEstimado)}`,
      );
    }
    if (item.informacaoComplementar) {
      parts.push(this.truncate(item.informacaoComplementar, 200));
    }

    return parts.join(' | ');
  }

  /**
   * Build cache key from parameters
   */
  private buildCacheKey(
    operation: string,
    query: string,
    params?: Record<string, unknown>,
  ): string {
    const paramsStr = params ? JSON.stringify(params) : '';
    return `${operation}:${query}:${paramsStr}`;
  }

  /**
   * Format date to PNCP format (YYYYMMDD)
   */
  private formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}${month}${day}`;
  }

  /**
   * Format currency value to BRL
   */
  private formatCurrency(value: number): string {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  }

  /**
   * Truncate string to max length
   */
  private truncate(str: string, maxLength: number): string {
    if (!str) return '';
    if (str.length <= maxLength) return str;
    return str.substring(0, maxLength - 3) + '...';
  }

  /**
   * Parse PNCP control number to extract components
   * Format: CNPJ-TIPO-SEQUENCIAL/ANO
   */
  private parseControlNumber(
    controlNumber: string,
  ): { cnpj: string; ano: string; sequencial: string } | null {
    // Format: 99999999999999-1-999999/9999
    const match = controlNumber.match(/^(\d{14})-(\d)-(\d{6})\/(\d{4})$/);
    if (!match) {
      return null;
    }

    return {
      cnpj: match[1],
      ano: match[4],
      sequencial: match[3],
    };
  }

  /**
   * Parse modalidade string to code
   */
  private parseModalidade(modalidade: string): number | null {
    const lower = modalidade.toLowerCase();
    for (const [code, name] of Object.entries(PNCP_MODALIDADE_NAMES)) {
      if (name.toLowerCase().includes(lower)) {
        return parseInt(code, 10);
      }
    }
    return null;
  }

  /**
   * Parse status string to situação code
   */
  private parseSituacao(status: string): number | null {
    const statusMap: Record<string, number> = {
      aberto: 1,
      divulgada: 1,
      encerrado: 2,
      revogada: 2,
      homologado: 1,
      anulada: 3,
      cancelado: 3,
      suspensa: 4,
    };
    return statusMap[status.toLowerCase()] || null;
  }

  /**
   * Create a SERVICE_UNAVAILABLE response when API is down or circuit breaker is open
   */
  private createServiceUnavailableResponse(
    error: string,
  ): GovApiResponse<GovApiSearchResult[]> {
    return {
      data: [],
      total: 0,
      page: 1,
      perPage: MAX_PAGE_SIZE,
      source: this.source,
      cached: false,
      isFallback: true,
      timestamp: new Date(),
      status: SearchStatus.SERVICE_UNAVAILABLE,
      statusMessage: getStatusMessage(SearchStatus.SERVICE_UNAVAILABLE),
      sourceStatuses: [
        {
          name: this.source,
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
  ): GovApiResponse<GovApiSearchResult[]> {
    return {
      data: [],
      total: 0,
      page: 1,
      perPage: MAX_PAGE_SIZE,
      source: this.source,
      cached: false,
      isFallback: true,
      timestamp: new Date(),
      status: SearchStatus.TIMEOUT,
      statusMessage: getStatusMessage(SearchStatus.TIMEOUT),
      sourceStatuses: [
        {
          name: this.source,
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
  ): GovApiResponse<GovApiSearchResult[]> {
    return {
      data: [],
      total: 0,
      page: 1,
      perPage: MAX_PAGE_SIZE,
      source: this.source,
      cached: false,
      isFallback: true,
      timestamp: new Date(),
      status: SearchStatus.RATE_LIMITED,
      statusMessage: getStatusMessage(SearchStatus.RATE_LIMITED),
      sourceStatuses: [
        {
          name: this.source,
          status: SearchStatus.RATE_LIMITED,
          error,
        },
      ],
    };
  }
}
