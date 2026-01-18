/**
 * RAG Benchmark Types
 *
 * Type definitions for the RAG benchmark suite that compares
 * performance and accuracy across embeddings-only, pageindex-only,
 * and hybrid RAG paths.
 *
 * @see Issue #1596 - [RAG-1542e] Criar benchmark suite para Hybrid RAG
 * @see Issue #1542 - Hybrid RAG parent issue
 */

/**
 * Query type classification for benchmark dataset.
 */
export type BenchmarkQueryType = 'simple' | 'complex' | 'legal' | 'mixed';

/**
 * Expected RAG path for a benchmark query.
 */
export type ExpectedPath = 'embeddings' | 'pageindex' | 'hybrid';

/**
 * Single benchmark query with expected behavior.
 */
export interface BenchmarkQuery {
  /** Unique identifier for the query */
  id: string;

  /** The query text */
  query: string;

  /** Type of query for categorization */
  type: BenchmarkQueryType;

  /** Expected RAG path for this query */
  expectedPath: ExpectedPath;

  /** Expected keywords/topics in the result (for accuracy validation) */
  expectedKeywords?: string[];

  /** Description of the query intent (for documentation) */
  description?: string;
}

/**
 * RAG path identifier.
 */
export type RagPath = 'embeddings' | 'pageindex' | 'hybrid';

/**
 * Result metrics for a single query execution.
 */
export interface QueryExecutionMetrics {
  /** Query ID from the dataset */
  queryId: string;

  /** Which RAG path was used */
  path: RagPath;

  /** Latency in milliseconds */
  latencyMs: number;

  /** Number of results returned */
  resultCount: number;

  /** Confidence score of the result (0-1) */
  confidence: number;

  /** Whether the result matched expected keywords */
  accuracyScore: number;

  /** Whether a fallback was used */
  usedFallback: boolean;

  /** Estimated tokens consumed (if available) */
  tokensEstimate?: number;

  /** Error message if the query failed */
  error?: string;
}

/**
 * Aggregated statistics for a specific RAG path.
 */
export interface PathStatistics {
  /** RAG path identifier */
  path: RagPath;

  /** Total queries executed */
  totalQueries: number;

  /** Number of successful queries */
  successfulQueries: number;

  /** Number of failed queries */
  failedQueries: number;

  /** Latency percentiles */
  latency: {
    p50: number;
    p95: number;
    p99: number;
    average: number;
    min: number;
    max: number;
  };

  /** Accuracy statistics */
  accuracy: {
    average: number;
    min: number;
    max: number;
    perfectMatches: number;
  };

  /** Confidence statistics */
  confidence: {
    average: number;
    min: number;
    max: number;
  };

  /** Fallback statistics */
  fallbacks: {
    count: number;
    percentage: number;
  };

  /** Token consumption (if tracked) */
  tokens?: {
    total: number;
    average: number;
  };
}

/**
 * Comparison result between two RAG paths.
 */
export interface PathComparison {
  /** First path in comparison */
  pathA: RagPath;

  /** Second path in comparison */
  pathB: RagPath;

  /** Latency comparison */
  latency: {
    /** Which path is faster */
    winner: RagPath;
    /** Absolute difference in ms (p50) */
    differenceMs: number;
    /** Percentage improvement */
    improvementPercent: number;
  };

  /** Accuracy comparison */
  accuracy: {
    /** Which path is more accurate */
    winner: RagPath;
    /** Absolute difference */
    difference: number;
    /** Percentage improvement */
    improvementPercent: number;
  };

  /** Overall recommendation */
  recommendation: RagPath;
  recommendationReason: string;
}

/**
 * Complete benchmark result.
 */
export interface BenchmarkResult {
  /** Unique benchmark run ID */
  runId: string;

  /** When the benchmark started */
  startedAt: Date;

  /** When the benchmark completed */
  completedAt: Date;

  /** Total duration in milliseconds */
  durationMs: number;

  /** Total queries executed */
  totalQueries: number;

  /** Queries per type */
  queriesByType: Record<BenchmarkQueryType, number>;

  /** Statistics per RAG path */
  pathStatistics: {
    embeddings: PathStatistics;
    pageindex: PathStatistics;
    hybrid: PathStatistics;
  };

  /** Path comparisons */
  comparisons: {
    embeddingsVsPageindex: PathComparison;
    hybridVsEmbeddings: PathComparison;
    hybridVsPageindex: PathComparison;
  };

  /** Individual query results */
  queryResults: QueryExecutionMetrics[];

  /** Summary and recommendations */
  summary: BenchmarkSummary;
}

/**
 * Summary of benchmark results with recommendations.
 */
export interface BenchmarkSummary {
  /** Overall best performing path */
  bestOverallPath: RagPath;

  /** Best path per query type */
  bestPathByType: Record<BenchmarkQueryType, RagPath>;

  /** Key findings */
  findings: string[];

  /** Recommendations for production use */
  recommendations: string[];

  /** Whether hybrid met the acceptance criteria */
  hybridMeetsAcceptanceCriteria: boolean;

  /** Detailed acceptance criteria check */
  acceptanceCriteria: {
    /** Hybrid >= max(embeddings, pageindex) in accuracy */
    accuracyMet: boolean;
    accuracyDetails: string;

    /** Latency < 3s for 95% of queries */
    latencyMet: boolean;
    latencyDetails: string;
  };
}

/**
 * Options for running the benchmark.
 */
export interface BenchmarkOptions {
  /** Query types to include (default: all) */
  queryTypes?: BenchmarkQueryType[];

  /** Maximum queries per type (default: 50) */
  maxQueriesPerType?: number;

  /** RAG paths to benchmark (default: all) */
  paths?: RagPath[];

  /** Timeout per query in milliseconds (default: 10000) */
  queryTimeoutMs?: number;

  /** Whether to run queries in parallel (default: false) */
  parallel?: boolean;

  /** Parallel concurrency limit (default: 5) */
  parallelLimit?: number;

  /** Whether to include detailed query results (default: true) */
  includeDetailedResults?: boolean;

  /** Warmup queries before benchmark (default: 5) */
  warmupQueries?: number;
}

/**
 * Progress callback for benchmark execution.
 */
export interface BenchmarkProgress {
  /** Current query index (1-based) */
  currentQuery: number;

  /** Total queries to execute */
  totalQueries: number;

  /** Percentage complete (0-100) */
  percentComplete: number;

  /** Current query being executed */
  currentQueryText?: string;

  /** Current RAG path being tested */
  currentPath?: RagPath;

  /** Elapsed time in milliseconds */
  elapsedMs: number;

  /** Estimated remaining time in milliseconds */
  estimatedRemainingMs?: number;
}

/**
 * Type for progress callback function.
 */
export type BenchmarkProgressCallback = (progress: BenchmarkProgress) => void;
