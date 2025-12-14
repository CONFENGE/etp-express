/**
 * Severity levels for issues found during ETP analysis.
 *
 * @remarks
 * - `critical`: Legal compliance issues that must be fixed (blocks approval)
 * - `important`: Quality issues that significantly impact score (<70)
 * - `suggestion`: Minor improvements that would enhance the document
 */
export type SeverityLevel = 'critical' | 'important' | 'suggestion';

/**
 * Individual issue identified during ETP analysis.
 */
export interface ReportIssue {
  /** Analysis dimension that identified this issue */
  dimension: 'legal' | 'clareza' | 'fundamentacao';
  /** Severity level determining priority */
  severity: SeverityLevel;
  /** Short title summarizing the issue */
  title: string;
  /** Detailed description of the problem */
  description: string;
  /** Actionable recommendation for fixing */
  recommendation: string;
}

/**
 * Executive summary of the analysis report.
 */
export interface ExecutiveSummary {
  /** Overall quality score (0-100), weighted average */
  overallScore: number;
  /** Whether document meets minimum quality threshold (>= 70) */
  meetsMinimumQuality: boolean;
  /** Total number of issues found */
  totalIssues: number;
  /** Number of critical issues (blocks approval) */
  criticalCount: number;
  /** Number of important issues (significant impact) */
  importantCount: number;
  /** Number of suggestions (minor improvements) */
  suggestionCount: number;
  /**
   * Final verdict based on score and critical issues:
   * - "Aprovado": score >= 80 AND criticalCount === 0
   * - "Aprovado com ressalvas": score >= 70 AND criticalCount === 0
   * - "Reprovado": score < 70 OR criticalCount > 0
   */
  verdict: 'Aprovado' | 'Aprovado com ressalvas' | 'Reprovado';
}

/**
 * Section containing issues for a specific analysis dimension.
 */
export interface DimensionSection {
  /** Analysis dimension identifier */
  dimension: 'legal' | 'clareza' | 'fundamentacao';
  /** Human-readable label for the dimension */
  label: string;
  /** Score for this dimension (0-100) */
  score: number;
  /** Whether this dimension passed minimum threshold */
  passed: boolean;
  /** Issues identified in this dimension */
  issues: ReportIssue[];
}

/**
 * Complete improvement report generated from ETP analysis.
 *
 * @remarks
 * This interface represents the structured output of `generateImprovementReport()`.
 * It consolidates analysis results into an actionable format suitable for:
 * - Display in the UI
 * - Export to PDF for B2G clients
 * - API responses
 *
 * @example
 * ```ts
 * const result = await analysisService.analyzeDocument(doc);
 * const report = analysisService.generateImprovementReport(result);
 *
 * console.log(report.executiveSummary.verdict); // "Aprovado com ressalvas"
 * console.log(report.prioritizedRecommendations[0]); // Most critical issue first
 * ```
 */
export interface ImprovementReport {
  /** Timestamp when report was generated */
  generatedAt: Date;
  /** Document metadata from analysis */
  documentInfo: {
    wordCount: number;
    sectionCount: number;
  };
  /** Executive summary with scores and verdict */
  executiveSummary: ExecutiveSummary;
  /** Issues organized by analysis dimension */
  dimensions: DimensionSection[];
  /** All recommendations sorted by priority (critical > important > suggestion) */
  prioritizedRecommendations: ReportIssue[];
}
