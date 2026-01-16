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
  Res,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { Response } from 'express';
import { TermoReferenciaService } from './termo-referencia.service';
import { TrVersionsService } from './tr-versions.service';
import { TermoReferenciaExportService } from '../export/termo-referencia-export.service';
import {
  CreateTermoReferenciaDto,
  UpdateTermoReferenciaDto,
  GenerateTrResponseDto,
} from './dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '../../entities/user.entity';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TermoReferencia } from '../../entities/termo-referencia.entity';
import { DISCLAIMER } from '../../common/constants/messages';

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
    private readonly trVersionsService: TrVersionsService,
    private readonly termoReferenciaExportService: TermoReferenciaExportService,
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

  // ============================================
  // EXPORT ENDPOINTS
  // Issue #1252 - [TR-e] Export TR em PDF/DOCX
  // ============================================

  /**
   * Exporta um TR para PDF.
   *
   * Gera um documento PDF com formatacao oficial conforme Lei 14.133/2021.
   * Inclui cabecalho, sumario, secoes numeradas e rodape com paginacao.
   */
  @Get(':id/export/pdf')
  @ApiOperation({
    summary: 'Exportar TR para PDF',
    description:
      'Gera um documento PDF formatado do Termo de Referencia com layout oficial.',
  })
  @ApiParam({
    name: 'id',
    description: 'ID do Termo de Referencia',
    type: 'string',
  })
  @ApiResponse({
    status: 200,
    description: 'PDF gerado com sucesso',
  })
  @ApiResponse({
    status: 404,
    description: 'TR nao encontrado',
  })
  @ApiResponse({
    status: 500,
    description: 'Erro ao gerar PDF',
  })
  async exportPDF(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
    @Res() res: Response,
  ): Promise<void> {
    const pdfBuffer = await this.termoReferenciaExportService.exportToPDF(
      id,
      user.organizationId,
    );

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="TR-${id}.pdf"`,
      'Content-Length': pdfBuffer.length,
    });

    res.send(pdfBuffer);
  }

  /**
   * Exporta um TR para DOCX.
   *
   * Gera um documento Word editavel com formatacao ABNT NBR.
   * Permite edicao posterior pelo usuario.
   */
  @Get(':id/export/docx')
  @ApiOperation({
    summary: 'Exportar TR para DOCX',
    description:
      'Gera um documento Word (.docx) editavel do Termo de Referencia.',
  })
  @ApiParam({
    name: 'id',
    description: 'ID do Termo de Referencia',
    type: 'string',
  })
  @ApiResponse({
    status: 200,
    description: 'DOCX gerado com sucesso',
  })
  @ApiResponse({
    status: 404,
    description: 'TR nao encontrado',
  })
  async exportDOCX(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
    @Res() res: Response,
  ): Promise<void> {
    const docxBuffer = await this.termoReferenciaExportService.exportToDocx(
      id,
      user.organizationId,
    );

    res.set({
      'Content-Type':
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'Content-Disposition': `attachment; filename="TR-${id}.docx"`,
      'Content-Length': docxBuffer.length,
    });

    res.send(docxBuffer);
  }

  /**
   * Exporta um TR para JSON.
   *
   * Retorna os dados do TR em formato JSON para integracao ou backup.
   */
  @Get(':id/export/json')
  @ApiOperation({
    summary: 'Exportar TR para JSON',
    description:
      'Exporta os dados do Termo de Referencia em formato JSON estruturado.',
  })
  @ApiParam({
    name: 'id',
    description: 'ID do Termo de Referencia',
    type: 'string',
  })
  @ApiResponse({
    status: 200,
    description: 'JSON gerado com sucesso',
  })
  @ApiResponse({
    status: 404,
    description: 'TR nao encontrado',
  })
  async exportJSON(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
    @Res() res: Response,
  ): Promise<void> {
    const jsonData = await this.termoReferenciaExportService.exportToJSON(
      id,
      user.organizationId,
    );

    res.set({
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="TR-${id}.json"`,
    });

    res.json(jsonData);
  }

  /**
   * Preview do TR em PDF (inline no browser).
   *
   * Permite visualizacao previa do PDF sem baixar o arquivo.
   */
  @Get(':id/export/preview')
  @ApiOperation({
    summary: 'Preview do TR em PDF',
    description:
      'Gera um PDF para visualizacao previa no browser (Content-Disposition: inline).',
  })
  @ApiParam({
    name: 'id',
    description: 'ID do Termo de Referencia',
    type: 'string',
  })
  @ApiResponse({
    status: 200,
    description: 'PDF gerado para preview',
  })
  @ApiResponse({
    status: 404,
    description: 'TR nao encontrado',
  })
  async previewPDF(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
    @Res() res: Response,
  ): Promise<void> {
    const pdfBuffer = await this.termoReferenciaExportService.exportToPDF(
      id,
      user.organizationId,
    );

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="TR-${id}-preview.pdf"`,
      'Content-Length': pdfBuffer.length,
      'Cache-Control': 'private, max-age=300',
    });

    res.send(pdfBuffer);
  }

  // ============================================
  // VERSION ENDPOINTS
  // Issue #1253 - [TR-f] Versionamento e historico de TR
  // ============================================

  /**
   * Cria uma nova versao (snapshot) do TR.
   *
   * Cada versao representa um snapshot completo do TR em um momento especifico,
   * permitindo rastreabilidade e restauracao de estados anteriores.
   */
  @Post(':id/versions')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Criar versao do TR',
    description:
      'Cria um snapshot do estado atual do Termo de Referencia para versionamento.',
  })
  @ApiParam({
    name: 'id',
    description: 'ID do Termo de Referencia',
    type: 'string',
  })
  @ApiResponse({
    status: 201,
    description: 'Versao criada com sucesso',
  })
  @ApiResponse({
    status: 404,
    description: 'TR nao encontrado',
  })
  @ApiResponse({
    status: 403,
    description: 'Sem permissao para criar versao deste TR',
  })
  async createVersion(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('changeLog') changeLog: string,
    @CurrentUser() user: User,
  ) {
    // Validate TR belongs to user's organization
    await this.termoReferenciaService.findOne(id, user.organizationId);

    const version = await this.trVersionsService.createVersion(
      id,
      changeLog,
      user.id,
    );
    return {
      data: version,
      disclaimer: DISCLAIMER,
    };
  }

  /**
   * Lista todas as versoes de um TR.
   *
   * Retorna o historico completo de versoes em ordem decrescente.
   */
  @Get(':id/versions')
  @ApiOperation({
    summary: 'Listar versoes do TR',
    description:
      'Lista todas as versoes de um Termo de Referencia em ordem decrescente.',
  })
  @ApiParam({
    name: 'id',
    description: 'ID do Termo de Referencia',
    type: 'string',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de versoes',
  })
  @ApiResponse({
    status: 403,
    description: 'Sem permissao para acessar este TR',
  })
  async getVersions(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ) {
    // Validate TR belongs to user's organization
    await this.termoReferenciaService.findOne(id, user.organizationId);

    const versions = await this.trVersionsService.getVersions(id);
    return {
      data: versions,
      disclaimer: DISCLAIMER,
    };
  }

  /**
   * Busca uma versao especifica por ID.
   */
  @Get(':id/versions/:versionId')
  @ApiOperation({
    summary: 'Obter versao especifica',
    description: 'Retorna os detalhes de uma versao especifica do TR.',
  })
  @ApiParam({
    name: 'id',
    description: 'ID do Termo de Referencia',
    type: 'string',
  })
  @ApiParam({
    name: 'versionId',
    description: 'ID da versao',
    type: 'string',
  })
  @ApiResponse({
    status: 200,
    description: 'Dados da versao',
  })
  @ApiResponse({
    status: 404,
    description: 'Versao nao encontrada',
  })
  @ApiResponse({
    status: 403,
    description: 'Sem permissao para acessar esta versao',
  })
  async getVersion(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('versionId', ParseUUIDPipe) versionId: string,
    @CurrentUser() user: User,
  ) {
    // Validate TR belongs to user's organization
    await this.termoReferenciaService.findOne(id, user.organizationId);

    const version = await this.trVersionsService.getVersion(versionId);
    return {
      data: version,
      disclaimer: DISCLAIMER,
    };
  }

  /**
   * Compara duas versoes de um TR.
   *
   * Retorna as diferencas entre as duas versoes.
   */
  @Get(':id/versions/compare/:versionId1/:versionId2')
  @ApiOperation({
    summary: 'Comparar versoes do TR',
    description: 'Compara duas versoes do TR e retorna as diferencas.',
  })
  @ApiParam({
    name: 'id',
    description: 'ID do Termo de Referencia',
    type: 'string',
  })
  @ApiParam({
    name: 'versionId1',
    description: 'ID da primeira versao',
    type: 'string',
  })
  @ApiParam({
    name: 'versionId2',
    description: 'ID da segunda versao',
    type: 'string',
  })
  @ApiResponse({
    status: 200,
    description: 'Comparacao concluida',
  })
  @ApiResponse({
    status: 404,
    description: 'Versao nao encontrada',
  })
  @ApiResponse({
    status: 403,
    description: 'Sem permissao para acessar estas versoes',
  })
  async compareVersions(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('versionId1', ParseUUIDPipe) versionId1: string,
    @Param('versionId2', ParseUUIDPipe) versionId2: string,
    @CurrentUser() user: User,
  ) {
    // Validate TR belongs to user's organization
    await this.termoReferenciaService.findOne(id, user.organizationId);

    return this.trVersionsService.compareVersions(
      versionId1,
      versionId2,
      user.organizationId,
    );
  }

  /**
   * Restaura um TR para o estado de uma versao anterior.
   *
   * Antes de restaurar, cria automaticamente um backup da versao atual.
   */
  @Post(':id/versions/:versionId/restore')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Restaurar versao do TR',
    description:
      'Restaura o TR para o estado de uma versao anterior. Cria backup da versao atual automaticamente.',
  })
  @ApiParam({
    name: 'id',
    description: 'ID do Termo de Referencia',
    type: 'string',
  })
  @ApiParam({
    name: 'versionId',
    description: 'ID da versao a restaurar',
    type: 'string',
  })
  @ApiResponse({
    status: 200,
    description: 'Versao restaurada com sucesso',
  })
  @ApiResponse({
    status: 404,
    description: 'Versao nao encontrada',
  })
  @ApiResponse({
    status: 403,
    description: 'Sem permissao para restaurar esta versao',
  })
  async restoreVersion(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('versionId', ParseUUIDPipe) versionId: string,
    @CurrentUser() user: User,
  ): Promise<{ data: TermoReferencia; message: string; disclaimer: string }> {
    // Validate TR belongs to user's organization
    await this.termoReferenciaService.findOne(id, user.organizationId);

    const tr = await this.trVersionsService.restoreVersion(versionId, user.id);
    return {
      data: tr,
      message: 'Versao restaurada com sucesso',
      disclaimer: DISCLAIMER,
    };
  }
}
