import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { PesquisaPrecosController } from './pesquisa-precos.controller';
import { PesquisaPrecosService } from './pesquisa-precos.service';
import {
  PesquisaPrecos,
  PesquisaPrecosStatus,
  MetodologiaPesquisa,
} from '../../entities/pesquisa-precos.entity';
import { CreatePesquisaPrecosDto } from './dto/create-pesquisa-precos.dto';
import { UpdatePesquisaPrecosDto } from './dto/update-pesquisa-precos.dto';
import {
  ColetarPrecosDto,
  ColetaPrecosResultDto,
} from './dto/coletar-precos.dto';
import {
  GerarJustificativaDto,
  JustificativaGeradaDto,
  TipoContratacao,
} from './dto/gerar-justificativa.dto';

describe('PesquisaPrecosController', () => {
  let controller: PesquisaPrecosController;
  let service: PesquisaPrecosService;

  const mockOrganizationId = 'org-123';
  const mockUserId = 'user-456';

  const mockUser = {
    id: mockUserId,
    organizationId: mockOrganizationId,
    email: 'test@example.com',
    role: 'consultant',
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

  const mockService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    coletarPrecosParaPesquisa: jest.fn(),
    gerarMapaComparativo: jest.fn(),
    gerarJustificativaMetodologia: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PesquisaPrecosController],
      providers: [
        {
          provide: PesquisaPrecosService,
          useValue: mockService,
        },
      ],
    }).compile();

    controller = module.get<PesquisaPrecosController>(PesquisaPrecosController);
    service = module.get<PesquisaPrecosService>(PesquisaPrecosService);

    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a price research', async () => {
      const createDto: CreatePesquisaPrecosDto = {
        titulo: 'Nova Pesquisa',
        metodologia: MetodologiaPesquisa.PAINEL_PRECOS,
      };

      mockService.create.mockResolvedValue(mockPesquisaPrecos);

      const result = await controller.create(createDto, mockUser);

      expect(result).toEqual(mockPesquisaPrecos);
      expect(mockService.create).toHaveBeenCalledWith(
        createDto,
        mockUser.id,
        mockUser.organizationId,
      );
    });
  });

  describe('findAll', () => {
    it('should return all price researches', async () => {
      mockService.findAll.mockResolvedValue([mockPesquisaPrecos]);

      const result = await controller.findAll(mockUser);

      expect(result).toEqual([mockPesquisaPrecos]);
      expect(mockService.findAll).toHaveBeenCalledWith(
        mockUser.organizationId,
        undefined,
        undefined,
        undefined,
      );
    });

    it('should filter by etpId', async () => {
      mockService.findAll.mockResolvedValue([mockPesquisaPrecos]);

      await controller.findAll(mockUser, 'etp-123');

      expect(mockService.findAll).toHaveBeenCalledWith(
        mockUser.organizationId,
        'etp-123',
        undefined,
        undefined,
      );
    });

    it('should filter by termoReferenciaId', async () => {
      mockService.findAll.mockResolvedValue([mockPesquisaPrecos]);

      await controller.findAll(mockUser, undefined, 'tr-123');

      expect(mockService.findAll).toHaveBeenCalledWith(
        mockUser.organizationId,
        undefined,
        'tr-123',
        undefined,
      );
    });

    it('should filter by status', async () => {
      mockService.findAll.mockResolvedValue([mockPesquisaPrecos]);

      await controller.findAll(
        mockUser,
        undefined,
        undefined,
        PesquisaPrecosStatus.COMPLETED,
      );

      expect(mockService.findAll).toHaveBeenCalledWith(
        mockUser.organizationId,
        undefined,
        undefined,
        PesquisaPrecosStatus.COMPLETED,
      );
    });
  });

  describe('findOne', () => {
    it('should return a price research by id', async () => {
      mockService.findOne.mockResolvedValue(mockPesquisaPrecos);

      const result = await controller.findOne('pesq-001', mockUser);

      expect(result).toEqual(mockPesquisaPrecos);
      expect(mockService.findOne).toHaveBeenCalledWith(
        'pesq-001',
        mockUser.organizationId,
      );
    });

    it('should throw NotFoundException when not found', async () => {
      mockService.findOne.mockRejectedValue(new NotFoundException());

      await expect(
        controller.findOne('non-existent', mockUser),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when belongs to another org', async () => {
      mockService.findOne.mockRejectedValue(new ForbiddenException());

      await expect(controller.findOne('pesq-001', mockUser)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('update', () => {
    it('should update a price research', async () => {
      const updateDto: UpdatePesquisaPrecosDto = {
        titulo: 'Pesquisa Atualizada',
      };

      const updatedPesquisa = { ...mockPesquisaPrecos, ...updateDto };
      mockService.update.mockResolvedValue(updatedPesquisa);

      const result = await controller.update('pesq-001', updateDto, mockUser);

      expect(result.titulo).toBe(updateDto.titulo);
      expect(mockService.update).toHaveBeenCalledWith(
        'pesq-001',
        updateDto,
        mockUser.organizationId,
      );
    });
  });

  describe('remove', () => {
    it('should remove a price research', async () => {
      mockService.remove.mockResolvedValue(undefined);

      await controller.remove('pesq-001', mockUser);

      expect(mockService.remove).toHaveBeenCalledWith(
        'pesq-001',
        mockUser.organizationId,
      );
    });

    it('should throw NotFoundException when not found', async () => {
      mockService.remove.mockRejectedValue(new NotFoundException());

      await expect(controller.remove('non-existent', mockUser)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ============================================
  // Testes para coletarPrecos (#1415)
  // ============================================

  describe('coletarPrecos', () => {
    const mockColetarPrecosDto: ColetarPrecosDto = {
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

    const mockColetaResult: ColetaPrecosResultDto = {
      pesquisaId: 'pesq-001',
      resultados: [
        {
          item: {
            descricao: 'Cimento Portland CP-II 50kg',
            quantidade: 100,
            unidade: 'SC',
            precos: [
              { fonte: 'SINAPI', valor: 35.5, data: '2026-01-11' },
              { fonte: 'SICRO', valor: 36.0, data: '2026-01-11' },
            ],
            media: 35.75,
            mediana: 35.75,
            menorPreco: 35.5,
            precoAdotado: 35.75,
          },
          fontesConsultadas: [
            {
              tipo: MetodologiaPesquisa.MIDIA_ESPECIALIZADA,
              nome: 'SINAPI',
              dataConsulta: '2026-01-11',
            },
            {
              tipo: MetodologiaPesquisa.MIDIA_ESPECIALIZADA,
              nome: 'SICRO',
              dataConsulta: '2026-01-11',
            },
          ],
          totalFontes: 2,
          confianca: 'MEDIUM',
          metodologiaSugerida: MetodologiaPesquisa.MIDIA_ESPECIALIZADA,
          duracaoMs: 1500,
        },
      ],
      totalItens: 2,
      itensComPrecos: 1,
      fontesConsolidadas: [
        {
          tipo: MetodologiaPesquisa.MIDIA_ESPECIALIZADA,
          nome: 'SINAPI',
          dataConsulta: '2026-01-11',
        },
      ],
      confiancaGeral: 'MEDIUM',
      duracaoTotalMs: 3000,
      pesquisaAtualizada: true,
    };

    it('should collect prices for a price research', async () => {
      mockService.coletarPrecosParaPesquisa.mockResolvedValue(mockColetaResult);

      const result = await controller.coletarPrecos(
        'pesq-001',
        mockColetarPrecosDto,
        mockUser,
      );

      expect(result).toEqual(mockColetaResult);
      expect(mockService.coletarPrecosParaPesquisa).toHaveBeenCalledWith(
        'pesq-001',
        mockColetarPrecosDto,
        mockUser.organizationId,
      );
    });

    it('should throw NotFoundException when research not found', async () => {
      mockService.coletarPrecosParaPesquisa.mockRejectedValue(
        new NotFoundException('Price research not found'),
      );

      await expect(
        controller.coletarPrecos(
          'non-existent',
          mockColetarPrecosDto,
          mockUser,
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when research belongs to another org', async () => {
      mockService.coletarPrecosParaPesquisa.mockRejectedValue(
        new ForbiddenException('No permission'),
      );

      await expect(
        controller.coletarPrecos('pesq-001', mockColetarPrecosDto, mockUser),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should collect prices with default options', async () => {
      const dtoWithoutOptions: ColetarPrecosDto = {
        itens: [
          {
            descricao: 'Cimento Portland CP-II 50kg',
            quantidade: 100,
            unidade: 'SC',
          },
        ],
      };

      mockService.coletarPrecosParaPesquisa.mockResolvedValue(mockColetaResult);

      await controller.coletarPrecos('pesq-001', dtoWithoutOptions, mockUser);

      expect(mockService.coletarPrecosParaPesquisa).toHaveBeenCalledWith(
        'pesq-001',
        dtoWithoutOptions,
        mockUser.organizationId,
      );
    });

    it('should handle partial collection failures gracefully', async () => {
      const partialResult: ColetaPrecosResultDto = {
        ...mockColetaResult,
        itensComPrecos: 1,
        totalItens: 2,
        confiancaGeral: 'LOW',
      };

      mockService.coletarPrecosParaPesquisa.mockResolvedValue(partialResult);

      const result = await controller.coletarPrecos(
        'pesq-001',
        mockColetarPrecosDto,
        mockUser,
      );

      expect(result.itensComPrecos).toBe(1);
      expect(result.totalItens).toBe(2);
      expect(result.confiancaGeral).toBe('LOW');
    });

    it('should collect prices with custom UF option', async () => {
      const dtoWithCustomUf: ColetarPrecosDto = {
        itens: [
          {
            descricao: 'Cimento Portland CP-II 50kg',
            quantidade: 100,
            unidade: 'SC',
          },
        ],
        options: {
          uf: 'SP',
        },
      };

      mockService.coletarPrecosParaPesquisa.mockResolvedValue(mockColetaResult);

      await controller.coletarPrecos('pesq-001', dtoWithCustomUf, mockUser);

      expect(mockService.coletarPrecosParaPesquisa).toHaveBeenCalledWith(
        'pesq-001',
        expect.objectContaining({
          options: expect.objectContaining({ uf: 'SP' }),
        }),
        mockUser.organizationId,
      );
    });
  });

  // ============================================
  // Testes para gerarJustificativa (#1258)
  // ============================================

  describe('gerarJustificativa', () => {
    const mockJustificativaResult: JustificativaGeradaDto = {
      pesquisaId: 'pesq-001',
      justificativa:
        'A pesquisa de precos foi realizada em conformidade com a IN SEGES/ME n 65/2021...',
      fontesUtilizadas: ['SINAPI', 'PNCP'],
      artigosReferenciados: ['Art. 5, II', 'Art. 5, III', 'Art. 6'],
      pesquisaAtualizada: true,
      duracaoMs: 150,
    };

    it('should generate justificativa successfully', async () => {
      mockService.gerarJustificativaMetodologia.mockResolvedValue(
        mockJustificativaResult,
      );

      const dto: GerarJustificativaDto = {};

      const result = await controller.gerarJustificativa(
        'pesq-001',
        dto,
        mockUser,
      );

      expect(result).toEqual(mockJustificativaResult);
      expect(mockService.gerarJustificativaMetodologia).toHaveBeenCalledWith(
        'pesq-001',
        dto,
        mockUser.organizationId,
      );
    });

    it('should generate justificativa with context', async () => {
      mockService.gerarJustificativaMetodologia.mockResolvedValue(
        mockJustificativaResult,
      );

      const dto: GerarJustificativaDto = {
        tipoContratacao: TipoContratacao.TI,
        valorEstimado: 250000,
        objeto: 'Aquisicao de servidores para datacenter',
        criterioAceitabilidade: 'mediana',
      };

      const result = await controller.gerarJustificativa(
        'pesq-001',
        dto,
        mockUser,
      );

      expect(result).toBeDefined();
      expect(mockService.gerarJustificativaMetodologia).toHaveBeenCalledWith(
        'pesq-001',
        dto,
        mockUser.organizationId,
      );
    });

    it('should throw NotFoundException when research not found', async () => {
      mockService.gerarJustificativaMetodologia.mockRejectedValue(
        new NotFoundException('Price research not found'),
      );

      await expect(
        controller.gerarJustificativa('non-existent', {}, mockUser),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when research belongs to another org', async () => {
      mockService.gerarJustificativaMetodologia.mockRejectedValue(
        new ForbiddenException('No permission'),
      );

      await expect(
        controller.gerarJustificativa('pesq-001', {}, mockUser),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should return fontes utilizadas', async () => {
      mockService.gerarJustificativaMetodologia.mockResolvedValue(
        mockJustificativaResult,
      );

      const result = await controller.gerarJustificativa(
        'pesq-001',
        {},
        mockUser,
      );

      expect(result.fontesUtilizadas).toContain('SINAPI');
      expect(result.fontesUtilizadas).toContain('PNCP');
    });

    it('should return artigos referenciados', async () => {
      mockService.gerarJustificativaMetodologia.mockResolvedValue(
        mockJustificativaResult,
      );

      const result = await controller.gerarJustificativa(
        'pesq-001',
        {},
        mockUser,
      );

      expect(result.artigosReferenciados).toContain('Art. 5, II');
      expect(result.artigosReferenciados).toContain('Art. 5, III');
      expect(result.artigosReferenciados).toContain('Art. 6');
    });

    it('should indicate pesquisa was updated', async () => {
      mockService.gerarJustificativaMetodologia.mockResolvedValue(
        mockJustificativaResult,
      );

      const result = await controller.gerarJustificativa(
        'pesq-001',
        {},
        mockUser,
      );

      expect(result.pesquisaAtualizada).toBe(true);
    });

    it('should return duracao in ms', async () => {
      mockService.gerarJustificativaMetodologia.mockResolvedValue(
        mockJustificativaResult,
      );

      const result = await controller.gerarJustificativa(
        'pesq-001',
        {},
        mockUser,
      );

      expect(result.duracaoMs).toBeGreaterThanOrEqual(0);
    });

    it('should handle different tipoContratacao values', async () => {
      mockService.gerarJustificativaMetodologia.mockResolvedValue(
        mockJustificativaResult,
      );

      const tipos = [
        TipoContratacao.OBRAS,
        TipoContratacao.SERVICOS,
        TipoContratacao.MATERIAIS,
        TipoContratacao.TI,
        TipoContratacao.CONSULTORIA,
        TipoContratacao.OUTRO,
      ];

      for (const tipo of tipos) {
        const dto: GerarJustificativaDto = { tipoContratacao: tipo };
        await controller.gerarJustificativa('pesq-001', dto, mockUser);

        expect(mockService.gerarJustificativaMetodologia).toHaveBeenCalledWith(
          'pesq-001',
          expect.objectContaining({ tipoContratacao: tipo }),
          mockUser.organizationId,
        );
      }
    });

    it('should handle different criterioAceitabilidade values', async () => {
      mockService.gerarJustificativaMetodologia.mockResolvedValue(
        mockJustificativaResult,
      );

      const criterios: Array<'media' | 'mediana' | 'menor_preco'> = [
        'media',
        'mediana',
        'menor_preco',
      ];

      for (const criterio of criterios) {
        const dto: GerarJustificativaDto = { criterioAceitabilidade: criterio };
        await controller.gerarJustificativa('pesq-001', dto, mockUser);

        expect(mockService.gerarJustificativaMetodologia).toHaveBeenCalledWith(
          'pesq-001',
          expect.objectContaining({ criterioAceitabilidade: criterio }),
          mockUser.organizationId,
        );
      }
    });
  });
});
