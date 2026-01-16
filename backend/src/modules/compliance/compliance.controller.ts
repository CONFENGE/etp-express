import {
  Controller,
  Get,
  Param,
  Query,
  Res,
  UseGuards,
  Logger,
  NotFoundException,
  ParseUUIDPipe,
  ForbiddenException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
  ApiProduces,
} from '@nestjs/swagger';
import { Response } from 'express';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ComplianceValidationService } from './compliance-validation.service';
import { ComplianceReportService } from './compliance-report.service';
import { DISCLAIMER } from '../../common/constants/messages';
import {
  ComplianceValidationResultDto,
  ComplianceScoreSummaryDto,
  ComplianceSuggestionDto,
} from './dto/compliance-api.dto';
import {
  ComplianceChecklistDto,
  ComplianceChecklistQueryDto,
  ValidateEtpQueryDto,
} from './dto/compliance-checklist.dto';
import {
  ComplianceReportDto,
  ValidationHistoryEntryDto,
} from './dto/compliance-report.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Etp } from '../../entities/etp.entity';
import { EtpTemplateType } from '../../entities/etp-template.entity';

/**
 * Controller para endpoints REST de validacao de conformidade TCU/TCE.
 *
 * Expoe endpoints para validar ETPs contra checklists de conformidade
 * e obter scores, sugestoes e detalhes de checklists.
 *
 * Issue #1385 - [TCU-1163d] Criar endpoints REST para validacao de conformidade
 * Parent: #1163 - [Conformidade] Templates baseados em modelos TCU/TCES
 *
 * Endpoints:
 * - GET /compliance/etps/:etpId/validate - Validacao completa
 * - GET /compliance/etps/:etpId/score - Score resumido
 * - GET /compliance/etps/:etpId/suggestions - Sugestoes de melhoria
 * - GET /compliance/checklists - Listar checklists
 * - GET /compliance/checklists/:id - Detalhes de checklist
 *
 * @security Todos os endpoints requerem autenticacao JWT
 * @security Usuario so pode validar ETPs proprios (ou admin valida qualquer um)
 */
@ApiTags('compliance')
@Controller('compliance')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ComplianceController {
  private readonly logger = new Logger(ComplianceController.name);

  constructor(
    private readonly complianceService: ComplianceValidationService,
    private readonly reportService: ComplianceReportService,
    @InjectRepository(Etp)
    private readonly etpRepository: Repository<Etp>,
  ) {}

  /**
   * Valida se o usuario pode acessar o ETP.
   * Usuario pode acessar se:
   * - E o dono do ETP (createdById match)
   * - E admin da organizacao (role = admin ou system_admin)
   */
  private async validateEtpAccess(
    etpId: string,
    userId: string,
    userRole: string,
    organizationId: string,
  ): Promise<Etp> {
    const etp = await this.etpRepository.findOne({
      where: { id: etpId },
      relations: ['template'],
    });

    if (!etp) {
      throw new NotFoundException(`ETP com ID ${etpId} nao encontrado`);
    }

    // Admin pode acessar qualquer ETP da organizacao
    const isAdmin = userRole === 'admin' || userRole === 'system_admin';
    const isOwner = etp.createdById === userId;
    const sameOrg = etp.organizationId === organizationId;

    if (!isOwner && !(isAdmin && sameOrg)) {
      this.logger.warn(
        `User ${userId} attempted to access ETP ${etpId} without permission`,
      );
      throw new ForbiddenException(
        'Voce nao tem permissao para acessar este ETP',
      );
    }

    return etp;
  }

  /**
   * Valida um ETP contra o checklist de conformidade apropriado.
   *
   * Retorna resultado completo incluindo:
   * - Score de conformidade (0-100)
   * - Status (APPROVED, NEEDS_REVIEW, REJECTED)
   * - Detalhes de cada item verificado
   * - Sugestoes de correcao
   *
   * @param etpId - ID do ETP a ser validado
   * @param query - Parametros opcionais (checklistId, includeOptional)
   * @param userId - ID do usuario autenticado
   * @returns Resultado completo da validacao
   */
  @Get('etps/:etpId/validate')
  @ApiOperation({
    summary: 'Validar conformidade de um ETP',
    description:
      'Valida o ETP contra o checklist TCU apropriado para o tipo do ETP. Retorna score, status e detalhes de cada item verificado.',
  })
  @ApiParam({
    name: 'etpId',
    description: 'ID do ETP a ser validado',
    type: 'string',
    format: 'uuid',
  })
  @ApiQuery({
    name: 'checklistId',
    description:
      'ID do checklist a usar (opcional - usa padrao do tipo do ETP)',
    required: false,
    type: 'string',
  })
  @ApiQuery({
    name: 'includeOptional',
    description: 'Se true, inclui itens OPTIONAL na validacao',
    required: false,
    type: 'boolean',
  })
  @ApiResponse({
    status: 200,
    description: 'Resultado da validacao de conformidade',
    type: ComplianceValidationResultDto,
  })
  @ApiResponse({ status: 401, description: 'Nao autenticado' })
  @ApiResponse({ status: 403, description: 'Sem permissao para este ETP' })
  @ApiResponse({ status: 404, description: 'ETP ou checklist nao encontrado' })
  async validateEtp(
    @Param('etpId', ParseUUIDPipe) etpId: string,
    @Query() query: ValidateEtpQueryDto,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') userRole: string,
    @CurrentUser('organizationId') organizationId: string,
  ) {
    // Validar acesso ao ETP
    await this.validateEtpAccess(etpId, userId, userRole, organizationId);

    // Executar validacao
    const result = await this.complianceService.validateEtp(
      etpId,
      query.checklistId,
      query.includeOptional ?? false,
    );

    this.logger.log(
      `ETP ${etpId} validated by user ${userId}: score=${result.score}%, status=${result.status}`,
    );

    return {
      data: result,
      disclaimer: DISCLAIMER,
    };
  }

  /**
   * Obtem o score resumido de conformidade de um ETP.
   *
   * Endpoint mais leve que retorna apenas:
   * - Score (0-100)
   * - Status (passed/failed)
   * - Contagem de itens
   * - Top 3 issues prioritarias
   *
   * @param etpId - ID do ETP
   * @param userId - ID do usuario autenticado
   * @returns Resumo do score de conformidade
   */
  @Get('etps/:etpId/score')
  @ApiOperation({
    summary: 'Obter score de conformidade de um ETP',
    description:
      'Retorna resumo do score de conformidade com top 3 issues prioritarias. Mais leve que /validate.',
  })
  @ApiParam({
    name: 'etpId',
    description: 'ID do ETP',
    type: 'string',
    format: 'uuid',
  })
  @ApiResponse({
    status: 200,
    description: 'Resumo do score de conformidade',
    type: ComplianceScoreSummaryDto,
  })
  @ApiResponse({ status: 401, description: 'Nao autenticado' })
  @ApiResponse({ status: 403, description: 'Sem permissao para este ETP' })
  @ApiResponse({ status: 404, description: 'ETP nao encontrado' })
  async getScore(
    @Param('etpId', ParseUUIDPipe) etpId: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') userRole: string,
    @CurrentUser('organizationId') organizationId: string,
  ) {
    // Validar acesso ao ETP
    await this.validateEtpAccess(etpId, userId, userRole, organizationId);

    // Obter resumo do score
    const summary = await this.complianceService.getScoreSummary(etpId);

    return {
      data: summary,
      disclaimer: DISCLAIMER,
    };
  }

  /**
   * Obtem sugestoes de melhoria para um ETP.
   *
   * Retorna lista de sugestoes ordenadas por prioridade:
   * - high: Itens MANDATORY que falharam
   * - medium: Itens RECOMMENDED que falharam
   * - low: Itens OPTIONAL que falharam
   *
   * @param etpId - ID do ETP
   * @param userId - ID do usuario autenticado
   * @returns Lista de sugestoes de melhoria
   */
  @Get('etps/:etpId/suggestions')
  @ApiOperation({
    summary: 'Obter sugestoes de melhoria para um ETP',
    description:
      'Retorna lista de sugestoes para melhorar a conformidade do ETP, ordenadas por prioridade.',
  })
  @ApiParam({
    name: 'etpId',
    description: 'ID do ETP',
    type: 'string',
    format: 'uuid',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de sugestoes de melhoria',
    type: [ComplianceSuggestionDto],
  })
  @ApiResponse({ status: 401, description: 'Nao autenticado' })
  @ApiResponse({ status: 403, description: 'Sem permissao para este ETP' })
  @ApiResponse({ status: 404, description: 'ETP nao encontrado' })
  async getSuggestions(
    @Param('etpId', ParseUUIDPipe) etpId: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') userRole: string,
    @CurrentUser('organizationId') organizationId: string,
  ) {
    // Validar acesso ao ETP
    await this.validateEtpAccess(etpId, userId, userRole, organizationId);

    // Obter sugestoes
    const suggestions = await this.complianceService.getSuggestions(etpId);

    return {
      data: suggestions,
      disclaimer: DISCLAIMER,
    };
  }

  /**
   * Lista todos os checklists de conformidade disponiveis.
   *
   * Pode ser filtrado por:
   * - templateType: Tipo de ETP (OBRAS, TI, SERVICOS, MATERIAIS)
   * - standard: Padrao de conformidade (TCU, TCE_SP, etc)
   *
   * @param query - Filtros opcionais
   * @returns Lista de checklists disponiveis
   */
  @Get('checklists')
  @ApiOperation({
    summary: 'Listar checklists de conformidade',
    description:
      'Retorna todos os checklists de conformidade ativos. Pode ser filtrado por tipo de ETP ou padrao.',
  })
  @ApiQuery({
    name: 'templateType',
    description: 'Filtrar por tipo de template',
    required: false,
    enum: EtpTemplateType,
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de checklists de conformidade',
    type: [ComplianceChecklistDto],
  })
  @ApiResponse({ status: 401, description: 'Nao autenticado' })
  async listChecklists(@Query() query: ComplianceChecklistQueryDto) {
    let checklists;

    if (query.templateType) {
      checklists = await this.complianceService.findChecklistsByTemplateType(
        query.templateType,
      );
    } else {
      checklists = await this.complianceService.findAllChecklists();
    }

    return {
      data: checklists,
      disclaimer: DISCLAIMER,
    };
  }

  /**
   * Obtem detalhes de um checklist especifico com seus itens.
   *
   * @param id - ID do checklist
   * @returns Checklist completo com itens
   */
  @Get('checklists/:id')
  @ApiOperation({
    summary: 'Obter detalhes de um checklist',
    description: 'Retorna checklist completo com todos os seus itens.',
  })
  @ApiParam({
    name: 'id',
    description: 'ID do checklist',
    type: 'string',
    format: 'uuid',
  })
  @ApiResponse({
    status: 200,
    description: 'Detalhes do checklist',
    type: ComplianceChecklistDto,
  })
  @ApiResponse({ status: 401, description: 'Nao autenticado' })
  @ApiResponse({ status: 404, description: 'Checklist nao encontrado' })
  async getChecklist(@Param('id', ParseUUIDPipe) id: string) {
    const checklist = await this.complianceService.findChecklistById(id);

    if (!checklist) {
      throw new NotFoundException(`Checklist com ID ${id} nao encontrado`);
    }

    return {
      data: checklist,
      disclaimer: DISCLAIMER,
    };
  }

  /**
   * Gera relatorio completo de conformidade de um ETP.
   *
   * Retorna dados estruturados incluindo:
   * - Score geral e por categoria
   * - Violacoes com severidade
   * - Recomendacoes de correcao
   * - Historico de validacoes
   *
   * Issue #1264 - [Compliance-c] Criar relatorio de conformidade
   *
   * @param etpId - ID do ETP
   * @param userId - ID do usuario autenticado
   * @returns Dados estruturados do relatorio
   */
  @Get('etps/:etpId/report')
  @ApiOperation({
    summary: 'Gerar relatorio de conformidade',
    description:
      'Gera relatorio completo de conformidade com scores, violacoes, recomendacoes e historico.',
  })
  @ApiParam({
    name: 'etpId',
    description: 'ID do ETP',
    type: 'string',
    format: 'uuid',
  })
  @ApiResponse({
    status: 200,
    description: 'Relatorio de conformidade',
    type: ComplianceReportDto,
  })
  @ApiResponse({ status: 401, description: 'Nao autenticado' })
  @ApiResponse({ status: 403, description: 'Sem permissao para este ETP' })
  @ApiResponse({ status: 404, description: 'ETP nao encontrado' })
  async getReport(
    @Param('etpId', ParseUUIDPipe) etpId: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') userRole: string,
    @CurrentUser('organizationId') organizationId: string,
  ) {
    const report = await this.reportService.generateReport(
      etpId,
      userId,
      userRole,
      organizationId,
    );

    this.logger.log(
      `Compliance report generated for ETP ${etpId} by user ${userId}: score=${report.score}%`,
    );

    return {
      data: report,
      disclaimer: DISCLAIMER,
    };
  }

  /**
   * Exporta relatorio de conformidade em PDF.
   *
   * Issue #1264 - [Compliance-c] Criar relatorio de conformidade
   *
   * @param etpId - ID do ETP
   * @param userId - ID do usuario autenticado
   * @param res - Response object para envio do PDF
   */
  @Get('etps/:etpId/report/pdf')
  @ApiOperation({
    summary: 'Exportar relatorio de conformidade em PDF',
    description:
      'Gera e baixa relatorio de conformidade em formato PDF profissional.',
  })
  @ApiParam({
    name: 'etpId',
    description: 'ID do ETP',
    type: 'string',
    format: 'uuid',
  })
  @ApiProduces('application/pdf')
  @ApiResponse({
    status: 200,
    description: 'Arquivo PDF do relatorio',
    content: { 'application/pdf': {} },
  })
  @ApiResponse({ status: 401, description: 'Nao autenticado' })
  @ApiResponse({ status: 403, description: 'Sem permissao para este ETP' })
  @ApiResponse({ status: 404, description: 'ETP nao encontrado' })
  @ApiResponse({ status: 500, description: 'Erro ao gerar PDF' })
  async getReportPdf(
    @Param('etpId', ParseUUIDPipe) etpId: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') userRole: string,
    @CurrentUser('organizationId') organizationId: string,
    @Res() res: Response,
  ) {
    const pdfBuffer = await this.reportService.exportReportToPdf(
      etpId,
      userId,
      userRole,
      organizationId,
    );

    const filename = `relatorio-conformidade-${etpId.slice(0, 8)}-${new Date().toISOString().slice(0, 10)}.pdf`;

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': pdfBuffer.length,
    });

    res.send(pdfBuffer);

    this.logger.log(
      `Compliance report PDF exported for ETP ${etpId} by user ${userId}`,
    );
  }

  /**
   * Obtem historico de validacoes de um ETP.
   *
   * Issue #1264 - [Compliance-c] Criar relatorio de conformidade
   *
   * @param etpId - ID do ETP
   * @param userId - ID do usuario autenticado
   * @param limit - Numero maximo de registros (default 10)
   * @returns Lista de entradas de historico
   */
  @Get('etps/:etpId/history')
  @ApiOperation({
    summary: 'Obter historico de validacoes',
    description:
      'Retorna historico de validacoes de conformidade de um ETP, ordenado por data.',
  })
  @ApiParam({
    name: 'etpId',
    description: 'ID do ETP',
    type: 'string',
    format: 'uuid',
  })
  @ApiQuery({
    name: 'limit',
    description: 'Numero maximo de registros (default 10)',
    required: false,
    type: 'number',
  })
  @ApiResponse({
    status: 200,
    description: 'Historico de validacoes',
    type: [ValidationHistoryEntryDto],
  })
  @ApiResponse({ status: 401, description: 'Nao autenticado' })
  @ApiResponse({ status: 403, description: 'Sem permissao para este ETP' })
  @ApiResponse({ status: 404, description: 'ETP nao encontrado' })
  async getHistory(
    @Param('etpId', ParseUUIDPipe) etpId: string,
    @Query('limit') limit: number = 10,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') userRole: string,
    @CurrentUser('organizationId') organizationId: string,
  ) {
    // Validar acesso ao ETP
    await this.validateEtpAccess(etpId, userId, userRole, organizationId);

    const history = await this.reportService.getValidationHistory(
      etpId,
      Math.min(limit || 10, 50),
    );

    return {
      data: history,
      disclaimer: DISCLAIMER,
    };
  }
}
