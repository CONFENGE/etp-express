import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { DocumentExtractionController } from './document-extraction.controller';
import { DocumentExtractionService } from './document-extraction.service';
import { multerConfig } from './multer.config';

/**
 * Module for document upload and extraction.
 *
 * Features:
 * - File upload via Multer (10MB max, PDF/DOCX only)
 * - Automatic cleanup of files older than 1 hour
 * - Upload statistics
 *
 * This module provides the infrastructure for the Import & Analysis feature (M9).
 * Text extraction from PDF/DOCX will be implemented in separate issues (#554, #555).
 */
@Module({
 imports: [MulterModule.register(multerConfig)],
 controllers: [DocumentExtractionController],
 providers: [DocumentExtractionService],
 exports: [DocumentExtractionService],
})
export class DocumentExtractionModule {}
