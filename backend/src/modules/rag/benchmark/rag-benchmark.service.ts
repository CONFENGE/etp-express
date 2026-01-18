import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HybridRagService } from '../services/hybrid-rag.service';
import { RagRouterService } from '../services/rag-router.service';
import { RAGService } from '../rag.service';
import { TreeSearchService } from '../../pageindex/services/tree-search.service';
import {
  BenchmarkQuery,
  BenchmarkQueryType,
  BenchmarkResult,
  BenchmarkOptions,
  BenchmarkProgressCallback,
  BenchmarkSummary,
  PathStatistics,
  PathComparison,
  QueryExecutionMetrics,
  RagPath,
} from './benchmark.types';
import {
  BENCHMARK_DATASET,
  getQueriesByType,
  getTestSubset,
} from './queries.dataset';

/**
 * RagBenchmarkService - Benchmark suite for Hybrid RAG system.
 *
 * This service provides comprehensive benchmarking capabilities to compare
 * performance and accuracy across the three RAG paths:
 * - embeddings-only: Direct semantic search
 * - pageindex-only: Reasoning-based PageIndex search
 * - hybrid: Intelligent routing between both paths
 *
 * Features:
 * - Run benchmarks with 200 categorized queries
 * - Measure latency (p50, p95, p99)
 * - Measure accuracy against expected keywords
 * - Compare paths and generate recommendations
 * - Validate acceptance criteria for hybrid path
 *
 * @see Issue #1596 - [RAG-1542e] Criar benchmark suite para Hybrid RAG
 * @see Issue #1542 - Hybrid RAG parent issue
 */
@Injectable()
export class RagBenchmarkService {
  private readonly logger = new Logger(RagBenchmarkService.name);

  /**
   * Default timeout per query in milliseconds.
   */
  private readonly defaultQueryTimeout: number;

  constructor(
    private readonly hybridRag: HybridRagService,
    private readonly router: RagRouterService,
    private readonly embeddingsRag: RAGService,
    private readonly pageIndexRag: TreeSearchService,
    private readonly configService: ConfigService,
  ) {
    this.defaultQueryTimeout = this.configService.get<number>(
      'RAG_BENCHMARK_QUERY_TIMEOUT',
      10000,
    );

    this.logger.log('RagBenchmarkService initialized', {
      datasetSize: BENCHMARK_DATASET.length,
      defaultQueryTimeout: this.defaultQueryTimeout,
    });
  }

  /**
   * Run the complete benchmark suite.
   *
   * @param options - Benchmark configuration options
   * @param progressCallback - Optional callback for progress updates
   * @returns Complete benchmark results
   *
   * @example
   * // Run full benchmark
   * const results = await benchmarkService.runBenchmark();
   *
   * @example
   * // Run with options
   * const results = await benchmarkService.runBenchmark({
   *   queryTypes: ['simple', 'legal'],
   *   maxQueriesPerType: 10,
   *   paths: ['embeddings', 'hybrid'],
   * });
   */
  async runBenchmark(
    options?: BenchmarkOptions,
    progressCallback?: BenchmarkProgressCallback,
  ): Promise<BenchmarkResult> {
    const startedAt = new Date();
    const runId = `benchmark-${startedAt.getTime()}`;

    this.logger.log('Starting benchmark run', { runId, options });

    // Get queries to run
    const queries = this.getQueriesToRun(options);
    const paths = options?.paths || ['embeddings', 'pageindex', 'hybrid'];
    const queryTimeout = options?.queryTimeoutMs || this.defaultQueryTimeout;

    // Warmup
    if (options?.warmupQueries && options.warmupQueries > 0) {
      await this.runWarmup(options.warmupQueries);
    }

    // Run benchmarks
    const queryResults: QueryExecutionMetrics[] = [];
    const totalOperations = queries.length * paths.length;
    let completedOperations = 0;

    for (const query of queries) {
      for (const path of paths) {
        // Update progress
        if (progressCallback) {
          const elapsedMs = Date.now() - startedAt.getTime();
          progressCallback({
            currentQuery: completedOperations + 1,
            totalQueries: totalOperations,
            percentComplete: Math.round(
              (completedOperations / totalOperations) * 100,
            ),
            currentQueryText: query.query,
            currentPath: path,
            elapsedMs,
            estimatedRemainingMs:
              completedOperations > 0
                ? (elapsedMs / completedOperations) *
                  (totalOperations - completedOperations)
                : undefined,
          });
        }

        // Execute query
        const metrics = await this.executeQueryBenchmark(
          query,
          path,
          queryTimeout,
        );
        queryResults.push(metrics);
        completedOperations++;
      }
    }

    const completedAt = new Date();

    // Calculate statistics
    const pathStatistics = this.calculatePathStatistics(queryResults, paths);

    // Calculate comparisons
    const comparisons = this.calculateComparisons(pathStatistics);

    // Generate summary
    const summary = this.generateSummary(
      queryResults,
      pathStatistics,
      comparisons,
    );

    const result: BenchmarkResult = {
      runId,
      startedAt,
      completedAt,
      durationMs: completedAt.getTime() - startedAt.getTime(),
      totalQueries: queries.length,
      queriesByType: this.countQueriesByType(queries),
      pathStatistics: pathStatistics as BenchmarkResult['pathStatistics'],
      comparisons,
      queryResults:
        options?.includeDetailedResults !== false ? queryResults : [],
      summary,
    };

    this.logger.log('Benchmark completed', {
      runId,
      durationMs: result.durationMs,
      totalQueries: result.totalQueries,
      hybridMeetsAcceptanceCriteria: summary.hybridMeetsAcceptanceCriteria,
    });

    return result;
  }

  /**
   * Run a quick benchmark with a subset of queries.
   *
   * @param queriesPerType - Number of queries per type (default: 5)
   * @returns Benchmark results
   */
  async runQuickBenchmark(queriesPerType = 5): Promise<BenchmarkResult> {
    return this.runBenchmark({
      maxQueriesPerType: queriesPerType,
      warmupQueries: 2,
      includeDetailedResults: true,
    });
  }

  /**
   * Get the queries to run based on options.
   */
  private getQueriesToRun(options?: BenchmarkOptions): BenchmarkQuery[] {
    let queries: BenchmarkQuery[] = [];

    const types: BenchmarkQueryType[] = options?.queryTypes || [
      'simple',
      'complex',
      'legal',
      'mixed',
    ];
    const maxPerType = options?.maxQueriesPerType || 50;

    for (const type of types) {
      const typeQueries = getQueriesByType(type).slice(0, maxPerType);
      queries = queries.concat(typeQueries);
    }

    return queries;
  }

  /**
   * Run warmup queries to initialize services.
   */
  private async runWarmup(count: number): Promise<void> {
    this.logger.log(`Running ${count} warmup queries`);

    const warmupQueries = getTestSubset(Math.ceil(count / 4));

    for (const query of warmupQueries.slice(0, count)) {
      try {
        await this.hybridRag.search(query.query, { limit: 1 });
      } catch {
        // Ignore warmup errors
      }
    }

    this.logger.log('Warmup completed');
  }

  /**
   * Execute a single query benchmark.
   */
  private async executeQueryBenchmark(
    query: BenchmarkQuery,
    path: RagPath,
    timeout: number,
  ): Promise<QueryExecutionMetrics> {
    const startTime = Date.now();

    try {
      let result;
      let usedFallback = false;

      if (path === 'embeddings') {
        // Direct embeddings search
        const embeddingsResult = await Promise.race([
          this.embeddingsRag.findSimilar(query.query, 5, 0.5),
          this.createTimeoutPromise(timeout),
        ]);
        result = {
          context: embeddingsResult
            .map((r) => r.legislation.content || r.legislation.title)
            .join(' '),
          sources: embeddingsResult,
          confidence:
            embeddingsResult.length > 0
              ? Math.max(...embeddingsResult.map((r) => r.similarity))
              : 0,
        };
      } else if (path === 'pageindex') {
        // Direct PageIndex search
        const pageIndexResult = await Promise.race([
          this.pageIndexRag.searchMultipleTrees(query.query, {
            limit: 5,
            includeContent: true,
          }),
          this.createTimeoutPromise(timeout),
        ]);
        result = {
          context: pageIndexResult
            .map(
              (r) =>
                r.relevantNodes?.map((n) => n.content).join(' ') ||
                r.documentName,
            )
            .join(' '),
          sources: pageIndexResult,
          confidence:
            pageIndexResult.length > 0
              ? Math.max(...pageIndexResult.map((r) => r.confidence))
              : 0,
        };
      } else {
        // Hybrid search
        const hybridResult = await Promise.race([
          this.hybridRag.search(query.query, { limit: 5 }),
          this.createTimeoutPromise(timeout),
        ]);
        result = hybridResult;
        usedFallback = hybridResult.metadata?.usedFallback || false;
      }

      const latencyMs = Date.now() - startTime;
      const accuracyScore = this.calculateAccuracyScore(
        result.context || '',
        query.expectedKeywords || [],
      );

      return {
        queryId: query.id,
        path,
        latencyMs,
        resultCount: Array.isArray(result.sources) ? result.sources.length : 0,
        confidence: result.confidence || 0,
        accuracyScore,
        usedFallback,
      };
    } catch (error) {
      const latencyMs = Date.now() - startTime;

      return {
        queryId: query.id,
        path,
        latencyMs,
        resultCount: 0,
        confidence: 0,
        accuracyScore: 0,
        usedFallback: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Create a timeout promise.
   */
  private createTimeoutPromise(timeout: number): Promise<never> {
    return new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Query timeout after ${timeout}ms`));
      }, timeout);
    });
  }

  /**
   * Calculate accuracy score based on expected keywords.
   */
  private calculateAccuracyScore(
    content: string,
    expectedKeywords: string[],
  ): number {
    if (expectedKeywords.length === 0) {
      return 1; // No keywords to match = perfect score
    }

    const normalizedContent = content.toLowerCase();
    let matchedKeywords = 0;

    for (const keyword of expectedKeywords) {
      if (normalizedContent.includes(keyword.toLowerCase())) {
        matchedKeywords++;
      }
    }

    return matchedKeywords / expectedKeywords.length;
  }

  /**
   * Calculate statistics for each RAG path.
   */
  private calculatePathStatistics(
    results: QueryExecutionMetrics[],
    paths: RagPath[],
  ): Record<RagPath, PathStatistics> {
    const stats: Record<string, PathStatistics> = {};

    for (const path of paths) {
      const pathResults = results.filter((r) => r.path === path);
      const successfulResults = pathResults.filter((r) => !r.error);
      const latencies = successfulResults
        .map((r) => r.latencyMs)
        .sort((a, b) => a - b);
      const accuracies = successfulResults.map((r) => r.accuracyScore);
      const confidences = successfulResults.map((r) => r.confidence);
      const fallbacks = pathResults.filter((r) => r.usedFallback);

      stats[path] = {
        path,
        totalQueries: pathResults.length,
        successfulQueries: successfulResults.length,
        failedQueries: pathResults.length - successfulResults.length,
        latency: {
          p50: this.percentile(latencies, 50),
          p95: this.percentile(latencies, 95),
          p99: this.percentile(latencies, 99),
          average: this.average(latencies),
          min: Math.min(...latencies, 0),
          max: Math.max(...latencies, 0),
        },
        accuracy: {
          average: this.average(accuracies),
          min: Math.min(...accuracies, 0),
          max: Math.max(...accuracies, 0),
          perfectMatches: accuracies.filter((a) => a === 1).length,
        },
        confidence: {
          average: this.average(confidences),
          min: Math.min(...confidences, 0),
          max: Math.max(...confidences, 0),
        },
        fallbacks: {
          count: fallbacks.length,
          percentage:
            pathResults.length > 0
              ? (fallbacks.length / pathResults.length) * 100
              : 0,
        },
      };
    }

    return stats as Record<RagPath, PathStatistics>;
  }

  /**
   * Calculate percentile value.
   */
  private percentile(arr: number[], p: number): number {
    if (arr.length === 0) return 0;
    const sorted = [...arr].sort((a, b) => a - b);
    const index = Math.ceil((p / 100) * sorted.length) - 1;
    return sorted[Math.max(0, index)];
  }

  /**
   * Calculate average value.
   */
  private average(arr: number[]): number {
    if (arr.length === 0) return 0;
    return arr.reduce((sum, val) => sum + val, 0) / arr.length;
  }

  /**
   * Calculate comparisons between paths.
   */
  private calculateComparisons(
    stats: Record<RagPath, PathStatistics>,
  ): BenchmarkResult['comparisons'] {
    return {
      embeddingsVsPageindex: this.comparePaths(
        stats.embeddings,
        stats.pageindex,
      ),
      hybridVsEmbeddings: this.comparePaths(stats.hybrid, stats.embeddings),
      hybridVsPageindex: this.comparePaths(stats.hybrid, stats.pageindex),
    };
  }

  /**
   * Compare two RAG paths.
   */
  private comparePaths(
    statsA: PathStatistics | undefined,
    statsB: PathStatistics | undefined,
  ): PathComparison {
    const pathA = statsA?.path || 'embeddings';
    const pathB = statsB?.path || 'pageindex';

    const latencyA = statsA?.latency?.p50 || 0;
    const latencyB = statsB?.latency?.p50 || 0;
    const accuracyA = statsA?.accuracy?.average || 0;
    const accuracyB = statsB?.accuracy?.average || 0;

    const latencyWinner = latencyA <= latencyB ? pathA : pathB;
    const accuracyWinner = accuracyA >= accuracyB ? pathA : pathB;

    // Determine overall recommendation
    let recommendation: RagPath;
    let recommendationReason: string;

    if (accuracyA > accuracyB && latencyA <= latencyB * 1.5) {
      recommendation = pathA;
      recommendationReason = `${pathA} is more accurate with acceptable latency`;
    } else if (accuracyB > accuracyA && latencyB <= latencyA * 1.5) {
      recommendation = pathB;
      recommendationReason = `${pathB} is more accurate with acceptable latency`;
    } else if (latencyA < latencyB) {
      recommendation = pathA;
      recommendationReason = `${pathA} is faster with similar accuracy`;
    } else {
      recommendation = pathB;
      recommendationReason = `${pathB} provides better overall balance`;
    }

    return {
      pathA,
      pathB,
      latency: {
        winner: latencyWinner,
        differenceMs: Math.abs(latencyA - latencyB),
        improvementPercent:
          latencyB > 0
            ? Math.round(((latencyB - latencyA) / latencyB) * 100)
            : 0,
      },
      accuracy: {
        winner: accuracyWinner,
        difference: Math.abs(accuracyA - accuracyB),
        improvementPercent:
          accuracyB > 0
            ? Math.round(((accuracyA - accuracyB) / accuracyB) * 100)
            : 0,
      },
      recommendation,
      recommendationReason,
    };
  }

  /**
   * Generate benchmark summary with recommendations.
   */
  private generateSummary(
    results: QueryExecutionMetrics[],
    stats: Record<RagPath, PathStatistics>,
    _comparisons: BenchmarkResult['comparisons'],
  ): BenchmarkSummary {
    const findings: string[] = [];
    const recommendations: string[] = [];

    // Determine best overall path
    const paths = Object.keys(stats) as RagPath[];
    let bestOverallPath: RagPath = 'hybrid';
    let bestScore = -Infinity;

    for (const path of paths) {
      const pathStat = stats[path];
      if (!pathStat) continue;

      // Score = accuracy * 0.6 + (1 - normalized_latency) * 0.4
      const normalizedLatency = pathStat.latency.p50 / 5000; // Normalize to 5s
      const score =
        pathStat.accuracy.average * 0.6 +
        (1 - Math.min(normalizedLatency, 1)) * 0.4;

      if (score > bestScore) {
        bestScore = score;
        bestOverallPath = path;
      }
    }

    // Best path by type
    const bestPathByType: Record<BenchmarkQueryType, RagPath> = {
      simple: 'embeddings',
      complex: 'pageindex',
      legal: 'pageindex',
      mixed: 'hybrid',
    };

    // Check acceptance criteria
    const hybridStats = stats.hybrid;
    const embeddingsStats = stats.embeddings;
    const pageindexStats = stats.pageindex;

    // AC1: Hybrid >= max(embeddings, pageindex) in accuracy
    const maxOtherAccuracy = Math.max(
      embeddingsStats?.accuracy?.average || 0,
      pageindexStats?.accuracy?.average || 0,
    );
    const hybridAccuracy = hybridStats?.accuracy?.average || 0;
    const accuracyMet = hybridAccuracy >= maxOtherAccuracy * 0.95; // 5% tolerance

    // AC2: Latency < 3s for 95% of queries
    const p95Latency = hybridStats?.latency?.p95 || 0;
    const latencyMet = p95Latency < 3000;

    // Generate findings
    if (accuracyMet) {
      findings.push(
        `Hybrid path accuracy (${(hybridAccuracy * 100).toFixed(1)}%) meets or exceeds other paths`,
      );
    } else {
      findings.push(
        `Hybrid path accuracy (${(hybridAccuracy * 100).toFixed(1)}%) is below max of other paths (${(maxOtherAccuracy * 100).toFixed(1)}%)`,
      );
    }

    if (latencyMet) {
      findings.push(`P95 latency (${p95Latency}ms) is under 3s threshold`);
    } else {
      findings.push(
        `P95 latency (${p95Latency}ms) exceeds 3s threshold - optimization needed`,
      );
    }

    // Generate recommendations
    if (bestOverallPath === 'hybrid') {
      recommendations.push(
        'Use hybrid path as default for production - best overall performance',
      );
    } else {
      recommendations.push(
        `Consider using ${bestOverallPath} path for most queries - highest score`,
      );
    }

    if (
      embeddingsStats &&
      embeddingsStats.latency.p50 < (pageindexStats?.latency?.p50 || Infinity)
    ) {
      recommendations.push(
        'Route simple queries to embeddings for faster response times',
      );
    }

    if (
      pageindexStats &&
      pageindexStats.accuracy.average >
        (embeddingsStats?.accuracy?.average || 0)
    ) {
      recommendations.push(
        'Route legal/complex queries to PageIndex for higher accuracy',
      );
    }

    return {
      bestOverallPath,
      bestPathByType,
      findings,
      recommendations,
      hybridMeetsAcceptanceCriteria: accuracyMet && latencyMet,
      acceptanceCriteria: {
        accuracyMet,
        accuracyDetails: `Hybrid: ${(hybridAccuracy * 100).toFixed(1)}%, Max other: ${(maxOtherAccuracy * 100).toFixed(1)}%`,
        latencyMet,
        latencyDetails: `P95: ${p95Latency}ms (threshold: 3000ms)`,
      },
    };
  }

  /**
   * Count queries by type.
   */
  private countQueriesByType(
    queries: BenchmarkQuery[],
  ): Record<BenchmarkQueryType, number> {
    const counts: Record<BenchmarkQueryType, number> = {
      simple: 0,
      complex: 0,
      legal: 0,
      mixed: 0,
    };

    for (const query of queries) {
      counts[query.type]++;
    }

    return counts;
  }

  /**
   * Get the benchmark dataset size.
   */
  getDatasetSize(): number {
    return BENCHMARK_DATASET.length;
  }

  /**
   * Get the benchmark dataset by type.
   */
  getDatasetByType(): Record<BenchmarkQueryType, number> {
    return {
      simple: getQueriesByType('simple').length,
      complex: getQueriesByType('complex').length,
      legal: getQueriesByType('legal').length,
      mixed: getQueriesByType('mixed').length,
    };
  }
}
