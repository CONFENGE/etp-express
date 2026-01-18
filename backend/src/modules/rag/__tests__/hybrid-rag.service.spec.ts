import { Test, TestingModule } from '@nestjs/testing';
import { HybridRagService } from '../services/hybrid-rag.service';
import { RagRouterService, RagResult } from '../services/rag-router.service';
import { RagSearchOptions, RagSearchResult } from '../interfaces/rag.interface';
import { ClassificationResult } from '../services/query-complexity-classifier.service';

describe('HybridRagService', () => {
  let service: HybridRagService;
  let mockRouter: jest.Mocked<RagRouterService>;

  const mockClassification: ClassificationResult = {
    complexity: 'simple',
    confidence: 0.9,
    reason: 'Short query without legal terms',
    features: {
      length: 20,
      wordCount: 3,
      legalKeywordsFound: [],
      hasNumbers: false,
      hasMultipleEntities: false,
    },
  };

  beforeEach(async () => {
    mockRouter = {
      route: jest.fn(),
      getStats: jest.fn(),
      getRecentDecisions: jest.fn(),
      clearDecisionLog: jest.fn(),
    } as unknown as jest.Mocked<RagRouterService>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HybridRagService,
        {
          provide: RagRouterService,
          useValue: mockRouter,
        },
      ],
    }).compile();

    service = module.get<HybridRagService>(HybridRagService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('search', () => {
    it('should delegate to router and normalize embeddings results', async () => {
      const mockRagResult: RagResult = {
        path: 'embeddings',
        classification: mockClassification,
        embeddingsResults: [
          {
            legislation: {
              id: 'leg-1',
              title: 'Lei de Licitacoes',
              type: 'LEI' as any,
              number: '14133',
              year: 2021,
              content: 'Conteudo da lei...',
              isActive: true,
              getFormattedReference: () => 'Lei 14.133/2021',
            } as any,
            similarity: 0.85,
          },
        ],
        confidence: 0.85,
        latencyMs: 150,
      };

      mockRouter.route.mockResolvedValue(mockRagResult);

      const result = await service.search('preco de computador');

      expect(mockRouter.route).toHaveBeenCalledWith('preco de computador', {
        forcePath: undefined,
        embeddingsLimit: undefined,
        embeddingsThreshold: undefined,
        pageIndexLimit: undefined,
        documentType: undefined,
      });

      expect(result).toMatchObject({
        path: 'embeddings',
        confidence: 0.85,
        sources: expect.arrayContaining([
          expect.objectContaining({
            type: 'legislation',
            id: 'leg-1',
            title: 'Lei de Licitacoes',
            reference: 'Lei 14.133/2021',
            score: 0.85,
          }),
        ]),
      });
      expect(result.context).toContain('Lei de Licitacoes');
    });

    it('should delegate to router and normalize PageIndex results', async () => {
      const mockRagResult: RagResult = {
        path: 'pageindex',
        classification: {
          ...mockClassification,
          complexity: 'legal',
          features: {
            ...mockClassification.features,
            legalKeywordsFound: ['lei', '14133'],
          },
        },
        pageIndexResults: [
          {
            treeId: 'tree-1',
            documentName: 'Lei 14.133/2021',
            path: ['Titulo I', 'Capitulo II', 'Art. 75'],
            relevantNodes: [
              {
                id: 'node-1',
                title: 'Art. 75',
                level: 3,
                content: 'Dispensa de licitacao...',
                children: [],
              },
            ],
            confidence: 0.92,
            reasoning: 'Article 75 matches the query',
            searchTimeMs: 150,
          },
        ],
        confidence: 0.92,
        latencyMs: 250,
      };

      mockRouter.route.mockResolvedValue(mockRagResult);

      const result = await service.search('artigo 75 da lei 14133');

      expect(result).toMatchObject({
        path: 'pageindex',
        confidence: 0.92,
        sources: expect.arrayContaining([
          expect.objectContaining({
            type: 'legislation',
            id: 'tree-1',
            title: 'Lei 14.133/2021',
            reference: 'Titulo I > Capitulo II > Art. 75',
            score: 0.92,
          }),
        ]),
      });
      expect(result.context).toContain('Dispensa de licitacao');
    });

    it('should handle empty results gracefully', async () => {
      const mockRagResult: RagResult = {
        path: 'embeddings',
        classification: mockClassification,
        embeddingsResults: [],
        confidence: 0,
        latencyMs: 50,
      };

      mockRouter.route.mockResolvedValue(mockRagResult);

      const result = await service.search('query sem resultados');

      expect(result).toMatchObject({
        path: 'embeddings',
        confidence: 0,
        sources: [],
        context: '',
      });
    });

    it('should pass options to router correctly', async () => {
      const mockRagResult: RagResult = {
        path: 'pageindex',
        classification: mockClassification,
        pageIndexResults: [],
        confidence: 0,
        latencyMs: 100,
      };

      mockRouter.route.mockResolvedValue(mockRagResult);

      const options: RagSearchOptions = {
        limit: 10,
        threshold: 0.8,
        forcePath: 'pageindex',
        documentType: 'jurisprudencia',
        includeContent: true,
      };

      await service.search('test query', options);

      expect(mockRouter.route).toHaveBeenCalledWith('test query', {
        forcePath: 'pageindex',
        embeddingsLimit: 10,
        embeddingsThreshold: 0.8,
        pageIndexLimit: 10,
        documentType: 'jurisprudencia',
      });
    });

    it('should include metadata in result', async () => {
      const mockRagResult: RagResult = {
        path: 'embeddings',
        classification: {
          ...mockClassification,
          complexity: 'complex',
          confidence: 0.75,
          reason: 'Query contains multiple entities',
        },
        embeddingsResults: [
          {
            legislation: {
              id: 'leg-1',
              title: 'Lei Test',
              type: 'LEI' as any,
              number: '1',
              year: 2021,
              content: '',
              isActive: true,
              getFormattedReference: () => 'Lei 1/2021',
            } as any,
            similarity: 0.7,
          },
        ],
        confidence: 0.7,
        latencyMs: 100,
      };

      mockRouter.route.mockResolvedValue(mockRagResult);

      const result = await service.search('complex query');

      expect(result.metadata).toMatchObject({
        complexity: 'complex',
        classificationConfidence: 0.75,
        pathReason: 'Query contains multiple entities',
        totalResults: 1,
      });
    });

    it('should classify jurisprudencia documents correctly', async () => {
      const mockRagResult: RagResult = {
        path: 'pageindex',
        classification: mockClassification,
        pageIndexResults: [
          {
            treeId: 'juris-1',
            documentName: 'Sumula TCU 123',
            path: ['Jurisprudencia', 'Sumulas'],
            relevantNodes: [
              {
                id: 'node-1',
                title: 'Sumula 123',
                level: 2,
                content: 'Sumula sobre licitacao...',
                children: [],
              },
            ],
            confidence: 0.88,
            reasoning: 'Sumula matches query',
            searchTimeMs: 100,
          },
          {
            treeId: 'juris-2',
            documentName: 'Acordao TCE-SP 456',
            path: ['Jurisprudencia', 'Acordaos'],
            relevantNodes: [
              {
                id: 'node-2',
                title: 'Acordao 456',
                level: 2,
                content: 'Acordao sobre dispensa...',
                children: [],
              },
            ],
            confidence: 0.82,
            reasoning: 'Acordao matches query',
            searchTimeMs: 100,
          },
        ],
        confidence: 0.88,
        latencyMs: 200,
      };

      mockRouter.route.mockResolvedValue(mockRagResult);

      const result = await service.search('sumula tcu dispensa');

      expect(result.sources[0].type).toBe('jurisprudencia');
      expect(result.sources[1].type).toBe('jurisprudencia');
    });
  });

  describe('getStats', () => {
    it('should delegate to router', () => {
      const mockStats = {
        totalDecisions: 100,
        byPath: { embeddings: 60, pageindex: 40 },
        byComplexity: { simple: 50, complex: 30, legal: 20 },
        averageLatencyMs: 150,
        averageConfidence: 0.8,
      };

      mockRouter.getStats.mockReturnValue(mockStats);

      const stats = service.getStats();

      expect(mockRouter.getStats).toHaveBeenCalled();
      expect(stats).toEqual(mockStats);
    });
  });

  describe('getRecentDecisions', () => {
    it('should delegate to router with limit', () => {
      const mockDecisions = [
        {
          timestamp: new Date(),
          queryHash: 'abc123',
          complexity: 'simple' as const,
          pathChosen: 'embeddings' as const,
          latencyMs: 100,
          resultCount: 3,
          confidence: 0.85,
        },
      ];

      mockRouter.getRecentDecisions.mockReturnValue(mockDecisions);

      const decisions = service.getRecentDecisions(50);

      expect(mockRouter.getRecentDecisions).toHaveBeenCalledWith(50);
      expect(decisions).toEqual(mockDecisions);
    });
  });

  describe('IRagService interface compliance', () => {
    it('should implement search method as per interface', async () => {
      const mockRagResult: RagResult = {
        path: 'embeddings',
        classification: mockClassification,
        embeddingsResults: [],
        confidence: 0,
        latencyMs: 50,
      };

      mockRouter.route.mockResolvedValue(mockRagResult);

      // Verify interface compliance
      const result: RagSearchResult = await service.search('test');

      expect(result).toHaveProperty('context');
      expect(result).toHaveProperty('sources');
      expect(result).toHaveProperty('confidence');
      expect(result).toHaveProperty('path');
      expect(result).toHaveProperty('latencyMs');
    });
  });

  describe('context building', () => {
    it('should build readable context from embeddings results', async () => {
      const mockRagResult: RagResult = {
        path: 'embeddings',
        classification: mockClassification,
        embeddingsResults: [
          {
            legislation: {
              id: 'leg-1',
              title: 'Nova Lei de Licitacoes',
              type: 'LEI' as any,
              number: '14133',
              year: 2021,
              content: 'Art. 1 Esta Lei estabelece normas...',
              isActive: true,
              getFormattedReference: () => 'Lei 14.133/2021',
            } as any,
            similarity: 0.9,
          },
          {
            legislation: {
              id: 'leg-2',
              title: 'Decreto de Licitacoes Eletronicas',
              type: 'DECRETO' as any,
              number: '10024',
              year: 2019,
              content: 'Regulamenta a licitacao...',
              isActive: true,
              getFormattedReference: () => 'Decreto 10.024/2019',
            } as any,
            similarity: 0.75,
          },
        ],
        confidence: 0.9,
        latencyMs: 100,
      };

      mockRouter.route.mockResolvedValue(mockRagResult);

      const result = await service.search('licitacao eletronica');

      // Context should contain both sources separated
      expect(result.context).toContain('Lei 14.133/2021');
      expect(result.context).toContain('Nova Lei de Licitacoes');
      expect(result.context).toContain('Decreto 10.024/2019');
      expect(result.context).toContain('---'); // Separator
    });

    it('should build readable context from PageIndex results', async () => {
      const mockRagResult: RagResult = {
        path: 'pageindex',
        classification: mockClassification,
        pageIndexResults: [
          {
            treeId: 'tree-1',
            documentName: 'Lei 14.133/2021',
            path: ['Titulo II', 'Capitulo I', 'Art. 18'],
            relevantNodes: [
              {
                id: 'node-1',
                title: 'Art. 18',
                level: 3,
                content: 'O estudo tecnico preliminar...',
                children: [],
              },
            ],
            confidence: 0.95,
            reasoning: 'Article 18 matches the query',
            searchTimeMs: 150,
          },
        ],
        confidence: 0.95,
        latencyMs: 200,
      };

      mockRouter.route.mockResolvedValue(mockRagResult);

      const result = await service.search('estudo tecnico preliminar');

      expect(result.context).toContain('Lei 14.133/2021');
      expect(result.context).toContain('Titulo II > Capitulo I > Art. 18');
      expect(result.context).toContain('estudo tecnico preliminar');
    });
  });
});
