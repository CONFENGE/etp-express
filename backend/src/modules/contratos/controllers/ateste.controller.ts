import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { AtesteService } from '../services/ateste.service';
import { CreateAtesteDto } from '../dto/create-ateste.dto';
import { UpdateAtesteDto } from '../dto/update-ateste.dto';
import { Ateste } from '../../../entities/ateste.entity';

/**
 * Controller para gerenciar Atestes de Medições.
 *
 * **Endpoints:**
 * - POST /medicoes/:id/ateste - Criar ateste para medição
 * - GET /atestes/:id - Detalhe de ateste
 * - PATCH /atestes/:id - Atualizar ateste
 *
 * **Workflow:**
 * 1. Fiscal registra medição (via MedicaoController)
 * 2. Gestor/Fiscal atesta medição (via POST /medicoes/:id/ateste)
 * 3. Se APROVADO → medição atualiza para 'aprovada'
 * 4. Se REJEITADO → medição volta para 'pendente' (correção)
 * 5. Se APROVADO_COM_RESSALVAS → medição aprovada com valor ajustado
 *
 * **Autenticação:** Todos os endpoints requerem JWT
 *
 * **Permissões:**
 * - Criar/editar ateste: apenas fiscal responsável do contrato
 * - Visualizar: qualquer usuário autenticado
 *
 * **Issue #1643** - [FISC-1286c] Create Ateste entity and approval workflow
 *
 * @see Lei 14.133/2021 Art. 117 - Fiscalização de contratos
 * @see Lei 14.133/2021 Art. 140 - Atesto de execução
 */
@ApiTags('Atestes de Medições')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller()
export class AtesteController {
  constructor(private readonly atesteService: AtesteService) {}

  @Post('medicoes/:id/ateste')
  @ApiOperation({
    summary: 'Criar ateste para medição',
    description:
      'Realiza o ateste formal de uma medição. Atualiza automaticamente o status da medição conforme resultado (aprovado/rejeitado/aprovado com ressalvas).',
  })
  @ApiParam({
    name: 'id',
    description: 'UUID da medição a ser atestada',
    example: 'e3b0c442-98fc-1c14-b39f-92d1282c1e48',
  })
  @ApiResponse({
    status: 201,
    description: 'Ateste criado com sucesso e medição atualizada',
    type: Ateste,
  })
  @ApiResponse({
    status: 400,
    description:
      'Validação falhou (medição já atestada, valor atestado inválido, ou justificativa faltante)',
  })
  @ApiResponse({
    status: 403,
    description: 'Usuário não é fiscal responsável',
  })
  @ApiResponse({
    status: 404,
    description: 'Medição não encontrada',
  })
  async create(
    @Param('id') medicaoId: string,
    @Body() createDto: CreateAtesteDto,
    @Request() req: { user: { sub: string } },
  ): Promise<Ateste> {
    return this.atesteService.create(medicaoId, createDto, req.user.sub);
  }

  @Get('atestes/:id')
  @ApiOperation({
    summary: 'Buscar ateste por ID',
    description: 'Retorna os detalhes de um ateste específico.',
  })
  @ApiParam({
    name: 'id',
    description: 'UUID do ateste',
    example: 'e3b0c442-98fc-1c14-b39f-92d1282c1e48',
  })
  @ApiResponse({
    status: 200,
    description: 'Detalhes do ateste',
    type: Ateste,
  })
  @ApiResponse({
    status: 404,
    description: 'Ateste não encontrado',
  })
  async findOne(@Param('id') id: string): Promise<Ateste> {
    return this.atesteService.findOne(id);
  }

  @Patch('atestes/:id')
  @ApiOperation({
    summary: 'Atualizar ateste',
    description:
      'Atualiza um ateste existente. Permite ajustes antes da finalização.',
  })
  @ApiParam({
    name: 'id',
    description: 'UUID do ateste',
    example: 'e3b0c442-98fc-1c14-b39f-92d1282c1e48',
  })
  @ApiResponse({
    status: 200,
    description: 'Ateste atualizado com sucesso',
    type: Ateste,
  })
  @ApiResponse({
    status: 400,
    description: 'Validação falhou (valor atestado inválido)',
  })
  @ApiResponse({
    status: 403,
    description: 'Usuário não é fiscal responsável',
  })
  @ApiResponse({
    status: 404,
    description: 'Ateste não encontrado',
  })
  async update(
    @Param('id') id: string,
    @Body() updateDto: UpdateAtesteDto,
    @Request() req: { user: { sub: string } },
  ): Promise<Ateste> {
    return this.atesteService.update(id, updateDto, req.user.sub);
  }
}
