import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ComplianceController } from '../compliance.controller';
import { ComplianceValidationService } from '../compliance-validation.service';
import { Etp } from '../../../entities/etp.entity';
import { EtpTemplateType } from '../../../entities/etp-template.entity';
import { ChecklistItemCategory } from '../../../entities/compliance-checklist-item.entity';
import { ComplianceStandard } from '../../../entities/compliance-checklist.entity';

/**
 * Unit tests for ComplianceController
 *
 * Issue #1385 - [TCU-1163d] Criar endpoints REST para validacao de conformidade
 */
describe('ComplianceController', () => {
  let controller: ComplianceController;
  let complianceService: jest.Mocked<ComplianceValidationService>;
  let etpRepository: jest.Mocked<Repository<Etp>>;

  const mockEtp: Partial<Etp> = {
    id: 'etp-123',
    createdById: 'user-123',
    organizationId: 'org-123',
    title: 'Test ETP',
    templateType: EtpTemplateType.SERVICOS,
  };

  const mockValidationResult = {
    etpId: 'etp-123',
    checklistId: 'checklist-123',
    checklistName: 'TCU - Servicos',
    score: 75,
    minimumScore: 70,
    passed: true,
    status: 'APPROVED' as const,
    totalItems: 20,
    passedItems: 15,
    failedItems: 5,
    skippedItems: 0,
    itemResults: [],
    suggestions: [],
    categoryScores: {} as Record<
      ChecklistItemCategory,
      { total: number; passed: number; score: number; maxScore: number }
    >,
    validatedAt: new Date(),
    processingTimeMs: 100,
  };

  const mockScoreSummary = {
    score: 75,
    passed: true,
    status: 'APPROVED' as const,
    totalItems: 20,
    passedItems: 15,
    failedItems: 5,
    topIssues: [],
  };

  const mockSuggestions = [
    {
      category: ChecklistItemCategory.JUSTIFICATION,
      title: 'Justificativa incompleta',
      description: 'Adicione mais detalhes...',
      priority: 'high' as const,
    },
  ];

  const mockChecklist = {
    id: 'checklist-123',
    name: 'TCU - Servicos',
    description: 'Checklist para servicos',
    standard: ComplianceStandard.TCU,
    templateType: EtpTemplateType.SERVICOS,
    legalBasis: 'Lei 14.133/2021',
    version: '1.0',
    minimumScore: 70,
    isActive: true,
    items: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ComplianceController],
      providers: [
        {
          provide: ComplianceValidationService,
          useValue: {
            validateEtp: jest.fn(),
            getScoreSummary: jest.fn(),
            getSuggestions: jest.fn(),
            findAllChecklists: jest.fn(),
            findChecklistById: jest.fn(),
            findChecklistsByTemplateType: jest.fn(),
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

    controller = module.get<ComplianceController>(ComplianceController);
    complianceService = module.get(ComplianceValidationService);
    etpRepository = module.get(getRepositoryToken(Etp));
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('validateEtp', () => {
    it('should validate ETP and return result for owner', async () => {
      etpRepository.findOne.mockResolvedValue(mockEtp as Etp);
      complianceService.validateEtp.mockResolvedValue(mockValidationResult);

      const result = await controller.validateEtp(
        'etp-123',
        {},
        'user-123',
        'user',
        'org-123',
      );

      expect(result.data).toEqual(mockValidationResult);
      expect(result.disclaimer).toBeDefined();
      expect(complianceService.validateEtp).toHaveBeenCalledWith(
        'etp-123',
        undefined,
        false,
      );
    });

    it('should allow admin to validate any ETP in org', async () => {
      const adminEtp = { ...mockEtp, createdById: 'other-user' };
      etpRepository.findOne.mockResolvedValue(adminEtp as Etp);
      complianceService.validateEtp.mockResolvedValue(mockValidationResult);

      const result = await controller.validateEtp(
        'etp-123',
        {},
        'admin-user',
        'admin',
        'org-123',
      );

      expect(result.data).toEqual(mockValidationResult);
    });

    it('should throw NotFoundException when ETP not found', async () => {
      etpRepository.findOne.mockResolvedValue(null);

      await expect(
        controller.validateEtp('etp-999', {}, 'user-123', 'user', 'org-123'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when user is not owner and not admin', async () => {
      const otherUserEtp = { ...mockEtp, createdById: 'other-user' };
      etpRepository.findOne.mockResolvedValue(otherUserEtp as Etp);

      await expect(
        controller.validateEtp('etp-123', {}, 'user-123', 'user', 'org-123'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should pass checklistId and includeOptional to service', async () => {
      etpRepository.findOne.mockResolvedValue(mockEtp as Etp);
      complianceService.validateEtp.mockResolvedValue(mockValidationResult);

      await controller.validateEtp(
        'etp-123',
        { checklistId: 'custom-checklist', includeOptional: true },
        'user-123',
        'user',
        'org-123',
      );

      expect(complianceService.validateEtp).toHaveBeenCalledWith(
        'etp-123',
        'custom-checklist',
        true,
      );
    });
  });

  describe('getScore', () => {
    it('should return score summary for owner', async () => {
      etpRepository.findOne.mockResolvedValue(mockEtp as Etp);
      complianceService.getScoreSummary.mockResolvedValue(mockScoreSummary);

      const result = await controller.getScore(
        'etp-123',
        'user-123',
        'user',
        'org-123',
      );

      expect(result.data).toEqual(mockScoreSummary);
      expect(result.disclaimer).toBeDefined();
    });

    it('should throw ForbiddenException for non-owner', async () => {
      const otherUserEtp = { ...mockEtp, createdById: 'other-user' };
      etpRepository.findOne.mockResolvedValue(otherUserEtp as Etp);

      await expect(
        controller.getScore('etp-123', 'user-123', 'user', 'org-123'),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('getSuggestions', () => {
    it('should return suggestions for owner', async () => {
      etpRepository.findOne.mockResolvedValue(mockEtp as Etp);
      complianceService.getSuggestions.mockResolvedValue(mockSuggestions);

      const result = await controller.getSuggestions(
        'etp-123',
        'user-123',
        'user',
        'org-123',
      );

      expect(result.data).toEqual(mockSuggestions);
      expect(result.disclaimer).toBeDefined();
    });
  });

  describe('listChecklists', () => {
    it('should return all checklists when no filter', async () => {
      complianceService.findAllChecklists.mockResolvedValue([mockChecklist]);

      const result = await controller.listChecklists({});

      expect(result.data).toEqual([mockChecklist]);
      expect(complianceService.findAllChecklists).toHaveBeenCalled();
    });

    it('should filter by templateType when provided', async () => {
      complianceService.findChecklistsByTemplateType.mockResolvedValue([
        mockChecklist,
      ]);

      const result = await controller.listChecklists({
        templateType: EtpTemplateType.SERVICOS,
      });

      expect(result.data).toEqual([mockChecklist]);
      expect(
        complianceService.findChecklistsByTemplateType,
      ).toHaveBeenCalledWith(EtpTemplateType.SERVICOS);
    });
  });

  describe('getChecklist', () => {
    it('should return checklist by ID', async () => {
      complianceService.findChecklistById.mockResolvedValue(mockChecklist);

      const result = await controller.getChecklist('checklist-123');

      expect(result.data).toEqual(mockChecklist);
    });

    it('should throw NotFoundException when checklist not found', async () => {
      complianceService.findChecklistById.mockResolvedValue(null);

      await expect(controller.getChecklist('checklist-999')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('Access control', () => {
    it('should allow system_admin to access any ETP', async () => {
      const otherOrgEtp = {
        ...mockEtp,
        createdById: 'other-user',
        organizationId: 'other-org',
      };
      etpRepository.findOne.mockResolvedValue(otherOrgEtp as Etp);
      complianceService.validateEtp.mockResolvedValue(mockValidationResult);

      // system_admin can access any ETP in the same org
      const sameOrgEtp = { ...mockEtp, createdById: 'other-user' };
      etpRepository.findOne.mockResolvedValue(sameOrgEtp as Etp);

      const result = await controller.validateEtp(
        'etp-123',
        {},
        'system-admin',
        'system_admin',
        'org-123',
      );

      expect(result.data).toEqual(mockValidationResult);
    });

    it('should deny admin access to ETPs in different org', async () => {
      const otherOrgEtp = {
        ...mockEtp,
        createdById: 'other-user',
        organizationId: 'other-org',
      };
      etpRepository.findOne.mockResolvedValue(otherOrgEtp as Etp);

      await expect(
        controller.validateEtp('etp-123', {}, 'admin-user', 'admin', 'org-123'),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
