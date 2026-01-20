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
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '../../entities/user.entity';
import { EditalGenerationService } from './edital-generation.service';
import {
  GenerateEditalDto,
  GenerateEditalResponseDto,
  UpdateEditalDto,
} from './dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Edital } from '../../entities/edital.entity';

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
}
