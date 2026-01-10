import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotFoundException } from '@nestjs/common';
import { ChatService } from '../chat.service';
import {
  ChatMessage,
  ChatMessageRole,
} from '../../../entities/chat-message.entity';
import { Etp } from '../../../entities/etp.entity';
import { SendMessageDto } from '../dto';

describe('ChatService', () => {
  let service: ChatService;
  let chatMessageRepository: jest.Mocked<Repository<ChatMessage>>;
  let etpRepository: jest.Mocked<Repository<Etp>>;

  const mockUserId = 'user-123';
  const mockEtpId = 'etp-456';

  const mockEtp = {
    id: mockEtpId,
    title: 'ETP Test',
    objeto: 'Contratacao de servicos',
  } as Etp;

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
    content: 'A funcionalidade de assistente de ETP esta em desenvolvimento.',
    metadata: { latencyMs: 50 },
    createdAt: new Date(),
    etp: null as any,
    user: null as any,
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
      ],
    }).compile();

    service = module.get<ChatService>(ChatService);
    chatMessageRepository = module.get(getRepositoryToken(ChatMessage));
    etpRepository = module.get(getRepositoryToken(Etp));

    // Default mocks
    etpRepository.findOne.mockResolvedValue(mockEtp);
    chatMessageRepository.create.mockImplementation(
      (data) => ({ ...data, id: 'new-msg-id' }) as ChatMessage,
    );
    chatMessageRepository.save.mockImplementation(
      async (msg) => msg as ChatMessage,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('sendMessage', () => {
    it('should save user message and return placeholder response', async () => {
      const dto: SendMessageDto = {
        message: 'O que devo escrever na justificativa?',
        contextField: 'Justificativa',
      };

      const result = await service.sendMessage(dto, mockEtpId, mockUserId);

      expect(result).toBeDefined();
      expect(result.id).toBe('new-msg-id');
      expect(result.content).toContain('justificativa');
      expect(result.metadata.latencyMs).toBeGreaterThanOrEqual(0);
      expect(etpRepository.findOne).toHaveBeenCalledWith({
        where: { id: mockEtpId },
        select: ['id', 'title', 'objeto'],
      });
      expect(chatMessageRepository.save).toHaveBeenCalledTimes(2); // user + assistant
    });

    it('should throw NotFoundException when ETP not found', async () => {
      etpRepository.findOne.mockResolvedValue(null);

      const dto: SendMessageDto = { message: 'Test message' };

      await expect(
        service.sendMessage(dto, 'non-existent', mockUserId),
      ).rejects.toThrow(NotFoundException);
    });

    it('should save user message with contextField metadata', async () => {
      const dto: SendMessageDto = {
        message: 'Como calcular o valor?',
        contextField: 'Estimativa de Custos',
      };

      await service.sendMessage(dto, mockEtpId, mockUserId);

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

      await service.sendMessage(dto, mockEtpId, mockUserId);

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

    it('should return legislation-related placeholder for lei questions', async () => {
      const dto: SendMessageDto = {
        message: 'Qual legislacao se aplica a este caso?',
      };

      const result = await service.sendMessage(dto, mockEtpId, mockUserId);

      expect(result.content).toContain('Lei 14.133/2021');
    });

    it('should return pricing-related placeholder for preco questions', async () => {
      const dto: SendMessageDto = {
        message: 'Como pesquisar precos para esta contratacao?',
      };

      const result = await service.sendMessage(dto, mockEtpId, mockUserId);

      expect(result.content).toContain('precos');
    });

    it('should return generic placeholder for unknown questions', async () => {
      const dto: SendMessageDto = {
        message: 'Olá, como funciona?',
      };

      const result = await service.sendMessage(dto, mockEtpId, mockUserId);

      expect(result.content).toContain('funcionalidade');
      expect(result.content).toContain('desenvolvimento');
    });
  });

  describe('getHistory', () => {
    it('should return chat history ordered by createdAt', async () => {
      chatMessageRepository.find.mockResolvedValue([
        mockUserMessage,
        mockAssistantMessage,
      ]);

      const result = await service.getHistory(mockEtpId, mockUserId);

      expect(result).toHaveLength(2);
      expect(result[0].role).toBe('user');
      expect(result[1].role).toBe('assistant');
      expect(chatMessageRepository.find).toHaveBeenCalledWith({
        where: { etpId: mockEtpId, userId: mockUserId },
        order: { createdAt: 'ASC' },
        take: 50,
      });
    });

    it('should respect limit parameter', async () => {
      chatMessageRepository.find.mockResolvedValue([mockUserMessage]);

      await service.getHistory(mockEtpId, mockUserId, 10);

      expect(chatMessageRepository.find).toHaveBeenCalledWith(
        expect.objectContaining({ take: 10 }),
      );
    });

    it('should cap limit at 100', async () => {
      chatMessageRepository.find.mockResolvedValue([]);

      await service.getHistory(mockEtpId, mockUserId, 200);

      expect(chatMessageRepository.find).toHaveBeenCalledWith(
        expect.objectContaining({ take: 100 }),
      );
    });

    it('should return empty array when no messages', async () => {
      chatMessageRepository.find.mockResolvedValue([]);

      const result = await service.getHistory(mockEtpId, mockUserId);

      expect(result).toHaveLength(0);
    });

    it('should map messages to ChatHistoryItemDto format', async () => {
      const createdAt = new Date('2026-01-10T10:00:00Z');
      chatMessageRepository.find.mockResolvedValue([
        { ...mockUserMessage, createdAt },
      ]);

      const result = await service.getHistory(mockEtpId, mockUserId);

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

      const result = await service.clearHistory(mockEtpId, mockUserId);

      expect(result).toBe(5);
      expect(chatMessageRepository.delete).toHaveBeenCalledWith({
        etpId: mockEtpId,
        userId: mockUserId,
      });
    });

    it('should return 0 when no messages to delete', async () => {
      chatMessageRepository.delete.mockResolvedValue({ affected: 0, raw: {} });

      const result = await service.clearHistory(mockEtpId, mockUserId);

      expect(result).toBe(0);
    });

    it('should return 0 when affected is undefined', async () => {
      chatMessageRepository.delete.mockResolvedValue({ raw: {} } as any);

      const result = await service.clearHistory(mockEtpId, mockUserId);

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
});
