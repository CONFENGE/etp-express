import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from './user.entity';
import { Etp } from './etp.entity';

/**
 * Role of the message sender in the chat conversation.
 */
export enum ChatMessageRole {
  USER = 'user',
  ASSISTANT = 'assistant',
}

/**
 * Metadata stored with assistant responses for analytics and debugging.
 */
export interface ChatMessageMetadata {
  /** OpenAI model used for generation */
  model?: string;
  /** Total tokens consumed (prompt + completion) */
  tokens?: number;
  /** Response latency in milliseconds */
  latencyMs?: number;
  /** Field/section user was editing when asking question */
  contextField?: string;
  /** Whether response was served from cache */
  cached?: boolean;
}

/**
 * ChatMessage entity for storing ETP chatbot conversations.
 *
 * Each message belongs to a specific ETP and user session.
 * Supports both user questions and AI assistant responses.
 *
 * Issue #1392 - [CHAT-1167a] Create ChatMessage entity
 * Parent: #1167 - [Assistente] Implementar chatbot para duvidas
 */
@Entity('chat_messages')
@Index(['etpId', 'userId', 'createdAt']) // For efficient history queries
@Index(['etpId', 'createdAt']) // For conversation replay
export class ChatMessage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /**
   * ETP ID this message belongs to.
   * Messages are scoped to a specific ETP for context-aware responses.
   */
  @Column({ type: 'uuid' })
  etpId: string;

  @ManyToOne(() => Etp, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'etpId' })
  etp: Etp;

  /**
   * User ID who sent or received this message.
   */
  @Column({ type: 'uuid' })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  /**
   * Role of the message sender.
   * - 'user': Message from the human user
   * - 'assistant': Response from the AI chatbot
   */
  @Column({
    type: 'enum',
    enum: ChatMessageRole,
  })
  role: ChatMessageRole;

  /**
   * Message content (question or answer).
   * Max length enforced at DTO level.
   */
  @Column({ type: 'text' })
  content: string;

  /**
   * Optional metadata for assistant responses.
   * Stores model info, token usage, latency, etc.
   */
  @Column({ type: 'jsonb', nullable: true })
  metadata: ChatMessageMetadata | null;

  /**
   * Timestamp when message was created.
   * Used for ordering conversation history.
   */
  @CreateDateColumn()
  createdAt: Date;
}
