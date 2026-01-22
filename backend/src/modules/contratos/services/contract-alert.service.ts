import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { addDays, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Contrato, ContratoStatus } from '../../../entities/contrato.entity';
import { EmailService } from '../../email/email.service';

/**
 * Tipos de alertas de contrato.
 */
export enum AlertType {
  /** Contrato vencendo em 30 dias */
  EXPIRING_SOON = 'EXPIRING_SOON',
  /** Avaliar necessidade de renovação (60 dias antes) */
  RENEWAL_EVALUATION = 'RENEWAL_EVALUATION',
  /** Contrato com 80% do valor executado */
  BUDGET_80_PERCENT = 'BUDGET_80_PERCENT',
  /** Contrato vencido sem renovação */
  EXPIRED = 'EXPIRED',
}

/**
 * Contract Alert Service - Sistema de alertas automáticos para prazos contratuais.
 *
 * Implementa notificações automáticas conforme Art. 117 da Lei 14.133/2021.
 * Monitora prazos críticos e dispara alertas para gestores/fiscais.
 *
 * **Issue #1287** - [Contratos-d] Alertas de vencimento e aditivos
 *
 * @see Lei 14.133/2021 Art. 117 - Gestão de contratos
 */
@Injectable()
export class ContractAlertService {
  private readonly logger = new Logger(ContractAlertService.name);

  constructor(
    @InjectRepository(Contrato)
    private contratoRepository: Repository<Contrato>,
    private emailService: EmailService,
  ) {}

  /**
   * Verifica contratos próximos do vencimento e dispara alertas.
   *
   * Alertas enviados:
   * - 60 dias antes: Avaliar necessidade de renovação
   * - 30 dias antes: Contrato próximo do vencimento
   *
   * @returns Número de alertas enviados
   */
  async checkExpiringContracts(): Promise<number> {
    let totalAlerts = 0;

    // Alertas em 60 dias
    const contracts60Days = await this.findContractsExpiringIn(60);
    for (const contract of contracts60Days) {
      await this.sendAlert(contract, AlertType.RENEWAL_EVALUATION);
      totalAlerts++;
    }

    this.logger.log(
      `Sent ${contracts60Days.length} RENEWAL_EVALUATION alerts (60 days)`,
    );

    // Alertas em 30 dias
    const contracts30Days = await this.findContractsExpiringIn(30);
    for (const contract of contracts30Days) {
      await this.sendAlert(contract, AlertType.EXPIRING_SOON);
      totalAlerts++;
    }

    this.logger.log(
      `Sent ${contracts30Days.length} EXPIRING_SOON alerts (30 days)`,
    );

    // Contratos vencidos
    const expiredContracts = await this.findExpiredContracts();
    for (const contract of expiredContracts) {
      await this.sendAlert(contract, AlertType.EXPIRED);
      totalAlerts++;
    }

    this.logger.log(`Sent ${expiredContracts.length} EXPIRED alerts`);

    return totalAlerts;
  }

  /**
   * Verifica contratos que atingiram 80% da execução orçamentária.
   *
   * @returns Número de alertas enviados
   */
  async checkBudgetThreshold(): Promise<number> {
    // TODO: Implementar após criação de entity Medicao (#1286)
    // Por ora, retorna 0 (sem medições implementadas)
    this.logger.warn(
      'Budget threshold check skipped - Medicao entity not implemented yet (Issue #1286)',
    );
    return 0;
  }

  /**
   * Busca contratos vencendo em N dias.
   *
   * @param days Número de dias antes do vencimento
   * @returns Contratos encontrados
   */
  private async findContractsExpiringIn(days: number): Promise<Contrato[]> {
    const now = new Date();
    const targetDate = addDays(now, days);

    // Janela de 1 dia (targetDate ± 12h)
    const start = new Date(targetDate);
    start.setHours(0, 0, 0, 0);

    const end = new Date(targetDate);
    end.setHours(23, 59, 59, 999);

    return this.contratoRepository.find({
      where: {
        vigenciaFim: Between(start, end),
        status: ContratoStatus.EM_EXECUCAO, // Apenas contratos em execução
      },
      relations: ['gestorResponsavel', 'fiscalResponsavel', 'organization'],
    });
  }

  /**
   * Busca contratos vencidos (vigenciaFim < hoje) ainda em execução.
   *
   * @returns Contratos vencidos
   */
  private async findExpiredContracts(): Promise<Contrato[]> {
    const now = new Date();

    return this.contratoRepository
      .find({
        where: {
          status: ContratoStatus.EM_EXECUCAO,
        },
        relations: ['gestorResponsavel', 'fiscalResponsavel', 'organization'],
      })
      .then((contracts) => contracts.filter((c) => c.vigenciaFim < now));
  }

  /**
   * Envia alerta para gestor e fiscal do contrato.
   *
   * @param contract Contrato alvo do alerta
   * @param type Tipo de alerta
   */
  private async sendAlert(contract: Contrato, type: AlertType): Promise<void> {
    // Enviar email para gestor
    await this.sendEmail(contract, type, contract.gestorResponsavel.email);

    // Enviar email para fiscal
    if (contract.fiscalResponsavel.email !== contract.gestorResponsavel.email) {
      await this.sendEmail(contract, type, contract.fiscalResponsavel.email);
    }

    this.logger.log(
      `Alert sent: ${type} for contract ${contract.numero} to gestor ${contract.gestorResponsavel.email} and fiscal ${contract.fiscalResponsavel.email}`,
    );

    // TODO: Criar notificação in-app quando NotificationService for implementado (#1288)
    // await this.notificationService.create({
    //   userId: contract.gestorResponsavel.id,
    //   type: 'CONTRACT_ALERT',
    //   title,
    //   message,
    //   metadata: { contractId: contract.id, alertType: type },
    // });
  }

  /**
   * Envia email de alerta.
   *
   * @param contract Contrato alvo
   * @param type Tipo de alerta
   * @param recipientEmail Email do destinatário
   */
  private async sendEmail(
    contract: Contrato,
    type: AlertType,
    recipientEmail: string,
  ): Promise<void> {
    const title = this.getAlertTitle(type);
    const message = this.getAlertMessage(contract, type);

    const emailBody = `
      <html>
        <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px;">
            <h2 style="color: #d32f2f; margin-top: 0;">⚠️ ${title}</h2>
            <p style="color: #424242; font-size: 16px;">${message}</p>

            <div style="background-color: white; padding: 15px; border-radius: 4px; margin: 20px 0;">
              <h3 style="margin-top: 0; color: #1976d2;">Dados do Contrato</h3>
              <p><strong>Número:</strong> ${contract.numero}</p>
              <p><strong>Objeto:</strong> ${contract.objeto}</p>
              <p><strong>Contratado:</strong> ${contract.contratadoRazaoSocial} (CNPJ: ${contract.contratadoCnpj})</p>
              <p><strong>Valor Global:</strong> R$ ${parseFloat(contract.valorGlobal).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
              <p><strong>Vigência:</strong> ${format(contract.vigenciaInicio, 'dd/MM/yyyy', { locale: ptBR })} até ${format(contract.vigenciaFim, 'dd/MM/yyyy', { locale: ptBR })}</p>
              <p><strong>Gestor:</strong> ${contract.gestorResponsavel.name}</p>
              <p><strong>Fiscal:</strong> ${contract.fiscalResponsavel.name}</p>
            </div>

            <div style="background-color: #fff3cd; padding: 15px; border-radius: 4px; margin: 20px 0;">
              <h3 style="margin-top: 0; color: #856404;">📋 Ações Recomendadas</h3>
              ${this.getRecommendedActions(type)}
            </div>

            <p style="color: #757575; font-size: 12px; margin-top: 30px;">
              Este é um alerta automático gerado pelo sistema ETP Express.<br>
              Fundamentação Legal: Lei 14.133/2021 Art. 117 (Gestão de Contratos)
            </p>
          </div>
        </body>
      </html>
    `;

    try {
      await this.emailService.sendMail({
        to: recipientEmail,
        subject: `[ETP Express] ${title}`,
        html: emailBody,
      });

      this.logger.log(
        `Email sent to ${recipientEmail} for contract ${contract.numero}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to send email to ${recipientEmail} for contract ${contract.numero}: ${error.message}`,
      );
      // Não propaga erro para não interromper processamento de outros alertas
    }
  }

  /**
   * Retorna título do alerta baseado no tipo.
   *
   * @param type Tipo de alerta
   * @returns Título formatado
   */
  private getAlertTitle(type: AlertType): string {
    const titles: Record<AlertType, string> = {
      [AlertType.EXPIRING_SOON]: 'Contrato próximo do vencimento (30 dias)',
      [AlertType.RENEWAL_EVALUATION]:
        'Avaliar necessidade de renovação de contrato (60 dias)',
      [AlertType.BUDGET_80_PERCENT]: 'Contrato com 80% do orçamento executado',
      [AlertType.EXPIRED]: 'Contrato vencido - Ação urgente necessária',
    };
    return titles[type] || 'Alerta de contrato';
  }

  /**
   * Retorna mensagem detalhada do alerta.
   *
   * @param contract Contrato alvo
   * @param type Tipo de alerta
   * @returns Mensagem formatada
   */
  private getAlertMessage(contract: Contrato, type: AlertType): string {
    const vigenciaFimFormatted = format(contract.vigenciaFim, 'dd/MM/yyyy', {
      locale: ptBR,
    });

    switch (type) {
      case AlertType.EXPIRING_SOON:
        return `O contrato ${contract.numero} vence em <strong>30 dias</strong> (${vigenciaFimFormatted}). Avalie a necessidade de renovação ou encerramento.`;

      case AlertType.RENEWAL_EVALUATION:
        return `O contrato ${contract.numero} vence em <strong>60 dias</strong> (${vigenciaFimFormatted}). Inicie processo de avaliação para renovação ou novo procedimento licitatório.`;

      case AlertType.BUDGET_80_PERCENT:
        return `O contrato ${contract.numero} atingiu <strong>80% do valor global executado</strong>. Verifique necessidade de termo aditivo ou ajustes.`;

      case AlertType.EXPIRED:
        return `<strong>URGENTE:</strong> O contrato ${contract.numero} venceu em ${vigenciaFimFormatted} e ainda está com status EM_EXECUÇÃO. Providencie encerramento ou formalização de prorrogação imediatamente.`;

      default:
        return `Alerta sobre o contrato ${contract.numero}.`;
    }
  }

  /**
   * Retorna ações recomendadas para cada tipo de alerta.
   *
   * @param type Tipo de alerta
   * @returns HTML com ações recomendadas
   */
  private getRecommendedActions(type: AlertType): string {
    const actions: Record<AlertType, string> = {
      [AlertType.EXPIRING_SOON]: `
        <ul>
          <li>Verificar desempenho do contratado e histórico de ocorrências</li>
          <li>Avaliar se há interesse na renovação</li>
          <li>Se houver renovação: preparar termo aditivo</li>
          <li>Se não houver renovação: planejar novo processo licitatório ou contratação direta</li>
        </ul>
      `,
      [AlertType.RENEWAL_EVALUATION]: `
        <ul>
          <li>Iniciar avaliação de desempenho do contrato</li>
          <li>Analisar viabilidade de renovação vs. nova contratação</li>
          <li>Verificar disponibilidade orçamentária para renovação</li>
          <li>Realizar pesquisa de preços preliminar</li>
          <li>Reunir documentação necessária (atestes, relatórios de fiscalização)</li>
        </ul>
      `,
      [AlertType.BUDGET_80_PERCENT]: `
        <ul>
          <li>Revisar medições e projetar valor final</li>
          <li>Avaliar necessidade de termo aditivo de valor</li>
          <li>Verificar limite legal de 25% (Art. 125 Lei 14.133/2021)</li>
          <li>Preparar justificativa técnica se necessário aditivo</li>
        </ul>
      `,
      [AlertType.EXPIRED]: `
        <ul>
          <li><strong>IMEDIATO:</strong> Suspender novas medições/entregas</li>
          <li>Verificar se houve prorrogação não formalizada</li>
          <li>Se prorrogação válida: regularizar documentação urgentemente</li>
          <li>Se não houver prorrogação: encerrar contrato formalmente</li>
          <li>Notificar contratado sobre situação</li>
          <li>Comunicar área jurídica sobre irregularidade</li>
        </ul>
      `,
    };

    return actions[type] || '<p>Verifique o contrato no sistema.</p>';
  }
}
