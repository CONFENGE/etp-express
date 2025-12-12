import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SearchService } from './search.service';
import { SimilarContract } from '../../entities/similar-contract.entity';
import {
  PerplexityService,
  PerplexityResponse,
  PerplexitySearchResult,
} from './perplexity/perplexity.service';

/**
 * Unit tests for SearchService
 *
 * Tests search functionality, caching, and integration with Perplexity API:
 * - searchSimilarContracts() - Search with cache hit/miss, Perplexity integration
 * - searchLegalReferences() - Legal reference search via Perplexity
 * - getCachedResults() - Database cache retrieval (30-day TTL)
 * - saveSearchResults() - Cache persistence after API search
 * - getContractById() - Single contract retrieval
 * - getAllContracts() - Batch contract retrieval
 *
 * Coverage objectives: ≥60% service coverage with proper mocking
 */
describe('SearchService', () => {
  let service: SearchService;
  let contractsRepository: Repository<SimilarContract>;
  let perplexityService: PerplexityService;

  // Mock data
  const mockQuery = 'contratação de serviços de TI';
  const mockTopic = 'lei 14.133/2021';
  const mockContractId = 'contract-123';

  const mockOrganizationId = 'org-123-456-789';

  const mockContract: SimilarContract = {
    id: mockContractId,
    searchQuery: mockQuery,
    title: 'Contratação de Desenvolvimento de Software',
    description: 'Desenvolvimento de sistema web para gestão pública',
    orgao: 'Prefeitura Municipal',
    valor: 150000,
    dataContratacao: '2025-10-01',
    url: 'https://pncp.gov.br/contract/123',
    fonte: 'PNCP',
    relevanceScore: 0.95,
    metadata: {
      perplexityResult: true,
      modalidade: 'Pregão Eletrônico',
    },
    createdAt: new Date('2025-11-01T10:00:00Z'),
    // Multi-tenancy fields (Issue #650)
    organizationId: mockOrganizationId,
    organization: null,
  };

  const mockPerplexityResult: PerplexitySearchResult = {
    title: 'Contratação de Desenvolvimento de Software',
    snippet: 'Desenvolvimento de sistema web para gestão pública',
    url: 'https://pncp.gov.br/contract/123',
    relevance: 0.95,
    source: 'PNCP',
  };

  const mockPerplexityResponse: PerplexityResponse = {
    results: [mockPerplexityResult],
    summary:
      'Encontradas contratações similares de serviços de TI em órgãos públicos',
    sources: ['https://pncp.gov.br', 'https://paineldeprecos.gov.br'],
  };

  /**
   * Mock query builder - shared across tests
   */
  const mockQueryBuilder = {
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    getMany: jest.fn(),
  };

  /**
   * Mock repository factory with TypeORM methods
   */
  const mockContractsRepository = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    createQueryBuilder: jest.fn(() => mockQueryBuilder),
  };

  /**
   * Mock PerplexityService
   */
  const mockPerplexityService = {
    searchSimilarContracts: jest.fn(),
    searchLegalReferences: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SearchService,
        {
          provide: getRepositoryToken(SimilarContract),
          useValue: mockContractsRepository,
        },
        {
          provide: PerplexityService,
          useValue: mockPerplexityService,
        },
      ],
    }).compile();

    service = module.get<SearchService>(SearchService);
    contractsRepository = module.get<Repository<SimilarContract>>(
      getRepositoryToken(SimilarContract),
    );
    perplexityService = module.get<PerplexityService>(PerplexityService);

    // Reset mocks before each test
    jest.clearAllMocks();

    // Suppress logger output in tests
    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  /**
   * Tests for searchSimilarContracts() - Cache HIT scenario
   */
  describe('searchSimilarContracts - Cache HIT', () => {
    it('should return cached results when available (within 30 days)', async () => {
      // Arrange - Mock cache HIT
      const cachedContracts = [mockContract];
      mockQueryBuilder.getMany.mockResolvedValue(cachedContracts);

      // Act
      const result = await service.searchSimilarContracts(mockQuery);

      // Assert - Should return cached data
      expect(result.data).toEqual(cachedContracts);
      expect(result.source).toBe('cache');
      expect(result.disclaimer).toContain('ETP Express pode cometer erros');
      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        'LOWER(contract.searchQuery) = LOWER(:query)',
        { query: mockQuery },
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalled();
      expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith(
        'contract.relevanceScore',
        'DESC',
      );
      expect(mockQueryBuilder.limit).toHaveBeenCalledWith(10);

      // Should NOT call Perplexity when cache hits
      expect(perplexityService.searchSimilarContracts).not.toHaveBeenCalled();
    });

    it('should return cached results sorted by relevance score', async () => {
      // Arrange
      const contract1 = { ...mockContract, relevanceScore: 0.8, id: 'c1' };
      const contract2 = { ...mockContract, relevanceScore: 0.95, id: 'c2' };
      const cachedContracts = [contract2, contract1]; // Already sorted by DB

      mockQueryBuilder.getMany.mockResolvedValue(cachedContracts);

      // Act
      const result = await service.searchSimilarContracts(mockQuery);

      // Assert
      expect(result.data).toEqual(cachedContracts);
      expect(result.data[0].relevanceScore).toBe(0.95);
      expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith(
        'contract.relevanceScore',
        'DESC',
      );
    });

    it('should limit cached results to 10 items', async () => {
      // Arrange
      const mockQueryBuilder = contractsRepository.createQueryBuilder();
      mockQueryBuilder.getMany = jest.fn().mockResolvedValue([mockContract]);

      // Act
      await service.searchSimilarContracts(mockQuery);

      // Assert
      expect(mockQueryBuilder.limit).toHaveBeenCalledWith(10);
    });

    it('should perform case-insensitive cache lookup', async () => {
      // Arrange
      const upperCaseQuery = 'CONTRATAÇÃO DE TI';
      const mockQueryBuilder = contractsRepository.createQueryBuilder();
      mockQueryBuilder.getMany = jest.fn().mockResolvedValue([mockContract]);

      // Act
      await service.searchSimilarContracts(upperCaseQuery);

      // Assert
      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        'LOWER(contract.searchQuery) = LOWER(:query)',
        { query: upperCaseQuery },
      );
    });
  });

  /**
   * Tests for searchSimilarContracts() - Cache MISS scenario
   */
  describe('searchSimilarContracts - Cache MISS', () => {
    it('should call Perplexity and save results when cache is empty', async () => {
      // Arrange - Mock cache MISS (empty results)
      const mockQueryBuilder = contractsRepository.createQueryBuilder();
      mockQueryBuilder.getMany = jest.fn().mockResolvedValue([]);

      mockPerplexityService.searchSimilarContracts.mockResolvedValue(
        mockPerplexityResponse,
      );
      mockContractsRepository.create.mockReturnValue(mockContract);
      mockContractsRepository.save.mockResolvedValue(mockContract);

      // Act
      const result = await service.searchSimilarContracts(mockQuery);

      // Assert - Should call Perplexity
      expect(perplexityService.searchSimilarContracts).toHaveBeenCalledWith(
        mockQuery,
        undefined,
      );

      // Should save results to database
      expect(contractsRepository.create).toHaveBeenCalledWith({
        searchQuery: mockQuery,
        title: mockPerplexityResult.title,
        description: mockPerplexityResult.snippet,
        url: mockPerplexityResult.url,
        fonte: mockPerplexityResult.source,
        relevanceScore: mockPerplexityResult.relevance,
        metadata: {
          perplexityResult: true,
        },
      });
      expect(contractsRepository.save).toHaveBeenCalledWith(mockContract);

      // Should return Perplexity response
      expect(result.source).toBe('perplexity');
      expect(result.data).toEqual([mockContract]);
      expect(result.summary).toBe(mockPerplexityResponse.summary);
      expect(result.sources).toEqual(mockPerplexityResponse.sources);
      expect(result.disclaimer).toContain('ETP Express pode cometer erros');
    });

    it('should pass filters to Perplexity when provided', async () => {
      // Arrange
      const mockQueryBuilder = contractsRepository.createQueryBuilder();
      mockQueryBuilder.getMany = jest.fn().mockResolvedValue([]);

      mockPerplexityService.searchSimilarContracts.mockResolvedValue(
        mockPerplexityResponse,
      );
      mockContractsRepository.create.mockReturnValue(mockContract);
      mockContractsRepository.save.mockResolvedValue(mockContract);

      const filters = { orgao: 'Prefeitura', valorMin: 100000 };

      // Act
      await service.searchSimilarContracts(mockQuery, filters);

      // Assert
      expect(perplexityService.searchSimilarContracts).toHaveBeenCalledWith(
        mockQuery,
        filters,
      );
    });

    it('should save multiple results from Perplexity', async () => {
      // Arrange
      const mockQueryBuilder = contractsRepository.createQueryBuilder();
      mockQueryBuilder.getMany = jest.fn().mockResolvedValue([]);

      const multipleResults: PerplexityResponse = {
        ...mockPerplexityResponse,
        results: [
          mockPerplexityResult,
          { ...mockPerplexityResult, title: 'Outro Contrato', relevance: 0.8 },
        ],
      };

      mockPerplexityService.searchSimilarContracts.mockResolvedValue(
        multipleResults,
      );

      const contract1 = { ...mockContract };
      const contract2 = { ...mockContract, id: 'contract-456' };
      mockContractsRepository.create
        .mockReturnValueOnce(contract1)
        .mockReturnValueOnce(contract2);
      mockContractsRepository.save
        .mockResolvedValueOnce(contract1)
        .mockResolvedValueOnce(contract2);

      // Act
      const result = await service.searchSimilarContracts(mockQuery);

      // Assert
      expect(contractsRepository.create).toHaveBeenCalledTimes(2);
      expect(contractsRepository.save).toHaveBeenCalledTimes(2);
      expect(result.data).toHaveLength(2);
    });

    it('should log saved contracts count', async () => {
      // Arrange
      const logSpy = jest.spyOn(Logger.prototype, 'log').mockImplementation();
      const mockQueryBuilder = contractsRepository.createQueryBuilder();
      mockQueryBuilder.getMany = jest.fn().mockResolvedValue([]);

      mockPerplexityService.searchSimilarContracts.mockResolvedValue(
        mockPerplexityResponse,
      );
      mockContractsRepository.create.mockReturnValue(mockContract);
      mockContractsRepository.save.mockResolvedValue(mockContract);

      // Act
      await service.searchSimilarContracts(mockQuery);

      // Assert
      expect(logSpy).toHaveBeenCalledWith('Saved 1 contracts to database');
    });
  });

  /**
   * Tests for searchLegalReferences()
   */
  describe('searchLegalReferences', () => {
    it('should call Perplexity for legal references', async () => {
      // Arrange
      const legalResponse: PerplexityResponse = {
        results: [
          {
            title: 'Lei 14.133/2021 - Nova Lei de Licitações',
            snippet: 'Estabelece normas gerais de licitação e contratação',
            url: 'http://www.planalto.gov.br/ccivil_03/_ato2019-2022/2021/lei/L14133.htm',
            relevance: 1.0,
            source: 'Planalto',
          },
        ],
        summary: 'Lei 14.133/2021 regula licitações públicas no Brasil',
        sources: [
          'http://www.planalto.gov.br/ccivil_03/_ato2019-2022/2021/lei/L14133.htm',
        ],
      };

      mockPerplexityService.searchLegalReferences.mockResolvedValue(
        legalResponse,
      );

      // Act
      const result = await service.searchLegalReferences(mockTopic);

      // Assert
      expect(perplexityService.searchLegalReferences).toHaveBeenCalledWith(
        mockTopic,
      );
      expect(result.data).toEqual(legalResponse.results);
      expect(result.summary).toBe(legalResponse.summary);
      expect(result.sources).toEqual(legalResponse.sources);
      expect(result.disclaimer).toContain('ETP Express pode cometer erros');
    });

    it('should log legal reference search query', async () => {
      // Arrange
      const logSpy = jest.spyOn(Logger.prototype, 'log').mockImplementation();
      mockPerplexityService.searchLegalReferences.mockResolvedValue(
        mockPerplexityResponse,
      );

      // Act
      await service.searchLegalReferences(mockTopic);

      // Assert
      expect(logSpy).toHaveBeenCalledWith(
        `Searching legal references for: ${mockTopic}`,
      );
    });

    it('should handle empty legal reference results', async () => {
      // Arrange
      const emptyResponse: PerplexityResponse = {
        results: [],
        summary: 'Nenhuma referência legal encontrada',
        sources: [],
      };

      mockPerplexityService.searchLegalReferences.mockResolvedValue(
        emptyResponse,
      );

      // Act
      const result = await service.searchLegalReferences('tópico inexistente');

      // Assert
      expect(result.data).toEqual([]);
      expect(result.summary).toBe('Nenhuma referência legal encontrada');
    });
  });

  /**
   * Tests for getContractById()
   */
  describe('getContractById', () => {
    it('should return contract by id', async () => {
      // Arrange
      mockContractsRepository.findOne.mockResolvedValue(mockContract);

      // Act
      const result = await service.getContractById(mockContractId);

      // Assert
      expect(contractsRepository.findOne).toHaveBeenCalledWith({
        where: { id: mockContractId },
      });
      expect(result).toEqual(mockContract);
    });

    it('should return null when contract not found', async () => {
      // Arrange
      mockContractsRepository.findOne.mockResolvedValue(null);

      // Act
      const result = await service.getContractById('non-existent-id');

      // Assert
      expect(result).toBeNull();
    });
  });

  /**
   * Tests for getAllContracts()
   */
  describe('getAllContracts', () => {
    it('should return all contracts with default limit of 50', async () => {
      // Arrange
      const contracts = [mockContract, { ...mockContract, id: 'contract-456' }];
      mockContractsRepository.find.mockResolvedValue(contracts);

      // Act
      const result = await service.getAllContracts();

      // Assert
      expect(contractsRepository.find).toHaveBeenCalledWith({
        order: { createdAt: 'DESC', relevanceScore: 'DESC' },
        take: 50,
      });
      expect(result).toEqual(contracts);
      expect(result).toHaveLength(2);
    });

    it('should return contracts with custom limit', async () => {
      // Arrange
      mockContractsRepository.find.mockResolvedValue([mockContract]);

      // Act
      const result = await service.getAllContracts(20);

      // Assert
      expect(contractsRepository.find).toHaveBeenCalledWith({
        order: { createdAt: 'DESC', relevanceScore: 'DESC' },
        take: 20,
      });
      expect(result).toEqual([mockContract]);
    });

    it('should order by createdAt DESC and relevanceScore DESC', async () => {
      // Arrange
      mockContractsRepository.find.mockResolvedValue([]);

      // Act
      await service.getAllContracts(100);

      // Assert
      expect(contractsRepository.find).toHaveBeenCalledWith({
        order: { createdAt: 'DESC', relevanceScore: 'DESC' },
        take: 100,
      });
    });

    it('should return empty array when no contracts exist', async () => {
      // Arrange
      mockContractsRepository.find.mockResolvedValue([]);

      // Act
      const result = await service.getAllContracts();

      // Assert
      expect(result).toEqual([]);
      expect(result).toHaveLength(0);
    });
  });

  /**
   * Tests for cache expiration (30-day TTL)
   */
  describe('Cache expiration', () => {
    it('should exclude contracts older than 30 days from cache', async () => {
      // Arrange
      const mockQueryBuilder = contractsRepository.createQueryBuilder();
      mockQueryBuilder.getMany = jest.fn().mockResolvedValue([]);

      // Act
      await service.searchSimilarContracts(mockQuery);

      // Assert
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'contract.createdAt > :date',
        expect.objectContaining({
          date: expect.any(Date),
        }),
      );
    });

    it('should calculate 30-day window correctly', async () => {
      // Arrange
      const mockQueryBuilder = contractsRepository.createQueryBuilder();
      let capturedDate: Date | undefined;

      mockQueryBuilder.andWhere = jest.fn((_, params: any) => {
        capturedDate = params.date;
        return mockQueryBuilder;
      });
      mockQueryBuilder.getMany = jest.fn().mockResolvedValue([]);

      const before = new Date();
      before.setDate(before.getDate() - 30);

      // Act
      await service.searchSimilarContracts(mockQuery);

      // Assert
      expect(capturedDate).toBeDefined();

      // Check date is approximately 30 days ago (within 1 second tolerance)
      if (capturedDate) {
        expect(
          Math.abs(capturedDate.getTime() - before.getTime()),
        ).toBeLessThan(1000);
      }
    });
  });

  /**
   * Tests for error handling
   */
  describe('Error handling', () => {
    it('should handle Perplexity API errors gracefully', async () => {
      // Arrange
      const mockQueryBuilder = contractsRepository.createQueryBuilder();
      mockQueryBuilder.getMany = jest.fn().mockResolvedValue([]);

      mockPerplexityService.searchSimilarContracts.mockRejectedValue(
        new Error('Perplexity API timeout'),
      );

      // Act & Assert - Should propagate error to caller
      await expect(service.searchSimilarContracts(mockQuery)).rejects.toThrow(
        'Perplexity API timeout',
      );
    });

    it('should handle database save errors', async () => {
      // Arrange
      const mockQueryBuilder = contractsRepository.createQueryBuilder();
      mockQueryBuilder.getMany = jest.fn().mockResolvedValue([]);

      mockPerplexityService.searchSimilarContracts.mockResolvedValue(
        mockPerplexityResponse,
      );
      mockContractsRepository.create.mockReturnValue(mockContract);
      mockContractsRepository.save.mockRejectedValue(
        new Error('Database connection lost'),
      );

      // Act & Assert
      await expect(service.searchSimilarContracts(mockQuery)).rejects.toThrow(
        'Database connection lost',
      );
    });

    it('should handle malformed Perplexity responses', async () => {
      // Arrange
      const mockQueryBuilder = contractsRepository.createQueryBuilder();
      mockQueryBuilder.getMany = jest.fn().mockResolvedValue([]);

      const malformedResponse: any = {
        results: undefined,
        summary: 'Test',
      };

      mockPerplexityService.searchSimilarContracts.mockResolvedValue(
        malformedResponse,
      );

      // Act & Assert
      await expect(service.searchSimilarContracts(mockQuery)).rejects.toThrow();
    });
  });

  /**
   * Integration test: Full search flow
   */
  describe('Integration: Full search flow', () => {
    it('should perform complete search flow from cache miss to save', async () => {
      // Arrange - Simulate cache MISS
      const mockQueryBuilder = contractsRepository.createQueryBuilder();
      mockQueryBuilder.getMany = jest.fn().mockResolvedValue([]);

      mockPerplexityService.searchSimilarContracts.mockResolvedValue(
        mockPerplexityResponse,
      );
      mockContractsRepository.create.mockReturnValue(mockContract);
      mockContractsRepository.save.mockResolvedValue(mockContract);

      const logSpy = jest.spyOn(Logger.prototype, 'log').mockImplementation();

      // Act
      const result = await service.searchSimilarContracts(mockQuery, {
        orgao: 'Prefeitura',
      });

      // Assert - Full flow executed
      expect(logSpy).toHaveBeenCalledWith(
        `Searching similar contracts for: ${mockQuery}`,
      );
      expect(logSpy).toHaveBeenCalledWith('Saved 1 contracts to database');

      expect(perplexityService.searchSimilarContracts).toHaveBeenCalledWith(
        mockQuery,
        { orgao: 'Prefeitura' },
      );

      expect(result.data).toEqual([mockContract]);
      expect(result.source).toBe('perplexity');
      expect(result.summary).toBe(mockPerplexityResponse.summary);
      expect(result.sources).toEqual(mockPerplexityResponse.sources);
    });

    it('should use cache on second identical search', async () => {
      // Arrange - First search: cache MISS
      const mockQueryBuilder1 = contractsRepository.createQueryBuilder();
      mockQueryBuilder1.getMany = jest.fn().mockResolvedValue([]);

      mockPerplexityService.searchSimilarContracts.mockResolvedValue(
        mockPerplexityResponse,
      );
      mockContractsRepository.create.mockReturnValue(mockContract);
      mockContractsRepository.save.mockResolvedValue(mockContract);

      // Act - First search
      await service.searchSimilarContracts(mockQuery);

      // Arrange - Second search: cache HIT
      const mockQueryBuilder2 = contractsRepository.createQueryBuilder();
      mockQueryBuilder2.getMany = jest.fn().mockResolvedValue([mockContract]);

      jest.clearAllMocks(); // Clear first search mocks

      // Act - Second search (same query)
      const result = await service.searchSimilarContracts(mockQuery);

      // Assert - Should use cache, NOT Perplexity
      expect(result.source).toBe('cache');
      expect(perplexityService.searchSimilarContracts).not.toHaveBeenCalled();
    });
  });
});
