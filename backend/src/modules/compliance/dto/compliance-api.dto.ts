import { ApiProperty } from '@nestjs/swagger';
import {
  ChecklistItemType,
  ChecklistItemCategory,
} from '../../../entities/compliance-checklist-item.entity';

/**
 * DTOs para API de Compliance com documentacao Swagger.
 * Issue #1385 - [TCU-1163d] Criar endpoints REST para validacao de conformidade
 */

/**
 * DTO para resultado de validacao de item individual.
 */
export class ComplianceItemResultDto {
  @ApiProperty({
    description: 'ID do item do checklist',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  itemId: string;

  @ApiProperty({
    description: 'Nome do requisito',
    example: 'Justificativa da necessidade da contratacao',
  })
  requirement: string;

  @ApiProperty({
    description: 'Se o item passou na validacao',
    example: true,
  })
  passed: boolean;

  @ApiProperty({
    description: 'Tipo do item: MANDATORY, RECOMMENDED ou OPTIONAL',
    enum: ChecklistItemType,
    example: ChecklistItemType.MANDATORY,
  })
  type: ChecklistItemType;

  @ApiProperty({
    description: 'Categoria do item',
    enum: ChecklistItemCategory,
    example: ChecklistItemCategory.JUSTIFICATION,
  })
  category: ChecklistItemCategory;

  @ApiProperty({
    description: 'Peso do item no score (1-100)',
    example: 15,
  })
  weight: number;

  @ApiProperty({
    description: 'Pontuacao obtida (0 se falhou, weight se passou)',
    example: 15,
  })
  score: number;

  @ApiProperty({
    description: 'Motivo da falha (se aplicavel)',
    example: 'Campo "justificativaContratacao" esta vazio ou ausente',
    nullable: true,
    required: false,
  })
  failureReason?: string;

  @ApiProperty({
    description: 'Sugestao de correcao (se falhou)',
    example: 'Inclua uma justificativa detalhada explicando a necessidade...',
    nullable: true,
    required: false,
  })
  fixSuggestion?: string;

  @ApiProperty({
    description: 'Referencia legal do requisito',
    example: 'Art. 18, par. 1o, I - Lei 14.133/2021',
    nullable: true,
    required: false,
  })
  legalReference?: string;

  @ApiProperty({
    description: 'Campo do ETP que foi verificado',
    example: 'justificativaContratacao',
    nullable: true,
    required: false,
  })
  fieldChecked?: string;

  @ApiProperty({
    description: 'Valor encontrado no campo (resumido)',
    example: 'A contratacao se faz necessaria para...',
    nullable: true,
    required: false,
  })
  valueFound?: string;
}

/**
 * DTO para sugestao de melhoria.
 */
export class ComplianceSuggestionDto {
  @ApiProperty({
    description: 'Categoria da sugestao',
    enum: ChecklistItemCategory,
    example: ChecklistItemCategory.JUSTIFICATION,
  })
  category: ChecklistItemCategory;

  @ApiProperty({
    description: 'Titulo da sugestao',
    example: 'Justificativa da necessidade da contratacao',
  })
  title: string;

  @ApiProperty({
    description: 'Descricao detalhada da sugestao',
    example: 'Inclua uma justificativa detalhada explicando a necessidade...',
  })
  description: string;

  @ApiProperty({
    description: 'Prioridade da sugestao',
    enum: ['high', 'medium', 'low'],
    example: 'high',
  })
  priority: 'high' | 'medium' | 'low';

  @ApiProperty({
    description: 'Campo do ETP que precisa ser corrigido',
    example: 'justificativaContratacao',
    nullable: true,
    required: false,
  })
  field?: string;

  @ApiProperty({
    description: 'Referencia legal',
    example: 'Art. 18, par. 1o, I - Lei 14.133/2021',
    nullable: true,
    required: false,
  })
  legalReference?: string;

  @ApiProperty({
    description: 'Codigo de rejeicao associado',
    example: 'REJ-001',
    nullable: true,
    required: false,
  })
  rejectionCode?: string;
}

/**
 * DTO para score por categoria.
 */
export class CategoryScoreDto {
  @ApiProperty({
    description: 'Total de itens na categoria',
    example: 5,
  })
  total: number;

  @ApiProperty({
    description: 'Itens que passaram na categoria',
    example: 4,
  })
  passed: number;

  @ApiProperty({
    description: 'Score obtido na categoria',
    example: 40,
  })
  score: number;

  @ApiProperty({
    description: 'Score maximo possivel na categoria',
    example: 50,
  })
  maxScore: number;
}

/**
 * DTO para resultado completo de validacao de conformidade.
 */
export class ComplianceValidationResultDto {
  @ApiProperty({
    description: 'ID do ETP validado',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  etpId: string;

  @ApiProperty({
    description: 'ID do checklist utilizado',
    example: 'b2c3d4e5-f6a7-8901-bcde-f12345678901',
  })
  checklistId: string;

  @ApiProperty({
    description: 'Nome do checklist',
    example: 'TCU - Servicos',
  })
  checklistName: string;

  @ApiProperty({
    description: 'Score total de conformidade (0-100)',
    example: 75,
  })
  score: number;

  @ApiProperty({
    description: 'Score minimo para aprovacao',
    example: 70,
  })
  minimumScore: number;

  @ApiProperty({
    description: 'Se o ETP passou na validacao (score >= minimumScore)',
    example: true,
  })
  passed: boolean;

  @ApiProperty({
    description: 'Status da validacao',
    enum: ['APPROVED', 'NEEDS_REVIEW', 'REJECTED'],
    example: 'APPROVED',
  })
  status: 'APPROVED' | 'NEEDS_REVIEW' | 'REJECTED';

  @ApiProperty({
    description: 'Total de itens verificados',
    example: 20,
  })
  totalItems: number;

  @ApiProperty({
    description: 'Quantidade de itens que passaram',
    example: 15,
  })
  passedItems: number;

  @ApiProperty({
    description: 'Quantidade de itens que falharam',
    example: 5,
  })
  failedItems: number;

  @ApiProperty({
    description: 'Quantidade de itens ignorados',
    example: 2,
  })
  skippedItems: number;

  @ApiProperty({
    description: 'Resultados detalhados por item',
    type: [ComplianceItemResultDto],
  })
  itemResults: ComplianceItemResultDto[];

  @ApiProperty({
    description: 'Sugestoes de melhoria',
    type: [ComplianceSuggestionDto],
  })
  suggestions: ComplianceSuggestionDto[];

  @ApiProperty({
    description: 'Scores por categoria',
    type: 'object',
    additionalProperties: {
      type: 'object',
      properties: {
        total: { type: 'number' },
        passed: { type: 'number' },
        score: { type: 'number' },
        maxScore: { type: 'number' },
      },
    },
    example: {
      JUSTIFICATION: { total: 3, passed: 2, score: 20, maxScore: 30 },
      REQUIREMENTS: { total: 4, passed: 4, score: 25, maxScore: 25 },
    },
  })
  categoryScores: Record<string, CategoryScoreDto>;

  @ApiProperty({
    description: 'Data e hora da validacao',
    example: '2026-01-10T18:30:00.000Z',
  })
  validatedAt: Date;

  @ApiProperty({
    description: 'Tempo de processamento em milissegundos',
    example: 150,
  })
  processingTimeMs: number;
}

/**
 * DTO para resumo de score (endpoint simplificado).
 */
export class ComplianceScoreSummaryDto {
  @ApiProperty({
    description: 'Score de conformidade (0-100)',
    example: 75,
  })
  score: number;

  @ApiProperty({
    description: 'Se o ETP passou na validacao',
    example: true,
  })
  passed: boolean;

  @ApiProperty({
    description: 'Status da validacao',
    enum: ['APPROVED', 'NEEDS_REVIEW', 'REJECTED'],
    example: 'APPROVED',
  })
  status: 'APPROVED' | 'NEEDS_REVIEW' | 'REJECTED';

  @ApiProperty({
    description: 'Total de itens verificados',
    example: 20,
  })
  totalItems: number;

  @ApiProperty({
    description: 'Itens que passaram',
    example: 15,
  })
  passedItems: number;

  @ApiProperty({
    description: 'Itens que falharam',
    example: 5,
  })
  failedItems: number;

  @ApiProperty({
    description: 'Top 3 issues prioritarias',
    type: 'array',
    items: {
      type: 'object',
      properties: {
        requirement: { type: 'string' },
        fixSuggestion: { type: 'string' },
        priority: { type: 'string', enum: ['high', 'medium', 'low'] },
      },
    },
    example: [
      {
        requirement: 'Justificativa da necessidade',
        fixSuggestion: 'Inclua uma justificativa detalhada...',
        priority: 'high',
      },
    ],
  })
  topIssues: {
    requirement: string;
    fixSuggestion: string;
    priority: 'high' | 'medium' | 'low';
  }[];
}

/**
 * DTO para response wrapper padrao.
 */
export class ComplianceResponseDto<T> {
  @ApiProperty({
    description: 'Dados da resposta',
  })
  data: T;

  @ApiProperty({
    description: 'Disclaimer legal',
    example:
      'Este documento foi gerado por IA e deve ser revisado por profissional habilitado.',
  })
  disclaimer: string;
}
