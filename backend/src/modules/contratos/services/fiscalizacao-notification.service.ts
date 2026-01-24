import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

import { EmailService } from '../../email/email.service';
import { Medicao, MedicaoStatus } from '../../../entities/medicao.entity';
import {
  Ocorrencia,
  OcorrenciaStatus,
} from '../../../entities/ocorrencia.entity';
import { Ateste } from '../../../entities/ateste.entity';

/**
 * Serviço de notificações para eventos de fiscalização de contratos.
 *
 * Responsável por enviar notificações automáticas relacionadas a:
 * - Medições criadas, aprovadas ou rejeitadas
 * - Ocorrências críticas ou próximas do prazo
 * - Alertas de prazos de ateste
 *
 * Utiliza EmailService para envio de emails HTML formatados.
 *
 * @see EmailService
 * @see Medicao
 * @see Ocorrencia
 * @see Ateste
 */
@Injectable()
export class FiscalizacaoNotificationService {
  private readonly logger = new Logger(FiscalizacaoNotificationService.name);

  constructor(
    @InjectRepository(Medicao)
    private medicaoRepository: Repository<Medicao>,
    @InjectRepository(Ocorrencia)
    private ocorrenciaRepository: Repository<Ocorrencia>,
    @InjectRepository(Ateste)
    private atesteRepository: Repository<Ateste>,
    private emailService: EmailService,
  ) {}

  /**
   * Envia notificação quando uma nova medição é criada.
   * Destinatário: Fiscal responsável do contrato.
   *
   * @param medicao - Medição criada (com relações contrato e fiscalResponsavel carregadas)
   * @returns Promise<void>
   */
  async notifyMedicaoCriada(medicao: Medicao): Promise<void> {
    if (!medicao.fiscalResponsavel?.email) {
      this.logger.warn(
        `Fiscal responsável não encontrado para medição #${medicao.numero}`,
      );
      return;
    }

    const subject = `[ETP Express] Nova Medição #${medicao.numero} - ${medicao.contrato.objeto.substring(0, 50)}...`;

    const prazoAteste = new Date();
    prazoAteste.setDate(prazoAteste.getDate() + 5); // Prazo padrão: 5 dias

    const valorFormatado = parseFloat(medicao.valorMedido)
      .toFixed(2)
      .replace('.', ',')
      .replace(/\B(?=(\d{3})+(?!\d))/g, '.');

    const emailBody = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 8px 8px 0 0; }
    .content { background: white; padding: 30px; border: 1px solid #e5e7eb; border-radius: 0 0 8px 8px; }
    .info-box { background: #f3f4f6; padding: 15px; border-radius: 6px; margin: 15px 0; }
    .info-row { display: flex; justify-content: space-between; margin: 8px 0; }
    .label { font-weight: 600; color: #6b7280; }
    .value { color: #111827; }
    .alert { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 12px; margin: 15px 0; border-radius: 4px; }
    .footer { text-align: center; color: #6b7280; font-size: 12px; margin-top: 20px; }
    .btn { display: inline-block; background: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 15px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 style="margin: 0; font-size: 24px;">📋 Nova Medição Criada</h1>
      <p style="margin: 10px 0 0 0; opacity: 0.9;">Fiscalização de Contratos</p>
    </div>
    <div class="content">
      <p>Olá, <strong>${medicao.fiscalResponsavel.name}</strong>,</p>

      <p>Uma nova medição foi registrada e aguarda seu ateste:</p>

      <div class="info-box">
        <div class="info-row">
          <span class="label">Medição Nº:</span>
          <span class="value">#${medicao.numero}</span>
        </div>
        <div class="info-row">
          <span class="label">Contrato:</span>
          <span class="value">${medicao.contrato.numero}</span>
        </div>
        <div class="info-row">
          <span class="label">Objeto:</span>
          <span class="value">${medicao.contrato.objeto}</span>
        </div>
        <div class="info-row">
          <span class="label">Período:</span>
          <span class="value">
            ${format(medicao.periodoInicio, 'dd/MM/yyyy', { locale: ptBR })} a
            ${format(medicao.periodoFim, 'dd/MM/yyyy', { locale: ptBR })}
          </span>
        </div>
        <div class="info-row">
          <span class="label">Valor Medido:</span>
          <span class="value">R$ ${valorFormatado}</span>
        </div>
      </div>

      <div class="alert">
        <strong>⏰ Prazo para ateste:</strong>
        ${format(prazoAteste, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
      </div>

      ${medicao.observacoes ? `<p><strong>Observações:</strong><br/>${medicao.observacoes}</p>` : ''}

      <p style="margin-top: 25px;">
        <a href="${process.env.FRONTEND_URL}/contratos/${medicao.contratoId}/fiscalizacao" class="btn">
          Visualizar Medição
        </a>
      </p>

      <div class="footer">
        <p>Este é um email automático do sistema ETP Express.</p>
        <p>Em caso de dúvidas, entre em contato: ${process.env.SUPPORT_EMAIL || 'suporte@confenge.com.br'}</p>
      </div>
    </div>
  </div>
</body>
</html>
    `;

    try {
      await this.emailService.sendMail({
        to: medicao.fiscalResponsavel.email,
        subject,
        html: emailBody,
      });

      this.logger.log(
        `Notificação enviada para ${medicao.fiscalResponsavel.email} - Medição #${medicao.numero}`,
      );
    } catch (error) {
      this.logger.error(
        `Falha ao enviar email de medição criada: ${error.message}`,
        error.stack,
      );
      // Não propaga erro para não interromper fluxo de criação
    }
  }

  /**
   * Envia notificação quando uma medição é rejeitada.
   * Destinatário: Criador da medição (usuário que registrou).
   *
   * @param medicao - Medição rejeitada
   * @param ateste - Ateste contendo justificativa da rejeição
   * @returns Promise<void>
   */
  async notifyMedicaoRejeitada(
    medicao: Medicao,
    ateste: Ateste,
  ): Promise<void> {
    if (!medicao.createdBy?.email) {
      this.logger.warn(
        `Criador da medição #${medicao.numero} não possui email`,
      );
      return;
    }

    const subject = `[ETP Express] Medição #${medicao.numero} REJEITADA - ${medicao.contrato.objeto.substring(0, 50)}...`;

    const valorFormatado = parseFloat(medicao.valorMedido)
      .toFixed(2)
      .replace('.', ',')
      .replace(/\B(?=(\d{3})+(?!\d))/g, '.');

    const emailBody = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); color: white; padding: 30px; border-radius: 8px 8px 0 0; }
    .content { background: white; padding: 30px; border: 1px solid #e5e7eb; border-radius: 0 0 8px 8px; }
    .info-box { background: #f3f4f6; padding: 15px; border-radius: 6px; margin: 15px 0; }
    .info-row { display: flex; justify-content: space-between; margin: 8px 0; }
    .label { font-weight: 600; color: #6b7280; }
    .value { color: #111827; }
    .rejection-box { background: #fee2e2; border-left: 4px solid #ef4444; padding: 15px; margin: 15px 0; border-radius: 4px; }
    .footer { text-align: center; color: #6b7280; font-size: 12px; margin-top: 20px; }
    .btn { display: inline-block; background: #ef4444; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 15px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 style="margin: 0; font-size: 24px;">❌ Medição Rejeitada</h1>
      <p style="margin: 10px 0 0 0; opacity: 0.9;">Fiscalização de Contratos</p>
    </div>
    <div class="content">
      <p>Olá, <strong>${medicao.createdBy.name}</strong>,</p>

      <p>A medição que você registrou foi rejeitada pelo fiscal responsável:</p>

      <div class="info-box">
        <div class="info-row">
          <span class="label">Medição Nº:</span>
          <span class="value">#${medicao.numero}</span>
        </div>
        <div class="info-row">
          <span class="label">Contrato:</span>
          <span class="value">${medicao.contrato.numero}</span>
        </div>
        <div class="info-row">
          <span class="label">Valor Medido:</span>
          <span class="value">R$ ${valorFormatado}</span>
        </div>
        <div class="info-row">
          <span class="label">Rejeitado em:</span>
          <span class="value">${format(ateste.dataAteste, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</span>
        </div>
        <div class="info-row">
          <span class="label">Fiscal:</span>
          <span class="value">${ateste.fiscal.name}</span>
        </div>
      </div>

      <div class="rejection-box">
        <strong>📝 Justificativa da Rejeição:</strong>
        <p style="margin: 10px 0 0 0;">${ateste.justificativa}</p>
        ${ateste.observacoes ? `<p style="margin: 10px 0 0 0;"><em>Observações: ${ateste.observacoes}</em></p>` : ''}
      </div>

      <p><strong>Próximos Passos:</strong></p>
      <ul>
        <li>Revise a justificativa apresentada</li>
        <li>Corrija os pontos mencionados</li>
        <li>Registre uma nova medição com as correções</li>
        <li>Entre em contato com o fiscal em caso de dúvidas</li>
      </ul>

      <p style="margin-top: 25px;">
        <a href="${process.env.FRONTEND_URL}/contratos/${medicao.contratoId}/fiscalizacao" class="btn">
          Visualizar Detalhes
        </a>
      </p>

      <div class="footer">
        <p>Este é um email automático do sistema ETP Express.</p>
        <p>Em caso de dúvidas, entre em contato: ${process.env.SUPPORT_EMAIL || 'suporte@confenge.com.br'}</p>
      </div>
    </div>
  </div>
</body>
</html>
    `;

    try {
      await this.emailService.sendMail({
        to: medicao.createdBy.email,
        subject,
        html: emailBody,
      });

      this.logger.log(
        `Notificação de rejeição enviada para ${medicao.createdBy.email} - Medição #${medicao.numero}`,
      );
    } catch (error) {
      this.logger.error(
        `Falha ao enviar email de medição rejeitada: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Envia notificação quando uma ocorrência crítica é registrada.
   * Destinatários: Gestor do contrato + Fiscal responsável.
   *
   * @param ocorrencia - Ocorrência de gravidade CRÍTICA
   * @returns Promise<void>
   */
  async notifyOcorrenciaCritica(ocorrencia: Ocorrencia): Promise<void> {
    const emails: string[] = [];

    // Adiciona email do fiscal responsável
    if (ocorrencia.contrato.fiscalResponsavelId) {
      const fiscal = ocorrencia.contrato.fiscalResponsavel;
      if (fiscal?.email) {
        emails.push(fiscal.email);
      }
    }

    // Adiciona email do gestor do contrato
    if (ocorrencia.contrato.gestorResponsavelId) {
      const gestor = ocorrencia.contrato.gestorResponsavel;
      if (gestor?.email && !emails.includes(gestor.email)) {
        emails.push(gestor.email);
      }
    }

    if (emails.length === 0) {
      this.logger.warn(
        `Nenhum destinatário encontrado para ocorrência crítica #${ocorrencia.id}`,
      );
      return;
    }

    const subject = `[ETP Express] 🚨 OCORRÊNCIA CRÍTICA - Contrato ${ocorrencia.contrato.numero}`;

    const prazoFormatado = ocorrencia.prazoResolucao
      ? format(ocorrencia.prazoResolucao, 'dd/MM/yyyy', { locale: ptBR })
      : 'Não definido';

    const emailBody = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #dc2626 0%, #991b1b 100%); color: white; padding: 30px; border-radius: 8px 8px 0 0; }
    .content { background: white; padding: 30px; border: 1px solid #e5e7eb; border-radius: 0 0 8px 8px; }
    .info-box { background: #f3f4f6; padding: 15px; border-radius: 6px; margin: 15px 0; }
    .info-row { display: flex; justify-content: space-between; margin: 8px 0; }
    .label { font-weight: 600; color: #6b7280; }
    .value { color: #111827; }
    .critical-box { background: #fee2e2; border: 2px solid #dc2626; padding: 15px; margin: 15px 0; border-radius: 6px; }
    .footer { text-align: center; color: #6b7280; font-size: 12px; margin-top: 20px; }
    .btn { display: inline-block; background: #dc2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 15px; font-weight: 600; }
    .badge-critica { background: #dc2626; color: white; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: 600; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 style="margin: 0; font-size: 24px;">🚨 Ocorrência Crítica Registrada</h1>
      <p style="margin: 10px 0 0 0; opacity: 0.9;">Ação Imediata Requerida</p>
    </div>
    <div class="content">
      <p><strong>Atenção!</strong></p>

      <p>Uma ocorrência de gravidade <span class="badge-critica">CRÍTICA</span> foi registrada e requer atenção imediata:</p>

      <div class="info-box">
        <div class="info-row">
          <span class="label">Contrato:</span>
          <span class="value">${ocorrencia.contrato.numero}</span>
        </div>
        <div class="info-row">
          <span class="label">Objeto:</span>
          <span class="value">${ocorrencia.contrato.objeto}</span>
        </div>
        <div class="info-row">
          <span class="label">Tipo:</span>
          <span class="value">${this.formatTipoOcorrencia(ocorrencia.tipo)}</span>
        </div>
        <div class="info-row">
          <span class="label">Data da Ocorrência:</span>
          <span class="value">${format(ocorrencia.dataOcorrencia, 'dd/MM/yyyy', { locale: ptBR })}</span>
        </div>
        <div class="info-row">
          <span class="label">Prazo de Resolução:</span>
          <span class="value">${prazoFormatado}</span>
        </div>
        <div class="info-row">
          <span class="label">Registrado por:</span>
          <span class="value">${ocorrencia.registradoPor.name}</span>
        </div>
      </div>

      <div class="critical-box">
        <strong>📋 Descrição:</strong>
        <p style="margin: 10px 0;">${ocorrencia.descricao}</p>

        <strong>⚡ Ação Corretiva Requerida:</strong>
        <p style="margin: 10px 0 0 0;">${ocorrencia.acaoCorretiva}</p>
      </div>

      <p><strong>Medidas Necessárias:</strong></p>
      <ul>
        <li>Avalie a gravidade da ocorrência</li>
        <li>Implemente a ação corretiva no prazo estabelecido</li>
        <li>Documente todas as ações tomadas</li>
        <li>Notifique a contratada imediatamente</li>
        <li>Monitore o progresso da resolução</li>
      </ul>

      <p style="margin-top: 25px;">
        <a href="${process.env.FRONTEND_URL}/contratos/${ocorrencia.contratoId}/fiscalizacao" class="btn">
          Visualizar Ocorrência
        </a>
      </p>

      <div class="footer">
        <p>Este é um email automático do sistema ETP Express.</p>
        <p><strong>ATENÇÃO: Esta ocorrência requer ação imediata.</strong></p>
        <p>Em caso de dúvidas, entre em contato: ${process.env.SUPPORT_EMAIL || 'suporte@confenge.com.br'}</p>
      </div>
    </div>
  </div>
</body>
</html>
    `;

    try {
      await this.emailService.sendMail({
        to: emails.join(', '),
        subject,
        html: emailBody,
      });

      this.logger.log(
        `Notificação de ocorrência crítica enviada para ${emails.join(', ')} - Ocorrência #${ocorrencia.id}`,
      );
    } catch (error) {
      this.logger.error(
        `Falha ao enviar email de ocorrência crítica: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Verifica medições pendentes há mais de 5 dias e envia alertas.
   * Chamado via job agendado (cron).
   *
   * @returns Promise<number> - Quantidade de alertas enviados
   */
  async checkPrazosMedicaoPendente(): Promise<number> {
    const cincoDiasAtras = new Date();
    cincoDiasAtras.setDate(cincoDiasAtras.getDate() - 5);

    const medicoesPendentes = await this.medicaoRepository.find({
      where: {
        status: MedicaoStatus.PENDENTE,
      },
      relations: [
        'contrato',
        'contrato.fiscalResponsavel',
        'fiscalResponsavel',
      ],
    });

    // Filtrar medições criadas há mais de 5 dias
    const medicoesAtrasadas = medicoesPendentes.filter(
      (m) => m.createdAt < cincoDiasAtras,
    );

    let alertasEnviados = 0;

    for (const medicao of medicoesAtrasadas) {
      await this.notifyPrazoAtestePendente(medicao);
      alertasEnviados++;
    }

    this.logger.log(
      `Verificação de prazos: ${alertasEnviados} alertas enviados de ${medicoesAtrasadas.length} medições atrasadas`,
    );

    return alertasEnviados;
  }

  /**
   * Envia alerta de prazo de ateste vencendo.
   * Destinatário: Fiscal responsável.
   *
   * @param medicao - Medição pendente há mais de 5 dias
   * @returns Promise<void>
   */
  private async notifyPrazoAtestePendente(medicao: Medicao): Promise<void> {
    if (!medicao.fiscalResponsavel?.email) {
      this.logger.warn(
        `Fiscal responsável não encontrado para medição #${medicao.numero}`,
      );
      return;
    }

    const diasPendente = Math.floor(
      (new Date().getTime() - medicao.createdAt.getTime()) /
        (1000 * 60 * 60 * 24),
    );

    const subject = `[ETP Express] ⏰ ALERTA: Medição #${medicao.numero} Pendente há ${diasPendente} dias`;

    const valorFormatado = parseFloat(medicao.valorMedido)
      .toFixed(2)
      .replace('.', ',')
      .replace(/\B(?=(\d{3})+(?!\d))/g, '.');

    const emailBody = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: white; padding: 30px; border-radius: 8px 8px 0 0; }
    .content { background: white; padding: 30px; border: 1px solid #e5e7eb; border-radius: 0 0 8px 8px; }
    .info-box { background: #f3f4f6; padding: 15px; border-radius: 6px; margin: 15px 0; }
    .info-row { display: flex; justify-content: space-between; margin: 8px 0; }
    .label { font-weight: 600; color: #6b7280; }
    .value { color: #111827; }
    .warning-box { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 15px 0; border-radius: 4px; }
    .footer { text-align: center; color: #6b7280; font-size: 12px; margin-top: 20px; }
    .btn { display: inline-block; background: #f59e0b; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 15px; font-weight: 600; }
    .badge-pendente { background: #f59e0b; color: white; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: 600; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 style="margin: 0; font-size: 24px;">⏰ Alerta de Prazo de Ateste</h1>
      <p style="margin: 10px 0 0 0; opacity: 0.9;">Medição Pendente</p>
    </div>
    <div class="content">
      <p>Olá, <strong>${medicao.fiscalResponsavel.name}</strong>,</p>

      <p>Esta é uma notificação de lembrete:</p>

      <div class="warning-box">
        <strong>⚠️ Medição aguardando ateste há <span class="badge-pendente">${diasPendente} DIAS</span></strong>
      </div>

      <div class="info-box">
        <div class="info-row">
          <span class="label">Medição Nº:</span>
          <span class="value">#${medicao.numero}</span>
        </div>
        <div class="info-row">
          <span class="label">Contrato:</span>
          <span class="value">${medicao.contrato.numero}</span>
        </div>
        <div class="info-row">
          <span class="label">Objeto:</span>
          <span class="value">${medicao.contrato.objeto}</span>
        </div>
        <div class="info-row">
          <span class="label">Valor Medido:</span>
          <span class="value">R$ ${valorFormatado}</span>
        </div>
        <div class="info-row">
          <span class="label">Criada em:</span>
          <span class="value">${format(medicao.createdAt, 'dd/MM/yyyy', { locale: ptBR })}</span>
        </div>
      </div>

      <p><strong>Ação Necessária:</strong></p>
      <ul>
        <li>Revise a medição e documentos anexados</li>
        <li>Realize o ateste (aprovação ou rejeição)</li>
        <li>Informe justificativa em caso de rejeição</li>
      </ul>

      <p style="margin-top: 25px;">
        <a href="${process.env.FRONTEND_URL}/contratos/${medicao.contratoId}/fiscalizacao" class="btn">
          Realizar Ateste Agora
        </a>
      </p>

      <div class="footer">
        <p>Este é um email automático do sistema ETP Express.</p>
        <p>Em caso de dúvidas, entre em contato: ${process.env.SUPPORT_EMAIL || 'suporte@confenge.com.br'}</p>
      </div>
    </div>
  </div>
</body>
</html>
    `;

    try {
      await this.emailService.sendMail({
        to: medicao.fiscalResponsavel.email,
        subject,
        html: emailBody,
      });

      this.logger.log(
        `Alerta de prazo enviado para ${medicao.fiscalResponsavel.email} - Medição #${medicao.numero} (${diasPendente} dias)`,
      );
    } catch (error) {
      this.logger.error(
        `Falha ao enviar alerta de prazo: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Verifica ocorrências abertas próximas do prazo de resolução.
   * Chamado via job agendado (cron).
   *
   * @returns Promise<number> - Quantidade de alertas enviados
   */
  async checkPrazosOcorrenciaAberta(): Promise<number> {
    const tresdiasFrente = new Date();
    tresdiasFrente.setDate(tresdiasFrente.getDate() + 3);

    const ocorrenciasAbertas = await this.ocorrenciaRepository.find({
      where: {
        status: OcorrenciaStatus.ABERTA,
      },
      relations: [
        'contrato',
        'contrato.fiscalResponsavel',
        'contrato.gestorResponsavel',
        'registradoPor',
      ],
    });

    // Filtrar ocorrências com prazo vencendo em até 3 dias
    const ocorrenciasProximasPrazo = ocorrenciasAbertas.filter(
      (o) => o.prazoResolucao && o.prazoResolucao <= tresdiasFrente,
    );

    let alertasEnviados = 0;

    for (const ocorrencia of ocorrenciasProximasPrazo) {
      await this.notifyPrazoOcorrenciaVencendo(ocorrencia);
      alertasEnviados++;
    }

    this.logger.log(
      `Verificação de prazos de ocorrência: ${alertasEnviados} alertas enviados de ${ocorrenciasProximasPrazo.length} ocorrências próximas do prazo`,
    );

    return alertasEnviados;
  }

  /**
   * Envia alerta de prazo de resolução de ocorrência vencendo.
   * Destinatários: Gestor do contrato + Fiscal responsável.
   *
   * @param ocorrencia - Ocorrência aberta próxima do prazo
   * @returns Promise<void>
   */
  private async notifyPrazoOcorrenciaVencendo(
    ocorrencia: Ocorrencia,
  ): Promise<void> {
    const emails: string[] = [];

    if (ocorrencia.contrato.fiscalResponsavel?.email) {
      emails.push(ocorrencia.contrato.fiscalResponsavel.email);
    }

    if (
      ocorrencia.contrato.gestorResponsavel?.email &&
      !emails.includes(ocorrencia.contrato.gestorResponsavel.email)
    ) {
      emails.push(ocorrencia.contrato.gestorResponsavel.email);
    }

    if (emails.length === 0) {
      this.logger.warn(
        `Nenhum destinatário encontrado para alerta de ocorrência #${ocorrencia.id}`,
      );
      return;
    }

    if (!ocorrencia.prazoResolucao) {
      this.logger.warn(
        `Ocorrência #${ocorrencia.id} sem prazo de resolução definido`,
      );
      return;
    }

    const diasRestantes = Math.ceil(
      (ocorrencia.prazoResolucao.getTime() - new Date().getTime()) /
        (1000 * 60 * 60 * 24),
    );

    const vencido = diasRestantes < 0;
    const diasTexto = vencido
      ? `VENCIDO há ${Math.abs(diasRestantes)} dias`
      : `${diasRestantes} dias restantes`;

    const subject = `[ETP Express] ${vencido ? '🚨' : '⚠️'} Prazo de Ocorrência ${vencido ? 'VENCIDO' : 'Próximo'} - ${ocorrencia.contrato.numero}`;

    const emailBody = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, ${vencido ? '#dc2626' : '#f59e0b'} 0%, ${vencido ? '#991b1b' : '#d97706'} 100%); color: white; padding: 30px; border-radius: 8px 8px 0 0; }
    .content { background: white; padding: 30px; border: 1px solid #e5e7eb; border-radius: 0 0 8px 8px; }
    .info-box { background: #f3f4f6; padding: 15px; border-radius: 6px; margin: 15px 0; }
    .info-row { display: flex; justify-content: space-between; margin: 8px 0; }
    .label { font-weight: 600; color: #6b7280; }
    .value { color: #111827; }
    .alert-box { background: ${vencido ? '#fee2e2' : '#fef3c7'}; border-left: 4px solid ${vencido ? '#dc2626' : '#f59e0b'}; padding: 15px; margin: 15px 0; border-radius: 4px; }
    .footer { text-align: center; color: #6b7280; font-size: 12px; margin-top: 20px; }
    .btn { display: inline-block; background: ${vencido ? '#dc2626' : '#f59e0b'}; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 15px; font-weight: 600; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 style="margin: 0; font-size: 24px;">${vencido ? '🚨' : '⚠️'} Alerta de Prazo de Ocorrência</h1>
      <p style="margin: 10px 0 0 0; opacity: 0.9;">${vencido ? 'Prazo Vencido' : 'Prazo Próximo'}</p>
    </div>
    <div class="content">
      <p><strong>Atenção!</strong></p>

      <div class="alert-box">
        <strong>${vencido ? '⏰ PRAZO VENCIDO' : '⚠️ PRAZO PRÓXIMO'}:</strong> ${diasTexto}
      </div>

      <div class="info-box">
        <div class="info-row">
          <span class="label">Contrato:</span>
          <span class="value">${ocorrencia.contrato.numero}</span>
        </div>
        <div class="info-row">
          <span class="label">Tipo:</span>
          <span class="value">${this.formatTipoOcorrencia(ocorrencia.tipo)}</span>
        </div>
        <div class="info-row">
          <span class="label">Gravidade:</span>
          <span class="value">${ocorrencia.gravidade}</span>
        </div>
        <div class="info-row">
          <span class="label">Prazo de Resolução:</span>
          <span class="value">${format(ocorrencia.prazoResolucao, 'dd/MM/yyyy', { locale: ptBR })}</span>
        </div>
      </div>

      <p><strong>Descrição:</strong></p>
      <p>${ocorrencia.descricao}</p>

      <p><strong>Ação Corretiva:</strong></p>
      <p>${ocorrencia.acaoCorretiva}</p>

      <p><strong>${vencido ? 'Medidas Urgentes' : 'Ação Necessária'}:</strong></p>
      <ul>
        ${vencido ? '<li><strong>Resolva imediatamente a ocorrência</strong></li>' : '<li>Complete a ação corretiva antes do prazo</li>'}
        <li>Atualize o status da ocorrência</li>
        <li>Documente as ações realizadas</li>
        <li>Notifique as partes envolvidas</li>
      </ul>

      <p style="margin-top: 25px;">
        <a href="${process.env.FRONTEND_URL}/contratos/${ocorrencia.contratoId}/fiscalizacao" class="btn">
          ${vencido ? 'Resolver Agora' : 'Visualizar Ocorrência'}
        </a>
      </p>

      <div class="footer">
        <p>Este é um email automático do sistema ETP Express.</p>
        <p>${vencido ? '<strong>ATENÇÃO: Prazo vencido. Ação imediata necessária.</strong>' : 'Por favor, atue antes do vencimento do prazo.'}</p>
        <p>Em caso de dúvidas, entre em contato: ${process.env.SUPPORT_EMAIL || 'suporte@confenge.com.br'}</p>
      </div>
    </div>
  </div>
</body>
</html>
    `;

    try {
      await this.emailService.sendMail({
        to: emails.join(', '),
        subject,
        html: emailBody,
      });

      this.logger.log(
        `Alerta de prazo de ocorrência enviado para ${emails.join(', ')} - Ocorrência #${ocorrencia.id} (${diasTexto})`,
      );
    } catch (error) {
      this.logger.error(
        `Falha ao enviar alerta de prazo de ocorrência: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Formata o tipo de ocorrência para exibição em português.
   *
   * @param tipo - Tipo da ocorrência (enum)
   * @returns string - Tipo formatado
   */
  private formatTipoOcorrencia(tipo: string): string {
    const tipos: Record<string, string> = {
      ATRASO: 'Atraso na Execução',
      FALHA: 'Falha na Execução',
      INADIMPLENCIA: 'Inadimplência',
      OUTRO: 'Outro',
    };

    return tipos[tipo] || tipo;
  }
}
