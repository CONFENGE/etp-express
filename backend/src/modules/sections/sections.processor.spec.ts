import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Job } from 'bullmq';
import {
  SectionsProcessor,
  GenerateSectionJobData,
} from './sections.processor';
import { OrchestratorService } from '../orchestrator/orchestrator.service';
import { EtpsService } from '../etps/etps.service';
import {
  EtpSection,
  SectionStatus,
  SectionType,
} from '../../entities/etp-section.entity';

describe('SectionsProcessor', () => {
  let processor: SectionsProcessor;
  let sectionsRepository: jest.Mocked<Repository<EtpSection>>;
  let orchestratorService: jest.Mocked<OrchestratorService>;
  let etpsService: jest.Mocked<EtpsService>;

  const mockJobData: GenerateSectionJobData = {
    etpId: 'etp-123',
    sectionType: 'justificativa',
    title: 'Justificativa da Contratação',
    userInput: 'Necessidade de modernizar infraestrutura',
    context: { department: 'TI' },
    userId: 'user-456',
    organizationId: 'org-789',
    sectionId: 'section-abc',
  };

  const mockJob = {
    id: 'job-xyz',
    data: mockJobData,
    updateProgress: jest.fn(),
  } as unknown as Job<GenerateSectionJobData>;

  const mockSection: Partial<EtpSection> = {
    id: 'section-abc',
    etpId: 'etp-123',
    type: SectionType.JUSTIFICATIVA,
    title: 'Justificativa da Contratação',
    userInput: 'Necessidade de modernizar infraestrutura',
    status: SectionStatus.GENERATING,
    content: '',
    metadata: {},
    validationResults: undefined,
  };

  const mockEtp = {
    id: 'etp-123',
    objeto: 'Contratação de sistema ERP',
    metadata: { prazo: 'urgente' },
  };

  const mockGenerationResult = {
    content: '# Justificativa\n\nConteúdo gerado...',
    metadata: {
      model: 'gpt-4.1-nano',
      tokens: 500,
    },
    warnings: ['Revisar prazos'],
    validationResults: {
      isCompliant: true,
      complianceScore: 95,
      issues: [],
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SectionsProcessor,
        {
          provide: getRepositoryToken(EtpSection),
          useValue: {
            findOne: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: OrchestratorService,
          useValue: {
            generateSection: jest.fn(),
          },
        },
        {
          provide: EtpsService,
          useValue: {
            findOneMinimal: jest.fn(),
            updateCompletionPercentage: jest.fn(),
          },
        },
      ],
    }).compile();

    processor = module.get<SectionsProcessor>(SectionsProcessor);
    sectionsRepository = module.get(getRepositoryToken(EtpSection));
    orchestratorService = module.get(OrchestratorService);
    etpsService = module.get(EtpsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('process', () => {
    it('should process job successfully and update progress', async () => {
      // Arrange
      sectionsRepository.findOne.mockResolvedValue(mockSection as EtpSection);
      etpsService.findOneMinimal.mockResolvedValue(mockEtp as any);
      orchestratorService.generateSection.mockResolvedValue(
        mockGenerationResult as any,
      );
      sectionsRepository.save.mockResolvedValue(mockSection as EtpSection);

      // Act
      const result = await processor.process(mockJob);

      // Assert
      expect(mockJob.updateProgress).toHaveBeenCalledWith(10);
      expect(mockJob.updateProgress).toHaveBeenCalledWith(90);
      expect(mockJob.updateProgress).toHaveBeenCalledWith(95);
      expect(mockJob.updateProgress).toHaveBeenCalledWith(100);
      expect(result.status).toBe(SectionStatus.GENERATED);
      expect(result.sectionId).toBe('section-abc');
    });

    it('should throw error if section not found', async () => {
      // Arrange
      sectionsRepository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(processor.process(mockJob)).rejects.toThrow(
        'Section section-abc not found',
      );
    });

    it('should throw error if ETP not found', async () => {
      // Arrange
      sectionsRepository.findOne.mockResolvedValue(mockSection as EtpSection);
      etpsService.findOneMinimal.mockResolvedValue(undefined as any);

      // Act & Assert
      await expect(processor.process(mockJob)).rejects.toThrow(
        'ETP etp-123 not found',
      );
    });

    it('should call OrchestratorService with correct parameters', async () => {
      // Arrange
      sectionsRepository.findOne.mockResolvedValue(mockSection as EtpSection);
      etpsService.findOneMinimal.mockResolvedValue(mockEtp as any);
      orchestratorService.generateSection.mockResolvedValue(
        mockGenerationResult as any,
      );
      sectionsRepository.save.mockResolvedValue(mockSection as EtpSection);

      // Act
      await processor.process(mockJob);

      // Assert
      expect(orchestratorService.generateSection).toHaveBeenCalledWith({
        sectionType: 'justificativa',
        title: 'Justificativa da Contratação',
        userInput: 'Necessidade de modernizar infraestrutura',
        context: { department: 'TI' },
        etpData: {
          objeto: 'Contratação de sistema ERP',
          metadata: { prazo: 'urgente' },
        },
      });
    });

    it('should save section with generated content and metadata', async () => {
      // Arrange
      sectionsRepository.findOne.mockResolvedValue(mockSection as EtpSection);
      etpsService.findOneMinimal.mockResolvedValue(mockEtp as any);
      orchestratorService.generateSection.mockResolvedValue(
        mockGenerationResult as any,
      );

      const savedSection = { ...mockSection };
      sectionsRepository.save.mockImplementation((section) => {
        Object.assign(savedSection, section);
        return Promise.resolve(savedSection as EtpSection);
      });

      // Act
      await processor.process(mockJob);

      // Assert
      expect(sectionsRepository.save).toHaveBeenCalled();
      const saveCall = sectionsRepository.save.mock.calls[0][0];
      expect(saveCall.content).toBe(mockGenerationResult.content);
      expect(saveCall.status).toBe(SectionStatus.GENERATED);
      expect(saveCall.metadata?.warnings).toEqual(['Revisar prazos']);
      expect(saveCall.metadata?.jobId).toBe('job-xyz');
    });

    it('should update ETP completion percentage after generation', async () => {
      // Arrange
      sectionsRepository.findOne.mockResolvedValue(mockSection as EtpSection);
      etpsService.findOneMinimal.mockResolvedValue(mockEtp as any);
      orchestratorService.generateSection.mockResolvedValue(
        mockGenerationResult as any,
      );
      sectionsRepository.save.mockResolvedValue(mockSection as EtpSection);

      // Act
      await processor.process(mockJob);

      // Assert
      expect(etpsService.updateCompletionPercentage).toHaveBeenCalledWith(
        'etp-123',
      );
    });

    it('should handle generation failure and update section with error', async () => {
      // Arrange
      sectionsRepository.findOne.mockResolvedValue(mockSection as EtpSection);
      etpsService.findOneMinimal.mockResolvedValue(mockEtp as any);
      orchestratorService.generateSection.mockRejectedValue(
        new Error('OpenAI API failure'),
      );
      sectionsRepository.save.mockResolvedValue(mockSection as EtpSection);

      // Act & Assert
      await expect(processor.process(mockJob)).rejects.toThrow(
        'OpenAI API failure',
      );

      // Verify section was updated with error status
      expect(sectionsRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          status: SectionStatus.PENDING,
          content: 'Erro ao gerar conteúdo: OpenAI API failure',
        }),
      );
    });

    it('should handle empty userInput gracefully', async () => {
      // Arrange
      const jobWithoutUserInput = {
        ...mockJob,
        data: { ...mockJobData, userInput: undefined },
      };

      sectionsRepository.findOne.mockResolvedValue(mockSection as EtpSection);
      etpsService.findOneMinimal.mockResolvedValue(mockEtp as any);
      orchestratorService.generateSection.mockResolvedValue(
        mockGenerationResult as any,
      );
      sectionsRepository.save.mockResolvedValue(mockSection as EtpSection);

      // Act
      await processor.process(
        jobWithoutUserInput as Job<GenerateSectionJobData>,
      );

      // Assert
      expect(orchestratorService.generateSection).toHaveBeenCalledWith(
        expect.objectContaining({
          userInput: '',
        }),
      );
    });

    it('should convert validation results correctly', async () => {
      // Arrange
      sectionsRepository.findOne.mockResolvedValue(mockSection as EtpSection);
      etpsService.findOneMinimal.mockResolvedValue(mockEtp as any);
      orchestratorService.generateSection.mockResolvedValue(
        mockGenerationResult as any,
      );

      const savedSection = { ...mockSection };
      sectionsRepository.save.mockImplementation((section) => {
        Object.assign(savedSection, section);
        return Promise.resolve(savedSection as EtpSection);
      });

      // Act
      await processor.process(mockJob);

      // Assert
      const saveCall = sectionsRepository.save.mock.calls[0][0];
      expect(saveCall.validationResults).toEqual({
        isCompliant: true,
        complianceScore: 95,
        issues: [],
        checkedAt: expect.any(String),
      });
    });
  });

  describe('onApplicationShutdown (#607)', () => {
    it('should implement OnApplicationShutdown interface', () => {
      // Assert that processor has the required method
      expect(typeof processor.onApplicationShutdown).toBe('function');
    });

    it('should handle shutdown when worker is not initialized', async () => {
      // WorkerHost.worker getter returns undefined when not connected
      // Act & Assert - should not throw
      await expect(
        processor.onApplicationShutdown('SIGINT'),
      ).resolves.not.toThrow();
    });

    it('should log the signal that triggered shutdown', async () => {
      // Arrange
      const logSpy = jest.spyOn(processor['logger'], 'log');

      // Act
      await processor.onApplicationShutdown('SIGTERM');

      // Assert
      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('SIGTERM'));
    });

    it('should handle unknown signal gracefully', async () => {
      // Arrange
      const logSpy = jest.spyOn(processor['logger'], 'log');

      // Act
      await processor.onApplicationShutdown(undefined);

      // Assert
      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('unknown signal'),
      );
    });
  });
});
