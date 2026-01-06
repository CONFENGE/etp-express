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

describe('ExportController', () => {
  let controller: ExportController;
  let exportService: ExportService;

  const mockExportService = {
    exportToPDF: jest.fn(),
    exportToJSON: jest.fn(),
    exportToXML: jest.fn(),
    exportToDocx: jest.fn(),
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
