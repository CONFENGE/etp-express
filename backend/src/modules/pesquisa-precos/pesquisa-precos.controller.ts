import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  HttpStatus,
  HttpCode,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { PesquisaPrecosService } from './pesquisa-precos.service';
import { CreatePesquisaPrecosDto, UpdatePesquisaPrecosDto } from './dto';
import {
  PesquisaPrecos,
  PesquisaPrecosStatus,
} from '../../entities/pesquisa-precos.entity';

/**
 * Interface para usuario autenticado extraido do JWT.
 */
interface AuthenticatedUser {
  id: string;
  organizationId: string;
  email: string;
  role: string;
}

/**
 * Controller para Pesquisas de Precos.
 *
 * Endpoints:
 * - POST /pesquisas-precos - Criar nova pesquisa
 * - GET /pesquisas-precos - Listar pesquisas
 * - GET /pesquisas-precos/:id - Buscar pesquisa por ID
 * - PATCH /pesquisas-precos/:id - Atualizar pesquisa
 * - DELETE /pesquisas-precos/:id - Remover pesquisa
 *
 * @see Issue #1255 - [Pesquisa-a] Criar entity PesquisaPrecos
 * Parent: #1254 - [Pesquisa] Modulo de Pesquisa de Precos - EPIC
 */
@ApiTags('pesquisas-precos')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('pesquisas-precos')
export class PesquisaPrecosController {
  constructor(private readonly pesquisaPrecosService: PesquisaPrecosService) {}

  /**
   * Cria uma nova pesquisa de precos.
   */
  @Post()
  @ApiOperation({ summary: 'Criar nova pesquisa de precos' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Pesquisa criada com sucesso',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Dados invalidos',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'ETP ou TR vinculado nao encontrado',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Sem permissao para vincular ETP/TR de outra organizacao',
  })
  async create(
    @Body() dto: CreatePesquisaPrecosDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<PesquisaPrecos> {
    return this.pesquisaPrecosService.create(dto, user.id, user.organizationId);
  }

  /**
   * Lista pesquisas de precos da organizacao.
   */
  @Get()
  @ApiOperation({ summary: 'Listar pesquisas de precos' })
  @ApiQuery({
    name: 'etpId',
    required: false,
    description: 'Filtrar por ETP vinculado',
  })
  @ApiQuery({
    name: 'termoReferenciaId',
    required: false,
    description: 'Filtrar por TR vinculado',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: PesquisaPrecosStatus,
    description: 'Filtrar por status',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Lista de pesquisas',
  })
  async findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query('etpId') etpId?: string,
    @Query('termoReferenciaId') termoReferenciaId?: string,
    @Query('status') status?: PesquisaPrecosStatus,
  ): Promise<PesquisaPrecos[]> {
    return this.pesquisaPrecosService.findAll(
      user.organizationId,
      etpId,
      termoReferenciaId,
      status,
    );
  }

  /**
   * Busca uma pesquisa de precos por ID.
   */
  @Get(':id')
  @ApiOperation({ summary: 'Buscar pesquisa de precos por ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Pesquisa encontrada',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Pesquisa nao encontrada',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Sem permissao para acessar esta pesquisa',
  })
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<PesquisaPrecos> {
    return this.pesquisaPrecosService.findOne(id, user.organizationId);
  }

  /**
   * Atualiza uma pesquisa de precos.
   */
  @Patch(':id')
  @ApiOperation({ summary: 'Atualizar pesquisa de precos' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Pesquisa atualizada com sucesso',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Pesquisa nao encontrada',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Sem permissao para atualizar esta pesquisa',
  })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePesquisaPrecosDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<PesquisaPrecos> {
    return this.pesquisaPrecosService.update(id, dto, user.organizationId);
  }

  /**
   * Remove uma pesquisa de precos.
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remover pesquisa de precos' })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'Pesquisa removida com sucesso',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Pesquisa nao encontrada',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Sem permissao para remover esta pesquisa',
  })
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<void> {
    return this.pesquisaPrecosService.remove(id, user.organizationId);
  }
}
