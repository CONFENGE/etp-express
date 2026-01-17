import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PageIndexService, IndexingResult } from './pageindex.service';
import { TreeBuilderService } from './services/tree-builder.service';
import { IndexDocumentDto } from './dto/index-document.dto';
import { SearchTreeDto } from './dto/search-tree.dto';
import { TreeSearchResult } from './interfaces/tree-node.interface';

/**
 * PageIndex Controller - REST API for hierarchical document indexing.
 *
 * Endpoints:
 * - POST /pageindex/index - Index a new document
 * - POST /pageindex/:id/search - Search within a document tree
 * - GET /pageindex - List all indexed documents
 * - GET /pageindex/:id - Get a specific document tree
 * - DELETE /pageindex/:id - Delete a document tree
 * - GET /pageindex/stats - Get service statistics
 *
 * All endpoints require JWT authentication.
 *
 * @see Issue #1550 - [PI-1538a] Setup infraestrutura módulo PageIndex
 * @see Issue #1538 - Create PageIndex module for hierarchical document indexing
 */
@ApiTags('pageindex')
@Controller('pageindex')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class PageIndexController {
  constructor(
    private readonly pageIndexService: PageIndexService,
    private readonly treeBuilderService: TreeBuilderService,
  ) {}

  /**
   * Index a new document.
   *
   * Accepts document via:
   * - File path (server-side)
   * - Raw text content
   * - Source URL
   *
   * @example POST /pageindex/index
   * {
   *   "documentName": "Lei 14.133/2021",
   *   "sourceUrl": "https://planalto.gov.br/...",
   *   "documentType": "legislation"
   * }
   */
  @Post('index')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({
    summary: 'Index a new document',
    description:
      'Creates a hierarchical tree structure from the document using PageIndex. Returns 202 Accepted as indexing may be async.',
  })
  @ApiResponse({
    status: 202,
    description: 'Document indexing started',
  })
  @ApiResponse({
    status: 501,
    description: 'Not implemented (stub)',
  })
  async indexDocument(@Body() dto: IndexDocumentDto): Promise<IndexingResult> {
    return this.pageIndexService.indexDocument(dto);
  }

  /**
   * Search within a document tree.
   *
   * Uses LLM reasoning to navigate the tree structure
   * and find relevant sections.
   *
   * @example POST /pageindex/550e8400.../search
   * {
   *   "query": "Qual o limite para dispensa de licitação?",
   *   "maxResults": 5
   * }
   */
  @Post(':id/search')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Search within a document tree',
    description:
      'Uses LLM reasoning to navigate the tree and find relevant sections.',
  })
  @ApiParam({
    name: 'id',
    description: 'Document tree UUID',
  })
  @ApiResponse({
    status: 200,
    description: 'Search results',
  })
  @ApiResponse({
    status: 404,
    description: 'Document tree not found',
  })
  @ApiResponse({
    status: 501,
    description: 'Not implemented (stub)',
  })
  async searchTree(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SearchTreeDto,
  ): Promise<TreeSearchResult> {
    return this.pageIndexService.searchTree(id, dto.query, {
      maxDepth: dto.maxDepth,
      maxResults: dto.maxResults,
      minConfidence: dto.minConfidence,
      includeContent: dto.includeContent,
    });
  }

  /**
   * List all indexed documents.
   *
   * @example GET /pageindex
   */
  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'List all indexed documents',
    description: 'Returns all document trees in the system.',
  })
  @ApiResponse({
    status: 200,
    description: 'List of indexed documents',
  })
  @ApiResponse({
    status: 501,
    description: 'Not implemented (stub)',
  })
  async listTrees(): Promise<{
    count: number;
    trees: IndexingResult[];
  }> {
    const trees = await this.pageIndexService.listTrees();
    return {
      count: trees.length,
      trees,
    };
  }

  /**
   * Get a specific document tree.
   *
   * @example GET /pageindex/550e8400-e29b-41d4-a716-446655440000
   */
  @Get('stats')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get PageIndex statistics',
    description: 'Returns statistics about indexed documents.',
  })
  @ApiResponse({
    status: 200,
    description: 'Service statistics',
  })
  async getStats() {
    return this.pageIndexService.getStats();
  }

  /**
   * Health check for TreeBuilder service.
   *
   * @example GET /pageindex/health
   */
  @Get('health')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Check TreeBuilder health',
    description: 'Verifies Python and PageIndex availability.',
  })
  @ApiResponse({
    status: 200,
    description: 'Health status',
  })
  async healthCheck(): Promise<{
    healthy: boolean;
    pythonAvailable: boolean;
    pageindexAvailable: boolean;
    pythonVersion?: string;
    error?: string;
  }> {
    return this.treeBuilderService.checkHealth();
  }

  /**
   * Get a specific document tree.
   *
   * @example GET /pageindex/550e8400-e29b-41d4-a716-446655440000
   */
  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get a document tree by ID',
    description: 'Returns the full tree structure of an indexed document.',
  })
  @ApiParam({
    name: 'id',
    description: 'Document tree UUID',
  })
  @ApiResponse({
    status: 200,
    description: 'Document tree',
  })
  @ApiResponse({
    status: 404,
    description: 'Document tree not found',
  })
  @ApiResponse({
    status: 501,
    description: 'Not implemented (stub)',
  })
  async getTree(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<IndexingResult | null> {
    return this.pageIndexService.getTree(id);
  }

  /**
   * Delete a document tree.
   *
   * @example DELETE /pageindex/550e8400-e29b-41d4-a716-446655440000
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete a document tree',
    description: 'Removes an indexed document from the system.',
  })
  @ApiParam({
    name: 'id',
    description: 'Document tree UUID',
  })
  @ApiResponse({
    status: 204,
    description: 'Document tree deleted',
  })
  @ApiResponse({
    status: 404,
    description: 'Document tree not found',
  })
  @ApiResponse({
    status: 501,
    description: 'Not implemented (stub)',
  })
  async deleteTree(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.pageIndexService.deleteTree(id);
  }

  /**
   * Process a pending document to build its tree structure.
   *
   * @example POST /pageindex/550e8400.../process
   * {
   *   "text": "Document content..."
   * }
   */
  @Post(':id/process')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Process a document to build its tree',
    description:
      'Triggers TreeBuilderService to generate hierarchical structure for a pending document.',
  })
  @ApiParam({
    name: 'id',
    description: 'Document tree UUID',
  })
  @ApiResponse({
    status: 200,
    description: 'Document processed successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Document tree not found',
  })
  async processDocument(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { documentPath?: string; text?: string },
  ): Promise<IndexingResult> {
    return this.treeBuilderService.processDocument(
      id,
      body.documentPath,
      body.text,
    );
  }
}
