import { IsString, IsNotEmpty, MaxLength, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * DTO for sending a message to the ETP chatbot.
 *
 * Issue #1392 - [CHAT-1167a] Create ChatMessage entity and backend module structure
 * Parent: #1167 - [Assistente] Implementar chatbot para duvidas
 */
export class SendMessageDto {
  @ApiProperty({
    description: 'The message/question to send to the chatbot',
    example: 'O que devo escrever na justificativa?',
    maxLength: 2000,
  })
  @IsString()
  @IsNotEmpty({ message: 'A mensagem nao pode estar vazia' })
  @MaxLength(2000, { message: 'A mensagem nao pode exceder 2000 caracteres' })
  message: string;

  @ApiPropertyOptional({
    description:
      'Current field/section being edited (provides context for better responses)',
    example: 'Justificativa da Contratacao',
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  contextField?: string;
}
