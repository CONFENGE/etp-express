/**
 * RAG (Retrieval-Augmented Generation) Interface Module.
 *
 * Provides unified interfaces for the Hybrid RAG system, abstracting
 * the complexity of routing between embeddings-based and PageIndex-based
 * RAG paths.
 *
 * @see Issue #1594 - [RAG-1542c] Criar interface unificada HybridRagService
 * @see Issue #1542 - Hybrid RAG parent issue
 */

/**
 * Source reference from a RAG search result.
 *
 * Represents the origin of retrieved content, which can be
 * either from embeddings (legislation) or PageIndex (documents).
 */
export interface RagSource {
  /** Type of source: legislation or document tree node */
  type: 'legislation' | 'document' | 'jurisprudencia';

  /** Unique identifier for the source */
  id: string;

  /** Display title for the source */
  title: string;

  /** Optional reference string (e.g., "Lei 14.133/2021, Art. 75") */
  reference?: string;

  /** Content snippet that matched the query */
  snippet?: string;

  /** Similarity/confidence score for this source (0-1) */
  score: number;
}

/**
 * Options for RAG search operations.
 *
 * Allows consumers to customize search behavior without
 * needing to understand the underlying RAG path.
 */
export interface RagSearchOptions {
  /** Maximum number of results to return (default: 5) */
  limit?: number;

  /** Minimum confidence threshold (0-1, default: 0.7) */
  threshold?: number;

  /** Force a specific RAG path (overrides automatic routing) */
  forcePath?: 'embeddings' | 'pageindex';

  /** Document type filter for PageIndex search */
  documentType?: string;

  /** Include full content in results (default: false) */
  includeContent?: boolean;
}

/**
 * Unified RAG search result.
 *
 * Normalizes results from both embeddings and PageIndex paths
 * into a common format for consumers.
 */
export interface RagSearchResult {
  /** Concatenated context for AI consumption */
  context: string;

  /** Individual sources that contributed to the context */
  sources: RagSource[];

  /** Overall confidence of the result (0-1) */
  confidence: number;

  /** Which RAG path was used */
  path: 'embeddings' | 'pageindex' | 'hybrid';

  /** Time taken for the search in milliseconds */
  latencyMs: number;

  /** Metadata about the search */
  metadata?: {
    /** Query complexity classification */
    complexity?: 'simple' | 'complex' | 'legal';

    /** Confidence in the classification */
    classificationConfidence?: number;

    /** Reason for path selection */
    pathReason?: string;

    /** Number of results before filtering */
    totalResults?: number;
  };
}

/**
 * IRagService - Common interface for RAG services.
 *
 * This interface should be implemented by any service that provides
 * RAG functionality, allowing consumers to use different RAG implementations
 * interchangeably.
 *
 * Implementations:
 * - HybridRagService: Unified facade that routes to the best path
 * - RAGService: Direct embeddings-based search
 * - TreeSearchService: Direct PageIndex-based search
 *
 * @example
 * ```typescript
 * @Injectable()
 * class MyService {
 *   constructor(private readonly ragService: IRagService) {}
 *
 *   async findContext(question: string): Promise<string> {
 *     const result = await this.ragService.search(question);
 *     return result.context;
 *   }
 * }
 * ```
 */
export interface IRagService {
  /**
   * Search for relevant context using RAG.
   *
   * @param query - Natural language query
   * @param options - Optional search configuration
   * @returns Unified RAG search result
   */
  search(query: string, options?: RagSearchOptions): Promise<RagSearchResult>;
}

/**
 * Injection token for the IRagService interface.
 * Use with @Inject() decorator for dependency injection.
 *
 * @example
 * ```typescript
 * @Injectable()
 * class MyService {
 *   constructor(
 *     @Inject(RAG_SERVICE) private readonly ragService: IRagService
 *   ) {}
 * }
 * ```
 */
export const RAG_SERVICE = Symbol('IRagService');
