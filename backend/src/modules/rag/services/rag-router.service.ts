import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  QueryComplexityClassifierService,
  QueryComplexity,
  ClassificationResult,
} from './query-complexity-classifier.service';
import { RAGService, SimilarLegislation } from '../rag.service';
import { TreeSearchService } from '../../pageindex/services/tree-search.service';
import { TreeSearchResult } from '../../pageindex/interfaces/tree-node.interface';

/**
 * Unified RAG result that can represent results from either path.
 */
export interface RagResult {
  /** Which RAG path was used */
  path: 'embeddings' | 'pageindex';

  /** Query complexity classification */
  classification: ClassificationResult;

  /** Results from embeddings-based RAG (when path = 'embeddings') */
  embeddingsResults?: SimilarLegislation[];

  /** Results from PageIndex RAG (when path = 'pageindex') */
  pageIndexResults?: Array<
    TreeSearchResult & { treeId: string; documentName: string }
  >;

  /** Overall confidence of the result */
  confidence: number;

  /** Time taken for routing and search in milliseconds */
  latencyMs: number;
}

/**
 * Router decision log entry for analytics.
 */
export interface RouterDecisionLog {
  /** Timestamp of the decision */
  timestamp: Date;

  /** SHA256 hash of the query (for privacy) */
  queryHash: string;

  /** Complexity classification result */
  complexity: QueryComplexity;

  /** Which RAG path was chosen */
  pathChosen: 'embeddings' | 'pageindex';

  /** Latency in milliseconds */
  latencyMs: number;

  /** Result count from the chosen path */
  resultCount: number;

  /** Confidence score */
  confidence: number;
}

/**
 * RagRouterService - Intelligent router for Hybrid RAG system.
 *
 * This service implements the decision logic for routing queries between:
 * - **Embeddings-based RAG**: Fast semantic search using vector similarity (RAGService)
 * - **PageIndex RAG**: Reasoning-based search using LLM navigation (TreeSearchService)
 *
 * Routing Logic:
 * - `simple` queries → Embeddings (fast, good for factual lookups)
 * - `legal` queries → PageIndex (accurate, better for legal interpretation)
 * - `complex` queries → PageIndex (structured reasoning for multi-hop queries)
 *
 * All decisions are logged for analytics and system improvement.
 *
 * @see Issue #1593 - [RAG-1542b] Implementar RagRouterService com decision logic
 * @see Issue #1542 - Hybrid RAG parent issue
 */
@Injectable()
export class RagRouterService {
  private readonly logger = new Logger(RagRouterService.name);

  /**
   * In-memory decision log for recent decisions.
   * In production, this should be persisted to a database or analytics system.
   */
  private readonly decisionLog: RouterDecisionLog[] = [];
  private readonly maxLogSize: number;

  /**
   * Whether to force a specific path (for testing/debugging).
   */
  private readonly forcePath: 'embeddings' | 'pageindex' | null;

  constructor(
    private readonly classifier: QueryComplexityClassifierService,
    private readonly embeddingsRag: RAGService,
    private readonly pageIndexRag: TreeSearchService,
    private readonly configService: ConfigService,
  ) {
    this.maxLogSize = this.configService.get<number>(
      'RAG_ROUTER_MAX_LOG_SIZE',
      1000,
    );
    this.forcePath =
      (this.configService.get<string>('RAG_ROUTER_FORCE_PATH') as
        | 'embeddings'
        | 'pageindex') || null;

    this.logger.log('RagRouterService initialized', {
      maxLogSize: this.maxLogSize,
      forcePath: this.forcePath || 'auto',
    });
  }

  /**
   * Route a query to the appropriate RAG path and execute the search.
   *
   * @param query - Natural language query
   * @param options - Optional search configuration
   * @returns Unified RAG result with results from the chosen path
   *
   * @example
   * // Simple query routed to embeddings
   * const result = await router.route('preço de computador');
   * // result.path === 'embeddings'
   *
   * @example
   * // Legal query routed to PageIndex
   * const result = await router.route('artigo 75 da lei 14133');
   * // result.path === 'pageindex'
   */
  async route(
    query: string,
    options?: {
      /** Force a specific path (overrides classification) */
      forcePath?: 'embeddings' | 'pageindex';
      /** Maximum results for embeddings search */
      embeddingsLimit?: number;
      /** Minimum similarity for embeddings search */
      embeddingsThreshold?: number;
      /** Maximum results for PageIndex search */
      pageIndexLimit?: number;
      /** Document type filter for PageIndex */
      documentType?: string;
    },
  ): Promise<RagResult> {
    const startTime = Date.now();

    // Classify the query
    const classification = this.classifier.classifyWithDetails(query);

    this.logger.log('RAG Router: classifying query', {
      queryPreview: query.substring(0, 80),
      complexity: classification.complexity,
      confidence: classification.confidence,
    });

    // Determine which path to use
    const pathChosen = this.determinePath(
      classification.complexity,
      options?.forcePath,
    );

    this.logger.log('RAG Router: path chosen', {
      complexity: classification.complexity,
      pathChosen,
      forcedBy: options?.forcePath || this.forcePath || 'classification',
    });

    // Execute the appropriate search
    let result: RagResult;

    if (pathChosen === 'embeddings') {
      result = await this.executeEmbeddingsSearch(
        query,
        classification,
        options?.embeddingsLimit,
        options?.embeddingsThreshold,
      );
    } else {
      result = await this.executePageIndexSearch(
        query,
        classification,
        options?.pageIndexLimit,
        options?.documentType,
      );
    }

    const latencyMs = Date.now() - startTime;
    result.latencyMs = latencyMs;

    // Log the decision
    this.logDecision(
      query,
      classification.complexity,
      pathChosen,
      latencyMs,
      result,
    );

    this.logger.log('RAG Router: search completed', {
      path: result.path,
      resultCount:
        result.embeddingsResults?.length ||
        result.pageIndexResults?.length ||
        0,
      confidence: result.confidence,
      latencyMs,
    });

    return result;
  }

  /**
   * Determine which RAG path to use based on complexity.
   *
   * @param complexity - Query complexity classification
   * @param forcePathOption - Optional forced path from options
   * @returns The chosen path
   */
  private determinePath(
    complexity: QueryComplexity,
    forcePathOption?: 'embeddings' | 'pageindex',
  ): 'embeddings' | 'pageindex' {
    // Priority 1: Force path from options
    if (forcePathOption) {
      return forcePathOption;
    }

    // Priority 2: Force path from config (for testing)
    if (this.forcePath) {
      return this.forcePath;
    }

    // Priority 3: Route based on complexity
    switch (complexity) {
      case 'simple':
        return 'embeddings';
      case 'legal':
      case 'complex':
        return 'pageindex';
      default:
        // Default to embeddings for unknown complexity
        return 'embeddings';
    }
  }

  /**
   * Execute embeddings-based RAG search.
   */
  private async executeEmbeddingsSearch(
    query: string,
    classification: ClassificationResult,
    limit = 5,
    threshold = 0.7,
  ): Promise<RagResult> {
    try {
      const results = await this.embeddingsRag.findSimilar(
        query,
        limit,
        threshold,
      );

      return {
        path: 'embeddings',
        classification,
        embeddingsResults: results,
        confidence:
          results.length > 0
            ? Math.max(...results.map((r) => r.similarity))
            : 0,
        latencyMs: 0, // Will be set by caller
      };
    } catch (error) {
      this.logger.error('Embeddings search failed', { error });

      return {
        path: 'embeddings',
        classification,
        embeddingsResults: [],
        confidence: 0,
        latencyMs: 0,
      };
    }
  }

  /**
   * Execute PageIndex-based RAG search.
   */
  private async executePageIndexSearch(
    query: string,
    classification: ClassificationResult,
    limit = 5,
    documentType?: string,
  ): Promise<RagResult> {
    try {
      const results = await this.pageIndexRag.searchMultipleTrees(query, {
        limit,
        documentType,
        maxResults: limit,
        includeContent: true,
      });

      return {
        path: 'pageindex',
        classification,
        pageIndexResults: results,
        confidence:
          results.length > 0
            ? Math.max(...results.map((r) => r.confidence))
            : 0,
        latencyMs: 0, // Will be set by caller
      };
    } catch (error) {
      this.logger.error('PageIndex search failed', { error });

      return {
        path: 'pageindex',
        classification,
        pageIndexResults: [],
        confidence: 0,
        latencyMs: 0,
      };
    }
  }

  /**
   * Log a routing decision for analytics.
   */
  private logDecision(
    query: string,
    complexity: QueryComplexity,
    pathChosen: 'embeddings' | 'pageindex',
    latencyMs: number,
    result: RagResult,
  ): void {
    const logEntry: RouterDecisionLog = {
      timestamp: new Date(),
      queryHash: this.hashQuery(query),
      complexity,
      pathChosen,
      latencyMs,
      resultCount:
        result.embeddingsResults?.length ||
        result.pageIndexResults?.length ||
        0,
      confidence: result.confidence,
    };

    // Add to in-memory log
    this.decisionLog.push(logEntry);

    // Trim log if it exceeds max size
    if (this.decisionLog.length > this.maxLogSize) {
      this.decisionLog.shift();
    }

    this.logger.debug('Router decision logged', logEntry);
  }

  /**
   * Hash a query for privacy in logs.
   * Uses a simple hash - in production, use crypto.createHash('sha256').
   */
  private hashQuery(query: string): string {
    let hash = 0;
    for (let i = 0; i < query.length; i++) {
      const char = query.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(16).padStart(8, '0');
  }

  /**
   * Get recent routing decisions for analytics.
   *
   * @param limit - Maximum number of decisions to return
   * @returns Array of recent routing decisions
   */
  getRecentDecisions(limit = 100): RouterDecisionLog[] {
    return this.decisionLog.slice(-limit);
  }

  /**
   * Get routing statistics.
   *
   * @returns Aggregated statistics about routing decisions
   */
  getStats(): {
    totalDecisions: number;
    byPath: Record<'embeddings' | 'pageindex', number>;
    byComplexity: Record<QueryComplexity, number>;
    averageLatencyMs: number;
    averageConfidence: number;
  } {
    const byPath = { embeddings: 0, pageindex: 0 };
    const byComplexity: Record<QueryComplexity, number> = {
      simple: 0,
      complex: 0,
      legal: 0,
    };
    let totalLatency = 0;
    let totalConfidence = 0;

    for (const entry of this.decisionLog) {
      byPath[entry.pathChosen]++;
      byComplexity[entry.complexity]++;
      totalLatency += entry.latencyMs;
      totalConfidence += entry.confidence;
    }

    const count = this.decisionLog.length || 1; // Avoid division by zero

    return {
      totalDecisions: this.decisionLog.length,
      byPath,
      byComplexity,
      averageLatencyMs: Math.round(totalLatency / count),
      averageConfidence: Number((totalConfidence / count).toFixed(3)),
    };
  }

  /**
   * Clear decision log.
   * Useful for testing or memory management.
   */
  clearDecisionLog(): void {
    this.decisionLog.length = 0;
    this.logger.log('Decision log cleared');
  }
}
