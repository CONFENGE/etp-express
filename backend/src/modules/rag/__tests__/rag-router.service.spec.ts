import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import {
  RagRouterService,
  RagResult,
  RouterDecisionLog,
} from '../services/rag-router.service';
import {
  QueryComplexityClassifierService,
  QueryComplexity,
  ClassificationResult,
} from '../services/query-complexity-classifier.service';
import { RAGService, SimilarLegislation } from '../rag.service';
import { TreeSearchService } from '../../pageindex/services/tree-search.service';
import { TreeSearchResult } from '../../pageindex/interfaces/tree-node.interface';

describe('RagRouterService', () => {
  let service: RagRouterService;
  let classifier: jest.Mocked<QueryComplexityClassifierService>;
  let embeddingsRag: jest.Mocked<RAGService>;
  let pageIndexRag: jest.Mocked<TreeSearchService>;
  let configService: jest.Mocked<ConfigService>;

  const mockClassificationResult = (
    complexity: QueryComplexity,
    confidence = 0.9,
  ): ClassificationResult => ({
    complexity,
    confidence,
    reason: `Test classification: ${complexity}`,
    features: {
      length: 20,
      wordCount: 4,
      legalKeywordsFound: complexity === 'legal' ? ['lei'] : [],
      hasNumbers: false,
      hasMultipleEntities: false,
    },
  });

  const mockEmbeddingsResults: SimilarLegislation[] = [
    {
      legislation: {
        id: '1',
        type: 'Lei',
        number: '14133',
        year: 2021,
        title: 'Nova Lei de Licitacoes',
        isActive: true,
      } as any,
      similarity: 0.85,
    },
    {
      legislation: {
        id: '2',
        type: 'Lei',
        number: '8666',
        year: 1993,
        title: 'Lei de Licitacoes',
        isActive: true,
      } as any,
      similarity: 0.72,
    },
  ];

  const mockPageIndexResults: Array<
    TreeSearchResult & { treeId: string; documentName: string }
  > = [
    {
      treeId: 'tree-1',
      documentName: 'Lei 14.133/2021',
      relevantNodes: [
        { id: 'art-75', title: 'Artigo 75', level: 2, children: [] },
      ],
      path: ['Lei 14.133/2021', 'Titulo III', 'Artigo 75'],
      confidence: 0.92,
      reasoning: 'Found relevant article about dispensa',
      searchTimeMs: 150,
    },
  ];

  beforeEach(async () => {
    const mockConfigService = {
      get: jest.fn((key: string, defaultValue?: unknown) => {
        const config: Record<string, unknown> = {
          RAG_ROUTER_MAX_LOG_SIZE: 1000,
          RAG_ROUTER_FORCE_PATH: null,
          RAG_COMPLEXITY_THRESHOLD: 50,
          RAG_HIGH_COMPLEXITY_THRESHOLD: 100,
          RAG_LEGAL_KEYWORD_THRESHOLD: 1,
          RAG_LEGAL_KEYWORDS: '',
        };
        return config[key] ?? defaultValue;
      }),
    };

    const mockClassifier = {
      classify: jest.fn(),
      classifyWithDetails: jest.fn(),
      hasLegalKeyword: jest.fn(),
      getLegalKeywords: jest.fn(),
    };

    const mockEmbeddingsRag = {
      findSimilar: jest.fn(),
      createEmbedding: jest.fn(),
      indexLegislation: jest.fn(),
      verifyReference: jest.fn(),
      getAllLegislation: jest.fn(),
      getLegislationById: jest.fn(),
      deleteLegislation: jest.fn(),
      getStats: jest.fn(),
    };

    const mockPageIndexRag = {
      search: jest.fn(),
      searchMultipleTrees: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RagRouterService,
        {
          provide: QueryComplexityClassifierService,
          useValue: mockClassifier,
        },
        {
          provide: RAGService,
          useValue: mockEmbeddingsRag,
        },
        {
          provide: TreeSearchService,
          useValue: mockPageIndexRag,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<RagRouterService>(RagRouterService);
    classifier = module.get(QueryComplexityClassifierService);
    embeddingsRag = module.get(RAGService);
    pageIndexRag = module.get(TreeSearchService);
    configService = module.get(ConfigService);
  });

  afterEach(() => {
    jest.clearAllMocks();
    service.clearDecisionLog();
  });

  describe('initialization', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('should initialize with empty decision log', () => {
      expect(service.getRecentDecisions()).toHaveLength(0);
    });
  });

  describe('route - path selection', () => {
    beforeEach(() => {
      embeddingsRag.findSimilar.mockResolvedValue(mockEmbeddingsResults);
      pageIndexRag.searchMultipleTrees.mockResolvedValue(mockPageIndexResults);
    });

    it('should route simple queries to embeddings', async () => {
      classifier.classifyWithDetails.mockReturnValue(
        mockClassificationResult('simple'),
      );

      const result = await service.route('preco de computador');

      expect(result.path).toBe('embeddings');
      expect(embeddingsRag.findSimilar).toHaveBeenCalled();
      expect(pageIndexRag.searchMultipleTrees).not.toHaveBeenCalled();
    });

    it('should route legal queries to pageindex', async () => {
      classifier.classifyWithDetails.mockReturnValue(
        mockClassificationResult('legal'),
      );

      const result = await service.route('artigo 75 da lei 14133');

      expect(result.path).toBe('pageindex');
      expect(pageIndexRag.searchMultipleTrees).toHaveBeenCalled();
      expect(embeddingsRag.findSimilar).not.toHaveBeenCalled();
    });

    it('should route complex queries to pageindex', async () => {
      classifier.classifyWithDetails.mockReturnValue(
        mockClassificationResult('complex'),
      );

      const result = await service.route(
        'Qual procedimento para contratacao de servicos de TI com valor estimado alto',
      );

      expect(result.path).toBe('pageindex');
      expect(pageIndexRag.searchMultipleTrees).toHaveBeenCalled();
    });

    it('should respect forcePath option', async () => {
      classifier.classifyWithDetails.mockReturnValue(
        mockClassificationResult('simple'),
      );

      const result = await service.route('preco de computador', {
        forcePath: 'pageindex',
      });

      expect(result.path).toBe('pageindex');
      expect(pageIndexRag.searchMultipleTrees).toHaveBeenCalled();
      expect(embeddingsRag.findSimilar).not.toHaveBeenCalled();
    });
  });

  describe('route - embeddings path', () => {
    beforeEach(() => {
      classifier.classifyWithDetails.mockReturnValue(
        mockClassificationResult('simple'),
      );
    });

    it('should return embeddings results', async () => {
      embeddingsRag.findSimilar.mockResolvedValue(mockEmbeddingsResults);

      const result = await service.route('preco de computador');

      expect(result.embeddingsResults).toEqual(mockEmbeddingsResults);
      expect(result.pageIndexResults).toBeUndefined();
    });

    it('should calculate confidence from best similarity', async () => {
      embeddingsRag.findSimilar.mockResolvedValue(mockEmbeddingsResults);

      const result = await service.route('preco de computador');

      expect(result.confidence).toBe(0.85); // Max of [0.85, 0.72]
    });

    it('should handle empty embeddings results', async () => {
      embeddingsRag.findSimilar.mockResolvedValue([]);

      const result = await service.route('xyz123 inexistente');

      expect(result.embeddingsResults).toEqual([]);
      expect(result.confidence).toBe(0);
    });

    it('should handle embeddings search errors gracefully', async () => {
      embeddingsRag.findSimilar.mockRejectedValue(new Error('OpenAI timeout'));

      const result = await service.route('preco de computador');

      expect(result.embeddingsResults).toEqual([]);
      expect(result.confidence).toBe(0);
    });

    it('should pass limit and threshold options', async () => {
      embeddingsRag.findSimilar.mockResolvedValue(mockEmbeddingsResults);

      await service.route('preco de computador', {
        embeddingsLimit: 10,
        embeddingsThreshold: 0.8,
      });

      expect(embeddingsRag.findSimilar).toHaveBeenCalledWith(
        'preco de computador',
        10,
        0.8,
      );
    });
  });

  describe('route - pageindex path', () => {
    beforeEach(() => {
      classifier.classifyWithDetails.mockReturnValue(
        mockClassificationResult('legal'),
      );
    });

    it('should return pageindex results', async () => {
      pageIndexRag.searchMultipleTrees.mockResolvedValue(mockPageIndexResults);

      const result = await service.route('artigo 75 da lei 14133');

      expect(result.pageIndexResults).toEqual(mockPageIndexResults);
      expect(result.embeddingsResults).toBeUndefined();
    });

    it('should calculate confidence from best search result', async () => {
      pageIndexRag.searchMultipleTrees.mockResolvedValue(mockPageIndexResults);

      const result = await service.route('artigo 75 da lei 14133');

      expect(result.confidence).toBe(0.92);
    });

    it('should handle empty pageindex results', async () => {
      pageIndexRag.searchMultipleTrees.mockResolvedValue([]);

      const result = await service.route('xyz123 lei inexistente');

      expect(result.pageIndexResults).toEqual([]);
      expect(result.confidence).toBe(0);
    });

    it('should handle pageindex search errors gracefully', async () => {
      pageIndexRag.searchMultipleTrees.mockRejectedValue(
        new Error('Tree not found'),
      );

      const result = await service.route('artigo 75 da lei 14133');

      expect(result.pageIndexResults).toEqual([]);
      expect(result.confidence).toBe(0);
    });

    it('should pass limit and documentType options', async () => {
      pageIndexRag.searchMultipleTrees.mockResolvedValue(mockPageIndexResults);

      await service.route('artigo 75 da lei 14133', {
        pageIndexLimit: 3,
        documentType: 'legislation',
      });

      expect(pageIndexRag.searchMultipleTrees).toHaveBeenCalledWith(
        'artigo 75 da lei 14133',
        expect.objectContaining({
          limit: 3,
          documentType: 'legislation',
        }),
      );
    });
  });

  describe('route - result structure', () => {
    it('should include classification in result', async () => {
      const classification = mockClassificationResult('simple');
      classifier.classifyWithDetails.mockReturnValue(classification);
      embeddingsRag.findSimilar.mockResolvedValue(mockEmbeddingsResults);

      const result = await service.route('preco de computador');

      expect(result.classification).toEqual(classification);
    });

    it('should include latency in result', async () => {
      classifier.classifyWithDetails.mockReturnValue(
        mockClassificationResult('simple'),
      );
      embeddingsRag.findSimilar.mockResolvedValue(mockEmbeddingsResults);

      const result = await service.route('preco de computador');

      expect(result.latencyMs).toBeGreaterThanOrEqual(0);
    });
  });

  describe('decision logging', () => {
    beforeEach(() => {
      classifier.classifyWithDetails.mockReturnValue(
        mockClassificationResult('simple'),
      );
      embeddingsRag.findSimilar.mockResolvedValue(mockEmbeddingsResults);
    });

    it('should log routing decisions', async () => {
      await service.route('preco de computador');

      const logs = service.getRecentDecisions();
      expect(logs).toHaveLength(1);
      expect(logs[0].pathChosen).toBe('embeddings');
      expect(logs[0].complexity).toBe('simple');
    });

    it('should include all decision fields', async () => {
      await service.route('preco de computador');

      const log = service.getRecentDecisions()[0];
      expect(log).toHaveProperty('timestamp');
      expect(log).toHaveProperty('queryHash');
      expect(log).toHaveProperty('complexity');
      expect(log).toHaveProperty('pathChosen');
      expect(log).toHaveProperty('latencyMs');
      expect(log).toHaveProperty('resultCount');
      expect(log).toHaveProperty('confidence');
    });

    it('should hash query for privacy', async () => {
      await service.route('query with sensitive info');

      const log = service.getRecentDecisions()[0];
      expect(log.queryHash).not.toContain('sensitive');
      expect(log.queryHash).toMatch(/^[0-9a-f]{8}$/);
    });

    it('should respect getRecentDecisions limit', async () => {
      for (let i = 0; i < 10; i++) {
        await service.route(`query ${i}`);
      }

      const logs = service.getRecentDecisions(5);
      expect(logs).toHaveLength(5);
    });
  });

  describe('getStats', () => {
    beforeEach(() => {
      embeddingsRag.findSimilar.mockResolvedValue(mockEmbeddingsResults);
      pageIndexRag.searchMultipleTrees.mockResolvedValue(mockPageIndexResults);
    });

    it('should return empty stats initially', () => {
      const stats = service.getStats();

      expect(stats.totalDecisions).toBe(0);
      expect(stats.byPath.embeddings).toBe(0);
      expect(stats.byPath.pageindex).toBe(0);
    });

    it('should aggregate stats correctly', async () => {
      // 2 simple queries -> embeddings
      classifier.classifyWithDetails.mockReturnValue(
        mockClassificationResult('simple'),
      );
      await service.route('query 1');
      await service.route('query 2');

      // 3 legal queries -> pageindex
      classifier.classifyWithDetails.mockReturnValue(
        mockClassificationResult('legal'),
      );
      await service.route('lei query 1');
      await service.route('lei query 2');
      await service.route('lei query 3');

      const stats = service.getStats();

      expect(stats.totalDecisions).toBe(5);
      expect(stats.byPath.embeddings).toBe(2);
      expect(stats.byPath.pageindex).toBe(3);
      expect(stats.byComplexity.simple).toBe(2);
      expect(stats.byComplexity.legal).toBe(3);
    });

    it('should calculate averages correctly', async () => {
      classifier.classifyWithDetails.mockReturnValue(
        mockClassificationResult('simple'),
      );
      await service.route('query 1');
      await service.route('query 2');

      const stats = service.getStats();

      expect(stats.averageLatencyMs).toBeGreaterThanOrEqual(0);
      expect(stats.averageConfidence).toBeGreaterThanOrEqual(0);
      expect(stats.averageConfidence).toBeLessThanOrEqual(1);
    });
  });

  describe('clearDecisionLog', () => {
    it('should clear all decisions', async () => {
      classifier.classifyWithDetails.mockReturnValue(
        mockClassificationResult('simple'),
      );
      embeddingsRag.findSimilar.mockResolvedValue(mockEmbeddingsResults);

      await service.route('query 1');
      await service.route('query 2');

      expect(service.getRecentDecisions()).toHaveLength(2);

      service.clearDecisionLog();

      expect(service.getRecentDecisions()).toHaveLength(0);
    });
  });

  describe('real-world scenarios', () => {
    beforeEach(() => {
      embeddingsRag.findSimilar.mockResolvedValue(mockEmbeddingsResults);
      pageIndexRag.searchMultipleTrees.mockResolvedValue(mockPageIndexResults);
    });

    const scenarios: Array<{
      query: string;
      complexity: QueryComplexity;
      expectedPath: 'embeddings' | 'pageindex';
      description: string;
    }> = [
      {
        query: 'preco cadeira escritorio',
        complexity: 'simple',
        expectedPath: 'embeddings',
        description: 'Simple price lookup',
      },
      {
        query: 'artigo 75 lei 14133 dispensa emergencial',
        complexity: 'legal',
        expectedPath: 'pageindex',
        description: 'Legal article reference',
      },
      {
        query: 'sumula 247 TCE-SP inexigibilidade',
        complexity: 'legal',
        expectedPath: 'pageindex',
        description: 'Jurisprudence reference',
      },
      {
        query:
          'procedimento completo para contratacao de servicos de TI com orcamento acima de 500 mil',
        complexity: 'complex',
        expectedPath: 'pageindex',
        description: 'Complex multi-topic query',
      },
      {
        query: 'papel A4',
        complexity: 'simple',
        expectedPath: 'embeddings',
        description: 'Simple item search',
      },
    ];

    it.each(scenarios)(
      '$description: "$query" should route to $expectedPath',
      async ({ query, complexity, expectedPath }) => {
        classifier.classifyWithDetails.mockReturnValue(
          mockClassificationResult(complexity),
        );

        const result = await service.route(query);

        expect(result.path).toBe(expectedPath);
      },
    );
  });

  describe('concurrent requests', () => {
    it('should handle multiple concurrent requests', async () => {
      classifier.classifyWithDetails.mockReturnValue(
        mockClassificationResult('simple'),
      );
      embeddingsRag.findSimilar.mockResolvedValue(mockEmbeddingsResults);

      const queries = Array.from({ length: 10 }, (_, i) => `query ${i}`);
      const results = await Promise.all(queries.map((q) => service.route(q)));

      expect(results).toHaveLength(10);
      results.forEach((result) => {
        expect(result.path).toBe('embeddings');
        expect(result.embeddingsResults).toEqual(mockEmbeddingsResults);
      });

      expect(service.getRecentDecisions()).toHaveLength(10);
    });
  });
});
