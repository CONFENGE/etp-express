/**
 * SINAPI API Client Service
 *
 * REST client for SINAPI integration via Orcamentador API.
 * Provides structured access to SINAPI data with caching, rate limiting,
 * and comprehensive error handling.
 *
 * @module modules/gov-api/sinapi
 * @see https://orcamentador.com.br/api/docs
 * @see https://github.com/CONFENGE/etp-express/issues/1565
 */

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { AxiosResponse, AxiosError, AxiosRequestConfig } from 'axios';
import { firstValueFrom } from 'rxjs';
import { GovApiCache } from '../utils/gov-api-cache';
import {
  SinapiApiSearchParams,
  SinapiApiInsumo,
  SinapiApiComposicao,
  SinapiApiComposicaoDetail,
  SinapiApiComposicaoExploded,
  SinapiApiHistorico,
  SinapiApiEncargos,
  SinapiApiEstado,
  SinapiApiIndicadores,
  SinapiApiAtualizacao,
  SinapiApiStatus,
  SinapiApiRateLimitInfo,
  SinapiApiUsage,
  SinapiApiPaginatedResponse,
  SinapiApiConfig,
  buildSinapiApiCacheKey,
} from './sinapi-api.types';

/**
 * Custom error for SINAPI API authentication failures
 */
export class SinapiApiAuthError extends Error {
  constructor(message: string = 'Authentication failed') {
    super(message);
    this.name = 'SinapiApiAuthError';
  }
}

/**
 * Custom error for SINAPI API rate limit exceeded
 */
export class SinapiApiRateLimitError extends Error {
  public readonly retryAfter: number;
  public readonly rateLimitInfo?: SinapiApiRateLimitInfo;

  constructor(
    message: string = 'Rate limit exceeded',
    retryAfter: number = 60,
    rateLimitInfo?: SinapiApiRateLimitInfo,
  ) {
    super(message);
    this.name = 'SinapiApiRateLimitError';
    this.retryAfter = retryAfter;
    this.rateLimitInfo = rateLimitInfo;
  }
}

/**
 * Custom error for SINAPI API not found
 */
export class SinapiApiNotFoundError extends Error {
  constructor(message: string = 'Resource not found') {
    super(message);
    this.name = 'SinapiApiNotFoundError';
  }
}

/**
 * Custom error for SINAPI API server errors
 */
export class SinapiApiServerError extends Error {
  public readonly statusCode: number;

  constructor(message: string = 'Server error', statusCode: number = 500) {
    super(message);
    this.name = 'SinapiApiServerError';
    this.statusCode = statusCode;
  }
}

/**
 * Default API configuration
 */
const DEFAULT_CONFIG: Partial<SinapiApiConfig> = {
  baseUrl: 'https://orcamentador.com.br/api/v1',
  timeout: 30000,
  cacheTtl: 86400, // 24 hours
  enableRetry: true,
  maxRetries: 3,
};

/**
 * Cache TTL constants
 */
const CACHE_TTL = {
  /** 24 hours for price data (updates monthly) */
  PRICES: 86400,
  /** 1 hour for status checks */
  STATUS: 3600,
  /** 7 days for static data like states */
  STATIC: 604800,
  /** 12 hours for indicators */
  INDICATORS: 43200,
};

/**
 * SinapiApiClientService - REST client for SINAPI API via Orcamentador
 *
 * Features:
 * - All SINAPI endpoints with typed responses
 * - Redis caching with configurable TTL
 * - Rate limit handling with exponential backoff
 * - Comprehensive error handling with custom exceptions
 * - Request/response logging for debugging
 *
 * @example
 * ```typescript
 * const client = new SinapiApiClientService(configService, httpService, cache);
 *
 * // Search for insumos
 * const insumos = await client.searchInsumos({
 *   nome: 'cimento',
 *   estado: 'DF',
 *   referencia: '2024-01-01',
 * });
 *
 * // Get composition details
 * const detail = await client.getComposicaoDetails(12345, 'DF');
 * ```
 */
@Injectable()
export class SinapiApiClientService implements OnModuleInit {
  private readonly logger = new Logger(SinapiApiClientService.name);
  private config!: SinapiApiConfig;
  private rateLimitInfo: SinapiApiRateLimitInfo | null = null;
  private lastRequestTime: number = 0;

  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
    private readonly cache: GovApiCache,
  ) {}

  /**
   * Initialize configuration on module init
   */
  onModuleInit(): void {
    this.config = {
      baseUrl:
        this.configService.get<string>('SINAPI_API_URL') ||
        DEFAULT_CONFIG.baseUrl!,
      apiKey: this.configService.get<string>('SINAPI_API_KEY') || '',
      timeout:
        this.configService.get<number>('SINAPI_API_TIMEOUT') ||
        DEFAULT_CONFIG.timeout!,
      cacheTtl:
        this.configService.get<number>('SINAPI_API_CACHE_TTL') ||
        DEFAULT_CONFIG.cacheTtl!,
      enableRetry:
        this.configService.get<boolean>('SINAPI_API_ENABLE_RETRY') ??
        DEFAULT_CONFIG.enableRetry!,
      maxRetries:
        this.configService.get<number>('SINAPI_API_MAX_RETRIES') ||
        DEFAULT_CONFIG.maxRetries!,
    };

    if (!this.config.apiKey) {
      this.logger.warn(
        'SINAPI_API_KEY not configured - API requests will fail',
      );
    } else {
      this.logger.log('SinapiApiClientService initialized');
    }
  }

  /**
   * Check if API is configured
   * Handles case where onModuleInit hasn't been called yet
   */
  isConfigured(): boolean {
    // If config hasn't been initialized yet, check directly from ConfigService
    if (!this.config) {
      const apiKey = this.configService.get<string>('SINAPI_API_KEY');
      return !!apiKey;
    }
    return !!this.config.apiKey;
  }

  // ============================================================
  // Insumos Endpoints
  // ============================================================

  /**
   * Search for insumos (inputs/materials)
   *
   * @param filters Search filters
   * @returns Paginated list of insumos
   */
  async searchInsumos(
    filters: SinapiApiSearchParams,
  ): Promise<SinapiApiPaginatedResponse<SinapiApiInsumo>> {
    const cacheKey = buildSinapiApiCacheKey('insumos', filters);
    const cached = await this.cache.get<
      SinapiApiPaginatedResponse<SinapiApiInsumo>
    >('sinapi', cacheKey);

    if (cached) {
      this.logger.debug('Cache hit for searchInsumos');
      return cached;
    }

    const response = await this.request<
      SinapiApiPaginatedResponse<SinapiApiInsumo>
    >('GET', '/insumos', filters);

    await this.cache.set('sinapi', cacheKey, response, CACHE_TTL.PRICES);
    return response;
  }

  /**
   * Get insumo by code
   *
   * @param codigo Insumo code
   * @param estado State (UF)
   * @returns Insumo details or null if not found
   */
  async getInsumo(
    codigo: number,
    estado: string,
  ): Promise<SinapiApiInsumo | null> {
    const cacheKey = buildSinapiApiCacheKey(`insumo:${codigo}:${estado}`, {});
    const cached = await this.cache.get<SinapiApiInsumo>('sinapi', cacheKey);

    if (cached) {
      return cached;
    }

    try {
      const response = await this.request<SinapiApiInsumo>(
        'GET',
        `/insumos/${codigo}`,
        { estado },
      );
      await this.cache.set('sinapi', cacheKey, response, CACHE_TTL.PRICES);
      return response;
    } catch (error) {
      if (error instanceof SinapiApiNotFoundError) {
        return null;
      }
      throw error;
    }
  }

  // ============================================================
  // Composicoes Endpoints
  // ============================================================

  /**
   * Search for composicoes (compositions)
   *
   * @param filters Search filters
   * @returns Paginated list of composicoes
   */
  async searchComposicoes(
    filters: SinapiApiSearchParams,
  ): Promise<SinapiApiPaginatedResponse<SinapiApiComposicao>> {
    const cacheKey = buildSinapiApiCacheKey('composicoes', filters);
    const cached = await this.cache.get<
      SinapiApiPaginatedResponse<SinapiApiComposicao>
    >('sinapi', cacheKey);

    if (cached) {
      this.logger.debug('Cache hit for searchComposicoes');
      return cached;
    }

    const response = await this.request<
      SinapiApiPaginatedResponse<SinapiApiComposicao>
    >('GET', '/composicoes', filters);

    await this.cache.set('sinapi', cacheKey, response, CACHE_TTL.PRICES);
    return response;
  }

  /**
   * Get composicao details with breakdown
   *
   * @param codigo Composicao code
   * @param estado State (UF)
   * @returns Composicao details with items or null
   */
  async getComposicaoDetails(
    codigo: number,
    estado: string,
  ): Promise<SinapiApiComposicaoDetail | null> {
    const cacheKey = buildSinapiApiCacheKey(
      `composicao:${codigo}:${estado}`,
      {},
    );
    const cached = await this.cache.get<SinapiApiComposicaoDetail>(
      'sinapi',
      cacheKey,
    );

    if (cached) {
      return cached;
    }

    try {
      const response = await this.request<SinapiApiComposicaoDetail>(
        'GET',
        `/composicoes/${codigo}`,
        { estado },
      );
      await this.cache.set('sinapi', cacheKey, response, CACHE_TTL.PRICES);
      return response;
    } catch (error) {
      if (error instanceof SinapiApiNotFoundError) {
        return null;
      }
      throw error;
    }
  }

  /**
   * Get composicao with all nested items exploded
   *
   * @param codigo Composicao code
   * @param estado State (UF)
   * @returns Exploded composicao with all insumos or null
   */
  async getComposicaoExploded(
    codigo: number,
    estado: string,
  ): Promise<SinapiApiComposicaoExploded | null> {
    const cacheKey = buildSinapiApiCacheKey(
      `composicao-exploded:${codigo}:${estado}`,
      {},
    );
    const cached = await this.cache.get<SinapiApiComposicaoExploded>(
      'sinapi',
      cacheKey,
    );

    if (cached) {
      return cached;
    }

    try {
      const response = await this.request<SinapiApiComposicaoExploded>(
        'GET',
        `/composicoes/${codigo}/exploded`,
        { estado },
      );
      await this.cache.set('sinapi', cacheKey, response, CACHE_TTL.PRICES);
      return response;
    } catch (error) {
      if (error instanceof SinapiApiNotFoundError) {
        return null;
      }
      throw error;
    }
  }

  // ============================================================
  // Historico Endpoint
  // ============================================================

  /**
   * Get price history for an item
   *
   * @param codigo Item code
   * @param estado State (UF)
   * @param periodo Period in months (e.g., "12" for last 12 months)
   * @returns Price history array
   */
  async getHistorico(
    codigo: number,
    estado: string,
    periodo: string = '12',
  ): Promise<SinapiApiHistorico[]> {
    const cacheKey = buildSinapiApiCacheKey(
      `historico:${codigo}:${estado}:${periodo}`,
      {},
    );
    const cached = await this.cache.get<SinapiApiHistorico[]>(
      'sinapi',
      cacheKey,
    );

    if (cached) {
      return cached;
    }

    const response = await this.request<SinapiApiHistorico[]>(
      'GET',
      `/historico/${codigo}`,
      { estado, periodo },
    );

    await this.cache.set('sinapi', cacheKey, response, CACHE_TTL.PRICES);
    return response;
  }

  // ============================================================
  // Encargos Endpoint
  // ============================================================

  /**
   * Get encargos sociais (social charges) for a state
   *
   * @param estado State (UF)
   * @param regime Tax regime
   * @returns Encargos sociais
   */
  async getEncargos(
    estado: string,
    regime: 'DESONERADO' | 'NAO_DESONERADO' = 'NAO_DESONERADO',
  ): Promise<SinapiApiEncargos> {
    const cacheKey = buildSinapiApiCacheKey(`encargos:${estado}:${regime}`, {});
    const cached = await this.cache.get<SinapiApiEncargos>('sinapi', cacheKey);

    if (cached) {
      return cached;
    }

    const response = await this.request<SinapiApiEncargos>('GET', '/encargos', {
      estado,
      regime,
    });

    await this.cache.set('sinapi', cacheKey, response, CACHE_TTL.STATIC);
    return response;
  }

  // ============================================================
  // Metadata Endpoints
  // ============================================================

  /**
   * Get list of available states
   *
   * @returns List of states with availability info
   */
  async getEstados(): Promise<SinapiApiEstado[]> {
    const cacheKey = buildSinapiApiCacheKey('estados', {});
    const cached = await this.cache.get<SinapiApiEstado[]>('sinapi', cacheKey);

    if (cached) {
      return cached;
    }

    const response = await this.request<SinapiApiEstado[]>('GET', '/estados');

    await this.cache.set('sinapi', cacheKey, response, CACHE_TTL.STATIC);
    return response;
  }

  /**
   * Get economic indicators (CUB, INCC, etc.)
   *
   * @returns Current indicators
   */
  async getIndicadores(): Promise<SinapiApiIndicadores> {
    const cacheKey = buildSinapiApiCacheKey('indicadores', {});
    const cached = await this.cache.get<SinapiApiIndicadores>(
      'sinapi',
      cacheKey,
    );

    if (cached) {
      return cached;
    }

    const response = await this.request<SinapiApiIndicadores>(
      'GET',
      '/indicadores',
    );

    await this.cache.set('sinapi', cacheKey, response, CACHE_TTL.INDICATORS);
    return response;
  }

  /**
   * Get last update information
   *
   * @returns Update info with available reference month
   */
  async getLastUpdate(): Promise<SinapiApiAtualizacao> {
    const cacheKey = buildSinapiApiCacheKey('atualizacao', {});
    const cached = await this.cache.get<SinapiApiAtualizacao>(
      'sinapi',
      cacheKey,
    );

    if (cached) {
      return cached;
    }

    const response = await this.request<SinapiApiAtualizacao>(
      'GET',
      '/atualizacao',
    );

    await this.cache.set('sinapi', cacheKey, response, CACHE_TTL.STATUS);
    return response;
  }

  /**
   * Check API status
   *
   * @returns API status info
   */
  async checkStatus(): Promise<SinapiApiStatus> {
    // Don't cache status - always check live
    return this.request<SinapiApiStatus>('GET', '/status');
  }

  /**
   * Get API usage statistics
   *
   * @returns Usage info for current API key
   */
  async getUsage(): Promise<SinapiApiUsage> {
    // Don't cache usage - always check live
    return this.request<SinapiApiUsage>('GET', '/usage');
  }

  // ============================================================
  // Rate Limit Information
  // ============================================================

  /**
   * Get current rate limit information
   *
   * @returns Rate limit info from last request, or null if no requests made
   */
  getRateLimitInfo(): SinapiApiRateLimitInfo | null {
    return this.rateLimitInfo;
  }

  /**
   * Check if approaching rate limit (< 10% remaining)
   *
   * @returns True if should slow down requests
   */
  isApproachingRateLimit(): boolean {
    if (!this.rateLimitInfo) {
      return false;
    }

    const thresholdPercent = 0.1;
    const remainingPercent =
      this.rateLimitInfo.remaining / this.rateLimitInfo.limit;

    return remainingPercent < thresholdPercent;
  }

  // ============================================================
  // Private Methods
  // ============================================================

  /**
   * Build request headers including API key
   */
  private buildHeaders(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.config.apiKey}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'User-Agent': 'ETP-Express/1.0',
    };
  }

  /**
   * Extract rate limit info from response headers
   */
  private extractRateLimitInfo(response: AxiosResponse): void {
    const headers = response.headers;

    this.rateLimitInfo = {
      limit: parseInt(headers['x-ratelimit-limit'] || '1000', 10),
      remaining: parseInt(headers['x-ratelimit-remaining'] || '1000', 10),
      reset: parseInt(headers['x-ratelimit-reset'] || '0', 10),
      monthlyLimit: parseInt(
        headers['x-ratelimit-monthly-limit'] || '10000',
        10,
      ),
      monthlyUsed: parseInt(headers['x-ratelimit-monthly-used'] || '0', 10),
      monthlyRemaining: parseInt(
        headers['x-ratelimit-monthly-remaining'] || '10000',
        10,
      ),
    };

    // Log warning if approaching limit
    if (this.isApproachingRateLimit()) {
      this.logger.warn(
        `SINAPI API rate limit warning: ${this.rateLimitInfo.remaining}/${this.rateLimitInfo.limit} remaining`,
      );
    }
  }

  /**
   * Handle API errors with appropriate exceptions
   */
  private handleError(error: AxiosError): never {
    const status = error.response?.status;
    const data = error.response?.data as Record<string, unknown> | undefined;
    const message =
      (data?.message as string) || error.message || 'Unknown error';

    if (status === 401 || status === 403) {
      throw new SinapiApiAuthError(message);
    }

    if (status === 404) {
      throw new SinapiApiNotFoundError(message);
    }

    if (status === 429) {
      const retryAfter = parseInt(
        (error.response?.headers?.['retry-after'] as string) || '60',
        10,
      );
      throw new SinapiApiRateLimitError(
        message,
        retryAfter,
        this.rateLimitInfo || undefined,
      );
    }

    if (status && status >= 500) {
      throw new SinapiApiServerError(message, status);
    }

    // Generic error
    throw new Error(`SINAPI API error: ${message}`);
  }

  /**
   * Make HTTP request to API with retry logic
   */
  private async request<T>(
    method: 'GET' | 'POST',
    endpoint: string,
    params?: SinapiApiSearchParams | Record<string, unknown>,
  ): Promise<T> {
    if (!this.config.apiKey) {
      throw new SinapiApiAuthError('API key not configured');
    }

    const url = `${this.config.baseUrl}${endpoint}`;
    const startTime = Date.now();

    const requestConfig: AxiosRequestConfig = {
      method,
      url,
      headers: this.buildHeaders(),
      timeout: this.config.timeout,
      params: method === 'GET' ? params : undefined,
      data: method === 'POST' ? params : undefined,
    };

    let lastError: Error | null = null;
    const maxAttempts = this.config.enableRetry ? this.config.maxRetries : 1;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        this.lastRequestTime = Date.now();

        const response = await firstValueFrom(
          this.httpService.request<T>(requestConfig),
        );

        // Extract rate limit info
        this.extractRateLimitInfo(response);

        const duration = Date.now() - startTime;
        this.logger.debug(
          `SINAPI API ${method} ${endpoint} completed in ${duration}ms (attempt ${attempt})`,
        );

        return response.data;
      } catch (error) {
        lastError = error as Error;

        // Don't retry on auth or not found errors
        if (
          error instanceof SinapiApiAuthError ||
          error instanceof SinapiApiNotFoundError
        ) {
          throw error;
        }

        // Handle Axios errors
        if ((error as AxiosError).isAxiosError) {
          const axiosError = error as AxiosError;

          // Extract rate limit info even from errors
          if (axiosError.response) {
            this.extractRateLimitInfo(axiosError.response);
          }

          // Don't retry on 4xx errors (except 429)
          const status = axiosError.response?.status;
          if (status && status >= 400 && status < 500 && status !== 429) {
            this.handleError(axiosError);
          }

          // On rate limit, wait and retry
          if (status === 429) {
            const retryAfter = parseInt(
              (axiosError.response?.headers?.['retry-after'] as string) || '60',
              10,
            );

            if (attempt < maxAttempts) {
              this.logger.warn(
                `Rate limited, waiting ${retryAfter}s before retry (attempt ${attempt}/${maxAttempts})`,
              );
              await this.sleep(retryAfter * 1000);
              continue;
            }
          }
        }

        // Exponential backoff for retries
        if (attempt < maxAttempts) {
          const backoffMs = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
          this.logger.warn(
            `Request failed, retrying in ${backoffMs}ms (attempt ${attempt}/${maxAttempts}): ${lastError.message}`,
          );
          await this.sleep(backoffMs);
        }
      }
    }

    // All retries exhausted
    const duration = Date.now() - startTime;
    this.logger.error(
      `SINAPI API ${method} ${endpoint} failed after ${maxAttempts} attempts in ${duration}ms`,
    );

    if ((lastError as AxiosError)?.isAxiosError) {
      this.handleError(lastError as AxiosError);
    }

    throw lastError;
  }

  /**
   * Sleep helper for retry delays
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
