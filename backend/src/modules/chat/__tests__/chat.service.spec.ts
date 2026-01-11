import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  NotFoundException,
  ForbiddenException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ChatService } from '../chat.service';
import {
  ChatMessage,
  ChatMessageRole,
} from '../../../entities/chat-message.entity';
import { Etp, EtpStatus } from '../../../entities/etp.entity';
import { EtpTemplateType } from '../../../entities/etp-template.entity';
import {
  EtpSection,
  SectionType,
  SectionStatus,
} from '../../../entities/etp-section.entity';
import { SendMessageDto } from '../dto';
import {
  OpenAIService,
  LLMResponse,
} from '../../orchestrator/llm/openai.service';

describe('ChatService', () => {
  let service: ChatService;
  let chatMessageRepository: jest.Mocked<Repository<ChatMessage>>;
  let etpRepository: jest.Mocked<Repository<Etp>>;
  let sectionRepository: jest.Mocked<Repository<EtpSection>>;
  let openAIService: jest.Mocked<OpenAIService>;

  const mockUserId = 'user-123';
  const mockEtpId = 'etp-456';
  const mockOrganizationId = 'org-1';

  const mockOrganization = {
    id: mockOrganizationId,
    name: 'Test Organization',
    slug: 'test-org',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockEtp: Partial<Etp> = {
    id: mockEtpId,
    title: 'ETP Test',
    objeto: 'Contratacao de servicos de TI',
    organizationId: mockOrganizationId,
    organization: mockOrganization as any,
    status: EtpStatus.DRAFT,
    templateType: EtpTemplateType.TI,
    completionPercentage: 30,
  };

  const mockSections: Partial<EtpSection>[] = [
    {
      id: 'section-1',
      etpId: mockEtpId,
      type: SectionType.JUSTIFICATIVA,
      title: 'Justificativa',
      content: 'A contratacao se faz necessaria para modernizar os sistemas.',
      status: SectionStatus.GENERATED,
      order: 1,
    },
    {
      id: 'section-2',
      etpId: mockEtpId,
      type: SectionType.REQUISITOS,
      title: 'Requisitos',
      content: 'Requisitos tecnicos minimos.',
      status: SectionStatus.PENDING,
      order: 2,
    },
  ];

  const mockUserMessage: ChatMessage = {
    id: 'msg-1',
    etpId: mockEtpId,
    userId: mockUserId,
    role: ChatMessageRole.USER,
    content: 'O que devo escrever na justificativa?',
    metadata: { contextField: 'Justificativa' },
    createdAt: new Date(),
    etp: null as any,
    user: null as any,
  };

  const mockAssistantMessage: ChatMessage = {
    id: 'msg-2',
    etpId: mockEtpId,
    userId: mockUserId,
    role: ChatMessageRole.ASSISTANT,
    content: 'A justificativa deve demonstrar a necessidade da contratacao.',
    metadata: { latencyMs: 500, tokens: 150, model: 'gpt-4.1-nano' },
    createdAt: new Date(),
    etp: null as any,
    user: null as any,
  };

  const mockLLMResponse: LLMResponse = {
    content:
      'A justificativa deve demonstrar: a necessidade da contratacao, o interesse publico envolvido, os beneficios esperados e os riscos de nao contratar, conforme Art. 18 da Lei 14.133/2021.',
    tokens: 150,
    model: 'gpt-4.1-nano',
    finishReason: 'stop',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChatService,
        {
          provide: getRepositoryToken(ChatMessage),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            find: jest.fn(),
            delete: jest.fn(),
            createQueryBuilder: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Etp),
          useValue: {
            findOne: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(EtpSection),
          useValue: {
            find: jest.fn(),
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

    service = module.get<ChatService>(ChatService);
    chatMessageRepository = module.get(getRepositoryToken(ChatMessage));
    etpRepository = module.get(getRepositoryToken(Etp));
    sectionRepository = module.get(getRepositoryToken(EtpSection));
    openAIService = module.get(OpenAIService);

    // Default mocks
    etpRepository.findOne.mockResolvedValue(mockEtp as Etp);
    sectionRepository.find.mockResolvedValue(mockSections as EtpSection[]);
    chatMessageRepository.find.mockResolvedValue([]);
    chatMessageRepository.create.mockImplementation(
      (data) => ({ ...data, id: 'new-msg-id' }) as ChatMessage,
    );
    chatMessageRepository.save.mockImplementation(
      async (msg) => msg as ChatMessage,
    );
    openAIService.generateCompletion.mockResolvedValue(mockLLMResponse);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('sendMessage', () => {
    it('should generate AI response with ETP context', async () => {
      const dto: SendMessageDto = {
        message: 'O que devo escrever na justificativa?',
        contextField: 'Justificativa',
      };

      const result = await service.sendMessage(
        dto,
        mockEtpId,
        mockUserId,
        mockOrganizationId,
      );

      expect(result).toBeDefined();
      expect(result.id).toBe('new-msg-id');
      expect(result.content).toContain('justificativa');
      expect(result.metadata.tokens).toBe(150);
      expect(result.metadata.model).toBe('gpt-4.1-nano');
      expect(result.metadata.latencyMs).toBeGreaterThanOrEqual(0);
    });

    it('should load ETP with organization relation for context', async () => {
      const dto: SendMessageDto = { message: 'Test message' };

      await service.sendMessage(dto, mockEtpId, mockUserId, mockOrganizationId);

      expect(etpRepository.findOne).toHaveBeenCalledWith({
        where: { id: mockEtpId },
        relations: ['organization'],
      });
    });

    it('should load ETP sections for context injection', async () => {
      const dto: SendMessageDto = { message: 'Test message' };

      await service.sendMessage(dto, mockEtpId, mockUserId, mockOrganizationId);

      expect(sectionRepository.find).toHaveBeenCalledWith({
        where: { etpId: mockEtpId },
        order: { order: 'ASC' },
      });
    });

    it('should pass context field to system prompt builder', async () => {
      const dto: SendMessageDto = {
        message: 'Como calcular o valor?',
        contextField: 'Estimativa de Custos',
      };

      await service.sendMessage(dto, mockEtpId, mockUserId, mockOrganizationId);

      // Verify OpenAI was called with a system prompt containing context field
      const callArgs = openAIService.generateCompletion.mock.calls[0][0];
      expect(callArgs.systemPrompt).toBeDefined();
      expect(callArgs.systemPrompt).toContain('Estimativa');
    });

    it('should include conversation history in user prompt', async () => {
      // Mock existing conversation
      chatMessageRepository.find.mockResolvedValue([
        mockUserMessage,
        mockAssistantMessage,
      ]);

      const dto: SendMessageDto = { message: 'E sobre os requisitos?' };

      await service.sendMessage(dto, mockEtpId, mockUserId, mockOrganizationId);

      const callArgs = openAIService.generateCompletion.mock.calls[0][0];
      expect(callArgs.userPrompt).toContain('Historico da conversa');
    });

    it('should save both user and assistant messages', async () => {
      const dto: SendMessageDto = { message: 'Test message' };

      await service.sendMessage(dto, mockEtpId, mockUserId, mockOrganizationId);

      expect(chatMessageRepository.save).toHaveBeenCalledTimes(2);
      expect(chatMessageRepository.create).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({
          role: ChatMessageRole.USER,
          content: 'Test message',
        }),
      );
      expect(chatMessageRepository.create).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
          role: ChatMessageRole.ASSISTANT,
        }),
      );
    });

    it('should extract legislation references from response', async () => {
      openAIService.generateCompletion.mockResolvedValue({
        ...mockLLMResponse,
        content:
          'Conforme Lei 14.133/2021 e Art. 18, a justificativa deve incluir...',
      });

      const dto: SendMessageDto = { message: 'Test' };

      const result = await service.sendMessage(
        dto,
        mockEtpId,
        mockUserId,
        mockOrganizationId,
      );

      expect(result.relatedLegislation).toBeDefined();
      expect(result.relatedLegislation).toContain('Lei 14.133/2021');
      expect(result.relatedLegislation).toContain('Art. 18');
    });

    it('should throw NotFoundException when ETP not found', async () => {
      etpRepository.findOne.mockResolvedValue(null);

      const dto: SendMessageDto = { message: 'Test message' };

      await expect(
        service.sendMessage(
          dto,
          'non-existent',
          mockUserId,
          mockOrganizationId,
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when user organization does not own ETP', async () => {
      const otherOrgEtp = { ...mockEtp, organizationId: 'other-org' };
      etpRepository.findOne.mockResolvedValue(otherOrgEtp as Etp);

      const dto: SendMessageDto = { message: 'Test message' };

      await expect(
        service.sendMessage(dto, mockEtpId, mockUserId, mockOrganizationId),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw ServiceUnavailableException when AI circuit breaker is open', async () => {
      const circuitBreakerError = new Error('Circuit breaker open');
      (circuitBreakerError as any).code = 'EOPENBREAKER';
      openAIService.generateCompletion.mockRejectedValue(circuitBreakerError);

      const dto: SendMessageDto = { message: 'Test message' };

      await expect(
        service.sendMessage(dto, mockEtpId, mockUserId, mockOrganizationId),
      ).rejects.toThrow(ServiceUnavailableException);
    });

    it('should return fallback response on other AI errors', async () => {
      openAIService.generateCompletion.mockRejectedValue(
        new Error('Random API error'),
      );

      const dto: SendMessageDto = {
        message: 'O que devo escrever na justificativa?',
      };

      const result = await service.sendMessage(
        dto,
        mockEtpId,
        mockUserId,
        mockOrganizationId,
      );

      expect(result.content).toContain('temporariamente indisponivel');
      expect(result.content).toContain('justificativa');
      expect(result.metadata.tokens).toBe(0);
    });

    it('should return generic fallback for unknown question types', async () => {
      openAIService.generateCompletion.mockRejectedValue(
        new Error('API error'),
      );

      const dto: SendMessageDto = { message: 'Ola como funciona?' };

      const result = await service.sendMessage(
        dto,
        mockEtpId,
        mockUserId,
        mockOrganizationId,
      );

      expect(result.content).toContain('indisponivel');
    });

    it('should use correct OpenAI parameters', async () => {
      const dto: SendMessageDto = { message: 'Test' };

      await service.sendMessage(dto, mockEtpId, mockUserId, mockOrganizationId);

      expect(openAIService.generateCompletion).toHaveBeenCalledWith(
        expect.objectContaining({
          temperature: 0.7,
          maxTokens: 1000,
          model: 'gpt-4.1-nano',
        }),
      );
    });

    it('should save user message with contextField metadata', async () => {
      const dto: SendMessageDto = {
        message: 'Como calcular o valor?',
        contextField: 'Estimativa de Custos',
      };

      await service.sendMessage(dto, mockEtpId, mockUserId, mockOrganizationId);

      expect(chatMessageRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          etpId: mockEtpId,
          userId: mockUserId,
          role: ChatMessageRole.USER,
          content: dto.message,
          metadata: { contextField: dto.contextField },
        }),
      );
    });

    it('should save user message without metadata when no contextField', async () => {
      const dto: SendMessageDto = { message: 'Pergunta generica' };

      await service.sendMessage(dto, mockEtpId, mockUserId, mockOrganizationId);

      expect(chatMessageRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          etpId: mockEtpId,
          userId: mockUserId,
          role: ChatMessageRole.USER,
          content: dto.message,
          metadata: null,
        }),
      );
    });
  });

  describe('getHistory', () => {
    it('should return chat history ordered by createdAt', async () => {
      chatMessageRepository.find.mockResolvedValue([
        mockUserMessage,
        mockAssistantMessage,
      ]);

      // Need to mock for validateEtpAccess
      etpRepository.findOne.mockResolvedValue({
        ...mockEtp,
        id: mockEtpId,
        title: 'Test',
        objeto: 'Test',
        organizationId: mockOrganizationId,
      } as Etp);

      const result = await service.getHistory(
        mockEtpId,
        mockUserId,
        mockOrganizationId,
      );

      expect(result).toHaveLength(2);
      expect(result[0].role).toBe('user');
      expect(result[1].role).toBe('assistant');
      expect(chatMessageRepository.find).toHaveBeenCalledWith({
        where: { etpId: mockEtpId, userId: mockUserId },
        order: { createdAt: 'ASC' },
        take: 50,
      });
    });

    it('should validate ETP access before returning history', async () => {
      chatMessageRepository.find.mockResolvedValue([mockUserMessage]);

      await service.getHistory(mockEtpId, mockUserId, mockOrganizationId);

      // Second call is for validateEtpAccess (first is loadEtpWithContext in sendMessage tests)
      expect(etpRepository.findOne).toHaveBeenCalled();
    });

    it('should throw ForbiddenException when user organization does not own ETP', async () => {
      const otherOrgEtp = {
        id: mockEtpId,
        title: 'Test',
        objeto: 'Test',
        organizationId: 'other-org',
      };
      etpRepository.findOne.mockResolvedValue(otherOrgEtp as Etp);

      await expect(
        service.getHistory(mockEtpId, mockUserId, mockOrganizationId),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should respect limit parameter', async () => {
      chatMessageRepository.find.mockResolvedValue([mockUserMessage]);

      await service.getHistory(mockEtpId, mockUserId, mockOrganizationId, 10);

      expect(chatMessageRepository.find).toHaveBeenCalledWith(
        expect.objectContaining({ take: 10 }),
      );
    });

    it('should cap limit at 100', async () => {
      chatMessageRepository.find.mockResolvedValue([]);

      await service.getHistory(mockEtpId, mockUserId, mockOrganizationId, 200);

      expect(chatMessageRepository.find).toHaveBeenCalledWith(
        expect.objectContaining({ take: 100 }),
      );
    });

    it('should return empty array when no messages', async () => {
      chatMessageRepository.find.mockResolvedValue([]);

      const result = await service.getHistory(
        mockEtpId,
        mockUserId,
        mockOrganizationId,
      );

      expect(result).toHaveLength(0);
    });

    it('should map messages to ChatHistoryItemDto format', async () => {
      const createdAt = new Date('2026-01-10T10:00:00Z');
      chatMessageRepository.find.mockResolvedValue([
        { ...mockUserMessage, createdAt },
      ]);

      const result = await service.getHistory(
        mockEtpId,
        mockUserId,
        mockOrganizationId,
      );

      expect(result[0]).toEqual({
        id: mockUserMessage.id,
        role: mockUserMessage.role,
        content: mockUserMessage.content,
        createdAt,
      });
    });
  });

  describe('clearHistory', () => {
    it('should delete all messages for ETP and user', async () => {
      chatMessageRepository.delete.mockResolvedValue({ affected: 5, raw: {} });

      const result = await service.clearHistory(
        mockEtpId,
        mockUserId,
        mockOrganizationId,
      );

      expect(result).toBe(5);
      expect(chatMessageRepository.delete).toHaveBeenCalledWith({
        etpId: mockEtpId,
        userId: mockUserId,
      });
    });

    it('should validate ETP access before clearing history', async () => {
      chatMessageRepository.delete.mockResolvedValue({ affected: 0, raw: {} });

      await service.clearHistory(mockEtpId, mockUserId, mockOrganizationId);

      expect(etpRepository.findOne).toHaveBeenCalled();
    });

    it('should throw ForbiddenException when user organization does not own ETP', async () => {
      const otherOrgEtp = {
        id: mockEtpId,
        title: 'Test',
        objeto: 'Test',
        organizationId: 'other-org',
      };
      etpRepository.findOne.mockResolvedValue(otherOrgEtp as Etp);

      await expect(
        service.clearHistory(mockEtpId, mockUserId, mockOrganizationId),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should return 0 when no messages to delete', async () => {
      chatMessageRepository.delete.mockResolvedValue({ affected: 0, raw: {} });

      const result = await service.clearHistory(
        mockEtpId,
        mockUserId,
        mockOrganizationId,
      );

      expect(result).toBe(0);
    });

    it('should return 0 when affected is undefined', async () => {
      chatMessageRepository.delete.mockResolvedValue({ raw: {} } as any);

      const result = await service.clearHistory(
        mockEtpId,
        mockUserId,
        mockOrganizationId,
      );

      expect(result).toBe(0);
    });
  });

  describe('getMessageCount', () => {
    it('should count user messages for ETP and user', async () => {
      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getCount: jest.fn().mockResolvedValue(10),
      };
      chatMessageRepository.createQueryBuilder.mockReturnValue(
        mockQueryBuilder as any,
      );

      const result = await service.getMessageCount(mockEtpId, mockUserId);

      expect(result).toBe(10);
      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        'msg.etpId = :etpId',
        { etpId: mockEtpId },
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'msg.userId = :userId',
        { userId: mockUserId },
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'msg.role = :role',
        { role: ChatMessageRole.USER },
      );
    });

    it('should filter by sinceDate when provided', async () => {
      const sinceDate = new Date('2026-01-01');
      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getCount: jest.fn().mockResolvedValue(5),
      };
      chatMessageRepository.createQueryBuilder.mockReturnValue(
        mockQueryBuilder as any,
      );

      const result = await service.getMessageCount(
        mockEtpId,
        mockUserId,
        sinceDate,
      );

      expect(result).toBe(5);
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'msg.createdAt >= :sinceDate',
        { sinceDate },
      );
    });

    it('should not filter by sinceDate when not provided', async () => {
      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getCount: jest.fn().mockResolvedValue(3),
      };
      chatMessageRepository.createQueryBuilder.mockReturnValue(
        mockQueryBuilder as any,
      );

      await service.getMessageCount(mockEtpId, mockUserId);

      // Should have 2 andWhere calls (userId and role) but NOT sinceDate
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledTimes(2);
    });
  });

  describe('getProactiveSuggestions', () => {
    it('should return suggestions for empty sections', async () => {
      const emptySections: Partial<EtpSection>[] = [
        {
          id: 'section-1',
          etpId: mockEtpId,
          type: SectionType.JUSTIFICATIVA,
          title: 'Justificativa',
          content: '',
          status: SectionStatus.PENDING,
          order: 1,
        },
      ];
      sectionRepository.find.mockResolvedValue(emptySections as EtpSection[]);

      const result = await service.getProactiveSuggestions(
        mockEtpId,
        mockOrganizationId,
      );

      expect(result.suggestions).toBeDefined();
      const emptySuggestion = result.suggestions.find(
        (s) => s.field === 'Justificativa' && s.type === 'incomplete',
      );
      expect(emptySuggestion).toBeDefined();
      expect(emptySuggestion!.priority).toBe('high');
    });

    it('should return suggestions for short content sections', async () => {
      const shortSections: Partial<EtpSection>[] = [
        {
          id: 'section-1',
          etpId: mockEtpId,
          type: SectionType.JUSTIFICATIVA,
          title: 'Justificativa',
          content: 'Muito curto', // Less than 100 chars
          status: SectionStatus.GENERATED,
          order: 1,
        },
      ];
      sectionRepository.find.mockResolvedValue(shortSections as EtpSection[]);

      const result = await service.getProactiveSuggestions(
        mockEtpId,
        mockOrganizationId,
      );

      const improvementSuggestion = result.suggestions.find(
        (s) => s.field === 'Justificativa' && s.type === 'improvement',
      );
      expect(improvementSuggestion).toBeDefined();
      expect(improvementSuggestion!.priority).toBe('medium');
    });

    it('should detect missing required sections', async () => {
      // No sections provided
      sectionRepository.find.mockResolvedValue([]);

      // ETP with complete basic fields
      const etpWithFields = {
        ...mockEtp,
        title: 'ETP Test with long title',
        objeto:
          'Contratacao de servicos de TI para modernizacao de sistemas legados da organizacao',
      };
      etpRepository.findOne.mockResolvedValue(etpWithFields as Etp);

      const result = await service.getProactiveSuggestions(
        mockEtpId,
        mockOrganizationId,
      );

      const missingSuggestions = result.suggestions.filter(
        (s) => s.type === 'warning',
      );
      expect(missingSuggestions.length).toBeGreaterThan(0);
    });

    it('should filter suggestions by field when provided', async () => {
      const result = await service.getProactiveSuggestions(
        mockEtpId,
        mockOrganizationId,
        'Justificativa',
      );

      // All returned suggestions should relate to Justificativa
      result.suggestions.forEach((s) => {
        expect(s.field.toLowerCase()).toBe('justificativa');
      });
    });

    it('should sort suggestions by priority (high first)', async () => {
      const mixedSections: Partial<EtpSection>[] = [
        {
          id: 'section-1',
          etpId: mockEtpId,
          type: SectionType.JUSTIFICATIVA,
          title: 'Justificativa',
          content: 'Muito curto', // medium priority
          status: SectionStatus.GENERATED,
          order: 1,
        },
        {
          id: 'section-2',
          etpId: mockEtpId,
          type: SectionType.REQUISITOS,
          title: 'Requisitos',
          content: '', // high priority - empty
          status: SectionStatus.PENDING,
          order: 2,
        },
      ];
      sectionRepository.find.mockResolvedValue(mixedSections as EtpSection[]);

      const result = await service.getProactiveSuggestions(
        mockEtpId,
        mockOrganizationId,
      );

      // First suggestion should be high priority
      if (result.suggestions.length > 0) {
        expect(result.suggestions[0].priority).toBe('high');
      }
    });

    it('should count high priority suggestions correctly', async () => {
      const emptySections: Partial<EtpSection>[] = [
        {
          id: 'section-1',
          etpId: mockEtpId,
          type: SectionType.JUSTIFICATIVA,
          title: 'Justificativa',
          content: '', // empty - high priority
          status: SectionStatus.PENDING,
          order: 1,
        },
        {
          id: 'section-2',
          etpId: mockEtpId,
          type: SectionType.REQUISITOS,
          title: 'Requisitos',
          content: '', // empty - high priority
          status: SectionStatus.PENDING,
          order: 2,
        },
      ];
      sectionRepository.find.mockResolvedValue(emptySections as EtpSection[]);

      const result = await service.getProactiveSuggestions(
        mockEtpId,
        mockOrganizationId,
      );

      expect(result.highPriorityCount).toBeGreaterThanOrEqual(2);
    });

    it('should include helpPrompt in suggestions', async () => {
      const emptySections: Partial<EtpSection>[] = [
        {
          id: 'section-1',
          etpId: mockEtpId,
          type: SectionType.JUSTIFICATIVA,
          title: 'Justificativa',
          content: '',
          status: SectionStatus.PENDING,
          order: 1,
        },
      ];
      sectionRepository.find.mockResolvedValue(emptySections as EtpSection[]);

      const result = await service.getProactiveSuggestions(
        mockEtpId,
        mockOrganizationId,
      );

      const suggestion = result.suggestions.find(
        (s) => s.field === 'Justificativa',
      );
      expect(suggestion?.helpPrompt).toBeDefined();
      expect(suggestion?.helpPrompt).toContain('Justificativa');
    });

    it('should validate ETP access before generating suggestions', async () => {
      const otherOrgEtp = {
        id: mockEtpId,
        title: 'Test',
        objeto: 'Test',
        organizationId: 'other-org',
      };
      etpRepository.findOne.mockResolvedValue(otherOrgEtp as Etp);

      await expect(
        service.getProactiveSuggestions(mockEtpId, mockOrganizationId),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should check ETP basic fields for completeness', async () => {
      // ETP with empty title and objeto
      const incompleteEtp = {
        ...mockEtp,
        title: 'Short', // Less than 10 chars
        objeto: 'Too short', // Less than 50 chars
      };
      etpRepository.findOne.mockResolvedValue(incompleteEtp as Etp);
      sectionRepository.find.mockResolvedValue([]);

      const result = await service.getProactiveSuggestions(
        mockEtpId,
        mockOrganizationId,
      );

      const titleSuggestion = result.suggestions.find(
        (s) => s.field === 'Titulo',
      );
      const objetoSuggestion = result.suggestions.find(
        (s) => s.field === 'Objeto',
      );

      expect(titleSuggestion).toBeDefined();
      expect(objetoSuggestion).toBeDefined();
    });

    it('should return totalIssues count', async () => {
      const result = await service.getProactiveSuggestions(
        mockEtpId,
        mockOrganizationId,
      );

      expect(result.totalIssues).toBe(result.suggestions.length);
    });
  });
});
