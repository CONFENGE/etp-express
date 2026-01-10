/**
 * Compliance API Service
 *
 * Service for interacting with compliance validation endpoints.
 * Used by ComplianceScorecard component to validate ETPs against TCU/TCE checklists.
 *
 * Issue #1386 - [TCU-1163e] Componente indicador de conformidade no ETP Editor
 *
 * @see backend/src/modules/compliance/compliance.controller.ts
 */

import { apiHelpers } from './api';
import {
  ComplianceValidationResult,
  ComplianceScoreSummary,
  ComplianceSuggestion,
  ComplianceResponse,
} from '@/types/compliance';

/**
 * Fetches the full compliance validation result for an ETP.
 *
 * @param etpId - ID of the ETP to validate
 * @param checklistId - Optional specific checklist ID to use
 * @param includeOptional - Whether to include OPTIONAL items in validation
 * @returns Full validation result with all items and suggestions
 */
export async function validateEtp(
  etpId: string,
  checklistId?: string,
  includeOptional?: boolean,
): Promise<ComplianceValidationResult> {
  const params: Record<string, unknown> = {};
  if (checklistId) params.checklistId = checklistId;
  if (includeOptional !== undefined) params.includeOptional = includeOptional;

  const response = await apiHelpers.get<
    ComplianceResponse<ComplianceValidationResult>
  >(`/compliance/etps/${etpId}/validate`, params);
  return response.data;
}

/**
 * Fetches a summarized compliance score for quick display.
 *
 * This is a lighter endpoint than validateEtp, returning only:
 * - Score (0-100)
 * - Status (APPROVED, NEEDS_REVIEW, REJECTED)
 * - Top 3 priority issues
 *
 * @param etpId - ID of the ETP to check
 * @returns Summarized score with top issues
 */
export async function getComplianceScore(
  etpId: string,
): Promise<ComplianceScoreSummary> {
  const response = await apiHelpers.get<
    ComplianceResponse<ComplianceScoreSummary>
  >(`/compliance/etps/${etpId}/score`);
  return response.data;
}

/**
 * Fetches improvement suggestions for an ETP.
 *
 * Returns suggestions ordered by priority:
 * - high: MANDATORY items that failed
 * - medium: RECOMMENDED items that failed
 * - low: OPTIONAL items that failed
 *
 * @param etpId - ID of the ETP
 * @returns List of improvement suggestions
 */
export async function getComplianceSuggestions(
  etpId: string,
): Promise<ComplianceSuggestion[]> {
  const response = await apiHelpers.get<
    ComplianceResponse<ComplianceSuggestion[]>
  >(`/compliance/etps/${etpId}/suggestions`);
  return response.data;
}

/**
 * Compliance API facade for use in components.
 */
export const complianceApi = {
  validateEtp,
  getScore: getComplianceScore,
  getSuggestions: getComplianceSuggestions,
};
