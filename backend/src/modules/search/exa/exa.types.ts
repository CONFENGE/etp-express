/**
 * Type definitions for Exa Search Service
 *
 * These types mirror the PerplexityService interfaces to ensure
 * compatibility and enable seamless migration.
 *
 * @module modules/search/exa/exa.types
 */

/**
 * Individual search result from Exa API
 */
export interface ExaSearchResult {
  title: string;
  snippet: string;
  url?: string;
  relevance: number;
  source: string;
}

/**
 * Response structure from Exa search operations
 */
export interface ExaResponse {
  results: ExaSearchResult[];
  summary: string;
  sources: string[];
  /** Indicates if the result was obtained via fallback (when circuit breaker is open) */
  isFallback?: boolean;
}

/**
 * Result of a legal reference fact-check operation
 */
export interface FactCheckResult {
  reference: string;
  exists: boolean;
  source: string;
  description: string;
  confidence: number;
}

/**
 * Input for legal reference fact-checking
 */
export interface LegalReferenceInput {
  type: string;
  number: string;
  year: number;
}

/**
 * Exa API search result structure
 */
export interface ExaAPIResult {
  title: string;
  url: string;
  score?: number;
  publishedDate?: string;
  author?: string;
  text?: string;
  highlights?: string[];
  highlightScores?: number[];
}

/**
 * Exa API response structure
 */
export interface ExaAPIResponse {
  results: ExaAPIResult[];
  autopromptString?: string;
  requestId?: string;
}

/**
 * Exa search options
 */
export interface ExaSearchOptions {
  numResults?: number;
  type?: 'auto' | 'neural' | 'keyword';
  useAutoprompt?: boolean;
  includeDomains?: string[];
  excludeDomains?: string[];
  startPublishedDate?: string;
  endPublishedDate?: string;
  text?: boolean | { maxCharacters?: number };
}

/**
 * Circuit breaker state for monitoring
 */
export interface CircuitState {
  stats: {
    successes: number;
    failures: number;
    rejects: number;
    fires: number;
    timeouts: number;
    cacheHits: number;
    cacheMisses: number;
    semaphoreRejections: number;
    percentiles: Record<string, number>;
    latencyTimes: number[];
  };
  opened: boolean;
  halfOpen: boolean;
  closed: boolean;
}

/**
 * Cache statistics for monitoring
 */
export interface CacheStats {
  hits: number;
  misses: number;
  keys: number;
  ksize: number;
  vsize: number;
}

/**
 * Ping response for health checks
 */
export interface PingResponse {
  latency: number;
  status?: string;
}
