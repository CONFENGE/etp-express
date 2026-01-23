import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { OcorrenciaService } from '../services/ocorrencia.service';
import { CreateOcorrenciaDto } from '../dto/create-ocorrencia.dto';
import { UpdateOcorrenciaDto } from '../dto/update-ocorrencia.dto';
import { Ocorrencia } from '../../../entities/ocorrencia.entity';

/**
 * Controller para gerenciar Ocorrências de Contratos.
 *
 * **Endpoints:**
 * - POST /contracts/:id/ocorrencias - Registrar ocorrência
 * - GET /contracts/:id/ocorrencias - Listar ocorrências do contrato
 * - GET /ocorrencias/:id - Detalhe de ocorrência
 * - PATCH /ocorrencias/:id - Atualizar ocorrência
 * - DELETE /ocorrencias/:id - Remover ocorrência
 *
 * **Autenticação:** Todos os endpoints requerem JWT
 *
 * **Permissões:**
 * - Criar/editar/remover: apenas fiscal ou gestor responsável do contrato
 * - Listar/visualizar: qualquer usuário autenticado
 *
 * **Issue #1642** - [FISC-1286b] Create Ocorrencia entity and CRUD endpoints
 *
 * @see Lei 14.133/2021 Art. 117 - Fiscalização de contratos
 * @see Lei 14.133/2021 Art. 156 - Sanções administrativas
 */
@ApiTags('Ocorrências de Contratos')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller()
export class OcorrenciaController {
  constructor(private readonly ocorrenciaService: OcorrenciaService) {}

  @Post('contracts/:id/ocorrencias')
  @ApiOperation({
    summary: 'Registrar nova ocorrência para contrato',
    description:
      'Registra um evento, falha ou atraso na execução contratual. Apenas fiscal ou gestor pode registrar ocorrências.',
  })
  @ApiParam({
    name: 'id',
    description: 'UUID do contrato',
    example: 'e3b0c442-98fc-1c14-b39f-92d1282c1e48',
  })
  @ApiResponse({
    status: 201,
    description: 'Ocorrência registrada com sucesso',
    type: Ocorrencia,
  })
  @ApiResponse({
    status: 400,
    description:
      'Validação falhou (descrição muito curta ou gravidade crítica sem ação corretiva)',
  })
  @ApiResponse({
    status: 403,
    description: 'Usuário não é fiscal ou gestor do contrato',
  })
  @ApiResponse({
    status: 404,
    description: 'Contrato não encontrado',
  })
  async create(
    @Param('id') contratoId: string,
    @Body() createDto: CreateOcorrenciaDto,
    @Request() req: { user: { sub: string } },
  ): Promise<Ocorrencia> {
    return this.ocorrenciaService.create(contratoId, createDto, req.user.sub);
  }

  @Get('contracts/:id/ocorrencias')
  @ApiOperation({
    summary: 'Listar ocorrências do contrato',
    description:
      'Retorna todas as ocorrências de um contrato, ordenadas por data de ocorrência (mais recentes primeiro).',
  })
  @ApiParam({
    name: 'id',
    description: 'UUID do contrato',
    example: 'e3b0c442-98fc-1c14-b39f-92d1282c1e48',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de ocorrências',
    type: [Ocorrencia],
  })
  async findAllByContrato(
    @Param('id') contratoId: string,
  ): Promise<Ocorrencia[]> {
    return this.ocorrenciaService.findAllByContrato(contratoId);
  }

  @Get('ocorrencias/:id')
  @ApiOperation({
    summary: 'Buscar ocorrência por ID',
    description: 'Retorna os detalhes de uma ocorrência específica.',
  })
  @ApiParam({
    name: 'id',
    description: 'UUID da ocorrência',
    example: 'e3b0c442-98fc-1c14-b39f-92d1282c1e48',
  })
  @ApiResponse({
    status: 200,
    description: 'Detalhes da ocorrência',
    type: Ocorrencia,
  })
  @ApiResponse({
    status: 404,
    description: 'Ocorrência não encontrada',
  })
  async findOne(@Param('id') id: string): Promise<Ocorrencia> {
    return this.ocorrenciaService.findOne(id);
  }

  @Patch('ocorrencias/:id')
  @ApiOperation({
    summary: 'Atualizar ocorrência',
    description:
      'Atualiza uma ocorrência existente. Apenas fiscal ou gestor pode editar.',
  })
  @ApiParam({
    name: 'id',
    description: 'UUID da ocorrência',
    example: 'e3b0c442-98fc-1c14-b39f-92d1282c1e48',
  })
  @ApiResponse({
    status: 200,
    description: 'Ocorrência atualizada com sucesso',
    type: Ocorrencia,
  })
  @ApiResponse({
    status: 400,
    description: 'Gravidade CRÍTICA sem ação corretiva',
  })
  @ApiResponse({
    status: 403,
    description: 'Usuário não é fiscal ou gestor do contrato',
  })
  @ApiResponse({
    status: 404,
    description: 'Ocorrência não encontrada',
  })
  async update(
    @Param('id') id: string,
    @Body() updateDto: UpdateOcorrenciaDto,
    @Request() req: { user: { sub: string } },
  ): Promise<Ocorrencia> {
    return this.ocorrenciaService.update(id, updateDto, req.user.sub);
  }

  @Delete('ocorrencias/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Remover ocorrência',
    description: 'Remove uma ocorrência. Apenas fiscal ou gestor pode remover.',
  })
  @ApiParam({
    name: 'id',
    description: 'UUID da ocorrência',
    example: 'e3b0c442-98fc-1c14-b39f-92d1282c1e48',
  })
  @ApiResponse({
    status: 204,
    description: 'Ocorrência removida com sucesso',
  })
  @ApiResponse({
    status: 403,
    description: 'Usuário não é fiscal ou gestor do contrato',
  })
  @ApiResponse({
    status: 404,
    description: 'Ocorrência não encontrada',
  })
  async remove(
    @Param('id') id: string,
    @Request() req: { user: { sub: string } },
  ): Promise<void> {
    return this.ocorrenciaService.remove(id, req.user.sub);
  }
}
