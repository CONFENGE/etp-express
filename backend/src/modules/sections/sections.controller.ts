import {
 Controller,
 Get,
 Post,
 Body,
 Patch,
 Param,
 Delete,
 UseGuards,
 Sse,
 Query,
 MessageEvent,
} from '@nestjs/common';
import {
 ApiTags,
 ApiOperation,
 ApiResponse,
 ApiBearerAuth,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Observable, map } from 'rxjs';
import { SectionsService } from './sections.service';
import { SectionProgressService } from './section-progress.service';
import { GenerateSectionDto } from './dto/generate-section.dto';
import { UpdateSectionDto } from './dto/update-section.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { UserThrottlerGuard } from '../../common/guards/user-throttler.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { DISCLAIMER } from '../../common/constants/messages';

/**
 * Controller handling ETP section management HTTP endpoints.
 *
 * @remarks
 * All endpoints require JWT authentication via JwtAuthGuard.
 * Sections belong to ETPs and inherit ownership validation.
 *
 * Key features:
 * - AI-powered section generation using orchestrator service
 * - Manual section updates
 * - Section regeneration
 * - Section validation
 *
 * Standard HTTP status codes:
 * - 200: Success
 * - 201: Created (section generated)
 * - 400: Validation error
 * - 401: Unauthorized (missing or invalid JWT)
 * - 404: Section or ETP not found
 */
@ApiTags('sections')
@Controller('sections')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class SectionsController {
 constructor(
 private readonly sectionsService: SectionsService,
 private readonly sectionProgressService: SectionProgressService,
 ) {}

 /**
 * Generates a new ETP section using AI orchestration.
 *
 * @remarks
 * This endpoint invokes the AI orchestrator to generate section content
 * using multiple specialized agents. Generation typically takes 30-60 seconds.
 *
 * **Rate Limiting (Issue #38):**
 * - Limit: 5 requests per 60 seconds (1 minute) per authenticated user
 * - Tracker: User ID (not IP address)
 * - Prevents abuse of OpenAI API costs
 *
 * @param etpId - ETP unique identifier (UUID)
 * @param generateDto - Section generation parameters (sectionKey, etc.)
 * @param userId - Current user ID (extracted from JWT token)
 * @returns Generated section entity with AI content and disclaimer message
 * @throws {NotFoundException} 404 - If ETP not found
 * @throws {BadRequestException} 400 - If section already exists or data invalid
 * @throws {UnauthorizedException} 401 - If JWT token is invalid or missing
 * @throws {ThrottlerException} 429 - If rate limit exceeded (5 req/min)
 */
 @Post('etp/:etpId/generate')
 @UseGuards(UserThrottlerGuard)
 @Throttle({ default: { limit: 5, ttl: 60000 } }) // 5 requests per 60 seconds per user
 @ApiOperation({
 summary: 'Gerar nova seção com IA',
 description:
 'Gera uma nova seção do ETP usando o sistema de orquestração de agentes IA. Limite: 5 gerações por minuto por usuário.',
 })
 @ApiResponse({ status: 201, description: 'Seção gerada com sucesso' })
 @ApiResponse({
 status: 400,
 description: 'Seção já existe ou dados inválidos',
 })
 @ApiResponse({ status: 404, description: 'ETP não encontrado' })
 @ApiResponse({
 status: 429,
 description:
 'Limite de requisições excedido (5 gerações por minuto por usuário)',
 })
 async generateSection(
 @Param('etpId') etpId: string,
 @Body() generateDto: GenerateSectionDto,
 @CurrentUser('id') userId: string,
 @CurrentUser('organizationId') organizationId: string,
 ) {
 const section = await this.sectionsService.generateSection(
 etpId,
 generateDto,
 userId,
 organizationId,
 );
 return {
 data: section,
 disclaimer: DISCLAIMER,
 };
 }

 /**
 * Generates a new ETP section with real-time progress via Server-Sent Events.
 *
 * @remarks
 * This endpoint provides real-time feedback during the AI generation pipeline
 * using Server-Sent Events (SSE). Unlike the regular generateSection endpoint
 * which returns immediately with a job ID, this endpoint streams progress
 * events as the generation progresses.
 *
 * **SSE Event Format:**
 * ```
 * event: progress
 * id: <jobId>-<step>
 * data: {"phase":"generation","step":3,"totalSteps":5,"percentage":60,...}
 * ```
 *
 * **Phases:**
 * 1. sanitization - Input sanitization and PII redaction (0-10%)
 * 2. enrichment - Market data enrichment via Gov-API/Exa (10-30%)
 * 3. generation - LLM content generation (30-70%)
 * 4. validation - Multi-agent validation (70-95%)
 * 5. complete - Final result ready (100%)
 *
 * **Rate Limiting:**
 * - Limit: 5 requests per 60 seconds per authenticated user
 * - Same as regular generation endpoint
 *
 * **Connection Management:**
 * - Maximum connection time: 5 minutes (auto-closes after)
 * - Client should handle 'complete' event to close connection
 * - On error, an 'error' phase event is sent before closing
 *
 * @param etpId - ETP unique identifier (UUID)
 * @param generateDto - Section generation parameters (as query string for SSE)
 * @param userId - Current user ID (extracted from JWT token)
 * @param organizationId - Organization ID for multi-tenancy
 * @returns Observable stream of SSE MessageEvents with progress updates
 * @throws {NotFoundException} 404 - If ETP not found
 * @throws {UnauthorizedException} 401 - If JWT token is invalid or missing
 * @throws {ThrottlerException} 429 - If rate limit exceeded
 *
 * @example Client-side usage:
 * ```ts
 * const eventSource = new EventSource(
 * '/sections/etp/123/generate/stream?type=justificativa&title=...',
 * { headers: { Authorization: 'Bearer ...' } }
 * );
 *
 * eventSource.addEventListener('progress', (event) => {
 * const progress = JSON.parse(event.data);
 * console.log(`${progress.phase}: ${progress.percentage}%`);
 * if (progress.phase === 'complete') {
 * eventSource.close();
 * }
 * });
 * ```
 *
 * @see #754 - SSE streaming implementation
 */
 @Sse('etp/:etpId/generate/stream')
 @UseGuards(UserThrottlerGuard)
 @Throttle({ default: { limit: 5, ttl: 60000 } })
 @ApiOperation({
 summary: 'Gerar seção com streaming de progresso (SSE)',
 description:
 'Gera uma nova seção do ETP com feedback em tempo real via Server-Sent Events. Limite: 5 gerações por minuto por usuário.',
 })
 @ApiResponse({
 status: 200,
 description: 'Stream de eventos SSE com progresso da geração',
 })
 @ApiResponse({
 status: 400,
 description: 'Seção já existe ou dados inválidos',
 })
 @ApiResponse({ status: 404, description: 'ETP não encontrado' })
 @ApiResponse({
 status: 429,
 description: 'Limite de requisições excedido',
 })
 generateSectionStream(
 @Param('etpId') etpId: string,
 @Query() generateDto: GenerateSectionDto,
 @CurrentUser('id') userId: string,
 @CurrentUser('organizationId') organizationId: string,
 ): Observable<MessageEvent> {
 // Start generation with progress tracking
 const progressObservable = this.sectionsService.generateSectionWithProgress(
 etpId,
 generateDto,
 userId,
 organizationId,
 this.sectionProgressService,
 );

 // Transform to NestJS MessageEvent format
 return progressObservable.pipe(
 map((event) => ({
 data: event.data,
 id: event.id,
 type: event.type,
 })),
 );
 }

 /**
 * Retrieves all sections for a specific ETP.
 *
 * @param etpId - ETP unique identifier (UUID)
 * @returns Array of section entities with disclaimer message
 * @throws {UnauthorizedException} 401 - If JWT token is invalid or missing
 */
 @Get('etp/:etpId')
 @ApiOperation({ summary: 'Listar todas as seções de um ETP' })
 @ApiResponse({ status: 200, description: 'Lista de seções' })
 async findAll(@Param('etpId') etpId: string) {
 const sections = await this.sectionsService.findAll(etpId);
 return {
 data: sections,
 disclaimer: DISCLAIMER,
 };
 }

 /**
 * Retrieves a single section by ID.
 *
 * @param id - Section unique identifier (UUID)
 * @returns Section entity with content and metadata, plus disclaimer message
 * @throws {NotFoundException} 404 - If section not found
 * @throws {UnauthorizedException} 401 - If JWT token is invalid or missing
 */
 @Get(':id')
 @ApiOperation({ summary: 'Obter seção por ID' })
 @ApiResponse({ status: 200, description: 'Dados da seção' })
 @ApiResponse({ status: 404, description: 'Seção não encontrada' })
 async findOne(@Param('id') id: string) {
 const section = await this.sectionsService.findOne(id);
 return {
 data: section,
 disclaimer: DISCLAIMER,
 };
 }

 /**
 * Retrieves the status of an async section generation job.
 *
 * @remarks
 * This endpoint allows clients to poll the progress of asynchronous section
 * generation jobs. It returns real-time status, progress percentage, and
 * completion/error information.
 *
 * **Polling Strategy:**
 * - Poll every 2-3 seconds while status is 'waiting' or 'active'
 * - Stop polling when status is 'completed' or 'failed'
 * - Progress ranges from 0-100
 *
 * **Job Lifecycle:**
 * - waiting: Job queued but not yet processing
 * - active: Job currently being processed (check progress)
 * - completed: Job finished successfully (result available)
 * - failed: Job failed after all retry attempts (error available)
 *
 * @param jobId - BullMQ job identifier (returned from generateSection)
 * @returns Job status with progress, result, and metadata
 * @throws {NotFoundException} 404 - If job not found or expired
 * @throws {UnauthorizedException} 401 - If JWT token is invalid or missing
 * @see #186 - Async queue processing
 * @see #391 - Job Status API
 */
 @Get('jobs/:jobId')
 @ApiOperation({
 summary: 'Obter status de job de geração',
 description:
 'Consulta o status de um job de geração assíncrona. Use para polling de progresso.',
 })
 @ApiResponse({
 status: 200,
 description: 'Status do job retornado com sucesso',
 })
 @ApiResponse({
 status: 404,
 description: 'Job não encontrado ou expirado',
 })
 async getJobStatus(@Param('jobId') jobId: string) {
 const jobStatus = await this.sectionsService.getJobStatus(jobId);
 return {
 data: jobStatus,
 disclaimer: DISCLAIMER,
 };
 }

 /**
 * Updates a section manually (user edits).
 *
 * @param id - Section unique identifier (UUID)
 * @param updateDto - Partial section update data (content, status, etc.)
 * @param organizationId - Organization ID for tenancy validation (Issue #758)
 * @returns Updated section entity with disclaimer message
 * @throws {NotFoundException} 404 - If section not found
 * @throws {BadRequestException} 400 - If validation fails
 * @throws {UnauthorizedException} 401 - If JWT token is invalid or missing
 */
 @Patch(':id')
 @ApiOperation({ summary: 'Atualizar seção manualmente' })
 @ApiResponse({ status: 200, description: 'Seção atualizada com sucesso' })
 @ApiResponse({ status: 404, description: 'Seção não encontrada' })
 async update(
 @Param('id') id: string,
 @Body() updateDto: UpdateSectionDto,
 @CurrentUser('organizationId') organizationId: string,
 ) {
 const section = await this.sectionsService.update(
 id,
 updateDto,
 organizationId,
 );
 return {
 data: section,
 disclaimer: DISCLAIMER,
 };
 }

 /**
 * Regenerates section content using AI orchestration.
 *
 * @remarks
 * Replaces existing section content with fresh AI-generated content.
 * Generation typically takes 30-60 seconds.
 *
 * **Rate Limiting (Issue #38):**
 * - Limit: 5 requests per 60 seconds (1 minute) per authenticated user
 * - Tracker: User ID (not IP address)
 * - Prevents abuse of OpenAI API costs
 *
 * @param id - Section unique identifier (UUID)
 * @param userId - Current user ID (extracted from JWT token)
 * @returns Regenerated section entity with new content and disclaimer message
 * @throws {NotFoundException} 404 - If section not found
 * @throws {UnauthorizedException} 401 - If JWT token is invalid or missing
 * @throws {ThrottlerException} 429 - If rate limit exceeded (5 req/min)
 */
 @Post(':id/regenerate')
 @UseGuards(UserThrottlerGuard)
 @Throttle({ default: { limit: 5, ttl: 60000 } }) // 5 requests per 60 seconds per user
 @ApiOperation({
 summary: 'Regenerar seção com IA',
 description:
 'Regenera o conteúdo da seção usando IA. Limite: 5 regenerações por minuto por usuário.',
 })
 @ApiResponse({ status: 200, description: 'Seção regenerada com sucesso' })
 @ApiResponse({ status: 404, description: 'Seção não encontrada' })
 @ApiResponse({
 status: 429,
 description:
 'Limite de requisições excedido (5 regenerações por minuto por usuário)',
 })
 async regenerate(
 @Param('id') id: string,
 @CurrentUser('id') userId: string,
 @CurrentUser('organizationId') organizationId: string,
 ) {
 const section = await this.sectionsService.regenerateSection(
 id,
 userId,
 organizationId,
 );
 return {
 data: section,
 disclaimer: DISCLAIMER,
 };
 }

 /**
 * Validates section content using AI validation agents.
 *
 * @remarks
 * Executes all configured validation agents to check section quality,
 * compliance, and accuracy.
 *
 * @param id - Section unique identifier (UUID)
 * @returns Validation results from all agents
 * @throws {NotFoundException} 404 - If section not found
 * @throws {UnauthorizedException} 401 - If JWT token is invalid or missing
 */
 @Post(':id/validate')
 @ApiOperation({
 summary: 'Validar seção',
 description: 'Executa todos os agentes de validação no conteúdo da seção',
 })
 @ApiResponse({ status: 200, description: 'Validação concluída' })
 @ApiResponse({ status: 404, description: 'Seção não encontrada' })
 async validate(@Param('id') id: string) {
 return this.sectionsService.validateSection(id);
 }

 /**
 * Deletes a section.
 *
 * @param id - Section unique identifier (UUID)
 * @param userId - Current user ID (extracted from JWT token)
 * @returns Success message with disclaimer
 * @throws {NotFoundException} 404 - If section not found
 * @throws {UnauthorizedException} 401 - If JWT token is invalid or missing
 */
 @Delete(':id')
 @ApiOperation({ summary: 'Deletar seção' })
 @ApiResponse({ status: 200, description: 'Seção deletada com sucesso' })
 @ApiResponse({ status: 404, description: 'Seção não encontrada' })
 async remove(
 @Param('id') id: string,
 @CurrentUser('id') userId: string,
 @CurrentUser('organizationId') organizationId: string,
 ) {
 await this.sectionsService.remove(id, userId, organizationId);
 return {
 message: 'Seção deletada com sucesso',
 disclaimer: DISCLAIMER,
 };
 }
}
