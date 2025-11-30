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

  describe('factCheckLegalReference', () => {
    it('should fact-check reference and return exists=true when found', async () => {
      const mockResponse = {
        data: {
          choices: [
            {
              message: {
                content:
                  'EXISTE. A Lei 14.133/2021 é a Nova Lei de Licitações e Contratos Administrativos.',
              },
            },
          ],
          citations: ['https://planalto.gov.br/lei14133'],
        },
      };

      mockedAxios.post.mockResolvedValue(mockResponse);

      const result = await service.factCheckLegalReference({
        type: 'Lei',
        number: '14133',
        year: 2021,
      });

      expect(result.reference).toBe('Lei 14133/2021');
      expect(result.exists).toBe(true);
      expect(result.source).toBe('perplexity');
      expect(result.confidence).toBe(0.7);
      expect(result.description).toContain('EXISTE');
    });

    it('should fact-check reference and return exists=false when not found', async () => {
      const mockResponse = {
        data: {
          choices: [
            {
              message: {
                content: 'NÃO EXISTE. Esta lei não foi encontrada.',
              },
            },
          ],
          citations: [],
        },
      };

      mockedAxios.post.mockResolvedValue(mockResponse);

      const result = await service.factCheckLegalReference({
        type: 'Lei',
        number: '99999',
        year: 2099,
      });

      expect(result.reference).toBe('Lei 99999/2099');
      expect(result.exists).toBe(false);
      expect(result.source).toBe('perplexity');
      expect(result.confidence).toBe(0.8);
      expect(result.description).toContain('NÃO EXISTE');
    });

    it('should handle search fallback with confidence 0.0', async () => {
      // Mock circuit breaker open scenario
      mockedAxios.post.mockRejectedValue(new Error('EOPENBREAKER'));

      const result = await service.factCheckLegalReference({
        type: 'Portaria',
        number: '123',
        year: 2020,
      });

      expect(result.reference).toBe('Portaria 123/2020');
      expect(result.exists).toBe(false);
      expect(result.confidence).toBe(0.0);
      expect(result.description).toContain('Erro ao verificar');
    }, 30000);

    it('should format query correctly for fact-checking', async () => {
      const mockResponse = {
        data: {
          choices: [{ message: { content: 'EXISTE' } }],
          citations: [],
        },
      };

      mockedAxios.post.mockResolvedValue(mockResponse);

      await service.factCheckLegalReference({
        type: 'Decreto',
        number: '10024',
        year: 2019,
      });

      const callArgs = mockedAxios.post.mock.calls[0];
      const userMessage = (callArgs[1] as any).messages[1].content;

      expect(userMessage).toContain('Decreto 10024/2019');
      expect(userMessage).toContain('EXISTE');
      expect(userMessage).toContain('NÃO EXISTE');
      expect(userMessage).toContain('ordenamento jurídico brasileiro');
    });

    it('should return error result when API throws exception', async () => {
      mockedAxios.post.mockRejectedValue(new Error('API Error'));

      const result = await service.factCheckLegalReference({
        type: 'IN',
        number: '5',
        year: 2021,
      });

      expect(result.reference).toBe('IN 5/2021');
      expect(result.exists).toBe(false);
      expect(result.confidence).toBe(0.0);
      expect(result.description).toContain('Erro ao verificar');
    }, 30000);
  });

  describe('cache', () => {
    it('should return cached response on second identical query (Cache HIT)', async () => {
      const mockResponse = {
        data: {
          choices: [{ message: { content: 'Cached content' } }],
          citations: ['https://cached.com'],
        },
      };

      mockedAxios.post.mockResolvedValue(mockResponse);

      // First call - Cache MISS
      const firstResult = await service.search('Lei 14.133/2021');
      expect(mockedAxios.post).toHaveBeenCalledTimes(1);
      expect(firstResult.summary).toBe('Cached content');
      expect(firstResult.isFallback).toBe(false);

      // Second call - Cache HIT (should NOT call API again)
      const secondResult = await service.search('Lei 14.133/2021');
      expect(mockedAxios.post).toHaveBeenCalledTimes(1); // Still 1, not 2
      expect(secondResult.summary).toBe('Cached content');
      expect(secondResult).toEqual(firstResult);
    });

    it('should normalize queries for cache key (case-insensitive, whitespace-agnostic)', async () => {
      const mockResponse = {
        data: {
          choices: [{ message: { content: 'Normalized' } }],
          citations: [],
        },
      };

      mockedAxios.post.mockResolvedValue(mockResponse);

      // Different casing and whitespace, but same normalized query
      await service.search('Lei 14.133/2021');
      await service.search('  LEI 14.133/2021  ');
      await service.search('lei    14.133/2021');

      // Should only call API once (all 3 queries normalize to same key)
      expect(mockedAxios.post).toHaveBeenCalledTimes(1);
    });

    it('should NOT cache fallback responses', async () => {
      // First call - API failure triggers fallback
      mockedAxios.post.mockRejectedValueOnce(new Error('API Error'));
      const firstResult = await service.search('test query');
      expect(firstResult.isFallback).toBe(true);

      // Second call - API recovers and returns success
      const mockResponse = {
        data: {
          choices: [{ message: { content: 'Recovered' } }],
          citations: [],
        },
      };
      mockedAxios.post.mockResolvedValueOnce(mockResponse);

      const secondResult = await service.search('test query');

      // Should call API again (fallback was NOT cached)
      expect(mockedAxios.post).toHaveBeenCalledTimes(2);
      expect(secondResult.isFallback).toBe(false);
      expect(secondResult.summary).toBe('Recovered');
    }, 30000); // Extended timeout for retry behavior

    it('should expose cache statistics via getCacheStats()', async () => {
      const mockResponse = {
        data: {
          choices: [{ message: { content: 'Stats test' } }],
          citations: [],
        },
      };

      mockedAxios.post.mockResolvedValue(mockResponse);

      // Initial state
      const initialStats = service.getCacheStats();
      expect(initialStats).toHaveProperty('hits');
      expect(initialStats).toHaveProperty('misses');
      expect(initialStats).toHaveProperty('keys');

      const initialMisses = initialStats.misses;
      const initialHits = initialStats.hits;

      // First call - Cache MISS
      await service.search('unique query stats test');
      const statsAfterMiss = service.getCacheStats();
      expect(statsAfterMiss.misses).toBeGreaterThanOrEqual(initialMisses + 1);

      // Second call (same query) - Cache HIT
      await service.search('unique query stats test');
      const statsAfterHit = service.getCacheStats();
      expect(statsAfterHit.hits).toBeGreaterThanOrEqual(initialHits + 1);
    });

    it('should cache different queries separately', async () => {
      const mockResponse1 = {
        data: {
          choices: [{ message: { content: 'Response 1' } }],
          citations: [],
        },
      };
      const mockResponse2 = {
        data: {
          choices: [{ message: { content: 'Response 2' } }],
          citations: [],
        },
      };

      mockedAxios.post.mockResolvedValueOnce(mockResponse1);
      mockedAxios.post.mockResolvedValueOnce(mockResponse2);

      // Two different queries
      const result1 = await service.search('query one');
      const result2 = await service.search('query two');

      expect(mockedAxios.post).toHaveBeenCalledTimes(2);
      expect(result1.summary).toBe('Response 1');
      expect(result2.summary).toBe('Response 2');

      // Retrieve from cache
      const cachedResult1 = await service.search('query one');
      const cachedResult2 = await service.search('query two');

      // Should NOT call API again (both cached)
      expect(mockedAxios.post).toHaveBeenCalledTimes(2);
      expect(cachedResult1.summary).toBe('Response 1');
      expect(cachedResult2.summary).toBe('Response 2');
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
      // Use an error that triggers retry behavior
      // The test needs longer timeout to account for retry delays
      mockedAxios.post.mockRejectedValue(new Error('Network Error'));

      const result = await service.search('test query');

      expect(result.isFallback).toBe(true);
      expect(result.results).toHaveLength(0);
    }, 30000); // Extended timeout for retry behavior

    it('should include disclaimer message in fallback response', async () => {
      mockedAxios.post.mockRejectedValue(new Error('API Error'));

      const result = await service.search('test');

      expect(result.summary).toContain('indisponível');
      expect(result.summary).toContain('⚠️');
    }, 30000); // Extended timeout for retry behavior
  });
});
