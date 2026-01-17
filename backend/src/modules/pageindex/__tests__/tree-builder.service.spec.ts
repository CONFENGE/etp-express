import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import {
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { TreeBuilderService } from '../services/tree-builder.service';
import { PageIndexService, IndexingResult } from '../pageindex.service';
import { DocumentTreeStatus } from '../../../entities/document-tree.entity';
import { DocumentType } from '../dto/index-document.dto';
import * as childProcess from 'child_process';
import * as fs from 'fs';

// Mock child_process
jest.mock('child_process');
jest.mock('fs');

/**
 * Unit tests for TreeBuilderService
 *
 * Tests the Python integration for PageIndex tree building.
 * Uses mocked child_process to simulate Python script execution.
 *
 * @see Issue #1552 - [PI-1538c] Implementar TreeBuilderService com integração Python
 * @see Issue #1538 - Create PageIndex module for hierarchical document indexing
 */
describe('TreeBuilderService', () => {
  let service: TreeBuilderService;
  let pageIndexService: jest.Mocked<PageIndexService>;

  const mockConfigService = {
    get: jest.fn((key: string) => {
      if (key === 'PYTHON_PATH') return 'python3';
      if (key === 'PAGEINDEX_TIMEOUT_MS') return 300000;
      return undefined;
    }),
  };

  const mockPageIndexService = {
    getTree: jest.fn(),
    updateTreeStatus: jest.fn(),
  };

  // Helper to create mock spawn process
  const createMockSpawn = (
    stdout: string,
    stderr = '',
    exitCode = 0,
    error?: Error,
  ) => {
    const mockStdout = {
      on: jest.fn((event, callback) => {
        if (event === 'data') {
          setImmediate(() => callback(Buffer.from(stdout)));
        }
      }),
    };

    const mockStderr = {
      on: jest.fn((event, callback) => {
        if (event === 'data' && stderr) {
          setImmediate(() => callback(Buffer.from(stderr)));
        }
      }),
    };

    const mockStdin = {
      write: jest.fn(),
      end: jest.fn(),
    };

    const mockProcess = {
      stdout: mockStdout,
      stderr: mockStderr,
      stdin: mockStdin,
      on: jest.fn((event, callback) => {
        if (event === 'close') {
          setImmediate(() => callback(exitCode));
        }
        if (event === 'error' && error) {
          setImmediate(() => callback(error));
        }
      }),
    };

    return mockProcess;
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TreeBuilderService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: PageIndexService,
          useValue: mockPageIndexService,
        },
      ],
    }).compile();

    service = module.get<TreeBuilderService>(TreeBuilderService);
    pageIndexService = module.get(PageIndexService);
  });

  describe('initialization', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });
  });

  describe('buildTree', () => {
    const mockPageIndexResponse = {
      success: true,
      data: {
        doc_name: 'test.pdf',
        doc_description: 'Test document',
        structure: [
          {
            id: 'node-1',
            title: 'Chapter 1',
            level: 0,
            pageNumbers: [1, 2, 3],
            children: [
              {
                id: 'node-2',
                title: 'Section 1.1',
                level: 1,
                pageNumbers: [1, 2],
                children: [],
              },
            ],
          },
        ],
        metadata: {
          node_count: 2,
          max_depth: 1,
          processing_time_seconds: 1.5,
        },
      },
    };

    it('should throw BadRequestException if document not found', async () => {
      (fs.existsSync as jest.Mock).mockReturnValue(false);

      await expect(service.buildTree('/non/existent/path.pdf')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should build tree from PDF document', async () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);

      const mockProcess = createMockSpawn(
        JSON.stringify(mockPageIndexResponse),
      );
      (childProcess.spawn as jest.Mock).mockReturnValue(mockProcess);

      const result = await service.buildTree('/path/to/test.pdf');

      expect(result.tree).toBeDefined();
      expect(result.tree.title).toBe('test.pdf');
      expect(result.nodeCount).toBe(2);
      expect(result.maxDepth).toBe(1);
      expect(result.processingTimeMs).toBe(1500);
    });

    it('should handle Python script errors', async () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);

      const mockProcess = createMockSpawn('', 'Python error occurred', 1);
      (childProcess.spawn as jest.Mock).mockReturnValue(mockProcess);

      await expect(service.buildTree('/path/to/test.pdf')).rejects.toThrow(
        InternalServerErrorException,
      );
    });

    it('should handle spawn errors', async () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);

      const mockProcess = createMockSpawn('', '', 0, new Error('Spawn failed'));
      // Override the 'on' to trigger error event
      mockProcess.on = jest.fn((event, callback) => {
        if (event === 'error') {
          setImmediate(() => callback(new Error('Spawn failed')));
        }
      });
      (childProcess.spawn as jest.Mock).mockReturnValue(mockProcess);

      await expect(service.buildTree('/path/to/test.pdf')).rejects.toThrow(
        InternalServerErrorException,
      );
    });

    it('should handle invalid JSON response', async () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);

      const mockProcess = createMockSpawn('not valid json');
      (childProcess.spawn as jest.Mock).mockReturnValue(mockProcess);

      await expect(service.buildTree('/path/to/test.pdf')).rejects.toThrow(
        InternalServerErrorException,
      );
    });

    it('should handle PageIndex error response', async () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);

      const errorResponse = {
        success: false,
        error: {
          error_type: 'PROCESSING_ERROR',
          message: 'Failed to process document',
        },
      };

      const mockProcess = createMockSpawn(JSON.stringify(errorResponse));
      (childProcess.spawn as jest.Mock).mockReturnValue(mockProcess);

      await expect(service.buildTree('/path/to/test.pdf')).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });

  describe('buildTreeFromText', () => {
    const mockTextResponse = {
      success: true,
      data: {
        doc_name: 'document.txt',
        doc_description: 'Plain text document',
        structure: [
          {
            id: 'node-1',
            title: 'Root',
            level: 0,
            content: 'Sample content',
            children: [],
          },
        ],
        metadata: {
          node_count: 1,
          max_depth: 0,
          processing_time_seconds: 0.5,
        },
      },
    };

    it('should throw BadRequestException for empty text', async () => {
      await expect(service.buildTreeFromText('', 'test.txt')).rejects.toThrow(
        BadRequestException,
      );

      await expect(
        service.buildTreeFromText('   ', 'test.txt'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should build tree from text content', async () => {
      const mockProcess = createMockSpawn(JSON.stringify(mockTextResponse));
      (childProcess.spawn as jest.Mock).mockReturnValue(mockProcess);

      const result = await service.buildTreeFromText(
        'Sample document text content',
        'document.txt',
      );

      expect(result.tree).toBeDefined();
      expect(result.documentName).toBe('document.txt');
      expect(result.nodeCount).toBe(1);
    });
  });

  describe('processDocument', () => {
    const mockTree: IndexingResult = {
      treeId: 'tree-123',
      documentName: 'Test Document',
      documentType: DocumentType.LEGISLATION,
      status: DocumentTreeStatus.PENDING,
      tree: null,
      nodeCount: 0,
      maxDepth: 0,
    };

    const mockProcessedTree: IndexingResult = {
      ...mockTree,
      status: DocumentTreeStatus.INDEXED,
      nodeCount: 5,
      maxDepth: 2,
    };

    beforeEach(() => {
      mockPageIndexService.getTree.mockResolvedValue(mockTree);
      mockPageIndexService.updateTreeStatus.mockResolvedValue(
        mockProcessedTree,
      );
    });

    it('should throw BadRequestException if tree not found', async () => {
      mockPageIndexService.getTree.mockResolvedValue(null);

      await expect(service.processDocument('non-existent')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException if no input provided', async () => {
      await expect(service.processDocument('tree-123')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should process document from text', async () => {
      const mockResponse = {
        success: true,
        data: {
          doc_name: 'Test Document',
          structure: [{ id: 'node-1', title: 'Root', level: 0, children: [] }],
          metadata: {
            node_count: 1,
            max_depth: 0,
            processing_time_seconds: 0.5,
          },
        },
      };

      const mockProcess = createMockSpawn(JSON.stringify(mockResponse));
      (childProcess.spawn as jest.Mock).mockReturnValue(mockProcess);

      const result = await service.processDocument(
        'tree-123',
        undefined,
        'Document text content',
      );

      expect(mockPageIndexService.updateTreeStatus).toHaveBeenCalledWith(
        'tree-123',
        DocumentTreeStatus.PROCESSING,
      );

      expect(result.status).toBe(DocumentTreeStatus.INDEXED);
    });

    it('should process document from path', async () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);

      const mockResponse = {
        success: true,
        data: {
          doc_name: 'test.pdf',
          structure: [{ id: 'node-1', title: 'Root', level: 0, children: [] }],
          metadata: {
            node_count: 1,
            max_depth: 0,
            processing_time_seconds: 0.5,
          },
        },
      };

      const mockProcess = createMockSpawn(JSON.stringify(mockResponse));
      (childProcess.spawn as jest.Mock).mockReturnValue(mockProcess);

      const result = await service.processDocument(
        'tree-123',
        '/path/to/test.pdf',
      );

      expect(result.status).toBe(DocumentTreeStatus.INDEXED);
    });

    it('should set error status on failure', async () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);

      const errorResult: IndexingResult = {
        ...mockTree,
        status: DocumentTreeStatus.ERROR,
        error: 'Processing failed',
      };
      mockPageIndexService.updateTreeStatus
        .mockResolvedValueOnce(mockTree) // First call: set PROCESSING
        .mockResolvedValueOnce(errorResult); // Second call: set ERROR

      const mockProcess = createMockSpawn('', 'Python error', 1);
      (childProcess.spawn as jest.Mock).mockReturnValue(mockProcess);

      const result = await service.processDocument(
        'tree-123',
        '/path/to/test.pdf',
      );

      expect(mockPageIndexService.updateTreeStatus).toHaveBeenLastCalledWith(
        'tree-123',
        DocumentTreeStatus.ERROR,
        expect.objectContaining({
          error: expect.any(String),
        }),
      );

      expect(result.status).toBe(DocumentTreeStatus.ERROR);
    });
  });

  describe('checkHealth', () => {
    it('should return healthy status when Python and PageIndex are available', async () => {
      const healthResponse = {
        success: true,
        data: {
          status: 'healthy',
          pageindex_available: true,
          python_version: '3.11.0',
        },
      };

      const mockProcess = createMockSpawn(JSON.stringify(healthResponse));
      (childProcess.spawn as jest.Mock).mockReturnValue(mockProcess);

      const result = await service.checkHealth();

      expect(result.healthy).toBe(true);
      expect(result.pythonAvailable).toBe(true);
      expect(result.pageindexAvailable).toBe(true);
      expect(result.pythonVersion).toBe('3.11.0');
    });

    it('should return unhealthy status when PageIndex is not available', async () => {
      const healthResponse = {
        success: true,
        data: {
          status: 'healthy',
          pageindex_available: false,
          python_version: '3.11.0',
        },
      };

      const mockProcess = createMockSpawn(JSON.stringify(healthResponse));
      (childProcess.spawn as jest.Mock).mockReturnValue(mockProcess);

      const result = await service.checkHealth();

      expect(result.healthy).toBe(true);
      expect(result.pythonAvailable).toBe(true);
      expect(result.pageindexAvailable).toBe(false);
    });

    it('should return unhealthy status when Python is not available', async () => {
      const mockProcess = createMockSpawn(
        '',
        '',
        0,
        new Error('Python not found'),
      );
      mockProcess.on = jest.fn((event, callback) => {
        if (event === 'error') {
          setImmediate(() => callback(new Error('Python not found')));
        }
      });
      (childProcess.spawn as jest.Mock).mockReturnValue(mockProcess);

      const result = await service.checkHealth();

      expect(result.healthy).toBe(false);
      expect(result.pythonAvailable).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('tree node counting', () => {
    it('should correctly count nodes in nested structure', async () => {
      const nestedResponse = {
        success: true,
        data: {
          doc_name: 'nested.pdf',
          structure: [
            {
              id: 'node-1',
              title: 'Chapter 1',
              level: 0,
              children: [
                {
                  id: 'node-2',
                  title: 'Section 1.1',
                  level: 1,
                  children: [
                    {
                      id: 'node-3',
                      title: 'Subsection 1.1.1',
                      level: 2,
                      children: [],
                    },
                  ],
                },
                {
                  id: 'node-4',
                  title: 'Section 1.2',
                  level: 1,
                  children: [],
                },
              ],
            },
            {
              id: 'node-5',
              title: 'Chapter 2',
              level: 0,
              children: [],
            },
          ],
          metadata: {
            node_count: 5,
            max_depth: 2,
            processing_time_seconds: 2.0,
          },
        },
      };

      (fs.existsSync as jest.Mock).mockReturnValue(true);
      const mockProcess = createMockSpawn(JSON.stringify(nestedResponse));
      (childProcess.spawn as jest.Mock).mockReturnValue(mockProcess);

      const result = await service.buildTree('/path/to/nested.pdf');

      expect(result.nodeCount).toBe(5);
      expect(result.maxDepth).toBe(2);
    });
  });
});
