/**
 * Search Result Types
 *
 * Structured types for government API search results that differentiate
 * between "no results" and "service unavailable" scenarios.
 *
 * This enables frontend to display appropriate user feedback:
 * - SUCCESS: Show results normally
 * - PARTIAL: Show results with warning about unavailable sources
 * - SERVICE_UNAVAILABLE: Show error message, not "no results"
 *
 * @module modules/gov-api/types
 * @see https://github.com/CONFENGE/etp-express/issues/755
 */

import { GovApiSource } from '../interfaces/gov-api.interface';

/**
 * Search operation status
 *
 * Differentiates between:
 * - SUCCESS: All sources responded, results may be empty (legitimately no data)
 * - PARTIAL: Some sources responded, some failed
 * - SERVICE_UNAVAILABLE: All sources failed or circuit breaker is open
 * - RATE_LIMITED: Request was rate limited
 * - TIMEOUT: Request timed out
 */
export enum SearchStatus {
  /** All sources responded successfully */
  SUCCESS = 'SUCCESS',
  /** Some sources responded, some failed */
  PARTIAL = 'PARTIAL',
  /** All sources failed or unavailable */
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
  /** Request was rate limited */
  RATE_LIMITED = 'RATE_LIMITED',
  /** Request timed out */
  TIMEOUT = 'TIMEOUT',
}

/**
 * Individual source status in a search result
 */
export interface SourceStatus {
  /** Source identifier */
  name: GovApiSource | string;
  /** Source status */
  status: SearchStatus;
  /** Error message if failed */
  error?: string;
  /** Response latency in ms */
  latencyMs?: number;
  /** Number of results from this source */
  resultCount?: number;
}

/**
 * Structured search result that includes status information
 *
 * @template T - Type of data items in the result
 *
 * @example
 * ```typescript
 * // Success scenario
 * const result: SearchResult<Contract> = {
 * data: contracts,
 * status: SearchStatus.SUCCESS,
 * sources: [
 * { name: 'pncp', status: SearchStatus.SUCCESS, resultCount: 10 },
 * { name: 'comprasgov', status: SearchStatus.SUCCESS, resultCount: 5 },
 * ],
 * timestamp: new Date(),
 * };
 *
 * // Service unavailable scenario
 * const result: SearchResult<Contract> = {
 * data: [],
 * status: SearchStatus.SERVICE_UNAVAILABLE,
 * sources: [
 * { name: 'pncp', status: SearchStatus.TIMEOUT, error: 'Connection timeout' },
 * { name: 'comprasgov', status: SearchStatus.SERVICE_UNAVAILABLE, error: 'Circuit breaker open' },
 * ],
 * timestamp: new Date(),
 * message: 'Os serviços governamentais estão temporariamente indisponíveis',
 * };
 * ```
 */
export interface SearchResult<T> {
  /** Result data items */
  data: T[];
  /** Overall search status */
  status: SearchStatus;
  /** Status of each source queried */
  sources: SourceStatus[];
  /** Timestamp when search was performed */
  timestamp: Date;
  /** Total count of results (may be from cache or pagination) */
  total?: number;
  /** Whether data came from cache */
  cached?: boolean;
  /** Human-readable message for the user */
  message?: string;
}

/**
 * Helper function to determine overall status from multiple source statuses
 *
 * @param sources - Array of source statuses
 * @returns Overall search status
 */
export function calculateOverallStatus(sources: SourceStatus[]): SearchStatus {
  if (sources.length === 0) {
    return SearchStatus.SERVICE_UNAVAILABLE;
  }

  const successCount = sources.filter(
    (s) => s.status === SearchStatus.SUCCESS,
  ).length;
  const failedCount = sources.filter(
    (s) =>
      s.status === SearchStatus.SERVICE_UNAVAILABLE ||
      s.status === SearchStatus.TIMEOUT ||
      s.status === SearchStatus.RATE_LIMITED,
  ).length;

  if (failedCount === sources.length) {
    // All sources failed
    // Determine most common failure type
    const timeoutCount = sources.filter(
      (s) => s.status === SearchStatus.TIMEOUT,
    ).length;
    const rateLimitCount = sources.filter(
      (s) => s.status === SearchStatus.RATE_LIMITED,
    ).length;

    if (timeoutCount > rateLimitCount) {
      return SearchStatus.TIMEOUT;
    }
    if (rateLimitCount > timeoutCount) {
      return SearchStatus.RATE_LIMITED;
    }
    return SearchStatus.SERVICE_UNAVAILABLE;
  }

  if (successCount === sources.length) {
    return SearchStatus.SUCCESS;
  }

  // Some succeeded, some failed
  return SearchStatus.PARTIAL;
}

/**
 * Generate user-friendly message based on status
 *
 * @param status - Search status
 * @param failedSources - Names of sources that failed
 * @returns User-friendly message in Portuguese
 */
export function getStatusMessage(
  status: SearchStatus,
  failedSources: string[] = [],
): string {
  switch (status) {
    case SearchStatus.SUCCESS:
      return 'Busca realizada com sucesso';
    case SearchStatus.PARTIAL:
      if (failedSources.length > 0) {
        return `Busca parcial: ${failedSources.join(', ')} indisponível(is)`;
      }
      return 'Busca parcial: algumas fontes indisponíveis';
    case SearchStatus.SERVICE_UNAVAILABLE:
      return 'Serviços governamentais temporariamente indisponíveis. Tente novamente em alguns minutos.';
    case SearchStatus.RATE_LIMITED:
      return 'Limite de requisições atingido. Aguarde alguns segundos e tente novamente.';
    case SearchStatus.TIMEOUT:
      return 'A busca demorou mais que o esperado. Tente novamente.';
    default:
      return 'Erro desconhecido na busca';
  }
}

/**
 * Create a successful search result
 */
export function createSuccessResult<T>(
  data: T[],
  sources: SourceStatus[],
  total?: number,
  cached?: boolean,
): SearchResult<T> {
  return {
    data,
    status: SearchStatus.SUCCESS,
    sources,
    timestamp: new Date(),
    total: total ?? data.length,
    cached,
    message: getStatusMessage(SearchStatus.SUCCESS),
  };
}

/**
 * Create a partial search result (some sources failed)
 */
export function createPartialResult<T>(
  data: T[],
  sources: SourceStatus[],
  total?: number,
): SearchResult<T> {
  const failedSources = sources
    .filter((s) => s.status !== SearchStatus.SUCCESS)
    .map((s) => s.name);

  return {
    data,
    status: SearchStatus.PARTIAL,
    sources,
    timestamp: new Date(),
    total: total ?? data.length,
    message: getStatusMessage(SearchStatus.PARTIAL, failedSources as string[]),
  };
}

/**
 * Create a service unavailable result
 */
export function createUnavailableResult<T>(
  sources: SourceStatus[],
  errorMessage?: string,
): SearchResult<T> {
  const status = calculateOverallStatus(sources);
  return {
    data: [],
    status,
    sources,
    timestamp: new Date(),
    total: 0,
    message: errorMessage || getStatusMessage(status),
  };
}
