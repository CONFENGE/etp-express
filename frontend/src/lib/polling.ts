/**
 * Polling utilities for async job status tracking
 * @see #186 - BullMQ async processing
 * @see #222 - Frontend async UX
 */

import { apiHelpers } from './api';
import { Section, JobStatusData } from '@/types/etp';

/**
 * Polling configuration
 */
const POLL_INTERVAL_MS = 2000; // Poll every 2 seconds
const MAX_POLL_ATTEMPTS = 90; // Max 3 minutes (90 * 2s = 180s)

/**
 * Error thrown when polling times out
 */
export class PollingTimeoutError extends Error {
  constructor(jobId: string) {
    super(
      `Tempo limite excedido: a geração do job ${jobId} demorou mais que o esperado`,
    );
    this.name = 'PollingTimeoutError';
  }
}

/**
 * Error thrown when job fails
 */
export class JobFailedError extends Error {
  constructor(jobId: string, reason?: string) {
    super(reason || `Job ${jobId} falhou durante processamento`);
    this.name = 'JobFailedError';
  }
}

/**
 * Polls the job status endpoint until completion or failure
 *
 * @param jobId - The BullMQ job ID to poll
 * @param onProgress - Callback called with progress percentage (0-100)
 * @param options - Polling options (interval, max attempts)
 * @returns The generated section when job completes
 * @throws {PollingTimeoutError} If max attempts reached
 * @throws {JobFailedError} If job fails
 *
 * @example
 * ```ts
 * const section = await pollJobStatus(jobId, (progress) => {
 *   console.log(`Progress: ${progress}%`);
 * });
 * ```
 */
export async function pollJobStatus(
  jobId: string,
  onProgress?: (progress: number) => void,
  options?: {
    intervalMs?: number;
    maxAttempts?: number;
  },
): Promise<Section> {
  const intervalMs = options?.intervalMs ?? POLL_INTERVAL_MS;
  const maxAttempts = options?.maxAttempts ?? MAX_POLL_ATTEMPTS;

  let attempts = 0;

  while (attempts < maxAttempts) {
    try {
      const response = await apiHelpers.get<{ data: JobStatusData }>(
        `/sections/jobs/${jobId}`,
      );

      const { status, progress, result, failedReason, error } = response.data;

      // Report progress
      onProgress?.(progress);

      // Handle completion
      if (status === 'completed' && result) {
        return result;
      }

      // Handle failure
      if (status === 'failed') {
        throw new JobFailedError(jobId, failedReason || error);
      }

      // Handle unknown status (job expired or not found)
      if (status === 'unknown') {
        throw new JobFailedError(
          jobId,
          'Job não encontrado ou expirou. Tente novamente.',
        );
      }

      // Wait before next poll
      await sleep(intervalMs);
      attempts++;
    } catch (err) {
      // Re-throw our custom errors
      if (err instanceof PollingTimeoutError || err instanceof JobFailedError) {
        throw err;
      }

      // Handle API errors (404, 500, etc.)
      const message =
        err instanceof Error ? err.message : 'Erro ao verificar status do job';
      throw new JobFailedError(jobId, message);
    }
  }

  // Max attempts reached
  throw new PollingTimeoutError(jobId);
}

/**
 * Sleep utility for polling intervals
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Get user-friendly status message based on progress
 *
 * @param status - Current generation status
 * @param progress - Progress percentage (0-100)
 * @returns Localized status message for display
 */
export function getStatusMessage(
  status: 'idle' | 'queued' | 'generating' | 'completed' | 'failed',
  progress: number,
): string {
  if (status === 'idle') return '';
  if (status === 'queued') return 'Na fila de processamento...';
  if (status === 'completed') return 'Geração concluída!';
  if (status === 'failed') return 'Erro na geração';

  // Generating - show progress-based message
  if (progress < 20) return 'Preparando contexto...';
  if (progress < 40) return 'Consultando base de conhecimento...';
  if (progress < 60) return 'Gerando conteúdo com IA...';
  if (progress < 80) return 'Validando citações legais...';
  if (progress < 95) return 'Formatando resultado...';
  return 'Finalizando...';
}
