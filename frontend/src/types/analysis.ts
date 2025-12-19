/**
 * Analysis types for the Import & Analysis module.
 * Mirrors backend DTOs and interfaces.
 */

/**
 * Analysis dimension identifier
 */
export type AnalysisDimensionType = 'legal' | 'clareza' | 'fundamentacao';

/**
 * @deprecated Use AnalysisDimensionType instead
 */
export type AnalysisDimension = AnalysisDimensionType;

/**
 * Severity levels for issues found during ETP analysis.
 */
export type SeverityLevel = 'critical' | 'important' | 'suggestion';

/**
 * Verdict based on analysis score and critical issues.
 */
export type AnalysisVerdict =
 | 'Aprovado'
 | 'Aprovado com ressalvas'
 | 'Reprovado';

/**
 * Status of analysis operation.
 */
export type AnalysisStatus =
 | 'idle'
 | 'uploading'
 | 'analyzing'
 | 'completed'
 | 'failed';

/**
 * Document metadata from analysis.
 */
export interface DocumentInfo {
 wordCount: number;
 sectionCount: number;
}

/**
 * Summary of issues by severity.
 */
export interface IssueSummary {
 critical: number;
 important: number;
 suggestion: number;
}

/**
 * Individual dimension score breakdown.
 * Used by ScoreCard and other display components.
 */
export interface AnalysisDimensionScore {
 dimension: AnalysisDimensionType;
 score: number;
 passed: boolean;
}

/**
 * @deprecated Use AnalysisDimensionScore instead
 */
export type DimensionScore = AnalysisDimensionScore;

/**
 * Individual issue identified during ETP analysis.
 */
export interface ReportIssue {
 dimension: AnalysisDimensionType;
 severity: SeverityLevel;
 title: string;
 description: string;
 recommendation: string;
}

/**
 * Section containing issues for a specific analysis dimension.
 */
export interface DimensionSection {
 dimension: AnalysisDimensionType;
 label: string;
 score: number;
 passed: boolean;
 issues: ReportIssue[];
}

/**
 * Executive summary of the analysis report.
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
 * Complete improvement report generated from ETP analysis.
 */
export interface ImprovementReport {
 generatedAt: string;
 documentInfo: DocumentInfo;
 executiveSummary: ExecutiveSummary;
 dimensions: DimensionSection[];
 prioritizedRecommendations: ReportIssue[];
}

/**
 * Response from document upload and analysis.
 * Mirrors UploadAnalysisResponseDto from backend.
 */
export interface AnalysisResponse {
 analysisId: string;
 originalFilename: string;
 mimeType: string;
 overallScore: number;
 meetsMinimumQuality: boolean;
 verdict: AnalysisVerdict;
 documentInfo: DocumentInfo;
 issueSummary: IssueSummary;
 dimensions: AnalysisDimensionScore[];
 message: string;
}

/**
 * Upload analysis response from the API (wrapper format)
 */
export interface UploadAnalysisResponse {
 data: AnalysisResponse;
 disclaimer: string;
}

/**
 * Full analysis details response.
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
 * Request for converting analyzed document to ETP.
 */
export interface ConvertToEtpRequest {
 title?: string;
 metadata?: Record<string, unknown>;
}

/**
 * Response from document to ETP conversion.
 * Mirrors ConvertToEtpResponseDto from backend.
 */
export interface ConvertToEtpResponse {
 etpId: string;
 title: string;
 status: string;
 sectionsCount: number;
 mappedSectionsCount: number;
 customSectionsCount: number;
 convertedAt: string;
 message: string;
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
