import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { DocumentExtractionController } from './document-extraction.controller';
import { DocumentExtractionService } from './document-extraction.service';

describe('DocumentExtractionController', () => {
 let controller: DocumentExtractionController;
 let service: DocumentExtractionService;

 const mockService = {
 deleteFile: jest.fn(),
 getUploadStats: jest.fn(),
 fileExists: jest.fn(),
 getFilePath: jest.fn(),
 };

 beforeEach(async () => {
 jest.clearAllMocks();

 const module: TestingModule = await Test.createTestingModule({
 controllers: [DocumentExtractionController],
 providers: [
 {
 provide: DocumentExtractionService,
 useValue: mockService,
 },
 ],
 }).compile();

 controller = module.get<DocumentExtractionController>(
 DocumentExtractionController,
 );
 service = module.get<DocumentExtractionService>(DocumentExtractionService);
 });

 it('should be defined', () => {
 expect(controller).toBeDefined();
 });

 describe('uploadDocument', () => {
 it('should return upload response for valid file', () => {
 const mockFile = {
 filename: 'uuid-123.pdf',
 originalname: 'my-document.pdf',
 mimetype: 'application/pdf',
 size: 1024,
 } as Express.Multer.File;

 const result = controller.uploadDocument(mockFile);

 expect(result).toEqual({
 filename: 'uuid-123.pdf',
 originalName: 'my-document.pdf',
 mimeType: 'application/pdf',
 size: 1024,
 message: expect.stringContaining('sucesso'),
 });
 });

 it('should throw BadRequestException if no file provided', () => {
 expect(() => controller.uploadDocument(undefined as any)).toThrow(
 BadRequestException,
 );
 expect(() => controller.uploadDocument(null as any)).toThrow(
 BadRequestException,
 );
 });

 it('should include cleanup warning in response message', () => {
 const mockFile = {
 filename: 'uuid-123.pdf',
 originalname: 'document.pdf',
 mimetype: 'application/pdf',
 size: 1024,
 } as Express.Multer.File;

 const result = controller.uploadDocument(mockFile);

 expect(result.message).toContain('1 hora');
 });
 });

 describe('deleteDocument', () => {
 it('should delete file and return success message', () => {
 mockService.deleteFile.mockReturnValue(true);

 const result = controller.deleteDocument('uuid-123.pdf');

 expect(result).toEqual({
 message: 'Arquivo removido com sucesso',
 filename: 'uuid-123.pdf',
 });
 expect(mockService.deleteFile).toHaveBeenCalledWith('uuid-123.pdf');
 });

 it('should throw BadRequestException if file not found', () => {
 mockService.deleteFile.mockReturnValue(false);

 expect(() => controller.deleteDocument('nonexistent.pdf')).toThrow(
 BadRequestException,
 );
 });

 it('should throw BadRequestException for path traversal attempts', () => {
 expect(() => controller.deleteDocument('../etc/passwd')).toThrow(
 BadRequestException,
 );
 expect(() => controller.deleteDocument('..\\windows\\system32')).toThrow(
 BadRequestException,
 );
 expect(() => controller.deleteDocument('../../secret.txt')).toThrow(
 BadRequestException,
 );
 });

 it('should throw BadRequestException for absolute paths', () => {
 expect(() => controller.deleteDocument('/etc/passwd')).toThrow(
 BadRequestException,
 );
 expect(() => controller.deleteDocument('C:\\Windows\\System32')).toThrow(
 BadRequestException,
 );
 });
 });

 describe('getStats', () => {
 it('should return upload statistics', () => {
 mockService.getUploadStats.mockReturnValue({
 fileCount: 5,
 totalSizeBytes: 5242880, // 5MB
 });

 const result = controller.getStats();

 expect(result).toEqual({
 fileCount: 5,
 totalSizeBytes: 5242880,
 totalSizeMB: '5.00',
 });
 });

 it('should return zero stats when no files', () => {
 mockService.getUploadStats.mockReturnValue({
 fileCount: 0,
 totalSizeBytes: 0,
 });

 const result = controller.getStats();

 expect(result).toEqual({
 fileCount: 0,
 totalSizeBytes: 0,
 totalSizeMB: '0.00',
 });
 });

 it('should format MB with 2 decimal places', () => {
 mockService.getUploadStats.mockReturnValue({
 fileCount: 1,
 totalSizeBytes: 1536000, // ~1.46MB
 });

 const result = controller.getStats();

 expect(result.totalSizeMB).toBe('1.46');
 });
 });
});
