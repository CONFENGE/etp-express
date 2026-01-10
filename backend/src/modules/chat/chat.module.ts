import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChatMessage } from '../../entities/chat-message.entity';
import { Etp } from '../../entities/etp.entity';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';

/**
 * Module for ETP chatbot functionality.
 *
 * Provides an AI-powered assistant to help users during ETP editing.
 * Features include:
 * - Context-aware responses based on current ETP
 * - Conversation history persistence
 * - Legal reference suggestions (Lei 14.133/2021)
 *
 * Issue #1392 - [CHAT-1167a] Create ChatMessage entity and backend module structure
 * Parent: #1167 - [Assistente] Implementar chatbot para duvidas
 *
 * Related issues:
 * - #1393: API endpoints with rate limiting
 * - #1394: AI integration with OpenAI
 * - #1395: Frontend ChatWidget component
 * - #1396: ETP Editor integration
 * - #1397: Proactive suggestions
 * - #1398: E2E tests and documentation
 */
@Module({
  imports: [TypeOrmModule.forFeature([ChatMessage, Etp])],
  controllers: [ChatController],
  providers: [ChatService],
  exports: [ChatService],
})
export class ChatModule {}
