import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosError } from 'axios';
import CircuitBreaker from 'opossum';
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

  async search(query: string): Promise<PerplexityResponse> {
    this.logger.log(`Searching with Perplexity: ${query}`);

    try {
      return (await this.circuitBreaker.fire(query)) as PerplexityResponse;
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
}
