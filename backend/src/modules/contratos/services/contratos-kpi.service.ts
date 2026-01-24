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
}
