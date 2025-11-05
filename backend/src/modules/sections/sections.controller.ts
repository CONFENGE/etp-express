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

@ApiTags('sections')
@Controller('sections')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class SectionsController {
  constructor(private readonly sectionsService: SectionsService) {}

  @Post('etp/:etpId/generate')
  @ApiOperation({
    summary: 'Gerar nova seção com IA',
    description: 'Gera uma nova seção do ETP usando o sistema de orquestração de agentes IA',
  })
  @ApiResponse({ status: 201, description: 'Seção gerada com sucesso' })
  @ApiResponse({ status: 400, description: 'Seção já existe ou dados inválidos' })
  @ApiResponse({ status: 404, description: 'ETP não encontrado' })
  async generateSection(
    @Param('etpId') etpId: string,
    @Body() generateDto: GenerateSectionDto,
    @CurrentUser('id') userId: string,
  ) {
    const section = await this.sectionsService.generateSection(etpId, generateDto, userId);
    return {
      data: section,
      disclaimer:
        'O ETP Express pode cometer erros. Lembre-se de verificar todas as informações antes de realizar qualquer encaminhamento.',
    };
  }

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
