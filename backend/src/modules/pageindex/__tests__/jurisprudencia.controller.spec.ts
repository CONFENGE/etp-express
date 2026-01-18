import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { JurisprudenciaController } from '../jurisprudencia.controller';
import {
  JurisprudenciaService,
  JurisprudenciaSearchResult,
  JurisprudenciaListResult,
  JurisprudenciaStats,
  JurisprudenciaItem,
} from '../services/jurisprudencia.service';
import {
  JurisprudenciaSearchDto,
  JurisprudenciaThemeSearchDto,
} from '../dto/jurisprudencia-search.dto';

/**
 * Unit tests for JurisprudenciaController
 *
 * Tests REST API endpoints for jurisprudence search and retrieval.
 *
 * @see Issue #1581 - [JURIS-1540e] Criar API de busca por jurisprudencia
 */
describe('JurisprudenciaController', () => {
  let controller: JurisprudenciaController;
  let service: JurisprudenciaService;

  const mockJurisprudenciaService = {
    searchByText: jest.fn(),
    searchByTheme: jest.fn(),
    getByTribunal: jest.fn(),
    listAll: jest.fn(),
    getStats: jest.fn(),
    getAvailableThemes: jest.fn(),
    getById: jest.fn(),
  };

  const mockSearchResult: JurisprudenciaSearchResult = {
    query: 'dispensa licitacao',
    totalResults: 2,
    confidence: 0.85,
    reasoning: 'Found relevant sumulas on dispensa',
    searchTimeMs: 150,
    items: [
      {
        id: 'tcu-acordao-247',
        title: 'Acordao 247/2021',
        tribunal: 'TCU',
        content: 'Content about dispensa...',
      },
      {
        id: 'tcesp-sumula-1',
        title: 'Sumula 1/2000',
        tribunal: 'TCE-SP',
        content: 'Content about licitacao...',
      },
    ],
  };

  const mockListResult: JurisprudenciaListResult = {
    total: 107,
    items: [
      {
        id: 'tcu-acordao-247',
        title: 'Acordao 247/2021',
        tribunal: 'TCU',
      },
    ],
    documentTreeId: 'tree-uuid',
    indexedAt: new Date('2026-01-18'),
  };

  const mockStats: JurisprudenciaStats = {
    totalItems: 107,
    tcespCount: 52,
    tcuCount: 55,
    documentTreeId: 'tree-uuid',
    indexedAt: new Date('2026-01-18'),
    themes: ['Licitacao', 'Contratos', 'Lei 14.133/2021'],
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [JurisprudenciaController],
      providers: [
        {
          provide: JurisprudenciaService,
          useValue: mockJurisprudenciaService,
        },
      ],
    }).compile();

    controller = module.get<JurisprudenciaController>(JurisprudenciaController);
    service = module.get<JurisprudenciaService>(JurisprudenciaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('initialization', () => {
    it('should be defined', () => {
      expect(controller).toBeDefined();
    });
  });

  describe('POST /pageindex/jurisprudencia/search', () => {
    it('should search by text query', async () => {
      const dto: JurisprudenciaSearchDto = {
        query: 'dispensa licitacao',
        limit: 10,
      };

      mockJurisprudenciaService.searchByText.mockResolvedValue(mockSearchResult);

      const result = await controller.searchByText(dto);

      expect(result).toEqual(mockSearchResult);
      expect(service.searchByText).toHaveBeenCalledWith(dto.query, {
        tribunal: undefined,
        limit: dto.limit,
        minConfidence: undefined,
        includeContent: undefined,
      });
    });

    it('should search with tribunal filter', async () => {
      const dto: JurisprudenciaSearchDto = {
        query: 'dispensa licitacao',
        tribunal: 'TCU',
        limit: 10,
        minConfidence: 0.5,
        includeContent: true,
      };

      mockJurisprudenciaService.searchByText.mockResolvedValue(mockSearchResult);

      await controller.searchByText(dto);

      expect(service.searchByText).toHaveBeenCalledWith(dto.query, {
        tribunal: 'TCU',
        limit: 10,
        minConfidence: 0.5,
        includeContent: true,
      });
    });

    it('should throw NotFoundException when data not seeded', async () => {
      const dto: JurisprudenciaSearchDto = {
        query: 'dispensa licitacao',
      };

      mockJurisprudenciaService.searchByText.mockRejectedValue(
        new NotFoundException('Jurisprudence data not found'),
      );

      await expect(controller.searchByText(dto)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('POST /pageindex/jurisprudencia/search/theme', () => {
    it('should search by theme', async () => {
      const dto: JurisprudenciaThemeSearchDto = {
        theme: 'Lei 14.133/2021 > ETP',
        limit: 20,
      };

      mockJurisprudenciaService.searchByTheme.mockResolvedValue(mockSearchResult);

      const result = await controller.searchByTheme(dto);

      expect(result).toEqual(mockSearchResult);
      expect(service.searchByTheme).toHaveBeenCalledWith(dto.theme, {
        tribunal: undefined,
        limit: dto.limit,
      });
    });

    it('should search by theme with tribunal filter', async () => {
      const dto: JurisprudenciaThemeSearchDto = {
        theme: 'Licitacao',
        tribunal: 'TCE-SP',
        limit: 30,
      };

      mockJurisprudenciaService.searchByTheme.mockResolvedValue(mockSearchResult);

      await controller.searchByTheme(dto);

      expect(service.searchByTheme).toHaveBeenCalledWith(dto.theme, {
        tribunal: 'TCE-SP',
        limit: 30,
      });
    });
  });

  describe('GET /pageindex/jurisprudencia', () => {
    it('should list all jurisprudence', async () => {
      mockJurisprudenciaService.listAll.mockResolvedValue(mockListResult);

      const result = await controller.listAll();

      expect(result).toEqual(mockListResult);
      expect(service.listAll).toHaveBeenCalledWith({
        limit: undefined,
        offset: undefined,
      });
    });

    it('should list with pagination', async () => {
      mockJurisprudenciaService.listAll.mockResolvedValue(mockListResult);

      await controller.listAll(20, 10);

      expect(service.listAll).toHaveBeenCalledWith({
        limit: 20,
        offset: 10,
      });
    });
  });

  describe('GET /pageindex/jurisprudencia/stats', () => {
    it('should return statistics', async () => {
      mockJurisprudenciaService.getStats.mockResolvedValue(mockStats);

      const result = await controller.getStats();

      expect(result).toEqual(mockStats);
      expect(service.getStats).toHaveBeenCalled();
    });
  });

  describe('GET /pageindex/jurisprudencia/themes', () => {
    it('should return available themes', async () => {
      const themes = ['Licitacao', 'Contratos', 'Lei 14.133/2021'];
      mockJurisprudenciaService.getAvailableThemes.mockReturnValue(themes);

      const result = await controller.getThemes();

      expect(result).toEqual({ themes });
      expect(service.getAvailableThemes).toHaveBeenCalled();
    });
  });

  describe('GET /pageindex/jurisprudencia/tribunal/:tribunal', () => {
    it('should get by TCU tribunal', async () => {
      mockJurisprudenciaService.getByTribunal.mockResolvedValue(mockListResult);

      const result = await controller.getByTribunal('TCU');

      expect(result).toEqual(mockListResult);
      expect(service.getByTribunal).toHaveBeenCalledWith('TCU', {
        limit: undefined,
        offset: undefined,
      });
    });

    it('should get by TCE-SP tribunal with pagination', async () => {
      mockJurisprudenciaService.getByTribunal.mockResolvedValue(mockListResult);

      await controller.getByTribunal('TCE-SP', 30, 5);

      expect(service.getByTribunal).toHaveBeenCalledWith('TCE-SP', {
        limit: 30,
        offset: 5,
      });
    });

    it('should throw NotFoundException for invalid tribunal', async () => {
      await expect(
        controller.getByTribunal('INVALID' as any),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('GET /pageindex/jurisprudencia/:id', () => {
    it('should get by ID', async () => {
      const item: JurisprudenciaItem = {
        id: 'tcu-acordao-247',
        title: 'Acordao 247/2021',
        tribunal: 'TCU',
        content: 'Full content...',
      };

      mockJurisprudenciaService.getById.mockResolvedValue(item);

      const result = await controller.getById('tcu-acordao-247');

      expect(result).toEqual(item);
      expect(service.getById).toHaveBeenCalledWith('tcu-acordao-247');
    });

    it('should throw NotFoundException when not found', async () => {
      mockJurisprudenciaService.getById.mockResolvedValue(null);

      await expect(controller.getById('invalid-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
