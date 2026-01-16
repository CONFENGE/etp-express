import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PesquisaPrecosExportService } from './pesquisa-precos-export.service';
import {
  PesquisaPrecos,
  PesquisaPrecosStatus,
  MetodologiaPesquisa,
} from '../../entities/pesquisa-precos.entity';
import { Etp, EtpStatus } from '../../entities/etp.entity';
import { TermoReferencia } from '../../entities/termo-referencia.entity';
import * as puppeteer from 'puppeteer';
import * as fs from 'fs';

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

describe('PesquisaPrecosExportService', () => {
  let service: PesquisaPrecosExportService;
  let pesquisaPrecosRepository: Repository<PesquisaPrecos>;
  let etpRepository: Repository<Etp>;
  let termoReferenciaRepository: Repository<TermoReferencia>;

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

  const mockPesquisaPrecos: Partial<PesquisaPrecos> = {
    id: 'pesquisa-123',
    titulo: 'Pesquisa de Precos - Equipamentos de TI',
    descricao: 'Pesquisa para aquisicao de computadores',
    numeroProcesso: '12345/2025',
    etpId: 'etp-123',
    termoReferenciaId: undefined,
    organizationId: 'org-123',
    metodologia: MetodologiaPesquisa.CONTRATACOES_SIMILARES,
    metodologiasComplementares: [
      MetodologiaPesquisa.MIDIA_ESPECIALIZADA,
      MetodologiaPesquisa.SITES_ELETRONICOS,
    ],
    justificativaMetodologia:
      'Nao foi possivel utilizar o Painel de Precos devido a ausencia de itens similares.',
    fontesConsultadas: [
      {
        tipo: MetodologiaPesquisa.CONTRATACOES_SIMILARES,
        nome: 'PNCP - Contrato 123/2025',
        dataConsulta: '2025-01-10',
        referencia: 'https://pncp.gov.br/contratos/123',
      },
      {
        tipo: MetodologiaPesquisa.MIDIA_ESPECIALIZADA,
        nome: 'SINAPI - Janeiro/2025',
        dataConsulta: '2025-01-10',
        referencia: 'Tabela SINAPI referencia Janeiro/2025',
      },
    ],
    itens: [
      {
        codigo: 'IT001',
        descricao: 'Computador Desktop Core i7',
        unidade: 'UN',
        quantidade: 50,
        precos: [
          { fonte: 'PNCP', valor: 4500, data: '2025-01-10' },
          { fonte: 'SINAPI', valor: 4800, data: '2025-01-10' },
          { fonte: 'Fornecedor A', valor: 4200, data: '2025-01-10' },
        ],
        media: 4500,
        mediana: 4500,
        menorPreco: 4200,
        precoAdotado: 4500,
      },
      {
        codigo: 'IT002',
        descricao: 'Notebook i5 14"',
        unidade: 'UN',
        quantidade: 20,
        precos: [
          { fonte: 'PNCP', valor: 3800, data: '2025-01-10' },
          { fonte: 'SINAPI', valor: 4000, data: '2025-01-10' },
          { fonte: 'Fornecedor A', valor: 3500, data: '2025-01-10' },
        ],
        media: 3766.67,
        mediana: 3800,
        menorPreco: 3500,
        precoAdotado: 3800,
      },
    ],
    valorTotalEstimado: 301000,
    mediaGeral: 4133.33,
    medianaGeral: 4150,
    menorPrecoTotal: 280000,
    coeficienteVariacao: 8.5,
    criterioAceitabilidade: 'Mediana',
    justificativaCriterio:
      'A mediana e menos suscetivel a valores extremos, garantindo maior representatividade.',
    mapaComparativo: {
      itens: [],
      resumo: {
        valorTotal: 301000,
        economiaPotencial: 21000,
        percentualEconomia: 6.97,
      },
    },
    status: PesquisaPrecosStatus.COMPLETED,
    versao: 1,
    dataValidade: new Date('2025-07-10'),
    organization: mockOrganization as any,
    createdBy: mockUser as any,
    createdById: 'user-123',
    createdAt: new Date('2025-01-10'),
    updatedAt: new Date('2025-01-10'),
  };

  // Helper to create QueryBuilder mock chain
  const createPesquisaQueryBuilderMock = (returnData: any = null) => ({
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    getOne: jest.fn().mockResolvedValue(returnData),
  });

  const mockPesquisaPrecosRepository = {
    findOne: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  const mockEtpRepository = {
    findOne: jest.fn(),
  };

  const mockTermoReferenciaRepository = {
    findOne: jest.fn(),
  };

  beforeEach(async () => {
    // Reset all mocks
    jest.clearAllMocks();

    // Mock fs functions
    (fs.existsSync as jest.Mock).mockReturnValue(false);
    (fs.accessSync as jest.Mock).mockImplementation(() => {
      throw new Error('Not found');
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PesquisaPrecosExportService,
        {
          provide: getRepositoryToken(PesquisaPrecos),
          useValue: mockPesquisaPrecosRepository,
        },
        {
          provide: getRepositoryToken(Etp),
          useValue: mockEtpRepository,
        },
        {
          provide: getRepositoryToken(TermoReferencia),
          useValue: mockTermoReferenciaRepository,
        },
      ],
    }).compile();

    service = module.get<PesquisaPrecosExportService>(
      PesquisaPrecosExportService,
    );
    pesquisaPrecosRepository = module.get<Repository<PesquisaPrecos>>(
      getRepositoryToken(PesquisaPrecos),
    );
    etpRepository = module.get<Repository<Etp>>(getRepositoryToken(Etp));
    termoReferenciaRepository = module.get<Repository<TermoReferencia>>(
      getRepositoryToken(TermoReferencia),
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('exportToJSON', () => {
    it('should export pesquisa de precos to JSON successfully', async () => {
      const queryBuilderMock =
        createPesquisaQueryBuilderMock(mockPesquisaPrecos);
      mockPesquisaPrecosRepository.createQueryBuilder.mockReturnValue(
        queryBuilderMock,
      );

      const result = await service.exportToJSON('pesquisa-123', 'org-123');
      const pesquisa = result.pesquisaPrecos as PesquisaPrecos;

      expect(result).toBeDefined();
      expect(pesquisa).toBeDefined();
      expect(pesquisa.titulo).toBe(mockPesquisaPrecos.titulo);
      expect(pesquisa.metodologia).toBe(mockPesquisaPrecos.metodologia);
      expect(pesquisa.valorTotalEstimado).toBe(
        mockPesquisaPrecos.valorTotalEstimado,
      );
      expect(result.legalReference).toBe('IN SEGES/ME n 65/2021');
      expect(result.exportedAt).toBeDefined();
    });

    it('should throw NotFoundException when pesquisa not found', async () => {
      const queryBuilderMock = createPesquisaQueryBuilderMock(null);
      mockPesquisaPrecosRepository.createQueryBuilder.mockReturnValue(
        queryBuilderMock,
      );

      await expect(
        service.exportToJSON('invalid-id', 'org-123'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException when pesquisa belongs to different org', async () => {
      const queryBuilderMock = createPesquisaQueryBuilderMock(null);
      mockPesquisaPrecosRepository.createQueryBuilder.mockReturnValue(
        queryBuilderMock,
      );

      await expect(
        service.exportToJSON('pesquisa-123', 'other-org'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should include all methodology fields in JSON export', async () => {
      const queryBuilderMock =
        createPesquisaQueryBuilderMock(mockPesquisaPrecos);
      mockPesquisaPrecosRepository.createQueryBuilder.mockReturnValue(
        queryBuilderMock,
      );

      const result = await service.exportToJSON('pesquisa-123', 'org-123');
      const pesquisa = result.pesquisaPrecos as PesquisaPrecos;

      expect(pesquisa.metodologia).toBe(
        MetodologiaPesquisa.CONTRATACOES_SIMILARES,
      );
      expect(pesquisa.metodologiasComplementares).toEqual([
        MetodologiaPesquisa.MIDIA_ESPECIALIZADA,
        MetodologiaPesquisa.SITES_ELETRONICOS,
      ]);
      expect(pesquisa.justificativaMetodologia).toBeDefined();
    });

    it('should include fontes consultadas in JSON export', async () => {
      const queryBuilderMock =
        createPesquisaQueryBuilderMock(mockPesquisaPrecos);
      mockPesquisaPrecosRepository.createQueryBuilder.mockReturnValue(
        queryBuilderMock,
      );

      const result = await service.exportToJSON('pesquisa-123', 'org-123');
      const pesquisa = result.pesquisaPrecos as PesquisaPrecos;

      expect(pesquisa.fontesConsultadas).toHaveLength(2);
      expect(pesquisa.fontesConsultadas[0].tipo).toBe(
        MetodologiaPesquisa.CONTRATACOES_SIMILARES,
      );
    });

    it('should include statistical fields in JSON export', async () => {
      const queryBuilderMock =
        createPesquisaQueryBuilderMock(mockPesquisaPrecos);
      mockPesquisaPrecosRepository.createQueryBuilder.mockReturnValue(
        queryBuilderMock,
      );

      const result = await service.exportToJSON('pesquisa-123', 'org-123');
      const pesquisa = result.pesquisaPrecos as PesquisaPrecos;

      expect(pesquisa.valorTotalEstimado).toBe(301000);
      expect(pesquisa.mediaGeral).toBe(4133.33);
      expect(pesquisa.medianaGeral).toBe(4150);
      expect(pesquisa.coeficienteVariacao).toBe(8.5);
    });
  });

  describe('exportToPDF', () => {
    const mockBrowser = {
      newPage: jest.fn(),
      close: jest.fn(),
    };

    const mockPage = {
      setContent: jest.fn(),
      pdf: jest.fn(),
    };

    beforeEach(() => {
      (puppeteer.launch as jest.Mock).mockResolvedValue(mockBrowser);
      mockBrowser.newPage.mockResolvedValue(mockPage);
      mockPage.pdf.mockResolvedValue(Buffer.from('PDF content'));
      mockBrowser.close.mockResolvedValue(undefined);
    });

    it('should generate PDF successfully', async () => {
      const queryBuilderMock =
        createPesquisaQueryBuilderMock(mockPesquisaPrecos);
      mockPesquisaPrecosRepository.createQueryBuilder.mockReturnValue(
        queryBuilderMock,
      );
      mockEtpRepository.findOne.mockResolvedValue(mockEtp);
      mockTermoReferenciaRepository.findOne.mockResolvedValue(null);

      const result = await service.exportToPDF('pesquisa-123', 'org-123');

      expect(result).toBeInstanceOf(Buffer);
      expect(puppeteer.launch).toHaveBeenCalled();
      expect(mockPage.setContent).toHaveBeenCalled();
      expect(mockPage.pdf).toHaveBeenCalledWith(
        expect.objectContaining({
          format: 'A4',
          printBackground: true,
        }),
      );
      expect(mockBrowser.close).toHaveBeenCalled();
    });

    it('should throw NotFoundException when pesquisa not found', async () => {
      const queryBuilderMock = createPesquisaQueryBuilderMock(null);
      mockPesquisaPrecosRepository.createQueryBuilder.mockReturnValue(
        queryBuilderMock,
      );

      await expect(
        service.exportToPDF('invalid-id', 'org-123'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should include header with IN 65/2021 reference', async () => {
      const queryBuilderMock =
        createPesquisaQueryBuilderMock(mockPesquisaPrecos);
      mockPesquisaPrecosRepository.createQueryBuilder.mockReturnValue(
        queryBuilderMock,
      );
      mockEtpRepository.findOne.mockResolvedValue(mockEtp);

      await service.exportToPDF('pesquisa-123', 'org-123');

      expect(mockPage.pdf).toHaveBeenCalledWith(
        expect.objectContaining({
          headerTemplate: expect.stringContaining('IN SEGES/ME'),
        }),
      );
    });

    it('should close browser even if PDF generation fails', async () => {
      const queryBuilderMock =
        createPesquisaQueryBuilderMock(mockPesquisaPrecos);
      mockPesquisaPrecosRepository.createQueryBuilder.mockReturnValue(
        queryBuilderMock,
      );
      mockEtpRepository.findOne.mockResolvedValue(mockEtp);
      mockPage.pdf.mockRejectedValue(new Error('PDF generation failed'));

      await expect(
        service.exportToPDF('pesquisa-123', 'org-123'),
      ).rejects.toThrow();

      expect(mockBrowser.close).toHaveBeenCalled();
    });

    it('should set correct PDF margins', async () => {
      const queryBuilderMock =
        createPesquisaQueryBuilderMock(mockPesquisaPrecos);
      mockPesquisaPrecosRepository.createQueryBuilder.mockReturnValue(
        queryBuilderMock,
      );
      mockEtpRepository.findOne.mockResolvedValue(mockEtp);

      await service.exportToPDF('pesquisa-123', 'org-123');

      expect(mockPage.pdf).toHaveBeenCalledWith(
        expect.objectContaining({
          margin: expect.objectContaining({
            top: '2.5cm',
            bottom: '2cm',
            left: '2.5cm',
            right: '2cm',
          }),
        }),
      );
    });
  });

  describe('Chromium detection', () => {
    it('should prefer PUPPETEER_EXECUTABLE_PATH env var', async () => {
      const originalEnv = process.env.PUPPETEER_EXECUTABLE_PATH;
      process.env.PUPPETEER_EXECUTABLE_PATH = '/custom/chromium';

      (fs.accessSync as jest.Mock).mockImplementation((path) => {
        if (path === '/custom/chromium') {
          return undefined; // File is executable
        }
        throw new Error('Not found');
      });

      // Recreate service to trigger Chromium detection
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          PesquisaPrecosExportService,
          {
            provide: getRepositoryToken(PesquisaPrecos),
            useValue: mockPesquisaPrecosRepository,
          },
          {
            provide: getRepositoryToken(Etp),
            useValue: mockEtpRepository,
          },
          {
            provide: getRepositoryToken(TermoReferencia),
            useValue: mockTermoReferenciaRepository,
          },
        ],
      }).compile();

      const newService = module.get<PesquisaPrecosExportService>(
        PesquisaPrecosExportService,
      );
      expect(newService).toBeDefined();

      // Restore env
      if (originalEnv) {
        process.env.PUPPETEER_EXECUTABLE_PATH = originalEnv;
      } else {
        delete process.env.PUPPETEER_EXECUTABLE_PATH;
      }
    });
  });

  describe('Data formatting', () => {
    it('should format pesquisa with multiple items correctly', async () => {
      const pesquisaWithManyItems = {
        ...mockPesquisaPrecos,
        itens: [
          ...mockPesquisaPrecos.itens!,
          {
            codigo: 'IT003',
            descricao: 'Monitor 24"',
            unidade: 'UN',
            quantidade: 50,
            precos: [
              { fonte: 'PNCP', valor: 1200, data: '2025-01-10' },
              { fonte: 'SINAPI', valor: 1300, data: '2025-01-10' },
            ],
            media: 1250,
            mediana: 1250,
            menorPreco: 1200,
            precoAdotado: 1250,
          },
        ],
      };

      const queryBuilderMock = createPesquisaQueryBuilderMock(
        pesquisaWithManyItems,
      );
      mockPesquisaPrecosRepository.createQueryBuilder.mockReturnValue(
        queryBuilderMock,
      );

      const result = await service.exportToJSON('pesquisa-123', 'org-123');
      const pesquisa = result.pesquisaPrecos as PesquisaPrecos;

      expect(pesquisa.itens).toHaveLength(3);
    });

    it('should handle pesquisa with no items', async () => {
      const pesquisaNoItems = {
        ...mockPesquisaPrecos,
        itens: [],
        fontesConsultadas: [],
      };

      const queryBuilderMock = createPesquisaQueryBuilderMock(pesquisaNoItems);
      mockPesquisaPrecosRepository.createQueryBuilder.mockReturnValue(
        queryBuilderMock,
      );

      const result = await service.exportToJSON('pesquisa-123', 'org-123');
      const pesquisa = result.pesquisaPrecos as PesquisaPrecos;

      expect(pesquisa.itens).toEqual([]);
    });

    it('should handle pesquisa with null optional fields', async () => {
      const pesquisaMinimal = {
        ...mockPesquisaPrecos,
        descricao: null,
        numeroProcesso: null,
        termoReferenciaId: null,
        etpId: null,
        metodologiasComplementares: null,
        justificativaMetodologia: null,
        dataValidade: null,
      };

      const queryBuilderMock = createPesquisaQueryBuilderMock(pesquisaMinimal);
      mockPesquisaPrecosRepository.createQueryBuilder.mockReturnValue(
        queryBuilderMock,
      );

      const result = await service.exportToJSON('pesquisa-123', 'org-123');

      expect(result.pesquisaPrecos).toBeDefined();
      expect(result.etpId).toBeNull();
      expect(result.termoReferenciaId).toBeNull();
    });
  });

  describe('Related entities', () => {
    it('should fetch linked ETP when etpId is present', async () => {
      const mockBrowser = {
        newPage: jest.fn().mockResolvedValue({
          setContent: jest.fn(),
          pdf: jest.fn().mockResolvedValue(Buffer.from('PDF')),
        }),
        close: jest.fn(),
      };
      (puppeteer.launch as jest.Mock).mockResolvedValue(mockBrowser);

      const queryBuilderMock =
        createPesquisaQueryBuilderMock(mockPesquisaPrecos);
      mockPesquisaPrecosRepository.createQueryBuilder.mockReturnValue(
        queryBuilderMock,
      );
      mockEtpRepository.findOne.mockResolvedValue(mockEtp);

      await service.exportToPDF('pesquisa-123', 'org-123');

      expect(mockEtpRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'etp-123' },
        select: ['id', 'title', 'numeroProcesso', 'objeto'],
      });
    });

    it('should not fetch ETP when etpId is null', async () => {
      const pesquisaNoEtp = {
        ...mockPesquisaPrecos,
        etpId: null,
      };

      const mockBrowser = {
        newPage: jest.fn().mockResolvedValue({
          setContent: jest.fn(),
          pdf: jest.fn().mockResolvedValue(Buffer.from('PDF')),
        }),
        close: jest.fn(),
      };
      (puppeteer.launch as jest.Mock).mockResolvedValue(mockBrowser);

      const queryBuilderMock = createPesquisaQueryBuilderMock(pesquisaNoEtp);
      mockPesquisaPrecosRepository.createQueryBuilder.mockReturnValue(
        queryBuilderMock,
      );

      await service.exportToPDF('pesquisa-123', 'org-123');

      expect(mockEtpRepository.findOne).not.toHaveBeenCalled();
    });

    it('should fetch linked TR when termoReferenciaId is present', async () => {
      const pesquisaWithTr = {
        ...mockPesquisaPrecos,
        termoReferenciaId: 'tr-123',
      };

      const mockTr = {
        id: 'tr-123',
        objeto: 'Termo de Referencia de Teste',
      };

      const mockBrowser = {
        newPage: jest.fn().mockResolvedValue({
          setContent: jest.fn(),
          pdf: jest.fn().mockResolvedValue(Buffer.from('PDF')),
        }),
        close: jest.fn(),
      };
      (puppeteer.launch as jest.Mock).mockResolvedValue(mockBrowser);

      const queryBuilderMock = createPesquisaQueryBuilderMock(pesquisaWithTr);
      mockPesquisaPrecosRepository.createQueryBuilder.mockReturnValue(
        queryBuilderMock,
      );
      mockEtpRepository.findOne.mockResolvedValue(mockEtp);
      mockTermoReferenciaRepository.findOne.mockResolvedValue(mockTr);

      await service.exportToPDF('pesquisa-123', 'org-123');

      expect(mockTermoReferenciaRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'tr-123' },
        select: ['id', 'objeto'],
      });
    });
  });
});
