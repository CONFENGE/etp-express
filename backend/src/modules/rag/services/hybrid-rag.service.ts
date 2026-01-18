import { Injectable, Logger } from '@nestjs/common';
import {
  IRagService,
  RagSearchOptions,
  RagSearchResult,
  RagSource,
} from '../interfaces/rag.interface';
import { RagRouterService, RagResult } from './rag-router.service';

/**
 * HybridRagService - Unified facade for the Hybrid RAG system.
 *
 * This service provides a single entry point for RAG functionality,
 * abstracting the complexity of the underlying routing and search
 * mechanisms from consumers.
 *
 * Features:
 * - Implements IRagService for consistent API
 * - Delegates routing to RagRouterService
 * - Normalizes results from both embeddings and PageIndex paths
 * - Provides unified context string for AI consumption
 *
 * Usage:
 * ```typescript
 * @Injectable()
 * class ChatService {
 *   constructor(private readonly ragService: HybridRagService) {}
 *
 *   async answerQuestion(question: string): Promise<string> {
 *     const result = await this.ragService.search(question);
 *     // result.context contains relevant information for AI
 *     // result.sources contains individual source references
 *   }
 * }
 * ```
 *
 * @see Issue #1594 - [RAG-1542c] Criar interface unificada HybridRagService
 * @see Issue #1542 - Hybrid RAG parent issue
 */
@Injectable()
export class HybridRagService implements IRagService {
  private readonly logger = new Logger(HybridRagService.name);

  constructor(private readonly router: RagRouterService) {
    this.logger.log('HybridRagService initialized');
  }

  /**
   * Search for relevant context using the Hybrid RAG system.
   *
   * This method:
   * 1. Delegates to the RagRouterService for path selection and search
   * 2. Normalizes the results into a unified format
   * 3. Builds a context string optimized for AI consumption
   *
   * @param query - Natural language query
   * @param options - Optional search configuration
   * @returns Unified RAG search result with context and sources
   *
   * @example
   * // Simple query - likely routes to embeddings
   * const result = await ragService.search('preço de computador');
   *
   * @example
   * // Legal query - likely routes to PageIndex
   * const result = await ragService.search('artigo 75 da lei 14133');
   *
   * @example
   * // With options to force a specific path
   * const result = await ragService.search('my query', {
   *   forcePath: 'pageindex',
   *   limit: 10,
   * });
   */
  async search(
    query: string,
    options?: RagSearchOptions,
  ): Promise<RagSearchResult> {
    const startTime = Date.now();

    this.logger.log('HybridRagService: starting search', {
      queryPreview: query.substring(0, 80),
      options: {
        limit: options?.limit,
        forcePath: options?.forcePath,
        documentType: options?.documentType,
      },
    });

    // Delegate to router for path selection and search
    const routerResult = await this.router.route(query, {
      forcePath: options?.forcePath,
      embeddingsLimit: options?.limit,
      embeddingsThreshold: options?.threshold,
      pageIndexLimit: options?.limit,
      documentType: options?.documentType,
    });

    // Normalize the result
    const normalizedResult = this.normalizeResult(routerResult, options);

    const totalLatencyMs = Date.now() - startTime;

    this.logger.log('HybridRagService: search completed', {
      path: normalizedResult.path,
      sourcesCount: normalizedResult.sources.length,
      confidence: normalizedResult.confidence,
      latencyMs: totalLatencyMs,
    });

    return {
      ...normalizedResult,
      latencyMs: totalLatencyMs,
    };
  }

  /**
   * Normalize a RagResult from the router into a unified RagSearchResult.
   *
   * @param routerResult - Raw result from RagRouterService
   * @param options - Search options for context building
   * @returns Normalized RagSearchResult
   */
  private normalizeResult(
    routerResult: RagResult,
    options?: RagSearchOptions,
  ): RagSearchResult {
    const sources: RagSource[] = [];
    let context = '';

    if (routerResult.path === 'embeddings' && routerResult.embeddingsResults) {
      // Normalize embeddings results
      for (const result of routerResult.embeddingsResults) {
        const source: RagSource = {
          type: 'legislation',
          id: result.legislation.id,
          title: result.legislation.title,
          reference: result.legislation.getFormattedReference
            ? result.legislation.getFormattedReference()
            : `${result.legislation.type} ${result.legislation.number}/${result.legislation.year}`,
          score: result.similarity,
        };

        if (options?.includeContent && result.legislation.content) {
          source.snippet = result.legislation.content.substring(0, 500);
        }

        sources.push(source);
      }

      // Build context from embeddings results
      context = this.buildEmbeddingsContext(routerResult.embeddingsResults);
    } else if (
      routerResult.path === 'pageindex' &&
      routerResult.pageIndexResults
    ) {
      // Normalize PageIndex results
      for (const result of routerResult.pageIndexResults) {
        // Extract content from the first relevant node
        const firstNodeContent = result.relevantNodes?.[0]?.content;

        const source: RagSource = {
          type: this.determineSourceType(result.documentName),
          id: result.treeId,
          title: result.documentName,
          reference: result.path?.join(' > '),
          snippet: firstNodeContent?.substring(0, 500),
          score: result.confidence,
        };

        sources.push(source);
      }

      // Build context from PageIndex results
      context = this.buildPageIndexContext(routerResult.pageIndexResults);
    }

    return {
      context,
      sources,
      confidence: routerResult.confidence,
      path: routerResult.path,
      latencyMs: routerResult.latencyMs,
      metadata: {
        complexity: routerResult.classification.complexity,
        classificationConfidence: routerResult.classification.confidence,
        pathReason: routerResult.classification.reason,
        totalResults: sources.length,
      },
    };
  }

  /**
   * Determine the source type based on document name.
   *
   * @param documentName - Name of the document
   * @returns Source type
   */
  private determineSourceType(
    documentName: string,
  ): 'legislation' | 'document' | 'jurisprudencia' {
    const lowerName = documentName.toLowerCase();

    if (
      lowerName.includes('sumula') ||
      lowerName.includes('acordao') ||
      lowerName.includes('tce') ||
      lowerName.includes('tcu')
    ) {
      return 'jurisprudencia';
    }

    if (
      lowerName.includes('lei') ||
      lowerName.includes('decreto') ||
      lowerName.includes('in ')
    ) {
      return 'legislation';
    }

    return 'document';
  }

  /**
   * Build a context string optimized for AI consumption from embeddings results.
   *
   * @param results - Embeddings search results
   * @returns Formatted context string
   */
  private buildEmbeddingsContext(
    results: NonNullable<RagResult['embeddingsResults']>,
  ): string {
    if (results.length === 0) {
      return '';
    }

    const contextParts: string[] = [];

    for (const result of results) {
      const legislation = result.legislation;
      const reference = legislation.getFormattedReference
        ? legislation.getFormattedReference()
        : `${legislation.type} ${legislation.number}/${legislation.year}`;

      let part = `[${reference}] ${legislation.title}`;

      if (legislation.content) {
        // Include relevant content excerpt
        const excerpt = legislation.content.substring(0, 1000);
        part += `\n${excerpt}`;
      }

      contextParts.push(part);
    }

    return contextParts.join('\n\n---\n\n');
  }

  /**
   * Build a context string optimized for AI consumption from PageIndex results.
   *
   * @param results - PageIndex search results
   * @returns Formatted context string
   */
  private buildPageIndexContext(
    results: NonNullable<RagResult['pageIndexResults']>,
  ): string {
    if (results.length === 0) {
      return '';
    }

    const contextParts: string[] = [];

    for (const result of results) {
      const pathStr = result.path?.join(' > ') || 'Documento';
      let part = `[${result.documentName}] ${pathStr}`;

      // Extract content from relevant nodes
      if (result.relevantNodes && result.relevantNodes.length > 0) {
        const nodeContents = result.relevantNodes
          .filter((node) => node.content)
          .map((node) => node.content!)
          .join('\n\n');

        if (nodeContents) {
          const excerpt = nodeContents.substring(0, 1000);
          part += `\n${excerpt}`;
        }
      }

      contextParts.push(part);
    }

    return contextParts.join('\n\n---\n\n');
  }

  /**
   * Get statistics from the underlying router.
   *
   * @returns Router statistics including path distribution and latency
   */
  getStats(): ReturnType<RagRouterService['getStats']> {
    return this.router.getStats();
  }

  /**
   * Get recent routing decisions for debugging and analytics.
   *
   * @param limit - Maximum number of decisions to return
   * @returns Array of recent routing decisions
   */
  getRecentDecisions(
    limit?: number,
  ): ReturnType<RagRouterService['getRecentDecisions']> {
    return this.router.getRecentDecisions(limit);
  }
}
