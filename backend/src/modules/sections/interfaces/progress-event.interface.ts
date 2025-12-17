/**
 * Represents a progress event during section generation.
 *
 * @remarks
 * These events are emitted via Server-Sent Events (SSE) to provide
 * real-time feedback to the client during the AI generation pipeline.
 *
 * The generation pipeline has 5 main phases:
 * 1. sanitization - Input sanitization and PII redaction
 * 2. enrichment - Market data enrichment (Gov-API/Exa)
 * 3. generation - LLM content generation
 * 4. validation - Multi-agent validation (legal, clarity, etc.)
 * 5. complete - Final result ready
 *
 * @see OrchestratorService.generateSection - Main generation method
 * @see #754 - SSE streaming implementation
 */
export interface ProgressEvent {
  /**
   * Current phase of the generation pipeline.
   */
  phase:
    | 'sanitization'
    | 'enrichment'
    | 'generation'
    | 'validation'
    | 'complete'
    | 'error';

  /**
   * Current step number (1-indexed).
   */
  step: number;

  /**
   * Total number of steps in the pipeline.
   */
  totalSteps: number;

  /**
   * Human-readable message describing current activity.
   */
  message: string;

  /**
   * Progress percentage (0-100).
   */
  percentage: number;

  /**
   * Unix timestamp when this event was emitted.
   */
  timestamp: number;

  /**
   * Optional details about the current step.
   */
  details?: {
    /**
     * Agents currently being used (e.g., 'legal-agent', 'clareza-agent').
     */
    agents?: string[];

    /**
     * Data source being used for enrichment.
     */
    enrichmentSource?: 'gov-api' | 'exa' | 'mixed' | null;

    /**
     * Error message if phase is 'error'.
     */
    error?: string;
  };
}

/**
 * Callback function type for progress reporting.
 */
export type ProgressCallback = (event: ProgressEvent) => void;

/**
 * SSE message event format for NestJS.
 */
export interface SseMessageEvent {
  data: ProgressEvent;
  id?: string;
  type?: string;
  retry?: number;
}
