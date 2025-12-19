import {
 Controller,
 Get,
 Query,
 Param,
 UseGuards,
 HttpCode,
 HttpStatus,
} from '@nestjs/common';
import {
 ApiTags,
 ApiOperation,
 ApiQuery,
 ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RAGService } from './rag.service';
import { LegislationType } from '../../entities/legislation.entity';

/**
 * RAG Controller for testing legislation search and verification.
 * Protected endpoints for authorized users only.
 *
 * @see Issue #211 - PoC RAG com Lei 14.133/2021
 */
@ApiTags('rag')
@Controller('rag')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class RAGController {
 constructor(private readonly ragService: RAGService) {}

 /**
 * Search legislation by semantic similarity.
 * Uses vector embeddings to find relevant legislation.
 *
 * @example GET /rag/search?q=licitações públicas&limit=5
 */
 @Get('search')
 @HttpCode(HttpStatus.OK)
 @ApiOperation({
 summary: 'Search legislation by semantic similarity',
 description:
 'Uses OpenAI embeddings and pgvector to find similar legislation',
 })
 @ApiQuery({ name: 'q', description: 'Search query', required: true })
 @ApiQuery({
 name: 'limit',
 description: 'Maximum results',
 required: false,
 type: Number,
 })
 @ApiQuery({
 name: 'threshold',
 description: 'Minimum similarity (0-1)',
 required: false,
 type: Number,
 })
 async search(
 @Query('q') query: string,
 @Query('limit') limit?: number,
 @Query('threshold') threshold?: number,
 ) {
 const results = await this.ragService.findSimilar(
 query,
 limit ? parseInt(limit.toString(), 10) : 5,
 threshold ? parseFloat(threshold.toString()) : 0.7,
 );

 return {
 query,
 count: results.length,
 results: results.map((r) => ({
 id: r.legislation.id,
 reference: r.legislation.getFormattedReference(),
 title: r.legislation.title,
 similarity: r.similarity,
 type: r.legislation.type,
 year: r.legislation.year,
 })),
 };
 }

 /**
 * Verify if a specific legal reference exists.
 *
 * @example GET /rag/verify?type=lei&number=14.133&year=2021
 */
 @Get('verify')
 @HttpCode(HttpStatus.OK)
 @ApiOperation({
 summary: 'Verify existence of specific legal reference',
 description: 'Exact match verification by type, number, and year',
 })
 @ApiQuery({
 name: 'type',
 enum: LegislationType,
 description: 'Type of legislation',
 })
 @ApiQuery({
 name: 'number',
 description: 'Legislation number (e.g., 14.133)',
 })
 @ApiQuery({ name: 'year', description: 'Year (e.g., 2021)', type: Number })
 async verify(
 @Query('type') type: LegislationType,
 @Query('number') number: string,
 @Query('year') year: number,
 ) {
 const result = await this.ragService.verifyReference(
 type,
 number,
 parseInt(year.toString(), 10),
 );

 return {
 reference: result.reference,
 exists: result.exists,
 confidence: result.confidence,
 legislation: result.legislation
 ? {
 id: result.legislation.id,
 reference: result.legislation.getFormattedReference(),
 title: result.legislation.title,
 }
 : null,
 suggestion: result.suggestion,
 };
 }

 /**
 * Get all indexed legislation.
 */
 @Get('legislation')
 @HttpCode(HttpStatus.OK)
 @ApiOperation({
 summary: 'List all indexed legislation',
 description: 'Returns all legislation in the RAG database',
 })
 async getAllLegislation() {
 const legislation = await this.ragService.getAllLegislation();

 return {
 count: legislation.length,
 legislation: legislation.map((l) => ({
 id: l.id,
 reference: l.getFormattedReference(),
 title: l.title,
 type: l.type,
 year: l.year,
 hasEmbedding: !!l.embedding,
 articlesCount: l.articles?.length || 0,
 })),
 };
 }

 /**
 * Get specific legislation by ID.
 */
 @Get('legislation/:id')
 @HttpCode(HttpStatus.OK)
 @ApiOperation({
 summary: 'Get legislation by ID',
 description: 'Returns full legislation details including articles',
 })
 async getLegislationById(@Param('id') id: string) {
 const legislation = await this.ragService.getLegislationById(id);

 if (!legislation) {
 return {
 found: false,
 message: 'Legislation not found',
 };
 }

 return {
 found: true,
 legislation: {
 id: legislation.id,
 reference: legislation.getFormattedReference(),
 title: legislation.title,
 type: legislation.type,
 number: legislation.number,
 year: legislation.year,
 content: legislation.content,
 articles: legislation.articles,
 sourceUrl: legislation.sourceUrl,
 hasEmbedding: !!legislation.embedding,
 createdAt: legislation.createdAt,
 updatedAt: legislation.updatedAt,
 },
 };
 }

 /**
 * Get RAG system statistics.
 */
 @Get('stats')
 @HttpCode(HttpStatus.OK)
 @ApiOperation({
 summary: 'Get RAG statistics',
 description: 'Returns statistics about indexed legislation',
 })
 async getStats() {
 return this.ragService.getStats();
 }
}
