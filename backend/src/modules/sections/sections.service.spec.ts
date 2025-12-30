import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { getQueueToken } from '@nestjs/bullmq';
import { Repository, DataSource } from 'typeorm';
import { SectionsService } from './sections.service';
import {
  EtpSection,
  SectionStatus,
  SectionType,
} from '../../entities/etp-section.entity';
import { Etp } from '../../entities/etp.entity';
import { User } from '../../entities/user.entity';
import { OrchestratorService } from '../orchestrator/orchestrator.service';
import { EtpsService } from '../etps/etps.service';

/**
 * Unit tests for SectionsService
 *
 * Tests all service methods for ETP section generation and management:
 * - generateSection() - AI-powered section generation
 * - findAll() - List sections for an ETP
 * - findOne() - Get section by ID
 * - update() - Manual section updates
 * - regenerateSection() - Regenerate with AI
 * - validateSection() - Run validation agents
 * - remove() - Delete section
 *
 * Coverage objectives: ≥80% service coverage with proper mocking
 */
describe('SectionsService', () => {
  let service: SectionsService;
  let sectionsRepository: Repository<EtpSection>;
  let etpsRepository: Repository<Etp>;
  let orchestratorService: OrchestratorService;
  let etpsService: EtpsService;

  // Mock data
  const mockUserId = 'user-123';
  const mockEtpId = 'etp-456';
  const mockSectionId = 'section-789';
  const mockOrganizationId = 'org-789';

  const mockUser = {
    id: mockUserId,
    email: 'test@example.com',
    name: 'Test User',
  } as User;

  const mockEtp = {
    id: mockEtpId,
    title: 'ETP de Contratação de TI',
    description: 'Descrição do ETP',
    objeto: 'Contratação de serviços de TI',
    numeroProcesso: '12345/2025',
    valorEstimado: 100000,
    status: 'draft' as any,
    metadata: {},
    currentVersion: 1,
    completionPercentage: 0,
    version: 1,
    createdById: mockUserId,
    createdBy: mockUser,
    organizationId: mockOrganizationId,
    organization: { id: mockOrganizationId, name: 'Test Org' } as any,
    sections: [],
    versions: [],
    auditLogs: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  } as Etp;

  const mockSection = {
    id: mockSectionId,
    etpId: mockEtpId,
    type: SectionType.JUSTIFICATIVA,
    title: 'Justificativa da Contratação',
    content: 'Conteúdo gerado pela IA',
    userInput: 'Input do usuário',
    systemPrompt: '',
    status: SectionStatus.GENERATED,
    order: 1,
    isRequired: true,
    metadata: {
      tokens: 150,
      model: 'gpt-4',
      generationTime: 2500,
      agentsUsed: ['legal-context', 'anti-hallucination'],
    },
    validationResults: {
      legalCompliance: true,
      clarityScore: 85,
      hallucinationCheck: true,
      warnings: [],
      suggestions: [],
    },
    etp: mockEtp,
    createdAt: new Date(),
    updatedAt: new Date(),
  } as EtpSection;

  const mockGenerationResult = {
    content: 'Conteúdo gerado pela IA',
    metadata: {
      tokens: 150,
      model: 'gpt-4',
      generationTime: 2500,
      agentsUsed: ['legal-context', 'anti-hallucination'],
    },
    warnings: [],
    validationResults: {
      legal: { isCompliant: true, score: 90, issues: [], recommendations: [] },
      clareza: { score: 85, issues: [], suggestions: [] },
      antiHallucination: { verified: true, suggestions: [] },
    },
  };

  const mockValidationResults = {
    legal: { isCompliant: true, score: 90, issues: [], recommendations: [] },
    clareza: { score: 85, issues: [], suggestions: [] },
    simplificacao: { simplifiedSuggestions: ['Simplifique a linguagem'] },
    antiHallucination: { verified: true, suggestions: [] },
  };

  /**
   * Mock repository factory with common query builder methods
   */
  const createMockRepository = () => ({
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    remove: jest.fn(),
    createQueryBuilder: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      getRawOne: jest.fn(),
    })),
  });

  const mockSectionsRepository = createMockRepository();
  const mockEtpsRepository = createMockRepository();

  const mockOrchestratorService = {
    generateSection: jest.fn(),
    validateContent: jest.fn(),
  };

  const mockEtpsService = {
    findOne: jest.fn(),
    findOneMinimal: jest.fn(),
    findOneWithSections: jest.fn(),
    findOneWithVersions: jest.fn(),
    updateCompletionPercentage: jest.fn(),
  };

  const mockSectionsQueue = {
    add: jest.fn().mockResolvedValue({ id: 'job-123' }),
    getJob: jest.fn(),
  };

  /**
   * Mock queryRunner for transaction testing
   * Supports both update() transactions (Issue #1064) and getNextOrder transactions (Issue #1065)
   * Uses a stable queryBuilder mock that persists across calls
   */
  const mockQueryBuilder = {
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    setLock: jest.fn().mockReturnThis(),
    getOne: jest.fn(),
    select: jest.fn().mockReturnThis(),
    getRawOne: jest.fn().mockResolvedValue({ maxOrder: 0 }),
  };

  const mockQueryRunner = {
    connect: jest.fn(),
    startTransaction: jest.fn(),
    commitTransaction: jest.fn(),
    rollbackTransaction: jest.fn(),
    release: jest.fn(),
    manager: {
      save: jest.fn(),
      update: jest.fn(),
      createQueryBuilder: jest.fn(() => mockQueryBuilder),
    },
  };

  const mockDataSource = {
    createQueryRunner: jest.fn(() => mockQueryRunner),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SectionsService,
        {
          provide: getRepositoryToken(EtpSection),
          useValue: mockSectionsRepository,
        },
        {
          provide: getRepositoryToken(Etp),
          useValue: mockEtpsRepository,
        },
        {
          provide: getQueueToken('sections'),
          useValue: mockSectionsQueue,
        },
        {
          provide: OrchestratorService,
          useValue: mockOrchestratorService,
        },
        {
          provide: EtpsService,
          useValue: mockEtpsService,
        },
        {
          provide: DataSource,
          useValue: mockDataSource,
        },
      ],
    }).compile();

    service = module.get<SectionsService>(SectionsService);
    sectionsRepository = module.get<Repository<EtpSection>>(
      getRepositoryToken(EtpSection),
    );
    etpsRepository = module.get<Repository<Etp>>(getRepositoryToken(Etp));
    orchestratorService = module.get<OrchestratorService>(OrchestratorService);
    etpsService = module.get<EtpsService>(EtpsService);

    // Reset mocks before each test
    jest.clearAllMocks();

    // Suppress logger output in tests
    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  /**
   * Tests for generateSection()
   * Validates AI-powered section generation
   */
  describe('generateSection', () => {
    const generateDto = {
      type: SectionType.JUSTIFICATIVA,
      title: 'Justificativa da Contratação',
      userInput: 'Precisamos contratar serviços de TI',
      context: {
        orgao: 'CONFENGE',
        prazo: 'urgente',
      },
    };

    it('should queue a new section generation successfully', async () => {
      // Arrange
      mockEtpsService.findOneMinimal.mockResolvedValue(mockEtp);
      mockSectionsRepository.findOne.mockResolvedValue(null); // No existing section
      mockSectionsRepository.create.mockReturnValue({
        ...mockSection,
        status: SectionStatus.GENERATING,
      });
      mockSectionsRepository.save.mockResolvedValue({
        ...mockSection,
        status: SectionStatus.GENERATING,
        metadata: { jobId: 'job-123', queuedAt: expect.any(String) },
      });
      // Mock QueryRunner for transaction-based getNextOrder
      mockQueryRunner.manager.createQueryBuilder = jest.fn(() => ({
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        setLock: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({ maxOrder: 0 }),
      }));

      // Act
      const result = await service.generateSection(
        mockEtpId,
        generateDto,
        mockUserId,
        mockOrganizationId,
      );

      // Assert - Verify queue was called
      expect(mockSectionsQueue.add).toHaveBeenCalledWith(
        'generate',
        expect.objectContaining({
          etpId: mockEtpId,
          sectionType: generateDto.type,
          title: generateDto.title,
          userInput: generateDto.userInput,
          context: generateDto.context,
          userId: mockUserId,
          organizationId: mockOrganizationId,
          sectionId: expect.any(String),
        }),
        expect.objectContaining({
          attempts: 3,
          backoff: { type: 'exponential', delay: 5000 },
        }),
      );

      // Verify section was created with GENERATING status
      expect(result).toBeDefined();
      expect(result.status).toBe(SectionStatus.GENERATING);
      expect(result.metadata?.jobId).toBe('job-123');
    });

    it('should throw NotFoundException when ETP does not exist', async () => {
      // Arrange
      mockEtpsService.findOneMinimal.mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.generateSection(
          mockEtpId,
          generateDto,
          mockUserId,
          mockOrganizationId,
        ),
      ).rejects.toThrow(NotFoundException);
      expect(mockEtpsService.findOneMinimal).toHaveBeenCalledWith(
        mockEtpId,
        mockOrganizationId,
        mockUserId,
      );
    });

    it('should throw BadRequestException when section already exists', async () => {
      // Arrange
      mockEtpsService.findOneMinimal.mockResolvedValue(mockEtp);
      mockSectionsRepository.findOne.mockResolvedValue(mockSection); // Existing section

      // Act & Assert
      await expect(
        service.generateSection(
          mockEtpId,
          generateDto,
          mockUserId,
          mockOrganizationId,
        ),
      ).rejects.toThrow(BadRequestException);
      expect(mockSectionsRepository.findOne).toHaveBeenCalledWith({
        where: { etpId: mockEtpId, type: generateDto.type },
      });
    });

    it('should queue generation even if orchestrator fails later (async)', async () => {
      // Arrange
      // Note: This test validates that queueing succeeds even if generation will fail later
      mockEtpsService.findOneMinimal.mockResolvedValue(mockEtp);
      mockSectionsRepository.findOne.mockResolvedValue(null);
      mockSectionsRepository.create.mockReturnValue({
        ...mockSection,
        status: SectionStatus.GENERATING,
      });
      mockSectionsRepository.save.mockResolvedValue({
        ...mockSection,
        status: SectionStatus.GENERATING,
        metadata: { jobId: 'job-123', queuedAt: expect.any(String) },
      });
      // Mock QueryRunner for transaction-based getNextOrder
      mockQueryRunner.manager.createQueryBuilder = jest.fn(() => ({
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        setLock: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({ maxOrder: 0 }),
      }));

      // Act
      const result = await service.generateSection(
        mockEtpId,
        generateDto,
        mockUserId,
        mockOrganizationId,
      );

      // Assert - Queue call succeeds immediately
      expect(mockSectionsQueue.add).toHaveBeenCalled();
      expect(result.status).toBe(SectionStatus.GENERATING);
      expect(result.metadata?.jobId).toBe('job-123');

      // Note: Error handling now happens in SectionsProcessor (background worker)
      // See sections.processor.spec.ts for error handling tests
    });

    it('should set correct order for new section', async () => {
      // Arrange
      mockEtpsService.findOneMinimal.mockResolvedValue(mockEtp);
      mockSectionsRepository.findOne.mockResolvedValue(null);

      // Mock QueryRunner for transaction-based getNextOrder with maxOrder = 2
      mockQueryRunner.manager.createQueryBuilder = jest.fn(() => ({
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        setLock: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({ maxOrder: 2 }),
      }));

      // Mock create to return section with order 3
      mockSectionsRepository.create.mockImplementation((data) => ({
        ...mockSection,
        ...data,
      }));

      mockSectionsRepository.save
        .mockResolvedValueOnce({ ...mockSection, order: 3 })
        .mockResolvedValueOnce({ ...mockSection, order: 3 });
      mockOrchestratorService.generateSection.mockResolvedValue(
        mockGenerationResult,
      );

      // Act
      await service.generateSection(
        mockEtpId,
        generateDto,
        mockUserId,
        mockOrganizationId,
      );

      // Assert
      const createCall = mockSectionsRepository.create.mock.calls[0][0];
      expect(createCall.order).toBe(3); // maxOrder(2) + 1
    });

    it('should mark required sections correctly', async () => {
      // Arrange
      const requiredGenerateDto = {
        ...generateDto,
        type: SectionType.REQUISITOS, // Required section
      };
      mockEtpsService.findOne.mockResolvedValue(mockEtp);
      mockSectionsRepository.findOne.mockResolvedValue(null);
      mockSectionsRepository.create.mockReturnValue(mockSection);
      mockSectionsRepository.save
        .mockResolvedValueOnce(mockSection)
        .mockResolvedValueOnce(mockSection);
      mockOrchestratorService.generateSection.mockResolvedValue(
        mockGenerationResult,
      );
      // Mock QueryRunner for transaction-based getNextOrder
      mockQueryRunner.manager.createQueryBuilder = jest.fn(() => ({
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        setLock: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({ maxOrder: 0 }),
      }));

      // Act
      await service.generateSection(
        mockEtpId,
        requiredGenerateDto,
        mockUserId,
        mockOrganizationId,
      );

      // Assert
      expect(mockSectionsRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          isRequired: true,
        }),
      );
    });

    it('should convert validation results from orchestrator format', async () => {
      // Arrange
      mockEtpsService.findOne.mockResolvedValue(mockEtp);
      mockSectionsRepository.findOne.mockResolvedValue(null);
      mockSectionsRepository.create.mockReturnValue(mockSection);
      mockSectionsRepository.save
        .mockResolvedValueOnce(mockSection)
        .mockResolvedValueOnce(mockSection);
      mockOrchestratorService.generateSection.mockResolvedValue(
        mockGenerationResult,
      );
      // Mock QueryRunner for transaction-based getNextOrder
      mockQueryRunner.manager.createQueryBuilder = jest.fn(() => ({
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        setLock: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({ maxOrder: 0 }),
      }));

      // Act
      const result = await service.generateSection(
        mockEtpId,
        generateDto,
        mockUserId,
        mockOrganizationId,
      );

      // Assert
      expect(result.validationResults).toEqual({
        legalCompliance: true,
        clarityScore: 85,
        hallucinationCheck: true,
        warnings: [],
        suggestions: [],
      });
    });

    /**
     * Test for unique constraint handling (#1058)
     * Validates race condition prevention via PostgreSQL unique violation
     */
    it('should return existing section when PostgreSQL unique violation occurs (race condition)', async () => {
      // Arrange - Simulate race condition: findOne returns null (no existing section),
      // but save fails with PostgreSQL unique violation (another request created it first)
      const existingSection = {
        ...mockSection,
        status: SectionStatus.GENERATED,
        content: 'Already generated content',
      };

      mockEtpsService.findOneMinimal.mockResolvedValue(mockEtp);
      // First findOne (before save) returns null - section doesn't exist yet
      mockSectionsRepository.findOne.mockResolvedValueOnce(null);
      mockSectionsRepository.create.mockReturnValue({
        ...mockSection,
        status: SectionStatus.GENERATING,
      });
      // Mock QueryRunner for transaction-based getNextOrder
      mockQueryRunner.manager.createQueryBuilder = jest.fn(() => ({
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        setLock: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({ maxOrder: 0 }),
      }));

      // Save throws PostgreSQL unique violation error (code 23505)
      const uniqueViolationError = new Error(
        'duplicate key value violates unique constraint "UQ_section_etp_type"',
      );
      (uniqueViolationError as any).code = '23505';
      mockSectionsRepository.save.mockRejectedValueOnce(uniqueViolationError);

      // Second findOne (in catch block) returns the existing section
      mockSectionsRepository.findOne.mockResolvedValueOnce(existingSection);

      // Suppress logger warning for this test
      jest.spyOn(Logger.prototype, 'warn').mockImplementation();

      // Act
      const result = await service.generateSection(
        mockEtpId,
        generateDto,
        mockUserId,
        mockOrganizationId,
      );

      // Assert - Should return the existing section, not throw error
      expect(result).toEqual(existingSection);
      expect(result.status).toBe(SectionStatus.GENERATED);
      expect(result.content).toBe('Already generated content');

      // Verify the flow: first findOne (null), save (throws), second findOne (existing)
      expect(mockSectionsRepository.findOne).toHaveBeenCalledTimes(2);
      expect(mockSectionsRepository.save).toHaveBeenCalledTimes(1);

      // Queue should NOT be called since we returned the existing section
      expect(mockSectionsQueue.add).not.toHaveBeenCalled();
    });

    it('should throw error when unique violation occurs but no existing section found', async () => {
      // Arrange - Edge case: unique violation but section somehow not found
      mockEtpsService.findOneMinimal.mockResolvedValue(mockEtp);
      mockSectionsRepository.findOne.mockResolvedValueOnce(null); // Before save
      mockSectionsRepository.create.mockReturnValue({
        ...mockSection,
        status: SectionStatus.GENERATING,
      });
      // Mock QueryRunner for transaction-based getNextOrder
      mockQueryRunner.manager.createQueryBuilder = jest.fn(() => ({
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        setLock: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({ maxOrder: 0 }),
      }));

      const uniqueViolationError = new Error(
        'duplicate key value violates unique constraint',
      );
      (uniqueViolationError as any).code = '23505';
      mockSectionsRepository.save.mockRejectedValueOnce(uniqueViolationError);
      mockSectionsRepository.findOne.mockResolvedValueOnce(null); // In catch block - section not found

      // Suppress logger warning for this test
      jest.spyOn(Logger.prototype, 'warn').mockImplementation();

      // Act & Assert - Should throw the original error
      await expect(
        service.generateSection(
          mockEtpId,
          generateDto,
          mockUserId,
          mockOrganizationId,
        ),
      ).rejects.toThrow('duplicate key value violates unique constraint');
    });

    it('should throw non-unique-violation errors normally', async () => {
      // Arrange
      mockEtpsService.findOneMinimal.mockResolvedValue(mockEtp);
      mockSectionsRepository.findOne.mockResolvedValue(null);
      mockSectionsRepository.create.mockReturnValue({
        ...mockSection,
        status: SectionStatus.GENERATING,
      });
      // Mock QueryRunner for transaction-based getNextOrder
      mockQueryRunner.manager.createQueryBuilder = jest.fn(() => ({
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        setLock: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({ maxOrder: 0 }),
      }));

      // Different error (not unique violation)
      const connectionError = new Error('Connection refused');
      (connectionError as any).code = 'ECONNREFUSED';
      mockSectionsRepository.save.mockRejectedValueOnce(connectionError);

      // Act & Assert
      await expect(
        service.generateSection(
          mockEtpId,
          generateDto,
          mockUserId,
          mockOrganizationId,
        ),
      ).rejects.toThrow('Connection refused');
    });
  });

  /**
   * Tests for getJobStatus()
   * Validates async job status polling
   * @see #186 - Async queue processing
   * @see #391 - Job Status API
   */
  describe('getJobStatus', () => {
    const mockJobId = 'job-123';

    it('should return job status for waiting job', async () => {
      // Arrange
      const mockJob = {
        id: mockJobId,
        timestamp: Date.now(),
        attemptsMade: 0,
        opts: { attempts: 3 },
        progress: 0,
        getState: jest.fn().mockResolvedValue('waiting'),
        processedOn: null,
        finishedOn: null,
        returnvalue: null,
        failedReason: null,
      };

      mockSectionsQueue.getJob.mockResolvedValue(mockJob);

      // Act
      const result = await service.getJobStatus(mockJobId);

      // Assert
      expect(mockSectionsQueue.getJob).toHaveBeenCalledWith(mockJobId);
      expect(result.jobId).toBe(mockJobId);
      expect(result.status).toBe('waiting');
      expect(result.progress).toBe(0);
      expect(result.attemptsMade).toBe(0);
      expect(result.attemptsMax).toBe(3);
    });

    it('should return job status for active job with progress', async () => {
      // Arrange
      const mockJob = {
        id: mockJobId,
        timestamp: Date.now(),
        attemptsMade: 0,
        opts: { attempts: 3 },
        progress: 75,
        getState: jest.fn().mockResolvedValue('active'),
        processedOn: Date.now(),
        finishedOn: null,
        returnvalue: null,
        failedReason: null,
      };

      mockSectionsQueue.getJob.mockResolvedValue(mockJob);

      // Act
      const result = await service.getJobStatus(mockJobId);

      // Assert
      expect(result.status).toBe('active');
      expect(result.progress).toBe(75);
      expect(result.processedOn).toBeDefined();
    });

    it('should return job status for completed job with result', async () => {
      // Arrange
      const mockResult = {
        sectionId: mockSectionId,
        status: SectionStatus.GENERATED,
        content: 'Generated content',
      };

      const mockJob = {
        id: mockJobId,
        timestamp: Date.now(),
        attemptsMade: 0,
        opts: { attempts: 3 },
        progress: 95,
        getState: jest.fn().mockResolvedValue('completed'),
        processedOn: Date.now(),
        finishedOn: Date.now(),
        returnvalue: mockResult,
        failedReason: null,
      };

      mockSectionsQueue.getJob.mockResolvedValue(mockJob);

      // Act
      const result = await service.getJobStatus(mockJobId);

      // Assert
      expect(result.status).toBe('completed');
      expect(result.progress).toBe(100); // Always 100 for completed
      expect(result.completedAt).toBeDefined();
      expect(result.result).toEqual(mockResult);
    });

    it('should return job status for failed job with error', async () => {
      // Arrange
      const mockFailureReason = 'OpenAI API timeout';

      const mockJob = {
        id: mockJobId,
        timestamp: Date.now(),
        attemptsMade: 3,
        opts: { attempts: 3 },
        progress: 50,
        getState: jest.fn().mockResolvedValue('failed'),
        processedOn: Date.now(),
        finishedOn: Date.now(),
        returnvalue: null,
        failedReason: mockFailureReason,
      };

      mockSectionsQueue.getJob.mockResolvedValue(mockJob);

      // Act
      const result = await service.getJobStatus(mockJobId);

      // Assert
      expect(result.status).toBe('failed');
      expect(result.error).toBe(mockFailureReason);
      expect(result.failedReason).toBe(mockFailureReason);
      expect(result.attemptsMade).toBe(3);
      expect(result.completedAt).toBeDefined();
    });

    it('should throw NotFoundException when job not found', async () => {
      // Arrange
      mockSectionsQueue.getJob.mockResolvedValue(null);

      // Act & Assert
      await expect(service.getJobStatus(mockJobId)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.getJobStatus(mockJobId)).rejects.toThrow(
        `Job ${mockJobId} não encontrado ou já expirou`,
      );
    });

    it('should map job state correctly for delayed jobs', async () => {
      // Arrange
      const mockJob = {
        id: mockJobId,
        timestamp: Date.now(),
        attemptsMade: 1,
        opts: { attempts: 3 },
        progress: 10,
        getState: jest.fn().mockResolvedValue('delayed'),
        processedOn: null,
        finishedOn: null,
        returnvalue: null,
        failedReason: null,
      };

      mockSectionsQueue.getJob.mockResolvedValue(mockJob);

      // Act
      const result = await service.getJobStatus(mockJobId);

      // Assert
      expect(result.status).toBe('delayed');
    });

    it('should map unknown job states to "unknown"', async () => {
      // Arrange
      const mockJob = {
        id: mockJobId,
        timestamp: Date.now(),
        attemptsMade: 0,
        opts: { attempts: 3 },
        progress: 0,
        getState: jest.fn().mockResolvedValue('some-weird-state'),
        processedOn: null,
        finishedOn: null,
        returnvalue: null,
        failedReason: null,
      };

      mockSectionsQueue.getJob.mockResolvedValue(mockJob);

      // Act
      const result = await service.getJobStatus(mockJobId);

      // Assert
      expect(result.status).toBe('unknown');
    });
  });

  /**
   * Tests for findAll()
   * Validates listing sections for an ETP
   */
  describe('findAll', () => {
    it('should return all sections for an ETP ordered by order field', async () => {
      // Arrange
      const sections = [mockSection];
      mockSectionsRepository.find.mockResolvedValue(sections);

      // Act
      const result = await service.findAll(mockEtpId);

      // Assert
      expect(mockSectionsRepository.find).toHaveBeenCalledWith({
        where: { etpId: mockEtpId },
        order: { order: 'ASC' },
      });
      expect(result).toEqual(sections);
      expect(result).toHaveLength(1);
    });

    it('should return empty array when ETP has no sections', async () => {
      // Arrange
      mockSectionsRepository.find.mockResolvedValue([]);

      // Act
      const result = await service.findAll(mockEtpId);

      // Assert
      expect(result).toEqual([]);
      expect(result).toHaveLength(0);
    });
  });

  /**
   * Tests for findOne()
   * Validates finding section by ID
   */
  describe('findOne', () => {
    it('should return section with ETP relation', async () => {
      // Arrange
      mockSectionsRepository.findOne.mockResolvedValue(mockSection);

      // Act
      const result = await service.findOne(mockSectionId);

      // Assert
      expect(mockSectionsRepository.findOne).toHaveBeenCalledWith({
        where: { id: mockSectionId },
        relations: ['etp'],
      });
      expect(result).toEqual(mockSection);
      expect(result.etp).toBeDefined();
    });

    it('should throw NotFoundException when section does not exist', async () => {
      // Arrange
      mockSectionsRepository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(service.findOne('invalid-id')).rejects.toThrow(
        NotFoundException,
      );
      expect(mockSectionsRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'invalid-id' },
        relations: ['etp'],
      });
    });
  });

  /**
   * Tests for update()
   * Validates manual section updates with ACID transactions (Issue #1064)
   */
  describe('update', () => {
    const updateDto = {
      title: 'Título atualizado',
      content: 'Conteúdo atualizado',
      status: SectionStatus.APPROVED,
    };

    beforeEach(() => {
      // Reset queryRunner mocks
      mockQueryRunner.connect.mockResolvedValue(undefined);
      mockQueryRunner.startTransaction.mockResolvedValue(undefined);
      mockQueryRunner.commitTransaction.mockResolvedValue(undefined);
      mockQueryRunner.rollbackTransaction.mockResolvedValue(undefined);
      mockQueryRunner.release.mockResolvedValue(undefined);
      mockQueryRunner.manager.save.mockReset();
      mockQueryRunner.manager.update.mockReset();
      mockQueryBuilder.getOne.mockReset();
      mockQueryBuilder.setLock.mockClear();
    });

    it('should update section successfully within transaction', async () => {
      // Arrange
      mockSectionsRepository.findOne.mockResolvedValue(mockSection);
      const updatedSection = { ...mockSection, ...updateDto };
      mockQueryRunner.manager.save.mockResolvedValue(updatedSection);

      const mockEtpWithSections = {
        ...mockEtp,
        sections: [{ ...mockSection, status: SectionStatus.APPROVED }],
      };
      mockQueryBuilder.getOne.mockResolvedValue(mockEtpWithSections);

      // Act
      const result = await service.update(
        mockSectionId,
        updateDto,
        mockOrganizationId,
      );

      // Assert - Verify transaction lifecycle
      expect(mockDataSource.createQueryRunner).toHaveBeenCalled();
      expect(mockQueryRunner.connect).toHaveBeenCalled();
      expect(mockQueryRunner.startTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.manager.save).toHaveBeenCalled();
      expect(mockQueryRunner.manager.update).toHaveBeenCalled();
      expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.release).toHaveBeenCalled();
      expect(result.title).toBe(updateDto.title);
    });

    it('should rollback transaction on error', async () => {
      // Arrange
      mockSectionsRepository.findOne.mockResolvedValue(mockSection);
      mockQueryRunner.manager.save.mockRejectedValue(new Error('DB Error'));

      // Act & Assert
      await expect(
        service.update(mockSectionId, updateDto, mockOrganizationId),
      ).rejects.toThrow('DB Error');

      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.release).toHaveBeenCalled();
      expect(mockQueryRunner.commitTransaction).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when section does not exist', async () => {
      // Arrange
      mockSectionsRepository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.update('invalid-id', updateDto, mockOrganizationId),
      ).rejects.toThrow(NotFoundException);
    });

    it('should allow partial updates within transaction', async () => {
      // Arrange
      const partialUpdateDto = { title: 'Novo título apenas' };
      mockSectionsRepository.findOne.mockResolvedValue(mockSection);
      const updatedSection = { ...mockSection, ...partialUpdateDto };
      mockQueryRunner.manager.save.mockResolvedValue(updatedSection);
      mockQueryBuilder.getOne.mockResolvedValue({
        ...mockEtp,
        sections: [mockSection],
      });

      // Act
      const result = await service.update(
        mockSectionId,
        partialUpdateDto,
        mockOrganizationId,
      );

      // Assert
      expect(result.title).toBe('Novo título apenas');
      expect(result.content).toBe(mockSection.content);
      expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
    });

    it('should calculate correct completion percentage for approved sections', async () => {
      // Arrange
      mockSectionsRepository.findOne.mockResolvedValue(mockSection);
      const updatedSection = { ...mockSection, status: SectionStatus.APPROVED };
      mockQueryRunner.manager.save.mockResolvedValue(updatedSection);

      // ETP with 2 sections, 1 approved after update
      const mockEtpWith2Sections = {
        ...mockEtp,
        sections: [
          { ...mockSection, status: SectionStatus.APPROVED },
          { ...mockSection, id: 'section-2', status: SectionStatus.GENERATED },
        ],
      };
      mockQueryBuilder.getOne.mockResolvedValue(mockEtpWith2Sections);

      // Act
      await service.update(
        mockSectionId,
        { status: SectionStatus.APPROVED },
        mockOrganizationId,
      );

      // Assert - Should calculate 50% (1/2 sections approved)
      expect(mockQueryRunner.manager.update).toHaveBeenCalledWith(
        Etp,
        mockSection.etpId,
        { completionPercentage: 50 },
      );
    });

    it('should handle ETP not found gracefully within transaction', async () => {
      // Arrange
      mockSectionsRepository.findOne.mockResolvedValue(mockSection);
      const updatedSection = { ...mockSection, ...updateDto };
      mockQueryRunner.manager.save.mockResolvedValue(updatedSection);
      mockQueryBuilder.getOne.mockResolvedValue(null);

      // Act
      const result = await service.update(
        mockSectionId,
        updateDto,
        mockOrganizationId,
      );

      // Assert - Should complete without updating ETP
      expect(mockQueryRunner.manager.update).not.toHaveBeenCalled();
      expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
      expect(result.title).toBe(updateDto.title);
    });

    it('should use pessimistic write lock for ETP query', async () => {
      // Arrange
      mockSectionsRepository.findOne.mockResolvedValue(mockSection);
      mockQueryRunner.manager.save.mockResolvedValue({
        ...mockSection,
        ...updateDto,
      });
      mockQueryBuilder.getOne.mockResolvedValue({
        ...mockEtp,
        sections: [mockSection],
      });

      // Act
      await service.update(mockSectionId, updateDto, mockOrganizationId);

      // Assert - Verify pessimistic lock was requested
      expect(mockQueryRunner.manager.createQueryBuilder).toHaveBeenCalled();
      expect(mockQueryBuilder.setLock).toHaveBeenCalledWith(
        'pessimistic_write',
      );
    });
  });

  /**
   * Tests for regenerateSection()
   * Validates section regeneration with AI
   */
  describe('regenerateSection', () => {
    it('should regenerate section successfully', async () => {
      // Arrange
      mockSectionsRepository.findOne.mockResolvedValue(mockSection);
      mockEtpsService.findOneMinimal.mockResolvedValue(mockEtp);
      mockSectionsRepository.save
        .mockResolvedValueOnce({
          ...mockSection,
          status: SectionStatus.GENERATING,
        })
        .mockResolvedValueOnce({
          ...mockSection,
          status: SectionStatus.GENERATED,
        });
      mockOrchestratorService.generateSection.mockResolvedValue(
        mockGenerationResult,
      );

      // Act
      const result = await service.regenerateSection(
        mockSectionId,
        mockUserId,
        mockOrganizationId,
      );

      // Assert
      expect(mockSectionsRepository.findOne).toHaveBeenCalled();
      expect(mockEtpsService.findOneMinimal).toHaveBeenCalledWith(
        mockSection.etpId,
        mockOrganizationId,
        mockUserId,
      );
      expect(mockOrchestratorService.generateSection).toHaveBeenCalled();
      expect(result.status).toBe(SectionStatus.GENERATED);
    });

    it('should verify user access before regenerating', async () => {
      // Arrange
      mockSectionsRepository.findOne.mockResolvedValue(mockSection);
      mockEtpsService.findOneMinimal.mockRejectedValue(
        new NotFoundException('ETP não encontrado'),
      ); // User has no access

      // Act & Assert
      await expect(
        service.regenerateSection(
          mockSectionId,
          mockUserId,
          mockOrganizationId,
        ),
      ).rejects.toThrow(NotFoundException);
      expect(mockEtpsService.findOneMinimal).toHaveBeenCalledWith(
        mockSection.etpId,
        mockOrganizationId,
        mockUserId,
      );
    });

    it('should include regeneratedAt timestamp in metadata', async () => {
      // Arrange
      mockSectionsRepository.findOne.mockResolvedValue(mockSection);
      mockEtpsService.findOneMinimal.mockResolvedValue(mockEtp);
      mockSectionsRepository.save
        .mockResolvedValueOnce({
          ...mockSection,
          status: SectionStatus.GENERATING,
        })
        .mockResolvedValueOnce({
          ...mockSection,
          status: SectionStatus.GENERATED,
          metadata: {
            ...mockSection.metadata,
            regeneratedAt: expect.any(String),
          },
        });
      mockOrchestratorService.generateSection.mockResolvedValue(
        mockGenerationResult,
      );

      // Act
      const result = await service.regenerateSection(
        mockSectionId,
        mockUserId,
        mockOrganizationId,
      );

      // Assert
      const savedSection = mockSectionsRepository.save.mock.calls[1][0];
      expect(savedSection.metadata.regeneratedAt).toBeDefined();
    });

    it('should handle regeneration errors and revert to PENDING', async () => {
      // Arrange
      mockSectionsRepository.findOne.mockResolvedValue(mockSection);
      mockEtpsService.findOne.mockResolvedValue(mockEtp);
      mockSectionsRepository.save.mockResolvedValue(mockSection);
      mockOrchestratorService.generateSection.mockRejectedValue(
        new Error('LLM timeout'),
      );

      // Act & Assert
      await expect(
        service.regenerateSection(
          mockSectionId,
          mockUserId,
          mockOrganizationId,
        ),
      ).rejects.toThrow('LLM timeout');

      // Verify error handling
      expect(mockSectionsRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          status: SectionStatus.PENDING,
        }),
      );
    });
  });

  /**
   * Tests for validateSection()
   * Validates section content validation
   */
  describe('validateSection', () => {
    it('should validate section content successfully', async () => {
      // Arrange
      mockSectionsRepository.findOne.mockResolvedValue(mockSection);
      mockOrchestratorService.validateContent.mockResolvedValue(
        mockValidationResults,
      );
      mockSectionsRepository.save.mockResolvedValue(mockSection);

      // Act
      const result = await service.validateSection(mockSectionId);

      // Assert
      expect(mockSectionsRepository.findOne).toHaveBeenCalled();
      expect(mockOrchestratorService.validateContent).toHaveBeenCalledWith(
        mockSection.content,
        mockSection.type,
      );
      expect(mockSectionsRepository.save).toHaveBeenCalled();
      expect(result).toHaveProperty('section');
      expect(result).toHaveProperty('validationResults');
      expect(result).toHaveProperty('disclaimer');
    });

    it('should throw BadRequestException when section has no content', async () => {
      // Arrange
      const sectionWithoutContent = { ...mockSection, content: null };
      mockSectionsRepository.findOne.mockResolvedValue(sectionWithoutContent);

      // Act & Assert
      await expect(service.validateSection(mockSectionId)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should convert validation results correctly', async () => {
      // Arrange
      mockSectionsRepository.findOne.mockResolvedValue(mockSection);
      mockOrchestratorService.validateContent.mockResolvedValue(
        mockValidationResults,
      );
      mockSectionsRepository.save.mockResolvedValue(mockSection);

      // Act
      await service.validateSection(mockSectionId);

      // Assert
      const savedSection = mockSectionsRepository.save.mock.calls[0][0];
      expect(savedSection.validationResults).toEqual({
        legalCompliance: true,
        clarityScore: 85,
        hallucinationCheck: true,
        warnings: expect.arrayContaining(['Simplifique a linguagem']),
        suggestions: [],
      });
    });
  });

  /**
   * Tests for remove()
   * Validates section deletion
   */
  describe('remove', () => {
    it('should remove section successfully', async () => {
      // Arrange
      mockSectionsRepository.findOne.mockResolvedValue(mockSection);
      mockEtpsService.findOneMinimal.mockResolvedValue(mockEtp);
      mockSectionsRepository.remove.mockResolvedValue(mockSection);

      // Act
      await service.remove(mockSectionId, mockUserId, mockOrganizationId);

      // Assert
      expect(mockSectionsRepository.findOne).toHaveBeenCalled();
      expect(mockEtpsService.findOneMinimal).toHaveBeenCalledWith(
        mockSection.etpId,
        mockOrganizationId,
        mockUserId,
      );
      expect(mockSectionsRepository.remove).toHaveBeenCalledWith(mockSection);
      expect(mockEtpsService.updateCompletionPercentage).toHaveBeenCalledWith(
        mockSection.etpId,
        mockOrganizationId,
      );
    });

    it('should verify user access before removing', async () => {
      // Arrange
      mockSectionsRepository.findOne.mockResolvedValue(mockSection);
      mockEtpsService.findOneMinimal.mockRejectedValue(
        new NotFoundException('ETP não encontrado'),
      ); // User has no access

      // Act & Assert
      await expect(
        service.remove(mockSectionId, mockUserId, mockOrganizationId),
      ).rejects.toThrow(NotFoundException);
      expect(mockEtpsService.findOneMinimal).toHaveBeenCalledWith(
        mockSection.etpId,
        mockOrganizationId,
        mockUserId,
      );
      expect(mockSectionsRepository.remove).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when section does not exist', async () => {
      // Arrange
      mockSectionsRepository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.remove('invalid-id', mockUserId, mockOrganizationId),
      ).rejects.toThrow(NotFoundException);
    });
  });

  /**
   * Tests for private helper methods
   * Validates utility functions
   */
  describe('private helper methods', () => {
    /**
     * Tests for getNextOrder with transaction-based locking
     * @see #1065 - Fix race condition in getNextOrder
     */
    describe('getNextOrder', () => {
      it('should return 1 for first section in ETP using transactional lock', async () => {
        // Arrange
        mockEtpsService.findOneMinimal.mockResolvedValue(mockEtp);
        mockSectionsRepository.findOne.mockResolvedValue(null);
        mockSectionsRepository.create.mockReturnValue(mockSection);
        mockSectionsRepository.save
          .mockResolvedValueOnce(mockSection)
          .mockResolvedValueOnce(mockSection);
        mockOrchestratorService.generateSection.mockResolvedValue(
          mockGenerationResult,
        );
        // Mock QueryRunner for transaction-based getNextOrder
        mockQueryRunner.manager.createQueryBuilder = jest.fn(() => ({
          select: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          setLock: jest.fn().mockReturnThis(),
          getRawOne: jest.fn().mockResolvedValue({ maxOrder: null }),
        }));

        // Act
        const generateDto = {
          type: SectionType.JUSTIFICATIVA,
          title: 'Test',
          userInput: 'Test',
        };
        await service.generateSection(
          mockEtpId,
          generateDto,
          mockUserId,
          mockOrganizationId,
        );

        // Assert - verify transaction lifecycle
        expect(mockDataSource.createQueryRunner).toHaveBeenCalled();
        expect(mockQueryRunner.connect).toHaveBeenCalled();
        expect(mockQueryRunner.startTransaction).toHaveBeenCalledWith(
          'SERIALIZABLE',
        );
        expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
        expect(mockQueryRunner.release).toHaveBeenCalled();

        // Assert - verify order is 1
        expect(mockSectionsRepository.create).toHaveBeenCalledWith(
          expect.objectContaining({
            order: 1,
          }),
        );
      });

      it('should return maxOrder + 1 for subsequent sections', async () => {
        // Arrange
        mockEtpsService.findOneMinimal.mockResolvedValue(mockEtp);
        mockSectionsRepository.findOne.mockResolvedValue(null);
        mockSectionsRepository.create.mockReturnValue(mockSection);
        mockSectionsRepository.save.mockResolvedValue(mockSection);
        mockOrchestratorService.generateSection.mockResolvedValue(
          mockGenerationResult,
        );
        // Mock existing sections with maxOrder = 5
        mockQueryRunner.manager.createQueryBuilder = jest.fn(() => ({
          select: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          setLock: jest.fn().mockReturnThis(),
          getRawOne: jest.fn().mockResolvedValue({ maxOrder: 5 }),
        }));

        // Act
        const generateDto = {
          type: SectionType.JUSTIFICATIVA,
          title: 'Test',
          userInput: 'Test',
        };
        await service.generateSection(
          mockEtpId,
          generateDto,
          mockUserId,
          mockOrganizationId,
        );

        // Assert - verify order is 6
        expect(mockSectionsRepository.create).toHaveBeenCalledWith(
          expect.objectContaining({
            order: 6,
          }),
        );
      });

      it('should rollback transaction on error', async () => {
        // Arrange
        mockEtpsService.findOneMinimal.mockResolvedValue(mockEtp);
        mockSectionsRepository.findOne.mockResolvedValue(null);
        // Mock QueryRunner to throw error
        const dbError = new Error('Database connection lost');
        mockQueryRunner.manager.createQueryBuilder = jest.fn(() => ({
          select: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          setLock: jest.fn().mockReturnThis(),
          getRawOne: jest.fn().mockRejectedValue(dbError),
        }));

        // Act & Assert
        const generateDto = {
          type: SectionType.JUSTIFICATIVA,
          title: 'Test',
          userInput: 'Test',
        };
        await expect(
          service.generateSection(
            mockEtpId,
            generateDto,
            mockUserId,
            mockOrganizationId,
          ),
        ).rejects.toThrow('Database connection lost');

        // Verify rollback was called
        expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
        expect(mockQueryRunner.release).toHaveBeenCalled();
      });

      it('should use pessimistic_write lock to prevent race conditions', async () => {
        // Arrange
        mockEtpsService.findOneMinimal.mockResolvedValue(mockEtp);
        mockSectionsRepository.findOne.mockResolvedValue(null);
        mockSectionsRepository.create.mockReturnValue(mockSection);
        mockSectionsRepository.save.mockResolvedValue(mockSection);
        mockOrchestratorService.generateSection.mockResolvedValue(
          mockGenerationResult,
        );

        const mockSetLock = jest.fn().mockReturnThis();
        mockQueryRunner.manager.createQueryBuilder = jest.fn(() => ({
          select: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          setLock: mockSetLock,
          getRawOne: jest.fn().mockResolvedValue({ maxOrder: 2 }),
        }));

        // Act
        const generateDto = {
          type: SectionType.JUSTIFICATIVA,
          title: 'Test',
          userInput: 'Test',
        };
        await service.generateSection(
          mockEtpId,
          generateDto,
          mockUserId,
          mockOrganizationId,
        );

        // Assert - verify pessimistic_write lock was used
        expect(mockSetLock).toHaveBeenCalledWith('pessimistic_write');
      });
    });

    describe('isRequiredSection', () => {
      it('should mark required sections correctly', async () => {
        const requiredTypes = [
          SectionType.INTRODUCAO,
          SectionType.JUSTIFICATIVA,
          SectionType.DESCRICAO_SOLUCAO,
          SectionType.REQUISITOS,
          SectionType.ESTIMATIVA_VALOR,
        ];

        for (const type of requiredTypes) {
          mockEtpsService.findOneMinimal.mockResolvedValue(mockEtp);
          mockSectionsRepository.findOne.mockResolvedValue(null);
          mockSectionsRepository.create.mockReturnValue({
            ...mockSection,
            type,
          });
          mockSectionsRepository.save
            .mockResolvedValueOnce(mockSection)
            .mockResolvedValueOnce(mockSection);
          mockOrchestratorService.generateSection.mockResolvedValue(
            mockGenerationResult,
          );
          // Mock QueryRunner for transaction-based getNextOrder
          mockQueryRunner.manager.createQueryBuilder = jest.fn(() => ({
            select: jest.fn().mockReturnThis(),
            where: jest.fn().mockReturnThis(),
            setLock: jest.fn().mockReturnThis(),
            getRawOne: jest.fn().mockResolvedValue({ maxOrder: 0 }),
          }));

          await service.generateSection(
            mockEtpId,
            { type, title: 'Test', userInput: 'Test' },
            mockUserId,
            mockOrganizationId,
          );

          expect(mockSectionsRepository.create).toHaveBeenCalledWith(
            expect.objectContaining({
              isRequired: true,
            }),
          );

          jest.clearAllMocks();
        }
      });

      it('should mark custom sections as not required', async () => {
        mockEtpsService.findOneMinimal.mockResolvedValue(mockEtp);
        mockSectionsRepository.findOne.mockResolvedValue(null);
        mockSectionsRepository.create.mockReturnValue({
          ...mockSection,
          type: SectionType.CUSTOM,
        });
        mockSectionsRepository.save
          .mockResolvedValueOnce(mockSection)
          .mockResolvedValueOnce(mockSection);
        mockOrchestratorService.generateSection.mockResolvedValue(
          mockGenerationResult,
        );
        // Mock QueryRunner for transaction-based getNextOrder
        mockQueryRunner.manager.createQueryBuilder = jest.fn(() => ({
          select: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          setLock: jest.fn().mockReturnThis(),
          getRawOne: jest.fn().mockResolvedValue({ maxOrder: 0 }),
        }));

        await service.generateSection(
          mockEtpId,
          { type: SectionType.CUSTOM, title: 'Custom', userInput: 'Test' },
          mockUserId,
          mockOrganizationId,
        );

        expect(mockSectionsRepository.create).toHaveBeenCalledWith(
          expect.objectContaining({
            isRequired: false,
          }),
        );
      });
    });

    describe('convertValidationResults', () => {
      it('should return default values when validation results are null', async () => {
        mockSectionsRepository.findOne.mockResolvedValue(mockSection);
        mockOrchestratorService.validateContent.mockResolvedValue(null);
        mockSectionsRepository.save.mockResolvedValue(mockSection);

        await service.validateSection(mockSectionId);

        const savedSection = mockSectionsRepository.save.mock.calls[0][0];
        expect(savedSection.validationResults).toEqual({
          legalCompliance: true,
          clarityScore: 0,
          hallucinationCheck: true,
          warnings: [],
          suggestions: [],
        });
      });
    });
  });
});
