import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { OpenAIService, LLMRequest } from './openai.service';
import OpenAI from 'openai';

// Mock the OpenAI module
jest.mock('openai');

describe('OpenAIService', () => {
  let service: OpenAIService;
  let configService: ConfigService;

  const mockOpenAIInstance = {
    chat: {
      completions: {
        create: jest.fn(),
      },
    },
  };

  const mockConfigService = {
    get: jest.fn((key: string, defaultValue?: any) => {
      const config = {
        OPENAI_API_KEY: 'test-api-key',
        OPENAI_TEMPERATURE: 0.7,
        OPENAI_MAX_TOKENS: 4000,
        OPENAI_MODEL: 'gpt-4-turbo-preview',
      };
      return config[key] || defaultValue;
    }),
  };

  beforeEach(async () => {
    // Reset the OpenAI mock
    (OpenAI as jest.MockedClass<typeof OpenAI>).mockClear();
    (OpenAI as jest.MockedClass<typeof OpenAI>).mockImplementation(
      () => mockOpenAIInstance as any,
    );

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OpenAIService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<OpenAIService>(OpenAIService);
    configService = module.get<ConfigService>(ConfigService);

    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('generateCompletion', () => {
    const mockRequest: LLMRequest = {
      systemPrompt: 'You are a helpful assistant',
      userPrompt: 'Write a short essay',
    };

    const mockCompletion = {
      model: 'gpt-4-turbo-preview',
      choices: [
        {
          message: {
            content: 'This is a generated essay.',
          },
          finish_reason: 'stop',
        },
      ],
      usage: {
        total_tokens: 150,
      },
    };

    it('should generate completion successfully', async () => {
      mockOpenAIInstance.chat.completions.create.mockResolvedValue(
        mockCompletion,
      );

      const result = await service.generateCompletion(mockRequest);

      expect(mockOpenAIInstance.chat.completions.create).toHaveBeenCalledWith({
        model: 'gpt-4-turbo-preview',
        messages: [
          { role: 'system', content: 'You are a helpful assistant' },
          { role: 'user', content: 'Write a short essay' },
        ],
        temperature: 0.7,
        max_tokens: 4000,
      });

      expect(result).toEqual({
        content: 'This is a generated essay.',
        tokens: 150,
        model: 'gpt-4-turbo-preview',
        finishReason: 'stop',
      });
    });

    it('should use custom temperature and maxTokens when provided', async () => {
      const requestWithCustomParams: LLMRequest = {
        ...mockRequest,
        temperature: 0.9,
        maxTokens: 2000,
      };

      mockOpenAIInstance.chat.completions.create.mockResolvedValue(
        mockCompletion,
      );

      await service.generateCompletion(requestWithCustomParams);

      expect(mockOpenAIInstance.chat.completions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          temperature: 0.9,
          max_tokens: 2000,
        }),
      );
    });

    it('should use custom model when provided', async () => {
      const requestWithCustomModel: LLMRequest = {
        ...mockRequest,
        model: 'gpt-3.5-turbo',
      };

      mockOpenAIInstance.chat.completions.create.mockResolvedValue({
        ...mockCompletion,
        model: 'gpt-3.5-turbo',
      });

      const result = await service.generateCompletion(requestWithCustomModel);

      expect(mockOpenAIInstance.chat.completions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'gpt-3.5-turbo',
        }),
      );
      expect(result.model).toBe('gpt-3.5-turbo');
    });

    it('should handle empty content gracefully', async () => {
      const emptyCompletion = {
        ...mockCompletion,
        choices: [
          {
            message: {
              content: null,
            },
            finish_reason: 'stop',
          },
        ],
      };

      mockOpenAIInstance.chat.completions.create.mockResolvedValue(
        emptyCompletion,
      );

      const result = await service.generateCompletion(mockRequest);

      expect(result.content).toBe('');
    });

    it('should handle missing usage data', async () => {
      const completionWithoutUsage = {
        ...mockCompletion,
        usage: undefined,
      };

      mockOpenAIInstance.chat.completions.create.mockResolvedValue(
        completionWithoutUsage,
      );

      const result = await service.generateCompletion(mockRequest);

      expect(result.tokens).toBe(0);
    });

    it('should throw error when API call fails', async () => {
      const apiError = new Error('API rate limit exceeded');
      mockOpenAIInstance.chat.completions.create.mockRejectedValue(apiError);

      await expect(service.generateCompletion(mockRequest)).rejects.toThrow(
        'API rate limit exceeded',
      );
    });

    it('should log generation time and token usage', async () => {
      const loggerSpy = jest.spyOn(service['logger'], 'log');
      mockOpenAIInstance.chat.completions.create.mockResolvedValue(
        mockCompletion,
      );

      await service.generateCompletion(mockRequest);

      expect(loggerSpy).toHaveBeenCalledWith(
        'Generating completion with model: gpt-4-turbo-preview',
      );
      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining('Completion generated in'),
      );
      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining('Tokens: 150'),
      );
    });
  });

  describe('generateStreamCompletion', () => {
    const mockRequest: LLMRequest = {
      systemPrompt: 'You are a helpful assistant',
      userPrompt: 'Write a story',
    };

    it('should generate streaming completion successfully', async () => {
      const mockChunks = [
        {
          choices: [
            {
              delta: {
                content: 'Once ',
              },
            },
          ],
        },
        {
          choices: [
            {
              delta: {
                content: 'upon ',
              },
            },
          ],
        },
        {
          choices: [
            {
              delta: {
                content: 'a time...',
              },
            },
          ],
        },
      ];

      // Create an async iterable mock
      const mockStream = {
        [Symbol.asyncIterator]: async function* () {
          for (const chunk of mockChunks) {
            yield chunk;
          }
        },
      };

      mockOpenAIInstance.chat.completions.create.mockResolvedValue(mockStream);

      const onChunkMock = jest.fn();
      const result = await service.generateStreamCompletion(
        mockRequest,
        onChunkMock,
      );

      expect(mockOpenAIInstance.chat.completions.create).toHaveBeenCalledWith({
        model: 'gpt-4-turbo-preview',
        messages: [
          { role: 'system', content: 'You are a helpful assistant' },
          { role: 'user', content: 'Write a story' },
        ],
        temperature: 0.7,
        max_tokens: 4000,
        stream: true,
      });

      expect(onChunkMock).toHaveBeenCalledTimes(3);
      expect(onChunkMock).toHaveBeenCalledWith('Once ');
      expect(onChunkMock).toHaveBeenCalledWith('upon ');
      expect(onChunkMock).toHaveBeenCalledWith('a time...');

      expect(result.content).toBe('Once upon a time...');
      expect(result.model).toBe('gpt-4-turbo-preview');
      expect(result.finishReason).toBe('stop');
      expect(result.tokens).toBeGreaterThan(0);
    });

    it('should handle empty chunks', async () => {
      const mockChunks = [
        {
          choices: [
            {
              delta: {},
            },
          ],
        },
        {
          choices: [
            {
              delta: {
                content: 'Hello',
              },
            },
          ],
        },
      ];

      const mockStream = {
        [Symbol.asyncIterator]: async function* () {
          for (const chunk of mockChunks) {
            yield chunk;
          }
        },
      };

      mockOpenAIInstance.chat.completions.create.mockResolvedValue(mockStream);

      const onChunkMock = jest.fn();
      const result = await service.generateStreamCompletion(
        mockRequest,
        onChunkMock,
      );

      // Only the chunk with content should be passed to onChunk
      expect(onChunkMock).toHaveBeenCalledTimes(1);
      expect(onChunkMock).toHaveBeenCalledWith('Hello');
      expect(result.content).toBe('Hello');
    });

    it('should throw error when streaming API call fails', async () => {
      const apiError = new Error('Streaming API error');
      mockOpenAIInstance.chat.completions.create.mockRejectedValue(apiError);

      const onChunkMock = jest.fn();

      await expect(
        service.generateStreamCompletion(mockRequest, onChunkMock),
      ).rejects.toThrow('Streaming API error');
    });

    it('should estimate tokens based on content length', async () => {
      // Content with 100 characters should estimate ~25 tokens (100/4)
      const longContent = 'a'.repeat(100);
      const mockChunks = [
        {
          choices: [
            {
              delta: {
                content: longContent,
              },
            },
          ],
        },
      ];

      const mockStream = {
        [Symbol.asyncIterator]: async function* () {
          for (const chunk of mockChunks) {
            yield chunk;
          }
        },
      };

      mockOpenAIInstance.chat.completions.create.mockResolvedValue(mockStream);

      const onChunkMock = jest.fn();
      const result = await service.generateStreamCompletion(
        mockRequest,
        onChunkMock,
      );

      expect(result.tokens).toBe(25); // 100 / 4 = 25
    });
  });
});
