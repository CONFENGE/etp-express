import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { ChatService } from './chat.service';
import { SendMessageDto, ChatResponseDto, ChatHistoryItemDto } from './dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '../../entities/user.entity';

/**
 * Controller for ETP chatbot functionality.
 *
 * Provides endpoints for:
 * - Sending messages to the AI chatbot
 * - Retrieving conversation history
 * - Clearing conversation history
 *
 * All endpoints require authentication and are scoped to specific ETPs.
 * Rate limiting will be added in issue #1393.
 *
 * Issue #1392 - [CHAT-1167a] Create ChatMessage entity and backend module structure
 * Parent: #1167 - [Assistente] Implementar chatbot para duvidas
 */
@ApiTags('Chat')
@ApiBearerAuth()
@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  /**
   * Send a message to the ETP chatbot.
   *
   * The chatbot will respond with context-aware suggestions based on:
   * - The current ETP being edited
   * - The field/section the user is working on
   * - Conversation history
   *
   * Rate limit: 30 messages per minute (to be implemented in #1393)
   */
  @Post('etp/:etpId/message')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Send a message to the ETP chatbot',
    description:
      'Send a question or request to the AI assistant. ' +
      'The response will be context-aware based on the current ETP.',
  })
  @ApiParam({
    name: 'etpId',
    description: 'UUID of the ETP being edited',
    type: 'string',
    format: 'uuid',
  })
  @ApiResponse({
    status: 200,
    description: 'Message processed successfully',
    type: ChatResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid request (empty message or invalid format)',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - authentication required',
  })
  @ApiResponse({
    status: 404,
    description: 'ETP not found or user does not have access',
  })
  @ApiResponse({
    status: 429,
    description: 'Rate limit exceeded (30 messages per minute)',
  })
  async sendMessage(
    @Param('etpId', ParseUUIDPipe) etpId: string,
    @Body() dto: SendMessageDto,
    @CurrentUser() user: User,
  ): Promise<ChatResponseDto> {
    return this.chatService.sendMessage(dto, etpId, user.id);
  }

  /**
   * Get conversation history for an ETP.
   *
   * Returns messages ordered by creation time (oldest first).
   * Limited to the user's own messages for privacy.
   */
  @Get('etp/:etpId/history')
  @ApiOperation({
    summary: 'Get chat history for an ETP',
    description:
      'Retrieve the conversation history between the user and the chatbot for a specific ETP.',
  })
  @ApiParam({
    name: 'etpId',
    description: 'UUID of the ETP',
    type: 'string',
    format: 'uuid',
  })
  @ApiQuery({
    name: 'limit',
    description: 'Maximum number of messages to return (default: 50, max: 100)',
    required: false,
    type: Number,
  })
  @ApiResponse({
    status: 200,
    description: 'Chat history retrieved successfully',
    type: [ChatHistoryItemDto],
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - authentication required',
  })
  async getHistory(
    @Param('etpId', ParseUUIDPipe) etpId: string,
    @Query('limit') limit?: number,
    @CurrentUser() user?: User,
  ): Promise<ChatHistoryItemDto[]> {
    return this.chatService.getHistory(etpId, user!.id, limit);
  }

  /**
   * Clear conversation history for an ETP.
   *
   * Deletes all messages for the current user in this ETP.
   * This action cannot be undone.
   */
  @Delete('etp/:etpId/history')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Clear chat history for an ETP',
    description:
      'Delete all conversation messages for the current user in this ETP. ' +
      'This action cannot be undone.',
  })
  @ApiParam({
    name: 'etpId',
    description: 'UUID of the ETP',
    type: 'string',
    format: 'uuid',
  })
  @ApiResponse({
    status: 200,
    description: 'Chat history cleared successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        deletedCount: { type: 'number', example: 15 },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - authentication required',
  })
  async clearHistory(
    @Param('etpId', ParseUUIDPipe) etpId: string,
    @CurrentUser() user: User,
  ): Promise<{ success: boolean; deletedCount: number }> {
    const deletedCount = await this.chatService.clearHistory(etpId, user.id);
    return { success: true, deletedCount };
  }
}
