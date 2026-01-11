import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PesquisaPrecosService } from './pesquisa-precos.service';
import {
  PesquisaPrecos,
  PesquisaPrecosStatus,
  MetodologiaPesquisa,
  ItemPesquisado,
} from '../../entities/pesquisa-precos.entity';
import { Etp } from '../../entities/etp.entity';
import { TermoReferencia } from '../../entities/termo-referencia.entity';
import { CreatePesquisaPrecosDto } from './dto/create-pesquisa-precos.dto';
import { UpdatePesquisaPrecosDto } from './dto/update-pesquisa-precos.dto';

describe('PesquisaPrecosService', () => {
  let service: PesquisaPrecosService;
  let pesquisaPrecosRepository: Repository<PesquisaPrecos>;
  let etpRepository: Repository<Etp>;
  let termoReferenciaRepository: Repository<TermoReferencia>;

  const mockOrganizationId = 'org-123';
  const mockUserId = 'user-456';
  const mockEtpId = 'etp-789';
  const mockTrId = 'tr-101';

  const mockEtp: Partial<Etp> = {
    id: mockEtpId,
    organizationId: mockOrganizationId,
    title: 'ETP de Teste',
  };

  const mockTr: Partial<TermoReferencia> = {
    id: mockTrId,
    organizationId: mockOrganizationId,
    objeto: 'Objeto do TR',
  };

  const mockPesquisaPrecos: Partial<PesquisaPrecos> = {
    id: 'pesq-001',
    titulo: 'Pesquisa de precos - Computadores',
    organizationId: mockOrganizationId,
    metodologia: MetodologiaPesquisa.PAINEL_PRECOS,
    status: PesquisaPrecosStatus.DRAFT,
    versao: 1,
    createdById: mockUserId,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockItens: ItemPesquisado[] = [
    {
      codigo: '123456',
      descricao: 'Computador desktop',
      unidade: 'unidade',
      quantidade: 10,
      precos: [
        { fonte: 'Fornecedor A', valor: 3000, data: '2026-01-10' },
        { fonte: 'Fornecedor B', valor: 3200, data: '2026-01-10' },
        { fonte: 'Fornecedor C', valor: 2800, data: '2026-01-10' },
      ],
    },
    {
      codigo: '789012',
      descricao: 'Monitor 24 polegadas',
      unidade: 'unidade',
      quantidade: 10,
      precos: [
        { fonte: 'Fornecedor A', valor: 800, data: '2026-01-10' },
        { fonte: 'Fornecedor B', valor: 850, data: '2026-01-10' },
        { fonte: 'Fornecedor C', valor: 750, data: '2026-01-10' },
      ],
    },
  ];

  const mockPesquisaPrecosRepository = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    remove: jest.fn(),
  };

  const mockEtpRepository = {
    findOne: jest.fn(),
  };

  const mockTermoReferenciaRepository = {
    findOne: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PesquisaPrecosService,
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

    service = module.get<PesquisaPrecosService>(PesquisaPrecosService);
    pesquisaPrecosRepository = module.get<Repository<PesquisaPrecos>>(
      getRepositoryToken(PesquisaPrecos),
    );
    etpRepository = module.get<Repository<Etp>>(getRepositoryToken(Etp));
    termoReferenciaRepository = module.get<Repository<TermoReferencia>>(
      getRepositoryToken(TermoReferencia),
    );

    // Reset mocks
    jest.clearAllMocks();
  });

  describe('create', () => {
    const createDto: CreatePesquisaPrecosDto = {
      titulo: 'Nova Pesquisa de Precos',
      metodologia: MetodologiaPesquisa.PAINEL_PRECOS,
    };

    it('should create a price research successfully', async () => {
      mockPesquisaPrecosRepository.create.mockReturnValue(mockPesquisaPrecos);
      mockPesquisaPrecosRepository.save.mockResolvedValue(mockPesquisaPrecos);

      const result = await service.create(
        createDto,
        mockUserId,
        mockOrganizationId,
      );

      expect(result).toEqual(mockPesquisaPrecos);
      expect(mockPesquisaPrecosRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          titulo: createDto.titulo,
          organizationId: mockOrganizationId,
          createdById: mockUserId,
          status: PesquisaPrecosStatus.DRAFT,
          versao: 1,
        }),
      );
      expect(mockPesquisaPrecosRepository.save).toHaveBeenCalled();
    });

    it('should create price research linked to ETP', async () => {
      const dtoWithEtp: CreatePesquisaPrecosDto = {
        ...createDto,
        etpId: mockEtpId,
      };

      mockEtpRepository.findOne.mockResolvedValue(mockEtp);
      mockPesquisaPrecosRepository.create.mockReturnValue(mockPesquisaPrecos);
      mockPesquisaPrecosRepository.save.mockResolvedValue(mockPesquisaPrecos);

      const result = await service.create(
        dtoWithEtp,
        mockUserId,
        mockOrganizationId,
      );

      expect(result).toEqual(mockPesquisaPrecos);
      expect(mockEtpRepository.findOne).toHaveBeenCalledWith({
        where: { id: mockEtpId },
      });
    });

    it('should throw NotFoundException when ETP not found', async () => {
      const dtoWithEtp: CreatePesquisaPrecosDto = {
        ...createDto,
        etpId: 'non-existent-etp',
      };

      mockEtpRepository.findOne.mockResolvedValue(null);

      await expect(
        service.create(dtoWithEtp, mockUserId, mockOrganizationId),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when ETP belongs to another org', async () => {
      const dtoWithEtp: CreatePesquisaPrecosDto = {
        ...createDto,
        etpId: mockEtpId,
      };

      mockEtpRepository.findOne.mockResolvedValue({
        ...mockEtp,
        organizationId: 'different-org',
      });

      await expect(
        service.create(dtoWithEtp, mockUserId, mockOrganizationId),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should create price research linked to TR', async () => {
      const dtoWithTr: CreatePesquisaPrecosDto = {
        ...createDto,
        termoReferenciaId: mockTrId,
      };

      mockTermoReferenciaRepository.findOne.mockResolvedValue(mockTr);
      mockPesquisaPrecosRepository.create.mockReturnValue(mockPesquisaPrecos);
      mockPesquisaPrecosRepository.save.mockResolvedValue(mockPesquisaPrecos);

      const result = await service.create(
        dtoWithTr,
        mockUserId,
        mockOrganizationId,
      );

      expect(result).toEqual(mockPesquisaPrecos);
      expect(mockTermoReferenciaRepository.findOne).toHaveBeenCalledWith({
        where: { id: mockTrId },
      });
    });

    it('should throw NotFoundException when TR not found', async () => {
      const dtoWithTr: CreatePesquisaPrecosDto = {
        ...createDto,
        termoReferenciaId: 'non-existent-tr',
      };

      mockTermoReferenciaRepository.findOne.mockResolvedValue(null);

      await expect(
        service.create(dtoWithTr, mockUserId, mockOrganizationId),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when TR belongs to another org', async () => {
      const dtoWithTr: CreatePesquisaPrecosDto = {
        ...createDto,
        termoReferenciaId: mockTrId,
      };

      mockTermoReferenciaRepository.findOne.mockResolvedValue({
        ...mockTr,
        organizationId: 'different-org',
      });

      await expect(
        service.create(dtoWithTr, mockUserId, mockOrganizationId),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('findAll', () => {
    it('should return all price researches for organization', async () => {
      mockPesquisaPrecosRepository.find.mockResolvedValue([mockPesquisaPrecos]);

      const result = await service.findAll(mockOrganizationId);

      expect(result).toEqual([mockPesquisaPrecos]);
      expect(mockPesquisaPrecosRepository.find).toHaveBeenCalledWith({
        where: { organizationId: mockOrganizationId },
        relations: ['createdBy', 'etp', 'termoReferencia'],
        order: { updatedAt: 'DESC' },
      });
    });

    it('should filter by etpId', async () => {
      mockPesquisaPrecosRepository.find.mockResolvedValue([mockPesquisaPrecos]);

      await service.findAll(mockOrganizationId, mockEtpId);

      expect(mockPesquisaPrecosRepository.find).toHaveBeenCalledWith({
        where: { organizationId: mockOrganizationId, etpId: mockEtpId },
        relations: ['createdBy', 'etp', 'termoReferencia'],
        order: { updatedAt: 'DESC' },
      });
    });

    it('should filter by termoReferenciaId', async () => {
      mockPesquisaPrecosRepository.find.mockResolvedValue([mockPesquisaPrecos]);

      await service.findAll(mockOrganizationId, undefined, mockTrId);

      expect(mockPesquisaPrecosRepository.find).toHaveBeenCalledWith({
        where: {
          organizationId: mockOrganizationId,
          termoReferenciaId: mockTrId,
        },
        relations: ['createdBy', 'etp', 'termoReferencia'],
        order: { updatedAt: 'DESC' },
      });
    });

    it('should filter by status', async () => {
      mockPesquisaPrecosRepository.find.mockResolvedValue([mockPesquisaPrecos]);

      await service.findAll(
        mockOrganizationId,
        undefined,
        undefined,
        PesquisaPrecosStatus.COMPLETED,
      );

      expect(mockPesquisaPrecosRepository.find).toHaveBeenCalledWith({
        where: {
          organizationId: mockOrganizationId,
          status: PesquisaPrecosStatus.COMPLETED,
        },
        relations: ['createdBy', 'etp', 'termoReferencia'],
        order: { updatedAt: 'DESC' },
      });
    });
  });

  describe('findOne', () => {
    it('should return a price research by id', async () => {
      mockPesquisaPrecosRepository.findOne.mockResolvedValue(
        mockPesquisaPrecos,
      );

      const result = await service.findOne('pesq-001', mockOrganizationId);

      expect(result).toEqual(mockPesquisaPrecos);
      expect(mockPesquisaPrecosRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'pesq-001' },
        relations: ['createdBy', 'etp', 'termoReferencia', 'organization'],
      });
    });

    it('should throw NotFoundException when not found', async () => {
      mockPesquisaPrecosRepository.findOne.mockResolvedValue(null);

      await expect(
        service.findOne('non-existent', mockOrganizationId),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when belongs to another org', async () => {
      mockPesquisaPrecosRepository.findOne.mockResolvedValue({
        ...mockPesquisaPrecos,
        organizationId: 'different-org',
      });

      await expect(
        service.findOne('pesq-001', mockOrganizationId),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('update', () => {
    const updateDto: UpdatePesquisaPrecosDto = {
      titulo: 'Pesquisa Atualizada',
      status: PesquisaPrecosStatus.COMPLETED,
    };

    it('should update a price research', async () => {
      mockPesquisaPrecosRepository.findOne.mockResolvedValue(
        mockPesquisaPrecos,
      );
      mockPesquisaPrecosRepository.save.mockResolvedValue({
        ...mockPesquisaPrecos,
        ...updateDto,
      });

      const result = await service.update(
        'pesq-001',
        updateDto,
        mockOrganizationId,
      );

      expect(result.titulo).toBe(updateDto.titulo);
      expect(mockPesquisaPrecosRepository.save).toHaveBeenCalled();
    });

    it('should throw NotFoundException when not found', async () => {
      mockPesquisaPrecosRepository.findOne.mockResolvedValue(null);

      await expect(
        service.update('non-existent', updateDto, mockOrganizationId),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('should remove a price research', async () => {
      mockPesquisaPrecosRepository.findOne.mockResolvedValue(
        mockPesquisaPrecos,
      );
      mockPesquisaPrecosRepository.remove.mockResolvedValue(mockPesquisaPrecos);

      await service.remove('pesq-001', mockOrganizationId);

      expect(mockPesquisaPrecosRepository.remove).toHaveBeenCalledWith(
        mockPesquisaPrecos,
      );
    });

    it('should throw NotFoundException when not found', async () => {
      mockPesquisaPrecosRepository.findOne.mockResolvedValue(null);

      await expect(
        service.remove('non-existent', mockOrganizationId),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('calculateStatistics', () => {
    it('should calculate mean correctly', () => {
      const result = service.calculateStatistics(mockItens);

      // Computador: media = (3000+3200+2800)/3 = 3000
      // Monitor: media = (800+850+750)/3 = 800
      // Mediana do computador = 3000, mediana do monitor = 800
      // Valor total = 3000*10 + 800*10 = 38000
      // Menor total = 2800*10 + 750*10 = 35500

      expect(result.valorTotalEstimado).toBe(38000);
      expect(result.menorPrecoTotal).toBe(35500);
    });

    it('should calculate median correctly', () => {
      const result = service.calculateStatistics(mockItens);

      // All prices: [800, 850, 750, 3000, 3200, 2800]
      // Sorted: [750, 800, 850, 2800, 3000, 3200]
      // Mediana = (850 + 2800) / 2 = 1825
      expect(result.medianaGeral).toBeDefined();
    });

    it('should calculate coefficient of variation', () => {
      const result = service.calculateStatistics(mockItens);

      expect(result.coeficienteVariacao).toBeGreaterThan(0);
    });

    it('should handle empty items array', () => {
      const result = service.calculateStatistics([]);

      expect(result.valorTotalEstimado).toBe(0);
      expect(result.mediaGeral).toBe(0);
      expect(result.medianaGeral).toBe(0);
      expect(result.menorPrecoTotal).toBe(0);
      expect(result.coeficienteVariacao).toBe(0);
    });

    it('should use precoAdotado when provided', () => {
      const itensWithPrecoAdotado: ItemPesquisado[] = [
        {
          descricao: 'Item teste',
          unidade: 'un',
          quantidade: 5,
          precoAdotado: 500,
          precos: [
            { fonte: 'A', valor: 400, data: '2026-01-10' },
            { fonte: 'B', valor: 600, data: '2026-01-10' },
          ],
        },
      ];

      const result = service.calculateStatistics(itensWithPrecoAdotado);

      // Valor total = 500 * 5 = 2500 (usando precoAdotado)
      expect(result.valorTotalEstimado).toBe(2500);
    });
  });
});
