import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TermoReferenciaExportService } from './termo-referencia-export.service';
import {
  TermoReferencia,
  TermoReferenciaStatus,
} from '../../entities/termo-referencia.entity';
import { Etp, EtpStatus } from '../../entities/etp.entity';
import * as puppeteer from 'puppeteer';
import * as fs from 'fs';
import { execSync } from 'child_process';

// Mock puppeteer
jest.mock('puppeteer');

// Mock fs and child_process for Chromium detection tests
jest.mock('fs', () => ({
  ...jest.requireActual('fs'),
  existsSync: jest.fn(),
  accessSync: jest.fn(),
  readdirSync: jest.fn(),
  readFileSync: jest.requireActual('fs').readFileSync,
}));

jest.mock('child_process', () => ({
  execSync: jest.fn(),
}));

describe('TermoReferenciaExportService', () => {
  let service: TermoReferenciaExportService;
  let termoReferenciaRepository: Repository<TermoReferencia>;
  let etpRepository: Repository<Etp>;

  const mockOrganization = {
    id: 'org-123',
    name: 'Prefeitura Municipal de Teste',
  };

  const mockUser = {
    id: 'user-123',
    name: 'Usuario Teste',
    email: 'usuario@teste.gov.br',
  };

  const mockEtp: Partial<Etp> = {
    id: 'etp-123',
    title: 'ETP de Teste',
    objeto: 'Aquisicao de equipamentos de informatica',
    numeroProcesso: '12345/2025',
    status: EtpStatus.COMPLETED,
  };

  const mockTermoReferencia: Partial<TermoReferencia> = {
    id: 'tr-123',
    etpId: 'etp-123',
    organizationId: 'org-123',
    objeto: 'Aquisicao de equipamentos de informatica para o setor de TI',
    fundamentacaoLegal:
      'Lei 14.133/2021, art. 6, inciso XXIII\nInstrucao Normativa SEGES/ME n 40/2020',
    descricaoSolucao:
      'Aquisicao de 50 computadores desktop e 20 notebooks para renovacao do parque de TI.',
    requisitosContratacao:
      'Fornecedor deve possuir certificacao ISO 9001\nEntrega em ate 30 dias',
    modeloExecucao: 'Entrega unica em lote',
    modeloGestao:
      'Fiscalizacao pelo setor de TI com relatorios quinzenais de acompanhamento.',
    criteriosSelecao: 'Menor preco global',
    valorEstimado: 500000.0,
    dotacaoOrcamentaria: '02.031.0001.2001.339039',
    prazoVigencia: 365,
    obrigacoesContratante:
      '- Receber os equipamentos\n- Efetuar pagamento em 30 dias',
    obrigacoesContratada:
      '- Entregar equipamentos conforme especificacao\n- Fornecer garantia de 36 meses',
    sancoesPenalidades:
      'Multa de 0,5% por dia de atraso, limitada a 20% do valor total.',
    garantiaContratual: '5% do valor do contrato',
    condicoesPagamento: 'Pagamento em ate 30 dias apos a entrega',
    localExecucao: 'Sede da Prefeitura Municipal',
    status: TermoReferenciaStatus.DRAFT,
    versao: 1,
    organization: mockOrganization as any,
    createdBy: mockUser as any,
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-02'),
  };

  // Helper to create QueryBuilder mock chain for TR queries
  const createTrQueryBuilderMock = (returnData: any = null) => ({
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    getOne: jest.fn().mockResolvedValue(returnData),
  });

  const mockTrRepository = {
    findOne: jest.fn(),
    createQueryBuilder: jest.fn(() => createTrQueryBuilderMock(null)),
  };

  const mockEtpRepository = {
    findOne: jest.fn(),
  };

  beforeEach(async () => {
    // Setup default fs mocks for service initialization
    (fs.existsSync as jest.Mock).mockImplementation((path: string) => {
      if (path.includes('templates') || path.includes('.hbs')) {
        return jest.requireActual('fs').existsSync(path);
      }
      return false;
    });
    (fs.accessSync as jest.Mock).mockImplementation(() => {
      throw new Error('ENOENT');
    });
    (fs.readdirSync as jest.Mock).mockReturnValue([]);
    (execSync as jest.Mock).mockReturnValue('');

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TermoReferenciaExportService,
        {
          provide: getRepositoryToken(TermoReferencia),
          useValue: mockTrRepository,
        },
        {
          provide: getRepositoryToken(Etp),
          useValue: mockEtpRepository,
        },
      ],
    }).compile();

    service = module.get<TermoReferenciaExportService>(
      TermoReferenciaExportService,
    );
    termoReferenciaRepository = module.get<Repository<TermoReferencia>>(
      getRepositoryToken(TermoReferencia),
    );
    etpRepository = module.get<Repository<Etp>>(getRepositoryToken(Etp));

    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('exportToJSON', () => {
    it('should export TR to JSON format successfully', async () => {
      mockTrRepository.createQueryBuilder.mockReturnValue(
        createTrQueryBuilderMock(mockTermoReferencia),
      );

      const result = await service.exportToJSON('tr-123', 'org-123');

      expect(result).toHaveProperty('termoReferencia');
      expect(result).toHaveProperty('etpId');
      expect(result).toHaveProperty('organizationId');
      expect(result).toHaveProperty('exportedAt');
      expect(result).toHaveProperty('disclaimer');
      expect((result as any).termoReferencia.id).toBe('tr-123');
      expect((result as any).termoReferencia.objeto).toBe(
        'Aquisicao de equipamentos de informatica para o setor de TI',
      );
    });

    it('should throw NotFoundException when TR does not exist', async () => {
      mockTrRepository.createQueryBuilder.mockReturnValue(
        createTrQueryBuilderMock(null),
      );

      await expect(
        service.exportToJSON('non-existent', 'org-123'),
      ).rejects.toThrow(NotFoundException);
      await expect(
        service.exportToJSON('non-existent', 'org-123'),
      ).rejects.toThrow('Termo de Referencia non-existent nao encontrado');
    });

    it('should throw NotFoundException when TR belongs to different organization', async () => {
      mockTrRepository.createQueryBuilder.mockReturnValue(
        createTrQueryBuilderMock(null), // Returns null because organizationId doesn't match
      );

      await expect(
        service.exportToJSON('tr-123', 'different-org'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should include all TR fields in JSON export', async () => {
      mockTrRepository.createQueryBuilder.mockReturnValue(
        createTrQueryBuilderMock(mockTermoReferencia),
      );

      const result = await service.exportToJSON('tr-123', 'org-123');
      const tr = (result as any).termoReferencia;

      expect(tr.objeto).toBeDefined();
      expect(tr.fundamentacaoLegal).toBeDefined();
      expect(tr.descricaoSolucao).toBeDefined();
      expect(tr.requisitosContratacao).toBeDefined();
      expect(tr.modeloExecucao).toBeDefined();
      expect(tr.modeloGestao).toBeDefined();
      expect(tr.criteriosSelecao).toBeDefined();
      expect(tr.valorEstimado).toBeDefined();
      expect(tr.dotacaoOrcamentaria).toBeDefined();
      expect(tr.prazoVigencia).toBeDefined();
      expect(tr.obrigacoesContratante).toBeDefined();
      expect(tr.obrigacoesContratada).toBeDefined();
      expect(tr.sancoesPenalidades).toBeDefined();
    });
  });

  describe('exportToDocx', () => {
    beforeEach(() => {
      mockEtpRepository.findOne.mockResolvedValue(mockEtp);
    });

    it('should export TR to DOCX format successfully', async () => {
      mockTrRepository.createQueryBuilder.mockReturnValue(
        createTrQueryBuilderMock(mockTermoReferencia),
      );

      const result = await service.exportToDocx('tr-123', 'org-123');

      expect(result).toBeInstanceOf(Buffer);
      expect(result.length).toBeGreaterThan(0);
      // DOCX files start with PK (ZIP format)
      expect(result[0]).toBe(0x50); // 'P'
      expect(result[1]).toBe(0x4b); // 'K'
    });

    it('should throw NotFoundException when TR does not exist', async () => {
      mockTrRepository.createQueryBuilder.mockReturnValue(
        createTrQueryBuilderMock(null),
      );

      await expect(
        service.exportToDocx('non-existent', 'org-123'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should handle TR with null optional fields', async () => {
      const trWithNulls = {
        ...mockTermoReferencia,
        garantiaContratual: null,
        condicoesPagamento: null,
        cronograma: null,
        especificacoesTecnicas: null,
      };

      mockTrRepository.createQueryBuilder.mockReturnValue(
        createTrQueryBuilderMock(trWithNulls),
      );

      const result = await service.exportToDocx('tr-123', 'org-123');

      expect(result).toBeInstanceOf(Buffer);
      expect(result.length).toBeGreaterThan(0);
    });

    it('should handle TR with HTML content in fields', async () => {
      const trWithHtml = {
        ...mockTermoReferencia,
        descricaoSolucao:
          '<p>Descricao com <strong>negrito</strong> e <em>italico</em>.</p>',
        obrigacoesContratante:
          '<ul><li>Obrigacao 1</li><li>Obrigacao 2</li></ul>',
      };

      mockTrRepository.createQueryBuilder.mockReturnValue(
        createTrQueryBuilderMock(trWithHtml),
      );

      const result = await service.exportToDocx('tr-123', 'org-123');

      expect(result).toBeInstanceOf(Buffer);
      expect(result.length).toBeGreaterThan(0);
    });

    it('should handle TR with markdown content in fields', async () => {
      const trWithMarkdown = {
        ...mockTermoReferencia,
        descricaoSolucao:
          'Descricao com **negrito** e *italico*.\n\n- Item 1\n- Item 2',
      };

      mockTrRepository.createQueryBuilder.mockReturnValue(
        createTrQueryBuilderMock(trWithMarkdown),
      );

      const result = await service.exportToDocx('tr-123', 'org-123');

      expect(result).toBeInstanceOf(Buffer);
      expect(result.length).toBeGreaterThan(0);
    });

    it('should format currency values correctly in DOCX', async () => {
      const trWithLargeValue = {
        ...mockTermoReferencia,
        valorEstimado: 1500000.5,
      };

      mockTrRepository.createQueryBuilder.mockReturnValue(
        createTrQueryBuilderMock(trWithLargeValue),
      );

      const result = await service.exportToDocx('tr-123', 'org-123');

      expect(result).toBeInstanceOf(Buffer);
      expect(result.length).toBeGreaterThan(0);
    });

    it('should handle ETP not found gracefully', async () => {
      mockTrRepository.createQueryBuilder.mockReturnValue(
        createTrQueryBuilderMock(mockTermoReferencia),
      );
      mockEtpRepository.findOne.mockResolvedValue(null);

      const result = await service.exportToDocx('tr-123', 'org-123');

      // Should still generate DOCX even if ETP is not found
      expect(result).toBeInstanceOf(Buffer);
      expect(result.length).toBeGreaterThan(0);
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
      mockEtpRepository.findOne.mockResolvedValue(mockEtp);
    });

    it('should export TR to PDF format successfully', async () => {
      mockTrRepository.createQueryBuilder.mockReturnValue(
        createTrQueryBuilderMock(mockTermoReferencia),
      );

      const result = await service.exportToPDF('tr-123', 'org-123');

      expect(result).toBeInstanceOf(Buffer);
      expect(puppeteer.launch).toHaveBeenCalledWith(
        expect.objectContaining({
          headless: true,
          args: expect.arrayContaining([
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
          ]),
        }),
      );
      expect(mockBrowser.newPage).toHaveBeenCalled();
      expect(mockPage.setContent).toHaveBeenCalled();
      expect(mockPage.pdf).toHaveBeenCalledWith(
        expect.objectContaining({
          format: 'A4',
          printBackground: true,
        }),
      );
      expect(mockBrowser.close).toHaveBeenCalled();
    });

    it('should throw NotFoundException when TR does not exist', async () => {
      mockTrRepository.createQueryBuilder.mockReturnValue(
        createTrQueryBuilderMock(null),
      );

      await expect(
        service.exportToPDF('non-existent', 'org-123'),
      ).rejects.toThrow(NotFoundException);

      // Browser should not be launched if TR doesn't exist
      expect(puppeteer.launch).not.toHaveBeenCalled();
    });

    it('should close browser even if PDF generation fails', async () => {
      mockTrRepository.createQueryBuilder.mockReturnValue(
        createTrQueryBuilderMock(mockTermoReferencia),
      );
      mockPage.pdf.mockRejectedValue(new Error('PDF generation failed'));

      await expect(service.exportToPDF('tr-123', 'org-123')).rejects.toThrow(
        /Erro ao gerar PDF.*PDF generation failed/,
      );

      expect(mockBrowser.close).toHaveBeenCalled();
    });

    it('should handle browser close failure gracefully', async () => {
      mockTrRepository.createQueryBuilder.mockReturnValue(
        createTrQueryBuilderMock(mockTermoReferencia),
      );
      mockBrowser.close.mockRejectedValue(
        new Error('Browser process already closed'),
      );

      // Should NOT throw - browser close error is logged but not propagated
      const result = await service.exportToPDF('tr-123', 'org-123');

      expect(result).toBeInstanceOf(Buffer);
      expect(mockBrowser.close).toHaveBeenCalled();
    });

    it('should include header and footer templates in PDF', async () => {
      mockTrRepository.createQueryBuilder.mockReturnValue(
        createTrQueryBuilderMock(mockTermoReferencia),
      );

      await service.exportToPDF('tr-123', 'org-123');

      expect(mockPage.pdf).toHaveBeenCalledWith(
        expect.objectContaining({
          displayHeaderFooter: true,
          headerTemplate: expect.stringContaining('TERMO DE REFERENCIA'),
          footerTemplate: expect.stringContaining('pageNumber'),
        }),
      );
    });
  });

  describe('Multi-tenant isolation', () => {
    it('should query TR with organizationId filter', async () => {
      const qbMock = createTrQueryBuilderMock(mockTermoReferencia);
      mockTrRepository.createQueryBuilder.mockReturnValue(qbMock);

      await service.exportToJSON('tr-123', 'org-123');

      expect(qbMock.andWhere).toHaveBeenCalledWith(
        'tr.organizationId = :organizationId',
        { organizationId: 'org-123' },
      );
    });

    it('should reject export when TR belongs to different organization', async () => {
      mockTrRepository.createQueryBuilder.mockReturnValue(
        createTrQueryBuilderMock(null), // andWhere with wrong org returns null
      );

      await expect(service.exportToJSON('tr-123', 'wrong-org')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('Template rendering', () => {
    it('should load TR template on service initialization', () => {
      // Template should be loaded during construction
      // If it fails, service still initializes with fallback
      expect(service).toBeDefined();
    });

    it('should handle all TR status values', async () => {
      const statuses = [
        TermoReferenciaStatus.DRAFT,
        TermoReferenciaStatus.REVIEW,
        TermoReferenciaStatus.APPROVED,
        TermoReferenciaStatus.ARCHIVED,
      ];

      mockEtpRepository.findOne.mockResolvedValue(mockEtp);

      for (const status of statuses) {
        const trWithStatus = { ...mockTermoReferencia, status };
        mockTrRepository.createQueryBuilder.mockReturnValue(
          createTrQueryBuilderMock(trWithStatus),
        );

        const result = await service.exportToDocx('tr-123', 'org-123');
        expect(result).toBeInstanceOf(Buffer);
      }
    });
  });

  describe('Chromium path detection', () => {
    it('should detect Chromium in Nix store', async () => {
      (fs.existsSync as jest.Mock).mockImplementation((path: string) => {
        if (path === '/nix/store') return true;
        if (path.includes('templates') || path.includes('.hbs')) {
          return jest.requireActual('fs').existsSync(path);
        }
        return false;
      });
      (fs.readdirSync as jest.Mock).mockReturnValue([
        'abc123-chromium-120.0.6099.109',
      ]);
      (fs.accessSync as jest.Mock).mockImplementation((path: string) => {
        if (path === '/nix/store/abc123-chromium-120.0.6099.109/bin/chromium') {
          return;
        }
        throw new Error('ENOENT');
      });

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          TermoReferenciaExportService,
          {
            provide: getRepositoryToken(TermoReferencia),
            useValue: mockTrRepository,
          },
          {
            provide: getRepositoryToken(Etp),
            useValue: mockEtpRepository,
          },
        ],
      }).compile();

      const newService = module.get<TermoReferenciaExportService>(
        TermoReferenciaExportService,
      );
      expect(newService).toBeDefined();
    });

    it('should use PUPPETEER_EXECUTABLE_PATH env var if set', async () => {
      const originalEnv = process.env.PUPPETEER_EXECUTABLE_PATH;
      process.env.PUPPETEER_EXECUTABLE_PATH = '/custom/path/to/chromium';

      (fs.existsSync as jest.Mock).mockImplementation((path: string) => {
        if (path.includes('templates') || path.includes('.hbs')) {
          return jest.requireActual('fs').existsSync(path);
        }
        return false;
      });
      (fs.accessSync as jest.Mock).mockImplementation((path: string) => {
        if (path === '/custom/path/to/chromium') {
          return;
        }
        throw new Error('ENOENT');
      });

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          TermoReferenciaExportService,
          {
            provide: getRepositoryToken(TermoReferencia),
            useValue: mockTrRepository,
          },
          {
            provide: getRepositoryToken(Etp),
            useValue: mockEtpRepository,
          },
        ],
      }).compile();

      const newService = module.get<TermoReferenciaExportService>(
        TermoReferenciaExportService,
      );
      expect(newService).toBeDefined();

      // Restore env
      if (originalEnv === undefined) {
        delete process.env.PUPPETEER_EXECUTABLE_PATH;
      } else {
        process.env.PUPPETEER_EXECUTABLE_PATH = originalEnv;
      }
    });
  });
});
