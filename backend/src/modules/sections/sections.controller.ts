import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { SectionsService } from './sections.service';
import { GenerateSectionDto } from './dto/generate-section.dto';
import { UpdateSectionDto } from './dto/update-section.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

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
  constructor(private readonly sectionsService: SectionsService) {}

  /**
   * Generates a new ETP section using AI orchestration.
   *
   * @remarks
   * This endpoint invokes the AI orchestrator to generate section content
   * using multiple specialized agents. Generation typically takes 30-60 seconds.
   *
   * @param etpId - ETP unique identifier (UUID)
   * @param generateDto - Section generation parameters (sectionKey, etc.)
   * @param userId - Current user ID (extracted from JWT token)
   * @returns Generated section entity with AI content and disclaimer message
   * @throws {NotFoundException} 404 - If ETP not found
   * @throws {BadRequestException} 400 - If section already exists or data invalid
   * @throws {UnauthorizedException} 401 - If JWT token is invalid or missing
   */
  @Post('etp/:etpId/generate')
  @ApiOperation({
    summary: 'Gerar nova seção com IA',
    description:
      'Gera uma nova seção do ETP usando o sistema de orquestração de agentes IA',
  })
  @ApiResponse({ status: 201, description: 'Seção gerada com sucesso' })
  @ApiResponse({
    status: 400,
    description: 'Seção já existe ou dados inválidos',
  })
  @ApiResponse({ status: 404, description: 'ETP não encontrado' })
  async generateSection(
    @Param('etpId') etpId: string,
    @Body() generateDto: GenerateSectionDto,
    @CurrentUser('id') userId: string,
  ) {
    const section = await this.sectionsService.generateSection(
      etpId,
      generateDto,
      userId,
    );
    return {
      data: section,
      disclaimer:
        'O ETP Express pode cometer erros. Lembre-se de verificar todas as informações antes de realizar qualquer encaminhamento.',
    };
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
      disclaimer:
        'O ETP Express pode cometer erros. Lembre-se de verificar todas as informações antes de realizar qualquer encaminhamento.',
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
      disclaimer:
        'O ETP Express pode cometer erros. Lembre-se de verificar todas as informações antes de realizar qualquer encaminhamento.',
    };
  }

  /**
   * Updates a section manually (user edits).
   *
   * @param id - Section unique identifier (UUID)
   * @param updateDto - Partial section update data (content, status, etc.)
   * @returns Updated section entity with disclaimer message
   * @throws {NotFoundException} 404 - If section not found
   * @throws {BadRequestException} 400 - If validation fails
   * @throws {UnauthorizedException} 401 - If JWT token is invalid or missing
   */
  @Patch(':id')
  @ApiOperation({ summary: 'Atualizar seção manualmente' })
  @ApiResponse({ status: 200, description: 'Seção atualizada com sucesso' })
  @ApiResponse({ status: 404, description: 'Seção não encontrada' })
  async update(@Param('id') id: string, @Body() updateDto: UpdateSectionDto) {
    const section = await this.sectionsService.update(id, updateDto);
    return {
      data: section,
      disclaimer:
        'O ETP Express pode cometer erros. Lembre-se de verificar todas as informações antes de realizar qualquer encaminhamento.',
    };
  }

  /**
   * Regenerates section content using AI orchestration.
   *
   * @remarks
   * Replaces existing section content with fresh AI-generated content.
   * Generation typically takes 30-60 seconds.
   *
   * @param id - Section unique identifier (UUID)
   * @param userId - Current user ID (extracted from JWT token)
   * @returns Regenerated section entity with new content and disclaimer message
   * @throws {NotFoundException} 404 - If section not found
   * @throws {UnauthorizedException} 401 - If JWT token is invalid or missing
   */
  @Post(':id/regenerate')
  @ApiOperation({
    summary: 'Regenerar seção com IA',
    description: 'Regenera o conteúdo da seção usando IA',
  })
  @ApiResponse({ status: 200, description: 'Seção regenerada com sucesso' })
  @ApiResponse({ status: 404, description: 'Seção não encontrada' })
  async regenerate(@Param('id') id: string, @CurrentUser('id') userId: string) {
    const section = await this.sectionsService.regenerateSection(id, userId);
    return {
      data: section,
      disclaimer:
        'O ETP Express pode cometer erros. Lembre-se de verificar todas as informações antes de realizar qualquer encaminhamento.',
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
  async remove(@Param('id') id: string, @CurrentUser('id') userId: string) {
    await this.sectionsService.remove(id, userId);
    return {
      message: 'Seção deletada com sucesso',
      disclaimer:
        'O ETP Express pode cometer erros. Lembre-se de verificar todas as informações antes de realizar qualquer encaminhamento.',
    };
  }
}
