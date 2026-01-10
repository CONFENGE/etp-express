import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  ChatMessage,
  ChatMessageRole,
  ChatMessageMetadata,
} from '../../entities/chat-message.entity';
import { Etp } from '../../entities/etp.entity';
import { SendMessageDto, ChatResponseDto, ChatHistoryItemDto } from './dto';

/**
 * Service for managing ETP chatbot conversations.
 *
 * Handles:
 * - Sending messages to the AI chatbot
 * - Storing conversation history
 * - Retrieving chat history for an ETP
 * - Clearing conversation history
 *
 * Note: AI integration will be implemented in issue #1394 (CHAT-1167c).
 * This service currently provides the message persistence layer.
 *
 * Issue #1392 - [CHAT-1167a] Create ChatMessage entity and backend module structure
 * Parent: #1167 - [Assistente] Implementar chatbot para duvidas
 */
@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);

  constructor(
    @InjectRepository(ChatMessage)
    private readonly chatMessageRepository: Repository<ChatMessage>,
    @InjectRepository(Etp)
    private readonly etpRepository: Repository<Etp>,
  ) {}

  /**
   * Send a message to the chatbot and get a response.
   *
   * Currently returns a placeholder response.
   * AI integration will be implemented in issue #1394.
   *
   * @param dto - Message content and optional context
   * @param etpId - ETP being edited
   * @param userId - User sending the message
   * @returns ChatResponseDto with assistant response
   */
  async sendMessage(
    dto: SendMessageDto,
    etpId: string,
    userId: string,
  ): Promise<ChatResponseDto> {
    const startTime = Date.now();

    // Verify ETP exists and user has access
    const etp = await this.etpRepository.findOne({
      where: { id: etpId },
      select: ['id', 'title', 'objeto'],
    });

    if (!etp) {
      throw new NotFoundException(`ETP com ID ${etpId} nao encontrado`);
    }

    // Save user message
    const userMessage = this.chatMessageRepository.create({
      etpId,
      userId,
      role: ChatMessageRole.USER,
      content: dto.message,
      metadata: dto.contextField ? { contextField: dto.contextField } : null,
    });
    await this.chatMessageRepository.save(userMessage);

    // TODO: Issue #1394 - Implement AI completion with OpenAI
    // For now, return a placeholder response indicating feature is under development
    const placeholderContent = this.getPlaceholderResponse(dto.message);
    const latencyMs = Date.now() - startTime;

    // Save assistant response
    const assistantMetadata: ChatMessageMetadata = {
      latencyMs,
      contextField: dto.contextField,
      cached: false,
    };

    const assistantMessage = this.chatMessageRepository.create({
      etpId,
      userId,
      role: ChatMessageRole.ASSISTANT,
      content: placeholderContent,
      metadata: assistantMetadata,
    });
    const savedAssistant = await this.chatMessageRepository.save(assistantMessage);

    this.logger.log(
      `Chat message processed for ETP ${etpId} by user ${userId} in ${latencyMs}ms`,
    );

    return {
      id: savedAssistant.id,
      content: placeholderContent,
      metadata: {
        tokens: 0,
        latencyMs,
      },
    };
  }

  /**
   * Get chat history for an ETP and user.
   *
   * @param etpId - ETP ID
   * @param userId - User ID
   * @param limit - Maximum number of messages to return (default: 50)
   * @returns Array of chat history items ordered by creation time
   */
  async getHistory(
    etpId: string,
    userId: string,
    limit: number = 50,
  ): Promise<ChatHistoryItemDto[]> {
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
   * @returns Number of messages deleted
   */
  async clearHistory(etpId: string, userId: string): Promise<number> {
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
   * Generate placeholder response while AI integration is pending.
   * Will be replaced by actual AI completion in issue #1394.
   */
  private getPlaceholderResponse(userMessage: string): string {
    // Detect common question patterns and provide helpful responses
    const lowerMessage = userMessage.toLowerCase();

    if (
      lowerMessage.includes('justificativa') ||
      lowerMessage.includes('justificar')
    ) {
      return (
        'A funcionalidade de assistente de ETP esta em desenvolvimento. ' +
        'Em breve poderei ajudar com sugestoes para a justificativa da contratacao ' +
        'baseadas na Lei 14.133/2021 e no contexto do seu ETP.'
      );
    }

    if (
      lowerMessage.includes('lei') ||
      lowerMessage.includes('legislacao') ||
      lowerMessage.includes('14.133')
    ) {
      return (
        'A funcionalidade de assistente de ETP esta em desenvolvimento. ' +
        'Em breve poderei fornecer referencias especificas da Lei 14.133/2021 ' +
        'e outras normas aplicaveis ao seu ETP.'
      );
    }

    if (
      lowerMessage.includes('preco') ||
      lowerMessage.includes('custo') ||
      lowerMessage.includes('estimativa')
    ) {
      return (
        'A funcionalidade de assistente de ETP esta em desenvolvimento. ' +
        'Em breve poderei ajudar com orientacoes sobre pesquisa de precos ' +
        'e estimativas de custo conforme a legislacao vigente.'
      );
    }

    return (
      'Obrigado pela sua pergunta! A funcionalidade de assistente de ETP ' +
      'esta em desenvolvimento e estara disponivel em breve. ' +
      'Enquanto isso, voce pode consultar a documentacao da Lei 14.133/2021 ' +
      'para orientacoes sobre elaboracao de ETPs.'
    );
  }
}
