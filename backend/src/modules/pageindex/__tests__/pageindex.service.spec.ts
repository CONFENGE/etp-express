import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { NotFoundException } from '@nestjs/common';
import { PageIndexService } from '../pageindex.service';
import { TreeSearchService } from '../services/tree-search.service';
import { IndexDocumentDto, DocumentType } from '../dto/index-document.dto';
import {
  DocumentTree,
  DocumentTreeStatus,
} from '../../../entities/document-tree.entity';
import { TreeNode } from '../interfaces/tree-node.interface';

/**
 * Unit tests for PageIndexService
 *
 * Tests CRUD operations for DocumentTree entity and
 * PageIndex module structure.
 *
 * @see Issue #1551 - [PI-1538b] Criar DocumentTree entity e migrations
 * @see Issue #1538 - Create PageIndex module for hierarchical document indexing
 */
describe('PageIndexService', () => {
  let service: PageIndexService;
  let repository: Repository<DocumentTree>;

  const mockQueryBuilder = {
    select: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    groupBy: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    getMany: jest.fn().mockResolvedValue([]),
    getRawMany: jest.fn().mockResolvedValue([]),
  };

  const mockRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
    createQueryBuilder: jest.fn(() => mockQueryBuilder),
  };

  const mockTreeSearchService = {
    search: jest.fn(),
    searchMultipleTrees: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PageIndexService,
        {
          provide: getRepositoryToken(DocumentTree),
          useValue: mockRepository,
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'OPENAI_API_KEY') return 'test-api-key';
              return undefined;
            }),
          },
        },
        {
          provide: TreeSearchService,
          useValue: mockTreeSearchService,
        },
      ],
    }).compile();

    service = module.get<PageIndexService>(PageIndexService);
    repository = module.get<Repository<DocumentTree>>(
      getRepositoryToken(DocumentTree),
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('initialization', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });
  });

  describe('createDocumentTree', () => {
    const mockDto: IndexDocumentDto = {
      documentName: 'Lei 14.133/2021',
      documentType: DocumentType.LEGISLATION,
      sourceUrl: 'https://planalto.gov.br/lei14133',
    };

    const mockTree: DocumentTree = {
      id: 'tree-123',
      documentName: 'Lei 14.133/2021',
      documentPath: null,
      sourceUrl: 'https://planalto.gov.br/lei14133',
      documentType: DocumentType.LEGISLATION,
      status: DocumentTreeStatus.PENDING,
      treeStructure: null,
      metadata: null,
      error: null,
      nodeCount: 0,
      maxDepth: 0,
      processingTimeMs: null,
      indexedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('should create a document tree with pending status', async () => {
      mockRepository.create.mockReturnValue(mockTree);
      mockRepository.save.mockResolvedValue(mockTree);

      const result = await service.createDocumentTree(mockDto);

      expect(mockRepository.create).toHaveBeenCalledWith({
        documentName: mockDto.documentName,
        documentPath: null,
        sourceUrl: mockDto.sourceUrl,
        documentType: mockDto.documentType,
        status: DocumentTreeStatus.PENDING,
        treeStructure: null,
        metadata: null,
        nodeCount: 0,
        maxDepth: 0,
      });

      expect(result.treeId).toBe('tree-123');
      expect(result.status).toBe(DocumentTreeStatus.PENDING);
      expect(result.documentName).toBe('Lei 14.133/2021');
    });

    it('should default to OTHER document type', async () => {
      const dtoWithoutType: IndexDocumentDto = {
        documentName: 'Test Document',
      };

      const treeWithOtherType = {
        ...mockTree,
        documentType: DocumentType.OTHER,
        documentName: 'Test Document',
        sourceUrl: null,
      };

      mockRepository.create.mockReturnValue(treeWithOtherType);
      mockRepository.save.mockResolvedValue(treeWithOtherType);

      const result = await service.createDocumentTree(dtoWithoutType);

      expect(mockRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          documentType: DocumentType.OTHER,
        }),
      );
      expect(result.documentType).toBe(DocumentType.OTHER);
    });
  });

  describe('indexDocument', () => {
    it('should create a pending document tree entry', async () => {
      const dto: IndexDocumentDto = {
        documentName: 'Test Document',
        documentType: DocumentType.CONTRACT,
      };

      const mockTree: DocumentTree = {
        id: 'tree-456',
        documentName: 'Test Document',
        documentPath: null,
        sourceUrl: null,
        documentType: DocumentType.CONTRACT,
        status: DocumentTreeStatus.PENDING,
        treeStructure: null,
        metadata: null,
        error: null,
        nodeCount: 0,
        maxDepth: 0,
        processingTimeMs: null,
        indexedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockRepository.create.mockReturnValue(mockTree);
      mockRepository.save.mockResolvedValue(mockTree);

      const result = await service.indexDocument(dto);

      expect(result.treeId).toBe('tree-456');
      expect(result.status).toBe(DocumentTreeStatus.PENDING);
    });
  });

  describe('getTree', () => {
    it('should return tree if found', async () => {
      const mockTree: DocumentTree = {
        id: 'tree-123',
        documentName: 'Test Document',
        documentPath: null,
        sourceUrl: null,
        documentType: DocumentType.LEGISLATION,
        status: DocumentTreeStatus.INDEXED,
        treeStructure: { id: 'root', title: 'Root', level: 0, children: [] },
        metadata: null,
        error: null,
        nodeCount: 1,
        maxDepth: 0,
        processingTimeMs: 100,
        indexedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockRepository.findOne.mockResolvedValue(mockTree);

      const result = await service.getTree('tree-123');

      expect(result).not.toBeNull();
      expect(result!.treeId).toBe('tree-123');
      expect(result!.status).toBe(DocumentTreeStatus.INDEXED);
    });

    it('should return null if not found', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      const result = await service.getTree('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('listTrees', () => {
    it('should return list of trees', async () => {
      const mockTrees: DocumentTree[] = [
        {
          id: 'tree-1',
          documentName: 'Doc 1',
          documentPath: null,
          sourceUrl: null,
          documentType: DocumentType.LEGISLATION,
          status: DocumentTreeStatus.INDEXED,
          treeStructure: null,
          metadata: null,
          error: null,
          nodeCount: 0,
          maxDepth: 0,
          processingTimeMs: null,
          indexedAt: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'tree-2',
          documentName: 'Doc 2',
          documentPath: null,
          sourceUrl: null,
          documentType: DocumentType.CONTRACT,
          status: DocumentTreeStatus.PENDING,
          treeStructure: null,
          metadata: null,
          error: null,
          nodeCount: 0,
          maxDepth: 0,
          processingTimeMs: null,
          indexedAt: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockQueryBuilder.getMany.mockResolvedValue(mockTrees);

      const result = await service.listTrees();

      expect(result).toHaveLength(2);
      expect(result[0].treeId).toBe('tree-1');
      expect(result[1].treeId).toBe('tree-2');
    });

    it('should filter by status', async () => {
      mockQueryBuilder.getMany.mockResolvedValue([]);

      await service.listTrees({ status: DocumentTreeStatus.INDEXED });

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'tree.status = :status',
        { status: DocumentTreeStatus.INDEXED },
      );
    });

    it('should filter by document type', async () => {
      mockQueryBuilder.getMany.mockResolvedValue([]);

      await service.listTrees({ documentType: DocumentType.LEGISLATION });

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'tree.documentType = :documentType',
        { documentType: DocumentType.LEGISLATION },
      );
    });

    it('should apply pagination', async () => {
      mockQueryBuilder.getMany.mockResolvedValue([]);

      await service.listTrees({ limit: 10, offset: 20 });

      expect(mockQueryBuilder.take).toHaveBeenCalledWith(10);
      expect(mockQueryBuilder.skip).toHaveBeenCalledWith(20);
    });
  });

  describe('deleteTree', () => {
    it('should delete tree if found', async () => {
      mockRepository.delete.mockResolvedValue({ affected: 1 });

      await expect(service.deleteTree('tree-123')).resolves.not.toThrow();

      expect(mockRepository.delete).toHaveBeenCalledWith('tree-123');
    });

    it('should throw NotFoundException if not found', async () => {
      mockRepository.delete.mockResolvedValue({ affected: 0 });

      await expect(service.deleteTree('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('updateTreeStatus', () => {
    it('should update status', async () => {
      const mockTree: DocumentTree = {
        id: 'tree-123',
        documentName: 'Test',
        documentPath: null,
        sourceUrl: null,
        documentType: DocumentType.LEGISLATION,
        status: DocumentTreeStatus.PENDING,
        treeStructure: null,
        metadata: null,
        error: null,
        nodeCount: 0,
        maxDepth: 0,
        processingTimeMs: null,
        indexedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockRepository.findOne.mockResolvedValue({ ...mockTree });
      mockRepository.save.mockResolvedValue({
        ...mockTree,
        status: DocumentTreeStatus.PROCESSING,
      });

      const result = await service.updateTreeStatus(
        'tree-123',
        DocumentTreeStatus.PROCESSING,
      );

      expect(result.status).toBe(DocumentTreeStatus.PROCESSING);
    });

    it('should update with additional data', async () => {
      const mockTree: DocumentTree = {
        id: 'tree-123',
        documentName: 'Test',
        documentPath: null,
        sourceUrl: null,
        documentType: DocumentType.LEGISLATION,
        status: DocumentTreeStatus.PROCESSING,
        treeStructure: null,
        metadata: null,
        error: null,
        nodeCount: 0,
        maxDepth: 0,
        processingTimeMs: null,
        indexedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const treeStructure: TreeNode = {
        id: 'root',
        title: 'Root',
        level: 0,
        children: [],
      };

      mockRepository.findOne.mockResolvedValue({ ...mockTree });
      mockRepository.save.mockImplementation((tree) =>
        Promise.resolve({ ...tree }),
      );

      const result = await service.updateTreeStatus(
        'tree-123',
        DocumentTreeStatus.INDEXED,
        {
          treeStructure,
          nodeCount: 5,
          maxDepth: 3,
          processingTimeMs: 1500,
          indexedAt: new Date(),
        },
      );

      expect(result.status).toBe(DocumentTreeStatus.INDEXED);
      expect(result.nodeCount).toBe(5);
      expect(result.maxDepth).toBe(3);
    });

    it('should throw NotFoundException if tree not found', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(
        service.updateTreeStatus('non-existent', DocumentTreeStatus.INDEXED),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('searchTree', () => {
    it('should delegate to TreeSearchService', async () => {
      const mockSearchResult = {
        relevantNodes: [{ id: 'node-1', title: 'Test', level: 0, children: [] }],
        path: ['Root', 'Test'],
        confidence: 0.9,
        reasoning: 'Found relevant section',
        searchTimeMs: 500,
      };

      mockTreeSearchService.search.mockResolvedValue(mockSearchResult);

      const result = await service.searchTree('tree-123', 'test query');

      expect(mockTreeSearchService.search).toHaveBeenCalledWith(
        'tree-123',
        'test query',
        undefined,
      );
      expect(result).toEqual(mockSearchResult);
    });

    it('should pass search options to TreeSearchService', async () => {
      const mockSearchResult = {
        relevantNodes: [],
        path: [],
        confidence: 0,
        reasoning: 'Not found',
        searchTimeMs: 100,
      };

      mockTreeSearchService.search.mockResolvedValue(mockSearchResult);

      const options = { maxDepth: 3, maxResults: 2, minConfidence: 0.7 };
      await service.searchTree('tree-123', 'test query', options);

      expect(mockTreeSearchService.search).toHaveBeenCalledWith(
        'tree-123',
        'test query',
        options,
      );
    });

    it('should propagate NotFoundException from TreeSearchService', async () => {
      mockTreeSearchService.search.mockRejectedValue(
        new NotFoundException('Document tree not found'),
      );

      await expect(service.searchTree('non-existent', 'query')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should propagate Error from TreeSearchService for unindexed tree', async () => {
      mockTreeSearchService.search.mockRejectedValue(
        new Error('Document tree is not indexed yet'),
      );

      await expect(service.searchTree('tree-123', 'query')).rejects.toThrow(
        'not indexed yet',
      );
    });
  });

  describe('getStats', () => {
    it('should return statistics', async () => {
      mockRepository.count.mockResolvedValue(10);
      mockQueryBuilder.getRawMany
        .mockResolvedValueOnce([
          { status: 'pending', count: '3' },
          { status: 'indexed', count: '5' },
          { status: 'error', count: '2' },
        ])
        .mockResolvedValueOnce([
          { type: 'legislation', count: '4' },
          { type: 'contract', count: '3' },
          { type: 'other', count: '3' },
        ]);

      const stats = await service.getStats();

      expect(stats.totalDocuments).toBe(10);
      expect(stats.byStatus[DocumentTreeStatus.PENDING]).toBe(3);
      expect(stats.byStatus[DocumentTreeStatus.INDEXED]).toBe(5);
      expect(stats.byStatus[DocumentTreeStatus.ERROR]).toBe(2);
      expect(stats.byType[DocumentType.LEGISLATION]).toBe(4);
      expect(stats.byType[DocumentType.CONTRACT]).toBe(3);
    });

    it('should return zeros for empty database', async () => {
      mockRepository.count.mockResolvedValue(0);
      mockQueryBuilder.getRawMany
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      const stats = await service.getStats();

      expect(stats.totalDocuments).toBe(0);
      expect(stats.byStatus[DocumentTreeStatus.PENDING]).toBe(0);
      expect(stats.byStatus[DocumentTreeStatus.INDEXED]).toBe(0);
    });
  });
});
