import {
  Controller,
  Post,
  Body,
  UseGuards,
  Logger,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '../../entities/user.entity';
import { EditalGenerationService } from './edital-generation.service';
import { GenerateEditalDto, GenerateEditalResponseDto } from './dto';

/**
 * Controller para gerenciamento de Editais.
 *
 * Endpoints:
 * - POST /editais/generate - Gera Edital automaticamente a partir de ETP+TR+Pesquisa
 *
 * Segurança:
 * - Requer autenticação JWT
 * - Multi-tenancy via organizationId do usuário
 *
 * Issue #1279 - [Edital-c] Geração automática a partir de ETP+TR+Pesquisa
 * Milestone: M14 - Geração de Edital
 */
@Controller('editais')
@UseGuards(JwtAuthGuard)
export class EditalController {
  private readonly logger = new Logger(EditalController.name);

  constructor(
    private readonly editalGenerationService: EditalGenerationService,
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
}
