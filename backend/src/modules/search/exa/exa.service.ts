import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Exa from 'exa-js';
import CircuitBreaker from 'opossum';
import NodeCache from 'node-cache';
import { createHash } from 'crypto';
import { withRetry, RetryOptions } from '../../../common/utils/retry';
import {
  ExaSearchResult,
  ExaResponse,
  FactCheckResult,
  LegalReferenceInput,
  ExaSearchOptions,
} from './exa.types';

/** Disclaimer displayed when external search is unavailable */
const FALLBACK_DISCLAIMER =
  '⚠ Busca externa temporariamente indisponível. Informações de mercado podem estar incompletas.';

@Injectable()
export class ExaService {
  private readonly logger = new Logger(ExaService.name);
  private readonly exa: Exa;
  private readonly circuitBreaker: CircuitBreaker;
  private readonly retryOptions: Partial<RetryOptions>;
  private readonly cache: NodeCache;

  constructor(private configService: ConfigService) {
    // Initialize Exa client
    const apiKey = this.configService.get<string>('EXA_API_KEY') || '';
    this.exa = new Exa(apiKey);

    // Configure retry options for Exa API
    this.retryOptions = {
      maxRetries: 3,
      baseDelay: 1000,
      maxDelay: 10000,
      retryableErrors: [
        'ETIMEDOUT',
        'ECONNRESET',
        'ECONNREFUSED',
        '429',
        '500',
        '502',
        '503',
        '504',
        'rate_limit',
        'timeout',
        'network error',
      ],
      logger: this.logger,
      operationName: 'Exa API',
    };

    // Initialize cache with 7-day TTL (604800 seconds)
    this.cache = new NodeCache({
      stdTTL: 604800, // 7 days
      checkperiod: 3600, // Check for expired keys every hour
      useClones: false, // Performance optimization
    });

    // Initialize Circuit Breaker for Exa API
    this.circuitBreaker = new CircuitBreaker(
      (query: string, options?: ExaSearchOptions) =>
        this.callExa(query, options),
      {
        timeout: 30000, // 30s timeout
        errorThresholdPercentage: 50, // Open after 50% errors
        resetTimeout: 60000, // Try again after 60s
        volumeThreshold: 3, // Minimum requests to evaluate
      },
    );

    // Circuit Breaker event listeners for monitoring
    this.circuitBreaker.on('open', () => {
      this.logger.warn(
        'Exa circuit breaker OPENED - too many failures, using fallback',
      );
    });

    this.circuitBreaker.on('halfOpen', () => {
      this.logger.log('Exa circuit breaker half-open, testing connection...');
    });

    this.circuitBreaker.on('close', () => {
      this.logger.log('Exa circuit breaker CLOSED - service healthy');
    });

    this.circuitBreaker.on('timeout', () => {
      this.logger.warn('Exa API request timed out');
    });

    this.circuitBreaker.on('reject', () => {
      this.logger.warn('Exa request rejected - circuit is open');
    });
  }

  /**
   * Searches using Exa API with caching support.
   * Cache is checked first, and only misses trigger API calls.
   * Fallback responses are NOT cached to ensure retries on recovery.
   *
   * @deprecated Use searchSimple() or searchDeep() instead for explicit search type selection.
   *
   * @param query - Search query string
   * @returns Promise<ExaResponse> - Search results with cache metadata
   */
  async search(query: string): Promise<ExaResponse> {
    this.logger.debug(
      'Using deprecated search() method. Use searchSimple() or searchDeep() instead.',
    );
    return this.searchSimple(query);
  }

  /**
   * Performs a simple, fast search using Exa's neural search.
   * Ideal for quick fact-checking and simple queries.
   *
   * @param query - Search query string
   * @returns Promise<ExaResponse>
   */
  async searchSimple(query: string): Promise<ExaResponse> {
    this.logger.log('Performing simple search with Exa (type: auto)');
    return this.performSearch(query, { type: 'auto', numResults: 5 });
  }

  /**
   * Performs a deep research search using Exa's neural search with more results.
   * Ideal for complex queries requiring comprehensive market analysis.
   *
   * @param query - Search query string
   * @returns Promise<ExaResponse>
   */
  async searchDeep(query: string): Promise<ExaResponse> {
    this.logger.log('Performing deep research with Exa (type: neural)');
    return this.performSearch(query, {
      type: 'neural',
      numResults: 10,
      text: { maxCharacters: 3000 },
    });
  }

  /**
   * Generic search method (internal use).
   * @private
   */
  private async performSearch(
    query: string,
    options: ExaSearchOptions,
  ): Promise<ExaResponse> {
    // Include search type in cache key
    const cacheKey = this.generateCacheKey(
      `${options.type}:${options.numResults}:${query}`,
    );

    // Check cache
    const cached = this.cache.get<ExaResponse>(cacheKey);
    if (cached) {
      this.logger.log(
        `Cache HIT: ${query.substring(0, 50)}... (type: ${options.type})`,
      );
      return cached;
    }

    this.logger.log(`Cache MISS - calling Exa API (type: ${options.type})`);

    try {
      const response = await this.callExaWithOptions(query, options);

      // Cache only successful responses
      if (!response.isFallback) {
        this.cache.set(cacheKey, response);
      }

      return response;
    } catch {
      this.logger.error('Exa API failed', { query, options });
      return this.getFallbackResponse();
    }
  }

  /**
   * Calls Exa API with specified options.
   * @private
   */
  private async callExaWithOptions(
    query: string,
    options: ExaSearchOptions,
  ): Promise<ExaResponse> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const response: any = await withRetry(async () => {
      if (options.text) {
        return this.exa.searchAndContents(query, {
          type: options.type,
          numResults: options.numResults,
          useAutoprompt: options.useAutoprompt ?? false,
          includeDomains: options.includeDomains,
          excludeDomains: options.excludeDomains,
          text: options.text,
        });
      }
      return this.exa.search(query, {
        type: options.type,
        numResults: options.numResults,
        useAutoprompt: options.useAutoprompt ?? false,
        includeDomains: options.includeDomains,
        excludeDomains: options.excludeDomains,
      });
    }, this.retryOptions);

    const results = this.parseResults(response.results);
    const sources = response.results.map(
      (r: { url: string }) => r.url,
    ) as string[];
    const summary = this.generateSummary(response.results);

    return {
      results,
      summary,
      sources,
      isFallback: false,
    };
  }

  /**
   * Calls Exa API directly (used by circuit breaker)
   * @param query Search query string
   * @param options Search options
   * @returns Exa response with results
   */
  private async callExa(
    query: string,
    options?: ExaSearchOptions,
  ): Promise<ExaResponse> {
    return this.callExaWithOptions(query, options || { type: 'auto' });
  }

  /**
   * Returns a fallback response when Exa API is unavailable
   * Enables graceful degradation - ETP generation continues without external search
   */
  private getFallbackResponse(): ExaResponse {
    return {
      results: [],
      summary: FALLBACK_DISCLAIMER,
      sources: [],
      isFallback: true,
    };
  }

  /**
   * Parse Exa API results into our standard format
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private parseResults(results: any[]): ExaSearchResult[] {
    return results.map((result, index) => ({
      title: result.title || `Fonte ${index + 1}`,
      snippet: result.text || result.highlights?.[0] || result.url,
      url: result.url,
      relevance: result.score ?? 1 - index * 0.1,
      source: 'Exa AI',
    }));
  }

  /**
   * Generate a summary from search results
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private generateSummary(results: any[]): string {
    if (results.length === 0) {
      return 'Nenhum resultado encontrado.';
    }

    const snippets = results
      .slice(0, 3)
      .map((r) => r.text || r.highlights?.[0] || r.title)
      .filter(Boolean)
      .join('\n\n');

    return snippets || 'Resultados encontrados. Consulte as fontes.';
  }

  /**
   * Search for similar contracts in public procurement databases
   */
  async searchSimilarContracts(
    objeto: string,
    _filters?: Record<string, unknown>,
  ): Promise<ExaResponse> {
    const query = `Contratações públicas brasileiras similares a: "${objeto}".
 Busque informações sobre:
 - Órgãos que realizaram contratações similares
 - Valores praticados em licitações
 - Modalidades utilizadas
 - Processos ou documentos relacionados

 Foque em dados do Brasil e fontes oficiais como PNCP, ComprasNet, TCU.`;

    // Use deep research for contract search
    return this.searchDeep(query);
  }

  /**
   * Search for legal references related to a topic
   */
  async searchLegalReferences(topic: string): Promise<ExaResponse> {
    const query = `Base legal para: "${topic}" no contexto de contratações públicas brasileiras.
 Busque referências a:
 - Lei 14.133/2021 (Nova Lei de Licitações)
 - Instruções Normativas da SEGES
 - Jurisprudência do TCU
 - Outros normativos aplicáveis

 Cite fontes oficiais e artigos específicos quando possível.`;

    // Use deep research for legal references
    return this.searchDeep(query);
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
   * Fact-checks a legal reference using Exa search.
   * Used as fallback when reference is not found in local RAG database.
   * @param reference Legal reference object with type, number and year
   * @returns FactCheckResult with existence status and description
   */
  async factCheckLegalReference(
    reference: LegalReferenceInput,
  ): Promise<FactCheckResult> {
    const searchQuery = `${reference.type} ${reference.number}/${reference.year} legislação brasileira oficial`;

    this.logger.log(
      `Fact-checking legal reference via Exa: ${reference.type} ${reference.number}/${reference.year}`,
    );

    // Use simple search for fact-checking
    const response = await this.searchSimple(searchQuery);

    // If search returned fallback (API unavailable), return low-confidence result
    if (response.isFallback) {
      this.logger.warn(
        `Fact-check unavailable due to fallback for ${reference.type} ${reference.number}/${reference.year}`,
      );
      return {
        reference: `${reference.type} ${reference.number}/${reference.year}`,
        exists: false,
        source: 'exa',
        description: 'Erro ao verificar referência via Exa',
        confidence: 0.0,
      };
    }

    // Determine if reference exists based on search results
    const hasRelevantResults =
      response.results.length > 0 &&
      response.results.some(
        (r) =>
          r.snippet?.toLowerCase().includes(reference.number.toLowerCase()) ||
          r.title?.toLowerCase().includes(reference.number.toLowerCase()),
      );

    const exists = hasRelevantResults;
    const confidence = exists ? 0.7 : 0.8;

    const result: FactCheckResult = {
      reference: `${reference.type} ${reference.number}/${reference.year}`,
      exists,
      source: 'exa',
      description: exists
        ? response.summary
        : `Referência ${reference.type} ${reference.number}/${reference.year} não encontrada nas fontes pesquisadas.`,
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
   */
  getCacheStats() {
    return this.cache.getStats();
  }

  /**
   * Lightweight health check for Exa API availability
   * Makes a minimal API call to verify connectivity and measure latency
   * @returns Promise<{ latency: number }> Latency in milliseconds
   * @throws Error if Exa API is unreachable
   */
  async ping(): Promise<{ latency: number }> {
    const start = Date.now();

    try {
      // Make a minimal API call to check connectivity
      await this.exa.search('ping', {
        numResults: 1,
        useAutoprompt: false,
      });

      const latency = Date.now() - start;
      this.logger.debug(`Exa ping successful - latency: ${latency}ms`);

      return { latency };
    } catch (error) {
      const latency = Date.now() - start;
      const err = error as Error;
      this.logger.error(`Exa ping failed after ${latency}ms`, {
        error: err.message,
      });
      throw error;
    }
  }
}
