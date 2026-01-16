import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ChecklistItemCategory } from '../../../entities/compliance-checklist-item.entity';

/**
 * DTO para histórico de validação (resumido).
 */
export class ValidationHistoryEntryDto {
  @ApiProperty({ description: 'ID da entrada de histórico' })
  id: string;

  @ApiProperty({ description: 'Score obtido (0-100)' })
  score: number;

  @ApiProperty({
    description: 'Status da validação',
    enum: ['APPROVED', 'NEEDS_REVIEW', 'REJECTED'],
  })
  status: 'APPROVED' | 'NEEDS_REVIEW' | 'REJECTED';

  @ApiProperty({ description: 'Data da validação' })
  validatedAt: Date;

  @ApiPropertyOptional({ description: 'Nome do usuário que validou' })
  validatedByName?: string;

  @ApiProperty({ description: 'Total de itens verificados' })
  totalItems: number;

  @ApiProperty({ description: 'Itens aprovados' })
  passedItems: number;

  @ApiProperty({ description: 'Itens reprovados' })
  failedItems: number;
}

/**
 * DTO para violação individual no relatório.
 */
export class ViolationDto {
  @ApiProperty({ description: 'ID do item do checklist' })
  itemId: string;

  @ApiProperty({ description: 'Requisito não atendido' })
  requirement: string;

  @ApiProperty({ description: 'Categoria do requisito' })
  category: ChecklistItemCategory;

  @ApiProperty({
    description: 'Severidade',
    enum: ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'],
  })
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

  @ApiPropertyOptional({ description: 'Campo do ETP afetado' })
  fieldAffected?: string;

  @ApiPropertyOptional({ description: 'Motivo da falha' })
  failureReason?: string;

  @ApiPropertyOptional({ description: 'Sugestão de correção' })
  fixSuggestion?: string;

  @ApiPropertyOptional({ description: 'Referência legal' })
  legalReference?: string;
}

/**
 * DTO para score por categoria.
 */
export class CategoryScoreDto {
  @ApiProperty({ description: 'Nome da categoria' })
  category: ChecklistItemCategory;

  @ApiProperty({ description: 'Nome legível da categoria' })
  categoryName: string;

  @ApiProperty({ description: 'Score da categoria (0-100)' })
  score: number;

  @ApiProperty({ description: 'Total de itens na categoria' })
  totalItems: number;

  @ApiProperty({ description: 'Itens aprovados na categoria' })
  passedItems: number;
}

/**
 * DTO completo do relatório de conformidade.
 *
 * Issue #1264 - [Compliance-c] Criar relatório de conformidade
 */
export class ComplianceReportDto {
  @ApiProperty({ description: 'ID do ETP' })
  etpId: string;

  @ApiProperty({ description: 'Título do ETP' })
  etpTitle: string;

  @ApiPropertyOptional({ description: 'Objeto do ETP' })
  etpObjeto?: string;

  @ApiPropertyOptional({ description: 'Número do processo' })
  numeroProcesso?: string;

  @ApiPropertyOptional({ description: 'Órgão/Entidade' })
  orgaoEntidade?: string;

  @ApiProperty({ description: 'ID do checklist utilizado' })
  checklistId: string;

  @ApiProperty({ description: 'Nome do checklist' })
  checklistName: string;

  @ApiProperty({ description: 'Score geral de conformidade (0-100)' })
  score: number;

  @ApiProperty({ description: 'Score mínimo para aprovação' })
  minimumScore: number;

  @ApiProperty({ description: 'Se o ETP passou na validação' })
  passed: boolean;

  @ApiProperty({
    description: 'Status da validação',
    enum: ['APPROVED', 'NEEDS_REVIEW', 'REJECTED'],
  })
  status: 'APPROVED' | 'NEEDS_REVIEW' | 'REJECTED';

  @ApiProperty({ description: 'Total de itens verificados' })
  totalItems: number;

  @ApiProperty({ description: 'Itens aprovados' })
  passedItems: number;

  @ApiProperty({ description: 'Itens reprovados' })
  failedItems: number;

  @ApiProperty({
    description: 'Scores por categoria',
    type: [CategoryScoreDto],
  })
  categoryScores: CategoryScoreDto[];

  @ApiProperty({
    description: 'Lista de violações encontradas',
    type: [ViolationDto],
  })
  violations: ViolationDto[];

  @ApiProperty({
    description: 'Histórico de validações anteriores (últimas 10)',
    type: [ValidationHistoryEntryDto],
  })
  history: ValidationHistoryEntryDto[];

  @ApiProperty({ description: 'Data de geração do relatório' })
  generatedAt: Date;

  @ApiPropertyOptional({ description: 'Tempo de processamento em ms' })
  processingTimeMs?: number;
}

/**
 * DTO para resultado da validação com histórico salvo.
 */
export class ValidationWithHistoryDto {
  @ApiProperty({ description: 'ID do registro de histórico salvo' })
  historyId: string;

  @ApiProperty({ description: 'Resultado da validação' })
  validationResult: ComplianceReportDto;
}
