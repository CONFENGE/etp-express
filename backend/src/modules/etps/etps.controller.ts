import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
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
import { PaginationDto } from '../../common/dto/pagination.dto';
import { EtpStatus } from '../../entities/etp.entity';

@ApiTags('etps')
@Controller('etps')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class EtpsController {
  constructor(private readonly etpsService: EtpsService) {}

  @Post()
  @ApiOperation({ summary: 'Criar novo ETP' })
  @ApiResponse({ status: 201, description: 'ETP criado com sucesso' })
  @ApiResponse({ status: 401, description: 'Não autenticado' })
  async create(
    @Body() createEtpDto: CreateEtpDto,
    @CurrentUser('id') userId: string,
  ) {
    const etp = await this.etpsService.create(createEtpDto, userId);
    return {
      data: etp,
      disclaimer:
        'O ETP Express pode cometer erros. Lembre-se de verificar todas as informações antes de realizar qualquer encaminhamento.',
    };
  }

  @Get()
  @ApiOperation({ summary: 'Listar ETPs com paginação' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Lista de ETPs' })
  async findAll(
    @Query() paginationDto: PaginationDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.etpsService.findAll(paginationDto, userId);
  }

  @Get('statistics')
  @ApiOperation({ summary: 'Obter estatísticas dos ETPs' })
  @ApiResponse({ status: 200, description: 'Estatísticas' })
  async getStatistics(@CurrentUser('id') userId: string) {
    const stats = await this.etpsService.getStatistics(userId);
    return {
      data: stats,
      disclaimer:
        'O ETP Express pode cometer erros. Lembre-se de verificar todas as informações antes de realizar qualquer encaminhamento.',
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obter ETP por ID' })
  @ApiResponse({ status: 200, description: 'Dados do ETP' })
  @ApiResponse({ status: 404, description: 'ETP não encontrado' })
  async findOne(@Param('id') id: string, @CurrentUser('id') userId: string) {
    const etp = await this.etpsService.findOne(id, userId);
    return {
      data: etp,
      disclaimer:
        'O ETP Express pode cometer erros. Lembre-se de verificar todas as informações antes de realizar qualquer encaminhamento.',
    };
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Atualizar ETP' })
  @ApiResponse({ status: 200, description: 'ETP atualizado com sucesso' })
  @ApiResponse({ status: 404, description: 'ETP não encontrado' })
  @ApiResponse({ status: 403, description: 'Sem permissão' })
  async update(
    @Param('id') id: string,
    @Body() updateEtpDto: UpdateEtpDto,
    @CurrentUser('id') userId: string,
  ) {
    const etp = await this.etpsService.update(id, updateEtpDto, userId);
    return {
      data: etp,
      disclaimer:
        'O ETP Express pode cometer erros. Lembre-se de verificar todas as informações antes de realizar qualquer encaminhamento.',
    };
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Atualizar status do ETP' })
  @ApiResponse({ status: 200, description: 'Status atualizado com sucesso' })
  async updateStatus(
    @Param('id') id: string,
    @Body('status') status: EtpStatus,
    @CurrentUser('id') userId: string,
  ) {
    const etp = await this.etpsService.updateStatus(id, status, userId);
    return {
      data: etp,
      disclaimer:
        'O ETP Express pode cometer erros. Lembre-se de verificar todas as informações antes de realizar qualquer encaminhamento.',
    };
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Deletar ETP' })
  @ApiResponse({ status: 200, description: 'ETP deletado com sucesso' })
  @ApiResponse({ status: 404, description: 'ETP não encontrado' })
  @ApiResponse({ status: 403, description: 'Sem permissão' })
  async remove(@Param('id') id: string, @CurrentUser('id') userId: string) {
    await this.etpsService.remove(id, userId);
    return {
      message: 'ETP deletado com sucesso',
      disclaimer:
        'O ETP Express pode cometer erros. Lembre-se de verificar todas as informações antes de realizar qualquer encaminhamento.',
    };
  }
}
