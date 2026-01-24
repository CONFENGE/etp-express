import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';

import { FiscalizacaoNotificationService } from '../services/fiscalizacao-notification.service';

/**
 * Job agendado para verificação periódica de prazos de fiscalização.
 *
 * Executa diariamente às 08:00 (America/Sao_Paulo) para:
 * - Identificar medições pendentes de ateste há mais de 5 dias
 * - Identificar ocorrências abertas próximas do prazo de resolução
 * - Enviar notificações automáticas aos responsáveis
 *
 * @see FiscalizacaoNotificationService
 */
@Injectable()
export class FiscalizacaoNotificationJob {
  private readonly logger = new Logger(FiscalizacaoNotificationJob.name);

  constructor(
    private fiscalizacaoNotificationService: FiscalizacaoNotificationService,
  ) {}

  /**
   * Job diário para verificar prazos de medições e ocorrências.
   *
   * Executa às 08:00 todos os dias (timezone: America/Sao_Paulo).
   *
   * - Verifica medições pendentes de ateste há > 5 dias
   * - Verifica ocorrências abertas próximas do prazo (≤ 3 dias)
   * - Envia notificações aos fiscais e gestores responsáveis
   *
   * Erros são capturados e logados sem propagação.
   *
   * @returns Promise<void>
   */
  @Cron(CronExpression.EVERY_DAY_AT_8AM, {
    name: 'fiscalizacao-prazos',
    timeZone: 'America/Sao_Paulo',
  })
  async runDailyPrazosCheck(): Promise<void> {
    this.logger.log(
      'Iniciando job de verificação de prazos de fiscalização...',
    );

    try {
      // Verifica medições pendentes
      const alertasMedicao =
        await this.fiscalizacaoNotificationService.checkPrazosMedicaoPendente();

      // Verifica ocorrências abertas
      const alertasOcorrencia =
        await this.fiscalizacaoNotificationService.checkPrazosOcorrenciaAberta();

      const totalAlertas = alertasMedicao + alertasOcorrencia;

      this.logger.log(
        `Job concluído com sucesso: ${totalAlertas} notificações enviadas (${alertasMedicao} medições, ${alertasOcorrencia} ocorrências)`,
      );
    } catch (error) {
      this.logger.error(
        `Falha na execução do job de prazos de fiscalização: ${error.message}`,
        error.stack,
      );
      // Não propaga erro para não interromper agendamento futuro
    }
  }

  /**
   * Job executado a cada 6 horas para verificações mais frequentes de ocorrências críticas.
   *
   * Executa às 00:00, 06:00, 12:00 e 18:00 (timezone: America/Sao_Paulo).
   *
   * Verifica apenas ocorrências abertas próximas do prazo ou vencidas,
   * garantindo maior frequência de monitoramento para casos críticos.
   *
   * @returns Promise<void>
   */
  @Cron('0 */6 * * *', {
    name: 'fiscalizacao-ocorrencias-criticas',
    timeZone: 'America/Sao_Paulo',
  })
  async runOcorrenciasCriticasCheck(): Promise<void> {
    this.logger.log(
      'Iniciando job de verificação de ocorrências críticas...',
    );

    try {
      const alertasOcorrencia =
        await this.fiscalizacaoNotificationService.checkPrazosOcorrenciaAberta();

      this.logger.log(
        `Job de ocorrências críticas concluído: ${alertasOcorrencia} notificações enviadas`,
      );
    } catch (error) {
      this.logger.error(
        `Falha na execução do job de ocorrências críticas: ${error.message}`,
        error.stack,
      );
    }
  }
}
