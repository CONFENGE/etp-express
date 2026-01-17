import {
  Injectable,
  Logger,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { spawn } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import {
  PageIndexResponse,
  PageIndexResult,
  PageIndexOptions,
  PageIndexError,
  PageIndexHealthResponse,
} from '../interfaces/page-index-response.interface';
import { TreeNode } from '../interfaces/tree-node.interface';
import { PageIndexService, IndexingResult } from '../pageindex.service';
import { DocumentTreeStatus } from '../../../entities/document-tree.entity';

/**
 * Result of a tree building operation.
 */
export interface TreeBuildResult {
  /** Root node of the generated tree */
  tree: TreeNode;

  /** Total number of nodes in the tree */
  nodeCount: number;

  /** Maximum depth of the tree */
  maxDepth: number;

  /** Processing time in milliseconds */
  processingTimeMs: number;

  /** Document name */
  documentName: string;

  /** Document description (if generated) */
  documentDescription?: string;
}

/**
 * TreeBuilderService - Generates hierarchical document trees using PageIndex.
 *
 * This service integrates with the Python PageIndex library to process
 * documents (PDF, TXT, MD) and generate hierarchical tree structures.
 *
 * Communication with Python:
 * - Uses subprocess with JSON over stdin/stdout
 * - Fallback to simple parser when PageIndex unavailable
 *
 * @see Issue #1552 - [PI-1538c] Implementar TreeBuilderService com integração Python
 * @see https://github.com/VectifyAI/PageIndex
 */
@Injectable()
export class TreeBuilderService {
  private readonly logger = new Logger(TreeBuilderService.name);
  private readonly pythonPath: string;
  private readonly scriptPath: string;
  private readonly timeoutMs: number;

  constructor(
    private readonly configService: ConfigService,
    private readonly pageIndexService: PageIndexService,
  ) {
    // Get Python path from config or use default
    this.pythonPath =
      this.configService.get<string>('PYTHON_PATH') || 'python3';

    // Script path relative to this file
    this.scriptPath = path.join(__dirname, '..', 'scripts', 'build_tree.py');

    // Timeout for Python process (default: 5 minutes)
    this.timeoutMs =
      this.configService.get<number>('PAGEINDEX_TIMEOUT_MS') || 300000;

    this.logger.log('TreeBuilderService initialized', {
      pythonPath: this.pythonPath,
      scriptPath: this.scriptPath,
      timeoutMs: this.timeoutMs,
    });
  }

  /**
   * Build a tree from a document file.
   *
   * @param documentPath - Path to the document file (PDF, TXT, MD)
   * @param options - Processing options
   * @returns TreeBuildResult with the generated tree
   */
  async buildTree(
    documentPath: string,
    options?: PageIndexOptions,
  ): Promise<TreeBuildResult> {
    this.logger.log('Building tree from document', { documentPath });

    // Validate file exists
    if (!fs.existsSync(documentPath)) {
      throw new BadRequestException(`Document not found: ${documentPath}`);
    }

    const request = {
      action: 'build',
      document_path: documentPath,
      options: options || {},
    };

    const result = await this.executePythonScript(request);

    return this.processResult(result);
  }

  /**
   * Build a tree from text content.
   *
   * @param text - Document text content
   * @param documentName - Name for the document
   * @param options - Processing options
   * @returns TreeBuildResult with the generated tree
   */
  async buildTreeFromText(
    text: string,
    documentName: string,
    options?: PageIndexOptions,
  ): Promise<TreeBuildResult> {
    this.logger.log('Building tree from text', {
      documentName,
      textLength: text.length,
    });

    if (!text || text.trim().length === 0) {
      throw new BadRequestException('Text content is required');
    }

    const request = {
      action: 'build_from_text',
      text,
      document_name: documentName,
      options: options || {},
    };

    const result = await this.executePythonScript(request);

    return this.processResult(result);
  }

  /**
   * Process a document and update the DocumentTree entity.
   *
   * This method handles the full lifecycle:
   * 1. Set status to PROCESSING
   * 2. Build the tree
   * 3. Update with tree structure or error
   *
   * @param treeId - ID of the DocumentTree entity
   * @param documentPath - Path to document (optional, uses entity path)
   * @param text - Text content (optional, alternative to path)
   * @returns Updated IndexingResult
   */
  async processDocument(
    treeId: string,
    documentPath?: string,
    text?: string,
  ): Promise<IndexingResult> {
    this.logger.log('Processing document for tree', { treeId });

    // Get current tree state
    const tree = await this.pageIndexService.getTree(treeId);
    if (!tree) {
      throw new BadRequestException(`Tree ${treeId} not found`);
    }

    // Set status to processing
    await this.pageIndexService.updateTreeStatus(
      treeId,
      DocumentTreeStatus.PROCESSING,
    );

    const startTime = Date.now();

    try {
      let result: TreeBuildResult;

      if (text) {
        result = await this.buildTreeFromText(text, tree.documentName);
      } else if (documentPath) {
        result = await this.buildTree(documentPath);
      } else {
        throw new BadRequestException(
          'Either documentPath or text is required',
        );
      }

      const processingTimeMs = Date.now() - startTime;

      // Update tree with result
      return await this.pageIndexService.updateTreeStatus(
        treeId,
        DocumentTreeStatus.INDEXED,
        {
          treeStructure: result.tree,
          nodeCount: result.nodeCount,
          maxDepth: result.maxDepth,
          processingTimeMs,
          indexedAt: new Date(),
        },
      );
    } catch (error) {
      // Re-throw BadRequestException for invalid input
      if (error instanceof BadRequestException) {
        throw error;
      }

      const processingTimeMs = Date.now() - startTime;
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';

      this.logger.error('Failed to process document', {
        treeId,
        error: errorMessage,
        processingTimeMs,
      });

      // Update tree with error
      return await this.pageIndexService.updateTreeStatus(
        treeId,
        DocumentTreeStatus.ERROR,
        {
          error: errorMessage,
          processingTimeMs,
        },
      );
    }
  }

  /**
   * Check if Python and PageIndex are available.
   *
   * @returns Health check result
   */
  async checkHealth(): Promise<{
    healthy: boolean;
    pythonAvailable: boolean;
    pageindexAvailable: boolean;
    pythonVersion?: string;
    error?: string;
  }> {
    try {
      const result = await this.executePythonScript({ action: 'health' });

      if (result.success && result.data) {
        const data = result.data as PageIndexHealthResponse;
        return {
          healthy: true,
          pythonAvailable: true,
          pageindexAvailable: data.pageindex_available,
          pythonVersion: data.python_version,
        };
      }

      return {
        healthy: false,
        pythonAvailable: true,
        pageindexAvailable: false,
        error: 'Unexpected response from Python script',
      };
    } catch (error) {
      return {
        healthy: false,
        pythonAvailable: false,
        pageindexAvailable: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Execute the Python script with the given request.
   */
  private async executePythonScript(
    request: Record<string, unknown>,
  ): Promise<PageIndexResult> {
    return new Promise((resolve, reject) => {
      const python = spawn(this.pythonPath, [this.scriptPath], {
        stdio: ['pipe', 'pipe', 'pipe'],
        timeout: this.timeoutMs,
      });

      let stdout = '';
      let stderr = '';

      python.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      python.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      python.on('close', (code) => {
        if (code !== 0) {
          this.logger.error('Python script failed', {
            code,
            stderr,
            stdout,
          });

          reject(
            new InternalServerErrorException(
              `PageIndex processing failed: ${stderr || stdout || 'Unknown error'}`,
            ),
          );
          return;
        }

        try {
          const result = JSON.parse(stdout) as PageIndexResult;
          resolve(result);
        } catch (parseError) {
          this.logger.error('Failed to parse Python output', {
            stdout,
            error: parseError,
          });

          reject(
            new InternalServerErrorException(
              `Failed to parse PageIndex response: ${stdout}`,
            ),
          );
        }
      });

      python.on('error', (error) => {
        this.logger.error('Failed to spawn Python process', { error });

        reject(
          new InternalServerErrorException(
            `Failed to execute PageIndex: ${error.message}`,
          ),
        );
      });

      // Send request to stdin
      python.stdin.write(JSON.stringify(request));
      python.stdin.end();
    });
  }

  /**
   * Process PageIndex result into TreeBuildResult.
   */
  private processResult(result: PageIndexResult): TreeBuildResult {
    if (!result.success) {
      const error = result.error as PageIndexError;
      throw new InternalServerErrorException(
        `PageIndex error: ${error.message}`,
      );
    }

    const data = result.data as PageIndexResponse;

    // Create root node from structure
    const rootNode: TreeNode = {
      id: 'root',
      title: data.doc_name,
      level: 0,
      content: data.doc_description,
      children: data.structure as unknown as TreeNode[],
    };

    return {
      tree: rootNode,
      nodeCount: data.metadata?.node_count || this.countNodes(rootNode),
      maxDepth: data.metadata?.max_depth || this.getMaxDepth(rootNode),
      processingTimeMs: (data.metadata?.processing_time_seconds || 0) * 1000,
      documentName: data.doc_name,
      documentDescription: data.doc_description,
    };
  }

  /**
   * Count total nodes in tree.
   */
  private countNodes(node: TreeNode): number {
    let count = 1;
    if (node.children) {
      for (const child of node.children) {
        count += this.countNodes(child);
      }
    }
    return count;
  }

  /**
   * Get maximum depth of tree.
   */
  private getMaxDepth(node: TreeNode, currentDepth = 0): number {
    let maxDepth = currentDepth;
    if (node.children) {
      for (const child of node.children) {
        maxDepth = Math.max(
          maxDepth,
          this.getMaxDepth(child, currentDepth + 1),
        );
      }
    }
    return maxDepth;
  }
}
