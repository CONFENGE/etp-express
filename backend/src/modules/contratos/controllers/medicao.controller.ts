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
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { MedicaoService } from '../services/medicao.service';
import { CreateMedicaoDto } from '../dto/create-medicao.dto';
import { UpdateMedicaoDto } from '../dto/update-medicao.dto';
import { Medicao } from '../../../entities/medicao.entity';

/**
 * Controller para gerenciar Medições de Contratos.
 *
 * **Endpoints:**
 * - POST /contracts/:id/medicoes - Criar medição
 * - GET /contracts/:id/medicoes - Listar medições do contrato
 * - GET /medicoes/:id - Detalhe de medição
 * - PATCH /medicoes/:id - Atualizar medição
 * - DELETE /medicoes/:id - Remover medição
 *
 * **Autenticação:** Todos os endpoints requerem JWT
 *
 * **Permissões:**
 * - Criar/editar/remover: apenas fiscal responsável do contrato
 * - Listar/visualizar: qualquer usuário autenticado
 *
 * **Issue #1641** - [FISC-1286a] Create Medicao entity and CRUD endpoints
 *
 * @see Lei 14.133/2021 Art. 117 - Fiscalização de contratos
 */
@ApiTags('Medições de Contratos')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller()
export class MedicaoController {
  constructor(private readonly medicaoService: MedicaoService) {}

  @Post('contracts/:id/medicoes')
  @ApiOperation({
    summary: 'Criar nova medição para contrato',
    description:
      'Registra uma nova medição de execução contratual. Apenas o fiscal responsável pode criar medições.',
  })
  @ApiParam({
    name: 'id',
    description: 'UUID do contrato',
    example: 'e3b0c442-98fc-1c14-b39f-92d1282c1e48',
  })
  @ApiResponse({
    status: 201,
    description: 'Medição criada com sucesso',
    type: Medicao,
  })
  @ApiResponse({
    status: 400,
    description: 'Validação falhou (valor excede saldo ou período sobrepõe)',
  })
  @ApiResponse({
    status: 403,
    description: 'Usuário não é fiscal do contrato',
  })
  @ApiResponse({
    status: 404,
    description: 'Contrato não encontrado',
  })
  async create(
    @Param('id') contratoId: string,
    @Body() createDto: CreateMedicaoDto,
    @Request() req,
  ): Promise<Medicao> {
    return this.medicaoService.create(contratoId, createDto, req.user.sub);
  }

  @Get('contracts/:id/medicoes')
  @ApiOperation({
    summary: 'Listar medições do contrato',
    description: 'Retorna todas as medições de um contrato, ordenadas por número sequencial.',
  })
  @ApiParam({
    name: 'id',
    description: 'UUID do contrato',
    example: 'e3b0c442-98fc-1c14-b39f-92d1282c1e48',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de medições',
    type: [Medicao],
  })
  async findAllByContrato(
    @Param('id') contratoId: string,
  ): Promise<Medicao[]> {
    return this.medicaoService.findAllByContrato(contratoId);
  }

  @Get('medicoes/:id')
  @ApiOperation({
    summary: 'Buscar medição por ID',
    description: 'Retorna os detalhes de uma medição específica.',
  })
  @ApiParam({
    name: 'id',
    description: 'UUID da medição',
    example: 'e3b0c442-98fc-1c14-b39f-92d1282c1e48',
  })
  @ApiResponse({
    status: 200,
    description: 'Detalhes da medição',
    type: Medicao,
  })
  @ApiResponse({
    status: 404,
    description: 'Medição não encontrada',
  })
  async findOne(@Param('id') id: string): Promise<Medicao> {
    return this.medicaoService.findOne(id);
  }

  @Patch('medicoes/:id')
  @ApiOperation({
    summary: 'Atualizar medição',
    description:
      'Atualiza uma medição existente. Apenas medições PENDENTE ou REJEITADA podem ser editadas.',
  })
  @ApiParam({
    name: 'id',
    description: 'UUID da medição',
    example: 'e3b0c442-98fc-1c14-b39f-92d1282c1e48',
  })
  @ApiResponse({
    status: 200,
    description: 'Medição atualizada com sucesso',
    type: Medicao,
  })
  @ApiResponse({
    status: 400,
    description: 'Medição aprovada não pode ser editada',
  })
  @ApiResponse({
    status: 403,
    description: 'Usuário não é fiscal do contrato',
  })
  @ApiResponse({
    status: 404,
    description: 'Medição não encontrada',
  })
  async update(
    @Param('id') id: string,
    @Body() updateDto: UpdateMedicaoDto,
    @Request() req,
  ): Promise<Medicao> {
    return this.medicaoService.update(id, updateDto, req.user.sub);
  }

  @Delete('medicoes/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Remover medição',
    description:
      'Remove uma medição. Apenas medições PENDENTE podem ser removidas.',
  })
  @ApiParam({
    name: 'id',
    description: 'UUID da medição',
    example: 'e3b0c442-98fc-1c14-b39f-92d1282c1e48',
  })
  @ApiResponse({
    status: 204,
    description: 'Medição removida com sucesso',
  })
  @ApiResponse({
    status: 400,
    description: 'Apenas medições pendentes podem ser removidas',
  })
  @ApiResponse({
    status: 403,
    description: 'Usuário não é fiscal do contrato',
  })
  @ApiResponse({
    status: 404,
    description: 'Medição não encontrada',
  })
  async remove(@Param('id') id: string, @Request() req): Promise<void> {
    return this.medicaoService.remove(id, req.user.sub);
  }
}
