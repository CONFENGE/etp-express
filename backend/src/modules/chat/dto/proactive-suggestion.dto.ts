import { ApiProperty } from '@nestjs/swagger';

/**
 * Type of proactive suggestion based on detected issue.
 */
export type SuggestionType = 'incomplete' | 'improvement' | 'warning';

/**
 * Priority level for sorting and displaying suggestions.
 */
export type SuggestionPriority = 'high' | 'medium' | 'low';

/**
 * DTO for proactive AI suggestions that detect issues and offer hints.
 *
 * Types:
 * - `incomplete`: Field is empty or has insufficient content
 * - `improvement`: Content exists but could be enhanced
 * - `warning`: Potential inconsistency or compliance issue detected
 *
 * Priority levels:
 * - `high`: Critical issues (empty required fields, compliance problems)
 * - `medium`: Important improvements (short content, missing details)
 * - `low`: Optional enhancements (style, formatting)
 *
 * Issue #1397 - [CHAT-1167f] Add proactive suggestions and field validation hints
 * Parent: #1167 - [Assistente] Implementar chatbot para duvidas
 */
export class ProactiveSuggestionDto {
  @ApiProperty({
    description: 'Type of the suggestion',
    enum: ['incomplete', 'improvement', 'warning'],
    example: 'incomplete',
  })
  type: SuggestionType;

  @ApiProperty({
    description: 'Field or section name this suggestion relates to',
    example: 'Justificativa',
  })
  field: string;

  @ApiProperty({
    description: 'User-friendly message describing the issue and offering help',
    example:
      'A secao "Justificativa" esta vazia ou muito curta. Posso ajudar a preenche-la?',
  })
  message: string;

  @ApiProperty({
    description: 'Priority level of the suggestion',
    enum: ['high', 'medium', 'low'],
    example: 'high',
  })
  priority: SuggestionPriority;

  @ApiProperty({
    description: 'Optional prompt to send when user clicks for help',
    example: 'Me ajude a escrever a justificativa para este ETP',
    required: false,
  })
  helpPrompt?: string;
}

/**
 * DTO for the suggestions response array.
 */
export class ProactiveSuggestionsResponseDto {
  @ApiProperty({
    description: 'Array of proactive suggestions for the ETP',
    type: [ProactiveSuggestionDto],
  })
  suggestions: ProactiveSuggestionDto[];

  @ApiProperty({
    description: 'Total count of detected issues',
    example: 3,
  })
  totalIssues: number;

  @ApiProperty({
    description: 'High priority issues count (requires immediate attention)',
    example: 1,
  })
  highPriorityCount: number;
}
