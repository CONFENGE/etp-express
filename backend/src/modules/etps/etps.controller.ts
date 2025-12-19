import {
 Controller,
 Get,
 Post,
 Body,
 Patch,
 Delete,
 UseGuards,
 Query,
} from '@nestjs/common';
import {
 ApiTags,
 ApiOperation,
 ApiResponse,
 ApiBearerAuth,
 ApiQuery,
} from '@nestjs/swagger';
import { EtpsService } from './etps.service';
import { CreateEtpDto } from './dto/create-etp.dto';
import { UpdateEtpDto } from './dto/update-etp.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import {
 RequireOwnership,
 ResourceType,
} from '../../common/decorators/require-ownership.decorator';
import { Resource } from '../../common/decorators/resource.decorator';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { Etp, EtpStatus } from '../../entities/etp.entity';
import { DISCLAIMER } from '../../common/constants/messages';

/**
 * Controller handling ETP (Estudos Técnicos Preliminares) HTTP endpoints.
 *
 * @remarks
 * All endpoints require JWT authentication via JwtAuthGuard.
 * Users can only access and modify their own ETPs (enforced at service layer).
 *
 * Standard HTTP status codes:
 * - 200: Success
 * - 201: Created
 * - 400: Validation error
 * - 401: Unauthorized (missing or invalid JWT)
 * - 403: Forbidden (user doesn't own the ETP)
 * - 404: ETP not found
 */
@ApiTags('etps')
@Controller('etps')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class EtpsController {
 constructor(private readonly etpsService: EtpsService) {}

 /**
 * Creates a new ETP for the authenticated user.
 *
 * @param createEtpDto - ETP creation data (title, description, etc.)
 * @param userId - Current user ID (extracted from JWT token)
 * @returns Created ETP entity with disclaimer message
 * @throws {BadRequestException} 400 - If validation fails
 * @throws {UnauthorizedException} 401 - If JWT token is invalid or missing
 */
 @Post()
 @ApiOperation({ summary: 'Criar novo ETP' })
 @ApiResponse({ status: 201, description: 'ETP criado com sucesso' })
 @ApiResponse({ status: 401, description: 'Não autenticado' })
 async create(
 @Body() createEtpDto: CreateEtpDto,
 @CurrentUser('id') userId: string,
 @CurrentUser('organizationId') organizationId: string,
 ) {
 const etp = await this.etpsService.create(
 createEtpDto,
 userId,
 organizationId,
 );
 return {
 data: etp,
 disclaimer: DISCLAIMER,
 };
 }

 /**
 * Retrieves paginated list of ETPs for the authenticated user.
 *
 * @param paginationDto - Pagination parameters (page, limit)
 * @param userId - Current user ID (extracted from JWT token)
 * @returns Paginated ETP list with metadata
 * @throws {UnauthorizedException} 401 - If JWT token is invalid or missing
 */
 @Get()
 @ApiOperation({ summary: 'Listar ETPs com paginação' })
 @ApiQuery({ name: 'page', required: false, type: Number })
 @ApiQuery({ name: 'limit', required: false, type: Number })
 @ApiResponse({ status: 200, description: 'Lista de ETPs' })
 async findAll(
 @Query() paginationDto: PaginationDto,
 @CurrentUser('organizationId') organizationId: string,
 @CurrentUser('id') userId: string,
 ) {
 return this.etpsService.findAll(paginationDto, organizationId, userId);
 }

 /**
 * Retrieves ETP statistics for the authenticated user.
 *
 * @param userId - Current user ID (extracted from JWT token)
 * @returns ETP statistics (total, by status, etc.) with disclaimer message
 * @throws {UnauthorizedException} 401 - If JWT token is invalid or missing
 */
 @Get('statistics')
 @ApiOperation({ summary: 'Obter estatísticas dos ETPs' })
 @ApiResponse({ status: 200, description: 'Estatísticas' })
 async getStatistics(
 @CurrentUser('organizationId') organizationId: string,
 @CurrentUser('id') userId: string,
 ) {
 const stats = await this.etpsService.getStatistics(organizationId, userId);
 return {
 data: stats,
 disclaimer: DISCLAIMER,
 };
 }

 /**
 * Retrieves a single ETP by ID with all sections.
 *
 * @remarks
 * Uses @RequireOwnership decorator for centralized authorization (#757).
 * Resource is validated and loaded by ResourceOwnershipGuard, then
 * injected via @Resource() decorator - no duplicate DB query needed.
 *
 * @param id - ETP unique identifier (UUID)
 * @returns ETP entity with all related sections and disclaimer message
 * @throws {NotFoundException} 404 - If ETP not found
 * @throws {ForbiddenException} 403 - If user doesn't own this ETP
 * @throws {UnauthorizedException} 401 - If JWT token is invalid or missing
 */
 @Get(':id')
 @RequireOwnership({ resourceType: ResourceType.ETP })
 @ApiOperation({ summary: 'Obter ETP por ID' })
 @ApiResponse({ status: 200, description: 'Dados do ETP' })
 @ApiResponse({ status: 404, description: 'ETP não encontrado' })
 async findOne(@Resource() etp: Etp) {
 // Resource already validated by guard; load sections for dashboard/editor view
 const etpWithSections = await this.etpsService.findOneWithSectionsNoAuth(
 etp.id,
 );
 return {
 data: etpWithSections,
 disclaimer: DISCLAIMER,
 };
 }

 /**
 * Updates an existing ETP.
 *
 * @remarks
 * Uses @RequireOwnership decorator for centralized authorization (#757).
 * Resource is pre-validated by guard; update operates directly on validated entity.
 *
 * @param updateEtpDto - Partial ETP update data
 * @param etp - Pre-validated ETP entity (injected by guard)
 * @returns Updated ETP entity with disclaimer message
 * @throws {NotFoundException} 404 - If ETP not found
 * @throws {ForbiddenException} 403 - If user doesn't own this ETP
 * @throws {BadRequestException} 400 - If validation fails
 * @throws {UnauthorizedException} 401 - If JWT token is invalid or missing
 */
 @Patch(':id')
 @RequireOwnership({ resourceType: ResourceType.ETP })
 @ApiOperation({ summary: 'Atualizar ETP' })
 @ApiResponse({ status: 200, description: 'ETP atualizado com sucesso' })
 @ApiResponse({ status: 404, description: 'ETP não encontrado' })
 @ApiResponse({ status: 403, description: 'Sem permissão' })
 async update(
 @Body() updateEtpDto: UpdateEtpDto,
 @Resource() etp: Etp,
 @CurrentUser('id') userId: string,
 ) {
 const updatedEtp = await this.etpsService.updateDirect(
 etp,
 updateEtpDto,
 userId,
 );
 return {
 data: updatedEtp,
 disclaimer: DISCLAIMER,
 };
 }

 /**
 * Updates ETP status field.
 *
 * @remarks
 * Uses @RequireOwnership decorator for centralized authorization (#757).
 *
 * @param status - New ETP status value
 * @param etp - Pre-validated ETP entity (injected by guard)
 * @returns Updated ETP entity with disclaimer message
 * @throws {NotFoundException} 404 - If ETP not found
 * @throws {ForbiddenException} 403 - If user doesn't own this ETP
 * @throws {BadRequestException} 400 - If status value is invalid
 * @throws {UnauthorizedException} 401 - If JWT token is invalid or missing
 */
 @Patch(':id/status')
 @RequireOwnership({ resourceType: ResourceType.ETP })
 @ApiOperation({ summary: 'Atualizar status do ETP' })
 @ApiResponse({ status: 200, description: 'Status atualizado com sucesso' })
 async updateStatus(
 @Body('status') status: EtpStatus,
 @Resource() etp: Etp,
 @CurrentUser('id') userId: string,
 ) {
 const updatedEtp = await this.etpsService.updateStatusDirect(
 etp,
 status,
 userId,
 );
 return {
 data: updatedEtp,
 disclaimer: DISCLAIMER,
 };
 }

 /**
 * Deletes an ETP and all its sections.
 *
 * @remarks
 * Uses @RequireOwnership decorator for centralized authorization (#757).
 *
 * @param etp - Pre-validated ETP entity (injected by guard)
 * @returns Success message with disclaimer
 * @throws {NotFoundException} 404 - If ETP not found
 * @throws {ForbiddenException} 403 - If user doesn't own this ETP
 * @throws {UnauthorizedException} 401 - If JWT token is invalid or missing
 */
 @Delete(':id')
 @RequireOwnership({ resourceType: ResourceType.ETP })
 @ApiOperation({ summary: 'Deletar ETP' })
 @ApiResponse({ status: 200, description: 'ETP deletado com sucesso' })
 @ApiResponse({ status: 404, description: 'ETP não encontrado' })
 @ApiResponse({ status: 403, description: 'Sem permissão' })
 async remove(@Resource() etp: Etp, @CurrentUser('id') userId: string) {
 await this.etpsService.removeDirect(etp, userId);
 return {
 message: 'ETP deletado com sucesso',
 disclaimer: DISCLAIMER,
 };
 }
}
