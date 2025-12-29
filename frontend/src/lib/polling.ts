/**
 * Polling utilities for async job status tracking
 * @see #186 - BullMQ async processing
 * @see #222 - Frontend async UX
 * @see #1060 - Increase timeout and graceful degradation
 */

import { apiHelpers } from './api';
import { Section, JobStatusData, DataSourceStatusInfo } from '@/types/etp';

/**
 * Result from polling, including section and optional data source status.
 * @see #756 - DataSourceStatus frontend component
 */
export interface PollResult {
  section: Section;
  dataSourceStatus?: DataSourceStatusInfo;
}

/**
 * Polling configuration
 * @see #1060 - Increased timeout from 3 to 5 minutes
 */
const POLL_INTERVAL_MS = 2000; // Poll every 2 seconds
const MAX_POLL_ATTEMPTS = 150; // Max 5 minutes (150 * 2s = 300s)
const MAX_NETWORK_RETRIES = 3; // Max retries for transient network errors
const INITIAL_BACKOFF_MS = 1000; // Initial backoff for network retries (1s)

/**
 * Error thrown when polling times out
 * @see #1060 - Graceful degradation with helpful message
 */
export class PollingTimeoutError extends Error {
  public readonly jobId: string;

  constructor(jobId: string) {
    super(
      `Tempo limite de acompanhamento excedido para o job ${jobId}. ` +
        `O processamento pode ainda estar em andamento. ` +
        `Aguarde alguns minutos e atualize a página para verificar o resultado.`,
    );
    this.name = 'PollingTimeoutError';
    this.jobId = jobId;
  }
}

/**
 * Error thrown when polling is aborted
 * @see #611 - Abort polling on component unmount
 */
export class PollingAbortedError extends Error {
  constructor(jobId: string) {
    super(`Polling cancelado para o job ${jobId}`);
    this.name = 'PollingAbortedError';
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
 * Check if error is a transient network error that can be retried
 * @see #1060 - Retry transient network errors
 */
function isTransientNetworkError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;

  const message = error.message.toLowerCase();

  // Network connectivity issues
  if (message.includes('network') || message.includes('fetch')) return true;

  // Server overload / temporary errors
  if (message.includes('503') || message.includes('service unavailable'))
    return true;
  if (message.includes('502') || message.includes('bad gateway')) return true;
  if (message.includes('504') || message.includes('gateway timeout'))
    return true;

  // Connection issues
  if (message.includes('timeout') || message.includes('econnreset'))
    return true;
  if (message.includes('econnrefused') || message.includes('enotfound'))
    return true;

  return false;
}

/**
 * Polls the job status endpoint until completion or failure
 *
 * @param jobId - The BullMQ job ID to poll
 * @param onProgress - Callback called with progress percentage (0-100)
 * @param options - Polling options (interval, max attempts, abort signal)
 * @returns The generated section when job completes
 * @throws {PollingTimeoutError} If max attempts reached
 * @throws {JobFailedError} If job fails
 * @throws {PollingAbortedError} If polling is aborted via signal
 *
 * @example
 * ```ts
 * const controller = new AbortController();
 * const result = await pollJobStatus(jobId, (progress) => {
 * console.log(`Progress: ${progress}%`);
 * }, { signal: controller.signal });
 *
 * console.log(result.section); // The generated section
 * console.log(result.dataSourceStatus); // Data source status (if available)
 *
 * // To abort:
 * controller.abort();
 * ```
 */
export async function pollJobStatus(
  jobId: string,
  onProgress?: (progress: number) => void,
  options?: {
    intervalMs?: number;
    maxAttempts?: number;
    signal?: AbortSignal;
  },
): Promise<PollResult> {
  const intervalMs = options?.intervalMs ?? POLL_INTERVAL_MS;
  const maxAttempts = options?.maxAttempts ?? MAX_POLL_ATTEMPTS;
  const signal = options?.signal;

  let attempts = 0;
  let consecutiveNetworkErrors = 0;

  while (attempts < maxAttempts) {
    // Check if aborted before each poll (#611)
    if (signal?.aborted) {
      throw new PollingAbortedError(jobId);
    }

    try {
      const response = await apiHelpers.get<{ data: JobStatusData }>(
        `/sections/jobs/${jobId}`,
      );

      // Reset network error counter on successful request (#1060)
      consecutiveNetworkErrors = 0;

      // Check if aborted after API call (#611)
      if (signal?.aborted) {
        throw new PollingAbortedError(jobId);
      }

      const {
        status,
        progress,
        result,
        failedReason,
        error,
        dataSourceStatus,
      } = response.data;

      // Report progress only if not aborted (#611)
      if (!signal?.aborted) {
        onProgress?.(progress);
      }

      // Handle completion
      if (status === 'completed' && result) {
        return {
          section: result,
          dataSourceStatus,
        };
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

      // Wait before next poll, with abort support (#611)
      await sleepWithAbort(intervalMs, signal);
      attempts++;
    } catch (err) {
      // Re-throw our custom errors
      if (
        err instanceof PollingTimeoutError ||
        err instanceof JobFailedError ||
        err instanceof PollingAbortedError
      ) {
        throw err;
      }

      // Handle AbortError from sleepWithAbort (#611)
      if (err instanceof Error && err.name === 'AbortError') {
        throw new PollingAbortedError(jobId);
      }

      // Handle transient network errors with exponential backoff (#1060)
      if (isTransientNetworkError(err)) {
        consecutiveNetworkErrors++;

        if (consecutiveNetworkErrors <= MAX_NETWORK_RETRIES) {
          // Exponential backoff: 1s, 2s, 4s
          const backoffMs =
            INITIAL_BACKOFF_MS * Math.pow(2, consecutiveNetworkErrors - 1);
          console.warn(
            `[Polling] Network error (attempt ${consecutiveNetworkErrors}/${MAX_NETWORK_RETRIES}), ` +
              `retrying in ${backoffMs}ms: ${err instanceof Error ? err.message : 'Unknown error'}`,
          );
          await sleepWithAbort(backoffMs, signal);
          // Don't increment attempts for network retries - they shouldn't count against max
          continue;
        }
        // Max network retries exceeded, fall through to throw
        console.error(
          `[Polling] Max network retries (${MAX_NETWORK_RETRIES}) exceeded`,
        );
      }

      // Handle non-recoverable API errors (404, 500, etc.)
      const message =
        err instanceof Error ? err.message : 'Erro ao verificar status do job';
      throw new JobFailedError(jobId, message);
    }
  }

  // Max attempts reached
  throw new PollingTimeoutError(jobId);
}

/**
 * Sleep utility with abort support (#611)
 * Resolves after ms or rejects if signal is aborted
 */
function sleepWithAbort(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException('Aborted', 'AbortError'));
      return;
    }

    const timeoutId = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort);
      resolve();
    }, ms);

    const onAbort = () => {
      clearTimeout(timeoutId);
      reject(new DOMException('Aborted', 'AbortError'));
    };

    signal?.addEventListener('abort', onAbort, { once: true });
  });
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
