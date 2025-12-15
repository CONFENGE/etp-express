/**
 * Types for ETP document analysis functionality.
 * Mirrors backend DTOs from analysis.controller.ts
 */

/**
 * Severity levels for issues found during ETP analysis.
 */
export type SeverityLevel = 'critical' | 'important' | 'suggestion';

/**
 * Analysis dimension identifier.
 */
export type AnalysisDimension = 'legal' | 'clareza' | 'fundamentacao';

/**
 * Verdict based on analysis score and critical issues.
 */
export type AnalysisVerdict =
  | 'Aprovado'
  | 'Aprovado com ressalvas'
  | 'Reprovado';

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
 */
export interface DimensionScore {
  dimension: AnalysisDimension;
  score: number;
  passed: boolean;
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
  dimensions: DimensionScore[];
  message: string;
}

/**
 * Individual issue identified during ETP analysis.
 */
export interface ReportIssue {
  dimension: AnalysisDimension;
  severity: SeverityLevel;
  title: string;
  description: string;
  recommendation: string;
}

/**
 * Section containing issues for a specific analysis dimension.
 */
export interface DimensionSection {
  dimension: AnalysisDimension;
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
  generatedAt: Date;
  documentInfo: DocumentInfo;
  executiveSummary: ExecutiveSummary;
  dimensions: DimensionSection[];
  prioritizedRecommendations: ReportIssue[];
}

/**
 * Full analysis details response.
 */
export interface AnalysisDetailsResponse {
  analysisId: string;
  originalFilename: string;
  createdAt: Date;
  result: {
    summary: {
      overallScore: number;
      meetsMinimumQuality: boolean;
      dimensions: DimensionScore[];
      totalIssues: number;
      totalSuggestions: number;
    };
    analyzedAt: Date;
    documentInfo: DocumentInfo;
  };
  report: ImprovementReport;
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
  convertedAt: Date;
  message: string;
}

/**
 * Status of analysis operation.
 */
export type AnalysisStatus =
  | 'idle'
  | 'uploading'
  | 'analyzing'
  | 'completed'
  | 'failed';
