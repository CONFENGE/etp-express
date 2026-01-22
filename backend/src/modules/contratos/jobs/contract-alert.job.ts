import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ContractAlertService } from '../services/contract-alert.service';

/**
 * Contract Alert Job - Job agendado para verificação diária de alertas de contratos.
 *
 * Executa diariamente às 8h (horário do servidor):
 * - Verifica contratos vencendo em 30/60 dias
 * - Verifica contratos vencidos
 * - Verifica contratos com 80% do orçamento executado
 *
 * **Issue #1287** - [Contratos-d] Alertas de vencimento e aditivos
 *
 * @see Lei 14.133/2021 Art. 117 - Gestão de contratos
 */
@Injectable()
export class ContractAlertJob {
  private readonly logger = new Logger(ContractAlertJob.name);

  constructor(private contractAlertService: ContractAlertService) {}

  /**
   * Executa verificação diária de alertas de contratos.
   *
   * **Cron:** Todo dia às 8:00 AM
   *
   * @cron 0 8 * * * (every day at 8:00 AM)
   */
  @Cron(CronExpression.EVERY_DAY_AT_8AM, {
    name: 'contract-alerts',
    timeZone: 'America/Sao_Paulo', // Timezone Brasil (BRT/BRST)
  })
  async runDailyAlerts(): Promise<void> {
    this.logger.log('Starting daily contract alerts job...');

    try {
      const startTime = Date.now();

      // Verificar contratos vencendo e vencidos
      const expiringAlerts =
        await this.contractAlertService.checkExpiringContracts();

      // Verificar threshold de orçamento (80%)
      const budgetAlerts =
        await this.contractAlertService.checkBudgetThreshold();

      const totalAlerts = expiringAlerts + budgetAlerts;
      const duration = Date.now() - startTime;

      this.logger.log(
        `Daily contract alerts completed successfully - Total: ${totalAlerts} alerts sent (${expiringAlerts} expiring, ${budgetAlerts} budget) in ${duration}ms`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to run daily contract alerts job: ${error.message}`,
        error.stack,
      );
      // Não propaga erro para não interromper scheduler
      // Erro será registrado em logs para investigação
    }
  }
}
