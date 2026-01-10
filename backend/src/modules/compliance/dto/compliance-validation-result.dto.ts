import {
  ChecklistItemType,
  ChecklistItemCategory,
} from '../../../entities/compliance-checklist-item.entity';

/**
 * Resultado da validacao de um item individual do checklist.
 */
export interface ComplianceItemResult {
  /**
   * ID do item do checklist.
   */
  itemId: string;

  /**
   * Nome do requisito.
   */
  requirement: string;

  /**
   * Se o item passou na validacao.
   */
  passed: boolean;

  /**
   * Tipo do item (MANDATORY, RECOMMENDED, OPTIONAL).
   */
  type: ChecklistItemType;

  /**
   * Categoria do item.
   */
  category: ChecklistItemCategory;

  /**
   * Peso do item no score.
   */
  weight: number;

  /**
   * Pontuacao obtida (0 se falhou, weight se passou).
   */
  score: number;

  /**
   * Motivo da falha (se aplicavel).
   */
  failureReason?: string;

  /**
   * Sugestao de correcao (se falhou).
   */
  fixSuggestion?: string;

  /**
   * Referencia legal do requisito.
   */
  legalReference?: string;

  /**
   * Campo do ETP que foi verificado.
   */
  fieldChecked?: string;

  /**
   * Valor encontrado no campo (resumido).
   */
  valueFound?: string;
}

/**
 * Sugestao de melhoria para o ETP.
 */
export interface ComplianceSuggestion {
  /**
   * Categoria da sugestao.
   */
  category: ChecklistItemCategory;

  /**
   * Titulo da sugestao.
   */
  title: string;

  /**
   * Descricao detalhada.
   */
  description: string;

  /**
   * Prioridade: 'high' | 'medium' | 'low'
   */
  priority: 'high' | 'medium' | 'low';

  /**
   * Campo do ETP que precisa ser corrigido.
   */
  field?: string;

  /**
   * Referencia legal.
   */
  legalReference?: string;

  /**
   * Codigo de rejeicao associado.
   */
  rejectionCode?: string;
}

/**
 * Resultado completo da validacao de conformidade de um ETP.
 *
 * Issue #1383 - ComplianceValidationService
 */
export interface ComplianceValidationResult {
  /**
   * ID do ETP validado.
   */
  etpId: string;

  /**
   * ID do checklist utilizado.
   */
  checklistId: string;

  /**
   * Nome do checklist.
   */
  checklistName: string;

  /**
   * Score total de conformidade (0-100).
   */
  score: number;

  /**
   * Score minimo para aprovacao.
   */
  minimumScore: number;

  /**
   * Se o ETP passou na validacao (score >= minimumScore).
   */
  passed: boolean;

  /**
   * Status textual: 'APPROVED', 'NEEDS_REVIEW', 'REJECTED'
   */
  status: 'APPROVED' | 'NEEDS_REVIEW' | 'REJECTED';

  /**
   * Total de itens verificados.
   */
  totalItems: number;

  /**
   * Itens que passaram.
   */
  passedItems: number;

  /**
   * Itens que falharam.
   */
  failedItems: number;

  /**
   * Itens ignorados (inativos ou nao aplicaveis).
   */
  skippedItems: number;

  /**
   * Resultados detalhados por item.
   */
  itemResults: ComplianceItemResult[];

  /**
   * Sugestoes de melhoria.
   */
  suggestions: ComplianceSuggestion[];

  /**
   * Resumo por categoria.
   */
  categoryScores: Record<
    ChecklistItemCategory,
    {
      total: number;
      passed: number;
      score: number;
      maxScore: number;
    }
  >;

  /**
   * Data da validacao.
   */
  validatedAt: Date;

  /**
   * Tempo de processamento em ms.
   */
  processingTimeMs: number;
}

/**
 * DTO para solicitar validacao de um ETP.
 */
export class ValidateEtpDto {
  /**
   * ID do ETP a ser validado.
   */
  etpId: string;

  /**
   * ID do checklist a usar (opcional - usa checklist padrao do tipo do ETP).
   */
  checklistId?: string;

  /**
   * Se true, inclui itens OPTIONAL na validacao.
   */
  includeOptional?: boolean;
}

/**
 * DTO resumido para exibicao no frontend.
 */
export interface ComplianceScoreSummary {
  score: number;
  passed: boolean;
  status: 'APPROVED' | 'NEEDS_REVIEW' | 'REJECTED';
  totalItems: number;
  passedItems: number;
  failedItems: number;
  topIssues: {
    requirement: string;
    fixSuggestion: string;
    priority: 'high' | 'medium' | 'low';
  }[];
}
