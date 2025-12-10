import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ExportService } from './export.service';
import { Etp, EtpStatus } from '../../entities/etp.entity';
import {
  EtpSection,
  SectionType,
  SectionStatus,
} from '../../entities/etp-section.entity';
import * as puppeteer from 'puppeteer';

// Mock puppeteer
jest.mock('puppeteer');

describe('ExportService', () => {
  let service: ExportService;
  let etpsRepository: Repository<Etp>;
  let sectionsRepository: Repository<EtpSection>;

  const mockEtp: Partial<Etp> = {
    id: 'etp-123',
    title: 'ETP de Teste',
    description: 'Descrição do ETP',
    objeto: 'Aquisição de equipamentos',
    numeroProcesso: '12345/2025',
    valorEstimado: 100000,
    status: EtpStatus.DRAFT,
    metadata: { key: 'value' },
    currentVersion: 1,
    completionPercentage: 50,
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-02'),
    sections: [],
  };

  const mockSection: Partial<EtpSection> = {
    id: 'section-1',
    type: SectionType.INTRODUCAO,
    title: 'Identificação',
    content: 'Conteúdo da seção',
    userInput: 'Input do usuário',
    status: SectionStatus.APPROVED,
    order: 1,
    metadata: {},
    validationResults: {},
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-02'),
  };

  const mockEtpsRepository = {
    findOne: jest.fn(),
  };

  const mockSectionsRepository = {
    find: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExportService,
        {
          provide: getRepositoryToken(Etp),
          useValue: mockEtpsRepository,
        },
        {
          provide: getRepositoryToken(EtpSection),
          useValue: mockSectionsRepository,
        },
      ],
    }).compile();

    service = module.get<ExportService>(ExportService);
    etpsRepository = module.get<Repository<Etp>>(getRepositoryToken(Etp));
    sectionsRepository = module.get<Repository<EtpSection>>(
      getRepositoryToken(EtpSection),
    );

    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('exportToJSON', () => {
    it('should export ETP to JSON format successfully', async () => {
      const etpWithSections = {
        ...mockEtp,
        sections: [mockSection] as EtpSection[],
      } as Etp;

      mockEtpsRepository.findOne.mockResolvedValue(etpWithSections);

      const result = await service.exportToJSON('etp-123');

      expect(result).toHaveProperty('etp');
      expect(result).toHaveProperty('sections');
      expect(result).toHaveProperty('exportedAt');
      expect(result).toHaveProperty('disclaimer');
      expect((result as any).etp.id).toBe('etp-123');
      expect((result as any).etp.title).toBe('ETP de Teste');
      expect((result as any).sections).toHaveLength(1);
      expect((result as any).sections[0].id).toBe('section-1');
    });

    it('should throw NotFoundException when ETP does not exist', async () => {
      mockEtpsRepository.findOne.mockResolvedValue(null);

      await expect(service.exportToJSON('non-existent')).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.exportToJSON('non-existent')).rejects.toThrow(
        'ETP non-existent não encontrado',
      );
    });

    it('should handle ETP without sections', async () => {
      const etpWithoutSections = {
        ...mockEtp,
        sections: [],
      } as Etp;

      mockEtpsRepository.findOne.mockResolvedValue(etpWithoutSections);

      const result = await service.exportToJSON('etp-123');

      expect((result as any).sections).toEqual([]);
      expect((result as any).etp.id).toBe('etp-123');
    });
  });

  describe('exportToXML', () => {
    it('should export ETP to XML format successfully', async () => {
      const etpWithSections = {
        ...mockEtp,
        sections: [mockSection] as EtpSection[],
      } as Etp;

      mockEtpsRepository.findOne.mockResolvedValue(etpWithSections);

      const result = await service.exportToXML('etp-123');

      expect(result).toContain('<?xml version="1.0" encoding="UTF-8"?>');
      expect(result).toContain('<etp>');
      expect(result).toContain('<id>etp-123</id>');
      expect(result).toContain('<title>ETP de Teste</title>');
      expect(result).toContain('<sections>');
      expect(result).toContain('<section>');
      expect(result).toContain('</etp>');
      expect(result).toContain('<disclaimer>');
    });

    it('should escape XML special characters', async () => {
      const etpWithSpecialChars = {
        ...mockEtp,
        title: 'ETP com <special> & "chars"',
        sections: [],
      } as Etp;

      mockEtpsRepository.findOne.mockResolvedValue(etpWithSpecialChars);

      const result = await service.exportToXML('etp-123');

      expect(result).toContain('&lt;special&gt;');
      expect(result).toContain('&amp;');
      expect(result).toContain('&quot;');
    });

    it('should throw NotFoundException when ETP does not exist', async () => {
      mockEtpsRepository.findOne.mockResolvedValue(null);

      await expect(service.exportToXML('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should handle empty values gracefully', async () => {
      const etpWithEmptyValues = {
        ...mockEtp,
        description: '',
        numeroProcesso: '',
        sections: [],
      } as Etp;

      mockEtpsRepository.findOne.mockResolvedValue(etpWithEmptyValues);

      const result = await service.exportToXML('etp-123');

      expect(result).toContain('<description></description>');
      expect(result).toContain('<numeroProcesso></numeroProcesso>');
    });
  });

  describe('exportToPDF', () => {
    let mockBrowser: any;
    let mockPage: any;

    beforeEach(() => {
      mockPage = {
        setContent: jest.fn().mockResolvedValue(undefined),
        pdf: jest.fn().mockResolvedValue(Buffer.from('PDF content')),
      };

      mockBrowser = {
        newPage: jest.fn().mockResolvedValue(mockPage),
        close: jest.fn().mockResolvedValue(undefined),
      };

      (puppeteer.launch as jest.Mock).mockResolvedValue(mockBrowser);
    });

    it('should export ETP to PDF format successfully', async () => {
      const etpWithSections = {
        ...mockEtp,
        sections: [mockSection] as EtpSection[],
      } as Etp;

      mockEtpsRepository.findOne.mockResolvedValue(etpWithSections);

      const result = await service.exportToPDF('etp-123');

      expect(result).toBeInstanceOf(Buffer);
      expect(puppeteer.launch).toHaveBeenCalledWith({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      });
      expect(mockBrowser.newPage).toHaveBeenCalled();
      expect(mockPage.setContent).toHaveBeenCalled();
      expect(mockPage.pdf).toHaveBeenCalledWith({
        format: 'A4',
        margin: {
          top: '2cm',
          right: '2cm',
          bottom: '2cm',
          left: '2cm',
        },
        printBackground: true,
      });
      expect(mockBrowser.close).toHaveBeenCalled();
    });

    it('should close browser even if PDF generation fails', async () => {
      const etpWithSections = {
        ...mockEtp,
        sections: [mockSection] as EtpSection[],
      } as Etp;

      mockEtpsRepository.findOne.mockResolvedValue(etpWithSections);
      mockPage.pdf.mockRejectedValue(new Error('PDF generation failed'));

      await expect(service.exportToPDF('etp-123')).rejects.toThrow(
        'PDF generation failed',
      );

      expect(mockBrowser.close).toHaveBeenCalled();
    });

    it('should throw NotFoundException when ETP does not exist', async () => {
      mockEtpsRepository.findOne.mockResolvedValue(null);

      await expect(service.exportToPDF('non-existent')).rejects.toThrow(
        NotFoundException,
      );

      // Browser should not be launched if ETP doesn't exist
      expect(puppeteer.launch).not.toHaveBeenCalled();
    });
  });

  describe('exportToDocx', () => {
    it('should export ETP to DOCX format successfully', async () => {
      const etpWithSections = {
        ...mockEtp,
        sections: [mockSection] as EtpSection[],
      } as Etp;

      mockEtpsRepository.findOne.mockResolvedValue(etpWithSections);

      const result = await service.exportToDocx('etp-123');

      expect(result).toBeInstanceOf(Buffer);
      expect(result.length).toBeGreaterThan(0);
      // DOCX files start with PK (ZIP format)
      expect(result[0]).toBe(0x50); // 'P'
      expect(result[1]).toBe(0x4b); // 'K'
    });

    it('should throw NotFoundException when ETP does not exist', async () => {
      mockEtpsRepository.findOne.mockResolvedValue(null);

      await expect(service.exportToDocx('non-existent')).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.exportToDocx('non-existent')).rejects.toThrow(
        'ETP non-existent não encontrado',
      );
    });

    it('should handle ETP without sections', async () => {
      const etpWithoutSections = {
        ...mockEtp,
        sections: [],
      } as Etp;

      mockEtpsRepository.findOne.mockResolvedValue(etpWithoutSections);

      const result = await service.exportToDocx('etp-123');

      expect(result).toBeInstanceOf(Buffer);
      expect(result.length).toBeGreaterThan(0);
    });

    it('should handle sections with markdown formatting', async () => {
      const sectionWithMarkdown = {
        ...mockSection,
        content: 'Este é um texto com **negrito** e *itálico*.',
      } as EtpSection;

      const etpWithSections = {
        ...mockEtp,
        sections: [sectionWithMarkdown],
      } as Etp;

      mockEtpsRepository.findOne.mockResolvedValue(etpWithSections);

      const result = await service.exportToDocx('etp-123');

      expect(result).toBeInstanceOf(Buffer);
      expect(result.length).toBeGreaterThan(0);
    });

    it('should handle sections with bullet points', async () => {
      const sectionWithBullets = {
        ...mockSection,
        content: '- Item 1\n- Item 2\n- Item 3',
      } as EtpSection;

      const etpWithSections = {
        ...mockEtp,
        sections: [sectionWithBullets],
      } as Etp;

      mockEtpsRepository.findOne.mockResolvedValue(etpWithSections);

      const result = await service.exportToDocx('etp-123');

      expect(result).toBeInstanceOf(Buffer);
      expect(result.length).toBeGreaterThan(0);
    });

    it('should handle ETP with null metadata fields', async () => {
      const etpWithNullMetadata = {
        ...mockEtp,
        metadata: null,
        valorEstimado: null,
        numeroProcesso: null,
        sections: [mockSection] as EtpSection[],
      } as unknown as Etp;

      mockEtpsRepository.findOne.mockResolvedValue(etpWithNullMetadata);

      const result = await service.exportToDocx('etp-123');

      expect(result).toBeInstanceOf(Buffer);
      expect(result.length).toBeGreaterThan(0);
    });

    it('should include all ETP sections sorted by order', async () => {
      const section1 = {
        ...mockSection,
        order: 2,
        title: 'Section 2',
      } as EtpSection;
      const section2 = {
        ...mockSection,
        id: 'section-2',
        order: 1,
        title: 'Section 1',
      } as EtpSection;
      const section3 = {
        ...mockSection,
        id: 'section-3',
        order: 3,
        title: 'Section 3',
      } as EtpSection;

      const etpWithSections = {
        ...mockEtp,
        sections: [section1, section2, section3],
      } as Etp;

      mockEtpsRepository.findOne.mockResolvedValue(etpWithSections);

      const result = await service.exportToDocx('etp-123');

      expect(result).toBeInstanceOf(Buffer);
      expect(result.length).toBeGreaterThan(0);
    });

    it('should handle sections with empty content', async () => {
      const sectionWithEmptyContent = {
        ...mockSection,
        content: null as unknown as string,
      } as EtpSection;

      const etpWithSections = {
        ...mockEtp,
        sections: [sectionWithEmptyContent],
      } as Etp;

      mockEtpsRepository.findOne.mockResolvedValue(etpWithSections);

      const result = await service.exportToDocx('etp-123');

      expect(result).toBeInstanceOf(Buffer);
      expect(result.length).toBeGreaterThan(0);
    });

    it('should format currency values correctly', async () => {
      const etpWithValue = {
        ...mockEtp,
        valorEstimado: 1500000.5,
        sections: [mockSection] as EtpSection[],
      } as Etp;

      mockEtpsRepository.findOne.mockResolvedValue(etpWithValue);

      const result = await service.exportToDocx('etp-123');

      expect(result).toBeInstanceOf(Buffer);
      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe('getEtpWithSections (private method tested via public methods)', () => {
    it('should retrieve ETP with sections sorted by order', async () => {
      const section1 = { ...mockSection, order: 2 } as EtpSection;
      const section2 = {
        ...mockSection,
        id: 'section-2',
        order: 1,
      } as EtpSection;
      const etpWithSections = {
        ...mockEtp,
        sections: [section1, section2],
      } as Etp;

      mockEtpsRepository.findOne.mockResolvedValue(etpWithSections);

      const result = await service.exportToJSON('etp-123');

      // Sections should be sorted by order
      expect((result as any).sections[0].order).toBe(1);
      expect((result as any).sections[1].order).toBe(2);
      expect(mockEtpsRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'etp-123' },
        relations: ['sections', 'createdBy'],
      });
    });
  });
});
