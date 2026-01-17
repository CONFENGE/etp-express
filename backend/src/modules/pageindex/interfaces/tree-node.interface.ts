/**
 * Tree node structure for PageIndex hierarchical document representation.
 *
 * PageIndex organizes documents into a tree structure where:
 * - Root node represents the entire document
 * - Child nodes represent sections, chapters, articles, etc.
 * - Leaf nodes contain actual content
 *
 * This structure enables reasoning-based retrieval (98.7% accuracy)
 * instead of traditional embedding-based "vibe search".
 *
 * @see Issue #1538 - Create PageIndex module for hierarchical document indexing
 * @see https://github.com/VectifyAI/PageIndex
 */
export interface TreeNode {
  /** Unique identifier for this node */
  id: string;

  /** Title or heading of this section */
  title: string;

  /** Depth level in the tree (0 = root) */
  level: number;

  /** Optional text content of this node */
  content?: string;

  /** Page numbers where this content appears (for PDFs) */
  pageNumbers?: number[];

  /** Child nodes (sub-sections, articles, etc.) */
  children: TreeNode[];
}

/**
 * Result of a tree search operation.
 * Contains the relevant nodes found and the reasoning path.
 */
export interface TreeSearchResult {
  /** Nodes identified as relevant to the query */
  relevantNodes: TreeNode[];

  /** Path traversed through the tree to reach relevant nodes */
  path: string[];

  /** Confidence score for the search result (0-1) */
  confidence: number;

  /** LLM reasoning explanation for why these nodes were selected */
  reasoning: string;

  /** Time taken for the search in milliseconds */
  searchTimeMs: number;
}

/**
 * Options for tree search operations.
 */
export interface TreeSearchOptions {
  /** Maximum depth to traverse (default: unlimited) */
  maxDepth?: number;

  /** Maximum number of nodes to return (default: 5) */
  maxResults?: number;

  /** Minimum confidence threshold (0-1, default: 0.5) */
  minConfidence?: number;

  /** Include full content in results (default: false for performance) */
  includeContent?: boolean;
}

/**
 * Metadata about an indexed document.
 */
export interface DocumentMetadata {
  /** Original filename */
  filename?: string;

  /** MIME type of the source document */
  mimeType?: string;

  /** Total number of pages (for PDFs) */
  pageCount?: number;

  /** Total word count */
  wordCount?: number;

  /** Source URL if applicable */
  sourceUrl?: string;

  /** Document type classification */
  documentType?: 'legislation' | 'contract' | 'edital' | 'tr' | 'other';

  /** Additional custom metadata */
  [key: string]: unknown;
}
