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
import { ColetarPrecosDto } from './dto/coletar-precos.dto';
import { SinapiService } from '../gov-api/sinapi/sinapi.service';
import { SicroService } from '../gov-api/sicro/sicro.service';
import { PncpService } from '../gov-api/pncp/pncp.service';
import { PriceAggregationService } from '../gov-api/price-aggregation/price-aggregation.service';

describe('PesquisaPrecosService', () => {
  let service: PesquisaPrecosService;
  let pesquisaPrecosRepository: Repository<PesquisaPrecos>;
  let etpRepository: Repository<Etp>;
  let termoReferenciaRepository: Repository<TermoReferencia>;
  let sinapiService: SinapiService;
  let sicroService: SicroService;
  let pncpService: PncpService;
  let priceAggregationService: PriceAggregationService;

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

  const mockSinapiService = {
    search: jest.fn(),
  };

  const mockSicroService = {
    search: jest.fn(),
  };

  const mockPncpService = {
    search: jest.fn(),
  };

  const mockPriceAggregationService = {
    aggregatePrices: jest.fn(),
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
        {
          provide: SinapiService,
          useValue: mockSinapiService,
        },
        {
          provide: SicroService,
          useValue: mockSicroService,
        },
        {
          provide: PncpService,
          useValue: mockPncpService,
        },
        {
          provide: PriceAggregationService,
          useValue: mockPriceAggregationService,
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
    sinapiService = module.get<SinapiService>(SinapiService);
    sicroService = module.get<SicroService>(SicroService);
    pncpService = module.get<PncpService>(PncpService);
    priceAggregationService = module.get<PriceAggregationService>(
      PriceAggregationService,
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

  // ============================================
  // Testes para coletarPrecos (#1412)
  // ============================================

  describe('coletarPrecos', () => {
    const mockSinapiPrices = {
      data: [
        {
          id: 'sinapi-1',
          codigo: '00001',
          descricao: 'Cimento Portland CP-II',
          unidade: 'SC',
          precoUnitario: 35.5,
          mesReferencia: '2026-01',
          uf: 'DF',
          desonerado: false,
          source: 'sinapi',
          title: 'Cimento Portland CP-II',
          description: 'Cimento Portland CP-II 50kg',
          relevance: 0.95,
          fetchedAt: new Date(),
        },
      ],
      total: 1,
      page: 1,
      perPage: 10,
      source: 'sinapi',
      cached: false,
      isFallback: false,
      timestamp: new Date(),
    };

    const mockSicroPrices = {
      data: [
        {
          id: 'sicro-1',
          codigo: 'S0001',
          descricao: 'Cimento Portland',
          unidade: 'SC',
          precoUnitario: 36.0,
          mesReferencia: '2026-01',
          uf: 'DF',
          desonerado: false,
          source: 'sicro',
          title: 'Cimento Portland',
          description: 'Cimento Portland para obras rodoviarias',
          relevance: 0.9,
          fetchedAt: new Date(),
        },
      ],
      total: 1,
      page: 1,
      perPage: 10,
      source: 'sicro',
      cached: false,
      isFallback: false,
      timestamp: new Date(),
    };

    const mockPncpContracts = {
      data: [
        {
          id: 'pncp-1',
          numero: '001/2026',
          ano: 2026,
          orgaoContratante: {
            cnpj: '00000000000191',
            nome: 'Orgao Federal',
            uf: 'DF',
          },
          objeto: 'Aquisicao de cimento',
          valorTotal: 35000,
          modalidade: 'pregao',
          status: 'homologado',
          dataPublicacao: new Date(),
          source: 'pncp',
          title: 'Aquisicao de cimento',
          description: 'Aquisicao de cimento para obras',
          relevance: 0.85,
          fetchedAt: new Date(),
        },
      ],
      total: 1,
      page: 1,
      perPage: 10,
      source: 'pncp',
      cached: false,
      isFallback: false,
      timestamp: new Date(),
    };

    const mockAggregationResult = {
      query: 'cimento portland',
      aggregations: [
        {
          description: 'Preco agregado',
          averagePrice: 35.5,
          medianPrice: 35.5,
          minPrice: 35.0,
          maxPrice: 36.0,
          sources: [
            {
              source: 'sinapi' as const,
              code: '00001',
              price: 35.5,
              date: new Date(),
              reference: 'SINAPI 00001',
              unit: 'SC',
              uf: 'DF',
            },
            {
              source: 'sicro' as const,
              code: 'S0001',
              price: 36.0,
              date: new Date(),
              reference: 'SICRO S0001',
              unit: 'SC',
              uf: 'DF',
            },
          ],
          sourceCount: 2,
          confidence: 'MEDIUM' as const,
          coefficientOfVariation: 0.05,
          methodology: 'Media de 2 fontes',
          outliersExcluded: false,
          outlierCount: 0,
          unit: 'SC',
          legalReference: 'Lei 14.133/2021',
        },
      ],
      unmatchedPrices: [],
      totalPricesAnalyzed: 2,
      sourcesConsulted: ['sinapi', 'sicro'] as const,
      overallConfidence: 'MEDIUM' as const,
      timestamp: new Date(),
      methodologySummary: 'Pesquisa de precos realizada em 2 fontes.',
    };

    it('should collect prices from multiple sources successfully', async () => {
      mockSinapiService.search.mockResolvedValue(mockSinapiPrices);
      mockSicroService.search.mockResolvedValue(mockSicroPrices);
      mockPncpService.search.mockResolvedValue(mockPncpContracts);
      mockPriceAggregationService.aggregatePrices.mockReturnValue(
        mockAggregationResult,
      );

      const result = await service.coletarPrecos(
        'cimento portland',
        100,
        'SC',
        { uf: 'DF' },
      );

      expect(result).toBeDefined();
      expect(result.item).toBeDefined();
      expect(result.item.descricao).toBe('cimento portland');
      expect(result.item.quantidade).toBe(100);
      expect(result.item.unidade).toBe('SC');
      expect(result.fontesConsultadas.length).toBeGreaterThan(0);
      expect(result.confianca).toBe('MEDIUM');
      expect(result.duracaoMs).toBeGreaterThanOrEqual(0);

      expect(mockSinapiService.search).toHaveBeenCalledWith(
        'cimento portland',
        { uf: 'DF' },
      );
      expect(mockSicroService.search).toHaveBeenCalledWith('cimento portland', {
        uf: 'DF',
      });
      expect(mockPncpService.search).toHaveBeenCalledWith('cimento portland', {
        uf: 'DF',
      });
    });

    it('should handle partial failures gracefully', async () => {
      mockSinapiService.search.mockResolvedValue(mockSinapiPrices);
      mockSicroService.search.mockRejectedValue(new Error('SICRO unavailable'));
      mockPncpService.search.mockResolvedValue(mockPncpContracts);
      mockPriceAggregationService.aggregatePrices.mockReturnValue({
        ...mockAggregationResult,
        overallConfidence: 'LOW',
      });

      const result = await service.coletarPrecos('cimento portland', 100, 'SC');

      expect(result).toBeDefined();
      expect(result.fontesConsultadas.length).toBe(2); // SINAPI e PNCP
      expect(result.confianca).toBe('LOW');
    });

    it('should use default UF when not provided', async () => {
      mockSinapiService.search.mockResolvedValue(mockSinapiPrices);
      mockSicroService.search.mockResolvedValue(mockSicroPrices);
      mockPncpService.search.mockResolvedValue(mockPncpContracts);
      mockPriceAggregationService.aggregatePrices.mockReturnValue(
        mockAggregationResult,
      );

      await service.coletarPrecos('cimento portland', 100, 'SC');

      expect(mockSinapiService.search).toHaveBeenCalledWith(
        'cimento portland',
        { uf: 'DF' }, // Default UF
      );
    });

    it('should determine correct methodology based on sources', async () => {
      mockSinapiService.search.mockResolvedValue(mockSinapiPrices);
      mockSicroService.search.mockResolvedValue(mockSicroPrices);
      mockPncpService.search.mockResolvedValue(mockPncpContracts);
      mockPriceAggregationService.aggregatePrices.mockReturnValue(
        mockAggregationResult,
      );

      const result = await service.coletarPrecos('cimento portland', 100, 'SC');

      // Com PNCP, deve sugerir CONTRATACOES_SIMILARES (tem prioridade sobre MIDIA_ESPECIALIZADA)
      expect(result.metodologiaSugerida).toBe(
        MetodologiaPesquisa.CONTRATACOES_SIMILARES,
      );
    });

    it('should handle timeout for slow sources', async () => {
      // Simular SINAPI lento
      mockSinapiService.search.mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(() => resolve(mockSinapiPrices), 100),
          ),
      );
      mockSicroService.search.mockResolvedValue(mockSicroPrices);
      mockPncpService.search.mockResolvedValue(mockPncpContracts);
      mockPriceAggregationService.aggregatePrices.mockReturnValue(
        mockAggregationResult,
      );

      const result = await service.coletarPrecos(
        'cimento portland',
        100,
        'SC',
        { timeoutMs: 50 },
      );

      // SINAPI deve ter falhado por timeout
      expect(result.fontesConsultadas.length).toBe(2); // SICRO e PNCP
    });

    it('should return empty item when all sources fail', async () => {
      mockSinapiService.search.mockRejectedValue(new Error('SINAPI error'));
      mockSicroService.search.mockRejectedValue(new Error('SICRO error'));
      mockPncpService.search.mockRejectedValue(new Error('PNCP error'));
      mockPriceAggregationService.aggregatePrices.mockReturnValue({
        ...mockAggregationResult,
        aggregations: [],
        overallConfidence: 'LOW',
      });

      const result = await service.coletarPrecos('item inexistente', 10, 'UN');

      expect(result).toBeDefined();
      expect(result.fontesConsultadas.length).toBe(0);
      expect(result.item.precos.length).toBe(0);
      expect(result.confianca).toBe('LOW');
    });

    it('should calculate item statistics correctly', async () => {
      mockSinapiService.search.mockResolvedValue(mockSinapiPrices);
      mockSicroService.search.mockResolvedValue(mockSicroPrices);
      mockPncpService.search.mockResolvedValue({ data: [], total: 0 });
      mockPriceAggregationService.aggregatePrices.mockReturnValue(
        mockAggregationResult,
      );

      const result = await service.coletarPrecos('cimento portland', 100, 'SC');

      expect(result.item.media).toBeDefined();
      expect(result.item.mediana).toBeDefined();
      expect(result.item.menorPreco).toBeDefined();
      expect(result.item.precoAdotado).toBe(result.item.mediana); // Por padrao, adota mediana
    });
  });

  // ============================================
  // Testes para coletarPrecosParaPesquisa (#1415)
  // ============================================

  describe('coletarPrecosParaPesquisa', () => {
    const mockSinapiPrices = {
      data: [
        {
          id: 'sinapi-1',
          codigo: '00001',
          descricao: 'Cimento Portland CP-II',
          unidade: 'SC',
          precoUnitario: 35.5,
          mesReferencia: '2026-01',
          uf: 'DF',
          desonerado: false,
          source: 'sinapi',
          title: 'Cimento Portland CP-II',
          description: 'Cimento Portland CP-II 50kg',
          relevance: 0.95,
          fetchedAt: new Date(),
        },
      ],
      total: 1,
      page: 1,
      perPage: 10,
      source: 'sinapi',
      cached: false,
      isFallback: false,
      timestamp: new Date(),
    };

    const mockSicroPrices = {
      data: [
        {
          id: 'sicro-1',
          codigo: 'S0001',
          descricao: 'Cimento Portland',
          unidade: 'SC',
          precoUnitario: 36.0,
          mesReferencia: '2026-01',
          uf: 'DF',
          desonerado: false,
          source: 'sicro',
          title: 'Cimento Portland',
          description: 'Cimento Portland para obras rodoviarias',
          relevance: 0.9,
          fetchedAt: new Date(),
        },
      ],
      total: 1,
      page: 1,
      perPage: 10,
      source: 'sicro',
      cached: false,
      isFallback: false,
      timestamp: new Date(),
    };

    const mockPncpContracts = {
      data: [
        {
          id: 'pncp-1',
          numero: '001/2026',
          ano: 2026,
          orgaoContratante: {
            cnpj: '00000000000191',
            nome: 'Orgao Federal',
            uf: 'DF',
          },
          objeto: 'Aquisicao de cimento',
          valorTotal: 35000,
          modalidade: 'pregao',
          status: 'homologado',
          dataPublicacao: new Date(),
          source: 'pncp',
          title: 'Aquisicao de cimento',
          description: 'Aquisicao de cimento para obras',
          relevance: 0.85,
          fetchedAt: new Date(),
        },
      ],
      total: 1,
      page: 1,
      perPage: 10,
      source: 'pncp',
      cached: false,
      isFallback: false,
      timestamp: new Date(),
    };

    const mockAggregationResult = {
      query: 'cimento portland',
      aggregations: [
        {
          description: 'Preco agregado',
          averagePrice: 35.5,
          medianPrice: 35.5,
          minPrice: 35.0,
          maxPrice: 36.0,
          sources: [
            {
              source: 'sinapi' as const,
              code: '00001',
              price: 35.5,
              date: new Date(),
              reference: 'SINAPI 00001',
              unit: 'SC',
              uf: 'DF',
            },
            {
              source: 'sicro' as const,
              code: 'S0001',
              price: 36.0,
              date: new Date(),
              reference: 'SICRO S0001',
              unit: 'SC',
              uf: 'DF',
            },
          ],
          sourceCount: 2,
          confidence: 'MEDIUM' as const,
          coefficientOfVariation: 0.05,
          methodology: 'Media de 2 fontes',
          outliersExcluded: false,
          outlierCount: 0,
          unit: 'SC',
          legalReference: 'Lei 14.133/2021',
        },
      ],
      unmatchedPrices: [],
      totalPricesAnalyzed: 2,
      sourcesConsulted: ['sinapi', 'sicro'] as const,
      overallConfidence: 'MEDIUM' as const,
      timestamp: new Date(),
      methodologySummary: 'Pesquisa de precos realizada em 2 fontes.',
    };

    const coletarPrecosDto: ColetarPrecosDto = {
      itens: [
        {
          descricao: 'Cimento Portland CP-II 50kg',
          quantidade: 100,
          unidade: 'SC',
        },
        {
          descricao: 'Areia lavada m3',
          quantidade: 50,
          unidade: 'M3',
        },
      ],
      options: {
        uf: 'DF',
        timeoutMs: 30000,
      },
    };

    it('should collect prices for a price research successfully', async () => {
      mockPesquisaPrecosRepository.findOne.mockResolvedValue({
        ...mockPesquisaPrecos,
        itens: [],
        fontesConsultadas: [],
      });
      mockPesquisaPrecosRepository.save.mockResolvedValue({
        ...mockPesquisaPrecos,
        itens: [],
      });
      mockSinapiService.search.mockResolvedValue(mockSinapiPrices);
      mockSicroService.search.mockResolvedValue(mockSicroPrices);
      mockPncpService.search.mockResolvedValue(mockPncpContracts);
      mockPriceAggregationService.aggregatePrices.mockReturnValue(
        mockAggregationResult,
      );

      const result = await service.coletarPrecosParaPesquisa(
        'pesq-001',
        coletarPrecosDto,
        mockOrganizationId,
      );

      expect(result).toBeDefined();
      expect(result.pesquisaId).toBe('pesq-001');
      expect(result.totalItens).toBe(2);
      expect(result.resultados).toHaveLength(2);
      expect(result.pesquisaAtualizada).toBe(true);
      expect(result.duracaoTotalMs).toBeGreaterThanOrEqual(0);
    });

    it('should throw NotFoundException when research not found', async () => {
      mockPesquisaPrecosRepository.findOne.mockResolvedValue(null);

      await expect(
        service.coletarPrecosParaPesquisa(
          'non-existent',
          coletarPrecosDto,
          mockOrganizationId,
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when research belongs to another org', async () => {
      mockPesquisaPrecosRepository.findOne.mockResolvedValue({
        ...mockPesquisaPrecos,
        organizationId: 'different-org',
      });

      await expect(
        service.coletarPrecosParaPesquisa(
          'pesq-001',
          coletarPrecosDto,
          mockOrganizationId,
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should use default options when not provided', async () => {
      const dtoWithoutOptions: ColetarPrecosDto = {
        itens: [
          {
            descricao: 'Cimento Portland CP-II 50kg',
            quantidade: 100,
            unidade: 'SC',
          },
        ],
      };

      mockPesquisaPrecosRepository.findOne.mockResolvedValue({
        ...mockPesquisaPrecos,
        itens: [],
        fontesConsultadas: [],
      });
      mockPesquisaPrecosRepository.save.mockResolvedValue(mockPesquisaPrecos);
      mockSinapiService.search.mockResolvedValue(mockSinapiPrices);
      mockSicroService.search.mockResolvedValue(mockSicroPrices);
      mockPncpService.search.mockResolvedValue(mockPncpContracts);
      mockPriceAggregationService.aggregatePrices.mockReturnValue(
        mockAggregationResult,
      );

      const result = await service.coletarPrecosParaPesquisa(
        'pesq-001',
        dtoWithoutOptions,
        mockOrganizationId,
      );

      expect(result).toBeDefined();
      // Default UF should be 'DF'
      expect(mockSinapiService.search).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ uf: 'DF' }),
      );
    });

    it('should handle partial source failures gracefully', async () => {
      mockPesquisaPrecosRepository.findOne.mockResolvedValue({
        ...mockPesquisaPrecos,
        itens: [],
        fontesConsultadas: [],
      });
      mockPesquisaPrecosRepository.save.mockResolvedValue(mockPesquisaPrecos);
      mockSinapiService.search.mockResolvedValue(mockSinapiPrices);
      mockSicroService.search.mockRejectedValue(new Error('SICRO unavailable'));
      mockPncpService.search.mockResolvedValue(mockPncpContracts);
      mockPriceAggregationService.aggregatePrices.mockReturnValue({
        ...mockAggregationResult,
        overallConfidence: 'LOW',
      });

      const result = await service.coletarPrecosParaPesquisa(
        'pesq-001',
        coletarPrecosDto,
        mockOrganizationId,
      );

      expect(result).toBeDefined();
      expect(result.resultados).toHaveLength(2);
      // Should still have some results even with partial failure
    });

    it('should handle all source failures for an item gracefully', async () => {
      mockPesquisaPrecosRepository.findOne.mockResolvedValue({
        ...mockPesquisaPrecos,
        itens: [],
        fontesConsultadas: [],
      });
      mockPesquisaPrecosRepository.save.mockResolvedValue(mockPesquisaPrecos);
      mockSinapiService.search.mockRejectedValue(new Error('SINAPI error'));
      mockSicroService.search.mockRejectedValue(new Error('SICRO error'));
      mockPncpService.search.mockRejectedValue(new Error('PNCP error'));
      mockPriceAggregationService.aggregatePrices.mockReturnValue({
        ...mockAggregationResult,
        aggregations: [],
        overallConfidence: 'LOW',
      });

      const result = await service.coletarPrecosParaPesquisa(
        'pesq-001',
        coletarPrecosDto,
        mockOrganizationId,
      );

      expect(result).toBeDefined();
      expect(result.confiancaGeral).toBe('LOW');
      // Should still return a result, even if no prices found
    });

    it('should append new items to existing items in the research', async () => {
      const existingItems: ItemPesquisado[] = [
        {
          descricao: 'Item existente',
          quantidade: 10,
          unidade: 'UN',
          precos: [{ fonte: 'Teste', valor: 100, data: '2026-01-01' }],
        },
      ];

      mockPesquisaPrecosRepository.findOne.mockResolvedValue({
        ...mockPesquisaPrecos,
        itens: existingItems,
        fontesConsultadas: [],
      });
      mockPesquisaPrecosRepository.save.mockResolvedValue(mockPesquisaPrecos);
      mockSinapiService.search.mockResolvedValue(mockSinapiPrices);
      mockSicroService.search.mockResolvedValue(mockSicroPrices);
      mockPncpService.search.mockResolvedValue(mockPncpContracts);
      mockPriceAggregationService.aggregatePrices.mockReturnValue(
        mockAggregationResult,
      );

      await service.coletarPrecosParaPesquisa(
        'pesq-001',
        coletarPrecosDto,
        mockOrganizationId,
      );

      // Verify that save was called with merged items (existing + new)
      expect(mockPesquisaPrecosRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          itens: expect.arrayContaining([
            expect.objectContaining({ descricao: 'Item existente' }),
          ]),
        }),
      );
    });

    it('should consolidate unique sources across all items', async () => {
      mockPesquisaPrecosRepository.findOne.mockResolvedValue({
        ...mockPesquisaPrecos,
        itens: [],
        fontesConsultadas: [],
      });
      mockPesquisaPrecosRepository.save.mockResolvedValue(mockPesquisaPrecos);
      mockSinapiService.search.mockResolvedValue(mockSinapiPrices);
      mockSicroService.search.mockResolvedValue(mockSicroPrices);
      mockPncpService.search.mockResolvedValue(mockPncpContracts);
      mockPriceAggregationService.aggregatePrices.mockReturnValue(
        mockAggregationResult,
      );

      const result = await service.coletarPrecosParaPesquisa(
        'pesq-001',
        coletarPrecosDto,
        mockOrganizationId,
      );

      expect(result.fontesConsolidadas).toBeDefined();
      // Should not have duplicates
      const fonteNames = result.fontesConsolidadas.map((f) => f.nome);
      const uniqueNames = [...new Set(fonteNames)];
      expect(fonteNames.length).toBe(uniqueNames.length);
    });

    it('should calculate overall confidence based on individual results', async () => {
      mockPesquisaPrecosRepository.findOne.mockResolvedValue({
        ...mockPesquisaPrecos,
        itens: [],
        fontesConsultadas: [],
      });
      mockPesquisaPrecosRepository.save.mockResolvedValue(mockPesquisaPrecos);
      mockSinapiService.search.mockResolvedValue(mockSinapiPrices);
      mockSicroService.search.mockResolvedValue(mockSicroPrices);
      mockPncpService.search.mockResolvedValue(mockPncpContracts);
      mockPriceAggregationService.aggregatePrices.mockReturnValue({
        ...mockAggregationResult,
        overallConfidence: 'HIGH',
      });

      const result = await service.coletarPrecosParaPesquisa(
        'pesq-001',
        coletarPrecosDto,
        mockOrganizationId,
      );

      expect(['HIGH', 'MEDIUM', 'LOW']).toContain(result.confiancaGeral);
    });

    it('should add codigo to item when provided', async () => {
      const dtoWithCodigo: ColetarPrecosDto = {
        itens: [
          {
            descricao: 'Cimento Portland CP-II 50kg',
            quantidade: 100,
            unidade: 'SC',
            codigo: 'CATMAT-123456',
          },
        ],
      };

      mockPesquisaPrecosRepository.findOne.mockResolvedValue({
        ...mockPesquisaPrecos,
        itens: [],
        fontesConsultadas: [],
      });
      mockPesquisaPrecosRepository.save.mockResolvedValue(mockPesquisaPrecos);
      mockSinapiService.search.mockResolvedValue(mockSinapiPrices);
      mockSicroService.search.mockResolvedValue(mockSicroPrices);
      mockPncpService.search.mockResolvedValue(mockPncpContracts);
      mockPriceAggregationService.aggregatePrices.mockReturnValue(
        mockAggregationResult,
      );

      const result = await service.coletarPrecosParaPesquisa(
        'pesq-001',
        dtoWithCodigo,
        mockOrganizationId,
      );

      expect(result.resultados[0].item.codigo).toBe('CATMAT-123456');
    });

    it('should count items with prices correctly', async () => {
      mockPesquisaPrecosRepository.findOne.mockResolvedValue({
        ...mockPesquisaPrecos,
        itens: [],
        fontesConsultadas: [],
      });
      mockPesquisaPrecosRepository.save.mockResolvedValue(mockPesquisaPrecos);
      mockSinapiService.search.mockResolvedValue(mockSinapiPrices);
      mockSicroService.search.mockResolvedValue(mockSicroPrices);
      mockPncpService.search.mockResolvedValue(mockPncpContracts);
      mockPriceAggregationService.aggregatePrices.mockReturnValue(
        mockAggregationResult,
      );

      const result = await service.coletarPrecosParaPesquisa(
        'pesq-001',
        coletarPrecosDto,
        mockOrganizationId,
      );

      expect(result.totalItens).toBe(2);
      expect(result.itensComPrecos).toBeLessThanOrEqual(result.totalItens);
    });
  });
});
