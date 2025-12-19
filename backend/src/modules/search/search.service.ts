import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SimilarContract } from '../../entities/similar-contract.entity';
import { ExaService } from './exa/exa.service';
import { ExaResponse } from './exa/exa.types';
import { DISCLAIMER } from '../../common/constants/messages';

/**
 * SearchService - Business logic for searching similar contracts and legal references.
 *
 * Multi-Tenancy (MT): Column-based isolation via organizationId.
 * - All queries filter by organizationId to prevent cross-tenant data leakage
 * - New records are associated with the user's organizationId
 * - Cache keys include organizationId for tenant-specific caching
 *
 * @see Issue #649 for multi-tenancy implementation
 * @see SimilarContract entity for data model
 */
@Injectable()
export class SearchService {
 private readonly logger = new Logger(SearchService.name);

 constructor(
 @InjectRepository(SimilarContract)
 private contractsRepository: Repository<SimilarContract>,
 private exaService: ExaService,
 ) {}

 /**
 * Search for similar contracts.
 * Results are filtered by organizationId for multi-tenancy isolation.
 *
 * @param query - Search query string
 * @param organizationId - Organization ID from JWT (MT isolation)
 * @param filters - Optional filters
 */
 async searchSimilarContracts(
 query: string,
 organizationId: string,
 filters?: Record<string, unknown>,
 ) {
 this.logger.log(
 `Searching similar contracts for org=${organizationId}: ${query}`,
 );

 // First, check if we have cached results for this organization
 const cachedResults = await this.getCachedResults(query, organizationId);

 if (cachedResults.length > 0) {
 this.logger.log(
 `Found ${cachedResults.length} cached results for org=${organizationId}`,
 );
 return {
 data: cachedResults,
 source: 'cache',
 disclaimer: DISCLAIMER,
 };
 }

 // If no cache, search with Exa
 const exaResults = await this.exaService.searchSimilarContracts(
 query,
 filters,
 );

 // Save results to database with organizationId
 const savedContracts = await this.saveSearchResults(
 query,
 exaResults,
 organizationId,
 );

 return {
 data: savedContracts,
 summary: exaResults.summary,
 sources: exaResults.sources,
 source: 'exa',
 disclaimer: DISCLAIMER,
 };
 }

 async searchLegalReferences(topic: string) {
 this.logger.log(`Searching legal references for: ${topic}`);

 const exaResults = await this.exaService.searchLegalReferences(topic);

 return {
 data: exaResults.results,
 summary: exaResults.summary,
 sources: exaResults.sources,
 disclaimer: DISCLAIMER,
 };
 }

 /**
 * Get cached search results filtered by organization.
 * Multi-Tenancy: Only returns results belonging to the specified organization.
 *
 * @param query - Search query string
 * @param organizationId - Organization ID for tenant isolation
 */
 private async getCachedResults(
 query: string,
 organizationId: string,
 ): Promise<SimilarContract[]> {
 // Search for cached results (case-insensitive, within last 30 days)
 // Multi-Tenancy: Filter by organizationId to prevent cross-tenant data leakage
 const thirtyDaysAgo = new Date();
 thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

 return this.contractsRepository
 .createQueryBuilder('contract')
 .where('LOWER(contract.searchQuery) = LOWER(:query)', { query })
 .andWhere('contract.organizationId = :organizationId', { organizationId })
 .andWhere('contract.createdAt > :date', { date: thirtyDaysAgo })
 .orderBy('contract.relevanceScore', 'DESC')
 .limit(10)
 .getMany();
 }

 /**
 * Save search results to database with organization association.
 * Multi-Tenancy: All saved contracts are tagged with organizationId.
 *
 * @param query - Original search query
 * @param exaResults - Results from Exa API
 * @param organizationId - Organization ID for tenant isolation
 */
 private async saveSearchResults(
 query: string,
 exaResults: ExaResponse,
 organizationId: string,
 ): Promise<SimilarContract[]> {
 const contracts: SimilarContract[] = [];

 for (const result of exaResults.results) {
 const contract = this.contractsRepository.create({
 searchQuery: query,
 organizationId, // Multi-Tenancy: Associate with organization
 title: result.title,
 description: result.snippet,
 url: result.url,
 fonte: result.source,
 relevanceScore: result.relevance,
 metadata: {
 exaResult: true,
 },
 });

 const saved = await this.contractsRepository.save(contract);
 contracts.push(saved);
 }

 this.logger.log(
 `Saved ${contracts.length} contracts for org=${organizationId}`,
 );

 return contracts;
 }

 /**
 * Get contract by ID with organization validation.
 * Multi-Tenancy: Only returns contract if it belongs to the specified organization.
 *
 * @param id - Contract UUID
 * @param organizationId - Organization ID for tenant isolation
 */
 async getContractById(
 id: string,
 organizationId: string,
 ): Promise<SimilarContract | null> {
 // Multi-Tenancy: Filter by organizationId to prevent accessing other org's data
 return this.contractsRepository.findOne({
 where: { id, organizationId },
 });
 }

 /**
 * Get all contracts for an organization.
 * Multi-Tenancy: Only returns contracts belonging to the specified organization.
 *
 * @param organizationId - Organization ID for tenant isolation
 * @param limit - Maximum number of results (default: 50)
 */
 async getAllContracts(organizationId: string, limit: number = 50) {
 // Multi-Tenancy: Filter by organizationId to prevent cross-tenant data leakage
 return this.contractsRepository.find({
 where: { organizationId },
 order: { createdAt: 'DESC', relevanceScore: 'DESC' },
 take: limit,
 });
 }
}
