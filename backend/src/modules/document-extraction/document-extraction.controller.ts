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

/**
 * DTO for upload response
 */
class UploadResponseDto {
 filename: string;
 originalName: string;
 mimeType: string;
 size: number;
 message: string;
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
 uploadDocument(@UploadedFile() file: Express.Multer.File): UploadResponseDto {
 if (!file) {
 throw new BadRequestException(
 'Nenhum arquivo enviado. Envie um arquivo PDF ou DOCX.',
 );
 }

 this.logger.log(
 `File uploaded: ${file.filename} (${file.originalname}, ${file.size} bytes, ${file.mimetype})`,
 );

 return {
 filename: file.filename,
 originalName: file.originalname,
 mimeType: file.mimetype,
 size: file.size,
 message:
 'Arquivo enviado com sucesso. O arquivo será removido automaticamente após 1 hora.',
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
