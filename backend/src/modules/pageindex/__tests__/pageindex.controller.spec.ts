import { Test, TestingModule } from '@nestjs/testing';
import { NotImplementedException } from '@nestjs/common';
import { PageIndexController } from '../pageindex.controller';
import { PageIndexService } from '../pageindex.service';
import { TreeBuilderService } from '../services/tree-builder.service';
import { IndexDocumentDto, DocumentType } from '../dto/index-document.dto';
import { SearchTreeDto } from '../dto/search-tree.dto';
import { DocumentTreeStatus } from '../../../entities/document-tree.entity';

/**
 * Unit tests for PageIndexController
 *
 * Tests REST API endpoints for PageIndex module.
 *
 * @see Issue #1550 - [PI-1538a] Setup infraestrutura módulo PageIndex
 * @see Issue #1552 - [PI-1538c] Implementar TreeBuilderService
 * @see Issue #1538 - Create PageIndex module for hierarchical document indexing
 */
describe('PageIndexController', () => {
  let controller: PageIndexController;
  let service: PageIndexService;
  let treeBuilderService: TreeBuilderService;

  const mockPageIndexService = {
    indexDocument: jest.fn(),
    searchTree: jest.fn(),
    getTree: jest.fn(),
    listTrees: jest.fn(),
    deleteTree: jest.fn(),
    getStats: jest.fn(),
  };

  const mockTreeBuilderService = {
    buildTree: jest.fn(),
    buildTreeFromText: jest.fn(),
    processDocument: jest.fn(),
    checkHealth: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PageIndexController],
      providers: [
        {
          provide: PageIndexService,
          useValue: mockPageIndexService,
        },
        {
          provide: TreeBuilderService,
          useValue: mockTreeBuilderService,
        },
      ],
    }).compile();

    controller = module.get<PageIndexController>(PageIndexController);
    service = module.get<PageIndexService>(PageIndexService);
    treeBuilderService = module.get<TreeBuilderService>(TreeBuilderService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('initialization', () => {
    it('should be defined', () => {
      expect(controller).toBeDefined();
    });
  });

  describe('POST /pageindex/index', () => {
    it('should call indexDocument with dto', async () => {
      const dto: IndexDocumentDto = {
        documentName: 'Lei 14.133/2021',
        documentType: DocumentType.LEGISLATION,
        sourceUrl: 'https://planalto.gov.br/lei14133',
      };

      mockPageIndexService.indexDocument.mockRejectedValue(
        new NotImplementedException('Not implemented'),
      );

      await expect(controller.indexDocument(dto)).rejects.toThrow(
        NotImplementedException,
      );

      expect(service.indexDocument).toHaveBeenCalledWith(dto);
    });
  });

  describe('POST /pageindex/:id/search', () => {
    it('should call searchTree with id and dto', async () => {
      const treeId = '550e8400-e29b-41d4-a716-446655440000';
      const dto: SearchTreeDto = {
        query: 'Qual o limite para dispensa?',
        maxResults: 5,
        maxDepth: 3,
      };

      mockPageIndexService.searchTree.mockRejectedValue(
        new NotImplementedException('Not implemented'),
      );

      await expect(controller.searchTree(treeId, dto)).rejects.toThrow(
        NotImplementedException,
      );

      expect(service.searchTree).toHaveBeenCalledWith(treeId, dto.query, {
        maxDepth: dto.maxDepth,
        maxResults: dto.maxResults,
        minConfidence: undefined,
        includeContent: undefined,
      });
    });
  });

  describe('GET /pageindex', () => {
    it('should call listTrees', async () => {
      mockPageIndexService.listTrees.mockRejectedValue(
        new NotImplementedException('Not implemented'),
      );

      await expect(controller.listTrees()).rejects.toThrow(
        NotImplementedException,
      );

      expect(service.listTrees).toHaveBeenCalled();
    });
  });

  describe('GET /pageindex/stats', () => {
    it('should return statistics', async () => {
      const mockStats = {
        totalDocuments: 0,
        byStatus: {
          [DocumentTreeStatus.PENDING]: 0,
          [DocumentTreeStatus.PROCESSING]: 0,
          [DocumentTreeStatus.INDEXED]: 0,
          [DocumentTreeStatus.ERROR]: 0,
        },
        byType: {
          [DocumentType.LEGISLATION]: 0,
          [DocumentType.CONTRACT]: 0,
          [DocumentType.EDITAL]: 0,
          [DocumentType.TERMO_REFERENCIA]: 0,
          [DocumentType.ETP]: 0,
          [DocumentType.OTHER]: 0,
        },
      };

      mockPageIndexService.getStats.mockResolvedValue(mockStats);

      const result = await controller.getStats();

      expect(result).toEqual(mockStats);
      expect(service.getStats).toHaveBeenCalled();
    });
  });

  describe('GET /pageindex/:id', () => {
    it('should call getTree with id', async () => {
      const treeId = '550e8400-e29b-41d4-a716-446655440000';

      mockPageIndexService.getTree.mockRejectedValue(
        new NotImplementedException('Not implemented'),
      );

      await expect(controller.getTree(treeId)).rejects.toThrow(
        NotImplementedException,
      );

      expect(service.getTree).toHaveBeenCalledWith(treeId);
    });
  });

  describe('DELETE /pageindex/:id', () => {
    it('should call deleteTree with id', async () => {
      const treeId = '550e8400-e29b-41d4-a716-446655440000';

      mockPageIndexService.deleteTree.mockRejectedValue(
        new NotImplementedException('Not implemented'),
      );

      await expect(controller.deleteTree(treeId)).rejects.toThrow(
        NotImplementedException,
      );

      expect(service.deleteTree).toHaveBeenCalledWith(treeId);
    });
  });

  describe('POST /pageindex/:id/process', () => {
    it('should call processDocument with id and body', async () => {
      const treeId = '550e8400-e29b-41d4-a716-446655440000';
      const body = { text: 'Document content' };

      const mockResult = {
        treeId,
        documentName: 'Test',
        documentType: DocumentType.LEGISLATION,
        status: DocumentTreeStatus.INDEXED,
        nodeCount: 5,
        maxDepth: 2,
      };

      mockTreeBuilderService.processDocument.mockResolvedValue(mockResult);

      const result = await controller.processDocument(treeId, body);

      expect(result).toEqual(mockResult);
      expect(treeBuilderService.processDocument).toHaveBeenCalledWith(
        treeId,
        undefined,
        body.text,
      );
    });

    it('should call processDocument with documentPath', async () => {
      const treeId = '550e8400-e29b-41d4-a716-446655440000';
      const body = { documentPath: '/path/to/doc.pdf' };

      mockTreeBuilderService.processDocument.mockResolvedValue({
        treeId,
        status: DocumentTreeStatus.INDEXED,
      });

      await controller.processDocument(treeId, body);

      expect(treeBuilderService.processDocument).toHaveBeenCalledWith(
        treeId,
        body.documentPath,
        undefined,
      );
    });
  });

  describe('GET /pageindex/health', () => {
    it('should return health status', async () => {
      const mockHealth = {
        healthy: true,
        pythonAvailable: true,
        pageindexAvailable: true,
        pythonVersion: '3.11.0',
      };

      mockTreeBuilderService.checkHealth.mockResolvedValue(mockHealth);

      const result = await controller.healthCheck();

      expect(result).toEqual(mockHealth);
      expect(treeBuilderService.checkHealth).toHaveBeenCalled();
    });

    it('should return unhealthy status when Python unavailable', async () => {
      const mockHealth = {
        healthy: false,
        pythonAvailable: false,
        pageindexAvailable: false,
        error: 'Python not found',
      };

      mockTreeBuilderService.checkHealth.mockResolvedValue(mockHealth);

      const result = await controller.healthCheck();

      expect(result.healthy).toBe(false);
      expect(result.error).toBe('Python not found');
    });
  });
});
