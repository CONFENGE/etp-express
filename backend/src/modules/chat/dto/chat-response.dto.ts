import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Metadata included with chatbot responses.
 */
export class ChatResponseMetadata {
  @ApiProperty({
    description: 'Total tokens consumed by the request',
    example: 150,
  })
  tokens: number;

  @ApiProperty({
    description: 'Response latency in milliseconds',
    example: 1200,
  })
  latencyMs: number;

  @ApiPropertyOptional({
    description: 'OpenAI model used for generation',
    example: 'gpt-4.1-nano',
  })
  model?: string;
}

/**
 * DTO for chatbot response to user message.
 *
 * Issue #1392 - [CHAT-1167a] Create ChatMessage entity and backend module structure
 * Parent: #1167 - [Assistente] Implementar chatbot para duvidas
 */
export class ChatResponseDto {
  @ApiProperty({
    description: 'Unique identifier of the assistant message',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  id: string;

  @ApiProperty({
    description: 'The chatbot response content',
    example:
      'A justificativa deve conter a fundamentacao legal e tecnica para a contratacao...',
  })
  content: string;

  @ApiPropertyOptional({
    description: 'Suggested content to insert into the current field',
    example:
      'A presente contratacao se justifica pela necessidade de modernizacao dos sistemas...',
  })
  suggestedContent?: string;

  @ApiPropertyOptional({
    description: 'Related legislation articles mentioned in the response',
    example: ['Art. 6, Lei 14.133/2021', 'Art. 18, Lei 14.133/2021'],
    type: [String],
  })
  relatedLegislation?: string[];

  @ApiProperty({
    description: 'Response metadata (tokens, latency)',
    type: ChatResponseMetadata,
  })
  metadata: ChatResponseMetadata;
}

/**
 * DTO for chat history message item.
 */
export class ChatHistoryItemDto {
  @ApiProperty({
    description: 'Message unique identifier',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  id: string;

  @ApiProperty({
    description: 'Role of the message sender',
    enum: ['user', 'assistant'],
    example: 'user',
  })
  role: 'user' | 'assistant';

  @ApiProperty({
    description: 'Message content',
    example: 'O que devo escrever na justificativa?',
  })
  content: string;

  @ApiProperty({
    description: 'Message creation timestamp',
    example: '2026-01-10T10:30:00.000Z',
  })
  createdAt: Date;
}
