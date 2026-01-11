import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  ChatMessage,
  ChatMessageRole,
  ChatMessageMetadata,
} from '../../entities/chat-message.entity';
import { Etp } from '../../entities/etp.entity';
import { EtpSection } from '../../entities/etp-section.entity';
import { SendMessageDto, ChatResponseDto, ChatHistoryItemDto } from './dto';
import { OpenAIService, LLMResponse } from '../orchestrator/llm/openai.service';
import {
  buildSystemPrompt,
  extractLegislationReferences,
} from './prompts/system-prompt.template';

/**
 * Conversation message for building chat history context.
 */
interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
}

/**
 * Service for managing ETP chatbot conversations with AI-powered responses.
 *
 * Handles:
 * - Sending messages to the AI chatbot with ETP context injection
 * - Storing conversation history
 * - Retrieving chat history for an ETP
 * - Clearing conversation history
 *
 * Security:
 * - All operations verify that the user's organization owns the ETP
 * - Users can only access their own chat history within their organization
 * - Anti-hallucination safeguards integrated via system prompt
 *
 * AI Integration:
 * - Uses OpenAIService for GPT-4 completions
 * - Injects ETP context (metadata, sections) into system prompt
 * - Tracks token usage and response latency
 * - Conversation history preserved for context continuity
 *
 * Issue #1394 - [CHAT-1167c] Implement AI chat completion with ETP context injection
 * Parent: #1167 - [Assistente] Implementar chatbot para duvidas
 */
@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);

  /** Maximum conversation history messages to include in context */
  private readonly MAX_HISTORY_MESSAGES = 10;

  /** Maximum tokens for AI response */
  private readonly MAX_RESPONSE_TOKENS = 1000;

  constructor(
    @InjectRepository(ChatMessage)
    private readonly chatMessageRepository: Repository<ChatMessage>,
    @InjectRepository(Etp)
    private readonly etpRepository: Repository<Etp>,
    @InjectRepository(EtpSection)
    private readonly sectionRepository: Repository<EtpSection>,
    private readonly openAIService: OpenAIService,
  ) {}

  /**
   * Send a message to the chatbot and get an AI-powered response.
   *
   * @param dto - Message content and optional context field
   * @param etpId - ETP being edited
   * @param userId - User sending the message
   * @param organizationId - User's organization ID for authorization
   * @returns ChatResponseDto with AI-generated assistant response
   * @throws NotFoundException if ETP doesn't exist
   * @throws ForbiddenException if user's organization doesn't own the ETP
   * @throws ServiceUnavailableException if OpenAI service is unavailable
   */
  async sendMessage(
    dto: SendMessageDto,
    etpId: string,
    userId: string,
    organizationId: string,
  ): Promise<ChatResponseDto> {
    const startTime = Date.now();

    // 1. Load ETP with full context
    const etp = await this.loadEtpWithContext(etpId, organizationId);

    // 2. Load ETP sections for context
    const sections = await this.loadEtpSections(etpId);

    // 3. Load conversation history (last N messages)
    const history = await this.getConversationHistory(
      etpId,
      userId,
      this.MAX_HISTORY_MESSAGES,
    );

    // 4. Save user message first
    const userMessage = this.chatMessageRepository.create({
      etpId,
      userId,
      role: ChatMessageRole.USER,
      content: dto.message,
      metadata: dto.contextField ? { contextField: dto.contextField } : null,
    });
    await this.chatMessageRepository.save(userMessage);

    // 5. Build system prompt with ETP context
    const systemPrompt = buildSystemPrompt({
      etp,
      sections,
      contextField: dto.contextField,
      includeAntiHallucination: true,
    });

    // 6. Build user prompt with conversation history
    const userPrompt = this.buildUserPromptWithHistory(dto.message, history);

    // 7. Generate AI response
    let aiResponse: LLMResponse;
    try {
      aiResponse = await this.openAIService.generateCompletion({
        systemPrompt,
        userPrompt,
        temperature: 0.7,
        maxTokens: this.MAX_RESPONSE_TOKENS,
        model: 'gpt-4.1-nano',
      });
    } catch (error) {
      this.logger.error('Failed to generate AI response', error);

      // If AI fails, return a graceful fallback
      if (
        error instanceof ServiceUnavailableException ||
        error.code === 'EOPENBREAKER'
      ) {
        throw new ServiceUnavailableException(
          'O servico de assistente esta temporariamente indisponivel. Por favor, tente novamente em alguns minutos.',
        );
      }

      // For other errors, return a generic error message
      const fallbackContent = this.getFallbackResponse(dto.message);
      const latencyMs = Date.now() - startTime;

      const assistantMetadata: ChatMessageMetadata = {
        latencyMs,
        contextField: dto.contextField,
        cached: false,
      };

      const assistantMessage = this.chatMessageRepository.create({
        etpId,
        userId,
        role: ChatMessageRole.ASSISTANT,
        content: fallbackContent,
        metadata: assistantMetadata,
      });
      const savedAssistant =
        await this.chatMessageRepository.save(assistantMessage);

      return {
        id: savedAssistant.id,
        content: fallbackContent,
        metadata: {
          tokens: 0,
          latencyMs,
        },
      };
    }

    const latencyMs = Date.now() - startTime;

    // 8. Extract legislation references from response
    const relatedLegislation = extractLegislationReferences(aiResponse.content);

    // 9. Save assistant response
    const assistantMetadata: ChatMessageMetadata = {
      latencyMs,
      contextField: dto.contextField,
      cached: false,
      tokens: aiResponse.tokens,
      model: aiResponse.model,
    };

    const assistantMessage = this.chatMessageRepository.create({
      etpId,
      userId,
      role: ChatMessageRole.ASSISTANT,
      content: aiResponse.content,
      metadata: assistantMetadata,
    });
    const savedAssistant =
      await this.chatMessageRepository.save(assistantMessage);

    this.logger.log(
      `Chat message processed for ETP ${etpId} by user ${userId} in ${latencyMs}ms (${aiResponse.tokens} tokens)`,
    );

    return {
      id: savedAssistant.id,
      content: aiResponse.content,
      relatedLegislation:
        relatedLegislation.length > 0 ? relatedLegislation : undefined,
      metadata: {
        tokens: aiResponse.tokens,
        latencyMs,
        model: aiResponse.model,
      },
    };
  }

  /**
   * Get chat history for an ETP and user.
   *
   * @param etpId - ETP ID
   * @param userId - User ID
   * @param organizationId - User's organization ID for authorization
   * @param limit - Maximum number of messages to return (default: 50)
   * @returns Array of chat history items ordered by creation time
   * @throws NotFoundException if ETP doesn't exist
   * @throws ForbiddenException if user's organization doesn't own the ETP
   */
  async getHistory(
    etpId: string,
    userId: string,
    organizationId: string,
    limit: number = 50,
  ): Promise<ChatHistoryItemDto[]> {
    // Verify ETP exists and user's organization has access
    await this.validateEtpAccess(etpId, organizationId);

    const messages = await this.chatMessageRepository.find({
      where: { etpId, userId },
      order: { createdAt: 'ASC' },
      take: Math.min(limit, 100), // Cap at 100 messages
    });

    return messages.map((msg) => ({
      id: msg.id,
      role: msg.role,
      content: msg.content,
      createdAt: msg.createdAt,
    }));
  }

  /**
   * Clear chat history for an ETP and user.
   *
   * @param etpId - ETP ID
   * @param userId - User ID
   * @param organizationId - User's organization ID for authorization
   * @returns Number of messages deleted
   * @throws NotFoundException if ETP doesn't exist
   * @throws ForbiddenException if user's organization doesn't own the ETP
   */
  async clearHistory(
    etpId: string,
    userId: string,
    organizationId: string,
  ): Promise<number> {
    // Verify ETP exists and user's organization has access
    await this.validateEtpAccess(etpId, organizationId);

    const result = await this.chatMessageRepository.delete({ etpId, userId });
    const deletedCount = result.affected || 0;

    this.logger.log(
      `Cleared ${deletedCount} chat messages for ETP ${etpId} by user ${userId}`,
    );

    return deletedCount;
  }

  /**
   * Get message count for an ETP and user.
   * Useful for rate limiting checks.
   *
   * @param etpId - ETP ID
   * @param userId - User ID
   * @param sinceDate - Only count messages after this date
   */
  async getMessageCount(
    etpId: string,
    userId: string,
    sinceDate?: Date,
  ): Promise<number> {
    const queryBuilder = this.chatMessageRepository
      .createQueryBuilder('msg')
      .where('msg.etpId = :etpId', { etpId })
      .andWhere('msg.userId = :userId', { userId })
      .andWhere('msg.role = :role', { role: ChatMessageRole.USER });

    if (sinceDate) {
      queryBuilder.andWhere('msg.createdAt >= :sinceDate', { sinceDate });
    }

    return queryBuilder.getCount();
  }

  /**
   * Load ETP with full context for chat.
   * Includes organization relation for context.
   *
   * @param etpId - ETP ID to load
   * @param organizationId - User's organization ID for access validation
   * @returns Loaded ETP entity
   */
  private async loadEtpWithContext(
    etpId: string,
    organizationId: string,
  ): Promise<Etp> {
    const etp = await this.etpRepository.findOne({
      where: { id: etpId },
      relations: ['organization'],
    });

    if (!etp) {
      throw new NotFoundException(`ETP com ID ${etpId} nao encontrado`);
    }

    // Multi-Tenancy: Validate organizationId
    if (etp.organizationId !== organizationId) {
      this.logger.warn(
        `IDOR attempt: Organization ${organizationId} attempted to access chat for ETP ${etpId} from organization ${etp.organizationId}`,
      );
      throw new ForbiddenException(
        'Voce nao tem permissao para acessar o chat deste ETP',
      );
    }

    return etp;
  }

  /**
   * Load ETP sections for context injection.
   *
   * @param etpId - ETP ID
   * @returns Array of ETP sections
   */
  private async loadEtpSections(etpId: string): Promise<EtpSection[]> {
    return this.sectionRepository.find({
      where: { etpId },
      order: { order: 'ASC' },
    });
  }

  /**
   * Get conversation history for context.
   *
   * @param etpId - ETP ID
   * @param userId - User ID
   * @param limit - Maximum messages to retrieve
   * @returns Array of conversation messages
   */
  private async getConversationHistory(
    etpId: string,
    userId: string,
    limit: number,
  ): Promise<ConversationMessage[]> {
    const messages = await this.chatMessageRepository.find({
      where: { etpId, userId },
      order: { createdAt: 'DESC' },
      take: limit,
    });

    // Reverse to get chronological order
    return messages.reverse().map((msg) => ({
      role: msg.role as 'user' | 'assistant',
      content: msg.content,
    }));
  }

  /**
   * Build user prompt with conversation history for context continuity.
   *
   * @param currentMessage - Current user message
   * @param history - Previous conversation messages
   * @returns Formatted user prompt with history
   */
  private buildUserPromptWithHistory(
    currentMessage: string,
    history: ConversationMessage[],
  ): string {
    if (history.length === 0) {
      return currentMessage;
    }

    // Build conversation context
    const conversationContext = history
      .map(
        (msg) =>
          `${msg.role === 'user' ? 'Usuario' : 'Assistente'}: ${msg.content}`,
      )
      .join('\n\n');

    return `[Historico da conversa]\n${conversationContext}\n\n[Mensagem atual]\nUsuario: ${currentMessage}`;
  }

  /**
   * Validates that the user's organization has access to the ETP.
   *
   * @param etpId - ETP ID to validate
   * @param organizationId - User's organization ID
   * @returns The validated ETP entity
   * @throws NotFoundException if ETP doesn't exist
   * @throws ForbiddenException if user's organization doesn't own the ETP
   */
  private async validateEtpAccess(
    etpId: string,
    organizationId: string,
  ): Promise<Etp> {
    const etp = await this.etpRepository.findOne({
      where: { id: etpId },
      select: ['id', 'title', 'objeto', 'organizationId'],
    });

    if (!etp) {
      throw new NotFoundException(`ETP com ID ${etpId} nao encontrado`);
    }

    // Multi-Tenancy: Validate organizationId
    if (etp.organizationId !== organizationId) {
      this.logger.warn(
        `IDOR attempt: Organization ${organizationId} attempted to access chat for ETP ${etpId} from organization ${etp.organizationId}`,
      );
      throw new ForbiddenException(
        'Voce nao tem permissao para acessar o chat deste ETP',
      );
    }

    return etp;
  }

  /**
   * Generate fallback response when AI service is unavailable.
   * Provides helpful guidance based on common question patterns.
   *
   * @param userMessage - User's message
   * @returns Fallback response text
   */
  private getFallbackResponse(userMessage: string): string {
    const lowerMessage = userMessage.toLowerCase();

    if (
      lowerMessage.includes('justificativa') ||
      lowerMessage.includes('justificar')
    ) {
      return (
        'O servico de assistente esta temporariamente indisponivel. ' +
        'Para a justificativa, lembre-se de incluir: a necessidade da contratacao, ' +
        'o interesse publico envolvido, os beneficios esperados e os riscos de nao contratar, ' +
        'conforme Art. 18 da Lei 14.133/2021.'
      );
    }

    if (
      lowerMessage.includes('lei') ||
      lowerMessage.includes('legislacao') ||
      lowerMessage.includes('14.133')
    ) {
      return (
        'O servico de assistente esta temporariamente indisponivel. ' +
        'As principais referencias legais para ETPs sao: Lei 14.133/2021 (Nova Lei de Licitacoes), ' +
        'IN SEGES/ME n 40/2020 (Elaboracao de ETP) e IN SEGES/ME n 65/2021 (Contratacoes de TI).'
      );
    }

    if (
      lowerMessage.includes('preco') ||
      lowerMessage.includes('custo') ||
      lowerMessage.includes('estimativa')
    ) {
      return (
        'O servico de assistente esta temporariamente indisponivel. ' +
        'Para estimativa de custos, consulte fontes como SINAPI, SICRO, Painel de Precos ' +
        'e cotacoes de mercado. A metodologia de calculo deve ser documentada conforme Art. 23 da Lei 14.133/2021.'
      );
    }

    return (
      'O servico de assistente esta temporariamente indisponivel. ' +
      'Por favor, tente novamente em alguns minutos. ' +
      'Enquanto isso, consulte a documentacao da Lei 14.133/2021 e as INs aplicaveis.'
    );
  }
}
