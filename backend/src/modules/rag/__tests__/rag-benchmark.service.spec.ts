import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { RagBenchmarkService } from '../benchmark/rag-benchmark.service';
import { HybridRagService } from '../services/hybrid-rag.service';
import { RagRouterService } from '../services/rag-router.service';
import { RAGService } from '../rag.service';
import { TreeSearchService } from '../../pageindex/services/tree-search.service';
import {
  BENCHMARK_DATASET,
  SIMPLE_QUERIES,
  COMPLEX_QUERIES,
  LEGAL_QUERIES,
  MIXED_QUERIES,
  getQueriesByType,
  getTestSubset,
  getRandomQueries,
} from '../benchmark/queries.dataset';
import { BenchmarkQueryType } from '../benchmark/benchmark.types';

describe('RagBenchmarkService', () => {
  let service: RagBenchmarkService;
  let hybridRag: jest.Mocked<HybridRagService>;
  let router: jest.Mocked<RagRouterService>;
  let embeddingsRag: jest.Mocked<RAGService>;
  let pageIndexRag: jest.Mocked<TreeSearchService>;

  const mockHybridResult = {
    context: 'Test context with computador preco',
    sources: [{ id: '1', title: 'Test' }],
    confidence: 0.85,
    path: 'hybrid' as const,
    latencyMs: 100,
    metadata: {
      complexity: 'simple' as const,
      usedFallback: false,
    },
  };

  const mockEmbeddingsResult = [
    {
      legislation: {
        id: '1',
        title: 'Lei 14133',
        content: 'Content with computador preco',
      },
      similarity: 0.9,
    },
  ];

  const mockPageIndexResult = [
    {
      treeId: 'tree-1',
      documentName: 'Lei 14133/2021',
      path: ['Artigo 75', 'Inciso II'],
      relevantNodes: [{ content: 'Content with artigo lei' }],
      confidence: 0.88,
    },
  ];

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RagBenchmarkService,
        {
          provide: HybridRagService,
          useValue: {
            search: jest.fn().mockResolvedValue(mockHybridResult),
          },
        },
        {
          provide: RagRouterService,
          useValue: {
            route: jest.fn(),
            routeWithFallback: jest.fn(),
          },
        },
        {
          provide: RAGService,
          useValue: {
            findSimilar: jest.fn().mockResolvedValue(mockEmbeddingsResult),
          },
        },
        {
          provide: TreeSearchService,
          useValue: {
            searchMultipleTrees: jest
              .fn()
              .mockResolvedValue(mockPageIndexResult),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, defaultValue: unknown) => defaultValue),
          },
        },
      ],
    }).compile();

    service = module.get<RagBenchmarkService>(RagBenchmarkService);
    hybridRag = module.get(HybridRagService);
    router = module.get(RagRouterService);
    embeddingsRag = module.get(RAGService);
    pageIndexRag = module.get(TreeSearchService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('Dataset', () => {
    it('should have exactly 200 queries in the complete dataset', () => {
      expect(BENCHMARK_DATASET.length).toBe(200);
    });

    it('should have 50 simple queries', () => {
      expect(SIMPLE_QUERIES.length).toBe(50);
    });

    it('should have 50 complex queries', () => {
      expect(COMPLEX_QUERIES.length).toBe(50);
    });

    it('should have 50 legal queries', () => {
      expect(LEGAL_QUERIES.length).toBe(50);
    });

    it('should have 50 mixed queries', () => {
      expect(MIXED_QUERIES.length).toBe(50);
    });

    it('should have unique IDs for all queries', () => {
      const ids = BENCHMARK_DATASET.map((q) => q.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });

    it('should have correct expected paths for simple queries', () => {
      for (const query of SIMPLE_QUERIES) {
        expect(query.expectedPath).toBe('embeddings');
        expect(query.type).toBe('simple');
      }
    });

    it('should have correct expected paths for complex queries', () => {
      for (const query of COMPLEX_QUERIES) {
        expect(query.expectedPath).toBe('pageindex');
        expect(query.type).toBe('complex');
      }
    });

    it('should have correct expected paths for legal queries', () => {
      for (const query of LEGAL_QUERIES) {
        expect(query.expectedPath).toBe('pageindex');
        expect(query.type).toBe('legal');
      }
    });

    it('should have correct expected paths for mixed queries', () => {
      for (const query of MIXED_QUERIES) {
        expect(query.expectedPath).toBe('hybrid');
        expect(query.type).toBe('mixed');
      }
    });

    it('should have expected keywords for all queries', () => {
      for (const query of BENCHMARK_DATASET) {
        expect(query.expectedKeywords).toBeDefined();
        expect(query.expectedKeywords!.length).toBeGreaterThan(0);
      }
    });
  });

  describe('getQueriesByType', () => {
    it('should return simple queries', () => {
      const queries = getQueriesByType('simple');
      expect(queries.length).toBe(50);
      expect(queries).toEqual(SIMPLE_QUERIES);
    });

    it('should return complex queries', () => {
      const queries = getQueriesByType('complex');
      expect(queries.length).toBe(50);
      expect(queries).toEqual(COMPLEX_QUERIES);
    });

    it('should return legal queries', () => {
      const queries = getQueriesByType('legal');
      expect(queries.length).toBe(50);
      expect(queries).toEqual(LEGAL_QUERIES);
    });

    it('should return mixed queries', () => {
      const queries = getQueriesByType('mixed');
      expect(queries.length).toBe(50);
      expect(queries).toEqual(MIXED_QUERIES);
    });

    it('should return empty array for invalid type', () => {
      const queries = getQueriesByType('invalid' as BenchmarkQueryType);
      expect(queries.length).toBe(0);
    });
  });

  describe('getTestSubset', () => {
    it('should return default 20 queries (5 per type)', () => {
      const subset = getTestSubset();
      expect(subset.length).toBe(20);
    });

    it('should return custom number of queries per type', () => {
      const subset = getTestSubset(10);
      expect(subset.length).toBe(40); // 10 * 4 types
    });

    it('should include all query types', () => {
      const subset = getTestSubset(2);
      const types = new Set(subset.map((q) => q.type));
      expect(types.size).toBe(4);
      expect(types.has('simple')).toBe(true);
      expect(types.has('complex')).toBe(true);
      expect(types.has('legal')).toBe(true);
      expect(types.has('mixed')).toBe(true);
    });
  });

  describe('getRandomQueries', () => {
    it('should return the specified number of queries', () => {
      const random = getRandomQueries(10);
      expect(random.length).toBe(10);
    });

    it('should not return more queries than available', () => {
      const random = getRandomQueries(300);
      expect(random.length).toBe(200);
    });

    it('should return different queries on each call (randomness)', () => {
      const random1 = getRandomQueries(50);
      const random2 = getRandomQueries(50);

      // It's extremely unlikely that two random selections would be identical
      const ids1 = random1.map((q) => q.id).sort();
      const ids2 = random2.map((q) => q.id).sort();

      // At least some queries should be different
      const sameCount = ids1.filter((id, i) => id === ids2[i]).length;
      expect(sameCount).toBeLessThan(50);
    });
  });

  describe('getDatasetSize', () => {
    it('should return 200', () => {
      expect(service.getDatasetSize()).toBe(200);
    });
  });

  describe('getDatasetByType', () => {
    it('should return correct counts for each type', () => {
      const counts = service.getDatasetByType();
      expect(counts.simple).toBe(50);
      expect(counts.complex).toBe(50);
      expect(counts.legal).toBe(50);
      expect(counts.mixed).toBe(50);
    });
  });

  describe('runBenchmark', () => {
    it('should run benchmark with all paths', async () => {
      const result = await service.runBenchmark({
        maxQueriesPerType: 1,
        warmupQueries: 0,
      });

      expect(result).toBeDefined();
      expect(result.runId).toBeDefined();
      expect(result.totalQueries).toBe(4); // 1 per type
      expect(result.pathStatistics).toBeDefined();
      expect(result.summary).toBeDefined();
    });

    it('should include detailed query results by default', async () => {
      const result = await service.runBenchmark({
        maxQueriesPerType: 1,
        warmupQueries: 0,
      });

      expect(result.queryResults.length).toBeGreaterThan(0);
    });

    it('should exclude detailed results when option is false', async () => {
      const result = await service.runBenchmark({
        maxQueriesPerType: 1,
        warmupQueries: 0,
        includeDetailedResults: false,
      });

      expect(result.queryResults.length).toBe(0);
    });

    it('should filter by query types', async () => {
      const result = await service.runBenchmark({
        queryTypes: ['simple', 'legal'],
        maxQueriesPerType: 2,
        warmupQueries: 0,
      });

      expect(result.totalQueries).toBe(4); // 2 simple + 2 legal
      expect(result.queriesByType.simple).toBe(2);
      expect(result.queriesByType.legal).toBe(2);
      expect(result.queriesByType.complex).toBe(0);
      expect(result.queriesByType.mixed).toBe(0);
    });

    it('should filter by paths', async () => {
      const result = await service.runBenchmark({
        maxQueriesPerType: 1,
        paths: ['embeddings', 'hybrid'],
        warmupQueries: 0,
      });

      // Only embeddings and hybrid results
      const pathsUsed = new Set(result.queryResults.map((r) => r.path));
      expect(pathsUsed.has('embeddings')).toBe(true);
      expect(pathsUsed.has('hybrid')).toBe(true);
      expect(pathsUsed.has('pageindex')).toBe(false);
    });

    it('should call progress callback', async () => {
      const progressCallback = jest.fn();

      await service.runBenchmark(
        {
          maxQueriesPerType: 1,
          warmupQueries: 0,
        },
        progressCallback,
      );

      expect(progressCallback).toHaveBeenCalled();

      // Check progress structure
      const lastCall =
        progressCallback.mock.calls[progressCallback.mock.calls.length - 1][0];
      expect(lastCall.currentQuery).toBeDefined();
      expect(lastCall.totalQueries).toBeDefined();
      expect(lastCall.percentComplete).toBeDefined();
    });

    it('should calculate path statistics correctly', async () => {
      const result = await service.runBenchmark({
        maxQueriesPerType: 2,
        warmupQueries: 0,
      });

      // Check embeddings stats
      const embeddingsStats = result.pathStatistics.embeddings;
      expect(embeddingsStats).toBeDefined();
      expect(embeddingsStats.totalQueries).toBeGreaterThan(0);
      expect(embeddingsStats.latency).toBeDefined();
      expect(embeddingsStats.latency.p50).toBeGreaterThanOrEqual(0);
      expect(embeddingsStats.latency.p95).toBeGreaterThanOrEqual(0);
      expect(embeddingsStats.accuracy).toBeDefined();

      // Check hybrid stats
      const hybridStats = result.pathStatistics.hybrid;
      expect(hybridStats).toBeDefined();
      expect(hybridStats.totalQueries).toBeGreaterThan(0);
    });

    it('should generate summary with acceptance criteria', async () => {
      const result = await service.runBenchmark({
        maxQueriesPerType: 2,
        warmupQueries: 0,
      });

      expect(result.summary).toBeDefined();
      expect(result.summary.bestOverallPath).toBeDefined();
      expect(result.summary.bestPathByType).toBeDefined();
      expect(result.summary.findings.length).toBeGreaterThan(0);
      expect(result.summary.recommendations.length).toBeGreaterThan(0);
      expect(result.summary.acceptanceCriteria).toBeDefined();
      expect(typeof result.summary.hybridMeetsAcceptanceCriteria).toBe(
        'boolean',
      );
    });

    it('should handle query errors gracefully', async () => {
      // Make embeddings fail
      embeddingsRag.findSimilar.mockRejectedValueOnce(new Error('Test error'));

      const result = await service.runBenchmark({
        maxQueriesPerType: 1,
        paths: ['embeddings'],
        warmupQueries: 0,
      });

      expect(result).toBeDefined();

      // Should have some failed queries
      const failedQueries = result.queryResults.filter((r) => r.error);
      expect(failedQueries.length).toBeGreaterThan(0);
    });
  });

  describe('runQuickBenchmark', () => {
    it('should run with default 5 queries per type', async () => {
      const result = await service.runQuickBenchmark();

      expect(result).toBeDefined();
      expect(result.totalQueries).toBe(20); // 5 * 4 types
    });

    it('should run with custom queries per type', async () => {
      const result = await service.runQuickBenchmark(3);

      expect(result).toBeDefined();
      expect(result.totalQueries).toBe(12); // 3 * 4 types
    });
  });

  describe('Acceptance Criteria Validation', () => {
    it('should validate AC1: hybrid accuracy >= max(embeddings, pageindex)', async () => {
      const result = await service.runBenchmark({
        maxQueriesPerType: 5,
        warmupQueries: 0,
      });

      const { acceptanceCriteria } = result.summary;
      expect(acceptanceCriteria.accuracyMet).toBeDefined();
      expect(acceptanceCriteria.accuracyDetails).toContain('Hybrid:');
      expect(acceptanceCriteria.accuracyDetails).toContain('Max other:');
    });

    it('should validate AC2: latency < 3s for 95% of queries', async () => {
      const result = await service.runBenchmark({
        maxQueriesPerType: 5,
        warmupQueries: 0,
      });

      const { acceptanceCriteria } = result.summary;
      expect(acceptanceCriteria.latencyMet).toBeDefined();
      expect(acceptanceCriteria.latencyDetails).toContain('P95:');
      expect(acceptanceCriteria.latencyDetails).toContain('threshold: 3000ms');
    });
  });

  describe('Query Content Validation', () => {
    it('simple queries should be short and product-focused', () => {
      for (const query of SIMPLE_QUERIES) {
        // Simple queries should generally be under 50 characters
        expect(query.query.length).toBeLessThan(100);
        // Should not contain legal keywords
        expect(query.query.toLowerCase()).not.toContain('lei 14133');
        expect(query.query.toLowerCase()).not.toContain('artigo');
      }
    });

    it('legal queries should contain legal terminology', () => {
      // Comprehensive list of legal terms from Brazilian procurement law
      const legalTerms = [
        'lei',
        'artigo',
        'art.',
        'inciso',
        'sumula',
        'tcu',
        'tce',
        'cgu',
        'agu',
        'decreto',
        'dispensa',
        'inexigibilidade',
        'licitacao',
        'contratacao',
        'acordao',
        'jurisprudencia',
        'compliance',
        'conformidade',
        'pregao',
        'improbidade',
        'erario',
        'prescricao',
        'irregularidade',
        'dano',
        'tomada de contas',
        'sancoes',
        'rescisao',
        'aditivo',
        'contrato',
        'subcontratacao',
        'garantia',
        'equilibrio',
        'clausulas',
        'superfaturamento',
        'sobrepreco',
        'direcionamento',
        'responsabilizacao',
        'jogo de planilha',
        'conluio',
        'recebimento',
        'provisorio',
        'definitivo',
        'extincao',
        'prorrogacao',
        'leilao',
        'alienacao',
        'credenciamento',
        'registro de precos',
        'modalidade',
        'concurso',
        'pesquisa de precos',
        'in seges',
        'gestao de riscos',
        'orientacao',
        'parecer',
        'resolucao',
        'entendimento',
      ];

      // At least 90% of legal queries should contain legal terms
      let matchCount = 0;
      for (const query of LEGAL_QUERIES) {
        const queryLower = query.query.toLowerCase();
        const hasLegalTerm = legalTerms.some((term) =>
          queryLower.includes(term),
        );
        if (hasLegalTerm) {
          matchCount++;
        }
      }

      const matchPercentage = (matchCount / LEGAL_QUERIES.length) * 100;
      expect(matchPercentage).toBeGreaterThanOrEqual(90);
    });

    it('complex queries should be longer and multi-faceted', () => {
      for (const query of COMPLEX_QUERIES) {
        // Complex queries should generally be over 50 characters
        expect(query.query.length).toBeGreaterThan(50);
        // Should have multiple expected keywords
        expect(query.expectedKeywords!.length).toBeGreaterThan(2);
      }
    });
  });
});
