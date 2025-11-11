import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import OpenAI from "openai";

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

  constructor(private configService: ConfigService) {
    this.openai = new OpenAI({
      apiKey: this.configService.get<string>("OPENAI_API_KEY"),
    });
  }

  async generateCompletion(request: LLMRequest): Promise<LLMResponse> {
    const {
      systemPrompt,
      userPrompt,
      temperature = this.configService.get<number>("OPENAI_TEMPERATURE", 0.7),
      maxTokens = this.configService.get<number>("OPENAI_MAX_TOKENS", 4000),
      model = this.configService.get<string>(
        "OPENAI_MODEL",
        "gpt-4-turbo-preview",
      ),
    } = request;

    this.logger.log(`Generating completion with model: ${model}`);

    try {
      const startTime = Date.now();

      const completion = await this.openai.chat.completions.create({
        model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature,
        max_tokens: maxTokens,
      });

      const duration = Date.now() - startTime;

      const response: LLMResponse = {
        content: completion.choices[0]?.message?.content || "",
        tokens: completion.usage?.total_tokens || 0,
        model: completion.model,
        finishReason: completion.choices[0]?.finish_reason || "unknown",
      };

      this.logger.log(
        `Completion generated in ${duration}ms. Tokens: ${response.tokens}`,
      );

      return response;
    } catch (error) {
      this.logger.error("Error generating completion:", error);
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
      temperature = this.configService.get<number>("OPENAI_TEMPERATURE", 0.7),
      maxTokens = this.configService.get<number>("OPENAI_MAX_TOKENS", 4000),
      model = this.configService.get<string>(
        "OPENAI_MODEL",
        "gpt-4-turbo-preview",
      ),
    } = request;

    this.logger.log(`Generating streaming completion with model: ${model}`);

    try {
      const stream = await this.openai.chat.completions.create({
        model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature,
        max_tokens: maxTokens,
        stream: true,
      });

      let fullContent = "";
      let tokenCount = 0;

      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || "";
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
        finishReason: "stop",
      };
    } catch (error) {
      this.logger.error("Error generating streaming completion:", error);
      throw error;
    }
  }
}
