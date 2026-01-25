import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { Contrato, ContratoStatus } from '../../../entities/contrato.entity';
import { ContratosGovBrAuthService } from '../../gov-api/services/contratos-govbr-auth.service';

/**
 * DTO para payload de criação de contrato na API Gov.br
 */
interface GovBrContratoPayload {
  numero_contrato: string;
  numero_processo: string | null;
  objeto_contrato: string;
  descricao_detalhada: string | null;
  cnpj_contratado: string;
  razao_social_contratado: string;
  nome_fantasia: string | null;
  endereco_contratado: string | null;
  telefone_contratado: string | null;
  email_contratado: string | null;
  valor_global: number;
  valor_unitario: number | null;
  unidade_medida: string | null;
  quantidade: number | null;
  data_inicio_vigencia: string; // ISO 8601
  data_fim_vigencia: string; // ISO 8601
  prazo_execucao_dias: number | null;
  condicoes_prorrogacao: string | null;
  cpf_gestor: string;
  cpf_fiscal: string;
  dotacao_orcamentaria: string | null;
  fonte_recursos: string | null;
  condicoes_pagamento: string | null;
  garantia_contratual: string | null;
  indice_reajuste: string | null;
  sancoes: string | null;
  fundamentacao_legal: string | null;
  local_entrega: string | null;
  clausulas_contratuais: Record<string, unknown> | null;
  status_contrato: number;
  data_assinatura: string | null;
  data_publicacao: string | null;
  referencia_publicacao: string | null;
  versao: number;
  motivo_rescisao: string | null;
  data_rescisao: string | null;
}

/**
 * Resposta da API Gov.br ao criar contrato
 */
interface GovBrContratoResponse {
  id: string;
  numero_contrato: string;
  created_at: string;
}

/**
 * Serviço de sincronização de contratos com API Contratos.gov.br
 *
 * Implementa operações de Push (envio de contratos locais para Gov.br)
 * e Pull (recebimento de contratos do Gov.br para local).
 *
 * Issue: #1675 - Implementar sincronização Push de contratos
 * Parent Issue: #1289 - Integração com Contratos Gov.br
 *
 * @see docs/integrations/contratos-gov-br-api.md
 */
@Injectable()
export class ContratosGovBrSyncService {
  private readonly logger = new Logger(ContratosGovBrSyncService.name);
  private readonly baseUrl: string;

  constructor(
    @InjectRepository(Contrato)
    private readonly contratoRepository: Repository<Contrato>,
    private readonly authService: ContratosGovBrAuthService,
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.baseUrl =
      this.configService.get<string>('CONTRATOS_GOVBR_API_URL') ||
      'https://contratos.comprasnet.gov.br/api/v1';
  }

  /**
   * Envia contrato local para API Contratos.gov.br (Push Sync)
   *
   * Fluxo:
   * 1. Busca contrato local por ID
   * 2. Valida se contrato é sincronizável
   * 3. Mapeia entity para formato API Gov.br
   * 4. Envia POST para API Gov.br
   * 5. Atualiza contrato local com govBrId e status synced
   *
   * @param contratoId - ID do contrato local a sincronizar
   * @throws NotFoundException se contrato não existir
   * @throws BadRequestException se contrato não puder ser sincronizado
   * @throws Error se API Gov.br retornar erro
   */
  async pushContrato(contratoId: string): Promise<void> {
    this.logger.log(`Starting push sync for contrato ${contratoId}`);

    // 1. Buscar contrato local
    const contrato = await this.contratoRepository.findOne({
      where: { id: contratoId },
      relations: ['gestorResponsavel', 'fiscalResponsavel'],
    });

    if (!contrato) {
      throw new NotFoundException(`Contrato with ID ${contratoId} not found`);
    }

    // 2. Validar se contrato pode ser sincronizado
    this.validateSyncable(contrato);

    try {
      // 3. Mapear para formato API
      const payload = this.mapToGovBrFormat(contrato);

      // 4. Enviar para API Gov.br
      const headers = await this.authService.getAuthHeaders();
      const response = await firstValueFrom(
        this.httpService.post<GovBrContratoResponse>(
          `${this.baseUrl}/contratos`,
          payload,
          { headers },
        ),
      );

      const govBrId = response.data.id;

      // 5. Atualizar contrato local com sucesso
      await this.contratoRepository.update(contratoId, {
        govBrId,
        govBrSyncedAt: new Date(),
        govBrSyncStatus: 'synced',
        govBrSyncErrorMessage: null,
      });

      this.logger.log(
        `Contrato ${contratoId} successfully synced to Gov.br with ID ${govBrId}`,
      );
    } catch (error) {
      // Logar erro e atualizar status
      this.logger.error(
        `Failed to push contrato ${contratoId} to Gov.br`,
        error instanceof Error ? error.stack : String(error),
      );

      const errorMessage =
        error.response?.data?.message || error.message || 'Unknown error';

      await this.contratoRepository.update(contratoId, {
        govBrSyncStatus: 'error',
        govBrSyncErrorMessage: errorMessage,
      });

      // Re-throw para o caller lidar
      throw new Error(`Failed to sync contrato to Gov.br: ${errorMessage}`);
    }
  }

  /**
   * Valida se contrato pode ser sincronizado com Gov.br
   *
   * @param contrato - Contrato a validar
   * @throws BadRequestException se validação falhar
   */
  private validateSyncable(contrato: Contrato): void {
    const errors: string[] = [];

    // Campos obrigatórios pela API Gov.br
    if (!contrato.numero) errors.push('numero is required');
    if (!contrato.objeto) errors.push('objeto is required');
    if (!contrato.contratadoCnpj) errors.push('contratadoCnpj is required');
    if (!contrato.contratadoRazaoSocial)
      errors.push('contratadoRazaoSocial is required');
    if (!contrato.valorGlobal) errors.push('valorGlobal is required');
    if (!contrato.vigenciaInicio) errors.push('vigenciaInicio is required');
    if (!contrato.vigenciaFim) errors.push('vigenciaFim is required');

    // Gestores e fiscais (CPF extraído de cargo ou email)
    const gestorCpf = this.extractCpfFromUser(contrato.gestorResponsavel);
    const fiscalCpf = this.extractCpfFromUser(contrato.fiscalResponsavel);

    if (!gestorCpf) {
      errors.push(
        'gestorResponsavel CPF could not be determined (add CPF to cargo field)',
      );
    }
    if (!fiscalCpf) {
      errors.push(
        'fiscalResponsavel CPF could not be determined (add CPF to cargo field)',
      );
    }

    // Data de assinatura obrigatória para contratos assinados
    if (contrato.status !== ContratoStatus.MINUTA && !contrato.dataAssinatura) {
      errors.push('dataAssinatura is required for non-draft contracts');
    }

    if (errors.length > 0) {
      throw new BadRequestException({
        message: 'Contract validation failed for Gov.br sync',
        errors,
      });
    }
  }

  /**
   * Mapeia entity Contrato para formato API Gov.br
   *
   * Transformações:
   * - Valores decimais string → number
   * - Datas Date → ISO 8601 string
   * - Status enum → número
   * - Gestores/Fiscais UUID → CPF
   *
   * @param contrato - Contrato local
   * @returns Payload formatado para API Gov.br
   */
  private mapToGovBrFormat(contrato: Contrato): GovBrContratoPayload {
    return {
      numero_contrato: contrato.numero,
      numero_processo: contrato.numeroProcesso,
      objeto_contrato: contrato.objeto,
      descricao_detalhada: contrato.descricaoObjeto,
      cnpj_contratado: contrato.contratadoCnpj,
      razao_social_contratado: contrato.contratadoRazaoSocial,
      nome_fantasia: contrato.contratadoNomeFantasia,
      endereco_contratado: contrato.contratadoEndereco,
      telefone_contratado: contrato.contratadoTelefone,
      email_contratado: contrato.contratadoEmail,
      valor_global: parseFloat(contrato.valorGlobal),
      valor_unitario: contrato.valorUnitario
        ? parseFloat(contrato.valorUnitario)
        : null,
      unidade_medida: contrato.unidadeMedida,
      quantidade: contrato.quantidadeContratada
        ? parseFloat(contrato.quantidadeContratada)
        : null,
      data_inicio_vigencia: this.formatDate(contrato.vigenciaInicio),
      data_fim_vigencia: this.formatDate(contrato.vigenciaFim),
      prazo_execucao_dias: contrato.prazoExecucao,
      condicoes_prorrogacao: contrato.possibilidadeProrrogacao,
      cpf_gestor: this.extractCpfFromUser(contrato.gestorResponsavel)!,
      cpf_fiscal: this.extractCpfFromUser(contrato.fiscalResponsavel)!,
      dotacao_orcamentaria: contrato.dotacaoOrcamentaria,
      fonte_recursos: contrato.fonteRecursos,
      condicoes_pagamento: contrato.condicoesPagamento,
      garantia_contratual: contrato.garantiaContratual,
      indice_reajuste: contrato.reajusteContratual,
      sancoes: contrato.sancoesAdministrativas,
      fundamentacao_legal: contrato.fundamentacaoLegal,
      local_entrega: contrato.localEntrega,
      clausulas_contratuais: contrato.clausulas,
      status_contrato: this.mapStatusToGovBr(contrato.status),
      data_assinatura: contrato.dataAssinatura
        ? this.formatDate(contrato.dataAssinatura)
        : null,
      data_publicacao: contrato.dataPublicacao
        ? this.formatDate(contrato.dataPublicacao)
        : null,
      referencia_publicacao: contrato.referenciaPublicacao,
      versao: contrato.versao,
      motivo_rescisao: contrato.motivoRescisao,
      data_rescisao: contrato.dataRescisao
        ? this.formatDate(contrato.dataRescisao)
        : null,
    };
  }

  /**
   * Formata Date para string ISO 8601 (YYYY-MM-DD)
   */
  private formatDate(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  /**
   * Mapeia status enum para código numérico da API Gov.br
   *
   * Mapeamento baseado em convenções presumidas (requer validação com API real):
   * - MINUTA → 1
   * - ASSINADO → 2
   * - EM_EXECUCAO → 3
   * - ADITIVADO → 4
   * - SUSPENSO → 5
   * - RESCINDIDO → 6
   * - ENCERRADO → 7
   */
  private mapStatusToGovBr(status: ContratoStatus): number {
    const statusMap: Record<ContratoStatus, number> = {
      [ContratoStatus.MINUTA]: 1,
      [ContratoStatus.ASSINADO]: 2,
      [ContratoStatus.EM_EXECUCAO]: 3,
      [ContratoStatus.ADITIVADO]: 4,
      [ContratoStatus.SUSPENSO]: 5,
      [ContratoStatus.RESCINDIDO]: 6,
      [ContratoStatus.ENCERRADO]: 7,
    };

    return statusMap[status];
  }

  /**
   * Extrai CPF do usuário a partir do campo cargo
   *
   * Procura por padrão XXX.XXX.XXX-XX no campo cargo.
   * Se não encontrado, retorna null.
   *
   * @param user - Usuário (gestor ou fiscal)
   * @returns CPF formatado ou null
   */
  private extractCpfFromUser(user: any): string | null {
    if (!user || !user.cargo) {
      return null;
    }

    // Regex para encontrar CPF no formato XXX.XXX.XXX-XX
    const cpfRegex = /\d{3}\.\d{3}\.\d{3}-\d{2}/;
    const match = user.cargo.match(cpfRegex);

    return match ? match[0] : null;
  }
}
