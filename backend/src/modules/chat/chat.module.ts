import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChatMessage } from '../../entities/chat-message.entity';
import { Etp } from '../../entities/etp.entity';
import { EtpSection } from '../../entities/etp-section.entity';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { OrchestratorModule } from '../orchestrator/orchestrator.module';
import { RAGModule } from '../rag/rag.module';

/**
 * Module for ETP chatbot functionality.
 *
 * Provides an AI-powered assistant to help users during ETP editing.
 * Features include:
 * - Context-aware AI responses based on current ETP content
 * - Conversation history persistence
 * - Legal reference suggestions (Lei 14.133/2021)
 * - Anti-hallucination safeguards
 * - ETP section context injection
 * - Hybrid RAG integration for legal context retrieval
 *
 * Issue #1392 - [CHAT-1167a] Create ChatMessage entity and backend module structure
 * Issue #1394 - [CHAT-1167c] Implement AI chat completion with ETP context injection
 * Issue #1594 - [RAG-1542c] Integrate HybridRagService for legal context
 * Parent: #1167 - [Assistente] Implementar chatbot para duvidas
 *
 * Related issues:
 * - #1393: API endpoints with rate limiting (completed)
 * - #1395: Frontend ChatWidget component
 * - #1396: ETP Editor integration
 * - #1397: Proactive suggestions
 * - #1398: E2E tests and documentation
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([ChatMessage, Etp, EtpSection]),
    OrchestratorModule, // Provides OpenAIService for AI completion
    RAGModule, // Provides HybridRagService for legal context retrieval
  ],
  controllers: [ChatController],
  providers: [ChatService],
  exports: [ChatService],
})
export class ChatModule {}
