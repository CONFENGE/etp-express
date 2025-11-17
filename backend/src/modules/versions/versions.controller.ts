import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { VersionsService } from './versions.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { DISCLAIMER } from '../../common/constants/messages';

@ApiTags('versions')
@Controller('versions')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class VersionsController {
  constructor(private readonly versionsService: VersionsService) {}

  @Post('etp/:etpId')
  @ApiOperation({
    summary: 'Criar nova versão do ETP',
    description: 'Cria um snapshot do estado atual do ETP',
  })
  @ApiResponse({ status: 201, description: 'Versão criada com sucesso' })
  @ApiResponse({ status: 404, description: 'ETP não encontrado' })
  async createVersion(
    @Param('etpId') etpId: string,
    @Body('changeLog') changeLog?: string,
    @CurrentUser('id') userId?: string,
  ) {
    const version = await this.versionsService.createVersion(
      etpId,
      changeLog,
      userId,
    );
    return {
      data: version,
      disclaimer:
        DISCLAIMER,
    };
  }

  @Get('etp/:etpId')
  @ApiOperation({
    summary: 'Listar versões do ETP',
    description: 'Lista todas as versões de um ETP em ordem decrescente',
  })
  @ApiResponse({ status: 200, description: 'Lista de versões' })
  async getVersions(@Param('etpId') etpId: string) {
    const versions = await this.versionsService.getVersions(etpId);
    return {
      data: versions,
      disclaimer:
        DISCLAIMER,
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obter versão específica' })
  @ApiResponse({ status: 200, description: 'Dados da versão' })
  @ApiResponse({ status: 404, description: 'Versão não encontrada' })
  async getVersion(@Param('id') id: string) {
    const version = await this.versionsService.getVersion(id);
    return {
      data: version,
      disclaimer:
        DISCLAIMER,
    };
  }

  @Get('compare/:id1/:id2')
  @ApiOperation({
    summary: 'Comparar duas versões',
    description: 'Compara duas versões e retorna as diferenças',
  })
  @ApiResponse({ status: 200, description: 'Comparação concluída' })
  @ApiResponse({ status: 404, description: 'Versão não encontrada' })
  async compareVersions(@Param('id1') id1: string, @Param('id2') id2: string) {
    return this.versionsService.compareVersions(id1, id2);
  }

  @Post(':id/restore')
  @ApiOperation({
    summary: 'Restaurar versão',
    description: 'Restaura o ETP para o estado de uma versão anterior',
  })
  @ApiResponse({ status: 200, description: 'Versão restaurada com sucesso' })
  @ApiResponse({ status: 404, description: 'Versão não encontrada' })
  async restoreVersion(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ) {
    const etp = await this.versionsService.restoreVersion(id, userId);
    return {
      data: etp,
      message: 'Versão restaurada com sucesso',
      disclaimer:
        DISCLAIMER,
    };
  }
}
