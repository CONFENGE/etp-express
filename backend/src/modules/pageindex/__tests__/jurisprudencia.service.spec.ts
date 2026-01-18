import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotFoundException } from '@nestjs/common';
import { JurisprudenciaService } from '../services/jurisprudencia.service';
import { TreeSearchService } from '../services/tree-search.service';
import {
  DocumentTree,
  DocumentTreeStatus,
} from '../../../entities/document-tree.entity';
import { DocumentType } from '../dto/index-document.dto';
import { TreeNode } from '../interfaces/tree-node.interface';

/**
 * Unit tests for JurisprudenciaService
 *
 * Tests jurisprudence search and retrieval functionality.
 *
 * @see Issue #1581 - [JURIS-1540e] Criar API de busca por jurisprudencia
 */
describe('JurisprudenciaService', () => {
  let service: JurisprudenciaService;
  let documentTreeRepository: Repository<DocumentTree>;
  let treeSearchService: TreeSearchService;

  const mockTreeStructure: TreeNode = {
    id: 'jurisprudencia-root',
    title: 'Jurisprudencia - Tribunais de Contas',
    level: 0,
    content: 'Root content',
    children: [
      {
        id: 'tcesp',
        title: 'TCE-SP',
        level: 1,
        content: 'TCE-SP content',
        children: [
          {
            id: 'tcesp-licitacao',
            title: 'Licitacao',
            level: 2,
            content: 'Licitacao theme',
            children: [
              {
                id: 'tcesp-sumula-1',
                title: 'Sumula 1/2000',
                level: 3,
                content: '**Sumula 1/2000**\n**Tribunal:** TCE-SP\nContent...',
                children: [],
              },
              {
                id: 'tcesp-sumula-2',
                title: 'Sumula 2/2001',
                level: 3,
                content: '**Sumula 2/2001**\n**Tribunal:** TCE-SP\nContent...',
                children: [],
              },
            ],
          },
        ],
      },
      {
        id: 'tcu',
        title: 'TCU',
        level: 1,
        content: 'TCU content',
        children: [
          {
            id: 'tcu-lei-14133',
            title: 'Lei 14.133/2021',
            level: 2,
            content: 'Lei 14.133 theme',
            children: [
              {
                id: 'tcu-acordao-247',
                title: 'Acordao 247/2021',
                level: 3,
                content: '**Acordao 247/2021**\n**Tribunal:** TCU\nContent...',
                children: [],
              },
            ],
          },
        ],
      },
    ],
  };

  const mockDocumentTree: DocumentTree = {
    id: 'tree-uuid',
    documentName: 'Jurisprudencia TCE-SP e TCU',
    documentPath: null,
    sourceUrl: 'https://www.tce.sp.gov.br/jurisprudencia',
    documentType: DocumentType.JURISPRUDENCIA,
    status: DocumentTreeStatus.INDEXED,
    treeStructure: mockTreeStructure,
    metadata: null,
    error: null,
    nodeCount: 7,
    maxDepth: 3,
    processingTimeMs: 100,
    indexedAt: new Date('2026-01-18'),
    createdAt: new Date('2026-01-18'),
    updatedAt: new Date('2026-01-18'),
  };

  const mockTreeSearchService = {
    search: jest.fn(),
  };

  const mockDocumentTreeRepository = {
    findOne: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JurisprudenciaService,
        {
          provide: getRepositoryToken(DocumentTree),
          useValue: mockDocumentTreeRepository,
        },
        {
          provide: TreeSearchService,
          useValue: mockTreeSearchService,
        },
      ],
    }).compile();

    service = module.get<JurisprudenciaService>(JurisprudenciaService);
    documentTreeRepository = module.get<Repository<DocumentTree>>(
      getRepositoryToken(DocumentTree),
    );
    treeSearchService = module.get<TreeSearchService>(TreeSearchService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('initialization', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });
  });

  describe('searchByText', () => {
    it('should search using TreeSearchService', async () => {
      mockDocumentTreeRepository.findOne.mockResolvedValue(mockDocumentTree);
      mockTreeSearchService.search.mockResolvedValue({
        relevantNodes: [mockTreeStructure.children![1].children![0].children![0]],
        path: ['Root', 'TCU', 'Lei 14.133/2021', 'Acordao 247/2021'],
        confidence: 0.85,
        reasoning: 'Found relevant acordao',
        searchTimeMs: 150,
      });

      const result = await service.searchByText('ETP Lei 14133');

      expect(result.totalResults).toBe(1);
      expect(result.confidence).toBe(0.85);
      expect(result.items[0].id).toBe('tcu-acordao-247');
      expect(treeSearchService.search).toHaveBeenCalledWith(
        'tree-uuid',
        'ETP Lei 14133',
        expect.objectContaining({
          maxResults: 10,
          minConfidence: 0.3,
        }),
      );
    });

    it('should filter by tribunal', async () => {
      mockDocumentTreeRepository.findOne.mockResolvedValue(mockDocumentTree);
      mockTreeSearchService.search.mockResolvedValue({
        relevantNodes: [
          mockTreeStructure.children![0].children![0].children![0],
          mockTreeStructure.children![1].children![0].children![0],
        ],
        path: [],
        confidence: 0.8,
        reasoning: 'Found items',
        searchTimeMs: 100,
      });

      const result = await service.searchByText('licitacao', {
        tribunal: 'TCE-SP',
      });

      expect(result.items.every((item) => item.tribunal === 'TCE-SP')).toBe(true);
    });

    it('should throw NotFoundException when tree not found', async () => {
      mockDocumentTreeRepository.findOne.mockResolvedValue(null);

      await expect(service.searchByText('test')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('searchByTheme', () => {
    it('should find items under theme', async () => {
      mockDocumentTreeRepository.findOne.mockResolvedValue(mockDocumentTree);

      const result = await service.searchByTheme('Lei 14.133');

      expect(result.confidence).toBe(1.0);
      expect(result.items.length).toBeGreaterThan(0);
    });

    it('should filter by tribunal in theme search', async () => {
      mockDocumentTreeRepository.findOne.mockResolvedValue(mockDocumentTree);

      const result = await service.searchByTheme('Licitacao', {
        tribunal: 'TCE-SP',
      });

      expect(result.items.every((item) => item.tribunal === 'TCE-SP')).toBe(true);
    });
  });

  describe('getByTribunal', () => {
    it('should return TCU items', async () => {
      mockDocumentTreeRepository.findOne.mockResolvedValue(mockDocumentTree);

      const result = await service.getByTribunal('TCU');

      expect(result.items.every((item) => item.tribunal === 'TCU')).toBe(true);
    });

    it('should return TCE-SP items', async () => {
      mockDocumentTreeRepository.findOne.mockResolvedValue(mockDocumentTree);

      const result = await service.getByTribunal('TCE-SP');

      expect(result.items.every((item) => item.tribunal === 'TCE-SP')).toBe(true);
    });

    it('should apply pagination', async () => {
      mockDocumentTreeRepository.findOne.mockResolvedValue(mockDocumentTree);

      const result = await service.getByTribunal('TCE-SP', {
        limit: 1,
        offset: 0,
      });

      expect(result.items.length).toBeLessThanOrEqual(1);
    });
  });

  describe('listAll', () => {
    it('should list all jurisprudence', async () => {
      mockDocumentTreeRepository.findOne.mockResolvedValue(mockDocumentTree);

      const result = await service.listAll();

      expect(result.total).toBeGreaterThan(0);
      expect(result.documentTreeId).toBe('tree-uuid');
    });

    it('should apply pagination', async () => {
      mockDocumentTreeRepository.findOne.mockResolvedValue(mockDocumentTree);

      const result = await service.listAll({ limit: 2, offset: 0 });

      expect(result.items.length).toBeLessThanOrEqual(2);
    });
  });

  describe('getStats', () => {
    it('should return statistics', async () => {
      mockDocumentTreeRepository.findOne.mockResolvedValue(mockDocumentTree);

      const result = await service.getStats();

      expect(result.totalItems).toBeGreaterThan(0);
      expect(result.tcespCount).toBeGreaterThanOrEqual(0);
      expect(result.tcuCount).toBeGreaterThanOrEqual(0);
      expect(result.themes.length).toBeGreaterThan(0);
    });
  });

  describe('getById', () => {
    it('should return item by ID', async () => {
      mockDocumentTreeRepository.findOne.mockResolvedValue(mockDocumentTree);

      const result = await service.getById('tcu-acordao-247');

      expect(result).not.toBeNull();
      expect(result!.id).toBe('tcu-acordao-247');
      expect(result!.tribunal).toBe('TCU');
    });

    it('should return null for non-existent ID', async () => {
      mockDocumentTreeRepository.findOne.mockResolvedValue(mockDocumentTree);

      const result = await service.getById('non-existent-id');

      expect(result).toBeNull();
    });

    it('should return null for non-leaf node', async () => {
      mockDocumentTreeRepository.findOne.mockResolvedValue(mockDocumentTree);

      const result = await service.getById('tcesp-licitacao');

      expect(result).toBeNull();
    });
  });

  describe('getAvailableThemes', () => {
    it('should return theme list', () => {
      const themes = service.getAvailableThemes();

      expect(Array.isArray(themes)).toBe(true);
      expect(themes.length).toBeGreaterThan(0);
      expect(themes).toContain('Licitacao');
      expect(themes).toContain('Lei 14.133/2021');
    });
  });
});
