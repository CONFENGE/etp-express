import { Test, TestingModule } from '@nestjs/testing';
import { ChatController } from '../chat.controller';
import { ChatService } from '../chat.service';
import { SendMessageDto, ChatResponseDto, ChatHistoryItemDto } from '../dto';
import { User, UserRole } from '../../../entities/user.entity';

describe('ChatController', () => {
  let controller: ChatController;
  let chatService: jest.Mocked<ChatService>;

  const mockUser: Partial<User> = {
    id: 'user-123',
    email: 'test@example.com',
    name: 'Test User',
    role: UserRole.USER,
    organizationId: 'org-1',
  };

  const mockEtpId = 'etp-456';

  const mockChatResponse: ChatResponseDto = {
    id: 'msg-1',
    content: 'A funcionalidade esta em desenvolvimento.',
    metadata: {
      tokens: 0,
      latencyMs: 50,
    },
  };

  const mockHistoryItems: ChatHistoryItemDto[] = [
    {
      id: 'msg-1',
      role: 'user',
      content: 'O que devo escrever?',
      createdAt: new Date(),
    },
    {
      id: 'msg-2',
      role: 'assistant',
      content: 'Resposta do assistente.',
      createdAt: new Date(),
    },
  ];

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ChatController],
      providers: [
        {
          provide: ChatService,
          useValue: {
            sendMessage: jest.fn(),
            getHistory: jest.fn(),
            clearHistory: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<ChatController>(ChatController);
    chatService = module.get(ChatService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('sendMessage', () => {
    it('should call chatService.sendMessage with correct parameters', async () => {
      const dto: SendMessageDto = {
        message: 'O que devo escrever na justificativa?',
        contextField: 'Justificativa',
      };
      chatService.sendMessage.mockResolvedValue(mockChatResponse);

      const result = await controller.sendMessage(
        mockEtpId,
        dto,
        mockUser as User,
      );

      expect(chatService.sendMessage).toHaveBeenCalledWith(
        dto,
        mockEtpId,
        mockUser.id,
      );
      expect(result).toEqual(mockChatResponse);
    });

    it('should handle message without contextField', async () => {
      const dto: SendMessageDto = {
        message: 'Pergunta generica',
      };
      chatService.sendMessage.mockResolvedValue(mockChatResponse);

      const result = await controller.sendMessage(
        mockEtpId,
        dto,
        mockUser as User,
      );

      expect(chatService.sendMessage).toHaveBeenCalledWith(
        dto,
        mockEtpId,
        mockUser.id,
      );
      expect(result).toEqual(mockChatResponse);
    });

    it('should propagate service errors', async () => {
      const dto: SendMessageDto = { message: 'Test' };
      const error = new Error('Service error');
      chatService.sendMessage.mockRejectedValue(error);

      await expect(
        controller.sendMessage(mockEtpId, dto, mockUser as User),
      ).rejects.toThrow(error);
    });
  });

  describe('getHistory', () => {
    it('should call chatService.getHistory with correct parameters', async () => {
      chatService.getHistory.mockResolvedValue(mockHistoryItems);

      const result = await controller.getHistory(
        mockEtpId,
        undefined,
        mockUser as User,
      );

      expect(chatService.getHistory).toHaveBeenCalledWith(
        mockEtpId,
        mockUser.id,
        undefined,
      );
      expect(result).toEqual(mockHistoryItems);
    });

    it('should pass limit parameter when provided', async () => {
      chatService.getHistory.mockResolvedValue(mockHistoryItems.slice(0, 1));

      const result = await controller.getHistory(mockEtpId, 10, mockUser as User);

      expect(chatService.getHistory).toHaveBeenCalledWith(
        mockEtpId,
        mockUser.id,
        10,
      );
      expect(result).toHaveLength(1);
    });

    it('should return empty array when no history', async () => {
      chatService.getHistory.mockResolvedValue([]);

      const result = await controller.getHistory(
        mockEtpId,
        undefined,
        mockUser as User,
      );

      expect(result).toEqual([]);
    });
  });

  describe('clearHistory', () => {
    it('should call chatService.clearHistory and return success', async () => {
      chatService.clearHistory.mockResolvedValue(5);

      const result = await controller.clearHistory(mockEtpId, mockUser as User);

      expect(chatService.clearHistory).toHaveBeenCalledWith(
        mockEtpId,
        mockUser.id,
      );
      expect(result).toEqual({ success: true, deletedCount: 5 });
    });

    it('should return success with 0 deletedCount when no messages', async () => {
      chatService.clearHistory.mockResolvedValue(0);

      const result = await controller.clearHistory(mockEtpId, mockUser as User);

      expect(result).toEqual({ success: true, deletedCount: 0 });
    });

    it('should propagate service errors', async () => {
      const error = new Error('Database error');
      chatService.clearHistory.mockRejectedValue(error);

      await expect(
        controller.clearHistory(mockEtpId, mockUser as User),
      ).rejects.toThrow(error);
    });
  });
});
