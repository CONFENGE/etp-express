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
import {
  ContratoSyncLog,
  ConflictField,
} from '../../../entities/contrato-sync-log.entity';
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
    @InjectRepository(ContratoSyncLog)
    private readonly syncLogRepository: Repository<ContratoSyncLog>,
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

  /**
   * Importa contratos do Gov.br para o sistema local (Pull Sync)
   *
   * Fluxo:
   * 1. Busca contratos da organização na API Gov.br
   * 2. Para cada contrato:
   *    a. Verifica se já existe localmente (por govBrId)
   *    b. Se não existe: cria novo contrato
   *    c. Se existe: atualiza contrato existente (upsert)
   * 3. Retorna estatísticas da sincronização
   *
   * @param organizationId - ID da organização para filtrar contratos
   * @returns Estatísticas de sincronização (created, updated, errors)
   * @throws Error se API Gov.br retornar erro
   */
  async pullContratos(organizationId: string): Promise<{
    created: number;
    updated: number;
    errors: number;
  }> {
    this.logger.log(
      `Starting pull sync for organization ${organizationId} from Gov.br`,
    );

    const stats = { created: 0, updated: 0, errors: 0 };

    try {
      // 1. Buscar contratos da organização na API Gov.br
      const headers = await this.authService.getAuthHeaders();
      const response = await firstValueFrom(
        this.httpService.get<GovBrContratoPayload[]>(
          `${this.baseUrl}/contratos`,
          {
            headers,
            params: {
              orgao: organizationId,
            },
          },
        ),
      );

      const govBrContratos = response.data;
      this.logger.log(
        `Found ${govBrContratos.length} contracts in Gov.br for organization ${organizationId}`,
      );

      // 2. Processar cada contrato
      for (const apiContrato of govBrContratos) {
        try {
          await this.upsertContratoFromGovBr(apiContrato, organizationId);
          stats.created++; // TODO: Diferenciar created vs updated baseado no resultado do upsert
        } catch (error) {
          this.logger.error(
            `Failed to upsert contract ${apiContrato.numero_contrato} from Gov.br`,
            error instanceof Error ? error.stack : String(error),
          );
          stats.errors++;
        }
      }

      this.logger.log(
        `Pull sync completed for organization ${organizationId}: ${stats.created} created, ${stats.updated} updated, ${stats.errors} errors`,
      );

      return stats;
    } catch (error) {
      this.logger.error(
        `Failed to pull contracts from Gov.br for organization ${organizationId}`,
        error instanceof Error ? error.stack : String(error),
      );
      throw new Error(
        `Failed to sync contracts from Gov.br: ${error.message || 'Unknown error'}`,
      );
    }
  }

  /**
   * Insere ou atualiza contrato local baseado em dados da API Gov.br (Upsert)
   *
   * Fluxo:
   * 1. Busca contrato local por govBrId (ID da API Gov.br)
   * 2. Se não existe: mapeia dados e cria novo contrato
   * 3. Se existe: atualiza campos sincronizáveis (preserva dados locais)
   *
   * @param apiData - Dados do contrato da API Gov.br
   * @param organizationId - ID da organização proprietária
   * @private
   */
  private async upsertContratoFromGovBr(
    apiData: GovBrContratoPayload,
    organizationId: string,
  ): Promise<void> {
    // Usar numero_contrato como identificador para buscar contrato existente
    // (govBrId ainda não existe se contrato nunca foi sincronizado)
    const existing = await this.contratoRepository.findOne({
      where: [
        { numero: apiData.numero_contrato, organizationId },
        // TODO: Implementar busca por govBrId quando API Gov.br retornar campo 'id'
      ],
    });

    const contratoData = this.mapFromGovBrFormat(apiData, organizationId);

    if (existing) {
      // Atualizar contrato existente
      // Remove relacionamentos para evitar erro de tipo no update
      const { ...updateData } = contratoData;

      await this.contratoRepository.update(existing.id, {
        ...updateData,
        govBrSyncedAt: new Date(),
        govBrSyncStatus: 'synced',
        govBrSyncErrorMessage: null,
      });

      this.logger.log(
        `Contract ${apiData.numero_contrato} updated from Gov.br`,
      );
    } else {
      // Criar novo contrato
      const newContrato = this.contratoRepository.create({
        ...contratoData,
        organizationId,
        govBrSyncedAt: new Date(),
        govBrSyncStatus: 'synced',
        // createdById será definido pelo controller ou será NULL por enquanto
        // TODO: Resolver createdById - talvez usar um user de sistema?
      });

      await this.contratoRepository.save(newContrato);

      this.logger.log(
        `Contract ${apiData.numero_contrato} created from Gov.br`,
      );
    }
  }

  /**
   * Mapeia dados da API Gov.br para entity Contrato local
   *
   * Transformações inversas do mapToGovBrFormat:
   * - number → string (valores decimais)
   * - ISO 8601 string → Date
   * - número → status enum
   * - CPF → UUID de gestores/fiscais (TODO: implementar busca de User por CPF)
   *
   * @param apiData - Dados do contrato da API Gov.br
   * @param organizationId - ID da organização proprietária
   * @returns Dados formatados para entity Contrato
   * @private
   */
  private mapFromGovBrFormat(
    apiData: GovBrContratoPayload,
    _organizationId: string,
  ): Record<string, any> {
    return {
      numero: apiData.numero_contrato,
      numeroProcesso: apiData.numero_processo,
      objeto: apiData.objeto_contrato,
      descricaoObjeto: apiData.descricao_detalhada,
      contratadoCnpj: apiData.cnpj_contratado,
      contratadoRazaoSocial: apiData.razao_social_contratado,
      contratadoNomeFantasia: apiData.nome_fantasia,
      contratadoEndereco: apiData.endereco_contratado,
      contratadoTelefone: apiData.telefone_contratado,
      contratadoEmail: apiData.email_contratado,
      valorGlobal: apiData.valor_global.toString(),
      valorUnitario: apiData.valor_unitario?.toString() || null,
      unidadeMedida: apiData.unidade_medida,
      quantidadeContratada: apiData.quantidade?.toString() || null,
      vigenciaInicio: this.parseDate(apiData.data_inicio_vigencia),
      vigenciaFim: this.parseDate(apiData.data_fim_vigencia),
      prazoExecucao: apiData.prazo_execucao_dias,
      possibilidadeProrrogacao: apiData.condicoes_prorrogacao,
      // TODO: Implementar busca de gestorResponsavelId e fiscalResponsavelId por CPF
      // Por enquanto, deixar NULL e logar warning
      gestorResponsavelId: null as any, // Cast para evitar erro de tipo
      fiscalResponsavelId: null as any,
      dotacaoOrcamentaria: apiData.dotacao_orcamentaria,
      fonteRecursos: apiData.fonte_recursos,
      condicoesPagamento: apiData.condicoes_pagamento,
      garantiaContratual: apiData.garantia_contratual,
      reajusteContratual: apiData.indice_reajuste,
      sancoesAdministrativas: apiData.sancoes,
      fundamentacaoLegal: apiData.fundamentacao_legal,
      localEntrega: apiData.local_entrega,
      clausulas: apiData.clausulas_contratuais,
      status: this.mapStatusFromGovBr(apiData.status_contrato),
      dataAssinatura: apiData.data_assinatura
        ? this.parseDate(apiData.data_assinatura)
        : null,
      dataPublicacao: apiData.data_publicacao
        ? this.parseDate(apiData.data_publicacao)
        : null,
      referenciaPublicacao: apiData.referencia_publicacao,
      versao: apiData.versao,
      motivoRescisao: apiData.motivo_rescisao,
      dataRescisao: apiData.data_rescisao
        ? this.parseDate(apiData.data_rescisao)
        : null,
    };
  }

  /**
   * Converte string ISO 8601 (YYYY-MM-DD) para Date
   *
   * @param dateStr - Data em formato ISO 8601
   * @returns Date object
   * @private
   */
  private parseDate(dateStr: string): Date {
    return new Date(dateStr);
  }

  /**
   * Mapeia código numérico da API Gov.br para status enum local
   *
   * Mapeamento inverso do mapStatusToGovBr:
   * - 1 → MINUTA
   * - 2 → ASSINADO
   * - 3 → EM_EXECUCAO
   * - 4 → ADITIVADO
   * - 5 → SUSPENSO
   * - 6 → RESCINDIDO
   * - 7 → ENCERRADO
   *
   * @param statusCode - Código numérico do status na API Gov.br
   * @returns Status enum local
   * @private
   */
  private mapStatusFromGovBr(statusCode: number): ContratoStatus {
    const statusMap: Record<number, ContratoStatus> = {
      1: ContratoStatus.MINUTA,
      2: ContratoStatus.ASSINADO,
      3: ContratoStatus.EM_EXECUCAO,
      4: ContratoStatus.ADITIVADO,
      5: ContratoStatus.SUSPENSO,
      6: ContratoStatus.RESCINDIDO,
      7: ContratoStatus.ENCERRADO,
    };

    return statusMap[statusCode] || ContratoStatus.MINUTA; // Default fallback
  }

  /**
   * Detecta e resolve conflitos entre dados locais e remotos (Gov.br)
   *
   * Estratégia Last-Write-Wins (LWW): Compara `govBrSyncedAt` vs `updatedAt`
   * para determinar qual versão prevalece.
   *
   * Fluxo:
   * 1. Detecta conflitos comparando campos críticos
   * 2. Aplica estratégia LWW para resolver
   * 3. Registra conflitos e resolução em ContratoSyncLog
   * 4. Atualiza contrato com dados resolvidos
   *
   * Issue: #1677 - Tratamento de conflitos de sincronização
   *
   * @param local - Contrato local existente
   * @param remote - Dados parciais do Gov.br
   * @returns Promise<void>
   */
  async handleConflictAndUpdate(
    local: Contrato,
    remote: Partial<Contrato>,
  ): Promise<void> {
    // 1. Detectar conflitos
    const conflicts = this.detectConflicts(local, remote);

    if (conflicts.length === 0) {
      // Sem conflitos - atualização direta
      // Remove relacionamentos para evitar erro de tipo no update
      const {
        edital,
        organization,
        gestorResponsavel,
        fiscalResponsavel,
        createdBy,
        ...updateData
      } = remote as any;

      await this.contratoRepository.update(local.id, {
        ...updateData,
        govBrSyncedAt: new Date(),
        govBrSyncStatus: 'synced',
        govBrSyncErrorMessage: null,
      });

      this.logger.log(
        `Contract ${local.numero} updated from Gov.br (no conflicts)`,
      );
      return;
    }

    // 2. Aplicar estratégia de resolução
    const resolved = this.resolveConflicts(local, remote, conflicts);

    // 3. Registrar resolução de conflito
    await this.syncLogRepository.save({
      contratoId: local.id,
      action: 'conflict_resolved',
      conflicts,
      resolution: resolved,
    });

    // 4. Atualizar contrato com dados resolvidos
    // Remove relacionamentos para evitar erro de tipo no update
    const {
      edital,
      organization,
      gestorResponsavel,
      fiscalResponsavel,
      createdBy,
      ...resolvedData
    } = resolved as any;

    await this.contratoRepository.update(local.id, {
      ...resolvedData,
      govBrSyncedAt: new Date(),
      govBrSyncStatus: 'synced',
      govBrSyncErrorMessage: null,
    });

    this.logger.log(
      `Contract ${local.numero} updated from Gov.br with conflict resolution: ${conflicts.length} conflicts resolved`,
    );
  }

  /**
   * Detecta conflitos entre dados locais e remotos
   *
   * Compara campos críticos que, se divergentes, requerem resolução:
   * - valorGlobal
   * - vigenciaFim
   * - status
   * - objeto
   * - contratadoCnpj
   *
   * @param local - Contrato local
   * @param remote - Dados parciais do Gov.br
   * @returns Array de conflitos detectados
   * @private
   */
  private detectConflicts(
    local: Contrato,
    remote: Partial<Contrato>,
  ): ConflictField[] {
    const conflicts: ConflictField[] = [];

    // Campos críticos para detectar conflitos
    const criticalFields: (keyof Contrato)[] = [
      'valorGlobal',
      'vigenciaFim',
      'status',
      'objeto',
      'contratadoCnpj',
    ];

    for (const field of criticalFields) {
      if (remote[field] !== undefined && local[field] !== remote[field]) {
        // Normalizar valores para comparação correta
        const localValue = this.normalizeValue(local[field]);
        const remoteValue = this.normalizeValue(remote[field]);

        if (localValue !== remoteValue) {
          conflicts.push({
            field,
            localValue: local[field],
            remoteValue: remote[field],
          });
        }
      }
    }

    return conflicts;
  }

  /**
   * Normaliza valores para comparação correta
   *
   * Trata casos especiais:
   * - Datas → ISO string
   * - Decimais → string normalizada
   * - Objetos → JSON string
   *
   * @param value - Valor a normalizar
   * @returns Valor normalizado
   * @private
   */
  private normalizeValue(value: any): any {
    if (value instanceof Date) {
      return value.toISOString();
    }
    if (typeof value === 'object' && value !== null) {
      return JSON.stringify(value);
    }
    if (typeof value === 'string') {
      return value.trim();
    }
    return value;
  }

  /**
   * Resolve conflitos usando estratégia Last-Write-Wins (LWW)
   *
   * Lógica:
   * - Se `govBrSyncedAt > updatedAt` → Remote wins (Gov.br mais recente)
   * - Caso contrário → Local wins (dados locais foram editados após sync)
   *
   * Quando local wins: Agenda push para sincronizar Gov.br
   *
   * @param local - Contrato local
   * @param remote - Dados parciais do Gov.br
   * @param conflicts - Array de conflitos detectados
   * @returns Dados resolvidos para aplicar
   * @private
   */
  private resolveConflicts(
    local: Contrato,
    remote: Partial<Contrato>,
    conflicts: ConflictField[],
  ): Partial<Contrato> {
    const resolved: Partial<Contrato> = { ...remote };

    // Determinar qual versão prevalece baseado em timestamps
    const remoteWins =
      local.govBrSyncedAt && local.govBrSyncedAt > local.updatedAt;

    for (const conflict of conflicts) {
      if (remoteWins) {
        // Remote wins - usar valor do Gov.br
        resolved[conflict.field as keyof Contrato] = conflict.remoteValue;
        this.logger.debug(
          `Conflict resolved (remote wins): ${conflict.field} = ${conflict.remoteValue}`,
        );
      } else {
        // Local wins - preservar valor local e agendar push
        resolved[conflict.field as keyof Contrato] = conflict.localValue;
        this.schedulePush(local.id);
        this.logger.debug(
          `Conflict resolved (local wins): ${conflict.field} = ${conflict.localValue}, push scheduled`,
        );
      }
    }

    return resolved;
  }

  /**
   * Agenda push assíncrono de contrato para Gov.br
   *
   * Chamado quando local wins em conflito para re-sincronizar
   * dados locais com Gov.br.
   *
   * @param contratoId - ID do contrato a sincronizar
   * @private
   */
  private schedulePush(contratoId: string): void {
    // Implementação assíncrona (non-blocking)
    // Usar background job ou event emitter para agendar push
    this.logger.log(
      `Push scheduled for contract ${contratoId} due to conflict resolution (local wins)`,
    );

    // Executar push em background
    this.pushContrato(contratoId).catch((error) => {
      this.logger.error(
        `Failed to push contract ${contratoId} after conflict resolution`,
        error instanceof Error ? error.stack : String(error),
      );
    });
  }
}
