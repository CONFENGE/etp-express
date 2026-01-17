import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { NotFoundException } from '@nestjs/common';
import { TreeSearchService } from '../services/tree-search.service';
import { OpenAIService } from '../../orchestrator/llm/openai.service';
import {
  DocumentTree,
  DocumentTreeStatus,
} from '../../../entities/document-tree.entity';
import { DocumentType } from '../dto/index-document.dto';
import { TreeNode } from '../interfaces/tree-node.interface';

/**
 * Unit tests for TreeSearchService
 *
 * Tests the LLM-based tree search algorithm that navigates document
 * hierarchies using reasoning instead of vector similarity.
 *
 * @see Issue #1553 - [PI-1538d] Implementar TreeSearchService com LLM reasoning
 * @see Issue #1538 - Create PageIndex module for hierarchical document indexing
 */
describe('TreeSearchService', () => {
  let service: TreeSearchService;
  let documentTreeRepository: jest.Mocked<Repository<DocumentTree>>;
  let openAIService: jest.Mocked<OpenAIService>;

  const mockConfigService = {
    get: jest.fn((key: string) => {
      if (key === 'OPENAI_MODEL') return 'gpt-4.1-nano';
      if (key === 'OPENAI_TEMPERATURE') return 0.1;
      return undefined;
    }),
  };

  // Sample tree structure for testing
  const sampleTreeStructure: TreeNode = {
    id: 'root',
    title: 'Lei 14.133/2021 - Nova Lei de Licitações',
    level: 0,
    content: 'Lei que estabelece normas para licitações e contratos públicos.',
    children: [
      {
        id: 'titulo-1',
        title: 'TÍTULO I - Disposições Preliminares',
        level: 1,
        content: 'Disposições gerais sobre a lei.',
        children: [
          {
            id: 'cap-1',
            title: 'CAPÍTULO I - Do Âmbito de Aplicação',
            level: 2,
            content: 'Aplicação da lei aos entes federativos.',
            children: [
              {
                id: 'art-1',
                title: 'Art. 1º',
                level: 3,
                content:
                  'Esta Lei estabelece normas gerais de licitação e contratação para as Administrações Públicas diretas, autárquicas e fundacionais da União, dos Estados, do Distrito Federal e dos Municípios.',
                children: [],
              },
            ],
          },
          {
            id: 'cap-2',
            title: 'CAPÍTULO II - Das Definições',
            level: 2,
            content: 'Definições dos termos utilizados.',
            children: [
              {
                id: 'art-6',
                title: 'Art. 6º - Definições',
                level: 3,
                content:
                  'Para os fins desta Lei, consideram-se: I - obra; II - serviço; III - serviço de engenharia...',
                children: [],
              },
            ],
          },
        ],
      },
      {
        id: 'titulo-2',
        title: 'TÍTULO II - Das Licitações',
        level: 1,
        content: 'Normas sobre procedimentos licitatórios.',
        children: [
          {
            id: 'cap-3',
            title: 'CAPÍTULO I - Das Modalidades de Licitação',
            level: 2,
            content: 'Modalidades: pregão, concorrência, concurso, leilão, diálogo competitivo.',
            children: [
              {
                id: 'art-28',
                title: 'Art. 28 - Modalidades',
                level: 3,
                content:
                  'São modalidades de licitação: I - pregão; II - concorrência; III - concurso; IV - leilão; V - diálogo competitivo.',
                children: [],
              },
            ],
          },
          {
            id: 'cap-4',
            title: 'CAPÍTULO II - Da Dispensa e Inexigibilidade',
            level: 2,
            content: 'Casos de dispensa e inexigibilidade de licitação.',
            children: [
              {
                id: 'art-75',
                title: 'Art. 75 - Dispensa de Licitação',
                level: 3,
                content:
                  'É dispensável a licitação: I - para contratação que envolva valores inferiores a R$ 100.000,00 para obras e serviços de engenharia...',
                children: [],
              },
            ],
          },
        ],
      },
    ],
  };

  const mockDocumentTree: DocumentTree = {
    id: 'tree-123',
    documentName: 'Lei 14.133/2021',
    documentPath: null,
    sourceUrl: 'https://planalto.gov.br/lei-14133',
    documentType: DocumentType.LEGISLATION,
    status: DocumentTreeStatus.INDEXED,
    treeStructure: sampleTreeStructure,
    metadata: null,
    error: null,
    nodeCount: 10,
    maxDepth: 3,
    processingTimeMs: 5000,
    indexedAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TreeSearchService,
        {
          provide: getRepositoryToken(DocumentTree),
          useValue: {
            findOne: jest.fn(),
            createQueryBuilder: jest.fn(() => ({
              where: jest.fn().mockReturnThis(),
              andWhere: jest.fn().mockReturnThis(),
              orderBy: jest.fn().mockReturnThis(),
              take: jest.fn().mockReturnThis(),
              getMany: jest.fn(),
            })),
          },
        },
        {
          provide: OpenAIService,
          useValue: {
            generateCompletion: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<TreeSearchService>(TreeSearchService);
    documentTreeRepository = module.get(getRepositoryToken(DocumentTree));
    openAIService = module.get(OpenAIService);
  });

  describe('initialization', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });
  });

  describe('search', () => {
    it('should throw NotFoundException if tree not found', async () => {
      documentTreeRepository.findOne.mockResolvedValue(null);

      await expect(
        service.search('non-existent', 'Qual o limite para dispensa?'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw Error if tree is not indexed yet', async () => {
      const pendingTree = {
        ...mockDocumentTree,
        status: DocumentTreeStatus.PENDING,
      };
      documentTreeRepository.findOne.mockResolvedValue(pendingTree);

      await expect(
        service.search('tree-123', 'Qual o limite para dispensa?'),
      ).rejects.toThrow('not indexed yet');
    });

    it('should throw Error if tree has no structure', async () => {
      const emptyTree = {
        ...mockDocumentTree,
        treeStructure: null,
      };
      documentTreeRepository.findOne.mockResolvedValue(emptyTree);

      await expect(
        service.search('tree-123', 'Qual o limite para dispensa?'),
      ).rejects.toThrow('has no tree structure');
    });

    it('should find relevant nodes using LLM reasoning', async () => {
      documentTreeRepository.findOne.mockResolvedValue(mockDocumentTree);

      // Mock LLM navigation decisions
      openAIService.generateCompletion
        .mockResolvedValueOnce({
          content: JSON.stringify({
            decision: 'EXPLORE',
            selectedNodes: ['titulo-2'],
            reasoning: 'Dispensa está relacionada a licitações',
            confidence: 0.9,
          }),
          tokens: 100,
          model: 'gpt-4.1-nano',
          finishReason: 'stop',
        })
        .mockResolvedValueOnce({
          content: JSON.stringify({
            decision: 'EXPLORE',
            selectedNodes: ['cap-4'],
            reasoning: 'Capítulo sobre dispensa e inexigibilidade',
            confidence: 0.95,
          }),
          tokens: 100,
          model: 'gpt-4.1-nano',
          finishReason: 'stop',
        })
        .mockResolvedValueOnce({
          content: JSON.stringify({
            decision: 'FOUND',
            selectedNodes: ['art-75'],
            reasoning: 'Art. 75 trata especificamente de dispensa de licitação',
            confidence: 0.98,
          }),
          tokens: 100,
          model: 'gpt-4.1-nano',
          finishReason: 'stop',
        });

      const result = await service.search(
        'tree-123',
        'Qual o limite para dispensa de licitação?',
      );

      expect(result.relevantNodes).toHaveLength(1);
      expect(result.relevantNodes[0].id).toBe('art-75');
      expect(result.confidence).toBeGreaterThan(0.5);
      expect(result.path.length).toBeGreaterThan(0);
      expect(result.searchTimeMs).toBeGreaterThanOrEqual(0);
    });

    it('should handle single node tree', async () => {
      const singleNodeTree: TreeNode = {
        id: 'root',
        title: 'Simple Document',
        level: 0,
        content: 'Single content node',
        children: [],
      };

      const simpleDocTree = {
        ...mockDocumentTree,
        treeStructure: singleNodeTree,
      };
      documentTreeRepository.findOne.mockResolvedValue(simpleDocTree);

      const result = await service.search('tree-123', 'Any query');

      expect(result.relevantNodes).toHaveLength(1);
      expect(result.relevantNodes[0].id).toBe('root');
      expect(result.confidence).toBe(1.0);
    });

    it('should respect maxDepth option', async () => {
      documentTreeRepository.findOne.mockResolvedValue(mockDocumentTree);

      openAIService.generateCompletion.mockResolvedValue({
        content: JSON.stringify({
          decision: 'EXPLORE',
          selectedNodes: ['titulo-1', 'titulo-2'],
          reasoning: 'Exploring both titles',
          confidence: 0.7,
        }),
        tokens: 100,
        model: 'gpt-4.1-nano',
        finishReason: 'stop',
      });

      const result = await service.search(
        'tree-123',
        'Test query',
        { maxDepth: 1 },
      );

      // With maxDepth 1, should not go beyond first level children
      expect(result).toBeDefined();
    });

    it('should respect maxResults option', async () => {
      documentTreeRepository.findOne.mockResolvedValue(mockDocumentTree);

      // Mock finding multiple nodes
      openAIService.generateCompletion.mockResolvedValue({
        content: JSON.stringify({
          decision: 'FOUND',
          selectedNodes: ['titulo-1', 'titulo-2'],
          reasoning: 'Found multiple relevant sections',
          confidence: 0.85,
        }),
        tokens: 100,
        model: 'gpt-4.1-nano',
        finishReason: 'stop',
      });

      const result = await service.search(
        'tree-123',
        'Test query',
        { maxResults: 1 },
      );

      expect(result.relevantNodes.length).toBeLessThanOrEqual(1);
    });

    it('should handle NOT_FOUND decision', async () => {
      documentTreeRepository.findOne.mockResolvedValue(mockDocumentTree);

      openAIService.generateCompletion.mockResolvedValue({
        content: JSON.stringify({
          decision: 'NOT_FOUND',
          selectedNodes: [],
          reasoning: 'Information not present in document',
          confidence: 0.1,
        }),
        tokens: 100,
        model: 'gpt-4.1-nano',
        finishReason: 'stop',
      });

      const result = await service.search(
        'tree-123',
        'Query about unrelated topic',
      );

      expect(result.relevantNodes).toHaveLength(0);
      expect(result.confidence).toBe(0);
    });

    it('should handle LLM errors gracefully', async () => {
      documentTreeRepository.findOne.mockResolvedValue(mockDocumentTree);

      openAIService.generateCompletion.mockRejectedValue(
        new Error('LLM service unavailable'),
      );

      // Should not throw, instead fallback to exploring top nodes
      const result = await service.search('tree-123', 'Test query');

      expect(result).toBeDefined();
      expect(result.reasoning).toContain('LLM error');
    });

    it('should handle invalid JSON response from LLM', async () => {
      documentTreeRepository.findOne.mockResolvedValue(mockDocumentTree);

      openAIService.generateCompletion.mockResolvedValue({
        content: 'This is not valid JSON',
        tokens: 50,
        model: 'gpt-4.1-nano',
        finishReason: 'stop',
      });

      const result = await service.search('tree-123', 'Test query');

      // Should handle gracefully with NOT_FOUND
      expect(result).toBeDefined();
    });

    it('should apply minConfidence filter', async () => {
      documentTreeRepository.findOne.mockResolvedValue(mockDocumentTree);

      openAIService.generateCompletion.mockResolvedValue({
        content: JSON.stringify({
          decision: 'FOUND',
          selectedNodes: ['titulo-1'],
          reasoning: 'Low confidence match',
          confidence: 0.3,
        }),
        tokens: 100,
        model: 'gpt-4.1-nano',
        finishReason: 'stop',
      });

      const result = await service.search(
        'tree-123',
        'Test query',
        { minConfidence: 0.5 },
      );

      // Nodes below minConfidence should be filtered
      expect(result.relevantNodes).toHaveLength(0);
    });
  });

  describe('searchMultipleTrees', () => {
    it('should search across multiple trees', async () => {
      const trees = [
        { ...mockDocumentTree, id: 'tree-1', documentName: 'Doc 1' },
        { ...mockDocumentTree, id: 'tree-2', documentName: 'Doc 2' },
      ];

      const queryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(trees),
      };

      documentTreeRepository.createQueryBuilder.mockReturnValue(queryBuilder as any);
      documentTreeRepository.findOne
        .mockResolvedValueOnce(trees[0])
        .mockResolvedValueOnce(trees[1]);

      openAIService.generateCompletion.mockResolvedValue({
        content: JSON.stringify({
          decision: 'FOUND',
          selectedNodes: ['titulo-1'],
          reasoning: 'Found relevant content',
          confidence: 0.8,
        }),
        tokens: 100,
        model: 'gpt-4.1-nano',
        finishReason: 'stop',
      });

      const results = await service.searchMultipleTrees('Test query');

      expect(results.length).toBe(2);
      expect(results[0]).toHaveProperty('treeId');
      expect(results[0]).toHaveProperty('documentName');
    });

    it('should filter by document type', async () => {
      const queryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([mockDocumentTree]),
      };

      documentTreeRepository.createQueryBuilder.mockReturnValue(queryBuilder as any);
      documentTreeRepository.findOne.mockResolvedValue(mockDocumentTree);

      openAIService.generateCompletion.mockResolvedValue({
        content: JSON.stringify({
          decision: 'FOUND',
          selectedNodes: ['titulo-1'],
          reasoning: 'Found',
          confidence: 0.8,
        }),
        tokens: 100,
        model: 'gpt-4.1-nano',
        finishReason: 'stop',
      });

      await service.searchMultipleTrees('Test query', {
        documentType: DocumentType.LEGISLATION,
      });

      expect(queryBuilder.andWhere).toHaveBeenCalledWith(
        'tree.documentType = :type',
        { type: DocumentType.LEGISLATION },
      );
    });

    it('should sort results by confidence', async () => {
      const trees = [
        { ...mockDocumentTree, id: 'tree-1', documentName: 'Doc 1' },
        { ...mockDocumentTree, id: 'tree-2', documentName: 'Doc 2' },
      ];

      const queryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(trees),
      };

      documentTreeRepository.createQueryBuilder.mockReturnValue(queryBuilder as any);
      documentTreeRepository.findOne
        .mockResolvedValueOnce(trees[0])
        .mockResolvedValueOnce(trees[1]);

      openAIService.generateCompletion
        .mockResolvedValueOnce({
          content: JSON.stringify({
            decision: 'FOUND',
            selectedNodes: ['titulo-1'],
            reasoning: 'Low confidence',
            confidence: 0.5,
          }),
          tokens: 100,
          model: 'gpt-4.1-nano',
          finishReason: 'stop',
        })
        .mockResolvedValueOnce({
          content: JSON.stringify({
            decision: 'FOUND',
            selectedNodes: ['titulo-1'],
            reasoning: 'High confidence',
            confidence: 0.9,
          }),
          tokens: 100,
          model: 'gpt-4.1-nano',
          finishReason: 'stop',
        });

      const results = await service.searchMultipleTrees('Test query');

      expect(results[0].confidence).toBeGreaterThanOrEqual(results[1].confidence);
    });

    it('should handle search failures gracefully', async () => {
      const trees = [
        { ...mockDocumentTree, id: 'tree-1', documentName: 'Doc 1' },
        { ...mockDocumentTree, id: 'tree-2', documentName: 'Doc 2' },
      ];

      const queryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(trees),
      };

      documentTreeRepository.createQueryBuilder.mockReturnValue(queryBuilder as any);
      documentTreeRepository.findOne
        .mockResolvedValueOnce(trees[0])
        .mockRejectedValueOnce(new Error('DB error'));

      openAIService.generateCompletion.mockResolvedValue({
        content: JSON.stringify({
          decision: 'FOUND',
          selectedNodes: ['titulo-1'],
          reasoning: 'Found',
          confidence: 0.8,
        }),
        tokens: 100,
        model: 'gpt-4.1-nano',
        finishReason: 'stop',
      });

      const results = await service.searchMultipleTrees('Test query');

      // Should return result from successful tree only
      expect(results.length).toBe(1);
      expect(results[0].treeId).toBe('tree-1');
    });
  });

  describe('parseNavigationResponse', () => {
    it('should extract JSON from markdown code blocks', async () => {
      documentTreeRepository.findOne.mockResolvedValue(mockDocumentTree);

      openAIService.generateCompletion.mockResolvedValue({
        content: '```json\n{"decision": "FOUND", "selectedNodes": ["titulo-1"], "reasoning": "Test", "confidence": 0.9}\n```',
        tokens: 100,
        model: 'gpt-4.1-nano',
        finishReason: 'stop',
      });

      const result = await service.search('tree-123', 'Test query');

      expect(result.relevantNodes).toHaveLength(1);
    });

    it('should handle decision case insensitivity', async () => {
      documentTreeRepository.findOne.mockResolvedValue(mockDocumentTree);

      openAIService.generateCompletion.mockResolvedValue({
        content: '{"decision": "found", "selectedNodes": ["titulo-1"], "reasoning": "Test", "confidence": 0.9}',
        tokens: 100,
        model: 'gpt-4.1-nano',
        finishReason: 'stop',
      });

      const result = await service.search('tree-123', 'Test query');

      expect(result.relevantNodes).toHaveLength(1);
    });

    it('should clamp confidence to 0-1 range', async () => {
      documentTreeRepository.findOne.mockResolvedValue(mockDocumentTree);

      openAIService.generateCompletion.mockResolvedValue({
        content: '{"decision": "FOUND", "selectedNodes": ["titulo-1"], "reasoning": "Test", "confidence": 1.5}',
        tokens: 100,
        model: 'gpt-4.1-nano',
        finishReason: 'stop',
      });

      const result = await service.search('tree-123', 'Test query');

      expect(result.confidence).toBeLessThanOrEqual(1);
    });
  });
});
