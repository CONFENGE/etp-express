import { Module, forwardRef } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { DocumentExtractionController } from './document-extraction.controller';
import { DocumentExtractionService } from './document-extraction.service';
import { multerConfig } from './multer.config';
import { PageIndexModule } from '../pageindex/pageindex.module';

/**
 * Module for document upload and extraction.
 *
 * Features:
 * - File upload via Multer (10MB max, PDF/DOCX only)
 * - Automatic cleanup of files older than 1 hour
 * - Upload statistics
 * - PageIndex integration for hierarchical document indexing (#1543)
 *
 * This module provides the infrastructure for the Import & Analysis feature (M9).
 * Text extraction from PDF/DOCX will be implemented in separate issues (#554, #555).
 *
 * PageIndex integration (#1543):
 * - Automatically generates tree structure on PDF/DOCX upload
 * - Asynchronous processing to avoid blocking upload
 * - Tree structure persisted to DocumentTree entity
 *
 * @see Issue #1543 - feat(document-extraction): Gerar tree structure com PageIndex em uploads
 */
@Module({
  imports: [
    MulterModule.register(multerConfig),
    forwardRef(() => PageIndexModule),
  ],
  controllers: [DocumentExtractionController],
  providers: [DocumentExtractionService],
  exports: [DocumentExtractionService],
})
export class DocumentExtractionModule {}
