import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosError } from 'axios';
import CircuitBreaker from 'opossum';
import NodeCache from 'node-cache';
import { createHash } from 'crypto';
import { withRetry, RetryOptions } from '../../../common/utils/retry';

export interface PerplexitySearchResult {
  title: string;
  snippet: string;
  url?: string;
  relevance: number;
  source: string;
}

export interface PerplexityResponse {
  results: PerplexitySearchResult[];
  summary: string;
  sources: string[];
  /** Indica se o resultado foi obtido via fallback (quando circuit breaker está aberto) */
  isFallback?: boolean;
}

export interface FactCheckResult {
  reference: string;
  exists: boolean;
  source: string;
  description: string;
  confidence: number;
}

interface PerplexityAPIResponse {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
  citations?: string[];
}

/** Disclaimer exibido quando busca externa está indisponível */
const FALLBACK_DISCLAIMER =
  '⚠️ Busca externa temporariamente indisponível. Informações de mercado podem estar incompletas.';

@Injectable()
export class PerplexityService {
  private readonly logger = new Logger(PerplexityService.name);
  private readonly apiKey: string;
  private readonly model: string;
  private readonly apiUrl = 'https://api.perplexity.ai/chat/completions';
  private readonly circuitBreaker: CircuitBreaker;
  private readonly retryOptions: Partial<RetryOptions>;
  private readonly cache: NodeCache;

  constructor(private configService: ConfigService) {
    // Configure retry options for Perplexity API
    // Perplexity has higher timeouts, so we adjust retry delays accordingly
    this.retryOptions = {
      maxRetries: 3,
      baseDelay: 2000, // Longer base delay for Perplexity (slower API)
      maxDelay: 15000,
      retryableErrors: [
        'ETIMEDOUT',
        'ECONNRESET',
        'ECONNREFUSED',
        '429', // Rate limit
        '500',
        '502',
        '503',
        '504',
        'rate_limit',
        'timeout',
        'network error',
      ],
      logger: this.logger,
      operationName: 'Perplexity API',
    };
    this.apiKey = this.configService.get<string>('PERPLEXITY_API_KEY') || '';
    this.model = this.configService.get<string>(
      'PERPLEXITY_MODEL',
      'pplx-7b-online',
    );

    // Initialize cache with 7-day TTL (604800 seconds)
    this.cache = new NodeCache({
      stdTTL: 604800, // 7 days
      checkperiod: 3600, // Check for expired keys every hour
      useClones: false, // Performance optimization - don't clone cached objects
    });

    // Initialize Circuit Breaker for Perplexity API
    // Perplexity API is slower than OpenAI, so we use higher timeout
    this.circuitBreaker = new CircuitBreaker(
      (query: string) => this.callPerplexity(query),
      {
        timeout: 45000, // 45s timeout (API mais lenta)
        errorThresholdPercentage: 50, // Abre após 50% de erros
        resetTimeout: 60000, // Tenta novamente após 60s
        volumeThreshold: 3, // Mínimo de requests para avaliar
      },
    );

    // Circuit Breaker event listeners for monitoring
    this.circuitBreaker.on('open', () => {
      this.logger.warn(
        'Perplexity circuit breaker OPENED - too many failures, using fallback',
      );
    });

    this.circuitBreaker.on('halfOpen', () => {
      this.logger.log(
        'Perplexity circuit breaker half-open, testing connection...',
      );
    });

    this.circuitBreaker.on('close', () => {
      this.logger.log('Perplexity circuit breaker CLOSED - service healthy');
    });

    this.circuitBreaker.on('timeout', () => {
      this.logger.warn('Perplexity API request timed out');
    });

    this.circuitBreaker.on('reject', () => {
      this.logger.warn('Perplexity request rejected - circuit is open');
    });
  }

  /**
   * Searches using Perplexity API with caching support.
   * Cache is checked first, and only misses trigger API calls.
   * Fallback responses are NOT cached to ensure retries on recovery.
   *
   * @param query - Search query string
   * @returns Promise<PerplexityResponse> - Search results with cache metadata
   *
   * @remarks
   * - Cache TTL: 7 days (604800s)
   * - Cache key: SHA-256 hash of normalized query
   * - Fallback responses are never cached
   * - Logs include Cache HIT/MISS for monitoring
   *
   * @example
   * const results = await perplexityService.search('Lei 14.133/2021');
   * // First call: Cache MISS → API call → cached
   * // Second call: Cache HIT → instant return
   */
  async search(query: string): Promise<PerplexityResponse> {
    this.logger.log(`Searching with Perplexity: ${query}`);

    // Generate cache key from normalized query
    const cacheKey = this.generateCacheKey(query);

    // Check cache first
    const cached = this.cache.get<PerplexityResponse>(cacheKey);
    if (cached) {
      this.logger.log(
        `Cache HIT for query: ${query.substring(0, 50)}... (key: ${cacheKey.substring(0, 16)}...)`,
      );
      return cached;
    }

    this.logger.log(
      `Cache MISS for query: ${query.substring(0, 50)}... - calling Perplexity API`,
    );

    try {
      const response = (await this.circuitBreaker.fire(
        query,
      )) as PerplexityResponse;

      // Only cache successful responses (NOT fallback responses)
      if (!response.isFallback) {
        this.cache.set(cacheKey, response);
        this.logger.log(
          `Response cached with key: ${cacheKey.substring(0, 16)}... (TTL: 7 days)`,
        );
      } else {
        this.logger.warn(
          'Fallback response NOT cached - will retry on next request',
        );
      }

      return response;
    } catch (error) {
      // Circuit breaker opened - return fallback response instead of throwing
      if (error.code === 'EOPENBREAKER') {
        this.logger.warn(
          'Perplexity circuit breaker is open - returning fallback response',
        );
        return this.getFallbackResponse();
      }

      // Timeout - return fallback response
      if (error.code === 'ETIMEDOUT') {
        this.logger.warn(
          'Perplexity request timed out - returning fallback response',
        );
        return this.getFallbackResponse();
      }

      // Other errors - log and return fallback for graceful degradation
      const axiosError = error as AxiosError;
      this.logger.error('Perplexity API failed', {
        query,
        error: axiosError.message,
      });
      return this.getFallbackResponse();
    }
  }

  /**
   * Calls Perplexity API directly (used by circuit breaker)
   * @param query Search query string
   * @returns Perplexity response with results
   */
  private async callPerplexity(query: string): Promise<PerplexityResponse> {
    // Wrap API call with retry logic for transient failures
    const response = await withRetry(
      () =>
        axios.post<PerplexityAPIResponse>(
          this.apiUrl,
          {
            model: this.model,
            messages: [
              {
                role: 'system',
                content:
                  'Você é um assistente especializado em encontrar informações sobre contratações públicas brasileiras. Forneça informações precisas e cite as fontes.',
              },
              {
                role: 'user',
                content: query,
              },
            ],
          },
          {
            headers: {
              Authorization: `Bearer ${this.apiKey}`,
              'Content-Type': 'application/json',
            },
            timeout: 30000,
          },
        ),
      this.retryOptions,
    );

    const content = response.data.choices?.[0]?.message?.content || '';
    const citations = response.data.citations || [];

    // Parse results from content
    const results = this.parseResults(content, citations);

    this.logger.log(
      `Perplexity search completed. Found ${results.length} results`,
    );

    return {
      results,
      summary: content,
      sources: citations,
      isFallback: false,
    };
  }

  /**
   * Returns a fallback response when Perplexity API is unavailable
   * Enables graceful degradation - ETP generation continues without external search
   */
  private getFallbackResponse(): PerplexityResponse {
    return {
      results: [],
      summary: FALLBACK_DISCLAIMER,
      sources: [],
      isFallback: true,
    };
  }

  private parseResults(
    content: string,
    citations: string[],
  ): PerplexitySearchResult[] {
    const results: PerplexitySearchResult[] = [];

    // Try to extract structured information from content
    const lines = content.split('\n').filter((line) => line.trim().length > 0);

    citations.forEach((citation, index) => {
      results.push({
        title: `Fonte ${index + 1}`,
        snippet: lines[index] || citation,
        url: citation.startsWith('http') ? citation : undefined,
        relevance: 1 - index * 0.1,
        source: 'Perplexity AI',
      });
    });

    return results;
  }

  async searchSimilarContracts(
    objeto: string,
    _filters?: Record<string, unknown>,
  ): Promise<PerplexityResponse> {
    const query = `Busque informações sobre contratações públicas similares a: "${objeto}".
    Inclua informações sobre:
    - Órgãos que realizaram contratações similares
    - Valores praticados
    - Modalidades utilizadas
    - Links para processos ou documentos relacionados

    Foque em dados do Brasil e cite as fontes oficiais.`;

    return this.search(query);
  }

  async searchLegalReferences(topic: string): Promise<PerplexityResponse> {
    const query = `Busque informações sobre a base legal para: "${topic}" no contexto de contratações públicas brasileiras.
    Inclua referências a:
    - Lei 14.133/2021
    - Instruções Normativas da SEGES
    - Jurisprudência do TCU
    - Outros normativos aplicáveis

    Cite as fontes oficiais e artigos específicos quando possível.`;

    return this.search(query);
  }

  /**
   * Get the current state of the circuit breaker for monitoring
   * @returns Circuit breaker state including stats and status flags
   */
  getCircuitState() {
    return {
      stats: this.circuitBreaker.stats,
      opened: this.circuitBreaker.opened,
      halfOpen: this.circuitBreaker.halfOpen,
      closed: this.circuitBreaker.closed,
    };
  }

  /**
   * Fact-checks a legal reference using Perplexity AI.
   * Used as fallback when reference is not found in local RAG database.
   * @param reference Legal reference object with type, number and year
   * @returns FactCheckResult with existence status and description
   */
  async factCheckLegalReference(reference: {
    type: string;
    number: string;
    year: number;
  }): Promise<FactCheckResult> {
    const query = `Verifique se existe a ${reference.type} ${reference.number}/${reference.year} no ordenamento jurídico brasileiro. Responda APENAS:

1. "EXISTE" ou "NÃO EXISTE"
2. Se existir, forneça uma breve descrição (máximo 100 palavras) sobre do que trata essa norma.

Seja objetivo e preciso.`;

    this.logger.log(
      `Fact-checking legal reference via Perplexity: ${reference.type} ${reference.number}/${reference.year}`,
    );

    const response = await this.search(query);

    // If search returned fallback (API unavailable), return low-confidence result
    if (response.isFallback) {
      this.logger.warn(
        `Fact-check unavailable due to fallback for ${reference.type} ${reference.number}/${reference.year}`,
      );
      return {
        reference: `${reference.type} ${reference.number}/${reference.year}`,
        exists: false,
        source: 'perplexity',
        description: 'Erro ao verificar referência via Perplexity',
        confidence: 0.0,
      };
    }

    // Parse response to determine if reference exists
    const content = response.summary.toLowerCase();
    const exists =
      content.includes('existe') &&
      !content.includes('não existe') &&
      !content.includes('nao existe');

    // Extract confidence based on existence result
    const confidence = exists ? 0.7 : 0.8;

    const result: FactCheckResult = {
      reference: `${reference.type} ${reference.number}/${reference.year}`,
      exists,
      source: 'perplexity',
      description: response.summary,
      confidence,
    };

    this.logger.log(
      `Fact-check completed for ${result.reference}: ${exists ? 'EXISTS' : 'NOT FOUND'} (confidence: ${confidence})`,
    );

    return result;
  }

  /**
   * Generates a SHA-256 hash cache key from a normalized query string.
   * Normalization ensures consistent caching for equivalent queries.
   *
   * @param query - Raw search query string
   * @returns string - SHA-256 hash (64 hex characters)
   *
   * @remarks
   * Normalization steps:
   * 1. Trim whitespace
   * 2. Convert to lowercase
   * 3. Normalize multiple spaces to single space
   *
   * @example
   * generateCacheKey('  Lei 14.133/2021  ')
   * // Returns: 'a1b2c3d4...' (same hash for 'lei 14.133/2021')
   */
  private generateCacheKey(query: string): string {
    // Normalize query: trim, lowercase, collapse multiple spaces
    const normalized = query.trim().toLowerCase().replace(/\s+/g, ' ');

    // Generate SHA-256 hash
    return createHash('sha256').update(normalized).digest('hex');
  }

  /**
   * Returns cache statistics for monitoring and debugging.
   * Useful for analyzing cache effectiveness and hit rates.
   *
   * @returns Cache statistics object
   *
   * @remarks
   * - hits: Number of cache hits (successful retrievals)
   * - misses: Number of cache misses (API calls required)
   * - keys: Number of entries currently in cache
   * - ksize: Total size of cached keys
   * - vsize: Total size of cached values
   *
   * @example
   * const stats = perplexityService.getCacheStats();
   * const hitRate = stats.hits / (stats.hits + stats.misses);
   * console.log(`Cache hit rate: ${(hitRate * 100).toFixed(2)}%`);
   */
  getCacheStats() {
    return this.cache.getStats();
  }

  /**
   * Lightweight health check for Perplexity API availability
   * Makes a minimal API call to verify connectivity and measure latency
   * @returns Promise<{ latency: number }> Latency in milliseconds
   * @throws Error if Perplexity API is unreachable
   */
  async ping(): Promise<{ latency: number }> {
    const start = Date.now();

    try {
      // Make a minimal API call to check connectivity
      await axios.post<PerplexityAPIResponse>(
        this.apiUrl,
        {
          model: this.model,
          messages: [
            {
              role: 'user',
              content: 'ping',
            },
          ],
        },
        {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
          timeout: 5000, // Short timeout for health check
        },
      );

      const latency = Date.now() - start;
      this.logger.debug(`Perplexity ping successful - latency: ${latency}ms`);

      return { latency };
    } catch (error) {
      const latency = Date.now() - start;
      const axiosError = error as AxiosError;
      this.logger.error(`Perplexity ping failed after ${latency}ms`, {
        error: axiosError.message,
      });
      throw error;
    }
  }
}
