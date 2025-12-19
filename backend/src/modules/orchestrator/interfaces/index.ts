/**
 * Unified interfaces for the OrchestratorService.
 *
 * This file re-exports agent interfaces and defines orchestration-specific types
 * to ensure type safety throughout the multi-agent AI orchestration pipeline.
 *
 * @module orchestrator/interfaces
 */

// Re-export agent interfaces for convenience
export { LegalValidationResult } from '../agents/legal.agent';
export { ClarezaResult } from '../agents/clareza.agent';
export { SimplificacaoResult } from '../agents/simplificacao.agent';
export { HallucinationCheckResult } from '../agents/anti-hallucination.agent';
export { FundamentacaoResult } from '../agents/fundamentacao.agent';

/**
 * Result from parallel validation execution.
 *
 * @remarks
 * Contains validation results from all agents that run in parallel
 * during the orchestration pipeline.
 */
export interface ParallelValidationResults {
 /** Legal compliance validation result */
 legalValidation: import('../agents/legal.agent').LegalValidationResult;
 /** Argumentation quality validation result (nullable for non-fundamentacao sections) */
 fundamentacaoValidation:
 | import('../agents/fundamentacao.agent').FundamentacaoResult
 | null;
 /** Clarity and readability validation result */
 clarezaValidation: import('../agents/clareza.agent').ClarezaResult;
 /** Anti-hallucination check result */
 hallucinationCheck: import('../agents/anti-hallucination.agent').HallucinationCheckResult;
}

/**
 * Result from post-processing content.
 *
 * @remarks
 * Contains the processed content and the simplification analysis result
 * used to determine if automatic simplification was applied.
 */
export interface PostProcessingResult {
 /** The processed content (possibly simplified) */
 content: string;
 /** Simplification analysis result with score and suggestions */
 simplificationResult: import('../agents/simplificacao.agent').SimplificacaoResult;
}

/**
 * LLM response structure from OpenAI service.
 *
 * @remarks
 * Standard response format from the OpenAI integration layer,
 * containing the generated content and metadata.
 */
export interface LLMResponse {
 /** Generated text content */
 content: string;
 /** Number of tokens used in the response */
 tokens: number;
 /** Model identifier used for generation */
 model: string;
}

/**
 * Validation check summary after processing all agent results.
 *
 * @remarks
 * Aggregates warnings and errors from all validation agents
 * into a single summary for the final result.
 */
export interface ValidationSummary {
 /** Whether all validation checks passed */
 isValid: boolean;
 /** Warning messages from all agents */
 warnings: string[];
 /** Error messages (critical issues) */
 errors: string[];
}
