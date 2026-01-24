import {
  Controller,
  Get,
  Param,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ContractChainService,
  ContractChain,
} from '../services/contract-chain.service';
import {
  ContratosKpiService,
  ContratoKpiResponse,
} from '../services/contratos-kpi.service';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { UserRole, User } from '../../../entities/user.entity';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';

/**
 * Controller para gerenciamento de Contratos.
 *
 * Endpoints para criação, consulta, atualização de contratos públicos
 * e rastreabilidade completa da cadeia ETP → TR → Edital → Contrato.
 *
 * **Issue #1285** - [Contratos-b] Vínculo ETP → TR → Edital → Contrato
 *
 * @see Lei 14.133/2021 Art. 90-129 - Contratos Administrativos
 */
@ApiTags('contratos')
@Controller('contratos')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
export class ContratosController {
  constructor(
    private readonly contractChainService: ContractChainService,
    private readonly kpiService: ContratosKpiService,
  ) {}

  /**
   * Busca a cadeia completa de rastreabilidade de um contrato.
   *
   * Retorna estrutura hierárquica: ETP → TR → Edital → Contrato.
   * Útil para auditoria, relatórios de conformidade e verificações TCU/TCE.
   *
   * **Rota:** `GET /api/contratos/:id/chain`
   *
   * **Permissões:** CONSULTOR, GESTOR, SYSTEM_ADMIN
   *
   * **Exemplo de resposta:**
   * ```json
   * {
   *   "etp": {
   *     "id": "uuid",
   *     "numero": "001/2024",
   *     "objeto": "Contratação de serviços de TI",
   *     "status": "completed"
   *   },
   *   "termoReferencia": {
   *     "id": "uuid",
   *     "objeto": "Desenvolvimento de sistema",
   *     "status": "approved"
   *   },
   *   "edital": {
   *     "id": "uuid",
   *     "numero": "001/2024-PREGAO",
   *     "modalidade": "PREGAO",
   *     "status": "published"
   *   },
   *   "contrato": {
   *     "id": "uuid",
   *     "numero": "001/2024-CONTRATO",
   *     "valorGlobal": 100000.00,
   *     "status": "em_execucao"
   *   }
   * }
   * ```
   *
   * @param id - UUID do contrato
   * @returns {Promise<ContractChain>} Cadeia completa de documentos
   * @throws {NotFoundException} Se contrato não existe ou cadeia incompleta
   * @throws {UnauthorizedException} Se usuário não autenticado
   * @throws {ForbiddenException} Se usuário sem permissão
   */
  @Get(':id/chain')
  @Roles(UserRole.ADMIN, UserRole.USER, UserRole.SYSTEM_ADMIN)
  @ApiOperation({
    summary: 'Buscar cadeia de rastreabilidade de contrato',
    description:
      'Retorna estrutura hierárquica completa: ETP → TR → Edital → Contrato',
  })
  @ApiParam({
    name: 'id',
    type: 'string',
    format: 'uuid',
    description: 'UUID do contrato',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiResponse({
    status: 200,
    description: 'Cadeia de rastreabilidade retornada com sucesso',
    schema: {
      type: 'object',
      properties: {
        etp: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            numero: { type: 'string', nullable: true },
            objeto: { type: 'string' },
            status: { type: 'string' },
            numeroProcesso: { type: 'string', nullable: true },
          },
        },
        termoReferencia: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            numero: { type: 'string', nullable: true },
            objeto: { type: 'string' },
            status: { type: 'string' },
            versao: { type: 'number' },
          },
        },
        edital: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            numero: { type: 'string' },
            objeto: { type: 'string' },
            modalidade: { type: 'string', nullable: true },
            tipoContratacaoDireta: { type: 'string', nullable: true },
            status: { type: 'string' },
            dataPublicacao: { type: 'string', format: 'date', nullable: true },
          },
        },
        contrato: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            numero: { type: 'string' },
            objeto: { type: 'string' },
            status: { type: 'string' },
            valorGlobal: { type: 'number' },
            vigenciaInicio: { type: 'string', format: 'date' },
            vigenciaFim: { type: 'string', format: 'date' },
            contratadoRazaoSocial: { type: 'string' },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description:
      'Contrato não encontrado ou cadeia de rastreabilidade incompleta',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 404 },
        message: { type: 'string', example: 'Contrato uuid não encontrado' },
        error: { type: 'string', example: 'Not Found' },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Não autenticado',
  })
  @ApiResponse({
    status: 403,
    description: 'Sem permissão para acessar',
  })
  async getContractChain(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ContractChain> {
    return this.contractChainService.getChainByContratoId(id);
  }

  /**
   * Retorna KPIs agregados de contratos para dashboard.
   *
   * Métricas executivas para gestão de contratos:
   * - Total de contratos vigentes
   * - Valor total comprometido
   * - Contratos vencendo nos próximos 30 dias
   * - Medições pendentes de ateste
   *
   * **Rota:** `GET /api/contratos/kpis`
   *
   * **Permissões:** CONSULTOR, GESTOR, SYSTEM_ADMIN
   *
   * **Exemplo de resposta:**
   * ```json
   * {
   *   "totalContracts": 42,
   *   "totalValue": 1234567.89,
   *   "expiringIn30Days": 7,
   *   "pendingMeasurements": 12
   * }
   * ```
   *
   * @param user - Usuário autenticado (extraído do JWT)
   * @returns {Promise<ContratoKpiResponse>} KPIs agregados da organização
   * @throws {UnauthorizedException} Se usuário não autenticado
   * @throws {ForbiddenException} Se usuário sem permissão
   */
  @Get('kpis')
  @Roles(UserRole.ADMIN, UserRole.USER, UserRole.SYSTEM_ADMIN)
  @ApiOperation({
    summary: 'Obter KPIs de contratos para dashboard',
    description:
      'Retorna métricas agregadas: total vigente, valor total, vencimentos, medições pendentes',
  })
  @ApiResponse({
    status: 200,
    description: 'KPIs retornados com sucesso',
    schema: {
      type: 'object',
      properties: {
        totalContracts: {
          type: 'number',
          description: 'Total de contratos vigentes',
          example: 42,
        },
        totalValue: {
          type: 'number',
          format: 'double',
          description: 'Valor total comprometido (R$)',
          example: 1234567.89,
        },
        expiringIn30Days: {
          type: 'number',
          description: 'Contratos vencendo nos próximos 30 dias',
          example: 7,
        },
        pendingMeasurements: {
          type: 'number',
          description: 'Medições pendentes de ateste',
          example: 12,
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Não autenticado',
  })
  @ApiResponse({
    status: 403,
    description: 'Sem permissão para acessar',
  })
  async getKpis(@CurrentUser() user: User): Promise<ContratoKpiResponse> {
    return this.kpiService.getKpis(user.organizationId);
  }
}
