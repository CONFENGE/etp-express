import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EditalGenerationService } from './edital-generation.service';
import {
  Edital,
  EditalStatus,
  EditalModalidade,
  EditalCriterioJulgamento,
  EditalModoDisputa,
} from '../../entities/edital.entity';
import { EditalTemplate, EditalTemplateModalidade } from '../../entities/edital-template.entity';
import { Etp, EtpStatus } from '../../entities/etp.entity';
import { TermoReferencia, TermoReferenciaStatus } from '../../entities/termo-referencia.entity';
import { PesquisaPrecos, PesquisaPrecosStatus, MetodologiaPesquisa } from '../../entities/pesquisa-precos.entity';
import { OpenAIService } from '../orchestrator/llm/openai.service';
import { GenerateEditalDto } from './dto';

/**
 * Testes de integração para EditalGenerationService.
 *
 * Issue #1279 - [Edital-c] Geração automática a partir de ETP+TR+Pesquisa
 * Milestone: M14 - Geração de Edital
 */
describe('EditalGenerationService', () => {
  let service: EditalGenerationService;
  let editalRepository: Repository<Edital>;
  let etpRepository: Repository<Etp>;
  let termoReferenciaRepository: Repository<TermoReferencia>;
  let pesquisaPrecosRepository: Repository<PesquisaPrecos>;
  let editalTemplateRepository: Repository<EditalTemplate>;
  let openAIService: OpenAIService;

  const mockOrganizationId = 'org-123';
  const mockUserId = 'user-456';
  const mockEtpId = 'etp-789';
  const mockTrId = 'tr-001';
  const mockPesquisaId = 'pesquisa-001';

  const mockEtp: Partial<Etp> = {
    id: mockEtpId,
    organizationId: mockOrganizationId,
    title: 'ETP de Teste - Contratação TI',
    objeto: 'Contratação de serviços de desenvolvimento de software',
    status: EtpStatus.COMPLETED,
    description: 'Sistema web para gestão de documentos',
    descricaoDetalhada: 'Desenvolvimento de plataforma web responsiva',
    valorEstimado: 250000,
    prazoExecucao: 180,
    dotacaoOrcamentaria: '02.031.0001.2001.339039',
    requisitosTecnicos: 'Stack: React, NestJS, PostgreSQL',
    numeroProcesso: '12345.678910/2024-11',
    garantiaExigida: '5% do valor contratual',
    templateType: 'TI' as any,
  };

  const mockTermoReferencia: Partial<TermoReferencia> = {
    id: mockTrId,
    etpId: mockEtpId,
    organizationId: mockOrganizationId,
    objeto: 'Desenvolvimento de software para gestão',
    requisitosContratacao: 'Experiência comprovada em projetos similares',
    especificacoesTecnicas: {
      frontend: 'React 18+',
      backend: 'NestJS 10+',
      database: 'PostgreSQL 15+',
    },
    obrigacoesContratante: 'Fornecer infraestrutura de homologação',
    obrigacoesContratada: 'Entregar código fonte e documentação',
    sancoesPenalidades: 'Multa de 0,3% ao dia por atraso',
    condicoesPagamento: 'Pagamento em 30 dias após aceite',
    localExecucao: 'Remoto com reuniões presenciais mensais',
    status: TermoReferenciaStatus.APPROVED,
  };

  const mockPesquisaPrecos: Partial<PesquisaPrecos> = {
    id: mockPesquisaId,
    etpId: mockEtpId,
    organizationId: mockOrganizationId,
    titulo: 'Pesquisa de Preços - Desenvolvimento Software',
    valorTotalEstimado: 250000,
    metodologia: MetodologiaPesquisa.PAINEL_PRECOS,
    justificativaMetodologia: 'Utilização do Painel de Preços Gov.br',
    status: PesquisaPrecosStatus.APPROVED,
  };

  const mockEditalTemplate: Partial<EditalTemplate> = {
    id: 'template-pregao-001',
    name: 'Template Pregão Eletrônico',
    modalidade: EditalTemplateModalidade.PREGAO,
    isActive: true,
  };

  const mockLLMResponse = {
    content: JSON.stringify({
      condicoesParticipacao: 'Empresas regularizadas com CNPJ ativo',
      prazos: {
        proposta: '5 dias úteis',
        impugnacao: '3 dias úteis',
        recursos: '3 dias úteis',
        sessaoPublica: '10/05/2024 às 10:00',
      },
      reajusteContratual: 'Índice IPCA/IBGE anual',
    }),
    tokens: 300,
    model: 'gpt-4.1-nano',
    finishReason: 'stop',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EditalGenerationService,
        {
          provide: getRepositoryToken(Edital),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            findOne: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Etp),
          useValue: {
            findOne: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(TermoReferencia),
          useValue: {
            findOne: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(PesquisaPrecos),
          useValue: {
            findOne: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(EditalTemplate),
          useValue: {
            findOne: jest.fn(),
          },
        },
        {
          provide: OpenAIService,
          useValue: {
            generateCompletion: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<EditalGenerationService>(EditalGenerationService);
    editalRepository = module.get<Repository<Edital>>(getRepositoryToken(Edital));
    etpRepository = module.get<Repository<Etp>>(getRepositoryToken(Etp));
    termoReferenciaRepository = module.get<Repository<TermoReferencia>>(
      getRepositoryToken(TermoReferencia),
    );
    pesquisaPrecosRepository = module.get<Repository<PesquisaPrecos>>(
      getRepositoryToken(PesquisaPrecos),
    );
    editalTemplateRepository = module.get<Repository<EditalTemplate>>(
      getRepositoryToken(EditalTemplate),
    );
    openAIService = module.get<OpenAIService>(OpenAIService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('generateFromEtp', () => {
    const generateDto: GenerateEditalDto = {
      etpId: mockEtpId,
      termoReferenciaId: mockTrId,
      pesquisaPrecosId: mockPesquisaId,
    };

    it('should generate Edital from ETP+TR+PesquisaPrecos successfully', async () => {
      // Arrange
      jest.spyOn(etpRepository, 'findOne').mockResolvedValue(mockEtp as Etp);
      jest
        .spyOn(termoReferenciaRepository, 'findOne')
        .mockResolvedValue(mockTermoReferencia as TermoReferencia);
      jest
        .spyOn(pesquisaPrecosRepository, 'findOne')
        .mockResolvedValue(mockPesquisaPrecos as PesquisaPrecos);
      jest
        .spyOn(editalTemplateRepository, 'findOne')
        .mockResolvedValue(mockEditalTemplate as EditalTemplate);
      jest.spyOn(openAIService, 'generateCompletion').mockResolvedValue(mockLLMResponse);

      const mockGeneratedEdital: Partial<Edital> = {
        id: 'edital-001',
        numero: '001/2024-PREGAO',
        objeto: mockEtp.objeto,
        modalidade: EditalModalidade.PREGAO,
        tipoContratacaoDireta: null,
        valorEstimado: '250000',
        status: EditalStatus.DRAFT,
        createdAt: new Date(),
      };

      jest.spyOn(editalRepository, 'create').mockReturnValue(mockGeneratedEdital as Edital);
      jest.spyOn(editalRepository, 'save').mockResolvedValue(mockGeneratedEdital as Edital);

      // Act
      const result = await service.generateFromEtp(
        generateDto,
        mockUserId,
        mockOrganizationId,
      );

      // Assert
      expect(result).toBeDefined();
      expect(result.id).toBe('edital-001');
      expect(result.numero).toBe('001/2024-PREGAO');
      expect(result.objeto).toBe(mockEtp.objeto);
      expect(result.valorEstimado).toBe('250000');
      expect(result.status).toBe(EditalStatus.DRAFT);
      expect(result.metadata.aiEnhanced).toBe(true);
      expect(result.metadata.tokens).toBe(300);
      expect(result.metadata.model).toBe('gpt-4.1-nano');
      expect(result.metadata.latencyMs).toBeGreaterThan(0);

      // Verify repository calls
      expect(etpRepository.findOne).toHaveBeenCalledWith({
        where: { id: mockEtpId },
        relations: ['organization', 'template'],
      });
      expect(termoReferenciaRepository.findOne).toHaveBeenCalledWith({
        where: { id: mockTrId },
      });
      expect(pesquisaPrecosRepository.findOne).toHaveBeenCalledWith({
        where: { id: mockPesquisaId },
      });
      expect(editalRepository.save).toHaveBeenCalled();
    });

    it('should generate Edital with only ETP (without TR and Pesquisa)', async () => {
      // Arrange
      const dtpOnlyEtp: GenerateEditalDto = {
        etpId: mockEtpId,
      };

      jest.spyOn(etpRepository, 'findOne').mockResolvedValue(mockEtp as Etp);
      jest
        .spyOn(editalTemplateRepository, 'findOne')
        .mockResolvedValue(mockEditalTemplate as EditalTemplate);
      jest.spyOn(openAIService, 'generateCompletion').mockResolvedValue(mockLLMResponse);

      const mockGeneratedEdital: Partial<Edital> = {
        id: 'edital-002',
        numero: '001/2024-PREGAO',
        objeto: mockEtp.objeto,
        modalidade: EditalModalidade.PREGAO,
        status: EditalStatus.DRAFT,
        createdAt: new Date(),
      };

      jest.spyOn(editalRepository, 'create').mockReturnValue(mockGeneratedEdital as Edital);
      jest.spyOn(editalRepository, 'save').mockResolvedValue(mockGeneratedEdital as Edital);

      // Act
      const result = await service.generateFromEtp(dtpOnlyEtp, mockUserId, mockOrganizationId);

      // Assert
      expect(result).toBeDefined();
      expect(result.id).toBe('edital-002');
      expect(termoReferenciaRepository.findOne).not.toHaveBeenCalled();
      expect(pesquisaPrecosRepository.findOne).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException if ETP does not exist', async () => {
      // Arrange
      jest.spyOn(etpRepository, 'findOne').mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.generateFromEtp(generateDto, mockUserId, mockOrganizationId),
      ).rejects.toThrow(NotFoundException);
      await expect(
        service.generateFromEtp(generateDto, mockUserId, mockOrganizationId),
      ).rejects.toThrow(`ETP com ID ${mockEtpId} não encontrado`);
    });

    it('should throw ForbiddenException if ETP belongs to another organization', async () => {
      // Arrange
      const etpDifferentOrg: Partial<Etp> = {
        ...mockEtp,
        organizationId: 'other-org-999',
      };

      jest.spyOn(etpRepository, 'findOne').mockResolvedValue(etpDifferentOrg as Etp);

      // Act & Assert
      await expect(
        service.generateFromEtp(generateDto, mockUserId, mockOrganizationId),
      ).rejects.toThrow(ForbiddenException);
      await expect(
        service.generateFromEtp(generateDto, mockUserId, mockOrganizationId),
      ).rejects.toThrow('Você não tem permissão para gerar Edital a partir deste ETP');
    });

    it('should throw BadRequestException if ETP is not in valid status', async () => {
      // Arrange
      const etpDraft: Partial<Etp> = {
        ...mockEtp,
        status: EtpStatus.DRAFT,
      };

      jest.spyOn(etpRepository, 'findOne').mockResolvedValue(etpDraft as Etp);

      // Act & Assert
      await expect(
        service.generateFromEtp(generateDto, mockUserId, mockOrganizationId),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.generateFromEtp(generateDto, mockUserId, mockOrganizationId),
      ).rejects.toThrow(
        `O ETP deve estar com status 'completed' ou 'review' para gerar Edital. Status atual: draft`,
      );
    });

    it('should throw BadRequestException if TR does not belong to the same ETP', async () => {
      // Arrange
      const trDifferentEtp: Partial<TermoReferencia> = {
        ...mockTermoReferencia,
        etpId: 'different-etp-999',
      };

      jest.spyOn(etpRepository, 'findOne').mockResolvedValue(mockEtp as Etp);
      jest
        .spyOn(termoReferenciaRepository, 'findOne')
        .mockResolvedValue(trDifferentEtp as TermoReferencia);

      // Act & Assert
      await expect(
        service.generateFromEtp(generateDto, mockUserId, mockOrganizationId),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.generateFromEtp(generateDto, mockUserId, mockOrganizationId),
      ).rejects.toThrow('O Termo de Referência não pertence ao ETP informado');
    });

    it('should throw BadRequestException if PesquisaPrecos is not approved', async () => {
      // Arrange
      const pesquisaDraft: Partial<PesquisaPrecos> = {
        ...mockPesquisaPrecos,
        status: PesquisaPrecosStatus.DRAFT,
      };

      jest.spyOn(etpRepository, 'findOne').mockResolvedValue(mockEtp as Etp);
      jest
        .spyOn(termoReferenciaRepository, 'findOne')
        .mockResolvedValue(mockTermoReferencia as TermoReferencia);
      jest
        .spyOn(pesquisaPrecosRepository, 'findOne')
        .mockResolvedValue(pesquisaDraft as PesquisaPrecos);

      // Act & Assert
      await expect(
        service.generateFromEtp(generateDto, mockUserId, mockOrganizationId),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.generateFromEtp(generateDto, mockUserId, mockOrganizationId),
      ).rejects.toThrow(
        `A Pesquisa de Preços deve estar com status 'approved'. Status atual: draft`,
      );
    });

    it('should fallback to basic mapping if AI enhancement fails', async () => {
      // Arrange
      jest.spyOn(etpRepository, 'findOne').mockResolvedValue(mockEtp as Etp);
      jest
        .spyOn(termoReferenciaRepository, 'findOne')
        .mockResolvedValue(mockTermoReferencia as TermoReferencia);
      jest
        .spyOn(pesquisaPrecosRepository, 'findOne')
        .mockResolvedValue(mockPesquisaPrecos as PesquisaPrecos);
      jest
        .spyOn(editalTemplateRepository, 'findOne')
        .mockResolvedValue(mockEditalTemplate as EditalTemplate);
      jest
        .spyOn(openAIService, 'generateCompletion')
        .mockRejectedValue(new Error('OpenAI API error'));

      const mockGeneratedEdital: Partial<Edital> = {
        id: 'edital-003',
        numero: '001/2024-PREGAO',
        objeto: mockEtp.objeto,
        modalidade: EditalModalidade.PREGAO,
        status: EditalStatus.DRAFT,
        createdAt: new Date(),
      };

      jest.spyOn(editalRepository, 'create').mockReturnValue(mockGeneratedEdital as Edital);
      jest.spyOn(editalRepository, 'save').mockResolvedValue(mockGeneratedEdital as Edital);

      // Act
      const result = await service.generateFromEtp(
        generateDto,
        mockUserId,
        mockOrganizationId,
      );

      // Assert
      expect(result).toBeDefined();
      expect(result.id).toBe('edital-003');
      expect(result.metadata.aiEnhanced).toBe(false); // AI failed, fallback used
      expect(result.metadata.tokens).toBeUndefined();
    });
  });
});
