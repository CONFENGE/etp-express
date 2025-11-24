import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { PerplexityService } from './perplexity.service';
import axios from 'axios';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('PerplexityService', () => {
  let service: PerplexityService;

  const mockConfigService = {
    get: jest.fn((key: string, defaultValue?: any) => {
      const config = {
        PERPLEXITY_API_KEY: 'test-api-key',
        PERPLEXITY_MODEL: 'pplx-7b-online',
      };
      return config[key] || defaultValue;
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PerplexityService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<PerplexityService>(PerplexityService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('search', () => {
    const mockApiResponse = {
      data: {
        choices: [
          {
            message: {
              content:
                'Informação sobre contratação pública\nMais detalhes aqui\nOutras informações',
            },
          },
        ],
        citations: [
          'https://pncp.gov.br/contratos/123',
          'https://paineldeprecos.planejamento.gov.br',
        ],
      },
    };

    it('should search successfully and return formatted results', async () => {
      mockedAxios.post.mockResolvedValue(mockApiResponse);

      const result = await service.search('Buscar informações sobre notebooks');

      expect(mockedAxios.post).toHaveBeenCalledWith(
        'https://api.perplexity.ai/chat/completions',
        {
          model: 'pplx-7b-online',
          messages: [
            {
              role: 'system',
              content: expect.stringContaining(
                'Você é um assistente especializado',
              ),
            },
            {
              role: 'user',
              content: 'Buscar informações sobre notebooks',
            },
          ],
        },
        {
          headers: {
            Authorization: 'Bearer test-api-key',
            'Content-Type': 'application/json',
          },
          timeout: 30000,
        },
      );

      expect(result.summary).toContain('Informação sobre contratação pública');
      expect(result.results).toHaveLength(2);
      expect(result.sources).toEqual([
        'https://pncp.gov.br/contratos/123',
        'https://paineldeprecos.planejamento.gov.br',
      ]);
      expect(result.results[0].source).toBe('Perplexity AI');
      expect(result.results[0].url).toBe('https://pncp.gov.br/contratos/123');
    });

    it('should return fallback response when API fails (graceful degradation)', async () => {
      mockedAxios.post.mockRejectedValue(new Error('API Error'));

      const result = await service.search('test query');

      // Should return fallback instead of throwing
      expect(result.isFallback).toBe(true);
      expect(result.results).toEqual([]);
      expect(result.sources).toEqual([]);
      expect(result.summary).toContain('indisponível');
    });

    it('should handle empty content from API', async () => {
      const emptyResponse = {
        data: {
          choices: [
            {
              message: {
                content: '',
              },
            },
          ],
          citations: [],
        },
      };

      mockedAxios.post.mockResolvedValue(emptyResponse);

      const result = await service.search('test');

      expect(result.summary).toBe('');
      expect(result.results).toEqual([]);
      expect(result.sources).toEqual([]);
    });

    it('should handle missing choices in API response', async () => {
      const malformedResponse = {
        data: {
          choices: [],
          citations: [],
        },
      };

      mockedAxios.post.mockResolvedValue(malformedResponse);

      const result = await service.search('test');

      expect(result.summary).toBe('');
      expect(result.results).toEqual([]);
    });
  });

  describe('searchSimilarContracts', () => {
    it('should format query for similar contracts search', async () => {
      const mockResponse = {
        data: {
          choices: [{ message: { content: 'Mock result' } }],
          citations: ['https://example.com'],
        },
      };

      mockedAxios.post.mockResolvedValue(mockResponse);

      await service.searchSimilarContracts('Aquisição de notebooks');

      expect(mockedAxios.post).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          messages: expect.arrayContaining([
            expect.objectContaining({
              role: 'user',
              content: expect.stringContaining('Aquisição de notebooks'),
            }),
          ]),
        }),
        expect.any(Object),
      );

      // Verify query includes expected keywords
      const callArgs = mockedAxios.post.mock.calls[0];
      const userMessage = (callArgs[1] as any).messages[1].content;
      expect(userMessage).toContain('contratações públicas similares');
      expect(userMessage).toContain('Órgãos');
      expect(userMessage).toContain('Valores praticados');
    });

    it('should return results from search method', async () => {
      const mockResponse = {
        data: {
          choices: [{ message: { content: 'Contract information' } }],
          citations: ['https://source.gov.br'],
        },
      };

      mockedAxios.post.mockResolvedValue(mockResponse);

      const result = await service.searchSimilarContracts('Test objeto');

      expect(result.summary).toBe('Contract information');
      expect(result.sources).toEqual(['https://source.gov.br']);
    });
  });

  describe('searchLegalReferences', () => {
    it('should format query for legal references search', async () => {
      const mockResponse = {
        data: {
          choices: [{ message: { content: 'Legal info' } }],
          citations: [],
        },
      };

      mockedAxios.post.mockResolvedValue(mockResponse);

      await service.searchLegalReferences('licitação sustentável');

      const callArgs = mockedAxios.post.mock.calls[0];
      const userMessage = (callArgs[1] as any).messages[1].content;

      expect(userMessage).toContain('licitação sustentável');
      expect(userMessage).toContain('Lei 14.133/2021');
      expect(userMessage).toContain('Instruções Normativas');
      expect(userMessage).toContain('TCU');
    });

    it('should return results from search method', async () => {
      const mockResponse = {
        data: {
          choices: [{ message: { content: 'Legal references' } }],
          citations: ['https://planalto.gov.br/lei14133'],
        },
      };

      mockedAxios.post.mockResolvedValue(mockResponse);

      const result = await service.searchLegalReferences('test topic');

      expect(result.summary).toBe('Legal references');
      expect(result.sources).toEqual(['https://planalto.gov.br/lei14133']);
    });
  });

  describe('parseResults (private method tested via search)', () => {
    it('should parse results with URLs correctly', async () => {
      const responseWithUrls = {
        data: {
          choices: [
            {
              message: {
                content: 'Line 1\nLine 2\nLine 3',
              },
            },
          ],
          citations: [
            'https://example1.com',
            'https://example2.com',
            'not-a-url',
          ],
        },
      };

      mockedAxios.post.mockResolvedValue(responseWithUrls);

      const result = await service.search('test');

      expect(result.results[0].url).toBe('https://example1.com');
      expect(result.results[1].url).toBe('https://example2.com');
      expect(result.results[2].url).toBeUndefined();
    });

    it('should calculate relevance scores decreasing by index', async () => {
      const responseWithMultipleCitations = {
        data: {
          choices: [{ message: { content: 'Content' } }],
          citations: ['url1', 'url2', 'url3'],
        },
      };

      mockedAxios.post.mockResolvedValue(responseWithMultipleCitations);

      const result = await service.search('test');

      expect(result.results[0].relevance).toBe(1.0);
      expect(result.results[1].relevance).toBe(0.9);
      expect(result.results[2].relevance).toBe(0.8);
    });
  });

  describe('getCircuitState', () => {
    it('should return circuit breaker state', () => {
      const state = service.getCircuitState();

      expect(state).toHaveProperty('stats');
      expect(state).toHaveProperty('opened');
      expect(state).toHaveProperty('halfOpen');
      expect(state).toHaveProperty('closed');
      // Initially circuit should be closed
      expect(state.closed).toBe(true);
      expect(state.opened).toBe(false);
    });
  });

  describe('graceful degradation', () => {
    it('should mark successful responses with isFallback: false', async () => {
      const mockResponse = {
        data: {
          choices: [{ message: { content: 'Success' } }],
          citations: ['https://example.com'],
        },
      };

      mockedAxios.post.mockResolvedValue(mockResponse);

      const result = await service.search('test');

      expect(result.isFallback).toBe(false);
    });

    it('should return fallback with isFallback: true when API fails', async () => {
      mockedAxios.post.mockRejectedValue(new Error('Network Error'));

      const result = await service.search('test query');

      expect(result.isFallback).toBe(true);
      expect(result.results).toHaveLength(0);
    });

    it('should include disclaimer message in fallback response', async () => {
      mockedAxios.post.mockRejectedValue(new Error('API Error'));

      const result = await service.search('test');

      expect(result.summary).toContain('indisponível');
      expect(result.summary).toContain('⚠️');
    });
  });
});
