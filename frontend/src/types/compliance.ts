/**
 * Types for Compliance validation feature.
 * Frontend types matching backend DTOs from compliance module.
 *
 * Issue #1386 - [TCU-1163e] Componente indicador de conformidade no ETP Editor
 * Issue #1534 - [Parity] Implementar serialização Date em Compliance types
 *
 * @see backend/src/modules/compliance/dto/compliance-api.dto.ts
 * @see backend/src/modules/compliance/dto/compliance-validation-result.dto.ts
 */

/**
 * Serialized date type that accepts both Date objects and ISO strings.
 * Backend returns Date objects which JSON.stringify converts to ISO strings.
 * This type ensures type safety while allowing for both formats.
 *
 * @example
 * // Both formats are valid:
 * const date1: SerializedDate = "2026-01-17T12:00:00.000Z";
 * const date2: SerializedDate = new Date();
 *
 * // Use normalizeDate to convert to Date for manipulation:
 * const d = normalizeDate(date1); // Returns Date object
 */
export type SerializedDate = Date | string;

/**
 * Type of checklist item (mandatory, recommended, optional).
 * Must match backend ChecklistItemType enum.
 */
export type ChecklistItemType = 'MANDATORY' | 'RECOMMENDED' | 'OPTIONAL';

/**
 * Category of checklist item for grouping.
 * Must match backend ChecklistItemCategory enum.
 */
export type ChecklistItemCategory =
  | 'IDENTIFICATION'
  | 'JUSTIFICATION'
  | 'REQUIREMENTS'
  | 'PRICING'
  | 'RISKS'
  | 'CONCLUSION'
  | 'DOCUMENTATION';

/**
 * Validation status returned from compliance service.
 */
export type ComplianceStatus = 'APPROVED' | 'NEEDS_REVIEW' | 'REJECTED';

/**
 * Priority level for suggestions.
 */
export type CompliancePriority = 'high' | 'medium' | 'low';

/**
 * Result of validating a single checklist item.
 */
export interface ComplianceItemResult {
  /** ID of the checklist item */
  itemId: string;
  /** Name of the requirement */
  requirement: string;
  /** Whether the item passed validation */
  passed: boolean;
  /** Type of the item (MANDATORY, RECOMMENDED, OPTIONAL) */
  type: ChecklistItemType;
  /** Category for grouping */
  category: ChecklistItemCategory;
  /** Weight in score calculation (1-100) */
  weight: number;
  /** Score obtained (0 if failed, weight if passed) */
  score: number;
  /** Reason for failure (if applicable) */
  failureReason?: string;
  /** Suggestion for fixing (if failed) */
  fixSuggestion?: string;
  /** Legal reference for the requirement */
  legalReference?: string;
  /** ETP field that was checked */
  fieldChecked?: string;
  /** Section where fix is needed */
  sectionRequired?: string;
  /** Value found in the field (summarized) */
  valueFound?: string;
}

/**
 * Suggestion for improving compliance.
 */
export interface ComplianceSuggestion {
  /** Category of the suggestion */
  category: ChecklistItemCategory;
  /** Title of the suggestion */
  title: string;
  /** Detailed description */
  description: string;
  /** Priority: high, medium, low */
  priority: CompliancePriority;
  /** ETP field that needs correction */
  field?: string;
  /** Legal reference */
  legalReference?: string;
  /** Associated rejection code */
  rejectionCode?: string;
}

/**
 * Score breakdown by category.
 */
export interface CategoryScore {
  /** Total items in category */
  total: number;
  /** Items that passed */
  passed: number;
  /** Score obtained */
  score: number;
  /** Maximum possible score */
  maxScore: number;
}

/**
 * Complete validation result for an ETP.
 */
export interface ComplianceValidationResult {
  /** ID of the validated ETP */
  etpId: string;
  /** ID of the checklist used */
  checklistId: string;
  /** Name of the checklist */
  checklistName: string;
  /** Total compliance score (0-100) */
  score: number;
  /** Minimum score for approval */
  minimumScore: number;
  /** Whether the ETP passed validation */
  passed: boolean;
  /** Validation status */
  status: ComplianceStatus;
  /** Total items checked */
  totalItems: number;
  /** Items that passed */
  passedItems: number;
  /** Items that failed */
  failedItems: number;
  /** Items skipped */
  skippedItems: number;
  /** Detailed results per item */
  itemResults: ComplianceItemResult[];
  /** Improvement suggestions */
  suggestions: ComplianceSuggestion[];
  /** Scores by category */
  categoryScores: Record<string, CategoryScore>;
  /**
   * Validation timestamp.
   * Backend returns Date object, serialized to ISO string via JSON.
   * Use normalizeDate() or formatDateTime() to handle this field.
   */
  validatedAt: SerializedDate;
  /** Processing time in milliseconds */
  processingTimeMs: number;
}

/**
 * Summarized score for quick display.
 */
export interface ComplianceScoreSummary {
  /** Compliance score (0-100) */
  score: number;
  /** Whether the ETP passed */
  passed: boolean;
  /** Validation status */
  status: ComplianceStatus;
  /** Total items checked */
  totalItems: number;
  /** Items that passed */
  passedItems: number;
  /** Items that failed */
  failedItems: number;
  /** Top 3 priority issues */
  topIssues: {
    requirement: string;
    fixSuggestion: string;
    priority: CompliancePriority;
  }[];
}

/**
 * API response wrapper.
 */
export interface ComplianceResponse<T> {
  data: T;
  disclaimer: string;
}
