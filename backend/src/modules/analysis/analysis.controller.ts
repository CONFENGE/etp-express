import {
 Controller,
 Post,
 Get,
 Param,
 Body,
 UseInterceptors,
 UploadedFile,
 BadRequestException,
 UseGuards,
 Logger,
 Res,
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
 ApiParam,
} from '@nestjs/swagger';
import { Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import {
 multerConfig,
 MAX_FILE_SIZE,
 ALLOWED_EXTENSIONS,
} from '../document-extraction/multer.config';
import { DocumentExtractionService } from '../document-extraction/document-extraction.service';
import { ETPAnalysisService } from './analysis.service';
import {
 UploadAnalysisResponseDto,
 ConvertToEtpDto,
 ConvertToEtpResponseDto,
} from './dto';
import { AnalysisResult } from './interfaces/analysis-result.interface';
import { ImprovementReport } from './interfaces/improvement-report.interface';
import { ExtractedDocument } from '../document-extraction/interfaces';
import { DISCLAIMER } from '../../common/constants/messages';

/**
 * In-memory storage for analysis results.
 * In production, consider using Redis or database for persistence.
 */
interface StoredAnalysis {
 analysisId: string;
 filename: string;
 originalFilename: string;
 mimeType: string;
 result: AnalysisResult;
 report: ImprovementReport;
 document: ExtractedDocument;
 createdAt: Date;
 userId: string;
 organizationId: string;
}

/**
 * Controller for document analysis and conversion to ETP.
 *
 * @remarks
 * Provides endpoints to:
 * - Upload and analyze documents (PDF/DOCX)
 * - Download analysis reports as PDF
 * - Convert analyzed documents to new ETPs
 *
 * All endpoints require JWT authentication.
 * Analysis results are stored in memory with 1-hour TTL (same as uploaded files).
 */
@ApiTags('analysis')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('analysis')
export class AnalysisController {
 private readonly logger = new Logger(AnalysisController.name);

 /**
 * In-memory store for analysis results.
 * Key: analysisId (UUID)
 * Value: StoredAnalysis object
 */
 private readonly analysisStore = new Map<string, StoredAnalysis>();

 /**
 * TTL for analysis results: 1 hour (matches file cleanup)
 */
 private readonly ANALYSIS_TTL_MS = 60 * 60 * 1000;

 constructor(
 private readonly documentExtractionService: DocumentExtractionService,
 private readonly etpAnalysisService: ETPAnalysisService,
 ) {
 // Start cleanup interval
 setInterval(() => this.cleanupExpiredAnalyses(), 15 * 60 * 1000); // Every 15 min
 }

 /**
 * Upload a document and analyze it for quality.
 *
 * @remarks
 * Accepts PDF or DOCX files (max 10MB).
 * The document is extracted, analyzed by 3 quality agents (Legal, Clareza, Fundamentacao),
 * and returns an analysis summary with a unique analysisId.
 *
 * Use the analysisId to:
 * - Download the full report as PDF: GET /analysis/:id/report/pdf
 * - Convert to a new ETP: POST /analysis/:id/convert
 *
 * @param file - Uploaded document file (multipart/form-data)
 * @param userId - Current user ID from JWT
 * @param organizationId - Current organization ID from JWT
 * @returns Analysis summary with analysisId
 */
 @Post('upload')
 @UseInterceptors(FileInterceptor('file', multerConfig))
 @ApiOperation({
 summary: 'Upload e análise de documento',
 description: `Faz upload de um documento ETP (PDF ou DOCX) e executa análise de qualidade.

**Análise inclui:**
- Conformidade Legal (Lei 14.133/2021)
- Clareza e Legibilidade
- Qualidade da Fundamentação

**Limites:**
- Tamanho máximo: ${MAX_FILE_SIZE / 1024 / 1024}MB
- Formatos aceitos: ${ALLOWED_EXTENSIONS.join(', ')}

**Retorna:** analysisId para usar nos endpoints de relatório e conversão.`,
 })
 @ApiConsumes('multipart/form-data')
 @ApiBody({
 schema: {
 type: 'object',
 properties: {
 file: {
 type: 'string',
 format: 'binary',
 description: 'Documento ETP para análise (PDF ou DOCX)',
 },
 },
 required: ['file'],
 },
 })
 @ApiResponse({
 status: 201,
 description: 'Documento analisado com sucesso',
 type: UploadAnalysisResponseDto,
 })
 @ApiResponse({
 status: 400,
 description: 'Arquivo inválido ou erro na extração',
 })
 @ApiResponse({
 status: 401,
 description: 'Não autenticado',
 })
 async uploadAndAnalyze(
 @UploadedFile() file: Express.Multer.File,
 @CurrentUser('id') userId: string,
 @CurrentUser('organizationId') organizationId: string,
 ): Promise<{ data: UploadAnalysisResponseDto; disclaimer: string }> {
 if (!file) {
 throw new BadRequestException(
 'Nenhum arquivo enviado. Envie um arquivo PDF ou DOCX.',
 );
 }

 this.logger.log(
 `Starting analysis for file: ${file.originalname} (${file.size} bytes, ${file.mimetype})`,
 );

 try {
 // Extract text from document
 let extractedDocument: ExtractedDocument;
 const isPdf = file.mimetype === 'application/pdf';

 if (isPdf) {
 extractedDocument =
 await this.documentExtractionService.extractFromPdfFile(
 file.filename,
 );
 } else {
 extractedDocument =
 await this.documentExtractionService.extractFromDocxFile(
 file.filename,
 );
 }

 this.logger.log(
 `Document extracted: ${extractedDocument.metadata.wordCount} words, ${extractedDocument.metadata.sectionCount} sections`,
 );

 // Analyze document with all agents
 const analysisResult =
 await this.etpAnalysisService.analyzeDocument(extractedDocument);

 // Generate improvement report
 const report =
 this.etpAnalysisService.generateImprovementReport(analysisResult);

 // Generate unique analysis ID
 const analysisId = uuidv4();

 // Store analysis for later use
 this.analysisStore.set(analysisId, {
 analysisId,
 filename: file.filename,
 originalFilename: file.originalname,
 mimeType: file.mimetype,
 result: analysisResult,
 report,
 document: extractedDocument,
 createdAt: new Date(),
 userId,
 organizationId,
 });

 this.logger.log(
 `Analysis complete: ${analysisId}, Score: ${analysisResult.summary.overallScore}, Verdict: ${report.executiveSummary.verdict}`,
 );

 const response: UploadAnalysisResponseDto = {
 analysisId,
 originalFilename: file.originalname,
 mimeType: file.mimetype,
 overallScore: analysisResult.summary.overallScore,
 meetsMinimumQuality: analysisResult.summary.meetsMinimumQuality,
 verdict: report.executiveSummary.verdict,
 documentInfo: {
 wordCount: extractedDocument.metadata.wordCount,
 sectionCount: extractedDocument.metadata.sectionCount,
 },
 issueSummary: {
 critical: report.executiveSummary.criticalCount,
 important: report.executiveSummary.importantCount,
 suggestion: report.executiveSummary.suggestionCount,
 },
 dimensions: analysisResult.summary.dimensions.map((d) => ({
 dimension: d.dimension,
 score: d.score,
 passed: d.passed,
 })),
 message:
 'Documento analisado com sucesso. Use o analysisId para obter o relatório completo.',
 };

 return {
 data: response,
 disclaimer: DISCLAIMER,
 };
 } catch (error) {
 this.logger.error(
 `Analysis failed for ${file.originalname}:`,
 error instanceof Error ? error.stack : error,
 );

 // Clean up uploaded file on error
 try {
 this.documentExtractionService.deleteFile(file.filename);
 } catch {
 // Ignore cleanup errors
 }

 if (error instanceof BadRequestException) {
 throw error;
 }

 throw new BadRequestException(
 `Falha na análise do documento: ${error instanceof Error ? error.message : 'Erro desconhecido'}`,
 );
 }
 }

 /**
 * Download analysis report as PDF.
 *
 * @param id - Analysis ID (UUID) from upload response
 * @param userId - Current user ID from JWT
 * @param res - Express response for streaming PDF
 */
 @Get(':id/report/pdf')
 @ApiOperation({
 summary: 'Download relatório de análise em PDF',
 description: `Baixa o relatório de análise completo em formato PDF.

O relatório inclui:
- Resumo executivo com scores
- Detalhamento por dimensão (Legal, Clareza, Fundamentação)
- Recomendações priorizadas
- Veredito final`,
 })
 @ApiParam({
 name: 'id',
 description: 'ID da análise (retornado pelo upload)',
 example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
 })
 @ApiResponse({
 status: 200,
 description: 'Relatório PDF',
 content: {
 'application/pdf': {
 schema: {
 type: 'string',
 format: 'binary',
 },
 },
 },
 })
 @ApiResponse({
 status: 404,
 description: 'Análise não encontrada ou expirada',
 })
 @ApiResponse({
 status: 401,
 description: 'Não autenticado',
 })
 @ApiResponse({
 status: 403,
 description: 'Sem permissão para acessar esta análise',
 })
 async downloadReportPdf(
 @Param('id') id: string,
 @CurrentUser('id') userId: string,
 @CurrentUser('organizationId') organizationId: string,
 @Res() res: Response,
 ): Promise<void> {
 const analysis = this.getAnalysisOrThrow(id, userId, organizationId);

 this.logger.log(`Generating PDF report for analysis: ${id}`);

 try {
 const pdfBuffer = await this.etpAnalysisService.exportReportToPdf(
 analysis.report,
 );

 // Generate filename with original document name
 const baseFilename = analysis.originalFilename.replace(/\.[^.]+$/, '');
 const pdfFilename = `analise_${baseFilename}_${new Date().toISOString().split('T')[0]}.pdf`;

 res.setHeader('Content-Type', 'application/pdf');
 res.setHeader(
 'Content-Disposition',
 `attachment; filename="${pdfFilename}"`,
 );
 res.setHeader('Content-Length', pdfBuffer.length);
 res.send(pdfBuffer);

 this.logger.log(
 `PDF report sent: ${pdfFilename} (${pdfBuffer.length} bytes)`,
 );
 } catch (error) {
 this.logger.error(
 `Failed to generate PDF for analysis ${id}:`,
 error instanceof Error ? error.stack : error,
 );
 throw new BadRequestException(
 `Falha ao gerar PDF: ${error instanceof Error ? error.message : 'Erro desconhecido'}`,
 );
 }
 }

 /**
 * Convert analyzed document to a new ETP.
 *
 * @param id - Analysis ID (UUID) from upload response
 * @param body - Optional conversion parameters
 * @param userId - Current user ID from JWT
 * @param organizationId - Current organization ID from JWT
 * @returns Created ETP information
 */
 @Post(':id/convert')
 @ApiOperation({
 summary: 'Converter documento analisado para ETP',
 description: `Converte o documento analisado em um novo ETP no sistema.

O ETP é criado em status DRAFT com:
- Seções mapeadas automaticamente para tipos conhecidos
- Metadados indicando origem de importação
- Conteúdo original preservado

Após a conversão, o ETP pode ser editado normalmente no sistema.`,
 })
 @ApiParam({
 name: 'id',
 description: 'ID da análise (retornado pelo upload)',
 example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
 })
 @ApiResponse({
 status: 201,
 description: 'ETP criado com sucesso',
 type: ConvertToEtpResponseDto,
 })
 @ApiResponse({
 status: 400,
 description: 'Erro na conversão',
 })
 @ApiResponse({
 status: 404,
 description: 'Análise não encontrada ou expirada',
 })
 @ApiResponse({
 status: 401,
 description: 'Não autenticado',
 })
 @ApiResponse({
 status: 403,
 description: 'Sem permissão para acessar esta análise',
 })
 async convertToEtp(
 @Param('id') id: string,
 @Body() body: ConvertToEtpDto,
 @CurrentUser('id') userId: string,
 @CurrentUser('organizationId') organizationId: string,
 ): Promise<{ data: ConvertToEtpResponseDto; disclaimer: string }> {
 const analysis = this.getAnalysisOrThrow(id, userId, organizationId);

 this.logger.log(`Converting analysis ${id} to ETP for user ${userId}`);

 try {
 // Use custom title if provided, otherwise let the service extract it
 const document = analysis.document;

 // If custom title provided, modify the document's first section
 if (body.title) {
 // Create a shallow copy with modified title handling
 if (document.sections.length > 0 && document.sections[0].level === 1) {
 document.sections[0].title = body.title;
 }
 }

 const conversionResult = await this.etpAnalysisService.convertToEtp(
 document,
 userId,
 organizationId,
 );

 // Clean up analysis after successful conversion
 this.analysisStore.delete(id);

 // Clean up uploaded file
 try {
 this.documentExtractionService.deleteFile(analysis.filename);
 } catch {
 // Ignore cleanup errors
 }

 this.logger.log(
 `Analysis ${id} converted to ETP ${conversionResult.etp.id}`,
 );

 const response: ConvertToEtpResponseDto = {
 etpId: conversionResult.etp.id,
 title: conversionResult.etp.title,
 status: conversionResult.etp.status,
 sectionsCount: conversionResult.sections.length,
 mappedSectionsCount: conversionResult.mappedSectionsCount,
 customSectionsCount: conversionResult.customSectionsCount,
 convertedAt: conversionResult.convertedAt,
 message: 'Documento convertido para ETP com sucesso.',
 };

 return {
 data: response,
 disclaimer: DISCLAIMER,
 };
 } catch (error) {
 this.logger.error(
 `Conversion failed for analysis ${id}:`,
 error instanceof Error ? error.stack : error,
 );

 throw new BadRequestException(
 `Falha na conversão: ${error instanceof Error ? error.message : 'Erro desconhecido'}`,
 );
 }
 }

 /**
 * Get analysis details (for internal debugging/testing).
 * Returns the full analysis result without generating a PDF.
 */
 @Get(':id')
 @ApiOperation({
 summary: 'Obter detalhes da análise',
 description: 'Retorna os detalhes completos da análise (JSON).',
 })
 @ApiParam({
 name: 'id',
 description: 'ID da análise',
 example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
 })
 @ApiResponse({
 status: 200,
 description: 'Detalhes da análise',
 })
 @ApiResponse({
 status: 404,
 description: 'Análise não encontrada ou expirada',
 })
 async getAnalysisDetails(
 @Param('id') id: string,
 @CurrentUser('id') userId: string,
 @CurrentUser('organizationId') organizationId: string,
 ): Promise<{
 data: {
 analysisId: string;
 originalFilename: string;
 createdAt: Date;
 result: AnalysisResult;
 report: ImprovementReport;
 };
 disclaimer: string;
 }> {
 const analysis = this.getAnalysisOrThrow(id, userId, organizationId);

 return {
 data: {
 analysisId: analysis.analysisId,
 originalFilename: analysis.originalFilename,
 createdAt: analysis.createdAt,
 result: analysis.result,
 report: analysis.report,
 },
 disclaimer: DISCLAIMER,
 };
 }

 /**
 * Retrieves an analysis by ID with authorization check.
 *
 * @param id - Analysis ID
 * @param userId - Current user ID
 * @param organizationId - Current organization ID
 * @returns StoredAnalysis
 * @throws NotFoundException if not found
 * @throws BadRequestException if not authorized
 */
 private getAnalysisOrThrow(
 id: string,
 userId: string,
 organizationId: string,
 ): StoredAnalysis {
 const analysis = this.analysisStore.get(id);

 if (!analysis) {
 throw new NotFoundException(
 `Análise não encontrada ou expirada: ${id}. Faça um novo upload do documento.`,
 );
 }

 // Check authorization - must be same user or same organization
 if (
 analysis.userId !== userId &&
 analysis.organizationId !== organizationId
 ) {
 throw new BadRequestException('Sem permissão para acessar esta análise.');
 }

 return analysis;
 }

 /**
 * Cleanup expired analyses from memory.
 * Runs every 15 minutes via setInterval.
 */
 private cleanupExpiredAnalyses(): void {
 const now = Date.now();
 let cleanedCount = 0;

 for (const [id, analysis] of this.analysisStore.entries()) {
 const age = now - analysis.createdAt.getTime();

 if (age > this.ANALYSIS_TTL_MS) {
 this.analysisStore.delete(id);
 cleanedCount++;

 // Also clean up the associated file
 try {
 this.documentExtractionService.deleteFile(analysis.filename);
 } catch {
 // Ignore cleanup errors
 }
 }
 }

 if (cleanedCount > 0) {
 this.logger.log(
 `Cleaned up ${cleanedCount} expired analyses. Remaining: ${this.analysisStore.size}`,
 );
 }
 }
}
