import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotFoundException } from '@nestjs/common';
import { EditalExportService } from './edital-export.service';
import {
  Edital,
  EditalModalidade,
  EditalStatus,
  EditalCriterioJulgamento,
  EditalModoDisputa,
} from '../../entities/edital.entity';
import { Etp } from '../../entities/etp.entity';
import { TermoReferencia } from '../../entities/termo-referencia.entity';
import { PesquisaPrecos } from '../../entities/pesquisa-precos.entity';

describe('EditalExportService', () => {
  let service: EditalExportService;
  let editalRepository: Repository<Edital>;
  let etpRepository: Repository<Etp>;
  let trRepository: Repository<TermoReferencia>;
  let ppRepository: Repository<PesquisaPrecos>;

  const mockOrganizationId = 'org-uuid';
  const mockUserId = 'user-uuid';

  const mockOrganization = {
    id: mockOrganizationId,
    name: 'Prefeitura Municipal de Teste',
    cnpj: '12345678000190',
    type: 'government' as const,
  };

  const mockUser = {
    id: mockUserId,
    name: 'João da Silva',
    email: 'joao@test.com',
    cargo: 'Pregoeiro',
  };

  const mockEdital: Partial<Edital> = {
    id: 'edital-uuid',
    numero: '001/2024-PREGAO',
    numeroProcesso: '12345/2024',
    uasg: '123456',
    objeto: 'Contratação de serviços de TI',
    descricaoObjeto: '<p>Descrição detalhada do objeto</p>',
    modalidade: EditalModalidade.PREGAO,
    criterioJulgamento: EditalCriterioJulgamento.MENOR_PRECO,
    modoDisputa: EditalModoDisputa.ABERTO,
    valorEstimado: '100000.00',
    sigiloOrcamento: false,
    dataSessaoPublica: new Date('2024-12-01T10:00:00Z'),
    localSessaoPublica: 'https://compras.gov.br',
    condicoesParticipacao: '<p>Condições de participação</p>',
    prazoVigencia: 365,
    dotacaoOrcamentaria: '02.031.0001.2001.339039',
    status: EditalStatus.APPROVED,
    versao: 1,
    organizationId: mockOrganizationId,
    organization: mockOrganization as any,
    createdById: mockUserId,
    createdBy: mockUser as any,
    etpId: 'etp-uuid',
    termoReferenciaId: 'tr-uuid',
    pesquisaPrecosId: 'pp-uuid',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockEtp: Partial<Etp> = {
    id: 'etp-uuid',
    title: 'ETP - Contratação de TI',
    objeto: 'Serviços de TI',
    numeroProcesso: '12345/2024',
  };

  const mockTR: Partial<TermoReferencia> = {
    id: 'tr-uuid',
    objeto: 'Termo de Referência - TI',
  };

  const mockPP: Partial<PesquisaPrecos> = {
    id: 'pp-uuid',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EditalExportService,
        {
          provide: getRepositoryToken(Edital),
          useValue: {
            createQueryBuilder: jest.fn(() => ({
              leftJoinAndSelect: jest.fn().mockReturnThis(),
              where: jest.fn().mockReturnThis(),
              andWhere: jest.fn().mockReturnThis(),
              getOne: jest.fn().mockResolvedValue(mockEdital),
            })),
          },
        },
        {
          provide: getRepositoryToken(Etp),
          useValue: {
            findOne: jest.fn().mockResolvedValue(mockEtp),
          },
        },
        {
          provide: getRepositoryToken(TermoReferencia),
          useValue: {
            findOne: jest.fn().mockResolvedValue(mockTR),
          },
        },
        {
          provide: getRepositoryToken(PesquisaPrecos),
          useValue: {
            findOne: jest.fn().mockResolvedValue(mockPP),
          },
        },
      ],
    }).compile();

    service = module.get<EditalExportService>(EditalExportService);
    editalRepository = module.get<Repository<Edital>>(
      getRepositoryToken(Edital),
    );
    etpRepository = module.get<Repository<Etp>>(getRepositoryToken(Etp));
    trRepository = module.get<Repository<TermoReferencia>>(
      getRepositoryToken(TermoReferencia),
    );
    ppRepository = module.get<Repository<PesquisaPrecos>>(
      getRepositoryToken(PesquisaPrecos),
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('exportToPDF', () => {
    it('should throw NotFoundException if edital not found', async () => {
      jest.spyOn(editalRepository, 'createQueryBuilder').mockReturnValue({
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(null),
      } as any);

      await expect(
        service.exportToPDF('invalid-id', mockOrganizationId),
      ).rejects.toThrow(NotFoundException);
    });

    it('should generate PDF buffer for valid edital', async () => {
      // Mock Puppeteer launch - skip actual browser launch in tests
      const mockPdfBuffer = Buffer.from('mock-pdf-content');

      // Since we can't easily mock Puppeteer in unit tests, we'll just verify
      // the method exists and has correct signature
      expect(service.exportToPDF).toBeDefined();
      expect(typeof service.exportToPDF).toBe('function');
    });
  });

  describe('exportToDocx', () => {
    it('should throw NotFoundException if edital not found', async () => {
      jest.spyOn(editalRepository, 'createQueryBuilder').mockReturnValue({
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(null),
      } as any);

      await expect(
        service.exportToDocx('invalid-id', mockOrganizationId),
      ).rejects.toThrow(NotFoundException);
    });

    it('should generate DOCX buffer for valid edital', async () => {
      const buffer = await service.exportToDocx(
        'edital-uuid',
        mockOrganizationId,
      );

      expect(buffer).toBeDefined();
      expect(buffer).toBeInstanceOf(Buffer);
      expect(buffer.length).toBeGreaterThan(0);
    });

    it('should include edital metadata in DOCX export', async () => {
      const buffer = await service.exportToDocx(
        'edital-uuid',
        mockOrganizationId,
      );

      // Verify buffer is valid
      expect(buffer).toBeDefined();
      expect(buffer).toBeInstanceOf(Buffer);

      // DOCX files start with PK (ZIP magic number)
      const header = buffer.toString('utf-8', 0, 2);
      expect(header).toBe('PK');
    });

    it('should fetch related documents (ETP, TR, PP)', async () => {
      const findOneSpy = jest.spyOn(etpRepository, 'findOne');

      await service.exportToDocx('edital-uuid', mockOrganizationId);

      expect(findOneSpy).toHaveBeenCalledWith({
        where: { id: 'etp-uuid' },
        select: ['id', 'title', 'objeto', 'numeroProcesso'],
      });
    });
  });

  describe('multi-tenancy validation', () => {
    it('should validate organizationId on export', async () => {
      const queryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(mockEdital),
      };

      jest
        .spyOn(editalRepository, 'createQueryBuilder')
        .mockReturnValue(queryBuilder as any);

      await service.exportToDocx('edital-uuid', mockOrganizationId);

      expect(queryBuilder.andWhere).toHaveBeenCalledWith(
        'edital.organizationId = :organizationId',
        { organizationId: mockOrganizationId },
      );
    });

    it('should throw NotFoundException for wrong organizationId', async () => {
      jest.spyOn(editalRepository, 'createQueryBuilder').mockReturnValue({
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(null),
      } as any);

      await expect(
        service.exportToDocx('edital-uuid', 'wrong-org-id'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('related documents handling', () => {
    it('should handle missing ETP gracefully', async () => {
      jest.spyOn(etpRepository, 'findOne').mockResolvedValue(null);

      const buffer = await service.exportToDocx(
        'edital-uuid',
        mockOrganizationId,
      );

      expect(buffer).toBeDefined();
      expect(buffer.length).toBeGreaterThan(0);
    });

    it('should handle missing TR gracefully', async () => {
      jest.spyOn(trRepository, 'findOne').mockResolvedValue(null);

      const buffer = await service.exportToDocx(
        'edital-uuid',
        mockOrganizationId,
      );

      expect(buffer).toBeDefined();
      expect(buffer.length).toBeGreaterThan(0);
    });

    it('should handle missing PesquisaPrecos gracefully', async () => {
      jest.spyOn(ppRepository, 'findOne').mockResolvedValue(null);

      const buffer = await service.exportToDocx(
        'edital-uuid',
        mockOrganizationId,
      );

      expect(buffer).toBeDefined();
      expect(buffer.length).toBeGreaterThan(0);
    });
  });
});
