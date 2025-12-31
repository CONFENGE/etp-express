import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import CircuitBreaker from 'opossum';
import { trace, SpanStatusCode, Span } from '@opentelemetry/api';
import { withRetry, RetryOptions } from '../../../common/utils/retry';
import { SemanticCacheService } from '../../cache/semantic-cache.service';

/** OpenTelemetry tracer for LLM operations */
const tracer = trace.getTracer('llm-openai', '1.0.0');

export interface LLMRequest {
  systemPrompt: string;
  userPrompt: string;
  temperature?: number;
  maxTokens?: number;
  model?: string;
}

export interface LLMResponse {
  content: string;
  tokens: number;
  model: string;
  finishReason: string;
}

@Injectable()
export class OpenAIService {
  private readonly logger = new Logger(OpenAIService.name);
  private openai: OpenAI;
  private circuitBreaker: CircuitBreaker;
  private readonly retryOptions: Partial<RetryOptions>;

  constructor(
    private configService: ConfigService,
    private semanticCache: SemanticCacheService,
  ) {
    // Configure retry options for OpenAI API
    this.retryOptions = {
      maxRetries: 3,
      baseDelay: 1000,
      maxDelay: 8000,
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
      ],
      logger: this.logger,
      operationName: 'OpenAI API',
    };
    this.openai = new OpenAI({
      apiKey: this.configService.get<string>('OPENAI_API_KEY'),
    });

    // Initialize Circuit Breaker
    this.circuitBreaker = new CircuitBreaker(
      (request: LLMRequest) => this.callOpenAI(request),
      {
        timeout: 60000, // 60s timeout
        errorThresholdPercentage: 50, // Open after 50% errors
        resetTimeout: 30000, // Try again after 30s
        volumeThreshold: 5, // Minimum requests to evaluate
      },
    );

    // Circuit Breaker event listeners
    this.circuitBreaker.on('open', () => {
      this.logger.warn('OpenAI circuit breaker OPENED - too many failures');
    });

    this.circuitBreaker.on('halfOpen', () => {
      this.logger.log(
        'OpenAI circuit breaker half-open, testing connection...',
      );
    });

    this.circuitBreaker.on('close', () => {
      this.logger.log('OpenAI circuit breaker CLOSED - service healthy');
    });
  }

  async generateCompletion(request: LLMRequest): Promise<LLMResponse> {
    try {
      return (await this.circuitBreaker.fire(request)) as LLMResponse;
    } catch (error) {
      // Circuit breaker opened - service unavailable
      if (error.code === 'EOPENBREAKER') {
        this.logger.error(
          'OpenAI circuit breaker is open - service temporarily unavailable',
        );
        throw new ServiceUnavailableException(
          'Servico de IA temporariamente indisponivel. Tente novamente em alguns minutos.',
        );
      }

      // Categorize and wrap OpenAI errors for better user experience (#1047)
      const wrappedError = this.wrapOpenAIError(error);
      this.logger.error('Error generating completion:', {
        originalError: error.message,
        wrappedError: wrappedError.message,
        errorType: error.name || error.constructor?.name,
        code: error.code,
        status: error.status,
      });

      throw wrappedError;
    }
  }

  /**
   * Wraps OpenAI SDK errors with user-friendly messages.
   *
   * @remarks
   * The OpenAI SDK can throw various error types with technical messages.
   * This method converts them to ServiceUnavailableException or other
   * appropriate NestJS exceptions with user-friendly Portuguese messages.
   *
   * @param error - Original error from OpenAI SDK or circuit breaker
   * @returns Wrapped error with user-friendly message
   * @see #1047 - Improve AI section generation error messages
   */
  private wrapOpenAIError(error: unknown): Error {
    const err = error as {
      message?: string;
      status?: number;
      code?: string;
      name?: string;
    };
    const message = err.message?.toLowerCase() || '';
    const status = err.status;
    const code = err.code?.toLowerCase() || '';

    // Rate limit errors (429)
    if (
      status === 429 ||
      message.includes('rate_limit') ||
      message.includes('rate limit') ||
      code.includes('rate_limit')
    ) {
      return new ServiceUnavailableException(
        'Limite de requisicoes da IA excedido. Aguarde alguns minutos e tente novamente.',
      );
    }

    // Timeout errors
    if (
      message.includes('timeout') ||
      code.includes('timeout') ||
      code === 'etimedout' ||
      code === 'econnreset'
    ) {
      return new ServiceUnavailableException(
        'O servico de IA demorou para responder. Tente novamente.',
      );
    }

    // Authentication/API key errors (401, 403)
    if (
      status === 401 ||
      status === 403 ||
      message.includes('api key') ||
      message.includes('authentication') ||
      message.includes('invalid_api_key')
    ) {
      this.logger.error('OpenAI API key error - check configuration');
      return new ServiceUnavailableException(
        'Erro de configuracao do servico de IA. Entre em contato com o suporte.',
      );
    }

    // Server errors (500, 502, 503, 504)
    if (status && status >= 500) {
      return new ServiceUnavailableException(
        'O servico de IA esta temporariamente indisponivel. Tente novamente em instantes.',
      );
    }

    // Content filter/safety errors
    if (
      message.includes('content_filter') ||
      message.includes('safety') ||
      message.includes('moderation')
    ) {
      return new Error(
        'O conteudo foi bloqueado pelo filtro de seguranca da IA. Revise o texto de entrada.',
      );
    }

    // Context length exceeded
    if (
      message.includes('context_length') ||
      message.includes('maximum context') ||
      message.includes('token')
    ) {
      return new Error(
        'O texto de entrada e muito longo. Reduza o tamanho e tente novamente.',
      );
    }

    // Network errors
    if (
      code === 'econnrefused' ||
      code === 'enotfound' ||
      message.includes('network') ||
      message.includes('fetch')
    ) {
      return new ServiceUnavailableException(
        'Erro de conexao com o servico de IA. Verifique a conexao e tente novamente.',
      );
    }

    // Return original error if no specific handling applies
    // but ensure it has a message
    if (error instanceof Error) {
      return error;
    }

    return new Error(
      err.message || 'Erro desconhecido no servico de IA. Tente novamente.',
    );
  }

  /**
   * Generate deterministic cache key from request parameters
   * Uses SemanticCacheService for consistent key generation
   * @param systemPrompt System prompt for the LLM
   * @param userPrompt User prompt for the LLM
   * @param model Model name (e.g., 'gpt-4.1-nano')
   * @param temperature Temperature parameter (0.0-2.0)
   * @returns Normalized key string for caching
   */
  private getCacheKey(
    systemPrompt: string,
    userPrompt: string,
    model: string,
    temperature: number,
  ): string {
    return this.semanticCache.generateOpenAIKey(
      systemPrompt,
      userPrompt,
      model,
      temperature,
    );
  }

  /**
   * Call OpenAI API with cache support
   * Checks cache before making API call. If cache hit, returns cached response immediately.
   * If cache miss, calls OpenAI API with retry logic and stores response in cache (TTL: 24h).
   * Cache key is SHA-256 hash of (systemPrompt + userPrompt + model + temperature).
   * @param request LLM request parameters
   * @returns LLM response (from cache or API)
   */
  private async callOpenAI(request: LLMRequest): Promise<LLMResponse> {
    const {
      systemPrompt,
      userPrompt,
      temperature = this.configService.get<number>('OPENAI_TEMPERATURE', 0.7),
      maxTokens = this.configService.get<number>('OPENAI_MAX_TOKENS', 4000),
      model = this.configService.get<string>('OPENAI_MODEL', 'gpt-4.1-nano'),
    } = request;

    // Generate cache key
    const cacheKey = this.getCacheKey(
      systemPrompt,
      userPrompt,
      model,
      temperature,
    );

    // Create OpenTelemetry span for LLM operation
    return tracer.startActiveSpan(
      'openai.chat.completion',
      async (span: Span) => {
        try {
          // Set initial span attributes
          span.setAttribute('gen_ai.system', 'openai');
          span.setAttribute('gen_ai.request.model', model);
          span.setAttribute('gen_ai.request.temperature', temperature);
          span.setAttribute('gen_ai.request.max_tokens', maxTokens);
          span.setAttribute('llm.prompt.system.length', systemPrompt.length);
          span.setAttribute('llm.prompt.user.length', userPrompt.length);

          // Check Redis cache (persistent across restarts)
          const cached = await this.semanticCache.get<LLMResponse>(
            'openai',
            cacheKey,
          );
          if (cached) {
            this.logger.log(`Redis Cache HIT: ${cacheKey.substring(0, 32)}...`);
            span.setAttribute('cache.hit', true);
            span.setAttribute('cache.type', 'redis');
            span.setAttribute('gen_ai.response.model', cached.model);
            span.setAttribute('gen_ai.usage.total_tokens', cached.tokens);
            span.setStatus({ code: SpanStatusCode.OK });
            return cached;
          }

          // Cache MISS - call OpenAI
          span.setAttribute('cache.hit', false);
          span.setAttribute('cache.type', 'redis');
          this.logger.log(`Redis Cache MISS: ${cacheKey.substring(0, 32)}...`);
          this.logger.log(`Generating completion with model: ${model}`);

          const startTime = Date.now();

          // Wrap OpenAI API call with retry logic for transient failures
          const completion = await withRetry(
            () =>
              this.openai.chat.completions.create({
                model,
                messages: [
                  { role: 'system', content: systemPrompt },
                  { role: 'user', content: userPrompt },
                ],
                temperature,
                max_tokens: maxTokens,
              }),
            this.retryOptions,
          );

          const duration = Date.now() - startTime;

          const response: LLMResponse = {
            content: completion.choices[0]?.message?.content || '',
            tokens: completion.usage?.total_tokens || 0,
            model: completion.model,
            finishReason: completion.choices[0]?.finish_reason || 'unknown',
          };

          // Add response attributes to span
          span.setAttribute('gen_ai.response.model', response.model);
          span.setAttribute(
            'gen_ai.response.finish_reasons',
            response.finishReason,
          );
          span.setAttribute('gen_ai.usage.total_tokens', response.tokens);
          span.setAttribute(
            'gen_ai.usage.prompt_tokens',
            completion.usage?.prompt_tokens || 0,
          );
          span.setAttribute(
            'gen_ai.usage.completion_tokens',
            completion.usage?.completion_tokens || 0,
          );
          span.setAttribute('llm.response.duration_ms', duration);
          span.setAttribute(
            'llm.response.content.length',
            response.content.length,
          );

          this.logger.log(
            `Completion generated in ${duration}ms. Tokens: ${response.tokens}`,
          );

          // Store in Redis cache (persistent across restarts)
          await this.semanticCache.set('openai', cacheKey, response);

          span.setStatus({ code: SpanStatusCode.OK });
          return response;
        } catch (error) {
          // Record error in span
          span.setStatus({
            code: SpanStatusCode.ERROR,
            message: error instanceof Error ? error.message : 'Unknown error',
          });
          span.recordException(error as Error);
          throw error;
        } finally {
          span.end();
        }
      },
    );
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
   * Get cache statistics for monitoring
   * @returns Cache statistics including hits, misses, and hit rate from Redis
   */
  getCacheStats() {
    return {
      ...this.semanticCache.getStats('openai'),
      type: 'redis',
      available: this.semanticCache.isAvailable(),
    };
  }

  /**
   * Lightweight health check for OpenAI API availability
   * Makes a minimal API call to verify connectivity and measure latency
   * @returns Promise<{ latency: number }> Latency in milliseconds
   * @throws Error if OpenAI API is unreachable
   */
  async ping(): Promise<{ latency: number }> {
    const start = Date.now();

    try {
      // Make a minimal API call to check connectivity
      // Using a very short completion request with low token limit
      await this.openai.chat.completions.create({
        model: 'gpt-4.1-nano', // Use cheapest model for ping
        messages: [{ role: 'user', content: 'ping' }],
        max_tokens: 1,
      });

      const latency = Date.now() - start;
      this.logger.debug(`OpenAI ping successful - latency: ${latency}ms`);

      return { latency };
    } catch (error) {
      const latency = Date.now() - start;
      this.logger.error(`OpenAI ping failed after ${latency}ms`, error);
      throw error;
    }
  }

  async generateStreamCompletion(
    request: LLMRequest,
    onChunk: (chunk: string) => void,
  ): Promise<LLMResponse> {
    const {
      systemPrompt,
      userPrompt,
      temperature = this.configService.get<number>('OPENAI_TEMPERATURE', 0.7),
      maxTokens = this.configService.get<number>('OPENAI_MAX_TOKENS', 4000),
      model = this.configService.get<string>('OPENAI_MODEL', 'gpt-4.1-nano'),
    } = request;

    this.logger.log(`Generating streaming completion with model: ${model}`);

    // Create OpenTelemetry span for streaming LLM operation
    return tracer.startActiveSpan(
      'openai.chat.completion.stream',
      async (span: Span) => {
        try {
          // Set initial span attributes
          span.setAttribute('gen_ai.system', 'openai');
          span.setAttribute('gen_ai.request.model', model);
          span.setAttribute('gen_ai.request.temperature', temperature);
          span.setAttribute('gen_ai.request.max_tokens', maxTokens);
          span.setAttribute('gen_ai.request.streaming', true);
          span.setAttribute('llm.prompt.system.length', systemPrompt.length);
          span.setAttribute('llm.prompt.user.length', userPrompt.length);

          const startTime = Date.now();

          // Wrap stream creation with retry logic for connection failures
          const stream = await withRetry(
            () =>
              this.openai.chat.completions.create({
                model,
                messages: [
                  { role: 'system', content: systemPrompt },
                  { role: 'user', content: userPrompt },
                ],
                temperature,
                max_tokens: maxTokens,
                stream: true,
              }),
            {
              ...this.retryOptions,
              operationName: 'OpenAI Streaming API',
            },
          );

          let fullContent = '';
          let tokenCount = 0;
          let chunkCount = 0;

          for await (const chunk of stream) {
            const content = chunk.choices[0]?.delta?.content || '';
            if (content) {
              fullContent += content;
              chunkCount++;
              onChunk(content);
            }
          }

          const duration = Date.now() - startTime;

          // Estimate tokens (rough approximation)
          tokenCount = Math.ceil(fullContent.length / 4);

          const response: LLMResponse = {
            content: fullContent,
            tokens: tokenCount,
            model,
            finishReason: 'stop',
          };

          // Add response attributes to span
          span.setAttribute('gen_ai.response.model', model);
          span.setAttribute('gen_ai.response.finish_reasons', 'stop');
          span.setAttribute('gen_ai.usage.total_tokens', tokenCount);
          span.setAttribute('llm.response.duration_ms', duration);
          span.setAttribute('llm.response.content.length', fullContent.length);
          span.setAttribute('llm.stream.chunk_count', chunkCount);

          span.setStatus({ code: SpanStatusCode.OK });
          return response;
        } catch (error) {
          // Record error in span
          span.setStatus({
            code: SpanStatusCode.ERROR,
            message: error instanceof Error ? error.message : 'Unknown error',
          });
          span.recordException(error as Error);
          this.logger.error('Error generating streaming completion:', error);
          throw error;
        } finally {
          span.end();
        }
      },
    );
  }
}
