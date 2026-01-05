/**
 * Risk Analysis Types
 *
 * Types for parametrized risk analysis with probability/impact matrix
 * following best practices for public procurement (Lei 14.133/2021).
 *
 * @module modules/risk-analysis
 * @see https://github.com/CONFENGE/etp-express/issues/1160
 */

/**
 * Risk probability levels
 */
export type RiskProbability = 'LOW' | 'MEDIUM' | 'HIGH';

/**
 * Risk impact levels
 */
export type RiskImpact = 'LOW' | 'MEDIUM' | 'HIGH';

/**
 * Calculated risk level based on probability x impact matrix
 */
export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

/**
 * Risk categories for classification
 */
export enum RiskCategory {
  TECHNICAL = 'TECHNICAL',
  SCHEDULE = 'SCHEDULE',
  COST = 'COST',
  LEGAL = 'LEGAL',
  MARKET = 'MARKET',
  ENVIRONMENTAL = 'ENVIRONMENTAL',
}

/**
 * Human-readable labels for risk categories (Portuguese)
 */
export const RiskCategoryLabels: Record<RiskCategory, string> = {
  [RiskCategory.TECHNICAL]: 'Técnico',
  [RiskCategory.SCHEDULE]: 'Prazo',
  [RiskCategory.COST]: 'Custo',
  [RiskCategory.LEGAL]: 'Legal',
  [RiskCategory.MARKET]: 'Mercado',
  [RiskCategory.ENVIRONMENTAL]: 'Ambiental',
};

/**
 * Human-readable labels for probability levels (Portuguese)
 */
export const ProbabilityLabels: Record<RiskProbability, string> = {
  LOW: 'Baixa',
  MEDIUM: 'Média',
  HIGH: 'Alta',
};

/**
 * Human-readable labels for impact levels (Portuguese)
 */
export const ImpactLabels: Record<RiskImpact, string> = {
  LOW: 'Baixo',
  MEDIUM: 'Médio',
  HIGH: 'Alto',
};

/**
 * Human-readable labels for risk levels (Portuguese)
 */
export const RiskLevelLabels: Record<RiskLevel, string> = {
  LOW: 'Baixo',
  MEDIUM: 'Médio',
  HIGH: 'Alto',
  CRITICAL: 'Crítico',
};

/**
 * Color codes for visual indicators
 */
export const RiskLevelColors: Record<RiskLevel, string> = {
  LOW: '#4CAF50', // Green
  MEDIUM: '#FFC107', // Yellow
  HIGH: '#FF9800', // Orange
  CRITICAL: '#F44336', // Red
};

/**
 * Individual risk item in the matrix
 */
export interface RiskItem {
  /** Unique identifier */
  id: string;
  /** Risk category */
  category: RiskCategory;
  /** Risk description */
  description: string;
  /** Probability level */
  probability: RiskProbability;
  /** Impact level */
  impact: RiskImpact;
  /** Calculated risk level (probability x impact) */
  level: RiskLevel;
  /** Mitigation strategy */
  mitigation: string;
  /** Responsible person/role */
  responsible: string;
  /** Order in the list */
  order: number;
}

/**
 * Risk matrix stored in ETP section metadata
 */
export interface RiskMatrix {
  /** List of identified risks */
  risks: RiskItem[];
  /** Global risk score (0-100) */
  globalScore: number;
  /** Global risk level based on score */
  globalLevel: RiskLevel;
  /** Summary of risk distribution by level */
  distribution: RiskDistribution;
  /** Timestamp of last calculation */
  calculatedAt: Date;
  /** Version for future migrations */
  version: number;
}

/**
 * Distribution of risks by level
 */
export interface RiskDistribution {
  low: number;
  medium: number;
  high: number;
  critical: number;
  total: number;
}

/**
 * DTO for creating a new risk item
 */
export interface CreateRiskItemDto {
  category: RiskCategory;
  description: string;
  probability: RiskProbability;
  impact: RiskImpact;
  mitigation: string;
  responsible: string;
}

/**
 * DTO for updating a risk item
 */
export interface UpdateRiskItemDto extends Partial<CreateRiskItemDto> {
  id: string;
}

/**
 * Default mitigation suggestions by category
 */
export const DefaultMitigationSuggestions: Record<RiskCategory, string[]> = {
  [RiskCategory.TECHNICAL]: [
    'Realizar prova de conceito (PoC) antes da contratação',
    'Exigir certificações técnicas do fornecedor',
    'Incluir cláusula de suporte técnico especializado',
    'Prever treinamento da equipe técnica',
  ],
  [RiskCategory.SCHEDULE]: [
    'Definir cronograma com marcos intermediários',
    'Incluir cláusula de multa por atraso',
    'Prever plano de contingência para atrasos',
    'Realizar acompanhamento periódico do cronograma',
  ],
  [RiskCategory.COST]: [
    'Realizar pesquisa de preços em múltiplas fontes',
    'Incluir cláusula de reajuste vinculada a índice oficial',
    'Prever margem de contingência no orçamento',
    'Definir limites para aditivos contratuais',
  ],
  [RiskCategory.LEGAL]: [
    'Consultar assessoria jurídica antes da contratação',
    'Verificar conformidade com Lei 14.133/2021',
    'Incluir cláusulas de compliance anticorrupção',
    'Exigir certidões negativas atualizadas',
  ],
  [RiskCategory.MARKET]: [
    'Pesquisar disponibilidade de fornecedores qualificados',
    'Considerar consórcio para ampliar competitividade',
    'Avaliar sazonalidade do mercado',
    'Prever alternativas em caso de desinteresse do mercado',
  ],
  [RiskCategory.ENVIRONMENTAL]: [
    'Exigir licenças ambientais aplicáveis',
    'Incluir critérios de sustentabilidade na especificação',
    'Prever destinação adequada de resíduos',
    'Avaliar impactos ambientais da solução',
  ],
};

/**
 * Risk level calculation matrix (probability x impact)
 *
 * | Prob \ Impact | LOW     | MEDIUM  | HIGH     |
 * |---------------|---------|---------|----------|
 * | LOW           | LOW     | LOW     | MEDIUM   |
 * | MEDIUM        | LOW     | MEDIUM  | HIGH     |
 * | HIGH          | MEDIUM  | HIGH    | CRITICAL |
 */
export const RISK_LEVEL_MATRIX: Record<
  RiskProbability,
  Record<RiskImpact, RiskLevel>
> = {
  LOW: {
    LOW: 'LOW',
    MEDIUM: 'LOW',
    HIGH: 'MEDIUM',
  },
  MEDIUM: {
    LOW: 'LOW',
    MEDIUM: 'MEDIUM',
    HIGH: 'HIGH',
  },
  HIGH: {
    LOW: 'MEDIUM',
    MEDIUM: 'HIGH',
    HIGH: 'CRITICAL',
  },
};

/**
 * Numeric weights for score calculation
 */
export const RISK_LEVEL_WEIGHTS: Record<RiskLevel, number> = {
  LOW: 1,
  MEDIUM: 2,
  HIGH: 3,
  CRITICAL: 4,
};

/**
 * Current version of the risk matrix structure
 */
export const RISK_MATRIX_VERSION = 1;
