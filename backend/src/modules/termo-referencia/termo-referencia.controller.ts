import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Body,
  Param,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { TermoReferenciaService } from './termo-referencia.service';
import {
  CreateTermoReferenciaDto,
  UpdateTermoReferenciaDto,
  GenerateTrResponseDto,
} from './dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '../../entities/user.entity';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TermoReferencia } from '../../entities/termo-referencia.entity';

/**
 * Controller para Termos de Referencia.
 *
 * Endpoints:
 * - POST /termo-referencia - Criar novo TR
 * - GET /termo-referencia - Listar TRs da organizacao
 * - GET /termo-referencia/etp/:etpId - Listar TRs de um ETP
 * - GET /termo-referencia/:id - Buscar TR por ID
 * - PATCH /termo-referencia/:id - Atualizar TR
 * - DELETE /termo-referencia/:id - Remover TR
 *
 * Seguranca:
 * - JwtAuthGuard: Todos endpoints requerem JWT valido
 * - Multi-tenancy: Operacoes restritas a organizacao do usuario
 *
 * Issue #1248 - [TR-a] Criar entity TermoReferencia e relacionamentos
 * Parent: #1247 - [TR] Modulo de Termo de Referencia - EPIC
 */
@ApiTags('Termo de Referencia')
@ApiBearerAuth()
@Controller('termo-referencia')
@UseGuards(JwtAuthGuard)
export class TermoReferenciaController {
  constructor(
    private readonly termoReferenciaService: TermoReferenciaService,
  ) {}

  /**
   * Cria um novo Termo de Referencia.
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Criar Termo de Referencia',
    description: 'Cria um novo TR a partir de um ETP existente.',
  })
  @ApiResponse({
    status: 201,
    description: 'TR criado com sucesso',
    type: TermoReferencia,
  })
  @ApiResponse({
    status: 404,
    description: 'ETP nao encontrado',
  })
  @ApiResponse({
    status: 403,
    description: 'Sem permissao para criar TR para este ETP',
  })
  async create(
    @Body() dto: CreateTermoReferenciaDto,
    @CurrentUser() user: User,
  ): Promise<TermoReferencia> {
    return this.termoReferenciaService.create(
      dto,
      user.id,
      user.organizationId,
    );
  }

  /**
   * Gera um Termo de Referencia automaticamente a partir de um ETP.
   *
   * Processo:
   * 1. Valida que o ETP existe e pertence a organizacao do usuario
   * 2. Valida que o ETP esta com status 'completed' ou 'review'
   * 3. Mapeia campos do ETP para estrutura do TR
   * 4. Enriquece textos com IA (obrigacoes, modelo de gestao, sancoes)
   * 5. Cria o TR vinculado ao ETP
   *
   * Issue #1249 - [TR-b] Implementar geracao automatica TR a partir do ETP
   * Parent: #1247 - [TR] Modulo de Termo de Referencia - EPIC
   */
  @Post('generate/:etpId')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Gerar TR a partir de ETP',
    description:
      'Gera automaticamente um Termo de Referencia a partir de um ETP aprovado, ' +
      'incluindo enriquecimento de textos via IA.',
  })
  @ApiParam({
    name: 'etpId',
    description: 'ID do ETP de origem',
    type: 'string',
  })
  @ApiResponse({
    status: 201,
    description: 'TR gerado com sucesso',
    type: GenerateTrResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'ETP nao esta com status aprovado',
  })
  @ApiResponse({
    status: 403,
    description: 'Sem permissao para acessar este ETP',
  })
  @ApiResponse({
    status: 404,
    description: 'ETP nao encontrado',
  })
  async generateFromEtp(
    @Param('etpId', ParseUUIDPipe) etpId: string,
    @CurrentUser() user: User,
  ): Promise<GenerateTrResponseDto> {
    return this.termoReferenciaService.generateFromEtp(
      etpId,
      user.id,
      user.organizationId,
    );
  }

  /**
   * Lista todos os TRs da organizacao do usuario.
   */
  @Get()
  @ApiOperation({
    summary: 'Listar Termos de Referencia',
    description: 'Retorna todos os TRs da organizacao do usuario.',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de TRs',
    type: [TermoReferencia],
  })
  async findAll(@CurrentUser() user: User): Promise<TermoReferencia[]> {
    return this.termoReferenciaService.findAllByOrganization(
      user.organizationId,
    );
  }

  /**
   * Lista TRs de um ETP especifico.
   */
  @Get('etp/:etpId')
  @ApiOperation({
    summary: 'Listar TRs de um ETP',
    description: 'Retorna todos os TRs gerados a partir de um ETP.',
  })
  @ApiParam({
    name: 'etpId',
    description: 'ID do ETP',
    type: 'string',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de TRs do ETP',
    type: [TermoReferencia],
  })
  async findByEtp(
    @Param('etpId', ParseUUIDPipe) etpId: string,
    @CurrentUser() user: User,
  ): Promise<TermoReferencia[]> {
    return this.termoReferenciaService.findByEtp(etpId, user.organizationId);
  }

  /**
   * Busca um TR por ID.
   */
  @Get(':id')
  @ApiOperation({
    summary: 'Buscar Termo de Referencia',
    description: 'Retorna um TR especifico por ID.',
  })
  @ApiParam({
    name: 'id',
    description: 'ID do Termo de Referencia',
    type: 'string',
  })
  @ApiResponse({
    status: 200,
    description: 'TR encontrado',
    type: TermoReferencia,
  })
  @ApiResponse({
    status: 404,
    description: 'TR nao encontrado',
  })
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ): Promise<TermoReferencia> {
    return this.termoReferenciaService.findOne(id, user.organizationId);
  }

  /**
   * Atualiza um TR existente.
   */
  @Patch(':id')
  @ApiOperation({
    summary: 'Atualizar Termo de Referencia',
    description: 'Atualiza os campos de um TR existente.',
  })
  @ApiParam({
    name: 'id',
    description: 'ID do Termo de Referencia',
    type: 'string',
  })
  @ApiResponse({
    status: 200,
    description: 'TR atualizado',
    type: TermoReferencia,
  })
  @ApiResponse({
    status: 404,
    description: 'TR nao encontrado',
  })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTermoReferenciaDto,
    @CurrentUser() user: User,
  ): Promise<TermoReferencia> {
    return this.termoReferenciaService.update(id, dto, user.organizationId);
  }

  /**
   * Remove um TR.
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Remover Termo de Referencia',
    description: 'Remove permanentemente um TR.',
  })
  @ApiParam({
    name: 'id',
    description: 'ID do Termo de Referencia',
    type: 'string',
  })
  @ApiResponse({
    status: 204,
    description: 'TR removido com sucesso',
  })
  @ApiResponse({
    status: 404,
    description: 'TR nao encontrado',
  })
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ): Promise<void> {
    return this.termoReferenciaService.remove(id, user.organizationId);
  }
}
