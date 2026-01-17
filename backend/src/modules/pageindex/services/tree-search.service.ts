import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import {
  TreeNode,
  TreeSearchResult,
  TreeSearchOptions,
} from '../interfaces/tree-node.interface';
import {
  DocumentTree,
  DocumentTreeStatus,
} from '../../../entities/document-tree.entity';
import {
  OpenAIService,
  LLMRequest,
} from '../../orchestrator/llm/openai.service';
import {
  TREE_SEARCH_SYSTEM_PROMPT,
  buildTreeNavigationPrompt,
  DEFAULT_TREE_SEARCH_OPTIONS,
} from '../prompts/tree-search.prompt';

/**
 * LLM response for tree navigation decision.
 */
interface NavigationDecision {
  decision: 'EXPLORE' | 'FOUND' | 'NOT_FOUND';
  selectedNodes: string[];
  reasoning: string;
  confidence: number;
}

/**
 * TreeSearchService - Performs reasoning-based search in hierarchical document trees.
 *
 * This service implements the core PageIndex algorithm: instead of using vector
 * embeddings and semantic similarity (traditional RAG), it uses LLM reasoning
 * to navigate through document structure like a human expert would.
 *
 * Algorithm:
 * 1. Load tree from database
 * 2. Present root-level nodes to LLM
 * 3. LLM decides: EXPLORE (go deeper), FOUND (answer here), or NOT_FOUND
 * 4. If EXPLORE: recursively process children of selected nodes
 * 5. Track path for auditability
 * 6. Return relevant nodes with confidence and reasoning
 *
 * Benefits over traditional RAG:
 * - 98.7% accuracy (vs ~80% for embeddings on FinanceBench)
 * - Auditable retrieval path (not black-box similarity)
 * - Preserves document structure (no chunking artifacts)
 * - Works without vector database
 *
 * @see Issue #1553 - [PI-1538d] Implementar TreeSearchService com LLM reasoning
 * @see https://github.com/VectifyAI/PageIndex
 */
@Injectable()
export class TreeSearchService {
  private readonly logger = new Logger(TreeSearchService.name);

  constructor(
    @InjectRepository(DocumentTree)
    private readonly documentTreeRepository: Repository<DocumentTree>,
    private readonly openAIService: OpenAIService,
    private readonly configService: ConfigService,
  ) {
    this.logger.log('TreeSearchService initialized');
  }

  /**
   * Search a document tree using LLM reasoning.
   *
   * @param treeId - UUID of the document tree to search
   * @param query - Natural language query
   * @param options - Search options (depth, results, confidence)
   * @returns TreeSearchResult with relevant nodes and reasoning
   *
   * @throws NotFoundException if tree not found
   * @throws Error if tree not indexed yet
   */
  async search(
    treeId: string,
    query: string,
    options?: TreeSearchOptions,
  ): Promise<TreeSearchResult> {
    const startTime = Date.now();
    this.logger.log('Starting tree search', {
      treeId,
      query: query.substring(0, 100),
    });

    // Load tree from database
    const documentTree = await this.documentTreeRepository.findOne({
      where: { id: treeId },
    });

    if (!documentTree) {
      throw new NotFoundException(`Document tree ${treeId} not found`);
    }

    if (documentTree.status !== DocumentTreeStatus.INDEXED) {
      throw new Error(
        `Document tree ${treeId} is not indexed yet (status: ${documentTree.status}). ` +
          'Wait for indexing to complete.',
      );
    }

    if (!documentTree.treeStructure) {
      throw new Error(`Document tree ${treeId} has no tree structure`);
    }

    // Merge options with defaults
    const searchOptions = {
      ...DEFAULT_TREE_SEARCH_OPTIONS,
      ...options,
    };

    // Perform tree search
    const result = await this.performTreeSearch(
      documentTree.treeStructure as TreeNode,
      query,
      searchOptions,
    );

    const searchTimeMs = Date.now() - startTime;

    this.logger.log('Tree search completed', {
      treeId,
      relevantNodesCount: result.relevantNodes.length,
      path: result.path,
      confidence: result.confidence,
      searchTimeMs,
    });

    return {
      ...result,
      searchTimeMs,
    };
  }

  /**
   * Perform the tree search algorithm.
   *
   * @param rootNode - Root node of the tree
   * @param query - Search query
   * @param options - Search options
   * @returns Search result with relevant nodes
   */
  private async performTreeSearch(
    rootNode: TreeNode,
    query: string,
    options: typeof DEFAULT_TREE_SEARCH_OPTIONS & TreeSearchOptions,
  ): Promise<Omit<TreeSearchResult, 'searchTimeMs'>> {
    const relevantNodes: TreeNode[] = [];
    const path: string[] = [rootNode.title];
    let overallConfidence = 0;
    let overallReasoning = '';
    let iterations = 0;

    // Queue of nodes to explore: [node, depth, path]
    const explorationQueue: Array<{
      node: TreeNode;
      depth: number;
      currentPath: string[];
    }> = [];

    // Start with root's children (or root itself if no children)
    if (rootNode.children && rootNode.children.length > 0) {
      explorationQueue.push({
        node: rootNode,
        depth: 0,
        currentPath: [rootNode.title],
      });
    } else {
      // Root is a leaf, check if it's relevant
      relevantNodes.push(rootNode);
      return {
        relevantNodes,
        path: [rootNode.title],
        confidence: 1.0,
        reasoning: 'Single node tree - returning root',
      };
    }

    while (
      explorationQueue.length > 0 &&
      iterations < options.maxIterations &&
      relevantNodes.length < options.maxResults
    ) {
      iterations++;
      const current = explorationQueue.shift()!;

      // Check depth limit
      if (current.depth >= options.maxDepth) {
        this.logger.debug('Max depth reached', { depth: current.depth });
        continue;
      }

      // Get children to evaluate
      const children = current.node.children || [];
      if (children.length === 0) {
        // Leaf node - add to results if we're exploring this path
        if (current.depth > 0) {
          relevantNodes.push(current.node);
        }
        continue;
      }

      // Ask LLM which children to explore
      const decision = await this.getNavigationDecision(
        query,
        current.depth,
        children,
        current.currentPath,
        options.temperatureLow,
      );

      this.logger.debug('Navigation decision', {
        decision: decision.decision,
        selectedNodes: decision.selectedNodes,
        confidence: decision.confidence,
      });

      // Update overall reasoning
      if (overallReasoning) {
        overallReasoning += ` → ${decision.reasoning}`;
      } else {
        overallReasoning = decision.reasoning;
      }

      // Process decision
      switch (decision.decision) {
        case 'FOUND':
          // Add selected nodes to results
          for (const nodeId of decision.selectedNodes) {
            const foundNode = children.find((c) => c.id === nodeId);
            if (
              foundNode &&
              !relevantNodes.some((n) => n.id === foundNode.id)
            ) {
              relevantNodes.push(
                options.includeContent
                  ? foundNode
                  : this.stripContent(foundNode),
              );
              overallConfidence = Math.max(
                overallConfidence,
                decision.confidence,
              );
            }
          }
          // Update path with last found node
          if (decision.selectedNodes.length > 0) {
            const lastFoundId =
              decision.selectedNodes[decision.selectedNodes.length - 1];
            const lastFound = children.find((c) => c.id === lastFoundId);
            if (lastFound) {
              path.push(lastFound.title);
            }
          }
          break;

        case 'EXPLORE':
          // Add selected children to queue for further exploration
          for (const nodeId of decision.selectedNodes) {
            const childNode = children.find((c) => c.id === nodeId);
            if (childNode) {
              explorationQueue.push({
                node: childNode,
                depth: current.depth + 1,
                currentPath: [...current.currentPath, childNode.title],
              });
            }
          }
          break;

        case 'NOT_FOUND':
          // This path doesn't contain relevant info, continue with other paths
          this.logger.debug('Path not relevant', { path: current.currentPath });
          break;
      }
    }

    // If no results found, return with low confidence
    if (relevantNodes.length === 0) {
      return {
        relevantNodes: [],
        path,
        confidence: 0,
        reasoning:
          overallReasoning || 'No relevant sections found in the document tree',
      };
    }

    // Apply confidence threshold filter
    const filteredNodes = relevantNodes.filter(
      () => overallConfidence >= options.minConfidence,
    );

    return {
      relevantNodes: filteredNodes.slice(0, options.maxResults),
      path,
      confidence: overallConfidence,
      reasoning: overallReasoning,
    };
  }

  /**
   * Get navigation decision from LLM.
   *
   * @param query - Search query
   * @param currentLevel - Current depth in tree
   * @param nodes - Available nodes at current level
   * @param path - Path traversed so far
   * @param temperature - LLM temperature (lower = more deterministic)
   * @returns Navigation decision
   */
  private async getNavigationDecision(
    query: string,
    currentLevel: number,
    nodes: TreeNode[],
    path: string[],
    temperature: number,
  ): Promise<NavigationDecision> {
    // Build node summaries for LLM
    const nodeSummaries = nodes.map((node) => ({
      id: node.id,
      title: node.title,
      summary: node.content?.substring(0, 200),
    }));

    const userPrompt = buildTreeNavigationPrompt(
      query,
      currentLevel,
      nodeSummaries,
      path,
    );

    const llmRequest: LLMRequest = {
      systemPrompt: TREE_SEARCH_SYSTEM_PROMPT,
      userPrompt,
      temperature,
      maxTokens: 500,
    };

    try {
      const response = await this.openAIService.generateCompletion(llmRequest);
      const decision = this.parseNavigationResponse(response.content);
      return decision;
    } catch (error) {
      this.logger.error('Failed to get navigation decision', { error });
      // Default to exploring all nodes if LLM fails
      return {
        decision: 'EXPLORE',
        selectedNodes: nodes.slice(0, 3).map((n) => n.id),
        reasoning: 'LLM error - exploring top nodes by default',
        confidence: 0.3,
      };
    }
  }

  /**
   * Parse LLM response into NavigationDecision.
   *
   * @param content - Raw LLM response content
   * @returns Parsed navigation decision
   */
  private parseNavigationResponse(content: string): NavigationDecision {
    try {
      // Extract JSON from response (may have markdown code blocks)
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }

      const parsed = JSON.parse(jsonMatch[0]);

      // Validate and normalize
      const decision = parsed.decision?.toUpperCase() || 'NOT_FOUND';
      if (!['EXPLORE', 'FOUND', 'NOT_FOUND'].includes(decision)) {
        throw new Error(`Invalid decision: ${decision}`);
      }

      return {
        decision: decision as NavigationDecision['decision'],
        selectedNodes: Array.isArray(parsed.selectedNodes)
          ? parsed.selectedNodes.slice(0, 3)
          : [],
        reasoning: parsed.reasoning || 'No reasoning provided',
        confidence: Math.min(1, Math.max(0, Number(parsed.confidence) || 0.5)),
      };
    } catch (error) {
      this.logger.warn('Failed to parse navigation response', {
        error,
        content: content.substring(0, 200),
      });

      return {
        decision: 'NOT_FOUND',
        selectedNodes: [],
        reasoning: 'Failed to parse LLM response',
        confidence: 0,
      };
    }
  }

  /**
   * Strip content from node for lightweight results.
   *
   * @param node - Node to strip
   * @returns Node without content (only metadata)
   */
  private stripContent(node: TreeNode): TreeNode {
    return {
      id: node.id,
      title: node.title,
      level: node.level,
      pageNumbers: node.pageNumbers,
      children: node.children?.map((c) => this.stripContent(c)) || [],
    };
  }

  /**
   * Search across multiple trees for a query.
   * Useful when the target document is unknown.
   *
   * @param query - Search query
   * @param options - Search options plus tree filtering
   * @returns Array of search results from all matching trees
   */
  async searchMultipleTrees(
    query: string,
    options?: TreeSearchOptions & { documentType?: string; limit?: number },
  ): Promise<
    Array<TreeSearchResult & { treeId: string; documentName: string }>
  > {
    const limit = options?.limit || 5;

    // Find indexed trees
    const queryBuilder = this.documentTreeRepository
      .createQueryBuilder('tree')
      .where('tree.status = :status', { status: DocumentTreeStatus.INDEXED })
      .orderBy('tree.indexedAt', 'DESC')
      .take(limit);

    if (options?.documentType) {
      queryBuilder.andWhere('tree.documentType = :type', {
        type: options.documentType,
      });
    }

    const trees = await queryBuilder.getMany();

    // Search each tree in parallel
    const results = await Promise.all(
      trees.map(async (tree) => {
        try {
          const result = await this.search(tree.id, query, options);
          return {
            ...result,
            treeId: tree.id,
            documentName: tree.documentName,
          };
        } catch (error) {
          this.logger.warn(`Failed to search tree ${tree.id}`, { error });
          return null;
        }
      }),
    );

    // Filter out failed searches and sort by confidence
    return results
      .filter((r): r is NonNullable<typeof r> => r !== null)
      .sort((a, b) => b.confidence - a.confidence);
  }
}
