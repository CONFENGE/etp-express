import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  DocumentTree,
  DocumentTreeStatus,
} from '../../../entities/document-tree.entity';
import { DocumentType } from '../dto/index-document.dto';
import { TreeSearchService } from './tree-search.service';
import { TreeNode } from '../interfaces/tree-node.interface';
import {
  Tribunal,
  TEMAS_JURISPRUDENCIA,
} from '../interfaces/jurisprudencia.interface';

/**
 * Result of a jurisprudence search.
 */
export interface JurisprudenciaSearchResult {
  /** Search query used */
  query: string;

  /** Tribunal filter applied */
  tribunal?: Tribunal;

  /** Total number of results */
  totalResults: number;

  /** Search confidence score (0-1) */
  confidence: number;

  /** Search reasoning from tree navigation */
  reasoning: string;

  /** Search execution time in milliseconds */
  searchTimeMs: number;

  /** Matching jurisprudence items */
  items: JurisprudenciaItem[];
}

/**
 * Individual jurisprudence item in search results.
 */
export interface JurisprudenciaItem {
  /** Node ID */
  id: string;

  /** Title (e.g., "Sumula 1/2000") */
  title: string;

  /** Tribunal */
  tribunal: 'TCE-SP' | 'TCU';

  /** Full content (if requested) */
  content?: string;

  /** Relevance score for this item */
  relevance?: number;
}

/**
 * Paginated list result for jurisprudence.
 */
export interface JurisprudenciaListResult {
  /** Total count */
  total: number;

  /** Items in current page */
  items: JurisprudenciaItem[];

  /** Document tree ID */
  documentTreeId: string;

  /** Last indexed date */
  indexedAt: Date | null;
}

/**
 * Statistics about indexed jurisprudence.
 */
export interface JurisprudenciaStats {
  /** Total jurisprudence items indexed */
  totalItems: number;

  /** TCE-SP items count */
  tcespCount: number;

  /** TCU items count */
  tcuCount: number;

  /** Document tree ID */
  documentTreeId: string;

  /** Last indexed date */
  indexedAt: Date | null;

  /** Available themes */
  themes: string[];
}

/**
 * JurisprudenciaService - Search and retrieve jurisprudence from TCE-SP and TCU.
 *
 * This service provides methods to:
 * - Search by natural language query (semantic search via TreeSearchService)
 * - Search by theme (Licitacao, Contratos, Lei 14.133, etc.)
 * - Filter by tribunal (TCE-SP, TCU)
 * - List all indexed jurisprudence
 *
 * The underlying data comes from JurisprudenciaSeeder which indexes
 * sumulas and acordaos from TCE-SP and TCU into a PageIndex tree structure.
 *
 * @see Issue #1581 - [JURIS-1540e] Criar API de busca por jurisprudencia
 * @see JurisprudenciaSeeder - Seeds the jurisprudence data
 * @see TreeSearchService - Performs reasoning-based search
 */
@Injectable()
export class JurisprudenciaService {
  private readonly logger = new Logger(JurisprudenciaService.name);

  constructor(
    @InjectRepository(DocumentTree)
    private readonly documentTreeRepository: Repository<DocumentTree>,
    private readonly treeSearchService: TreeSearchService,
  ) {
    this.logger.log('JurisprudenciaService initialized');
  }

  /**
   * Search jurisprudence by natural language query.
   *
   * Uses TreeSearchService for reasoning-based search through
   * the hierarchical tree structure.
   *
   * @param query - Natural language search query
   * @param options - Search options (tribunal filter, limit, confidence)
   * @returns Search results with matching jurisprudence items
   */
  async searchByText(
    query: string,
    options?: {
      tribunal?: Tribunal;
      limit?: number;
      minConfidence?: number;
      includeContent?: boolean;
    },
  ): Promise<JurisprudenciaSearchResult> {
    const startTime = Date.now();
    this.logger.log('Searching jurisprudence by text', {
      query: query.substring(0, 100),
      tribunal: options?.tribunal,
    });

    // Get the jurisprudence document tree
    const documentTree = await this.getJurisprudenciaTree();

    // Perform tree search
    const searchResult = await this.treeSearchService.search(
      documentTree.id,
      query,
      {
        maxResults: options?.limit || 10,
        minConfidence: options?.minConfidence || 0.3,
        includeContent: options?.includeContent ?? true,
        maxDepth: 5,
      },
    );

    // Convert tree nodes to jurisprudence items
    let items = this.convertToJurisprudenciaItems(
      searchResult.relevantNodes,
      options?.includeContent ?? true,
    );

    // Filter by tribunal if specified
    if (options?.tribunal) {
      items = items.filter((item) => item.tribunal === options.tribunal);
    }

    // Apply limit
    const limit = options?.limit || 10;
    items = items.slice(0, limit);

    const result: JurisprudenciaSearchResult = {
      query,
      tribunal: options?.tribunal,
      totalResults: items.length,
      confidence: searchResult.confidence,
      reasoning: searchResult.reasoning,
      searchTimeMs: Date.now() - startTime,
      items,
    };

    this.logger.log('Jurisprudence search completed', {
      query: query.substring(0, 50),
      totalResults: items.length,
      searchTimeMs: result.searchTimeMs,
    });

    return result;
  }

  /**
   * Search jurisprudence by theme.
   *
   * Directly navigates to the theme node in the tree structure
   * and returns all jurisprudence items under that theme.
   *
   * @param theme - Theme to search for (e.g., "Lei 14.133/2021 > ETP")
   * @param options - Search options (tribunal filter, limit)
   * @returns Matching jurisprudence items
   */
  async searchByTheme(
    theme: string,
    options?: {
      tribunal?: Tribunal;
      limit?: number;
    },
  ): Promise<JurisprudenciaSearchResult> {
    const startTime = Date.now();
    this.logger.log('Searching jurisprudence by theme', {
      theme,
      tribunal: options?.tribunal,
    });

    // Get the jurisprudence document tree
    const documentTree = await this.getJurisprudenciaTree();
    const treeStructure = documentTree.treeStructure as TreeNode;

    // Find nodes matching the theme
    const matchingNodes = this.findNodesByTheme(treeStructure, theme);

    // Filter by tribunal if specified
    let items = this.convertToJurisprudenciaItems(matchingNodes, true);
    if (options?.tribunal) {
      items = items.filter((item) => item.tribunal === options.tribunal);
    }

    // Apply limit
    const limit = options?.limit || 20;
    items = items.slice(0, limit);

    const result: JurisprudenciaSearchResult = {
      query: `theme:${theme}`,
      tribunal: options?.tribunal,
      totalResults: items.length,
      confidence: 1.0, // Direct match, high confidence
      reasoning: `Found ${items.length} items under theme "${theme}"`,
      searchTimeMs: Date.now() - startTime,
      items,
    };

    this.logger.log('Theme search completed', {
      theme,
      totalResults: items.length,
      searchTimeMs: result.searchTimeMs,
    });

    return result;
  }

  /**
   * Get jurisprudence by tribunal.
   *
   * @param tribunal - TCE-SP or TCU
   * @param options - Pagination options
   * @returns List of jurisprudence items for the tribunal
   */
  async getByTribunal(
    tribunal: Tribunal,
    options?: {
      limit?: number;
      offset?: number;
    },
  ): Promise<JurisprudenciaListResult> {
    this.logger.log('Getting jurisprudence by tribunal', { tribunal });

    // Get the jurisprudence document tree
    const documentTree = await this.getJurisprudenciaTree();
    const treeStructure = documentTree.treeStructure as TreeNode;

    // Find the tribunal node
    const tribunalNodeId = tribunal === 'TCE-SP' ? 'tcesp' : 'tcu';
    const tribunalNode = this.findNodeById(treeStructure, tribunalNodeId);

    if (!tribunalNode) {
      return {
        total: 0,
        items: [],
        documentTreeId: documentTree.id,
        indexedAt: documentTree.indexedAt,
      };
    }

    // Collect all leaf nodes (individual jurisprudence items)
    const allItems = this.collectLeafNodes(tribunalNode);
    const items = this.convertToJurisprudenciaItems(allItems, true);

    // Apply pagination
    const offset = options?.offset || 0;
    const limit = options?.limit || 50;
    const paginatedItems = items.slice(offset, offset + limit);

    return {
      total: items.length,
      items: paginatedItems,
      documentTreeId: documentTree.id,
      indexedAt: documentTree.indexedAt,
    };
  }

  /**
   * List all indexed jurisprudence with pagination.
   *
   * @param options - Pagination options
   * @returns Paginated list of jurisprudence items
   */
  async listAll(options?: {
    limit?: number;
    offset?: number;
  }): Promise<JurisprudenciaListResult> {
    this.logger.log('Listing all jurisprudence', options);

    // Get the jurisprudence document tree
    const documentTree = await this.getJurisprudenciaTree();
    const treeStructure = documentTree.treeStructure as TreeNode;

    // Collect all leaf nodes
    const allItems = this.collectLeafNodes(treeStructure);
    const items = this.convertToJurisprudenciaItems(allItems, false);

    // Apply pagination
    const offset = options?.offset || 0;
    const limit = options?.limit || 50;
    const paginatedItems = items.slice(offset, offset + limit);

    return {
      total: items.length,
      items: paginatedItems,
      documentTreeId: documentTree.id,
      indexedAt: documentTree.indexedAt,
    };
  }

  /**
   * Get statistics about indexed jurisprudence.
   *
   * @returns Statistics including counts by tribunal and available themes
   */
  async getStats(): Promise<JurisprudenciaStats> {
    this.logger.log('Getting jurisprudence statistics');

    // Get the jurisprudence document tree
    const documentTree = await this.getJurisprudenciaTree();
    const treeStructure = documentTree.treeStructure as TreeNode;

    // Count by tribunal
    const tcespNode = this.findNodeById(treeStructure, 'tcesp');
    const tcuNode = this.findNodeById(treeStructure, 'tcu');

    const tcespItems = tcespNode ? this.collectLeafNodes(tcespNode) : [];
    const tcuItems = tcuNode ? this.collectLeafNodes(tcuNode) : [];

    // Get available themes
    const themes = this.getAvailableThemes();

    return {
      totalItems: tcespItems.length + tcuItems.length,
      tcespCount: tcespItems.length,
      tcuCount: tcuItems.length,
      documentTreeId: documentTree.id,
      indexedAt: documentTree.indexedAt,
      themes,
    };
  }

  /**
   * Get available theme constants for filtering.
   *
   * @returns Object with TCE-SP and TCU theme categories
   */
  getAvailableThemes(): string[] {
    const themes: string[] = [];

    // Add TCE-SP themes
    for (const theme of Object.values(TEMAS_JURISPRUDENCIA.TCESP)) {
      themes.push(theme);
    }

    // Add TCU themes
    for (const theme of Object.values(TEMAS_JURISPRUDENCIA.TCU)) {
      themes.push(theme);
    }

    return themes;
  }

  /**
   * Get a specific jurisprudence item by ID.
   *
   * @param itemId - The jurisprudence item ID
   * @returns The jurisprudence item or null if not found
   */
  async getById(itemId: string): Promise<JurisprudenciaItem | null> {
    this.logger.log('Getting jurisprudence by ID', { itemId });

    // Get the jurisprudence document tree
    const documentTree = await this.getJurisprudenciaTree();
    const treeStructure = documentTree.treeStructure as TreeNode;

    // Find the node by ID
    const node = this.findNodeById(treeStructure, itemId);

    if (!node || node.children?.length) {
      // Not found or not a leaf node
      return null;
    }

    const items = this.convertToJurisprudenciaItems([node], true);
    return items[0] || null;
  }

  /**
   * Get the jurisprudence document tree.
   *
   * @throws NotFoundException if not found
   */
  private async getJurisprudenciaTree(): Promise<DocumentTree> {
    const documentTree = await this.documentTreeRepository.findOne({
      where: {
        documentType: DocumentType.JURISPRUDENCIA,
        status: DocumentTreeStatus.INDEXED,
      },
    });

    if (!documentTree) {
      throw new NotFoundException(
        'Jurisprudence data not found. Please run the seeder first.',
      );
    }

    return documentTree;
  }

  /**
   * Find a node by ID in the tree structure.
   */
  private findNodeById(node: TreeNode, id: string): TreeNode | null {
    if (node.id === id) {
      return node;
    }

    if (node.children) {
      for (const child of node.children) {
        const found = this.findNodeById(child, id);
        if (found) {
          return found;
        }
      }
    }

    return null;
  }

  /**
   * Find nodes matching a theme.
   */
  private findNodesByTheme(node: TreeNode, theme: string): TreeNode[] {
    const results: TreeNode[] = [];

    // Check if this node's title matches the theme
    const normalizedTitle = node.title.toLowerCase();
    const normalizedTheme = theme.toLowerCase();

    if (
      normalizedTitle.includes(normalizedTheme) ||
      normalizedTheme.includes(normalizedTitle)
    ) {
      // Collect all leaf nodes under this theme
      const leafNodes = this.collectLeafNodes(node);
      results.push(...leafNodes);
    } else if (node.children) {
      // Search in children
      for (const child of node.children) {
        results.push(...this.findNodesByTheme(child, theme));
      }
    }

    return results;
  }

  /**
   * Collect all leaf nodes (jurisprudence items) from a subtree.
   */
  private collectLeafNodes(node: TreeNode): TreeNode[] {
    if (!node.children || node.children.length === 0) {
      // This is a leaf node, include it if it looks like a jurisprudence item
      if (this.isJurisprudenciaNode(node)) {
        return [node];
      }
      return [];
    }

    const results: TreeNode[] = [];
    for (const child of node.children) {
      results.push(...this.collectLeafNodes(child));
    }

    return results;
  }

  /**
   * Check if a node is a jurisprudence item (leaf node with sumula/acordao format).
   */
  private isJurisprudenciaNode(node: TreeNode): boolean {
    // Jurisprudence items have titles like "Sumula 1/2000" or "Acordao 247/2021"
    const titlePattern =
      /^(Sumula|Acordao|Decisao Normativa|Parecer)\s+\d+\/\d{4}/i;
    return titlePattern.test(node.title);
  }

  /**
   * Determine tribunal from node ID or content.
   */
  private getTribunalFromNode(node: TreeNode): 'TCE-SP' | 'TCU' {
    if (node.id.startsWith('tcesp-')) {
      return 'TCE-SP';
    }
    if (node.id.startsWith('tcu-')) {
      return 'TCU';
    }
    // Check content for tribunal reference
    if (node.content?.includes('TCE-SP')) {
      return 'TCE-SP';
    }
    return 'TCU';
  }

  /**
   * Convert tree nodes to jurisprudence items.
   */
  private convertToJurisprudenciaItems(
    nodes: TreeNode[],
    includeContent: boolean,
  ): JurisprudenciaItem[] {
    return nodes.map((node) => ({
      id: node.id,
      title: node.title,
      tribunal: this.getTribunalFromNode(node),
      content: includeContent ? node.content : undefined,
    }));
  }
}
