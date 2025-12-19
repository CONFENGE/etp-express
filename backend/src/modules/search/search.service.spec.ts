import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SearchService } from './search.service';
import { SimilarContract } from '../../entities/similar-contract.entity';
import { ExaService } from './exa/exa.service';
import { ExaResponse, ExaSearchResult } from './exa/exa.types';

/**
 * Unit tests for SearchService
 *
 * Tests search functionality, caching, and integration with Exa API:
 * - searchSimilarContracts() - Search with cache hit/miss, Exa integration
 * - searchLegalReferences() - Legal reference search via Exa
 * - getCachedResults() - Database cache retrieval (30-day TTL)
 * - saveSearchResults() - Cache persistence after API search
 * - getContractById() - Single contract retrieval with MT isolation
 * - getAllContracts() - Batch contract retrieval with MT isolation
 *
 * Multi-Tenancy (MT) Tests:
 * - Cross-tenant isolation validation
 * - organizationId filtering in all queries
 *
 * Coverage objectives: ≥60% service coverage with proper mocking
 *
 * @see Issue #649 for multi-tenancy implementation
 */
describe('SearchService', () => {
 let service: SearchService;
 let contractsRepository: Repository<SimilarContract>;
 let exaService: ExaService;

 // Mock data
 const mockQuery = 'contratação de serviços de TI';
 const mockTopic = 'lei 14.133/2021';
 const mockContractId = 'contract-123';

 // Multi-Tenancy: Two organizations for cross-tenant isolation tests
 const mockOrganizationId = 'org-123-456-789';
 const mockOtherOrganizationId = 'org-999-888-777'; // Different tenant

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
 exaResult: true,
 modalidade: 'Pregão Eletrônico',
 },
 createdAt: new Date('2025-11-01T10:00:00Z'),
 // Multi-tenancy fields (Issue #650)
 organizationId: mockOrganizationId,
 organization: null,
 };

 const mockExaResult: ExaSearchResult = {
 title: 'Contratação de Desenvolvimento de Software',
 snippet: 'Desenvolvimento de sistema web para gestão pública',
 url: 'https://pncp.gov.br/contract/123',
 relevance: 0.95,
 source: 'PNCP',
 };

 const mockExaResponse: ExaResponse = {
 results: [mockExaResult],
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
 * Mock ExaService
 */
 const mockExaService = {
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
 provide: ExaService,
 useValue: mockExaService,
 },
 ],
 }).compile();

 service = module.get<SearchService>(SearchService);
 contractsRepository = module.get<Repository<SimilarContract>>(
 getRepositoryToken(SimilarContract),
 );
 exaService = module.get<ExaService>(ExaService);

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

 // Act - MT: Pass organizationId
 const result = await service.searchSimilarContracts(
 mockQuery,
 mockOrganizationId,
 );

 // Assert - Should return cached data
 expect(result.data).toEqual(cachedContracts);
 expect(result.source).toBe('cache');
 expect(result.disclaimer).toContain('ETP Express pode cometer erros');
 expect(mockQueryBuilder.where).toHaveBeenCalledWith(
 'LOWER(contract.searchQuery) = LOWER(:query)',
 { query: mockQuery },
 );
 // MT: Should filter by organizationId
 expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
 'contract.organizationId = :organizationId',
 { organizationId: mockOrganizationId },
 );
 expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith(
 'contract.relevanceScore',
 'DESC',
 );
 expect(mockQueryBuilder.limit).toHaveBeenCalledWith(10);

 // Should NOT call Exa when cache hits
 expect(exaService.searchSimilarContracts).not.toHaveBeenCalled();
 });

 it('should return cached results sorted by relevance score', async () => {
 // Arrange
 const contract1 = { ...mockContract, relevanceScore: 0.8, id: 'c1' };
 const contract2 = { ...mockContract, relevanceScore: 0.95, id: 'c2' };
 const cachedContracts = [contract2, contract1]; // Already sorted by DB

 mockQueryBuilder.getMany.mockResolvedValue(cachedContracts);

 // Act - MT: Pass organizationId
 const result = await service.searchSimilarContracts(
 mockQuery,
 mockOrganizationId,
 );

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

 // Act - MT: Pass organizationId
 await service.searchSimilarContracts(mockQuery, mockOrganizationId);

 // Assert
 expect(mockQueryBuilder.limit).toHaveBeenCalledWith(10);
 });

 it('should perform case-insensitive cache lookup', async () => {
 // Arrange
 const upperCaseQuery = 'CONTRATAÇÃO DE TI';
 const mockQueryBuilder = contractsRepository.createQueryBuilder();
 mockQueryBuilder.getMany = jest.fn().mockResolvedValue([mockContract]);

 // Act - MT: Pass organizationId
 await service.searchSimilarContracts(upperCaseQuery, mockOrganizationId);

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
 it('should call Exa and save results when cache is empty', async () => {
 // Arrange - Mock cache MISS (empty results)
 const mockQueryBuilder = contractsRepository.createQueryBuilder();
 mockQueryBuilder.getMany = jest.fn().mockResolvedValue([]);

 mockExaService.searchSimilarContracts.mockResolvedValue(mockExaResponse);
 mockContractsRepository.create.mockReturnValue(mockContract);
 mockContractsRepository.save.mockResolvedValue(mockContract);

 // Act - MT: Pass organizationId
 const result = await service.searchSimilarContracts(
 mockQuery,
 mockOrganizationId,
 );

 // Assert - Should call Exa
 expect(exaService.searchSimilarContracts).toHaveBeenCalledWith(
 mockQuery,
 undefined,
 );

 // MT: Should save results with organizationId
 expect(contractsRepository.create).toHaveBeenCalledWith({
 searchQuery: mockQuery,
 organizationId: mockOrganizationId, // MT: Associate with organization
 title: mockExaResult.title,
 description: mockExaResult.snippet,
 url: mockExaResult.url,
 fonte: mockExaResult.source,
 relevanceScore: mockExaResult.relevance,
 metadata: {
 exaResult: true,
 },
 });
 expect(contractsRepository.save).toHaveBeenCalledWith(mockContract);

 // Should return Exa response
 expect(result.source).toBe('exa');
 expect(result.data).toEqual([mockContract]);
 expect(result.summary).toBe(mockExaResponse.summary);
 expect(result.sources).toEqual(mockExaResponse.sources);
 expect(result.disclaimer).toContain('ETP Express pode cometer erros');
 });

 it('should pass filters to Exa when provided', async () => {
 // Arrange
 const mockQueryBuilder = contractsRepository.createQueryBuilder();
 mockQueryBuilder.getMany = jest.fn().mockResolvedValue([]);

 mockExaService.searchSimilarContracts.mockResolvedValue(mockExaResponse);
 mockContractsRepository.create.mockReturnValue(mockContract);
 mockContractsRepository.save.mockResolvedValue(mockContract);

 const filters = { orgao: 'Prefeitura', valorMin: 100000 };

 // Act - MT: Pass organizationId + filters
 await service.searchSimilarContracts(
 mockQuery,
 mockOrganizationId,
 filters,
 );

 // Assert
 expect(exaService.searchSimilarContracts).toHaveBeenCalledWith(
 mockQuery,
 filters,
 );
 });

 it('should save multiple results from Exa', async () => {
 // Arrange
 const mockQueryBuilder = contractsRepository.createQueryBuilder();
 mockQueryBuilder.getMany = jest.fn().mockResolvedValue([]);

 const multipleResults: ExaResponse = {
 ...mockExaResponse,
 results: [
 mockExaResult,
 { ...mockExaResult, title: 'Outro Contrato', relevance: 0.8 },
 ],
 };

 mockExaService.searchSimilarContracts.mockResolvedValue(multipleResults);

 const contract1 = { ...mockContract };
 const contract2 = { ...mockContract, id: 'contract-456' };
 mockContractsRepository.create
 .mockReturnValueOnce(contract1)
 .mockReturnValueOnce(contract2);
 mockContractsRepository.save
 .mockResolvedValueOnce(contract1)
 .mockResolvedValueOnce(contract2);

 // Act - MT: Pass organizationId
 const result = await service.searchSimilarContracts(
 mockQuery,
 mockOrganizationId,
 );

 // Assert
 expect(contractsRepository.create).toHaveBeenCalledTimes(2);
 expect(contractsRepository.save).toHaveBeenCalledTimes(2);
 expect(result.data).toHaveLength(2);
 });

 it('should log saved contracts count with organizationId', async () => {
 // Arrange
 const logSpy = jest.spyOn(Logger.prototype, 'log').mockImplementation();
 const mockQueryBuilder = contractsRepository.createQueryBuilder();
 mockQueryBuilder.getMany = jest.fn().mockResolvedValue([]);

 mockExaService.searchSimilarContracts.mockResolvedValue(mockExaResponse);
 mockContractsRepository.create.mockReturnValue(mockContract);
 mockContractsRepository.save.mockResolvedValue(mockContract);

 // Act - MT: Pass organizationId
 await service.searchSimilarContracts(mockQuery, mockOrganizationId);

 // Assert - MT: Log should include organizationId
 expect(logSpy).toHaveBeenCalledWith(
 `Saved 1 contracts for org=${mockOrganizationId}`,
 );
 });
 });

 /**
 * Tests for searchLegalReferences()
 */
 describe('searchLegalReferences', () => {
 it('should call Exa for legal references', async () => {
 // Arrange
 const legalResponse: ExaResponse = {
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

 mockExaService.searchLegalReferences.mockResolvedValue(legalResponse);

 // Act
 const result = await service.searchLegalReferences(mockTopic);

 // Assert
 expect(exaService.searchLegalReferences).toHaveBeenCalledWith(mockTopic);
 expect(result.data).toEqual(legalResponse.results);
 expect(result.summary).toBe(legalResponse.summary);
 expect(result.sources).toEqual(legalResponse.sources);
 expect(result.disclaimer).toContain('ETP Express pode cometer erros');
 });

 it('should log legal reference search query', async () => {
 // Arrange
 const logSpy = jest.spyOn(Logger.prototype, 'log').mockImplementation();
 mockExaService.searchLegalReferences.mockResolvedValue(mockExaResponse);

 // Act
 await service.searchLegalReferences(mockTopic);

 // Assert
 expect(logSpy).toHaveBeenCalledWith(
 `Searching legal references for: ${mockTopic}`,
 );
 });

 it('should handle empty legal reference results', async () => {
 // Arrange
 const emptyResponse: ExaResponse = {
 results: [],
 summary: 'Nenhuma referência legal encontrada',
 sources: [],
 };

 mockExaService.searchLegalReferences.mockResolvedValue(emptyResponse);

 // Act
 const result = await service.searchLegalReferences('tópico inexistente');

 // Assert
 expect(result.data).toEqual([]);
 expect(result.summary).toBe('Nenhuma referência legal encontrada');
 });
 });

 /**
 * Tests for getContractById() - Multi-Tenancy isolation
 */
 describe('getContractById', () => {
 it('should return contract by id filtered by organizationId', async () => {
 // Arrange
 mockContractsRepository.findOne.mockResolvedValue(mockContract);

 // Act - MT: Pass organizationId
 const result = await service.getContractById(
 mockContractId,
 mockOrganizationId,
 );

 // Assert - MT: Should filter by both id AND organizationId
 expect(contractsRepository.findOne).toHaveBeenCalledWith({
 where: { id: mockContractId, organizationId: mockOrganizationId },
 });
 expect(result).toEqual(mockContract);
 });

 it('should return null when contract not found', async () => {
 // Arrange
 mockContractsRepository.findOne.mockResolvedValue(null);

 // Act - MT: Pass organizationId
 const result = await service.getContractById(
 'non-existent-id',
 mockOrganizationId,
 );

 // Assert
 expect(result).toBeNull();
 });

 it('should return null when contract belongs to different organization', async () => {
 // Arrange - MT: Contract exists but belongs to different org
 mockContractsRepository.findOne.mockResolvedValue(null);

 // Act - MT: Request with different organizationId
 const result = await service.getContractById(
 mockContractId,
 mockOtherOrganizationId, // Different tenant
 );

 // Assert - MT: Should not return contract from another org
 expect(contractsRepository.findOne).toHaveBeenCalledWith({
 where: { id: mockContractId, organizationId: mockOtherOrganizationId },
 });
 expect(result).toBeNull();
 });
 });

 /**
 * Tests for getAllContracts() - Multi-Tenancy isolation
 */
 describe('getAllContracts', () => {
 it('should return all contracts filtered by organizationId with default limit of 50', async () => {
 // Arrange
 const contracts = [mockContract, { ...mockContract, id: 'contract-456' }];
 mockContractsRepository.find.mockResolvedValue(contracts);

 // Act - MT: Pass organizationId
 const result = await service.getAllContracts(mockOrganizationId);

 // Assert - MT: Should filter by organizationId
 expect(contractsRepository.find).toHaveBeenCalledWith({
 where: { organizationId: mockOrganizationId },
 order: { createdAt: 'DESC', relevanceScore: 'DESC' },
 take: 50,
 });
 expect(result).toEqual(contracts);
 expect(result).toHaveLength(2);
 });

 it('should return contracts with custom limit', async () => {
 // Arrange
 mockContractsRepository.find.mockResolvedValue([mockContract]);

 // Act - MT: Pass organizationId + limit
 const result = await service.getAllContracts(mockOrganizationId, 20);

 // Assert - MT: Should filter by organizationId
 expect(contractsRepository.find).toHaveBeenCalledWith({
 where: { organizationId: mockOrganizationId },
 order: { createdAt: 'DESC', relevanceScore: 'DESC' },
 take: 20,
 });
 expect(result).toEqual([mockContract]);
 });

 it('should order by createdAt DESC and relevanceScore DESC', async () => {
 // Arrange
 mockContractsRepository.find.mockResolvedValue([]);

 // Act - MT: Pass organizationId + limit
 await service.getAllContracts(mockOrganizationId, 100);

 // Assert
 expect(contractsRepository.find).toHaveBeenCalledWith({
 where: { organizationId: mockOrganizationId },
 order: { createdAt: 'DESC', relevanceScore: 'DESC' },
 take: 100,
 });
 });

 it('should return empty array when no contracts exist for organization', async () => {
 // Arrange
 mockContractsRepository.find.mockResolvedValue([]);

 // Act - MT: Pass organizationId
 const result = await service.getAllContracts(mockOrganizationId);

 // Assert
 expect(result).toEqual([]);
 expect(result).toHaveLength(0);
 });

 it('should not return contracts from other organizations', async () => {
 // Arrange - MT: Org A has contracts, Org B has none
 mockContractsRepository.find.mockResolvedValue([]);

 // Act - MT: Request with different organizationId
 const result = await service.getAllContracts(mockOtherOrganizationId);

 // Assert - MT: Should only query for the specified organization
 expect(contractsRepository.find).toHaveBeenCalledWith({
 where: { organizationId: mockOtherOrganizationId },
 order: { createdAt: 'DESC', relevanceScore: 'DESC' },
 take: 50,
 });
 expect(result).toEqual([]);
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

 // Act - MT: Pass organizationId
 await service.searchSimilarContracts(mockQuery, mockOrganizationId);

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

 // Capture the date parameter from the andWhere call
 const originalAndWhere = mockQueryBuilder.andWhere;
 mockQueryBuilder.andWhere = jest.fn((condition: string, params?: any) => {
 if (params?.date) {
 capturedDate = params.date;
 }
 return mockQueryBuilder;
 });
 mockQueryBuilder.getMany = jest.fn().mockResolvedValue([]);

 const before = new Date();
 before.setDate(before.getDate() - 30);

 // Act - MT: Pass organizationId
 await service.searchSimilarContracts(mockQuery, mockOrganizationId);

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
 it('should handle Exa API errors gracefully', async () => {
 // Arrange
 const mockQueryBuilder = contractsRepository.createQueryBuilder();
 mockQueryBuilder.getMany = jest.fn().mockResolvedValue([]);

 mockExaService.searchSimilarContracts.mockRejectedValue(
 new Error('Exa API timeout'),
 );

 // Act & Assert - Should propagate error to caller - MT: Pass organizationId
 await expect(
 service.searchSimilarContracts(mockQuery, mockOrganizationId),
 ).rejects.toThrow('Exa API timeout');
 });

 it('should handle database save errors', async () => {
 // Arrange
 const mockQueryBuilder = contractsRepository.createQueryBuilder();
 mockQueryBuilder.getMany = jest.fn().mockResolvedValue([]);

 mockExaService.searchSimilarContracts.mockResolvedValue(mockExaResponse);
 mockContractsRepository.create.mockReturnValue(mockContract);
 mockContractsRepository.save.mockRejectedValue(
 new Error('Database connection lost'),
 );

 // Act & Assert - MT: Pass organizationId
 await expect(
 service.searchSimilarContracts(mockQuery, mockOrganizationId),
 ).rejects.toThrow('Database connection lost');
 });

 it('should handle malformed Exa responses', async () => {
 // Arrange
 const mockQueryBuilder = contractsRepository.createQueryBuilder();
 mockQueryBuilder.getMany = jest.fn().mockResolvedValue([]);

 const malformedResponse: any = {
 results: undefined,
 summary: 'Test',
 };

 mockExaService.searchSimilarContracts.mockResolvedValue(
 malformedResponse,
 );

 // Act & Assert - MT: Pass organizationId
 await expect(
 service.searchSimilarContracts(mockQuery, mockOrganizationId),
 ).rejects.toThrow();
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

 mockExaService.searchSimilarContracts.mockResolvedValue(mockExaResponse);
 mockContractsRepository.create.mockReturnValue(mockContract);
 mockContractsRepository.save.mockResolvedValue(mockContract);

 const logSpy = jest.spyOn(Logger.prototype, 'log').mockImplementation();

 // Act - MT: Pass organizationId + filters
 const result = await service.searchSimilarContracts(
 mockQuery,
 mockOrganizationId,
 { orgao: 'Prefeitura' },
 );

 // Assert - Full flow executed - MT: Log includes organizationId
 expect(logSpy).toHaveBeenCalledWith(
 `Searching similar contracts for org=${mockOrganizationId}: ${mockQuery}`,
 );
 expect(logSpy).toHaveBeenCalledWith(
 `Saved 1 contracts for org=${mockOrganizationId}`,
 );

 expect(exaService.searchSimilarContracts).toHaveBeenCalledWith(
 mockQuery,
 { orgao: 'Prefeitura' },
 );

 expect(result.data).toEqual([mockContract]);
 expect(result.source).toBe('exa');
 expect(result.summary).toBe(mockExaResponse.summary);
 expect(result.sources).toEqual(mockExaResponse.sources);
 });

 it('should use cache on second identical search for same organization', async () => {
 // Arrange - First search: cache MISS
 const mockQueryBuilder1 = contractsRepository.createQueryBuilder();
 mockQueryBuilder1.getMany = jest.fn().mockResolvedValue([]);

 mockExaService.searchSimilarContracts.mockResolvedValue(mockExaResponse);
 mockContractsRepository.create.mockReturnValue(mockContract);
 mockContractsRepository.save.mockResolvedValue(mockContract);

 // Act - First search - MT: Pass organizationId
 await service.searchSimilarContracts(mockQuery, mockOrganizationId);

 // Arrange - Second search: cache HIT
 const mockQueryBuilder2 = contractsRepository.createQueryBuilder();
 mockQueryBuilder2.getMany = jest.fn().mockResolvedValue([mockContract]);

 jest.clearAllMocks(); // Clear first search mocks

 // Act - Second search (same query, same org) - MT: Pass organizationId
 const result = await service.searchSimilarContracts(
 mockQuery,
 mockOrganizationId,
 );

 // Assert - Should use cache, NOT Exa
 expect(result.source).toBe('cache');
 expect(exaService.searchSimilarContracts).not.toHaveBeenCalled();
 });
 });

 /**
 * Multi-Tenancy (MT) Isolation Tests - Issue #649
 *
 * These tests specifically validate cross-tenant isolation:
 * - Each organization's data is isolated from others
 * - Cache is organization-scoped
 * - No data leakage between tenants
 */
 describe('Multi-Tenancy Isolation', () => {
 it('should not share cache between different organizations', async () => {
 // Scenario: Org A searches, Org B searches same term
 // Expected: Org B should NOT get Org A's cached results

 // Arrange - Org A's search populates cache
 const orgAContract = {
 ...mockContract,
 organizationId: mockOrganizationId,
 };
 mockQueryBuilder.getMany.mockResolvedValue([]);
 mockExaService.searchSimilarContracts.mockResolvedValue(mockExaResponse);
 mockContractsRepository.create.mockReturnValue(orgAContract);
 mockContractsRepository.save.mockResolvedValue(orgAContract);

 // Act - Org A searches
 await service.searchSimilarContracts(mockQuery, mockOrganizationId);

 // Clear mocks for Org B's search
 jest.clearAllMocks();

 // Arrange - Org B's cache should be empty (different org)
 mockQueryBuilder.getMany.mockResolvedValue([]); // No cache for Org B
 mockExaService.searchSimilarContracts.mockResolvedValue(mockExaResponse);

 const orgBContract = {
 ...mockContract,
 id: 'contract-org-b',
 organizationId: mockOtherOrganizationId,
 };
 mockContractsRepository.create.mockReturnValue(orgBContract);
 mockContractsRepository.save.mockResolvedValue(orgBContract);

 // Act - Org B searches same term
 const result = await service.searchSimilarContracts(
 mockQuery,
 mockOtherOrganizationId, // Different organization
 );

 // Assert - MT: Org B should get fresh results, NOT Org A's cache
 expect(result.source).toBe('exa'); // Fresh search, not cache
 expect(exaService.searchSimilarContracts).toHaveBeenCalled();

 // Assert - MT: Cache query should filter by Org B's organizationId
 expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
 'contract.organizationId = :organizationId',
 { organizationId: mockOtherOrganizationId },
 );
 });

 it('should save contracts with correct organizationId', async () => {
 // Arrange
 mockQueryBuilder.getMany.mockResolvedValue([]);
 mockExaService.searchSimilarContracts.mockResolvedValue(mockExaResponse);
 mockContractsRepository.create.mockReturnValue(mockContract);
 mockContractsRepository.save.mockResolvedValue(mockContract);

 // Act
 await service.searchSimilarContracts(mockQuery, mockOrganizationId);

 // Assert - MT: Contract created with organizationId
 expect(contractsRepository.create).toHaveBeenCalledWith(
 expect.objectContaining({
 organizationId: mockOrganizationId,
 }),
 );
 });

 it('should prevent cross-tenant contract access via getContractById', async () => {
 // Scenario: Contract belongs to Org A, Org B tries to access
 // Expected: Org B should NOT be able to access Org A's contract

 // Arrange - Contract exists for Org A
 const orgAContract = {
 ...mockContract,
 organizationId: mockOrganizationId,
 };

 // When Org B queries, DB returns null (filtered by organizationId)
 mockContractsRepository.findOne.mockResolvedValue(null);

 // Act - Org B tries to access Org A's contract
 const result = await service.getContractById(
 mockContractId,
 mockOtherOrganizationId, // Different organization
 );

 // Assert - MT: Contract should not be returned
 expect(result).toBeNull();
 expect(contractsRepository.findOne).toHaveBeenCalledWith({
 where: {
 id: mockContractId,
 organizationId: mockOtherOrganizationId, // Query includes org filter
 },
 });
 });

 it('should isolate getAllContracts results by organization', async () => {
 // Scenario: Org A has contracts, Org B queries
 // Expected: Org B should NOT see Org A's contracts

 // Arrange - Mock returns empty for Org B (data is isolated)
 mockContractsRepository.find.mockResolvedValue([]);

 // Act - Org B queries contracts
 const result = await service.getAllContracts(mockOtherOrganizationId);

 // Assert - MT: Query should filter by Org B's organizationId
 expect(contractsRepository.find).toHaveBeenCalledWith({
 where: { organizationId: mockOtherOrganizationId },
 order: { createdAt: 'DESC', relevanceScore: 'DESC' },
 take: 50,
 });
 expect(result).toEqual([]);
 });
 });
});
