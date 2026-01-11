import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TermoReferenciaService } from './termo-referencia.service';
import {
  TermoReferencia,
  TermoReferenciaStatus,
} from '../../entities/termo-referencia.entity';
import { Etp, EtpStatus } from '../../entities/etp.entity';
import { CreateTermoReferenciaDto } from './dto/create-termo-referencia.dto';
import { UpdateTermoReferenciaDto } from './dto/update-termo-referencia.dto';
import { OpenAIService } from '../orchestrator/llm/openai.service';

describe('TermoReferenciaService', () => {
  let service: TermoReferenciaService;
  let termoReferenciaRepository: Repository<TermoReferencia>;
  let etpRepository: Repository<Etp>;
  let openAIService: OpenAIService;

  const mockOrganizationId = 'org-123';
  const mockUserId = 'user-456';
  const mockEtpId = 'etp-789';

  const mockEtp: Partial<Etp> = {
    id: mockEtpId,
    organizationId: mockOrganizationId,
    title: 'ETP de Teste',
    objeto: 'Objeto do ETP',
    status: EtpStatus.COMPLETED,
    description: 'Descricao do ETP',
    justificativaContratacao: 'Justificativa da contratacao',
    valorEstimado: 100000,
    prazoExecucao: 365,
    requisitosTecnicos: 'Requisitos tecnicos',
    requisitosQualificacao: 'Requisitos de qualificacao',
    nivelRisco: 'MEDIO' as any,
    descricaoRiscos: 'Riscos identificados',
    templateType: 'TI' as any,
  };

  const mockCompletedEtp: Partial<Etp> = {
    ...mockEtp,
    status: EtpStatus.COMPLETED,
  };

  const mockTermoReferencia: Partial<TermoReferencia> = {
    id: 'tr-001',
    etpId: mockEtpId,
    organizationId: mockOrganizationId,
    objeto: 'Contratacao de servicos de TI',
    status: TermoReferenciaStatus.DRAFT,
    versao: 1,
    createdById: mockUserId,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockLLMResponse = {
    content: JSON.stringify({
      obrigacoesContratante: 'Obrigacoes do contratante geradas por IA',
      obrigacoesContratada: 'Obrigacoes da contratada geradas por IA',
      modeloGestao: 'Modelo de gestao gerado por IA',
      sancoesPenalidades: 'Sancoes geradas por IA',
    }),
    tokens: 500,
    model: 'gpt-4.1-nano',
    finishReason: 'stop',
  };

  const mockTermoReferenciaRepository = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    remove: jest.fn(),
  };

  const mockEtpRepository = {
    findOne: jest.fn(),
  };

  const mockOpenAIService = {
    generateCompletion: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TermoReferenciaService,
        {
          provide: getRepositoryToken(TermoReferencia),
          useValue: mockTermoReferenciaRepository,
        },
        {
          provide: getRepositoryToken(Etp),
          useValue: mockEtpRepository,
        },
        {
          provide: OpenAIService,
          useValue: mockOpenAIService,
        },
      ],
    }).compile();

    service = module.get<TermoReferenciaService>(TermoReferenciaService);
    termoReferenciaRepository = module.get<Repository<TermoReferencia>>(
      getRepositoryToken(TermoReferencia),
    );
    etpRepository = module.get<Repository<Etp>>(getRepositoryToken(Etp));
    openAIService = module.get<OpenAIService>(OpenAIService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const createDto: CreateTermoReferenciaDto = {
      etpId: mockEtpId,
      objeto: 'Contratacao de servicos de TI',
      fundamentacaoLegal: 'Lei 14.133/2021',
    };

    it('should create a termo de referencia successfully', async () => {
      mockEtpRepository.findOne.mockResolvedValue(mockEtp);
      mockTermoReferenciaRepository.create.mockReturnValue(mockTermoReferencia);
      mockTermoReferenciaRepository.save.mockResolvedValue(mockTermoReferencia);

      const result = await service.create(
        createDto,
        mockUserId,
        mockOrganizationId,
      );

      expect(result).toEqual(mockTermoReferencia);
      expect(mockEtpRepository.findOne).toHaveBeenCalledWith({
        where: { id: mockEtpId },
      });
      expect(mockTermoReferenciaRepository.create).toHaveBeenCalledWith({
        ...createDto,
        organizationId: mockOrganizationId,
        createdById: mockUserId,
        status: TermoReferenciaStatus.DRAFT,
        versao: 1,
      });
    });

    it('should throw NotFoundException when ETP does not exist', async () => {
      mockEtpRepository.findOne.mockResolvedValue(null);

      await expect(
        service.create(createDto, mockUserId, mockOrganizationId),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when ETP belongs to different organization', async () => {
      mockEtpRepository.findOne.mockResolvedValue({
        ...mockEtp,
        organizationId: 'other-org',
      });

      await expect(
        service.create(createDto, mockUserId, mockOrganizationId),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('findAllByOrganization', () => {
    it('should return all TRs for an organization', async () => {
      const trs = [
        mockTermoReferencia,
        { ...mockTermoReferencia, id: 'tr-002' },
      ];
      mockTermoReferenciaRepository.find.mockResolvedValue(trs);

      const result = await service.findAllByOrganization(mockOrganizationId);

      expect(result).toEqual(trs);
      expect(mockTermoReferenciaRepository.find).toHaveBeenCalledWith({
        where: { organizationId: mockOrganizationId },
        relations: ['etp', 'createdBy'],
        order: { updatedAt: 'DESC' },
      });
    });

    it('should return empty array when no TRs exist', async () => {
      mockTermoReferenciaRepository.find.mockResolvedValue([]);

      const result = await service.findAllByOrganization(mockOrganizationId);

      expect(result).toEqual([]);
    });
  });

  describe('findByEtp', () => {
    it('should return all TRs for a specific ETP', async () => {
      const trs = [mockTermoReferencia];
      mockTermoReferenciaRepository.find.mockResolvedValue(trs);

      const result = await service.findByEtp(mockEtpId, mockOrganizationId);

      expect(result).toEqual(trs);
      expect(mockTermoReferenciaRepository.find).toHaveBeenCalledWith({
        where: { etpId: mockEtpId, organizationId: mockOrganizationId },
        relations: ['createdBy'],
        order: { versao: 'DESC' },
      });
    });
  });

  describe('findOne', () => {
    it('should return a TR by id', async () => {
      mockTermoReferenciaRepository.findOne.mockResolvedValue(
        mockTermoReferencia,
      );

      const result = await service.findOne('tr-001', mockOrganizationId);

      expect(result).toEqual(mockTermoReferencia);
      expect(mockTermoReferenciaRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'tr-001' },
        relations: ['etp', 'createdBy', 'organization'],
      });
    });

    it('should throw NotFoundException when TR does not exist', async () => {
      mockTermoReferenciaRepository.findOne.mockResolvedValue(null);

      await expect(
        service.findOne('nonexistent', mockOrganizationId),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when TR belongs to different organization', async () => {
      mockTermoReferenciaRepository.findOne.mockResolvedValue({
        ...mockTermoReferencia,
        organizationId: 'other-org',
      });

      await expect(
        service.findOne('tr-001', mockOrganizationId),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('update', () => {
    const updateDto: UpdateTermoReferenciaDto = {
      objeto: 'Objeto atualizado',
      status: TermoReferenciaStatus.REVIEW,
    };

    it('should update a TR successfully', async () => {
      mockTermoReferenciaRepository.findOne.mockResolvedValue(
        mockTermoReferencia,
      );
      mockTermoReferenciaRepository.save.mockResolvedValue({
        ...mockTermoReferencia,
        ...updateDto,
      });

      const result = await service.update(
        'tr-001',
        updateDto,
        mockOrganizationId,
      );

      expect(result.objeto).toBe(updateDto.objeto);
      expect(result.status).toBe(updateDto.status);
    });

    it('should throw NotFoundException when TR does not exist', async () => {
      mockTermoReferenciaRepository.findOne.mockResolvedValue(null);

      await expect(
        service.update('nonexistent', updateDto, mockOrganizationId),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('should remove a TR successfully', async () => {
      mockTermoReferenciaRepository.findOne.mockResolvedValue(
        mockTermoReferencia,
      );
      mockTermoReferenciaRepository.remove.mockResolvedValue(undefined);

      await expect(
        service.remove('tr-001', mockOrganizationId),
      ).resolves.not.toThrow();

      expect(mockTermoReferenciaRepository.remove).toHaveBeenCalledWith(
        mockTermoReferencia,
      );
    });

    it('should throw NotFoundException when TR does not exist', async () => {
      mockTermoReferenciaRepository.findOne.mockResolvedValue(null);

      await expect(
        service.remove('nonexistent', mockOrganizationId),
      ).rejects.toThrow(NotFoundException);
    });
  });

  /**
   * Tests for generateFromEtp method
   * Issue #1249 - [TR-b] Implementar geracao automatica TR a partir do ETP
   */
  describe('generateFromEtp', () => {
    const mockGeneratedTr: Partial<TermoReferencia> = {
      id: 'tr-generated-001',
      etpId: mockEtpId,
      organizationId: mockOrganizationId,
      objeto: 'Objeto do ETP',
      fundamentacaoLegal:
        'Lei 14.133/2021 (Nova Lei de Licitacoes e Contratos Administrativos); IN SEGES/ME n 94/2022 (Contratacoes de TI)',
      modeloExecucao:
        'Execucao indireta, sob regime de empreitada por preco global, com entregas parciais conforme cronograma acordado.',
      criteriosSelecao:
        'Menor preco global, conforme art. 33 da Lei 14.133/2021.',
      valorEstimado: 100000,
      prazoVigencia: 365,
      obrigacoesContratante: 'Obrigacoes do contratante geradas por IA',
      obrigacoesContratada: 'Obrigacoes da contratada geradas por IA',
      modeloGestao: 'Modelo de gestao gerado por IA',
      sancoesPenalidades: 'Sancoes geradas por IA',
      status: TermoReferenciaStatus.DRAFT,
      versao: 1,
      createdById: mockUserId,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('should generate TR from a completed ETP with AI enhancement', async () => {
      mockEtpRepository.findOne.mockResolvedValue(mockCompletedEtp);
      mockOpenAIService.generateCompletion.mockResolvedValue(mockLLMResponse);
      mockTermoReferenciaRepository.create.mockReturnValue(mockGeneratedTr);
      mockTermoReferenciaRepository.save.mockResolvedValue(mockGeneratedTr);

      const result = await service.generateFromEtp(
        mockEtpId,
        mockUserId,
        mockOrganizationId,
      );

      expect(result).toBeDefined();
      expect(result.id).toBe(mockGeneratedTr.id);
      expect(result.etpId).toBe(mockEtpId);
      expect(result.status).toBe(TermoReferenciaStatus.DRAFT);
      expect(result.versao).toBe(1);
      expect(result.metadata).toBeDefined();
      expect(result.metadata?.aiEnhanced).toBe(true);
      expect(result.metadata?.tokens).toBe(500);

      expect(mockEtpRepository.findOne).toHaveBeenCalledWith({
        where: { id: mockEtpId },
        relations: ['organization', 'template'],
      });
      expect(mockOpenAIService.generateCompletion).toHaveBeenCalled();
    });

    it('should generate TR from ETP in review status', async () => {
      const reviewEtp = { ...mockEtp, status: EtpStatus.REVIEW };
      mockEtpRepository.findOne.mockResolvedValue(reviewEtp);
      mockOpenAIService.generateCompletion.mockResolvedValue(mockLLMResponse);
      mockTermoReferenciaRepository.create.mockReturnValue(mockGeneratedTr);
      mockTermoReferenciaRepository.save.mockResolvedValue(mockGeneratedTr);

      const result = await service.generateFromEtp(
        mockEtpId,
        mockUserId,
        mockOrganizationId,
      );

      expect(result).toBeDefined();
      expect(result.metadata?.aiEnhanced).toBe(true);
    });

    it('should generate TR without AI when AI service fails (graceful degradation)', async () => {
      mockEtpRepository.findOne.mockResolvedValue(mockCompletedEtp);
      mockOpenAIService.generateCompletion.mockRejectedValue(
        new Error('OpenAI unavailable'),
      );
      mockTermoReferenciaRepository.create.mockReturnValue({
        ...mockGeneratedTr,
        obrigacoesContratante: undefined,
        obrigacoesContratada: undefined,
      });
      mockTermoReferenciaRepository.save.mockResolvedValue({
        ...mockGeneratedTr,
        obrigacoesContratante: undefined,
        obrigacoesContratada: undefined,
      });

      const result = await service.generateFromEtp(
        mockEtpId,
        mockUserId,
        mockOrganizationId,
      );

      expect(result).toBeDefined();
      expect(result.metadata?.aiEnhanced).toBe(false);
    });

    it('should throw NotFoundException when ETP does not exist', async () => {
      mockEtpRepository.findOne.mockResolvedValue(null);

      await expect(
        service.generateFromEtp(mockEtpId, mockUserId, mockOrganizationId),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when ETP belongs to different organization', async () => {
      mockEtpRepository.findOne.mockResolvedValue({
        ...mockCompletedEtp,
        organizationId: 'other-org-456',
      });

      await expect(
        service.generateFromEtp(mockEtpId, mockUserId, mockOrganizationId),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw BadRequestException when ETP is in draft status', async () => {
      mockEtpRepository.findOne.mockResolvedValue({
        ...mockEtp,
        status: EtpStatus.DRAFT,
      });

      await expect(
        service.generateFromEtp(mockEtpId, mockUserId, mockOrganizationId),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when ETP is in progress status', async () => {
      mockEtpRepository.findOne.mockResolvedValue({
        ...mockEtp,
        status: EtpStatus.IN_PROGRESS,
      });

      await expect(
        service.generateFromEtp(mockEtpId, mockUserId, mockOrganizationId),
      ).rejects.toThrow(BadRequestException);
    });

    it('should map ETP fields correctly to TR', async () => {
      mockEtpRepository.findOne.mockResolvedValue(mockCompletedEtp);
      mockOpenAIService.generateCompletion.mockResolvedValue(mockLLMResponse);
      mockTermoReferenciaRepository.create.mockImplementation((data) => ({
        id: 'new-tr-id',
        ...data,
        createdAt: new Date(),
        updatedAt: new Date(),
      }));
      mockTermoReferenciaRepository.save.mockImplementation((data) => data);

      const result = await service.generateFromEtp(
        mockEtpId,
        mockUserId,
        mockOrganizationId,
      );

      // Verify field mapping
      expect(result.objeto).toBe(mockCompletedEtp.objeto);
      expect(result.valorEstimado).toBe(mockCompletedEtp.valorEstimado);
      expect(result.prazoVigencia).toBe(mockCompletedEtp.prazoExecucao);
      expect(result.fundamentacaoLegal).toContain('Lei 14.133/2021');
      expect(result.fundamentacaoLegal).toContain('IN SEGES/ME n 94/2022'); // TI template
    });

    it('should include latency in metadata', async () => {
      mockEtpRepository.findOne.mockResolvedValue(mockCompletedEtp);
      mockOpenAIService.generateCompletion.mockResolvedValue(mockLLMResponse);
      mockTermoReferenciaRepository.create.mockReturnValue(mockGeneratedTr);
      mockTermoReferenciaRepository.save.mockResolvedValue(mockGeneratedTr);

      const result = await service.generateFromEtp(
        mockEtpId,
        mockUserId,
        mockOrganizationId,
      );

      expect(result.metadata?.latencyMs).toBeDefined();
      expect(typeof result.metadata?.latencyMs).toBe('number');
      expect(result.metadata?.latencyMs).toBeGreaterThanOrEqual(0);
    });

    it('should handle AI response with markdown code blocks', async () => {
      const markdownResponse = {
        ...mockLLMResponse,
        content: '```json\n' + mockLLMResponse.content + '\n```',
      };
      mockEtpRepository.findOne.mockResolvedValue(mockCompletedEtp);
      mockOpenAIService.generateCompletion.mockResolvedValue(markdownResponse);
      mockTermoReferenciaRepository.create.mockReturnValue(mockGeneratedTr);
      mockTermoReferenciaRepository.save.mockResolvedValue(mockGeneratedTr);

      const result = await service.generateFromEtp(
        mockEtpId,
        mockUserId,
        mockOrganizationId,
      );

      expect(result).toBeDefined();
      expect(result.metadata?.aiEnhanced).toBe(true);
    });
  });
});
