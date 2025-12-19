import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { AnalysisController } from './analysis.controller';
import { ETPAnalysisService } from './analysis.service';
import { DocumentExtractionService } from '../document-extraction/document-extraction.service';
import { Response } from 'express';
import { AnalysisResult } from './interfaces/analysis-result.interface';
import { ImprovementReport } from './interfaces/improvement-report.interface';
import { ExtractedDocument } from '../document-extraction/interfaces';

describe('AnalysisController', () => {
 let controller: AnalysisController;
 let analysisService: jest.Mocked<ETPAnalysisService>;
 let extractionService: jest.Mocked<DocumentExtractionService>;

 const mockExtractedDocument: ExtractedDocument = {
 fullText: 'Test document content for analysis',
 sections: [
 { title: 'Justificativa', content: 'Test justification', level: 1 },
 { title: 'Requisitos', content: 'Test requirements', level: 2 },
 ],
 metadata: {
 wordCount: 500,
 pageCount: 1,
 sectionCount: 2,
 characterCount: 2500,
 },
 };

 const mockAnalysisResult: AnalysisResult = {
 summary: {
 overallScore: 78,
 meetsMinimumQuality: true,
 dimensions: [
 {
 dimension: 'legal',
 score: 75,
 passed: true,
 issueCount: 1,
 suggestionCount: 2,
 },
 {
 dimension: 'clareza',
 score: 82,
 passed: true,
 issueCount: 0,
 suggestionCount: 1,
 },
 {
 dimension: 'fundamentacao',
 score: 70,
 passed: true,
 issueCount: 2,
 suggestionCount: 3,
 },
 ],
 totalIssues: 3,
 totalSuggestions: 6,
 },
 legal: {
 isCompliant: true,
 score: 75,
 issues: ['Missing reference'],
 recommendations: ['Add legal reference'],
 references: ['Lei 14.133/2021'],
 },
 clareza: {
 score: 82,
 readabilityIndex: 65,
 issues: [],
 suggestions: ['Consider simplifying'],
 metrics: {
 avgWordLength: 5.2,
 avgSentenceLength: 18,
 complexWords: 15,
 passiveVoice: 3,
 },
 },
 fundamentacao: {
 score: 70,
 hasNecessidade: true,
 hasInteressePublico: false,
 hasBeneficios: true,
 hasRiscos: false,
 suggestions: ['Add public interest', 'Add risks'],
 },
 analyzedAt: new Date(),
 documentInfo: {
 wordCount: 500,
 sectionCount: 2,
 },
 };

 const mockReport: ImprovementReport = {
 generatedAt: new Date(),
 documentInfo: { wordCount: 500, sectionCount: 2 },
 executiveSummary: {
 overallScore: 78,
 meetsMinimumQuality: true,
 totalIssues: 3,
 criticalCount: 0,
 importantCount: 2,
 suggestionCount: 4,
 verdict: 'Aprovado com ressalvas',
 },
 dimensions: [],
 prioritizedRecommendations: [],
 };

 const mockFile: Express.Multer.File = {
 fieldname: 'file',
 originalname: 'test-etp.pdf',
 encoding: '7bit',
 mimetype: 'application/pdf',
 size: 1024,
 destination: '/tmp/uploads',
 filename: 'abc123.pdf',
 path: '/tmp/uploads/abc123.pdf',
 buffer: Buffer.from('test'),
 stream: null as never,
 };

 const userId = 'user-123';
 const organizationId = 'org-456';

 beforeEach(async () => {
 const mockAnalysisService = {
 analyzeDocument: jest.fn(),
 generateImprovementReport: jest.fn(),
 exportReportToPdf: jest.fn(),
 convertToEtp: jest.fn(),
 };

 const mockExtractionService = {
 extractFromPdfFile: jest.fn(),
 extractFromDocxFile: jest.fn(),
 deleteFile: jest.fn(),
 };

 const module: TestingModule = await Test.createTestingModule({
 controllers: [AnalysisController],
 providers: [
 { provide: ETPAnalysisService, useValue: mockAnalysisService },
 { provide: DocumentExtractionService, useValue: mockExtractionService },
 ],
 }).compile();

 controller = module.get<AnalysisController>(AnalysisController);
 analysisService = module.get(ETPAnalysisService);
 extractionService = module.get(DocumentExtractionService);
 });

 afterEach(() => {
 jest.clearAllMocks();
 });

 describe('uploadAndAnalyze', () => {
 beforeEach(() => {
 extractionService.extractFromPdfFile.mockResolvedValue(
 mockExtractedDocument,
 );
 analysisService.analyzeDocument.mockResolvedValue(mockAnalysisResult);
 analysisService.generateImprovementReport.mockReturnValue(mockReport);
 });

 it('should upload and analyze a PDF document', async () => {
 const result = await controller.uploadAndAnalyze(
 mockFile,
 userId,
 organizationId,
 );

 expect(extractionService.extractFromPdfFile).toHaveBeenCalledWith(
 mockFile.filename,
 );
 expect(analysisService.analyzeDocument).toHaveBeenCalledWith(
 mockExtractedDocument,
 );
 expect(analysisService.generateImprovementReport).toHaveBeenCalledWith(
 mockAnalysisResult,
 );

 expect(result.data.analysisId).toBeDefined();
 expect(result.data.overallScore).toBe(78);
 expect(result.data.verdict).toBe('Aprovado com ressalvas');
 expect(result.data.originalFilename).toBe('test-etp.pdf');
 expect(result.disclaimer).toBeDefined();
 });

 it('should upload and analyze a DOCX document', async () => {
 const docxFile = {
 ...mockFile,
 originalname: 'test-etp.docx',
 mimetype:
 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
 filename: 'abc123.docx',
 };

 extractionService.extractFromDocxFile.mockResolvedValue(
 mockExtractedDocument,
 );

 const result = await controller.uploadAndAnalyze(
 docxFile,
 userId,
 organizationId,
 );

 expect(extractionService.extractFromDocxFile).toHaveBeenCalledWith(
 docxFile.filename,
 );
 expect(result.data.originalFilename).toBe('test-etp.docx');
 });

 it('should throw BadRequestException when no file is uploaded', async () => {
 await expect(
 controller.uploadAndAnalyze(
 undefined as unknown as Express.Multer.File,
 userId,
 organizationId,
 ),
 ).rejects.toThrow(BadRequestException);
 });

 it('should return correct issue summary', async () => {
 const result = await controller.uploadAndAnalyze(
 mockFile,
 userId,
 organizationId,
 );

 expect(result.data.issueSummary).toEqual({
 critical: 0,
 important: 2,
 suggestion: 4,
 });
 });

 it('should return dimension scores', async () => {
 const result = await controller.uploadAndAnalyze(
 mockFile,
 userId,
 organizationId,
 );

 expect(result.data.dimensions).toHaveLength(3);
 expect(result.data.dimensions[0]).toEqual({
 dimension: 'legal',
 score: 75,
 passed: true,
 });
 });

 it('should cleanup file on extraction error', async () => {
 extractionService.extractFromPdfFile.mockRejectedValue(
 new Error('Extraction failed'),
 );

 await expect(
 controller.uploadAndAnalyze(mockFile, userId, organizationId),
 ).rejects.toThrow(BadRequestException);

 expect(extractionService.deleteFile).toHaveBeenCalledWith(
 mockFile.filename,
 );
 });
 });

 describe('downloadReportPdf', () => {
 let mockResponse: Partial<Response>;

 beforeEach(async () => {
 // First create an analysis to download
 extractionService.extractFromPdfFile.mockResolvedValue(
 mockExtractedDocument,
 );
 analysisService.analyzeDocument.mockResolvedValue(mockAnalysisResult);
 analysisService.generateImprovementReport.mockReturnValue(mockReport);

 mockResponse = {
 setHeader: jest.fn(),
 send: jest.fn(),
 };
 });

 it('should download PDF report for existing analysis', async () => {
 // Create analysis first
 const uploadResult = await controller.uploadAndAnalyze(
 mockFile,
 userId,
 organizationId,
 );

 const pdfBuffer = Buffer.from('PDF content');
 analysisService.exportReportToPdf.mockResolvedValue(pdfBuffer);

 await controller.downloadReportPdf(
 uploadResult.data.analysisId,
 userId,
 organizationId,
 mockResponse as Response,
 );

 expect(analysisService.exportReportToPdf).toHaveBeenCalledWith(
 mockReport,
 );
 expect(mockResponse.setHeader).toHaveBeenCalledWith(
 'Content-Type',
 'application/pdf',
 );
 expect(mockResponse.send).toHaveBeenCalledWith(pdfBuffer);
 });

 it('should throw NotFoundException for non-existent analysis', async () => {
 await expect(
 controller.downloadReportPdf(
 'non-existent-id',
 userId,
 organizationId,
 mockResponse as Response,
 ),
 ).rejects.toThrow(NotFoundException);
 });

 it('should throw error for unauthorized access', async () => {
 // Create analysis with different user
 const uploadResult = await controller.uploadAndAnalyze(
 mockFile,
 userId,
 organizationId,
 );

 await expect(
 controller.downloadReportPdf(
 uploadResult.data.analysisId,
 'other-user',
 'other-org',
 mockResponse as Response,
 ),
 ).rejects.toThrow(BadRequestException);
 });
 });

 describe('convertToEtp', () => {
 const mockConversionResult = {
 etp: {
 id: 'etp-789',
 title: 'Converted ETP',
 status: 'draft',
 },
 sections: [{ id: 'sec-1' }, { id: 'sec-2' }],
 mappedSectionsCount: 2,
 customSectionsCount: 0,
 convertedAt: new Date(),
 };

 beforeEach(async () => {
 extractionService.extractFromPdfFile.mockResolvedValue(
 mockExtractedDocument,
 );
 analysisService.analyzeDocument.mockResolvedValue(mockAnalysisResult);
 analysisService.generateImprovementReport.mockReturnValue(mockReport);
 analysisService.convertToEtp.mockResolvedValue(
 mockConversionResult as never,
 );
 });

 it('should convert analyzed document to ETP', async () => {
 // Create analysis first
 const uploadResult = await controller.uploadAndAnalyze(
 mockFile,
 userId,
 organizationId,
 );

 const result = await controller.convertToEtp(
 uploadResult.data.analysisId,
 {},
 userId,
 organizationId,
 );

 expect(analysisService.convertToEtp).toHaveBeenCalledWith(
 mockExtractedDocument,
 userId,
 organizationId,
 );

 expect(result.data.etpId).toBe('etp-789');
 expect(result.data.sectionsCount).toBe(2);
 expect(result.data.message).toContain('sucesso');
 });

 it('should throw NotFoundException for non-existent analysis', async () => {
 await expect(
 controller.convertToEtp('non-existent-id', {}, userId, organizationId),
 ).rejects.toThrow(NotFoundException);
 });

 it('should cleanup analysis after successful conversion', async () => {
 // Create analysis first
 const uploadResult = await controller.uploadAndAnalyze(
 mockFile,
 userId,
 organizationId,
 );

 await controller.convertToEtp(
 uploadResult.data.analysisId,
 {},
 userId,
 organizationId,
 );

 // Trying to access the same analysis again should throw
 await expect(
 controller.convertToEtp(
 uploadResult.data.analysisId,
 {},
 userId,
 organizationId,
 ),
 ).rejects.toThrow(NotFoundException);
 });
 });

 describe('getAnalysisDetails', () => {
 beforeEach(async () => {
 extractionService.extractFromPdfFile.mockResolvedValue(
 mockExtractedDocument,
 );
 analysisService.analyzeDocument.mockResolvedValue(mockAnalysisResult);
 analysisService.generateImprovementReport.mockReturnValue(mockReport);
 });

 it('should return analysis details', async () => {
 // Create analysis first
 const uploadResult = await controller.uploadAndAnalyze(
 mockFile,
 userId,
 organizationId,
 );

 const result = await controller.getAnalysisDetails(
 uploadResult.data.analysisId,
 userId,
 organizationId,
 );

 expect(result.data.analysisId).toBe(uploadResult.data.analysisId);
 expect(result.data.result).toEqual(mockAnalysisResult);
 expect(result.data.report).toEqual(mockReport);
 });

 it('should throw NotFoundException for non-existent analysis', async () => {
 await expect(
 controller.getAnalysisDetails(
 'non-existent-id',
 userId,
 organizationId,
 ),
 ).rejects.toThrow(NotFoundException);
 });
 });
});
