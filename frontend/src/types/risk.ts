/**
 * Risk Analysis Types (Frontend)
 *
 * Types for the risk matrix component and risk analysis functionality.
 *
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
export type RiskCategory =
  | 'TECHNICAL'
  | 'SCHEDULE'
  | 'COST'
  | 'LEGAL'
  | 'MARKET'
  | 'ENVIRONMENTAL';

/**
 * Human-readable labels for risk categories (Portuguese)
 */
export const RiskCategoryLabels: Record<RiskCategory, string> = {
  TECHNICAL: 'Técnico',
  SCHEDULE: 'Prazo',
  COST: 'Custo',
  LEGAL: 'Legal',
  MARKET: 'Mercado',
  ENVIRONMENTAL: 'Ambiental',
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
 * Color classes for visual indicators (Tailwind)
 */
export const RiskLevelColors: Record<
  RiskLevel,
  { bg: string; text: string; border: string }
> = {
  LOW: {
    bg: 'bg-green-100 dark:bg-green-900/30',
    text: 'text-green-700 dark:text-green-400',
    border: 'border-green-500',
  },
  MEDIUM: {
    bg: 'bg-yellow-100 dark:bg-yellow-900/30',
    text: 'text-yellow-700 dark:text-yellow-400',
    border: 'border-yellow-500',
  },
  HIGH: {
    bg: 'bg-orange-100 dark:bg-orange-900/30',
    text: 'text-orange-700 dark:text-orange-400',
    border: 'border-orange-500',
  },
  CRITICAL: {
    bg: 'bg-red-100 dark:bg-red-900/30',
    text: 'text-red-700 dark:text-red-400',
    border: 'border-red-500',
  },
};

/**
 * Individual risk item in the matrix
 */
export interface RiskItem {
  id: string;
  category: RiskCategory;
  description: string;
  probability: RiskProbability;
  impact: RiskImpact;
  level: RiskLevel;
  mitigation: string;
  responsible: string;
  order: number;
}

/**
 * Risk matrix stored in ETP section metadata
 */
export interface RiskMatrix {
  risks: RiskItem[];
  globalScore: number;
  globalLevel: RiskLevel;
  distribution: RiskDistribution;
  calculatedAt: string;
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
 * Risk level calculation matrix (probability x impact)
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
 * Calculate risk level from probability and impact
 */
export function calculateRiskLevel(
  probability: RiskProbability,
  impact: RiskImpact,
): RiskLevel {
  return RISK_LEVEL_MATRIX[probability][impact];
}

/**
 * Default mitigation suggestions by category
 */
export const DefaultMitigationSuggestions: Record<RiskCategory, string[]> = {
  TECHNICAL: [
    'Realizar prova de conceito (PoC) antes da contratação',
    'Exigir certificações técnicas do fornecedor',
    'Incluir cláusula de suporte técnico especializado',
    'Prever treinamento da equipe técnica',
  ],
  SCHEDULE: [
    'Definir cronograma com marcos intermediários',
    'Incluir cláusula de multa por atraso',
    'Prever plano de contingência para atrasos',
    'Realizar acompanhamento periódico do cronograma',
  ],
  COST: [
    'Realizar pesquisa de preços em múltiplas fontes',
    'Incluir cláusula de reajuste vinculada a índice oficial',
    'Prever margem de contingência no orçamento',
    'Definir limites para aditivos contratuais',
  ],
  LEGAL: [
    'Consultar assessoria jurídica antes da contratação',
    'Verificar conformidade com Lei 14.133/2021',
    'Incluir cláusulas de compliance anticorrupção',
    'Exigir certidões negativas atualizadas',
  ],
  MARKET: [
    'Pesquisar disponibilidade de fornecedores qualificados',
    'Considerar consórcio para ampliar competitividade',
    'Avaliar sazonalidade do mercado',
    'Prever alternativas em caso de desinteresse do mercado',
  ],
  ENVIRONMENTAL: [
    'Exigir licenças ambientais aplicáveis',
    'Incluir critérios de sustentabilidade na especificação',
    'Prever destinação adequada de resíduos',
    'Avaliar impactos ambientais da solução',
  ],
};
