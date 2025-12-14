import { LegalValidationResult } from '../../orchestrator/agents/legal.agent';
import { ClarezaResult } from '../../orchestrator/agents/clareza.agent';
import { FundamentacaoResult } from '../../orchestrator/agents/fundamentacao.agent';

/**
 * Summary of an individual analysis dimension.
 */
export interface AnalysisDimensionSummary {
  /** Name of the analysis dimension */
  dimension: 'legal' | 'clareza' | 'fundamentacao';
  /** Score (0-100) for this dimension */
  score: number;
  /** Whether this dimension passed minimum threshold */
  passed: boolean;
  /** Number of issues found */
  issueCount: number;
  /** Number of suggestions/recommendations */
  suggestionCount: number;
}

/**
 * Overall analysis summary with aggregated metrics.
 */
export interface AnalysisSummary {
  /** Overall quality score (0-100), weighted average of all dimensions */
  overallScore: number;
  /** Whether the document meets minimum quality threshold (>= 70) */
  meetsMinimumQuality: boolean;
  /** Individual dimension summaries */
  dimensions: AnalysisDimensionSummary[];
  /** Total issues found across all dimensions */
  totalIssues: number;
  /** Total suggestions across all dimensions */
  totalSuggestions: number;
}

/**
 * Result of ETP document analysis.
 * Consolidates results from Legal, Clareza, and Fundamentacao agents.
 *
 * @remarks
 * This interface is the output of ETPAnalysisService.analyzeDocument().
 * It provides both detailed results from each agent and a consolidated summary.
 *
 * Usage:
 * - `summary.overallScore` - Quick quality assessment
 * - `summary.meetsMinimumQuality` - Boolean for pass/fail decisions
 * - `legal/clareza/fundamentacao` - Detailed agent results for specific feedback
 *
 * The overall score is calculated as a weighted average:
 * - Legal: 40% (most critical for compliance)
 * - Clareza: 30% (readability matters)
 * - Fundamentacao: 30% (argumentation quality)
 */
export interface AnalysisResult {
  /** Consolidated summary with overall score and dimension breakdown */
  summary: AnalysisSummary;
  /** Detailed legal compliance analysis result */
  legal: LegalValidationResult;
  /** Detailed clarity and readability analysis result */
  clareza: ClarezaResult;
  /** Detailed argumentation quality analysis result */
  fundamentacao: FundamentacaoResult;
  /** Timestamp of analysis completion */
  analyzedAt: Date;
  /** Document metadata used for analysis */
  documentInfo: {
    wordCount: number;
    sectionCount: number;
  };
}
