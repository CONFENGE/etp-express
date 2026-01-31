import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AiValidationService } from '../ai-validation.service';
import {
  AiValidationResult,
  IrregularityType,
  SeverityLevel,
  ValidationStatus,
} from '../../../entities/ai-validation-result.entity';
import { Etp } from '../../../entities/etp.entity';
import { Edital, EditalModalidade } from '../../../entities/edital.entity';
import { OverpriceAlertService } from '../../market-intelligence/services/overprice-alert.service';

describe('AiValidationService', () => {
  let service: AiValidationService;
  let validationRepo: Repository<AiValidationResult>;
  let etpRepo: Repository<Etp>;
  let editalRepo: Repository<Edital>;
  let overpriceService: OverpriceAlertService;

  const mockValidationRepo = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  const mockEtpRepo = {
    findOne: jest.fn(),
    find: jest.fn(),
  };

  const mockEditalRepo = {
    findOne: jest.fn(),
  };

  const mockOverpriceService = {
    checkPrice: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AiValidationService,
        {
          provide: getRepositoryToken(AiValidationResult),
          useValue: mockValidationRepo,
        },
        {
          provide: getRepositoryToken(Etp),
          useValue: mockEtpRepo,
        },
        {
          provide: getRepositoryToken(Edital),
          useValue: mockEditalRepo,
        },
        {
          provide: OverpriceAlertService,
          useValue: mockOverpriceService,
        },
      ],
    }).compile();

    service = module.get<AiValidationService>(AiValidationService);
    validationRepo = module.get<Repository<AiValidationResult>>(
      getRepositoryToken(AiValidationResult),
    );
    etpRepo = module.get<Repository<Etp>>(getRepositoryToken(Etp));
    editalRepo = module.get<Repository<Edital>>(getRepositoryToken(Edital));
    overpriceService = module.get<OverpriceAlertService>(OverpriceAlertService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('validateDocument', () => {
    it('should detect missing justification in ETP', async () => {
      const mockEtp: Partial<Etp> = {
        id: 'etp-123',
        objeto: 'Aquisição de equipamentos',
        justificativaContratacao: '', // Empty justification
        valorEstimado: '50000',
        sections: [],
      };

      mockEtpRepo.findOne.mockResolvedValue(mockEtp);
      mockEtpRepo.find.mockResolvedValue([]);
      mockValidationRepo.create.mockImplementation((dto) => dto);
      mockValidationRepo.save.mockImplementation((entity) =>
        Promise.resolve({
          ...entity,
          id: 'validation-123',
          createdAt: new Date(),
          updatedAt: new Date(),
        }),
      );

      const result = await service.validateDocument({ etpId: 'etp-123' });

      expect(result.length).toBeGreaterThan(0);
      expect(
        result.some(
          (r) => r.irregularityType === IrregularityType.AUSENCIA_JUSTIFICATIVA,
        ),
      ).toBe(true);

      const justificationAlert = result.find(
        (r) => r.irregularityType === IrregularityType.AUSENCIA_JUSTIFICATIVA,
      );
      expect(justificationAlert?.severityLevel).toBe(SeverityLevel.CRITICAL);
    });

    it('should detect restrictive specifications', async () => {
      const mockEtp: Partial<Etp> = {
        id: 'etp-456',
        objeto: 'Aquisição de software',
        justificativaContratacao: 'Justificativa adequada e detalhada',
        requisitosTecnicos:
          'Certificação ISO 9001, atestado de capacidade técnica, experiência mínima de 10 anos, nacionalmente reconhecido',
        valorEstimado: '100000',
        sections: [],
      };

      mockEtpRepo.findOne.mockResolvedValue(mockEtp);
      mockEtpRepo.find.mockResolvedValue([]);
      mockValidationRepo.create.mockImplementation((dto) => dto);
      mockValidationRepo.save.mockImplementation((entity) =>
        Promise.resolve({
          ...entity,
          id: 'validation-456',
          createdAt: new Date(),
          updatedAt: new Date(),
        }),
      );

      const result = await service.validateDocument({ etpId: 'etp-456' });

      const restrictiveSpec = result.find(
        (r) => r.irregularityType === IrregularityType.ESPECIFICACAO_RESTRITIVA,
      );
      expect(restrictiveSpec).toBeDefined();
      expect([SeverityLevel.MEDIUM, SeverityLevel.HIGH]).toContain(
        restrictiveSpec?.severityLevel,
      );
    });

    it('should detect inadequate deadline in Edital', async () => {
      const hoje = new Date();
      const amanha = new Date(hoje);
      amanha.setDate(amanha.getDate() + 1);

      const mockEdital: Partial<Edital> = {
        id: 'edital-789',
        objeto: 'Pregão Eletrônico',
        modalidade: EditalModalidade.PREGAO,
        dataAbertura: amanha, // Only 1 day ahead (minimum is 8)
        conteudo: 'Conteúdo do edital',
      };

      mockEditalRepo.findOne.mockResolvedValue(mockEdital);
      mockValidationRepo.create.mockImplementation((dto) => dto);
      mockValidationRepo.save.mockImplementation((entity) =>
        Promise.resolve({
          ...entity,
          id: 'validation-789',
          createdAt: new Date(),
          updatedAt: new Date(),
        }),
      );

      const result = await service.validateDocument({ editalId: 'edital-789' });

      const prazoAlert = result.find(
        (r) => r.irregularityType === IrregularityType.PRAZO_INADEQUADO,
      );
      expect(prazoAlert).toBeDefined();
      expect(prazoAlert?.severityLevel).toBe(SeverityLevel.CRITICAL);
    });

    it('should detect potential bid rigging (direcionamento)', async () => {
      const mockEdital: Partial<Edital> = {
        id: 'edital-999',
        objeto: 'Aquisição de equipamentos',
        modalidade: EditalModalidade.CONCORRENCIA,
        dataAbertura: new Date(Date.now() + 40 * 24 * 60 * 60 * 1000), // 40 days ahead
        conteudo:
          'Especificações técnicas: somente fornecedor autorizado pela marca específica pode participar',
      };

      mockEditalRepo.findOne.mockResolvedValue(mockEdital);
      mockValidationRepo.create.mockImplementation((dto) => dto);
      mockValidationRepo.save.mockImplementation((entity) =>
        Promise.resolve({
          ...entity,
          id: 'validation-999',
          createdAt: new Date(),
          updatedAt: new Date(),
        }),
      );

      const result = await service.validateDocument({ editalId: 'edital-999' });

      const direcionamentoAlert = result.find(
        (r) => r.irregularityType === IrregularityType.DIRECIONAMENTO,
      );
      expect(direcionamentoAlert).toBeDefined();
      expect(direcionamentoAlert?.confidenceScore).toBeGreaterThan(70);
    });
  });

  describe('getValidationSummary', () => {
    it('should generate summary with risk score', async () => {
      const mockValidations: AiValidationResult[] = [
        {
          id: 'v1',
          etpId: 'etp-1',
          editalId: null,
          irregularityType: IrregularityType.SUPERFATURAMENTO,
          severityLevel: SeverityLevel.CRITICAL,
          status: ValidationStatus.PENDING,
          description: 'Test',
          evidence: null,
          recommendation: 'Fix it',
          confidenceScore: 90,
          metadata: null,
          affectedField: null,
          affectedValue: null,
          legalReference: null,
          acknowledgedBy: null,
          acknowledgedAt: null,
          acknowledgeNote: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'v2',
          etpId: 'etp-1',
          editalId: null,
          irregularityType: IrregularityType.AUSENCIA_JUSTIFICATIVA,
          severityLevel: SeverityLevel.HIGH,
          status: ValidationStatus.RESOLVED,
          description: 'Test 2',
          evidence: null,
          recommendation: 'Fixed',
          confidenceScore: 95,
          metadata: null,
          affectedField: null,
          affectedValue: null,
          legalReference: null,
          acknowledgedBy: null,
          acknowledgedAt: null,
          acknowledgeNote: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(mockValidations),
      };

      mockValidationRepo.createQueryBuilder = jest
        .fn()
        .mockReturnValue(mockQueryBuilder);

      const summary = await service.getValidationSummary('etp-1');

      expect(summary.totalIrregularities).toBe(2);
      expect(summary.bySeverity.critical).toBe(1);
      expect(summary.bySeverity.high).toBe(1);
      expect(summary.byStatus.pending).toBe(1);
      expect(summary.byStatus.resolved).toBe(1);
      expect(summary.overallRiskScore).toBeGreaterThan(0);
      expect(summary.recommendations.length).toBeGreaterThan(0);
    });
  });

  describe('acknowledgeValidation', () => {
    it('should acknowledge a validation', async () => {
      const mockValidation: AiValidationResult = {
        id: 'validation-123',
        etpId: 'etp-1',
        editalId: null,
        irregularityType: IrregularityType.SUPERFATURAMENTO,
        severityLevel: SeverityLevel.HIGH,
        status: ValidationStatus.PENDING,
        description: 'Test',
        evidence: null,
        recommendation: 'Fix it',
        confidenceScore: 85,
        metadata: null,
        affectedField: null,
        affectedValue: null,
        legalReference: null,
        acknowledgedBy: null,
        acknowledgedAt: null,
        acknowledgeNote: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockValidationRepo.findOne.mockResolvedValue(mockValidation);
      mockValidationRepo.save.mockImplementation((entity) =>
        Promise.resolve(entity),
      );

      const result = await service.acknowledgeValidation(
        'validation-123',
        'user-456',
        {
          status: ValidationStatus.RESOLVED,
          note: 'Issue resolved',
        },
      );

      expect(result.status).toBe(ValidationStatus.RESOLVED);
      expect(result.acknowledgedBy).toBe('user-456');
      expect(result.acknowledgeNote).toBe('Issue resolved');
    });
  });
});
