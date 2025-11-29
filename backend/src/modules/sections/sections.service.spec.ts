import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
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
    metadata: { orgao: 'CONFENGE' },
    currentVersion: 1,
    completionPercentage: 0,
    createdById: mockUserId,
    createdBy: mockUser,
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
      antiHallucination: { isPassing: true, recommendations: [] },
    },
  };

  const mockValidationResults = {
    legal: { isCompliant: true, score: 90, issues: [], recommendations: [] },
    clareza: { score: 85, issues: [], suggestions: [] },
    simplificacao: { suggestions: ['Simplifique a linguagem'] },
    antiHallucination: { isPassing: true, recommendations: [] },
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
          provide: OrchestratorService,
          useValue: mockOrchestratorService,
        },
        {
          provide: EtpsService,
          useValue: mockEtpsService,
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

    it('should generate a new section successfully', async () => {
      // Arrange
      mockEtpsService.findOneMinimal.mockResolvedValue(mockEtp);
      mockSectionsRepository.findOne.mockResolvedValue(null); // No existing section
      mockSectionsRepository.create.mockReturnValue({
        ...mockSection,
        status: SectionStatus.GENERATING,
      });
      mockSectionsRepository.save
        .mockResolvedValueOnce({
          ...mockSection,
          status: SectionStatus.GENERATING,
        }) // First save (pending)
        .mockResolvedValueOnce(mockSection); // Second save (generated)
      mockOrchestratorService.generateSection.mockResolvedValue(
        mockGenerationResult,
      );
      mockSectionsRepository.createQueryBuilder().getRawOne.mockResolvedValue({
        maxOrder: 0,
      });

      // Act
      const result = await service.generateSection(
        mockEtpId,
        generateDto,
        mockUserId,
      );

      // Assert
      expect(mockEtpsService.findOneMinimal).toHaveBeenCalledWith(
        mockEtpId,
        mockUserId,
      );
      expect(mockSectionsRepository.findOne).toHaveBeenCalledWith({
        where: { etpId: mockEtpId, type: generateDto.type },
      });
      expect(mockOrchestratorService.generateSection).toHaveBeenCalledWith({
        sectionType: generateDto.type,
        title: generateDto.title,
        userInput: generateDto.userInput,
        context: generateDto.context,
        etpData: {
          objeto: mockEtp.objeto,
          metadata: mockEtp.metadata,
        },
      });
      expect(mockEtpsService.updateCompletionPercentage).toHaveBeenCalledWith(
        mockEtpId,
      );
      expect(result).toBeDefined();
      expect(result.content).toBe('Conteúdo gerado pela IA');
      expect(result.status).toBe(SectionStatus.GENERATED);
    });

    it('should throw NotFoundException when ETP does not exist', async () => {
      // Arrange
      mockEtpsService.findOneMinimal.mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.generateSection(mockEtpId, generateDto, mockUserId),
      ).rejects.toThrow(NotFoundException);
      expect(mockEtpsService.findOneMinimal).toHaveBeenCalledWith(
        mockEtpId,
        mockUserId,
      );
    });

    it('should throw BadRequestException when section already exists', async () => {
      // Arrange
      mockEtpsService.findOneMinimal.mockResolvedValue(mockEtp);
      mockSectionsRepository.findOne.mockResolvedValue(mockSection); // Existing section

      // Act & Assert
      await expect(
        service.generateSection(mockEtpId, generateDto, mockUserId),
      ).rejects.toThrow(BadRequestException);
      expect(mockSectionsRepository.findOne).toHaveBeenCalledWith({
        where: { etpId: mockEtpId, type: generateDto.type },
      });
    });

    it('should handle generation errors and update section status to PENDING', async () => {
      // Arrange
      mockEtpsService.findOne.mockResolvedValue(mockEtp);
      mockSectionsRepository.findOne.mockResolvedValue(null);
      mockSectionsRepository.create.mockReturnValue({
        ...mockSection,
        status: SectionStatus.GENERATING,
      });
      mockSectionsRepository.save.mockResolvedValue({
        ...mockSection,
        status: SectionStatus.GENERATING,
      });
      mockOrchestratorService.generateSection.mockRejectedValue(
        new Error('LLM timeout'),
      );
      mockSectionsRepository.createQueryBuilder().getRawOne.mockResolvedValue({
        maxOrder: 0,
      });

      // Act & Assert
      await expect(
        service.generateSection(mockEtpId, generateDto, mockUserId),
      ).rejects.toThrow('LLM timeout');

      // Verify error handling
      expect(mockSectionsRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          status: SectionStatus.PENDING,
          content: expect.stringContaining('Erro ao gerar conteúdo'),
        }),
      );
    });

    it('should set correct order for new section', async () => {
      // Arrange
      mockEtpsService.findOne.mockResolvedValue(mockEtp);
      mockSectionsRepository.findOne.mockResolvedValue(null);

      // Mock query builder for getNextOrder to return maxOrder = 2
      const mockQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({ maxOrder: 2 }),
      };
      mockSectionsRepository.createQueryBuilder.mockReturnValue(
        mockQueryBuilder,
      );

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
      await service.generateSection(mockEtpId, generateDto, mockUserId);

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
      mockSectionsRepository.createQueryBuilder().getRawOne.mockResolvedValue({
        maxOrder: 0,
      });

      // Act
      await service.generateSection(mockEtpId, requiredGenerateDto, mockUserId);

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
      mockSectionsRepository.createQueryBuilder().getRawOne.mockResolvedValue({
        maxOrder: 0,
      });

      // Act
      const result = await service.generateSection(
        mockEtpId,
        generateDto,
        mockUserId,
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
   * Validates manual section updates
   */
  describe('update', () => {
    const updateDto = {
      title: 'Título atualizado',
      content: 'Conteúdo atualizado',
      status: SectionStatus.APPROVED,
    };

    it('should update section successfully', async () => {
      // Arrange
      mockSectionsRepository.findOne.mockResolvedValue(mockSection);
      const updatedSection = { ...mockSection, ...updateDto };
      mockSectionsRepository.save.mockResolvedValue(updatedSection);

      // Act
      const result = await service.update(mockSectionId, updateDto);

      // Assert
      expect(mockSectionsRepository.findOne).toHaveBeenCalled();
      expect(mockSectionsRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          title: updateDto.title,
          content: updateDto.content,
          status: updateDto.status,
        }),
      );
      expect(mockEtpsService.updateCompletionPercentage).toHaveBeenCalledWith(
        mockSection.etpId,
      );
      expect(result.title).toBe(updateDto.title);
    });

    it('should throw NotFoundException when section does not exist', async () => {
      // Arrange
      mockSectionsRepository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(service.update('invalid-id', updateDto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should allow partial updates', async () => {
      // Arrange
      const partialUpdateDto = { title: 'Novo título apenas' };
      mockSectionsRepository.findOne.mockResolvedValue(mockSection);
      const updatedSection = { ...mockSection, ...partialUpdateDto };
      mockSectionsRepository.save.mockResolvedValue(updatedSection);

      // Act
      const result = await service.update(mockSectionId, partialUpdateDto);

      // Assert
      expect(result.title).toBe('Novo título apenas');
      expect(result.content).toBe(mockSection.content); // Content unchanged
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
      const result = await service.regenerateSection(mockSectionId, mockUserId);

      // Assert
      expect(mockSectionsRepository.findOne).toHaveBeenCalled();
      expect(mockEtpsService.findOneMinimal).toHaveBeenCalledWith(
        mockSection.etpId,
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
        service.regenerateSection(mockSectionId, mockUserId),
      ).rejects.toThrow(NotFoundException);
      expect(mockEtpsService.findOneMinimal).toHaveBeenCalledWith(
        mockSection.etpId,
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
      const result = await service.regenerateSection(mockSectionId, mockUserId);

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
        service.regenerateSection(mockSectionId, mockUserId),
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
      await service.remove(mockSectionId, mockUserId);

      // Assert
      expect(mockSectionsRepository.findOne).toHaveBeenCalled();
      expect(mockEtpsService.findOneMinimal).toHaveBeenCalledWith(
        mockSection.etpId,
        mockUserId,
      );
      expect(mockSectionsRepository.remove).toHaveBeenCalledWith(mockSection);
      expect(mockEtpsService.updateCompletionPercentage).toHaveBeenCalledWith(
        mockSection.etpId,
      );
    });

    it('should verify user access before removing', async () => {
      // Arrange
      mockSectionsRepository.findOne.mockResolvedValue(mockSection);
      mockEtpsService.findOneMinimal.mockRejectedValue(
        new NotFoundException('ETP não encontrado'),
      ); // User has no access

      // Act & Assert
      await expect(service.remove(mockSectionId, mockUserId)).rejects.toThrow(
        NotFoundException,
      );
      expect(mockEtpsService.findOneMinimal).toHaveBeenCalledWith(
        mockSection.etpId,
        mockUserId,
      );
      expect(mockSectionsRepository.remove).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when section does not exist', async () => {
      // Arrange
      mockSectionsRepository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(service.remove('invalid-id', mockUserId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  /**
   * Tests for private helper methods
   * Validates utility functions
   */
  describe('private helper methods', () => {
    describe('getNextOrder', () => {
      it('should return 1 for first section in ETP', async () => {
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
        mockSectionsRepository
          .createQueryBuilder()
          .getRawOne.mockResolvedValue({ maxOrder: null });

        // Act
        const generateDto = {
          type: SectionType.JUSTIFICATIVA,
          title: 'Test',
          userInput: 'Test',
        };
        await service.generateSection(mockEtpId, generateDto, mockUserId);

        // Assert
        expect(mockSectionsRepository.create).toHaveBeenCalledWith(
          expect.objectContaining({
            order: 1,
          }),
        );
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
          mockSectionsRepository
            .createQueryBuilder()
            .getRawOne.mockResolvedValue({ maxOrder: 0 });

          await service.generateSection(
            mockEtpId,
            { type, title: 'Test', userInput: 'Test' },
            mockUserId,
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
        mockSectionsRepository
          .createQueryBuilder()
          .getRawOne.mockResolvedValue({ maxOrder: 0 });

        await service.generateSection(
          mockEtpId,
          { type: SectionType.CUSTOM, title: 'Custom', userInput: 'Test' },
          mockUserId,
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
