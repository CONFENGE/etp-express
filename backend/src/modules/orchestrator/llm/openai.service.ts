import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import CircuitBreaker from 'opossum';

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

  constructor(private configService: ConfigService) {
    this.openai = new OpenAI({
      apiKey: this.configService.get<string>('OPENAI_API_KEY'),
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

  private async callOpenAI(request: LLMRequest): Promise<LLMResponse> {
    const {
      systemPrompt,
      userPrompt,
      temperature = this.configService.get<number>('OPENAI_TEMPERATURE', 0.7),
      maxTokens = this.configService.get<number>('OPENAI_MAX_TOKENS', 4000),
      model = this.configService.get<string>(
        'OPENAI_MODEL',
        'gpt-4-turbo-preview',
      ),
    } = request;

    this.logger.log(`Generating completion with model: ${model}`);

    const startTime = Date.now();

    const completion = await this.openai.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature,
      max_tokens: maxTokens,
    });

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

    return response;
  }

  getCircuitState() {
    return {
      stats: this.circuitBreaker.stats,
      opened: this.circuitBreaker.opened,
      halfOpen: this.circuitBreaker.halfOpen,
      closed: this.circuitBreaker.closed,
    };
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
      model = this.configService.get<string>(
        'OPENAI_MODEL',
        'gpt-4-turbo-preview',
      ),
    } = request;

    this.logger.log(`Generating streaming completion with model: ${model}`);

    try {
      const stream = await this.openai.chat.completions.create({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature,
        max_tokens: maxTokens,
        stream: true,
      });

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
