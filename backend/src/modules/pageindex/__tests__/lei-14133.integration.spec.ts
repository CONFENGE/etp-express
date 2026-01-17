import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';
import { Lei14133Seeder } from '../seeders/lei-14133.seeder';
import { TreeSearchService } from '../services/tree-search.service';
import { PageIndexService } from '../pageindex.service';
import { OpenAIService } from '../../orchestrator/llm/openai.service';
import {
  DocumentTree,
  DocumentTreeStatus,
} from '../../../entities/document-tree.entity';
import { DocumentType } from '../dto/index-document.dto';
import { TreeNode } from '../interfaces/tree-node.interface';

/**
 * Integration tests for Lei 14.133/2021 PoC.
 *
 * These tests validate the PageIndex implementation using the
 * Nova Lei de Licitacoes as a real-world document.
 *
 * Test Queries (from issue #1554):
 * - "Qual o limite para dispensa de licitacao?"
 * - "Quais sao as modalidades de licitacao?"
 * - "O que e pregao eletronico?"
 * - "Quais documentos sao exigidos para habilitacao?"
 *
 * @see Issue #1554 - [PI-1538e] PoC PageIndex com Lei 14.133/2021
 */
describe('Lei 14.133/2021 PageIndex Integration', () => {
  let seeder: Lei14133Seeder;
  let searchService: TreeSearchService;
  let pageIndexService: PageIndexService;
  let documentTreeRepository: jest.Mocked<Repository<DocumentTree>>;
  let openAIService: jest.Mocked<OpenAIService>;

  // Store seeded tree for reuse
  let seededTree: DocumentTree | null = null;

  const mockConfigService = {
    get: jest.fn((key: string) => {
      if (key === 'OPENAI_MODEL') return 'gpt-4.1-nano';
      if (key === 'OPENAI_TEMPERATURE') return 0.1;
      return undefined;
    }),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    seededTree = null;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        Lei14133Seeder,
        TreeSearchService,
        {
          provide: PageIndexService,
          useValue: {
            getTree: jest.fn(),
            updateTreeStatus: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(DocumentTree),
          useValue: {
            findOne: jest.fn(),
            create: jest.fn((data) => ({ id: 'test-tree-id', ...data })),
            save: jest.fn((tree) => Promise.resolve(tree)),
            delete: jest.fn(),
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

    seeder = module.get<Lei14133Seeder>(Lei14133Seeder);
    searchService = module.get<TreeSearchService>(TreeSearchService);
    pageIndexService = module.get<PageIndexService>(PageIndexService);
    documentTreeRepository = module.get(getRepositoryToken(DocumentTree));
    openAIService = module.get(OpenAIService);
  });

  describe('Lei14133Seeder', () => {
    describe('seed', () => {
      it('should create tree structure for Lei 14.133/2021', async () => {
        documentTreeRepository.findOne.mockResolvedValue(null);

        const result = await seeder.seed();

        expect(result).toBeDefined();
        expect(result.documentName).toBe(
          'Lei 14.133/2021 - Nova Lei de Licitacoes',
        );
        expect(result.documentType).toBe(DocumentType.LEGISLATION);
        expect(result.status).toBe(DocumentTreeStatus.INDEXED);
      });

      it('should return existing tree if already seeded', async () => {
        const existingTree = {
          id: 'existing-id',
          documentName: 'Lei 14.133/2021 - Nova Lei de Licitacoes',
          status: DocumentTreeStatus.INDEXED,
        };
        documentTreeRepository.findOne.mockResolvedValue(
          existingTree as DocumentTree,
        );

        const result = await seeder.seed();

        expect(result.id).toBe('existing-id');
        expect(documentTreeRepository.save).not.toHaveBeenCalled();
      });

      it('should create hierarchical tree with correct structure', async () => {
        documentTreeRepository.findOne.mockResolvedValue(null);

        const result = await seeder.seed();

        expect(result.treeStructure).toBeDefined();
        const tree = result.treeStructure as TreeNode;

        // Root level
        expect(tree.id).toBe('root');
        expect(tree.level).toBe(0);

        // Should have 5 main titles (Titulo I-V)
        expect(tree.children).toHaveLength(5);

        // Check Titulo I
        const tituloI = tree.children.find((c) => c.id === 'titulo-i');
        expect(tituloI).toBeDefined();
        expect(tituloI?.title).toContain('Disposicoes Preliminares');

        // Check Titulo II
        const tituloII = tree.children.find((c) => c.id === 'titulo-ii');
        expect(tituloII).toBeDefined();
        expect(tituloII?.title).toContain('Das Licitacoes');

        // Check Titulo III
        const tituloIII = tree.children.find((c) => c.id === 'titulo-iii');
        expect(tituloIII).toBeDefined();
        expect(tituloIII?.title).toContain('Contratos Administrativos');
      });

      it('should correctly count nodes in tree', async () => {
        documentTreeRepository.findOne.mockResolvedValue(null);

        const result = await seeder.seed();

        expect(result.nodeCount).toBeGreaterThan(20);
        expect(result.maxDepth).toBeGreaterThanOrEqual(3);
      });

      it('should set correct source URL', async () => {
        documentTreeRepository.findOne.mockResolvedValue(null);

        const result = await seeder.seed();

        expect(result.sourceUrl).toContain('planalto.gov.br');
        expect(result.sourceUrl).toContain('L14133');
      });
    });

    describe('unseed', () => {
      it('should delete seeded tree', async () => {
        documentTreeRepository.delete.mockResolvedValue({ affected: 1 } as any);

        await seeder.unseed();

        expect(documentTreeRepository.delete).toHaveBeenCalledWith({
          documentName: 'Lei 14.133/2021 - Nova Lei de Licitacoes',
        });
      });
    });
  });

  describe('Tree Structure Validation', () => {
    let treeStructure: TreeNode;

    beforeEach(async () => {
      documentTreeRepository.findOne.mockResolvedValue(null);
      const result = await seeder.seed();
      treeStructure = result.treeStructure as TreeNode;
    });

    it('should have articles as leaf nodes', () => {
      const findLeafNodes = (node: TreeNode): TreeNode[] => {
        if (!node.children || node.children.length === 0) {
          return [node];
        }
        return node.children.flatMap((c) => findLeafNodes(c));
      };

      const leafNodes = findLeafNodes(treeStructure);

      // Check that leaf nodes are articles
      const articleNodes = leafNodes.filter(
        (n) => n.id.startsWith('art-') || n.title.includes('Art.'),
      );
      expect(articleNodes.length).toBeGreaterThan(0);
    });

    it('should have capitulos as intermediate nodes', () => {
      const tituloII = treeStructure.children.find((c) => c.id === 'titulo-ii');
      expect(tituloII?.children?.length).toBeGreaterThanOrEqual(4);

      // Check for capitulos
      const capitulos =
        tituloII?.children?.filter((c) => c.id.includes('cap-')) || [];
      expect(capitulos.length).toBeGreaterThan(0);
    });

    it('should have content in all nodes', () => {
      const checkContent = (node: TreeNode): boolean => {
        if (!node.content || node.content.length === 0) {
          return false;
        }
        if (node.children) {
          return node.children.every((c) => checkContent(c));
        }
        return true;
      };

      expect(checkContent(treeStructure)).toBe(true);
    });

    it('should have correct level hierarchy', () => {
      const checkLevels = (node: TreeNode, expectedLevel: number): boolean => {
        if (node.level !== expectedLevel) {
          return false;
        }
        if (node.children) {
          return node.children.every((c) => checkLevels(c, expectedLevel + 1));
        }
        return true;
      };

      expect(checkLevels(treeStructure, 0)).toBe(true);
    });
  });

  describe('Tree Search - Query Tests', () => {
    let seededTree: DocumentTree;

    beforeEach(async () => {
      documentTreeRepository.findOne.mockImplementation(
        async (options: any) => {
          if (options?.where?.documentName) {
            return null; // First check for existing
          }
          return seededTree; // Return for search
        },
      );

      // Seed the tree first
      const result = await seeder.seed();
      seededTree = result;

      // Now mock findOne to return the seeded tree for search queries
      documentTreeRepository.findOne.mockResolvedValue(seededTree);
    });

    describe('Query: "Qual o limite para dispensa de licitacao?"', () => {
      it('should find Art. 74 about dispensa limits', async () => {
        openAIService.generateCompletion
          .mockResolvedValueOnce({
            content: JSON.stringify({
              decision: 'EXPLORE',
              selectedNodes: ['titulo-ii'],
              reasoning:
                'Dispensa de licitacao esta no Titulo II - Das Licitacoes',
              confidence: 0.9,
            }),
            tokens: 100,
            model: 'gpt-4.1-nano',
            finishReason: 'stop',
          })
          .mockResolvedValueOnce({
            content: JSON.stringify({
              decision: 'EXPLORE',
              selectedNodes: ['titulo-ii-cap-iii'],
              reasoning: 'Capitulo III trata de Dispensas e Inexigibilidades',
              confidence: 0.95,
            }),
            tokens: 100,
            model: 'gpt-4.1-nano',
            finishReason: 'stop',
          })
          .mockResolvedValueOnce({
            content: JSON.stringify({
              decision: 'FOUND',
              selectedNodes: ['art-74-dispensa'],
              reasoning:
                'Art. 74 especifica os limites para dispensa: R$ 100.000 para obras/engenharia, R$ 50.000 para outros',
              confidence: 0.98,
            }),
            tokens: 100,
            model: 'gpt-4.1-nano',
            finishReason: 'stop',
          });

        const result = await searchService.search(
          seededTree.id,
          'Qual o limite para dispensa de licitacao?',
        );

        expect(result.relevantNodes.length).toBeGreaterThan(0);

        // Check that found node mentions dispensa or values
        const foundNode = result.relevantNodes[0];
        const hasDispensaContent =
          foundNode.id.includes('dispensa') ||
          foundNode.content?.toLowerCase().includes('dispens') ||
          foundNode.content?.includes('100.000') ||
          foundNode.content?.includes('50.000');
        expect(hasDispensaContent).toBe(true);

        expect(result.confidence).toBeGreaterThan(0.5);
      });
    });

    describe('Query: "Quais sao as modalidades de licitacao?"', () => {
      it('should find Art. 28 about modalidades', async () => {
        openAIService.generateCompletion
          .mockResolvedValueOnce({
            content: JSON.stringify({
              decision: 'EXPLORE',
              selectedNodes: ['titulo-ii'],
              reasoning: 'Modalidades estao no Titulo II',
              confidence: 0.9,
            }),
            tokens: 100,
            model: 'gpt-4.1-nano',
            finishReason: 'stop',
          })
          .mockResolvedValueOnce({
            content: JSON.stringify({
              decision: 'EXPLORE',
              selectedNodes: ['titulo-ii-cap-ii'],
              reasoning: 'Capitulo II trata das Modalidades de Licitacao',
              confidence: 0.95,
            }),
            tokens: 100,
            model: 'gpt-4.1-nano',
            finishReason: 'stop',
          })
          .mockResolvedValueOnce({
            content: JSON.stringify({
              decision: 'FOUND',
              selectedNodes: ['art-28'],
              reasoning:
                'Art. 28 lista as modalidades: pregao, concorrencia, concurso, leilao, dialogo competitivo',
              confidence: 0.98,
            }),
            tokens: 100,
            model: 'gpt-4.1-nano',
            finishReason: 'stop',
          });

        const result = await searchService.search(
          seededTree.id,
          'Quais sao as modalidades de licitacao?',
        );

        expect(result.relevantNodes.length).toBeGreaterThan(0);

        // Check that found node mentions modalidades
        const foundNode = result.relevantNodes[0];
        const hasModalidadesContent =
          foundNode.id.includes('28') ||
          foundNode.title.toLowerCase().includes('modalidade') ||
          foundNode.content?.toLowerCase().includes('pregao') ||
          foundNode.content?.toLowerCase().includes('concorrencia');
        expect(hasModalidadesContent).toBe(true);
      });
    });

    describe('Query: "O que e pregao eletronico?"', () => {
      it('should find Art. 29 and Art. 30 about pregao', async () => {
        openAIService.generateCompletion
          .mockResolvedValueOnce({
            content: JSON.stringify({
              decision: 'EXPLORE',
              selectedNodes: ['titulo-ii'],
              reasoning: 'Pregao esta no Titulo II',
              confidence: 0.9,
            }),
            tokens: 100,
            model: 'gpt-4.1-nano',
            finishReason: 'stop',
          })
          .mockResolvedValueOnce({
            content: JSON.stringify({
              decision: 'EXPLORE',
              selectedNodes: ['titulo-ii-cap-ii'],
              reasoning: 'Pregao e uma modalidade de licitacao',
              confidence: 0.95,
            }),
            tokens: 100,
            model: 'gpt-4.1-nano',
            finishReason: 'stop',
          })
          .mockResolvedValueOnce({
            content: JSON.stringify({
              decision: 'FOUND',
              selectedNodes: ['art-29', 'art-30'],
              reasoning:
                'Art. 29 define pregao como modalidade obrigatoria para bens e servicos comuns. Art. 30 especifica que deve ser eletronico.',
              confidence: 0.97,
            }),
            tokens: 100,
            model: 'gpt-4.1-nano',
            finishReason: 'stop',
          });

        const result = await searchService.search(
          seededTree.id,
          'O que e pregao eletronico?',
        );

        expect(result.relevantNodes.length).toBeGreaterThan(0);

        // Check that found node mentions pregao
        const foundNode = result.relevantNodes[0];
        const hasPregaoContent =
          foundNode.id.includes('29') ||
          foundNode.id.includes('30') ||
          foundNode.title.toLowerCase().includes('pregao') ||
          foundNode.content?.toLowerCase().includes('pregao');
        expect(hasPregaoContent).toBe(true);
      });
    });

    describe('Query: "Quais documentos sao exigidos para habilitacao?"', () => {
      it('should find Art. 62 and Art. 63 about habilitacao', async () => {
        openAIService.generateCompletion
          .mockResolvedValueOnce({
            content: JSON.stringify({
              decision: 'EXPLORE',
              selectedNodes: ['titulo-ii'],
              reasoning: 'Habilitacao esta no Titulo II',
              confidence: 0.9,
            }),
            tokens: 100,
            model: 'gpt-4.1-nano',
            finishReason: 'stop',
          })
          .mockResolvedValueOnce({
            content: JSON.stringify({
              decision: 'EXPLORE',
              selectedNodes: ['titulo-ii-cap-iv'],
              reasoning: 'Capitulo IV trata de Habilitacao',
              confidence: 0.95,
            }),
            tokens: 100,
            model: 'gpt-4.1-nano',
            finishReason: 'stop',
          })
          .mockResolvedValueOnce({
            content: JSON.stringify({
              decision: 'FOUND',
              selectedNodes: ['art-62', 'art-63'],
              reasoning:
                'Art. 62 define tipos de habilitacao. Art. 63 detalha documentos de habilitacao juridica.',
              confidence: 0.96,
            }),
            tokens: 100,
            model: 'gpt-4.1-nano',
            finishReason: 'stop',
          });

        const result = await searchService.search(
          seededTree.id,
          'Quais documentos sao exigidos para habilitacao?',
        );

        expect(result.relevantNodes.length).toBeGreaterThan(0);

        // Check that found node mentions habilitacao
        const foundNode = result.relevantNodes[0];
        const hasHabilitacaoContent =
          foundNode.id.includes('62') ||
          foundNode.id.includes('63') ||
          foundNode.title.toLowerCase().includes('habilitacao') ||
          foundNode.content?.toLowerCase().includes('habilitacao');
        expect(hasHabilitacaoContent).toBe(true);
      });
    });
  });

  describe('Performance', () => {
    it('should complete search in under 2 seconds (with mocked LLM)', async () => {
      documentTreeRepository.findOne.mockResolvedValue(null);
      const seededResult = await seeder.seed();
      documentTreeRepository.findOne.mockResolvedValue(seededResult);

      // Fast mock responses
      openAIService.generateCompletion.mockResolvedValue({
        content: JSON.stringify({
          decision: 'FOUND',
          selectedNodes: ['titulo-i'],
          reasoning: 'Found',
          confidence: 0.9,
        }),
        tokens: 50,
        model: 'gpt-4.1-nano',
        finishReason: 'stop',
      });

      const startTime = Date.now();

      const result = await searchService.search(
        seededResult.id,
        'Test query for performance',
      );

      const endTime = Date.now();
      const elapsedMs = endTime - startTime;

      // Should complete in under 2000ms (2 seconds)
      expect(elapsedMs).toBeLessThan(2000);
      expect(result.searchTimeMs).toBeDefined();
    });
  });

  describe('Document Asset Validation', () => {
    it('should have lei-14133-2021.txt in assets folder', () => {
      const assetPath = path.join(
        __dirname,
        '..',
        'assets',
        'lei-14133-2021.txt',
      );
      expect(fs.existsSync(assetPath)).toBe(true);
    });

    it('should have lei text with key content', () => {
      const assetPath = path.join(
        __dirname,
        '..',
        'assets',
        'lei-14133-2021.txt',
      );
      const content = fs.readFileSync(assetPath, 'utf-8');

      // Check for key content
      expect(content).toContain('14.133');
      expect(content).toContain('licitacao');
      expect(content.toLowerCase()).toContain('pregao');
      expect(content.toLowerCase()).toContain('dispensa');
      expect(content.toLowerCase()).toContain('modalidade');
    });
  });
});
