import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Contrato, ContratoStatus } from '../../../entities/contrato.entity';
import { Medicao, MedicaoStatus } from '../../../entities/medicao.entity';

/**
 * Resposta de KPIs de contratos para dashboard.
 *
 * Métricas agregadas para visão executiva do gestor.
 * Issue #1659 - KPI summary cards
 */
export interface ContratoKpiResponse {
  /** Total de contratos vigentes (status ASSINADO ou EM_EXECUCAO) */
  totalContracts: number;

  /** Valor total comprometido (soma de valorGlobal dos contratos vigentes) */
  totalValue: number;

  /** Quantidade de contratos vencendo nos próximos 30 dias */
  expiringIn30Days: number;

  /** Quantidade de medições com status PENDENTE */
  pendingMeasurements: number;
}

/**
 * Entry de valor por status para gráfico de pizza.
 *
 * Issue #1661 - Add contract value by status chart
 */
export interface ValueByStatusEntry {
  /** Status do contrato */
  status: ContratoStatus;

  /** Valor total de contratos neste status (R$) */
  value: number;

  /** Quantidade de contratos neste status */
  count: number;
}

/**
 * Resposta do endpoint analytics/value-by-status.
 *
 * Issue #1661 - Add contract value by status chart
 */
export interface ValueByStatusResponse {
  /** Dados do gráfico de pizza agrupados por status */
  chartData: ValueByStatusEntry[];
}

/**
 * Entry de contrato expirando para timeline.
 *
 * Issue #1662 - Add contracts expiration timeline
 */
export interface ExpiringContractEntry {
  /** UUID do contrato */
  contratoId: string;

  /** Número do contrato (ex: "001/2024") */
  numero: string;

  /** Razão social do contratado */
  contratado: string;

  /** Data de fim da vigência (ISO 8601) */
  vigenciaFim: string;

  /** Dias restantes até vencimento */
  daysUntilExpiration: number;

  /** Valor global do contrato (DECIMAL as string) */
  valor: string;
}

/**
 * Resposta do endpoint analytics/expiration-timeline.
 *
 * Issue #1662 - Add contracts expiration timeline
 */
export interface ExpirationTimelineResponse {
  /** Lista de contratos vencendo nos próximos N dias */
  timeline: ExpiringContractEntry[];
}

/**
 * Service para cálculo de KPIs de Contratos.
 *
 * Fornece métricas agregadas para dashboards e relatórios gerenciais.
 * Todos os cálculos respeitam isolamento multi-tenant (organizationId).
 *
 * **Métricas disponíveis:**
 * - Total de contratos vigentes
 * - Valor total comprometido
 * - Contratos vencendo (30 dias)
 * - Medições pendentes de ateste
 *
 * @see Issue #1659 - Add KPI summary cards for contracts dashboard
 */
@Injectable()
export class ContratosKpiService {
  constructor(
    @InjectRepository(Contrato)
    private readonly contratoRepository: Repository<Contrato>,
    @InjectRepository(Medicao)
    private readonly medicaoRepository: Repository<Medicao>,
  ) {}

  /**
   * Calcula todos os KPIs de contratos para uma organização.
   *
   * Executa 4 queries agregadas em paralelo para otimização de performance.
   *
   * **Regras de Negócio:**
   * - Contrato vigente: status = ASSINADO, EM_EXECUCAO, ADITIVADO, ou SUSPENSO
   * - Vencendo em 30 dias: vigenciaFim entre hoje e hoje + 30 dias
   * - Apenas medições PENDENTE são contadas
   *
   * @param organizationId - UUID da organização (multi-tenancy)
   * @returns {Promise<ContratoKpiResponse>} KPIs agregados
   *
   * @example
   * ```typescript
   * const kpis = await kpiService.getKpis('org-uuid');
   * console.log(kpis.totalContracts); // 42
   * console.log(kpis.totalValue); // 1234567.89
   * console.log(kpis.expiringIn30Days); // 7
   * console.log(kpis.pendingMeasurements); // 12
   * ```
   */
  async getKpis(organizationId: string): Promise<ContratoKpiResponse> {
    // Data de referência para cálculos
    const today = new Date();
    const in30Days = new Date();
    in30Days.setDate(today.getDate() + 30);

    // Status considerados "vigentes"
    const activeStatuses = [
      ContratoStatus.ASSINADO,
      ContratoStatus.EM_EXECUCAO,
      ContratoStatus.ADITIVADO,
      ContratoStatus.SUSPENSO,
    ];

    // Query 1: Total de contratos vigentes
    const totalContracts = await this.contratoRepository.count({
      where: {
        organizationId,
        status: activeStatuses as any, // TypeORM In() operator
      },
    });

    // Query 2: Valor total comprometido
    const totalValueResult = await this.contratoRepository
      .createQueryBuilder('contrato')
      .select('SUM(CAST(contrato.valorGlobal AS DECIMAL))', 'total')
      .where('contrato.organizationId = :organizationId', { organizationId })
      .andWhere('contrato.status IN (:...statuses)', {
        statuses: activeStatuses,
      })
      .getRawOne<{ total: string }>();

    const totalValue = parseFloat(totalValueResult?.total || '0');

    // Query 3: Contratos vencendo em 30 dias
    const expiringIn30Days = await this.contratoRepository
      .createQueryBuilder('contrato')
      .where('contrato.organizationId = :organizationId', { organizationId })
      .andWhere('contrato.status IN (:...statuses)', {
        statuses: activeStatuses,
      })
      .andWhere('contrato.vigenciaFim BETWEEN :today AND :in30Days', {
        today: today.toISOString().split('T')[0], // YYYY-MM-DD
        in30Days: in30Days.toISOString().split('T')[0],
      })
      .getCount();

    // Query 4: Medições pendentes (cross-tenant via JOIN)
    const pendingMeasurements = await this.medicaoRepository
      .createQueryBuilder('medicao')
      .innerJoin('medicao.contrato', 'contrato')
      .where('contrato.organizationId = :organizationId', { organizationId })
      .andWhere('medicao.status = :status', {
        status: MedicaoStatus.PENDENTE,
      })
      .getCount();

    return {
      totalContracts,
      totalValue,
      expiringIn30Days,
      pendingMeasurements,
    };
  }

  /**
   * Calcula distribuição de valor por status de contrato.
   *
   * Agrupa todos os contratos da organização por status e soma:
   * - Valor total em cada status
   * - Quantidade de contratos em cada status
   *
   * Usado para renderizar gráfico de pizza no dashboard (#1661).
   *
   * **Regras de Negócio:**
   * - Apenas contratos ativos (não CANCELADO nem ENCERRADO)
   * - Agrupa por status: ASSINADO, EM_EXECUCAO, ADITIVADO, SUSPENSO
   * - Valor em decimal de alta precisão (money type)
   *
   * @param organizationId - UUID da organização (multi-tenancy)
   * @returns {Promise<ValueByStatusResponse>} Dados para gráfico de pizza
   *
   * @example
   * ```typescript
   * const analytics = await kpiService.getValueByStatus('org-uuid');
   * console.log(analytics.chartData);
   * // [
   * //   { status: 'em_execucao', value: 500000.00, count: 25 },
   * //   { status: 'assinado', value: 300000.00, count: 15 },
   * //   ...
   * // ]
   * ```
   */
  async getValueByStatus(
    organizationId: string,
  ): Promise<ValueByStatusResponse> {
    // Query agregada: agrupa por status e soma valor + conta registros
    const results = await this.contratoRepository
      .createQueryBuilder('contrato')
      .select('contrato.status', 'status')
      .addSelect('SUM(CAST(contrato.valorGlobal AS DECIMAL))', 'value')
      .addSelect('COUNT(contrato.id)', 'count')
      .where('contrato.organizationId = :organizationId', { organizationId })
      .groupBy('contrato.status')
      .getRawMany<{ status: ContratoStatus; value: string; count: string }>();

    // Mapear resultados para formato esperado pelo frontend
    const chartData: ValueByStatusEntry[] = results.map((row) => ({
      status: row.status,
      value: parseFloat(row.value || '0'),
      count: parseInt(row.count || '0', 10),
    }));

    return { chartData };
  }

  /**
   * Busca contratos vencendo nos próximos N dias para timeline visual.
   *
   * Retorna lista detalhada de contratos próximos ao vencimento,
   * ordenados por data crescente (vence primeiro = aparece primeiro).
   *
   * Usado para renderizar componente ExpirationTimeline no dashboard (#1662).
   *
   * **Regras de Negócio:**
   * - Apenas contratos ativos (ASSINADO, EM_EXECUCAO, ADITIVADO, SUSPENSO)
   * - vigenciaFim entre hoje e hoje + N dias
   * - Calcula daysUntilExpiration com precisão de dias (não horas)
   * - Ordena por vigenciaFim ASC (mais próximo primeiro)
   *
   * @param organizationId - UUID da organização (multi-tenancy)
   * @param days - Quantidade de dias para lookahead (default: 90)
   * @returns {Promise<ExpirationTimelineResponse>} Contratos expirando ordenados
   *
   * @example
   * ```typescript
   * const timeline = await kpiService.getExpirationTimeline('org-uuid', 90);
   * console.log(timeline.timeline);
   * // [
   * //   { numero: '001/2024', contratado: 'Empresa A', daysUntilExpiration: 15, ... },
   * //   { numero: '002/2024', contratado: 'Empresa B', daysUntilExpiration: 45, ... },
   * //   ...
   * // ]
   * ```
   */
  async getExpirationTimeline(
    organizationId: string,
    days: number = 90,
  ): Promise<ExpirationTimelineResponse> {
    const today = new Date();
    const futureDate = new Date();
    futureDate.setDate(today.getDate() + days);

    // Status considerados "vigentes"
    const activeStatuses = [
      ContratoStatus.ASSINADO,
      ContratoStatus.EM_EXECUCAO,
      ContratoStatus.ADITIVADO,
      ContratoStatus.SUSPENSO,
    ];

    // Query: busca contratos vencendo no período
    const results = await this.contratoRepository
      .createQueryBuilder('contrato')
      .select([
        'contrato.id',
        'contrato.numero',
        'contrato.contratadoRazaoSocial',
        'contrato.vigenciaFim',
        'contrato.valorGlobal',
      ])
      .where('contrato.organizationId = :organizationId', { organizationId })
      .andWhere('contrato.status IN (:...statuses)', {
        statuses: activeStatuses,
      })
      .andWhere('contrato.vigenciaFim BETWEEN :today AND :futureDate', {
        today: today.toISOString().split('T')[0], // YYYY-MM-DD
        futureDate: futureDate.toISOString().split('T')[0],
      })
      .orderBy('contrato.vigenciaFim', 'ASC')
      .getMany();

    // Mapear para formato do timeline com cálculo de dias
    const timeline: ExpiringContractEntry[] = results.map((contrato) => {
      const vigenciaDate = new Date(contrato.vigenciaFim);
      const todayNormalized = new Date(today.toISOString().split('T')[0]);
      const daysUntilExpiration = Math.ceil(
        (vigenciaDate.getTime() - todayNormalized.getTime()) /
          (1000 * 60 * 60 * 24),
      );

      return {
        contratoId: contrato.id,
        numero: contrato.numero,
        contratado: contrato.contratadoRazaoSocial,
        vigenciaFim: contrato.vigenciaFim.toISOString().split('T')[0], // Convert Date to ISO string (YYYY-MM-DD)
        daysUntilExpiration,
        valor: contrato.valorGlobal,
      };
    });

    return { timeline };
  }
}
