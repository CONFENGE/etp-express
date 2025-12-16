/**
 * Analysis types for the Import & Analysis module.
 * Mirrors backend DTOs and interfaces.
 */

/**
 * Analysis dimension identifier
 */
export type AnalysisDimensionType = 'legal' | 'clareza' | 'fundamentacao';

/**
 * Severity levels for issues
 */
export type SeverityLevel = 'critical' | 'important' | 'suggestion';

/**
 * Analysis verdict
 */
export type AnalysisVerdict =
  | 'Aprovado'
  | 'Aprovado com ressalvas'
  | 'Reprovado';

/**
 * Analysis dimension from the API
 */
export interface AnalysisDimension {
  dimension: AnalysisDimensionType;
  score: number;
  passed: boolean;
}

/**
 * Issue summary from the API
 */
export interface IssueSummary {
  critical: number;
  important: number;
  suggestion: number;
}

/**
 * Document info from the API
 */
export interface DocumentInfo {
  wordCount: number;
  sectionCount: number;
}

/**
 * Individual issue identified during analysis
 */
export interface ReportIssue {
  dimension: AnalysisDimensionType;
  severity: SeverityLevel;
  title: string;
  description: string;
  recommendation: string;
}

/**
 * Executive summary with scores and verdict
 */
export interface ExecutiveSummary {
  overallScore: number;
  meetsMinimumQuality: boolean;
  totalIssues: number;
  criticalCount: number;
  importantCount: number;
  suggestionCount: number;
  verdict: AnalysisVerdict;
}

/**
 * Section containing issues for a specific dimension
 */
export interface DimensionSection {
  dimension: AnalysisDimensionType;
  label: string;
  score: number;
  passed: boolean;
  issues: ReportIssue[];
}

/**
 * Complete improvement report
 */
export interface ImprovementReport {
  generatedAt: string;
  documentInfo: DocumentInfo;
  executiveSummary: ExecutiveSummary;
  dimensions: DimensionSection[];
  prioritizedRecommendations: ReportIssue[];
}

/**
 * Upload analysis response from the API
 */
export interface UploadAnalysisResponse {
  data: {
    analysisId: string;
    originalFilename: string;
    mimeType: string;
    overallScore: number;
    meetsMinimumQuality: boolean;
    verdict: AnalysisVerdict;
    documentInfo: DocumentInfo;
    issueSummary: IssueSummary;
    dimensions: AnalysisDimension[];
    message: string;
  };
  disclaimer: string;
}

/**
 * Full analysis details response
 */
export interface AnalysisDetailsResponse {
  data: {
    analysisId: string;
    originalFilename: string;
    createdAt: string;
    report: ImprovementReport;
  };
  disclaimer: string;
}

/**
 * Convert to ETP response from the API
 */
export interface ConvertToEtpResponse {
  data: {
    etpId: string;
    title: string;
    status: string;
    sectionsCount: number;
    mappedSectionsCount: number;
    customSectionsCount: number;
    convertedAt: string;
    message: string;
  };
  disclaimer: string;
}

/**
 * Dimension labels in Portuguese
 */
export const DIMENSION_LABELS: Record<AnalysisDimensionType, string> = {
  legal: 'Conformidade Legal',
  clareza: 'Clareza e Legibilidade',
  fundamentacao: 'Qualidade da Fundamentação',
};

/**
 * Dimension descriptions
 */
export const DIMENSION_DESCRIPTIONS: Record<AnalysisDimensionType, string> = {
  legal: 'Verifica conformidade com a Lei 14.133/2021 e normas aplicáveis',
  clareza: 'Avalia legibilidade, estrutura e objetividade do texto',
  fundamentacao: 'Analisa qualidade dos argumentos e justificativas técnicas',
};

/**
 * Severity labels and colors
 */
export const SEVERITY_CONFIG: Record<
  SeverityLevel,
  { label: string; color: string; bgColor: string }
> = {
  critical: {
    label: 'Crítico',
    color: 'text-red-700',
    bgColor: 'bg-red-100',
  },
  important: {
    label: 'Importante',
    color: 'text-yellow-700',
    bgColor: 'bg-yellow-100',
  },
  suggestion: {
    label: 'Sugestão',
    color: 'text-blue-700',
    bgColor: 'bg-blue-100',
  },
};

/**
 * Verdict configuration
 */
export const VERDICT_CONFIG: Record<
  AnalysisVerdict,
  {
    label: string;
    color: string;
    bgColor: string;
    icon: 'check' | 'warning' | 'x';
  }
> = {
  Aprovado: {
    label: 'Aprovado',
    color: 'text-green-700',
    bgColor: 'bg-green-500',
    icon: 'check',
  },
  'Aprovado com ressalvas': {
    label: 'Aprovado com ressalvas',
    color: 'text-yellow-700',
    bgColor: 'bg-yellow-500',
    icon: 'warning',
  },
  Reprovado: {
    label: 'Reprovado',
    color: 'text-red-700',
    bgColor: 'bg-red-500',
    icon: 'x',
  },
};
