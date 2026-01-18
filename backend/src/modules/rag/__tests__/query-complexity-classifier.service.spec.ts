import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import {
  QueryComplexityClassifierService,
  QueryComplexity,
} from '../services/query-complexity-classifier.service';

describe('QueryComplexityClassifierService', () => {
  let service: QueryComplexityClassifierService;
  let configService: ConfigService;

  const mockConfigService = {
    get: jest.fn((key: string, defaultValue?: unknown) => {
      const config: Record<string, unknown> = {
        RAG_COMPLEXITY_THRESHOLD: 50,
        RAG_HIGH_COMPLEXITY_THRESHOLD: 100,
        RAG_LEGAL_KEYWORD_THRESHOLD: 1,
        RAG_LEGAL_KEYWORDS: '',
      };
      return config[key] ?? defaultValue;
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QueryComplexityClassifierService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<QueryComplexityClassifierService>(
      QueryComplexityClassifierService,
    );
    configService = module.get<ConfigService>(ConfigService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('initialization', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('should initialize with default legal keywords', () => {
      const keywords = service.getLegalKeywords();
      expect(keywords.length).toBeGreaterThan(40);
      expect(keywords).toContain('lei');
      expect(keywords).toContain('tcu');
      expect(keywords).toContain('14.133');
    });

    it('should respect custom keywords from config', async () => {
      const customConfigService = {
        get: jest.fn((key: string, defaultValue?: unknown) => {
          if (key === 'RAG_LEGAL_KEYWORDS') {
            return 'custom-keyword,another-term';
          }
          return defaultValue;
        }),
      };

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          QueryComplexityClassifierService,
          { provide: ConfigService, useValue: customConfigService },
        ],
      }).compile();

      const customService = module.get<QueryComplexityClassifierService>(
        QueryComplexityClassifierService,
      );

      expect(customService.hasLegalKeyword('custom-keyword')).toBe(true);
      expect(customService.hasLegalKeyword('another-term')).toBe(true);
    });
  });

  describe('classify - simple queries', () => {
    const simpleQueries = [
      'preço de computador',
      'valor do metro',
      'quanto custa',
      'lista de materiais',
      'caneta azul',
      'papel A4',
      'cadeira escritório',
    ];

    it.each(simpleQueries)('should classify "%s" as simple', (query) => {
      expect(service.classify(query)).toBe('simple');
    });

    it('should return high confidence for short queries', () => {
      const result = service.classifyWithDetails('preço');
      expect(result.complexity).toBe('simple');
      expect(result.confidence).toBeGreaterThanOrEqual(0.7);
    });
  });

  describe('classify - legal queries', () => {
    const legalQueries = [
      { query: 'artigo 75 da lei 14133', keyword: 'artigo' },
      { query: 'o que diz o TCU sobre dispensa', keyword: 'tcu' },
      { query: 'súmula 247 do TCE-SP', keyword: 'súmula' },
      {
        query: 'jurisprudência sobre pregão eletrônico',
        keyword: 'jurisprudência',
      },
      { query: 'decreto de licitação', keyword: 'decreto' },
      { query: 'inciso II do art. 75', keyword: 'inciso' },
      { query: 'inexigibilidade de licitação', keyword: 'inexigibilidade' },
      {
        query: 'termo de referência obrigatório',
        keyword: 'termo de referência',
      },
      { query: 'acórdão 123/2024', keyword: 'acórdão' },
      { query: 'conformidade com a lei 8666', keyword: '8.666' },
    ];

    it.each(legalQueries)(
      'should classify "$query" as legal (keyword: $keyword)',
      ({ query }) => {
        expect(service.classify(query)).toBe('legal');
      },
    );

    it('should include found keywords in classification details', () => {
      const result = service.classifyWithDetails('artigo 75 da lei 14133');
      expect(result.complexity).toBe('legal');
      expect(result.features.legalKeywordsFound).toContain('artigo');
      expect(result.features.legalKeywordsFound).toContain('lei');
    });

    it('should increase confidence with more legal keywords', () => {
      const singleKeyword = service.classifyWithDetails('lei de licitações');
      const multipleKeywords = service.classifyWithDetails(
        'artigo 75 da lei 14133 segundo jurisprudência do TCU',
      );

      expect(multipleKeywords.confidence).toBeGreaterThan(
        singleKeyword.confidence,
      );
    });
  });

  describe('classify - complex queries', () => {
    it('should classify long queries as complex', () => {
      const longQuery =
        'Preciso saber o valor de referência para aquisição de equipamentos de informática incluindo computadores notebooks monitores teclados e mouses para atender a demanda do setor administrativo';
      expect(service.classify(longQuery)).toBe('complex');
    });

    it('should classify queries with multiple entities as complex', () => {
      const result = service.classifyWithDetails(
        'valor unitário item 123 pregão 456/2024 processo 789',
      );
      // This should be complex due to multiple numbers/entities
      expect(['complex', 'legal']).toContain(result.complexity);
      expect(result.features.hasMultipleEntities).toBe(true);
    });

    it('should classify queries exceeding high threshold as complex', () => {
      const veryLongQuery = 'a '.repeat(60); // 120 chars
      const result = service.classifyWithDetails(veryLongQuery);
      expect(result.complexity).toBe('complex');
      expect(result.confidence).toBeGreaterThanOrEqual(0.9);
    });
  });

  describe('classifyWithDetails', () => {
    it('should return full classification result', () => {
      const result = service.classifyWithDetails('preço de computador');

      expect(result).toHaveProperty('complexity');
      expect(result).toHaveProperty('confidence');
      expect(result).toHaveProperty('reason');
      expect(result).toHaveProperty('features');

      expect(result.features).toHaveProperty('length');
      expect(result.features).toHaveProperty('wordCount');
      expect(result.features).toHaveProperty('legalKeywordsFound');
      expect(result.features).toHaveProperty('hasNumbers');
      expect(result.features).toHaveProperty('hasMultipleEntities');
    });

    it('should detect numbers in query', () => {
      const result = service.classifyWithDetails('pregão 123/2024');
      expect(result.features.hasNumbers).toBe(true);
    });

    it('should count words correctly', () => {
      const result = service.classifyWithDetails('um dois três quatro cinco');
      expect(result.features.wordCount).toBe(5);
    });

    it('should handle empty strings', () => {
      const result = service.classifyWithDetails('');
      expect(result.complexity).toBe('simple');
      expect(result.features.length).toBe(0);
    });

    it('should handle whitespace-only strings', () => {
      const result = service.classifyWithDetails('   ');
      expect(result.complexity).toBe('simple');
      expect(result.features.wordCount).toBe(0);
    });
  });

  describe('hasLegalKeyword', () => {
    it('should return true for existing keywords', () => {
      expect(service.hasLegalKeyword('lei')).toBe(true);
      expect(service.hasLegalKeyword('LEI')).toBe(true); // case insensitive
      expect(service.hasLegalKeyword('TCU')).toBe(true);
    });

    it('should return false for non-legal keywords', () => {
      expect(service.hasLegalKeyword('computador')).toBe(false);
      expect(service.hasLegalKeyword('xyz123')).toBe(false);
    });
  });

  describe('getLegalKeywords', () => {
    it('should return sorted array of keywords', () => {
      const keywords = service.getLegalKeywords();
      const sortedKeywords = [...keywords].sort();
      expect(keywords).toEqual(sortedKeywords);
    });
  });

  describe('edge cases', () => {
    it('should handle queries with special characters', () => {
      const result = service.classifyWithDetails('preço @#$% especial!!! ???');
      expect(result.complexity).toBeDefined();
    });

    it('should handle queries with accented characters', () => {
      const result = service.classifyWithDetails('licitação pública');
      expect(result.complexity).toBe('legal');
    });

    it('should prioritize legal over complex for legal terms in long queries', () => {
      const longLegalQuery =
        'Qual é a interpretação do TCU sobre o artigo 75 da lei 14133 no que se refere a dispensas de licitação para contratações emergenciais em situações de calamidade pública';
      const result = service.classifyWithDetails(longLegalQuery);
      expect(result.complexity).toBe('legal');
    });

    it('should handle mixed case legal keywords', () => {
      expect(service.classify('O que diz a LEI sobre isso')).toBe('legal');
      expect(service.classify('decisão do Tcu')).toBe('legal');
    });

    it('should detect law numbers without dots', () => {
      const result = service.classifyWithDetails('conforme lei 14133');
      expect(result.complexity).toBe('legal');
      expect(result.features.legalKeywordsFound).toContain('lei');
    });

    it('should detect law numbers with dots', () => {
      const result = service.classifyWithDetails('artigo da 14.133');
      expect(result.complexity).toBe('legal');
    });
  });

  describe('confidence scores', () => {
    it('should have confidence between 0 and 1', () => {
      const queries = [
        'teste',
        'lei 14133',
        'a '.repeat(100),
        'artigo 75 inciso II parágrafo único',
      ];

      queries.forEach((query) => {
        const result = service.classifyWithDetails(query);
        expect(result.confidence).toBeGreaterThanOrEqual(0);
        expect(result.confidence).toBeLessThanOrEqual(1);
      });
    });

    it('should have higher confidence for clear classifications', () => {
      const clearSimple = service.classifyWithDetails('oi');
      const clearLegal = service.classifyWithDetails(
        'súmula 247 do TCU sobre inexigibilidade',
      );

      expect(clearSimple.confidence).toBeGreaterThan(0.7);
      expect(clearLegal.confidence).toBeGreaterThan(0.7);
    });
  });

  describe('real-world query examples', () => {
    const realWorldCases: Array<{
      query: string;
      expected: QueryComplexity;
      description: string;
    }> = [
      {
        query: 'preço cadeira escritório',
        expected: 'simple',
        description: 'Simple product search',
      },
      {
        query: 'artigo 75 lei 14133 dispensa emergencial',
        expected: 'legal',
        description: 'Legal reference query',
      },
      {
        query:
          'Qual procedimento para contratação de serviços de TI incluindo desenvolvimento manutenção e suporte com valor estimado de R$ 500.000',
        expected: 'complex',
        description: 'Complex procurement query',
      },
      {
        query: 'IN SEGES 65/2021 pesquisa de preços',
        expected: 'legal',
        description: 'Normative reference',
      },
      {
        query: 'súmula TCE-SP sobre dispensa de licitação',
        expected: 'legal',
        description: 'Jurisprudence query',
      },
      {
        query: 'caneta bic azul',
        expected: 'simple',
        description: 'Simple item query',
      },
      {
        query: 'acórdão 1234/2024 TCU plenário',
        expected: 'legal',
        description: 'Specific court decision',
      },
    ];

    it.each(realWorldCases)(
      '$description: "$query" should be $expected',
      ({ query, expected }) => {
        expect(service.classify(query)).toBe(expected);
      },
    );
  });
});
