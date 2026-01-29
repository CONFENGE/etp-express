import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { Response } from 'express';
import { Reflector } from '@nestjs/core';
import { ExportController } from './export.controller';
import { ExportService } from './export.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { ResourceOwnershipGuard } from '../../common/guards/resource-ownership.guard';
import {
  OWNERSHIP_KEY,
  ResourceType,
} from '../../common/decorators/require-ownership.decorator';
import { S3Service } from '../storage/s3.service';

describe('ExportController', () => {
  let controller: ExportController;
  let exportService: ExportService;

  const mockExportService = {
    exportToPDF: jest.fn(),
    exportToJSON: jest.fn(),
    exportToXML: jest.fn(),
    exportToDocx: jest.fn(),
    getExportMetadata: jest.fn(),
    trackExportAccess: jest.fn(),
  };

  const mockS3Service = {
    getSignedUrl: jest.fn(),
  };

  const mockJwtAuthGuard = {
    canActivate: jest.fn(() => true),
  };

  // Mock ResourceOwnershipGuard - validation is tested in resource-ownership.guard.spec.ts
  const mockResourceOwnershipGuard = {
    canActivate: jest.fn(() => true),
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
        {
          provide: S3Service,
          useValue: mockS3Service,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue(mockJwtAuthGuard)
      .overrideGuard(ResourceOwnershipGuard)
      .useValue(mockResourceOwnershipGuard)
      .compile();

    controller = module.get<ExportController>(ExportController);
    exportService = module.get<ExportService>(ExportService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('Security: @RequireOwnership decorator', () => {
    const reflector = new Reflector();

    it('should have @RequireOwnership on exportPDF method (IDOR protection)', () => {
      const metadata = reflector.get(OWNERSHIP_KEY, controller.exportPDF);
      expect(metadata).toBeDefined();
      expect(metadata.resourceType).toBe(ResourceType.ETP);
      expect(metadata.idParam).toBe('id');
    });

    it('should have @RequireOwnership on exportJSON method (IDOR protection)', () => {
      const metadata = reflector.get(OWNERSHIP_KEY, controller.exportJSON);
      expect(metadata).toBeDefined();
      expect(metadata.resourceType).toBe(ResourceType.ETP);
    });

    it('should have @RequireOwnership on exportXML method (IDOR protection)', () => {
      const metadata = reflector.get(OWNERSHIP_KEY, controller.exportXML);
      expect(metadata).toBeDefined();
      expect(metadata.resourceType).toBe(ResourceType.ETP);
    });

    it('should have @RequireOwnership on exportDOCX method (IDOR protection)', () => {
      const metadata = reflector.get(OWNERSHIP_KEY, controller.exportDOCX);
      expect(metadata).toBeDefined();
      expect(metadata.resourceType).toBe(ResourceType.ETP);
    });

    it('should have @RequireOwnership on exportETP method (IDOR protection)', () => {
      const metadata = reflector.get(OWNERSHIP_KEY, controller.exportETP);
      expect(metadata).toBeDefined();
      expect(metadata.resourceType).toBe(ResourceType.ETP);
    });

    it('should have @RequireOwnership on previewPDF method (IDOR protection)', () => {
      const metadata = reflector.get(OWNERSHIP_KEY, controller.previewPDF);
      expect(metadata).toBeDefined();
      expect(metadata.resourceType).toBe(ResourceType.ETP);
    });

    it('should validate organization only, not strict ownership (read-only export)', () => {
      // Export is a read-only operation, so we only validate organization membership,
      // not that the user created the ETP (validateOwnership: false)
      const metadata = reflector.get(OWNERSHIP_KEY, controller.exportPDF);
      expect(metadata.validateOwnership).toBe(false);
    });
  });

  describe('exportPDF', () => {
    it('should export ETP to PDF successfully', async () => {
      const etpId = 'test-etp-id';
      const mockPDFBuffer = Buffer.from('mock-pdf-data');
      const req = { user: { id: 'user-123' } };
      const res = mockResponse();

      mockExportService.exportToPDF.mockResolvedValue(mockPDFBuffer);

      await controller.exportPDF(etpId, req, res);

      expect(exportService.exportToPDF).toHaveBeenCalledWith(etpId, 'user-123');
      expect(res.set).toHaveBeenCalledWith({
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="ETP-${etpId}.pdf"`,
        'Content-Length': mockPDFBuffer.length,
      });
      expect(res.send).toHaveBeenCalledWith(mockPDFBuffer);
    });

    it('should throw NotFoundException when ETP not found', async () => {
      const etpId = 'non-existent-id';
      const req = { user: { id: 'user-123' } };
      const res = mockResponse();

      mockExportService.exportToPDF.mockRejectedValue(
        new NotFoundException(`ETP ${etpId} não encontrado`),
      );

      await expect(controller.exportPDF(etpId, req, res)).rejects.toThrow(
        NotFoundException,
      );
      expect(exportService.exportToPDF).toHaveBeenCalledWith(etpId, 'user-123');
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
      const req = { user: { id: 'user-123' } };
      const res = mockResponse();

      mockExportService.exportToDocx.mockResolvedValue(mockDOCXBuffer);

      await controller.exportDOCX(etpId, req, res);

      expect(exportService.exportToDocx).toHaveBeenCalledWith(
        etpId,
        'user-123',
      );
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
      const req = { user: { id: 'user-123' } };
      const res = mockResponse();

      mockExportService.exportToDocx.mockRejectedValue(
        new NotFoundException(`ETP ${etpId} não encontrado`),
      );

      await expect(controller.exportDOCX(etpId, req, res)).rejects.toThrow(
        NotFoundException,
      );
      expect(exportService.exportToDocx).toHaveBeenCalledWith(
        etpId,
        'user-123',
      );
    });
  });

  describe('previewPDF', () => {
    it('should return PDF for inline preview with cache headers', async () => {
      const etpId = 'test-etp-id';
      const mockPDFBuffer = Buffer.from('mock-pdf-data');
      const res = mockResponse();

      mockExportService.exportToPDF.mockResolvedValue(mockPDFBuffer);

      await controller.previewPDF(etpId, res);

      expect(exportService.exportToPDF).toHaveBeenCalledWith(etpId);
      expect(res.set).toHaveBeenCalledWith({
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="ETP-${etpId}-preview.pdf"`,
        'Content-Length': mockPDFBuffer.length,
        'Cache-Control': 'private, max-age=300',
      });
      expect(res.send).toHaveBeenCalledWith(mockPDFBuffer);
    });

    it('should throw NotFoundException when ETP not found', async () => {
      const etpId = 'non-existent-id';
      const res = mockResponse();

      mockExportService.exportToPDF.mockRejectedValue(
        new NotFoundException(`ETP ${etpId} não encontrado`),
      );

      await expect(controller.previewPDF(etpId, res)).rejects.toThrow(
        NotFoundException,
      );
      expect(exportService.exportToPDF).toHaveBeenCalledWith(etpId);
    });
  });

  describe('exportETP', () => {
    it('should export ETP to PDF by default', async () => {
      const etpId = 'test-etp-id';
      const mockPDFBuffer = Buffer.from('mock-pdf');
      const req = { user: { id: 'user-123' } };
      const res = mockResponse();

      mockExportService.exportToPDF.mockResolvedValue(mockPDFBuffer);

      // Test default case (PDF)
      await controller.exportETP(etpId, 'pdf' as any, req, res);

      expect(exportService.exportToPDF).toHaveBeenCalledWith(etpId, 'user-123');
    });

    it('should export ETP to JSON when format=json', async () => {
      const etpId = 'test-etp-id';
      const mockJSONData = { etp: {}, sections: [] };
      const req = { user: { id: 'user-123' } };
      const res = mockResponse();

      mockExportService.exportToJSON.mockResolvedValue(mockJSONData);

      await controller.exportETP(etpId, 'json' as any, req, res);

      expect(exportService.exportToJSON).toHaveBeenCalledWith(etpId);
    });

    it('should export ETP to XML when format=xml', async () => {
      const etpId = 'test-etp-id';
      const mockXMLData = '<etp></etp>';
      const req = { user: { id: 'user-123' } };
      const res = mockResponse();

      mockExportService.exportToXML.mockResolvedValue(mockXMLData);

      await controller.exportETP(etpId, 'xml' as any, req, res);

      expect(exportService.exportToXML).toHaveBeenCalledWith(etpId);
    });

    it('should export ETP to DOCX when format=docx', async () => {
      const etpId = 'test-etp-id';
      const mockDOCXBuffer = Buffer.from('mock-docx');
      const req = { user: { id: 'user-123' } };
      const res = mockResponse();

      mockExportService.exportToDocx.mockResolvedValue(mockDOCXBuffer);

      await controller.exportETP(etpId, 'docx' as any, req, res);

      expect(exportService.exportToDocx).toHaveBeenCalledWith(
        etpId,
        'user-123',
      );
    });
  });

  describe('getShareLink', () => {
    it('should return signed URL for valid export', async () => {
      const exportId = 'export-123';
      const req = { user: { organizationId: 'org-1' } };
      const mockMetadata = {
        id: exportId,
        s3Key: 'exports/org-1/etp-1/1.0/pdf/file.pdf',
        format: 'pdf',
        version: '1.0',
      };

      mockExportService.getExportMetadata.mockResolvedValue(mockMetadata);
      mockS3Service.getSignedUrl.mockResolvedValue('https://signed-url');

      const result = await controller.getShareLink(exportId, undefined, req);

      expect(result.url).toBe('https://signed-url');
      expect(result.format).toBe('pdf');
      expect(result.version).toBe('1.0');
      expect(result.expiresAt).toBeDefined();
      expect(mockS3Service.getSignedUrl).toHaveBeenCalledWith(
        mockMetadata.s3Key,
        3600,
      );
    });

    it('should respect custom expiresIn parameter', async () => {
      const req = { user: { organizationId: 'org-1' } };
      mockExportService.getExportMetadata.mockResolvedValue({
        s3Key: 'key',
        format: 'pdf',
        version: '1.0',
      });
      mockS3Service.getSignedUrl.mockResolvedValue('https://signed-url');

      await controller.getShareLink('export-123', '7200', req);

      expect(mockS3Service.getSignedUrl).toHaveBeenCalledWith('key', 7200);
    });

    it('should cap expiresIn at 7 days (604800s)', async () => {
      const req = { user: { organizationId: 'org-1' } };
      mockExportService.getExportMetadata.mockResolvedValue({
        s3Key: 'key',
        format: 'pdf',
        version: '1.0',
      });
      mockS3Service.getSignedUrl.mockResolvedValue('https://signed-url');

      await controller.getShareLink('export-123', '999999', req);

      expect(mockS3Service.getSignedUrl).toHaveBeenCalledWith('key', 604800);
    });

    it('should throw NotFoundException when export not found', async () => {
      const req = { user: { organizationId: 'org-1' } };
      mockExportService.getExportMetadata.mockResolvedValue(null);

      await expect(
        controller.getShareLink('non-existent', undefined, req),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException when no organizationId', async () => {
      const req = { user: {} };

      await expect(
        controller.getShareLink('export-123', undefined, req),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('trackAccess', () => {
    it('should track export access successfully', async () => {
      mockExportService.trackExportAccess.mockResolvedValue(undefined);

      const result = await controller.trackAccess('export-123');

      expect(result).toEqual({ success: true });
      expect(mockExportService.trackExportAccess).toHaveBeenCalledWith(
        'export-123',
      );
    });
  });
});
