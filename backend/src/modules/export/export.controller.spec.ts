import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { Response } from 'express';
import { ExportController } from './export.controller';
import { ExportService } from './export.service';

describe('ExportController', () => {
 let controller: ExportController;
 let exportService: ExportService;

 const mockExportService = {
 exportToPDF: jest.fn(),
 exportToJSON: jest.fn(),
 exportToXML: jest.fn(),
 exportToDocx: jest.fn(),
 };

 const mockResponse = () => {
 const res: Partial<Response> = {
 set: jest.fn().mockReturnThis(),
 send: jest.fn().mockReturnThis(),
 json: jest.fn().mockReturnThis(),
 };
 return res as Response;
 };

 beforeEach(async () => {
 const module: TestingModule = await Test.createTestingModule({
 controllers: [ExportController],
 providers: [
 {
 provide: ExportService,
 useValue: mockExportService,
 },
 ],
 }).compile();

 controller = module.get<ExportController>(ExportController);
 exportService = module.get<ExportService>(ExportService);
 });

 afterEach(() => {
 jest.clearAllMocks();
 });

 it('should be defined', () => {
 expect(controller).toBeDefined();
 });

 describe('exportPDF', () => {
 it('should export ETP to PDF successfully', async () => {
 const etpId = 'test-etp-id';
 const mockPDFBuffer = Buffer.from('mock-pdf-data');
 const res = mockResponse();

 mockExportService.exportToPDF.mockResolvedValue(mockPDFBuffer);

 await controller.exportPDF(etpId, res);

 expect(exportService.exportToPDF).toHaveBeenCalledWith(etpId);
 expect(res.set).toHaveBeenCalledWith({
 'Content-Type': 'application/pdf',
 'Content-Disposition': `attachment; filename="ETP-${etpId}.pdf"`,
 'Content-Length': mockPDFBuffer.length,
 });
 expect(res.send).toHaveBeenCalledWith(mockPDFBuffer);
 });

 it('should throw NotFoundException when ETP not found', async () => {
 const etpId = 'non-existent-id';
 const res = mockResponse();

 mockExportService.exportToPDF.mockRejectedValue(
 new NotFoundException(`ETP ${etpId} não encontrado`),
 );

 await expect(controller.exportPDF(etpId, res)).rejects.toThrow(
 NotFoundException,
 );
 expect(exportService.exportToPDF).toHaveBeenCalledWith(etpId);
 });
 });

 describe('exportJSON', () => {
 it('should export ETP to JSON successfully', async () => {
 const etpId = 'test-etp-id';
 const mockJSONData = {
 etp: {
 id: etpId,
 title: 'Test ETP',
 },
 sections: [],
 exportedAt: new Date().toISOString(),
 disclaimer: 'O ETP Express pode cometer erros.',
 };
 const res = mockResponse();

 mockExportService.exportToJSON.mockResolvedValue(mockJSONData);

 await controller.exportJSON(etpId, res);

 expect(exportService.exportToJSON).toHaveBeenCalledWith(etpId);
 expect(res.set).toHaveBeenCalledWith({
 'Content-Type': 'application/json',
 'Content-Disposition': `attachment; filename="ETP-${etpId}.json"`,
 });
 expect(res.json).toHaveBeenCalledWith(mockJSONData);
 });

 it('should throw NotFoundException when ETP not found', async () => {
 const etpId = 'non-existent-id';
 const res = mockResponse();

 mockExportService.exportToJSON.mockRejectedValue(
 new NotFoundException(`ETP ${etpId} não encontrado`),
 );

 await expect(controller.exportJSON(etpId, res)).rejects.toThrow(
 NotFoundException,
 );
 expect(exportService.exportToJSON).toHaveBeenCalledWith(etpId);
 });
 });

 describe('exportXML', () => {
 it('should export ETP to XML successfully', async () => {
 const etpId = 'test-etp-id';
 const mockXMLData = '<?xml version="1.0" encoding="UTF-8"?><etp></etp>';
 const res = mockResponse();

 mockExportService.exportToXML.mockResolvedValue(mockXMLData);

 await controller.exportXML(etpId, res);

 expect(exportService.exportToXML).toHaveBeenCalledWith(etpId);
 expect(res.set).toHaveBeenCalledWith({
 'Content-Type': 'application/xml',
 'Content-Disposition': `attachment; filename="ETP-${etpId}.xml"`,
 });
 expect(res.send).toHaveBeenCalledWith(mockXMLData);
 });

 it('should throw NotFoundException when ETP not found', async () => {
 const etpId = 'non-existent-id';
 const res = mockResponse();

 mockExportService.exportToXML.mockRejectedValue(
 new NotFoundException(`ETP ${etpId} não encontrado`),
 );

 await expect(controller.exportXML(etpId, res)).rejects.toThrow(
 NotFoundException,
 );
 expect(exportService.exportToXML).toHaveBeenCalledWith(etpId);
 });
 });

 describe('exportDOCX', () => {
 it('should export ETP to DOCX successfully', async () => {
 const etpId = 'test-etp-id';
 const mockDOCXBuffer = Buffer.from('mock-docx-data');
 const res = mockResponse();

 mockExportService.exportToDocx.mockResolvedValue(mockDOCXBuffer);

 await controller.exportDOCX(etpId, res);

 expect(exportService.exportToDocx).toHaveBeenCalledWith(etpId);
 expect(res.set).toHaveBeenCalledWith({
 'Content-Type':
 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
 'Content-Disposition': `attachment; filename="ETP-${etpId}.docx"`,
 'Content-Length': mockDOCXBuffer.length,
 });
 expect(res.send).toHaveBeenCalledWith(mockDOCXBuffer);
 });

 it('should throw NotFoundException when ETP not found', async () => {
 const etpId = 'non-existent-id';
 const res = mockResponse();

 mockExportService.exportToDocx.mockRejectedValue(
 new NotFoundException(`ETP ${etpId} não encontrado`),
 );

 await expect(controller.exportDOCX(etpId, res)).rejects.toThrow(
 NotFoundException,
 );
 expect(exportService.exportToDocx).toHaveBeenCalledWith(etpId);
 });
 });

 describe('exportETP', () => {
 it('should export ETP to PDF by default', async () => {
 const etpId = 'test-etp-id';
 const mockPDFBuffer = Buffer.from('mock-pdf');
 const res = mockResponse();

 mockExportService.exportToPDF.mockResolvedValue(mockPDFBuffer);

 // Test default case (PDF)
 await controller.exportETP(etpId, 'pdf' as any, res);

 expect(exportService.exportToPDF).toHaveBeenCalledWith(etpId);
 });

 it('should export ETP to JSON when format=json', async () => {
 const etpId = 'test-etp-id';
 const mockJSONData = { etp: {}, sections: [] };
 const res = mockResponse();

 mockExportService.exportToJSON.mockResolvedValue(mockJSONData);

 await controller.exportETP(etpId, 'json' as any, res);

 expect(exportService.exportToJSON).toHaveBeenCalledWith(etpId);
 });

 it('should export ETP to XML when format=xml', async () => {
 const etpId = 'test-etp-id';
 const mockXMLData = '<etp></etp>';
 const res = mockResponse();

 mockExportService.exportToXML.mockResolvedValue(mockXMLData);

 await controller.exportETP(etpId, 'xml' as any, res);

 expect(exportService.exportToXML).toHaveBeenCalledWith(etpId);
 });

 it('should export ETP to DOCX when format=docx', async () => {
 const etpId = 'test-etp-id';
 const mockDOCXBuffer = Buffer.from('mock-docx');
 const res = mockResponse();

 mockExportService.exportToDocx.mockResolvedValue(mockDOCXBuffer);

 await controller.exportETP(etpId, 'docx' as any, res);

 expect(exportService.exportToDocx).toHaveBeenCalledWith(etpId);
 });
 });
});
