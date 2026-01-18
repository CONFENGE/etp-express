import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { ComplianceReportService } from './compliance-report.service';
import { ComplianceValidationService } from './compliance-validation.service';
import { Etp, EtpStatus } from '../../entities/etp.entity';
import { ComplianceValidationHistory } from '../../entities/compliance-validation-history.entity';
import { ComplianceValidationResult } from './dto/compliance-validation-result.dto';
import { ChecklistItemCategory } from '../../entities/compliance-checklist-item.entity';

describe('ComplianceReportService', () => {
  let service: ComplianceReportService;
  let etpRepository: jest.Mocked<Repository<Etp>>;
  let historyRepository: jest.Mocked<Repository<ComplianceValidationHistory>>;
  let validationService: jest.Mocked<ComplianceValidationService>;

  const mockEtp: Partial<Etp> = {
    id: 'test-etp-id',
    title: 'Test ETP',
    objeto: 'Test Object',
    numeroProcesso: '12345/2026',
    orgaoEntidade: 'Test Organization',
    status: EtpStatus.DRAFT,
    createdById: 'user-id',
    organizationId: 'org-id',
  };

  const mockValidationResult: ComplianceValidationResult = {
    etpId: 'test-etp-id',
    checklistId: 'checklist-id',
    checklistName: 'Test Checklist',
    score: 75,
    minimumScore: 70,
    passed: true,
    status: 'APPROVED',
    totalItems: 10,
    passedItems: 8,
    failedItems: 2,
    skippedItems: 0,
    itemResults: [
      {
        itemId: 'item-1',
        requirement: 'Test Requirement 1',
        passed: true,
        type: 'MANDATORY' as any,
        category: ChecklistItemCategory.JUSTIFICATION,
        weight: 10,
        score: 10,
      },
      {
        itemId: 'item-2',
        requirement: 'Test Requirement 2',
        passed: false,
        type: 'MANDATORY' as any,
        category: ChecklistItemCategory.REQUIREMENTS,
        weight: 10,
        score: 0,
        failureReason: 'Missing content',
        fixSuggestion: 'Add required content',
        legalReference: 'Art. 18, Lei 14.133/2021',
        fieldChecked: 'justificativaContratacao',
      },
    ],
    suggestions: [
      {
        category: ChecklistItemCategory.REQUIREMENTS,
        title: 'Test Requirement 2',
        description: 'Add required content',
        priority: 'high',
        field: 'justificativaContratacao',
        legalReference: 'Art. 18, Lei 14.133/2021',
      },
    ],
    categoryScores: {
      [ChecklistItemCategory.IDENTIFICATION]: {
        total: 2,
        passed: 2,
        score: 20,
        maxScore: 20,
      },
      [ChecklistItemCategory.JUSTIFICATION]: {
        total: 3,
        passed: 2,
        score: 15,
        maxScore: 25,
      },
      [ChecklistItemCategory.REQUIREMENTS]: {
        total: 2,
        passed: 1,
        score: 10,
        maxScore: 20,
      },
      [ChecklistItemCategory.PRICING]: {
        total: 0,
        passed: 0,
        score: 0,
        maxScore: 0,
      },
      [ChecklistItemCategory.RISKS]: {
        total: 0,
        passed: 0,
        score: 0,
        maxScore: 0,
      },
      [ChecklistItemCategory.CONCLUSION]: {
        total: 1,
        passed: 1,
        score: 10,
        maxScore: 10,
      },
      [ChecklistItemCategory.DOCUMENTATION]: {
        total: 0,
        passed: 0,
        score: 0,
        maxScore: 0,
      },
    },
    validatedAt: new Date(),
    processingTimeMs: 150,
    jurisprudenciaAlerts: [],
  };

  const mockHistoryEntry: Partial<ComplianceValidationHistory> = {
    id: 'history-id',
    etpId: 'test-etp-id',
    checklistId: 'checklist-id',
    checklistName: 'Test Checklist',
    score: 75,
    minimumScore: 70,
    status: 'APPROVED',
    totalItems: 10,
    passedItems: 8,
    failedItems: 2,
    validatedAt: new Date(),
    validatedById: 'user-id',
    validatedBy: { email: 'user@test.com' } as any,
    validationSnapshot: {},
    createdAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ComplianceReportService,
        {
          provide: getRepositoryToken(Etp),
          useValue: {
            findOne: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(ComplianceValidationHistory),
          useValue: {
            find: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: ComplianceValidationService,
          useValue: {
            validateEtp: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<ComplianceReportService>(ComplianceReportService);
    etpRepository = module.get(getRepositoryToken(Etp));
    historyRepository = module.get(
      getRepositoryToken(ComplianceValidationHistory),
    );
    validationService = module.get(ComplianceValidationService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('generateReport', () => {
    it('should generate a compliance report for valid ETP', async () => {
      etpRepository.findOne.mockResolvedValue(mockEtp as Etp);
      validationService.validateEtp.mockResolvedValue(mockValidationResult);
      historyRepository.find.mockResolvedValue([
        mockHistoryEntry as ComplianceValidationHistory,
      ]);
      historyRepository.create.mockReturnValue(
        mockHistoryEntry as ComplianceValidationHistory,
      );
      historyRepository.save.mockResolvedValue(
        mockHistoryEntry as ComplianceValidationHistory,
      );

      const result = await service.generateReport(
        'test-etp-id',
        'user-id',
        'user',
        'org-id',
      );

      expect(result).toBeDefined();
      expect(result.etpId).toBe('test-etp-id');
      expect(result.score).toBe(75);
      expect(result.status).toBe('APPROVED');
      expect(result.violations).toHaveLength(1);
      expect(result.categoryScores.length).toBeGreaterThan(0);
      expect(result.history).toHaveLength(1);
    });

    it('should throw NotFoundException for non-existent ETP', async () => {
      etpRepository.findOne.mockResolvedValue(null);

      await expect(
        service.generateReport('non-existent', 'user-id', 'user', 'org-id'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException for unauthorized access', async () => {
      const etpWithDifferentOwner = {
        ...mockEtp,
        createdById: 'other-user-id',
        organizationId: 'other-org-id',
      };
      etpRepository.findOne.mockResolvedValue(etpWithDifferentOwner as Etp);

      await expect(
        service.generateReport('test-etp-id', 'user-id', 'user', 'org-id'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should allow admin to access any ETP in same organization', async () => {
      const etpWithDifferentOwner = {
        ...mockEtp,
        createdById: 'other-user-id',
        organizationId: 'org-id', // Same org
      };
      etpRepository.findOne.mockResolvedValue(etpWithDifferentOwner as Etp);
      validationService.validateEtp.mockResolvedValue(mockValidationResult);
      historyRepository.find.mockResolvedValue([]);
      historyRepository.create.mockReturnValue(
        mockHistoryEntry as ComplianceValidationHistory,
      );
      historyRepository.save.mockResolvedValue(
        mockHistoryEntry as ComplianceValidationHistory,
      );

      const result = await service.generateReport(
        'test-etp-id',
        'admin-user-id',
        'admin',
        'org-id',
      );

      expect(result).toBeDefined();
      expect(result.score).toBe(75);
    });
  });

  describe('getValidationHistory', () => {
    it('should return validation history entries', async () => {
      historyRepository.find.mockResolvedValue([
        mockHistoryEntry as ComplianceValidationHistory,
      ]);

      const result = await service.getValidationHistory('test-etp-id', 10);

      expect(result).toHaveLength(1);
      expect(result[0].score).toBe(75);
      expect(result[0].status).toBe('APPROVED');
      expect(result[0].validatedByName).toBe('user');
    });

    it('should limit history entries', async () => {
      const multipleEntries = Array(20)
        .fill(null)
        .map((_, i) => ({
          ...mockHistoryEntry,
          id: `history-${i}`,
          score: 70 + i,
        }));
      historyRepository.find.mockResolvedValue(
        multipleEntries as ComplianceValidationHistory[],
      );

      await service.getValidationHistory('test-etp-id', 5);

      expect(historyRepository.find).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 5,
        }),
      );
    });
  });

  describe('saveValidationHistory', () => {
    it('should save validation result to history', async () => {
      historyRepository.create.mockReturnValue(
        mockHistoryEntry as ComplianceValidationHistory,
      );
      historyRepository.save.mockResolvedValue(
        mockHistoryEntry as ComplianceValidationHistory,
      );

      const result = await service.saveValidationHistory(
        mockValidationResult,
        'user-id',
      );

      expect(historyRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          etpId: 'test-etp-id',
          score: 75,
          status: 'APPROVED',
          validatedById: 'user-id',
        }),
      );
      expect(result.id).toBe('history-id');
    });
  });

  describe('buildReport - violations', () => {
    it('should correctly categorize violations by severity', async () => {
      const validationWithMixedTypes: ComplianceValidationResult = {
        ...mockValidationResult,
        itemResults: [
          {
            itemId: 'mandatory-fail',
            requirement: 'Mandatory Failed',
            passed: false,
            type: 'MANDATORY' as any,
            category: ChecklistItemCategory.JUSTIFICATION,
            weight: 10,
            score: 0,
          },
          {
            itemId: 'recommended-fail',
            requirement: 'Recommended Failed',
            passed: false,
            type: 'RECOMMENDED' as any,
            category: ChecklistItemCategory.REQUIREMENTS,
            weight: 5,
            score: 0,
          },
          {
            itemId: 'optional-fail',
            requirement: 'Optional Failed',
            passed: false,
            type: 'OPTIONAL' as any,
            category: ChecklistItemCategory.DOCUMENTATION,
            weight: 2,
            score: 0,
          },
        ],
      };

      etpRepository.findOne.mockResolvedValue(mockEtp as Etp);
      validationService.validateEtp.mockResolvedValue(validationWithMixedTypes);
      historyRepository.find.mockResolvedValue([]);
      historyRepository.create.mockReturnValue(
        mockHistoryEntry as ComplianceValidationHistory,
      );
      historyRepository.save.mockResolvedValue(
        mockHistoryEntry as ComplianceValidationHistory,
      );

      const report = await service.generateReport(
        'test-etp-id',
        'user-id',
        'user',
        'org-id',
      );

      expect(report.violations).toHaveLength(3);
      // Violations should be sorted by severity
      expect(report.violations[0].severity).toBe('CRITICAL');
      expect(report.violations[1].severity).toBe('HIGH');
      expect(report.violations[2].severity).toBe('MEDIUM');
    });
  });

  describe('buildReport - category scores', () => {
    it('should calculate category scores correctly', async () => {
      etpRepository.findOne.mockResolvedValue(mockEtp as Etp);
      validationService.validateEtp.mockResolvedValue(mockValidationResult);
      historyRepository.find.mockResolvedValue([]);
      historyRepository.create.mockReturnValue(
        mockHistoryEntry as ComplianceValidationHistory,
      );
      historyRepository.save.mockResolvedValue(
        mockHistoryEntry as ComplianceValidationHistory,
      );

      const report = await service.generateReport(
        'test-etp-id',
        'user-id',
        'user',
        'org-id',
      );

      // Only categories with items should be included
      const categoriesWithItems = report.categoryScores.filter(
        (c) => c.totalItems > 0,
      );
      expect(categoriesWithItems.length).toBeGreaterThan(0);

      // Check score calculation
      const justificationCategory = report.categoryScores.find(
        (c) => c.category === ChecklistItemCategory.JUSTIFICATION,
      );
      expect(justificationCategory).toBeDefined();
      // 15/25 * 100 = 60%
      expect(justificationCategory?.score).toBe(60);
    });
  });
});
