import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import {
  ContractChainService,
  ContractChain,
} from '../services/contract-chain.service';
import {
  ContratosKpiService,
  ContratoKpiResponse,
} from '../services/contratos-kpi.service';
import {
  ContratoService,
  PaginatedContratos,
  ContratoFilters,
} from '../services/contrato.service';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { UserRole, User } from '../../../entities/user.entity';
import { ContratoStatus } from '../../../entities/contrato.entity';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
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
    private readonly contratoService: ContratoService,
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

  /**
   * Lista contratos com filtros e paginação (#1660).
   *
   * Endpoint de busca de contratos com suporte a:
   * - Filtros por status, fornecedor, valor e vigência
   * - Paginação server-side
   * - Multi-tenancy (isolamento por organização)
   *
   * **Rota:** `GET /api/contratos`
   *
   * **Permissões:** CONSULTOR, GESTOR, SYSTEM_ADMIN
   *
   * **Query Parameters:**
   * - `page` (number, default: 1): Número da página
   * - `limit` (number, default: 10): Itens por página
   * - `status` (string[]): Filtro por status (multi-select)
   * - `fornecedor` (string): Busca por CNPJ ou razão social
   * - `valorMin` (number): Valor mínimo do contrato
   * - `valorMax` (number): Valor máximo do contrato
   * - `vigenciaInicio` (ISO date): Data inicial da vigência
   * - `vigenciaFim` (ISO date): Data final da vigência
   *
   * **Exemplo de resposta:**
   * ```json
   * {
   *   "data": [
   *     {
   *       "id": "uuid",
   *       "numero": "001/2024",
   *       "objeto": "Serviços de TI",
   *       "contratadoRazaoSocial": "Empresa XYZ Ltda",
   *       "valorGlobal": "100000.00",
   *       "vigenciaFim": "2025-12-31",
   *       "status": "em_execucao"
   *     }
   *   ],
   *   "total": 42,
   *   "page": 1,
   *   "limit": 10,
   *   "totalPages": 5
   * }
   * ```
   *
   * @param user - Usuário autenticado
   * @param page - Número da página
   * @param limit - Itens por página
   * @param status - Filtro de status (array)
   * @param fornecedor - Filtro de fornecedor
   * @param valorMin - Valor mínimo
   * @param valorMax - Valor máximo
   * @param vigenciaInicio - Data inicial vigência
   * @param vigenciaFim - Data final vigência
   * @returns {Promise<PaginatedContratos>} Contratos paginados
   */
  @Get()
  @Roles(UserRole.ADMIN, UserRole.USER, UserRole.SYSTEM_ADMIN)
  @ApiOperation({
    summary: 'Listar contratos com filtros e paginação',
    description:
      'Busca contratos com filtros opcionais por status, fornecedor, valor e vigência',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Número da página (default: 1)',
    example: 1,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Itens por página (default: 10)',
    example: 10,
  })
  @ApiQuery({
    name: 'status',
    required: false,
    isArray: true,
    enum: ContratoStatus,
    description: 'Filtro por status (multi-select)',
    example: ['em_execucao', 'aditivado'],
  })
  @ApiQuery({
    name: 'fornecedor',
    required: false,
    type: String,
    description: 'Busca por CNPJ ou razão social',
    example: 'Empresa XYZ',
  })
  @ApiQuery({
    name: 'valorMin',
    required: false,
    type: Number,
    description: 'Valor mínimo do contrato',
    example: 10000,
  })
  @ApiQuery({
    name: 'valorMax',
    required: false,
    type: Number,
    description: 'Valor máximo do contrato',
    example: 50000,
  })
  @ApiQuery({
    name: 'vigenciaInicio',
    required: false,
    type: String,
    format: 'date',
    description: 'Data inicial da vigência (ISO 8601)',
    example: '2024-01-01',
  })
  @ApiQuery({
    name: 'vigenciaFim',
    required: false,
    type: String,
    format: 'date',
    description: 'Data final da vigência (ISO 8601)',
    example: '2024-12-31',
  })
  @ApiResponse({
    status: 200,
    description: 'Contratos retornados com sucesso',
  })
  async listContracts(
    @CurrentUser() user: User,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
    @Query('status') status?: ContratoStatus | ContratoStatus[],
    @Query('fornecedor') fornecedor?: string,
    @Query('valorMin') valorMin?: number,
    @Query('valorMax') valorMax?: number,
    @Query('vigenciaInicio') vigenciaInicio?: string,
    @Query('vigenciaFim') vigenciaFim?: string,
  ): Promise<PaginatedContratos> {
    // Build filters object
    const filters: ContratoFilters = {};

    if (status) {
      // Handle both single value and array from query params
      filters.status = Array.isArray(status) ? status : [status];
    }
    if (fornecedor) filters.fornecedor = fornecedor;
    if (valorMin !== undefined) filters.valorMin = Number(valorMin);
    if (valorMax !== undefined) filters.valorMax = Number(valorMax);
    if (vigenciaInicio) filters.vigenciaInicio = vigenciaInicio;
    if (vigenciaFim) filters.vigenciaFim = vigenciaFim;

    return this.contratoService.listContracts(
      user.organizationId,
      filters,
      page,
      limit,
    );
  }
}
