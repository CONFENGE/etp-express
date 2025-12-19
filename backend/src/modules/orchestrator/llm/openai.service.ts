import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import CircuitBreaker from 'opossum';
import NodeCache from 'node-cache';
import * as crypto from 'crypto';
import { withRetry, RetryOptions } from '../../../common/utils/retry';

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
  private cache: NodeCache;

  constructor(private configService: ConfigService) {
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

    // Initialize Cache with size limit to prevent memory leak
    this.cache = new NodeCache({
      stdTTL: 86400, // 24h TTL
      checkperiod: 3600, // Check for expired keys every 1h
      useClones: false, // Performance optimization - don't clone objects
      maxKeys: 1000, // Limit cache size to prevent unbounded growth (FIFO eviction)
    });

    // Initialize Circuit Breaker
    this.circuitBreaker = new CircuitBreaker(
      (request: LLMRequest) => this.callOpenAI(request),
      {
        timeout: 60000, // 60s timeout
        errorThresholdPercentage: 50, // Open após 50% de erros
        resetTimeout: 30000, // Tentar novamente após 30s
        volumeThreshold: 5, // Mínimo de requests para avaliar
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
          'Serviço de IA temporariamente indisponível. Tente novamente em alguns minutos.',
        );
      }

      // Other errors - propagate
      this.logger.error('Error generating completion:', error);
      throw error;
    }
  }

  /**
   * Generate deterministic cache key from request parameters
   * @param systemPrompt System prompt for the LLM
   * @param userPrompt User prompt for the LLM
   * @param model Model name (e.g., 'gpt-4.1-nano')
   * @param temperature Temperature parameter (0.0-2.0)
   * @returns SHA-256 hash of concatenated parameters
   */
  private getCacheKey(
    systemPrompt: string,
    userPrompt: string,
    model: string,
    temperature: number,
  ): string {
    const content = `${systemPrompt}|${userPrompt}|${model}|${temperature}`;
    return crypto.createHash('sha256').update(content).digest('hex');
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

    // Check cache
    const cached = this.cache.get<LLMResponse>(cacheKey);
    if (cached) {
      this.logger.log(`Cache HIT: ${cacheKey.substring(0, 16)}...`);
      return cached;
    }

    // Cache MISS - call OpenAI
    this.logger.log(`Cache MISS: ${cacheKey.substring(0, 16)}...`);
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

    this.logger.log(
      `Completion generated in ${duration}ms. Tokens: ${response.tokens}`,
    );

    // Store in cache
    this.cache.set(cacheKey, response);

    return response;
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
   * @returns Cache statistics including keys count, hits, misses, hit rate and max size
   */
  getCacheStats() {
    const stats = this.cache.getStats();
    return {
      keys: this.cache.keys().length,
      maxKeys: 1000,
      hits: stats.hits,
      misses: stats.misses,
      hitRate:
        stats.hits + stats.misses > 0
          ? stats.hits / (stats.hits + stats.misses)
          : 0,
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

    try {
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

      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || '';
        if (content) {
          fullContent += content;
          onChunk(content);
        }
      }

      // Estimate tokens (rough approximation)
      tokenCount = Math.ceil(fullContent.length / 4);

      return {
        content: fullContent,
        tokens: tokenCount,
        model,
        finishReason: 'stop',
      };
    } catch (error) {
      this.logger.error('Error generating streaming completion:', error);
      throw error;
    }
  }
}
