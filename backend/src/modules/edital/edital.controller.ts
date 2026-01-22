import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  Param,
  UseGuards,
  Logger,
  NotFoundException,
  ForbiddenException,
  Res,
  BadRequestException,
} from '@nestjs/common';
import { Response } from 'express';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '../../entities/user.entity';
import { EditalGenerationService } from './edital-generation.service';
import {
  EditalValidationService,
  EditalValidationResult,
} from './edital-validation.service';
import {
  GenerateEditalDto,
  GenerateEditalResponseDto,
  UpdateEditalDto,
} from './dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Edital } from '../../entities/edital.entity';
import {
  EditalExportService,
  EditalExportFormat,
} from '../export/edital-export.service';

/**
 * Controller para gerenciamento de Editais.
 *
 * Endpoints:
 * - POST /editais/generate - Gera Edital automaticamente a partir de ETP+TR+Pesquisa
 * - GET /editais/:id - Busca Edital por ID
 * - PATCH /editais/:id - Atualiza Edital parcialmente
 *
 * Segurança:
 * - Requer autenticação JWT
 * - Multi-tenancy via organizationId do usuário
 *
 * Issue #1279 - [Edital-c] Geração automática a partir de ETP+TR+Pesquisa
 * Issue #1280 - [Edital-d] Editor de edital no frontend
 * Milestone: M14 - Geração de Edital
 */
@Controller('editais')
@UseGuards(JwtAuthGuard)
export class EditalController {
  private readonly logger = new Logger(EditalController.name);

  constructor(
    private readonly editalGenerationService: EditalGenerationService,
    private readonly editalValidationService: EditalValidationService,
    private readonly editalExportService: EditalExportService,
    @InjectRepository(Edital)
    private readonly editalRepository: Repository<Edital>,
  ) {}

  /**
   * POST /editais/generate
   *
   * Gera um Edital automaticamente compilando dados de ETP, TR e PesquisaPrecos.
   *
   * Fluxo:
   * 1. Usuário seleciona ETP aprovado
   * 2. Sistema busca TR e Pesquisa vinculados (se fornecidos)
   * 3. Seleciona template por modalidade
   * 4. Gera edital compilando dados
   * 5. Enriquece cláusulas com IA
   * 6. Usuário revisa e ajusta no editor
   *
   * @param dto Dados para geração (etpId obrigatório, termoReferenciaId e pesquisaPrecosId opcionais)
   * @param user Usuário autenticado (injetado via decorator @CurrentUser)
   * @returns Edital gerado com metadados (tokens, latência, aiEnhanced)
   *
   * @example
   * POST /editais/generate
   * Authorization: Bearer <token>
   * {
   *   "etpId": "uuid-do-etp",
   *   "termoReferenciaId": "uuid-do-tr",    // opcional
   *   "pesquisaPrecosId": "uuid-da-pesquisa", // opcional
   *   "numero": "001/2024-PREGAO"           // opcional (auto-gerado se omitido)
   * }
   */
  @Post('generate')
  async generateFromEtp(
    @Body() dto: GenerateEditalDto,
    @CurrentUser() user: User,
  ): Promise<GenerateEditalResponseDto> {
    this.logger.log(
      `POST /editais/generate - ETP: ${dto.etpId}, User: ${user.id}, Org: ${user.organizationId}`,
    );

    return this.editalGenerationService.generateFromEtp(
      dto,
      user.id,
      user.organizationId,
    );
  }

  /**
   * GET /editais/:id
   *
   * Busca um Edital por ID com validação de multi-tenancy.
   *
   * Segurança:
   * - Valida que o Edital pertence à organização do usuário
   * - Retorna 404 se não encontrado ou não pertence à organização
   *
   * @param id UUID do Edital
   * @param user Usuário autenticado (injetado via decorator @CurrentUser)
   * @returns Edital com relacionamentos (ETP, TR, PesquisaPrecos, Organization, CreatedBy)
   *
   * @example
   * GET /editais/uuid-do-edital
   * Authorization: Bearer <token>
   *
   * Issue #1280 - [Edital-d] Editor de edital no frontend
   */
  @Get(':id')
  async findOne(
    @Param('id') id: string,
    @CurrentUser() user: User,
  ): Promise<Edital> {
    this.logger.log(
      `GET /editais/${id} - User: ${user.id}, Org: ${user.organizationId}`,
    );

    const edital = await this.editalRepository.findOne({
      where: { id, organizationId: user.organizationId },
      relations: [
        'etp',
        'termoReferencia',
        'pesquisaPrecos',
        'organization',
        'createdBy',
      ],
    });

    if (!edital) {
      this.logger.warn(
        `Edital ${id} not found or does not belong to org ${user.organizationId}`,
      );
      throw new NotFoundException(`Edital com ID ${id} não encontrado`);
    }

    return edital;
  }

  /**
   * PATCH /editais/:id
   *
   * Atualiza um Edital parcialmente com validação de multi-tenancy.
   *
   * Permite editar qualquer campo do edital durante o workflow de revisão.
   * Atualiza apenas os campos fornecidos (partial update).
   *
   * Segurança:
   * - Valida que o Edital pertence à organização do usuário
   * - Retorna 404 se não encontrado
   * - Retorna 403 se não pertence à organização
   *
   * @param id UUID do Edital
   * @param dto Campos a atualizar (partial)
   * @param user Usuário autenticado (injetado via decorator @CurrentUser)
   * @returns Edital atualizado
   *
   * @example
   * PATCH /editais/uuid-do-edital
   * Authorization: Bearer <token>
   * {
   *   "objeto": "Contratação de serviços de TI",
   *   "valorEstimado": "100000.00",
   *   "descricaoObjeto": "<p>Descrição detalhada...</p>"
   * }
   *
   * Issue #1280 - [Edital-d] Editor de edital no frontend
   */
  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateEditalDto,
    @CurrentUser() user: User,
  ): Promise<Edital> {
    this.logger.log(
      `PATCH /editais/${id} - User: ${user.id}, Org: ${user.organizationId}, Fields: ${Object.keys(dto).join(', ')}`,
    );

    // Buscar edital com validação de tenancy
    const edital = await this.editalRepository.findOne({
      where: { id },
    });

    if (!edital) {
      this.logger.warn(`Edital ${id} not found`);
      throw new NotFoundException(`Edital com ID ${id} não encontrado`);
    }

    // Validar multi-tenancy
    if (edital.organizationId !== user.organizationId) {
      this.logger.warn(
        `User ${user.id} from org ${user.organizationId} attempted to update edital ${id} from org ${edital.organizationId}`,
      );
      throw new ForbiddenException(
        'Você não tem permissão para editar este edital',
      );
    }

    // Converter dataSessaoPublica de string ISO para Date se fornecida
    if (dto.dataSessaoPublica) {
      (dto as any).dataSessaoPublica = new Date(dto.dataSessaoPublica);
    }

    // Atualizar apenas campos fornecidos
    Object.assign(edital, dto);

    // Salvar e retornar edital atualizado
    const updated = await this.editalRepository.save(edital);

    this.logger.log(`Edital ${id} updated successfully`);

    return updated;
  }

  /**
   * POST /editais/:id/validate
   *
   * Valida um Edital conforme Lei 14.133/2021.
   *
   * Realiza validações completas:
   * - Campos obrigatórios gerais (Art. 25)
   * - Campos obrigatórios específicos por modalidade
   * - Coerência entre modalidade e tipo de contratação direta
   * - Prazos e datas
   * - Referências a anexos
   *
   * Retorna:
   * - isValid: Se o edital está válido
   * - errors: Lista de erros críticos (bloqueiam finalização)
   * - warnings: Lista de warnings (não bloqueiam, mas devem ser revisados)
   * - completionPercentage: Percentual de completude (0-100)
   * - missingMandatoryFields: Campos obrigatórios faltantes
   *
   * Segurança:
   * - Valida que o Edital pertence à organização do usuário
   * - Retorna 404 se não encontrado
   * - Retorna 403 se não pertence à organização
   *
   * @param id UUID do Edital
   * @param user Usuário autenticado (injetado via decorator @CurrentUser)
   * @returns Resultado da validação estruturado
   *
   * @example
   * POST /editais/uuid-do-edital/validate
   * Authorization: Bearer <token>
   *
   * Response:
   * {
   *   "isValid": false,
   *   "errors": [
   *     {
   *       "field": "prazoVigencia",
   *       "message": "Prazo de vigência é obrigatório para Pregão",
   *       "required": true,
   *       "severity": "critical"
   *     }
   *   ],
   *   "warnings": [
   *     {
   *       "field": "anexos",
   *       "message": "É recomendado incluir anexos (Termo de Referência, Minuta de Contrato)",
   *       "required": false,
   *       "severity": "warning"
   *     }
   *   ],
   *   "completionPercentage": 65,
   *   "missingMandatoryFields": ["prazoVigencia", "dataSessaoPublica"]
   * }
   *
   * Issue #1281 - [Edital-e] Validação de cláusulas obrigatórias
   */
  @Post(':id/validate')
  async validate(
    @Param('id') id: string,
    @CurrentUser() user: User,
  ): Promise<EditalValidationResult> {
    this.logger.log(
      `POST /editais/${id}/validate - User: ${user.id}, Org: ${user.organizationId}`,
    );

    // Buscar edital com validação de tenancy
    const edital = await this.editalRepository.findOne({
      where: { id },
    });

    if (!edital) {
      this.logger.warn(`Edital ${id} not found`);
      throw new NotFoundException(`Edital com ID ${id} não encontrado`);
    }

    // Validar multi-tenancy
    if (edital.organizationId !== user.organizationId) {
      this.logger.warn(
        `User ${user.id} from org ${user.organizationId} attempted to validate edital ${id} from org ${edital.organizationId}`,
      );
      throw new ForbiddenException(
        'Você não tem permissão para validar este edital',
      );
    }

    // Executar validação
    const result = this.editalValidationService.validate(edital);

    this.logger.log(
      `Edital ${id} validated: valid=${result.isValid}, errors=${result.errors.length}, warnings=${result.warnings.length}, completion=${result.completionPercentage}%`,
    );

    return result;
  }

  /**
   * GET /editais/:id/export/:format
   *
   * Exports an Edital to PDF or DOCX format.
   *
   * Generates official formatted document with:
   * - Header with organization brasão (placeholder)
   * - Automatic page numbering
   * - Table of contents (implicit via sections)
   * - Footer with metadata (date, version, responsible)
   * - Annexes references (ETP, TR, Pesquisa de Preços)
   *
   * Formats:
   * - PDF: High-fidelity via Puppeteer/Chromium with official formatting
   * - DOCX: Editable document via docx library with professional styling
   *
   * Security:
   * - Validates Edital belongs to user's organization (multi-tenancy)
   * - Returns 404 if not found
   * - Returns 403 if no permission
   * - Returns 400 if invalid format
   *
   * @param id UUID of the Edital
   * @param format Export format (pdf | docx)
   * @param user Authenticated user (injected via @CurrentUser decorator)
   * @param res Express Response object for streaming binary file
   *
   * @example
   * GET /editais/uuid-do-edital/export/pdf
   * Authorization: Bearer <token>
   *
   * Response: Binary PDF file with headers:
   * Content-Type: application/pdf
   * Content-Disposition: attachment; filename="Edital_001-2024.pdf"
   *
   * Issue #1282 - [Edital-f] Export edital formatado PDF/DOCX
   */
  @Get(':id/export/:format')
  async exportEdital(
    @Param('id') id: string,
    @Param('format') format: string,
    @CurrentUser() user: User,
    @Res() res: Response,
  ): Promise<void> {
    this.logger.log(
      `GET /editais/${id}/export/${format} - User: ${user.id}, Org: ${user.organizationId}`,
    );

    // Validate format
    const normalizedFormat = format.toLowerCase();
    if (
      normalizedFormat !== EditalExportFormat.PDF &&
      normalizedFormat !== EditalExportFormat.DOCX
    ) {
      throw new BadRequestException(
        `Formato inválido: ${format}. Formatos suportados: pdf, docx`,
      );
    }

    // Validate Edital exists and belongs to user's organization
    const edital = await this.editalRepository.findOne({
      where: { id },
    });

    if (!edital) {
      this.logger.warn(`Edital ${id} not found`);
      throw new NotFoundException(`Edital com ID ${id} não encontrado`);
    }

    if (edital.organizationId !== user.organizationId) {
      this.logger.warn(
        `User ${user.id} from org ${user.organizationId} attempted to export edital ${id} from org ${edital.organizationId}`,
      );
      throw new ForbiddenException(
        'Você não tem permissão para exportar este edital',
      );
    }

    // Generate safe filename
    const safeNumero = (edital.numero || 'SN')
      .replace(/[^a-zA-Z0-9-]/g, '_')
      .substring(0, 50);
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `Edital_${safeNumero}_${timestamp}.${normalizedFormat}`;

    // Export based on format
    let buffer: Buffer;
    let contentType: string;

    if (normalizedFormat === EditalExportFormat.PDF) {
      buffer = await this.editalExportService.exportToPDF(
        id,
        user.organizationId,
      );
      contentType = 'application/pdf';
    } else {
      // DOCX
      buffer = await this.editalExportService.exportToDocx(
        id,
        user.organizationId,
      );
      contentType =
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    }

    // Set response headers
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', buffer.length);

    // Send buffer
    res.send(buffer);

    this.logger.log(
      `Edital ${id} exported successfully as ${normalizedFormat.toUpperCase()} (${buffer.length} bytes)`,
    );
  }
}
