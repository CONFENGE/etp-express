import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  UseGuards,
  Logger,
  Delete,
  Param,
  Get,
  NotFoundException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiConsumes,
  ApiBody,
  ApiBearerAuth,
  ApiResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import {
  multerConfig,
  MAX_FILE_SIZE,
  ALLOWED_EXTENSIONS,
} from './multer.config';
import { DocumentExtractionService } from './document-extraction.service';
import { PageIndexService } from '../pageindex/pageindex.service';
import { TreeNode } from '../pageindex/interfaces/tree-node.interface';

/**
 * DTO for upload response
 */
class UploadResponseDto {
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  message: string;
  pageIndex?: {
    treeId: string;
    status: string;
  };
}

/**
 * DTO for delete response
 */
class DeleteResponseDto {
  message: string;
  filename: string;
}

/**
 * DTO for upload stats
 */
class UploadStatsDto {
  fileCount: number;
  totalSizeBytes: number;
  totalSizeMB: string;
}

/**
 * DTO for document tree response
 */
class DocumentTreeResponseDto {
  treeId: string;
  documentName: string;
  status: string;
  nodeCount: number;
  maxDepth: number;
  indexedAt: Date | null;
  error: string | null;
  tree?: TreeNode | null;
}

/**
 * Controller for document upload and management.
 *
 * Endpoints:
 * - POST /document-extraction/upload - Upload a document
 * - DELETE /document-extraction/:filename - Delete an uploaded document
 * - GET /document-extraction/stats - Get upload statistics
 */
@ApiTags('document-extraction')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('document-extraction')
export class DocumentExtractionController {
  private readonly logger = new Logger(DocumentExtractionController.name);

  constructor(
    private readonly documentExtractionService: DocumentExtractionService,
    private readonly pageIndexService: PageIndexService,
  ) {}

  /**
   * Upload a document for extraction and analysis.
   *
   * Accepted formats: .pdf, .docx
   * Max size: 10MB
   */
  @Post('upload')
  @UseInterceptors(FileInterceptor('file', multerConfig))
  @ApiOperation({
    summary: 'Upload a document for analysis',
    description: `Upload a PDF or DOCX file for text extraction and analysis.

**Limits:**
- Max file size: ${MAX_FILE_SIZE / 1024 / 1024}MB
- Allowed formats: ${ALLOWED_EXTENSIONS.join(', ')}
- Files are automatically deleted after 1 hour`,
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'The document file to upload (PDF or DOCX)',
        },
      },
      required: ['file'],
    },
  })
  @ApiResponse({
    status: 201,
    description: 'File uploaded successfully',
    type: UploadResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid file type or size exceeded',
  })
  async uploadDocument(
    @UploadedFile() file: Express.Multer.File,
  ): Promise<UploadResponseDto> {
    if (!file) {
      throw new BadRequestException(
        'Nenhum arquivo enviado. Envie um arquivo PDF ou DOCX.',
      );
    }

    this.logger.log(
      `File uploaded: ${file.filename} (${file.originalname}, ${file.size} bytes, ${file.mimetype})`,
    );

    // Process with PageIndex asynchronously
    let pageIndexResult: { treeId: string; status: string } | undefined;
    try {
      pageIndexResult =
        await this.documentExtractionService.processWithPageIndex(
          file.filename,
          file.originalname,
        );
      this.logger.log(
        `PageIndex processing started: tree ${pageIndexResult.treeId}`,
      );
    } catch (error) {
      this.logger.warn('PageIndex processing failed:', error);
      // Continue without failing the upload
    }

    return {
      filename: file.filename,
      originalName: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
      message:
        'Arquivo enviado com sucesso. O arquivo será removido automaticamente após 1 hora.',
      pageIndex: pageIndexResult,
    };
  }

  /**
   * Delete an uploaded document
   */
  @Delete(':filename')
  @ApiOperation({
    summary: 'Delete an uploaded document',
    description: 'Delete a previously uploaded document by its filename',
  })
  @ApiResponse({
    status: 200,
    description: 'File deleted successfully',
    type: DeleteResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'File not found',
  })
  deleteDocument(@Param('filename') filename: string): DeleteResponseDto {
    // Validate filename to prevent path traversal
    if (
      filename.includes('/') ||
      filename.includes('\\') ||
      filename.includes('..')
    ) {
      throw new BadRequestException('Nome de arquivo inválido');
    }

    const deleted = this.documentExtractionService.deleteFile(filename);

    if (!deleted) {
      throw new BadRequestException('Arquivo não encontrado');
    }

    return {
      message: 'Arquivo removido com sucesso',
      filename,
    };
  }

  /**
   * Get document tree structure and status.
   *
   * Returns the hierarchical tree structure generated by PageIndex for the uploaded document.
   *
   * @see Issue #1543 - feat(document-extraction): Gerar tree structure com PageIndex em uploads
   */
  @Get('tree/:treeId')
  @ApiOperation({
    summary: 'Get document tree structure',
    description:
      'Get the hierarchical tree structure and metadata for a document processed by PageIndex',
  })
  @ApiResponse({
    status: 200,
    description: 'Document tree retrieved',
    type: DocumentTreeResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Document tree not found',
  })
  async getDocumentTree(
    @Param('treeId') treeId: string,
  ): Promise<DocumentTreeResponseDto> {
    const result = await this.pageIndexService.getTree(treeId);

    if (!result) {
      throw new NotFoundException(`Document tree not found: ${treeId}`);
    }

    return {
      treeId: result.treeId,
      documentName: result.documentName,
      status: result.status,
      nodeCount: result.nodeCount,
      maxDepth: result.maxDepth,
      indexedAt: result.indexedAt ?? null,
      error: result.error ?? null,
      tree: result.tree,
    };
  }

  /**
   * Get document tree processing status.
   *
   * Returns only the processing status without the full tree structure (lighter response).
   */
  @Get('tree/:treeId/status')
  @ApiOperation({
    summary: 'Get document tree processing status',
    description:
      'Get the processing status of a document tree without the full structure (lighter response)',
  })
  @ApiResponse({
    status: 200,
    description: 'Tree status retrieved',
  })
  @ApiResponse({
    status: 404,
    description: 'Document tree not found',
  })
  async getTreeStatus(@Param('treeId') treeId: string): Promise<{
    treeId: string;
    status: string;
    nodeCount: number;
    maxDepth: number;
    indexedAt: Date | null;
    error: string | null;
  }> {
    const result = await this.pageIndexService.getTree(treeId);

    if (!result) {
      throw new NotFoundException(`Document tree not found: ${treeId}`);
    }

    return {
      treeId: result.treeId,
      status: result.status,
      nodeCount: result.nodeCount,
      maxDepth: result.maxDepth,
      indexedAt: result.indexedAt ?? null,
      error: result.error ?? null,
    };
  }

  /**
   * Get upload statistics
   */
  @Get('stats')
  @ApiOperation({
    summary: 'Get upload statistics',
    description: 'Get statistics about uploaded files (count and total size)',
  })
  @ApiResponse({
    status: 200,
    description: 'Upload statistics',
    type: UploadStatsDto,
  })
  getStats(): UploadStatsDto {
    const stats = this.documentExtractionService.getUploadStats();
    return {
      ...stats,
      totalSizeMB: (stats.totalSizeBytes / 1024 / 1024).toFixed(2),
    };
  }
}
