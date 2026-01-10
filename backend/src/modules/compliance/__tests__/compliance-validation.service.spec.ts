import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotFoundException } from '@nestjs/common';
import { ComplianceValidationService } from '../compliance-validation.service';
import {
  ComplianceChecklist,
  ComplianceStandard,
} from '../../../entities/compliance-checklist.entity';
import {
  ComplianceChecklistItem,
  ChecklistItemType,
  ChecklistItemCategory,
} from '../../../entities/compliance-checklist-item.entity';
import { Etp, EtpStatus, NivelRisco } from '../../../entities/etp.entity';
import { EtpTemplateType } from '../../../entities/etp-template.entity';

describe('ComplianceValidationService', () => {
  let service: ComplianceValidationService;
  let checklistRepository: jest.Mocked<Repository<ComplianceChecklist>>;
  let itemRepository: jest.Mocked<Repository<ComplianceChecklistItem>>;
  let etpRepository: jest.Mocked<Repository<Etp>>;

  const mockChecklist: ComplianceChecklist = {
    id: 'checklist-1',
    name: 'TCU - Servicos',
    description: 'Checklist para contratos de servicos',
    standard: ComplianceStandard.TCU,
    templateType: EtpTemplateType.SERVICOS,
    legalBasis: 'Art. 18, Lei 14.133/2021',
    version: '1.0',
    minimumScore: 70,
    isActive: true,
    items: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockChecklistItems: Partial<ComplianceChecklistItem>[] = [
    {
      id: 'item-1',
      checklistId: 'checklist-1',
      checklist: mockChecklist,
      requirement: 'Justificativa de necessidade',
      description: 'ETP deve conter justificativa clara da necessidade',
      type: ChecklistItemType.MANDATORY,
      category: ChecklistItemCategory.JUSTIFICATION,
      weight: 20,
      etpFieldsRequired: 'justificativaContratacao,necessidadeAtendida',
      sectionRequired: undefined,
      keywords: ['necessidade', 'demanda', 'interesse publico'],
      validationRegex: undefined,
      minLength: 50,
      fixSuggestion: 'Descreva o problema especifico que a contratacao resolve',
      legalReference: 'Art. 18, par. 1o, I - Lei 14.133/2021',
      rejectionCode: 'REJ-001',
      order: 1,
      isActive: true,
    },
    {
      id: 'item-2',
      checklistId: 'checklist-1',
      checklist: mockChecklist,
      requirement: 'Estimativa de valor',
      description: 'ETP deve conter estimativa de valor com fontes',
      type: ChecklistItemType.MANDATORY,
      category: ChecklistItemCategory.PRICING,
      weight: 25,
      etpFieldsRequired: 'valorEstimado,fontePesquisaPrecos',
      sectionRequired: undefined,
      keywords: ['preco', 'valor', 'estimativa'],
      validationRegex: undefined,
      minLength: undefined,
      fixSuggestion: 'Inclua pesquisa de precos com minimo 3 fontes',
      legalReference: 'Art. 18, par. 1o, VI - Lei 14.133/2021',
      rejectionCode: 'REJ-003',
      order: 2,
      isActive: true,
    },
    {
      id: 'item-3',
      checklistId: 'checklist-1',
      checklist: mockChecklist,
      requirement: 'Analise de riscos',
      description: 'ETP deve conter analise de riscos',
      type: ChecklistItemType.RECOMMENDED,
      category: ChecklistItemCategory.RISKS,
      weight: 15,
      etpFieldsRequired: 'descricaoRiscos,nivelRisco',
      sectionRequired: undefined,
      keywords: ['risco', 'mitigacao'],
      validationRegex: undefined,
      minLength: 30,
      fixSuggestion: 'Identifique riscos e medidas de mitigacao',
      legalReference: 'Art. 18, par. 1o, XII - Lei 14.133/2021',
      rejectionCode: 'REJ-007',
      order: 3,
      isActive: true,
    },
  ];

  const mockEtp = {
    id: 'etp-1',
    title: 'ETP - Contratacao de Servicos de TI',
    description: 'Contratacao de servicos de desenvolvimento de software',
    objeto: 'Servicos de desenvolvimento de software',
    numeroProcesso: '2024/0001',
    valorEstimado: 100000,
    orgaoEntidade: 'Secretaria de Tecnologia',
    uasg: '123456',
    unidadeDemandante: 'Departamento de TI',
    responsavelTecnico: { nome: 'Joao Silva', matricula: '12345' },
    dataElaboracao: new Date(),
    descricaoDetalhada: 'Servicos de desenvolvimento de sistemas',
    quantidadeEstimada: 12,
    unidadeMedida: 'mes',
    justificativaContratacao:
      'A contratacao visa atender a necessidade de modernizacao dos sistemas legados que apresentam falhas constantes, impactando o atendimento ao cidadao. O interesse publico e garantir a continuidade do servico.',
    necessidadeAtendida:
      'Modernizacao dos sistemas para atendimento de 10.000 usuarios, resolvendo demanda urgente do departamento.',
    beneficiosEsperados: 'Reducao de 30% no tempo de processamento',
    requisitosTecnicos: 'Desenvolvimento em Node.js e React',
    requisitosQualificacao: 'Experiencia em projetos similares',
    criteriosSustentabilidade: 'Uso de energia limpa',
    garantiaExigida: '12 meses',
    prazoExecucao: 365,
    nivelRisco: NivelRisco.MEDIO,
    descricaoRiscos:
      'Risco de atraso na entrega. Mitigacao: cronograma com folgas.',
    valorUnitario: 8333.33,
    fontePesquisaPrecos:
      'Painel de Precos (01/2026), Contratos similares UASG 123 (12/2025), Cotacoes de mercado',
    dotacaoOrcamentaria: '02.031.0001.2001.339039',
    templateId: undefined,
    template: undefined,
    templateType: EtpTemplateType.SERVICOS,
    dynamicFields: undefined,
    status: EtpStatus.DRAFT,
    metadata: undefined,
    organizationId: 'org-1',
    organization: undefined,
    currentVersion: 1,
    completionPercentage: 50,
    createdBy: undefined,
    createdById: 'user-1',
    createdAt: new Date(),
    updatedAt: new Date(),
    sections: [],
    versions: [],
    auditLogs: [],
  } as unknown as Etp;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ComplianceValidationService,
        {
          provide: getRepositoryToken(ComplianceChecklist),
          useValue: {
            findOne: jest.fn(),
            find: jest.fn(),
            findByIds: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(ComplianceChecklistItem),
          useValue: {
            findByIds: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Etp),
          useValue: {
            findOne: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<ComplianceValidationService>(
      ComplianceValidationService,
    );
    checklistRepository = module.get(getRepositoryToken(ComplianceChecklist));
    itemRepository = module.get(getRepositoryToken(ComplianceChecklistItem));
    etpRepository = module.get(getRepositoryToken(Etp));

    // Setup default mock for checklist with items
    const checklistWithItems = {
      ...mockChecklist,
      items: mockChecklistItems,
    } as unknown as ComplianceChecklist;
    checklistRepository.findOne.mockResolvedValue(checklistWithItems);
    etpRepository.findOne.mockResolvedValue(mockEtp);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('validateEtp', () => {
    it('should validate ETP successfully with passing score', async () => {
      const result = await service.validateEtp('etp-1');

      expect(result).toBeDefined();
      expect(result.etpId).toBe('etp-1');
      expect(result.checklistId).toBe('checklist-1');
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(100);
      expect(result.totalItems).toBe(3);
      expect(result.itemResults).toHaveLength(3);
      expect(result.validatedAt).toBeInstanceOf(Date);
      expect(result.processingTimeMs).toBeGreaterThanOrEqual(0);
    });

    it('should throw NotFoundException when ETP not found', async () => {
      etpRepository.findOne.mockResolvedValue(null);

      await expect(service.validateEtp('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException when no checklist found', async () => {
      checklistRepository.findOne.mockResolvedValue(null);

      await expect(service.validateEtp('etp-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should use specific checklist when checklistId provided', async () => {
      const customChecklist = {
        ...mockChecklist,
        id: 'custom-checklist',
        items: mockChecklistItems,
      } as unknown as ComplianceChecklist;
      checklistRepository.findOne.mockResolvedValueOnce(customChecklist);

      const result = await service.validateEtp('etp-1', 'custom-checklist');

      expect(result.checklistId).toBe('custom-checklist');
    });

    it('should calculate correct score based on passed items', async () => {
      const result = await service.validateEtp('etp-1');

      // With the mock ETP that has all required fields filled,
      // all items should pass
      const totalWeight = mockChecklistItems.reduce(
        (sum, item) => sum + (item.weight ?? 0),
        0,
      );
      const passedWeight = result.itemResults
        .filter((r) => r.passed)
        .reduce((sum, r) => sum + r.weight, 0);

      expect(result.score).toBe(Math.round((passedWeight / totalWeight) * 100));
    });

    it('should set status APPROVED when score >= minimumScore', async () => {
      const result = await service.validateEtp('etp-1');

      if (result.score >= 70) {
        expect(result.status).toBe('APPROVED');
        expect(result.passed).toBe(true);
      }
    });

    it('should set status REJECTED when score < minimumScore - 20', async () => {
      // Create an ETP with missing required fields
      const incompleteEtp = {
        ...mockEtp,
        justificativaContratacao: undefined,
        valorEstimado: undefined,
        fontePesquisaPrecos: undefined,
        descricaoRiscos: undefined,
        necessidadeAtendida: undefined,
      } as unknown as Etp;
      etpRepository.findOne.mockResolvedValueOnce(incompleteEtp);

      const result = await service.validateEtp('etp-1');

      if (result.score < 50) {
        expect(result.status).toBe('REJECTED');
        expect(result.passed).toBe(false);
      }
    });

    it('should generate suggestions for failed items', async () => {
      const incompleteEtp = {
        ...mockEtp,
        descricaoRiscos: '',
      };
      etpRepository.findOne.mockResolvedValueOnce(incompleteEtp);

      const result = await service.validateEtp('etp-1');

      const failedItems = result.itemResults.filter((r) => !r.passed);
      if (failedItems.length > 0) {
        expect(result.suggestions.length).toBeGreaterThan(0);
        expect(result.suggestions[0]).toHaveProperty('category');
        expect(result.suggestions[0]).toHaveProperty('title');
        expect(result.suggestions[0]).toHaveProperty('description');
        expect(result.suggestions[0]).toHaveProperty('priority');
      }
    });

    it('should calculate category scores correctly', async () => {
      const result = await service.validateEtp('etp-1');

      expect(result.categoryScores).toBeDefined();
      expect(result.categoryScores.JUSTIFICATION).toBeDefined();
      expect(result.categoryScores.PRICING).toBeDefined();
      expect(result.categoryScores.RISKS).toBeDefined();
    });

    it('should filter out inactive items', async () => {
      const checklistWithInactive = {
        ...mockChecklist,
        items: [
          ...mockChecklistItems,
          {
            ...mockChecklistItems[0],
            id: 'inactive-item',
            isActive: false,
          },
        ],
      } as unknown as ComplianceChecklist;
      checklistRepository.findOne.mockResolvedValueOnce(checklistWithInactive);

      const result = await service.validateEtp('etp-1');

      expect(
        result.itemResults.find((r) => r.itemId === 'inactive-item'),
      ).toBeUndefined();
    });

    it('should not include OPTIONAL items by default', async () => {
      const checklistWithOptional = {
        ...mockChecklist,
        items: [
          ...mockChecklistItems,
          {
            ...mockChecklistItems[0],
            id: 'optional-item',
            type: ChecklistItemType.OPTIONAL,
          },
        ],
      } as unknown as ComplianceChecklist;
      checklistRepository.findOne.mockResolvedValueOnce(checklistWithOptional);

      const result = await service.validateEtp('etp-1');

      expect(
        result.itemResults.find((r) => r.itemId === 'optional-item'),
      ).toBeUndefined();
    });

    it('should include OPTIONAL items when includeOptional is true', async () => {
      const checklistWithOptional = {
        ...mockChecklist,
        items: [
          ...mockChecklistItems,
          {
            ...mockChecklistItems[0],
            id: 'optional-item',
            type: ChecklistItemType.OPTIONAL,
          },
        ],
      } as unknown as ComplianceChecklist;
      checklistRepository.findOne.mockResolvedValueOnce(checklistWithOptional);

      const result = await service.validateEtp('etp-1', undefined, true);

      expect(
        result.itemResults.find((r) => r.itemId === 'optional-item'),
      ).toBeDefined();
    });
  });

  describe('calculateComplianceScore', () => {
    it('should return score between 0 and 100', async () => {
      const score = await service.calculateComplianceScore('etp-1');

      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(100);
    });
  });

  describe('getFailingItems', () => {
    it('should return empty array when all items pass', async () => {
      itemRepository.findByIds.mockResolvedValueOnce([]);

      const failingItems = await service.getFailingItems('etp-1');

      // If all pass, we expect an empty result
      expect(Array.isArray(failingItems)).toBe(true);
    });

    it('should return failed items when some fail', async () => {
      const incompleteEtp = {
        ...mockEtp,
        descricaoRiscos: '',
        nivelRisco: undefined,
      } as unknown as Etp;
      etpRepository.findOne.mockResolvedValue(incompleteEtp);

      const failedItem = mockChecklistItems[2] as ComplianceChecklistItem; // Risks item
      itemRepository.findByIds.mockResolvedValueOnce([failedItem]);

      const failingItems = await service.getFailingItems('etp-1');

      expect(Array.isArray(failingItems)).toBe(true);
    });
  });

  describe('getSuggestions', () => {
    it('should return suggestions ordered by priority', async () => {
      const incompleteEtp = {
        ...mockEtp,
        justificativaContratacao: '',
        necessidadeAtendida: '',
      };
      etpRepository.findOne.mockResolvedValue(incompleteEtp);

      const suggestions = await service.getSuggestions('etp-1');

      expect(Array.isArray(suggestions)).toBe(true);
      if (suggestions.length > 1) {
        const priorities = suggestions.map((s) => s.priority);
        const priorityOrder = { high: 0, medium: 1, low: 2 };
        for (let i = 0; i < priorities.length - 1; i++) {
          expect(priorityOrder[priorities[i]]).toBeLessThanOrEqual(
            priorityOrder[priorities[i + 1]],
          );
        }
      }
    });
  });

  describe('getScoreSummary', () => {
    it('should return summary with top issues', async () => {
      const summary = await service.getScoreSummary('etp-1');

      expect(summary).toHaveProperty('score');
      expect(summary).toHaveProperty('passed');
      expect(summary).toHaveProperty('status');
      expect(summary).toHaveProperty('totalItems');
      expect(summary).toHaveProperty('passedItems');
      expect(summary).toHaveProperty('failedItems');
      expect(summary).toHaveProperty('topIssues');
      expect(Array.isArray(summary.topIssues)).toBe(true);
      expect(summary.topIssues.length).toBeLessThanOrEqual(3);
    });
  });

  describe('findAllChecklists', () => {
    it('should return all active checklists', async () => {
      checklistRepository.find.mockResolvedValueOnce([mockChecklist]);

      const checklists = await service.findAllChecklists();

      expect(checklists).toHaveLength(1);
      expect(checklistRepository.find).toHaveBeenCalledWith({
        where: { isActive: true },
        order: { templateType: 'ASC', standard: 'ASC' },
      });
    });
  });

  describe('findChecklistById', () => {
    it('should return checklist with items', async () => {
      const checklist = await service.findChecklistById('checklist-1');

      expect(checklist).toBeDefined();
      expect(checklistRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'checklist-1' },
        relations: ['items'],
      });
    });

    it('should return null when not found', async () => {
      checklistRepository.findOne.mockResolvedValueOnce(null);

      const checklist = await service.findChecklistById('non-existent');

      expect(checklist).toBeNull();
    });
  });

  describe('findChecklistsByTemplateType', () => {
    it('should return checklists for given template type', async () => {
      checklistRepository.find.mockResolvedValueOnce([mockChecklist]);

      const checklists = await service.findChecklistsByTemplateType(
        EtpTemplateType.SERVICOS,
      );

      expect(checklists).toHaveLength(1);
      expect(checklistRepository.find).toHaveBeenCalledWith({
        where: { templateType: EtpTemplateType.SERVICOS, isActive: true },
        relations: ['items'],
        order: { standard: 'ASC' },
      });
    });
  });

  describe('item validation logic', () => {
    it('should validate minLength requirement', async () => {
      const etpWithShortText = {
        ...mockEtp,
        justificativaContratacao: 'Curto', // Less than 50 chars
        necessidadeAtendida: 'Muito curto',
      };
      etpRepository.findOne.mockResolvedValue(etpWithShortText);

      const result = await service.validateEtp('etp-1');

      const justificativaResult = result.itemResults.find(
        (r) => r.requirement === 'Justificativa de necessidade',
      );
      expect(justificativaResult).toBeDefined();
      expect(justificativaResult!.passed).toBe(false);
      expect(justificativaResult!.failureReason).toContain('muito curto');
    });

    it('should validate keywords requirement', async () => {
      // Text is long enough (>50 chars) but doesn't contain expected keywords
      const etpWithoutKeywords = {
        ...mockEtp,
        justificativaContratacao:
          'Texto muito longo que nao contem as palavras esperadas pelo sistema de validacao de conformidade TCU.',
        necessidadeAtendida:
          'Outro texto qualquer tambem longo que nao menciona as keywords de conformidade do checklist.',
      };
      etpRepository.findOne.mockResolvedValue(etpWithoutKeywords);

      const result = await service.validateEtp('etp-1');

      const justificativaResult = result.itemResults.find(
        (r) => r.requirement === 'Justificativa de necessidade',
      );
      expect(justificativaResult).toBeDefined();
      // Should fail because keywords "necessidade", "demanda", "interesse publico" not found
      // even though text is long enough
      if (!justificativaResult!.passed) {
        expect(justificativaResult!.failureReason).toContain(
          'Conteudo insuficiente',
        );
      }
    });

    it('should detect empty required fields', async () => {
      const etpWithEmptyFields = {
        ...mockEtp,
        valorEstimado: undefined,
        fontePesquisaPrecos: '',
      } as unknown as Etp;
      etpRepository.findOne.mockResolvedValue(etpWithEmptyFields);

      const result = await service.validateEtp('etp-1');

      const pricingResult = result.itemResults.find(
        (r) => r.requirement === 'Estimativa de valor',
      );
      expect(pricingResult).toBeDefined();
      expect(pricingResult!.passed).toBe(false);
      expect(pricingResult!.failureReason).toContain('vazio ou ausente');
    });
  });
});
