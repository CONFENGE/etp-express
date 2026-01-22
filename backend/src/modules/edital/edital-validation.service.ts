import { Injectable, Logger } from '@nestjs/common';
import {
  Edital,
  EditalModalidade,
  EditalTipoContratacaoDireta,
} from '../../entities/edital.entity';

/**
 * Estrutura de erro de validação.
 */
export interface ValidationError {
  field: string;
  message: string;
  required: boolean;
  severity: 'critical' | 'warning';
}

/**
 * Resultado da validação de um Edital.
 */
export interface EditalValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
  completionPercentage: number;
  missingMandatoryFields: string[];
}

/**
 * Service para validação de cláusulas obrigatórias de Editais.
 *
 * Responsabilidades:
 * - Validar campos obrigatórios por modalidade conforme Lei 14.133/2021
 * - Validar referências a anexos e documentos
 * - Validar coerência de datas e prazos
 * - Fornecer checklist de validação para frontend
 *
 * Issue #1281 - [Edital-e] Validação de cláusulas obrigatórias
 * Milestone: M14 - Geração de Edital
 *
 * @see Lei 14.133/2021 Art. 25 - Requisitos obrigatórios do edital
 * @see Lei 14.133/2021 Art. 28 - Modalidades de licitação
 * @see Lei 14.133/2021 Art. 33 - Critérios de julgamento
 */
@Injectable()
export class EditalValidationService {
  private readonly logger = new Logger(EditalValidationService.name);

  /**
   * Valida um Edital completo conforme Lei 14.133/2021.
   *
   * Validações realizadas:
   * 1. Campos obrigatórios por modalidade (Art. 25)
   * 2. Coerência entre modalidade e tipo de contratação direta
   * 3. Prazos e datas coerentes
   * 4. Referências a anexos
   * 5. Campos mínimos preenchidos
   *
   * @param edital Edital a ser validado
   * @returns Resultado da validação com erros e warnings
   */
  validate(edital: Edital): EditalValidationResult {
    this.logger.debug(`Validating Edital ${edital.id || 'draft'}`);

    const errors: ValidationError[] = [];
    const warnings: ValidationError[] = [];

    // 1. Validar campos obrigatórios gerais (Art. 25)
    this.validateMandatoryGeneralFields(edital, errors);

    // 2. Validar campos obrigatórios por modalidade
    this.validateMandatoryByModalidade(edital, errors);

    // 3. Validar coerência entre modalidade e tipo contratação direta
    this.validateModalidadeCoherence(edital, errors);

    // 4. Validar prazos e datas
    this.validatePrazosAndDatas(edital, errors, warnings);

    // 5. Validar anexos
    this.validateAnexos(edital, warnings);

    // 6. Calcular percentual de completude
    const totalFields = this.countTotalFields(edital);
    const filledFields = this.countFilledFields(edital);
    const completionPercentage =
      totalFields > 0 ? Math.round((filledFields / totalFields) * 100) : 0;

    // 7. Extrair campos obrigatórios faltantes
    const missingMandatoryFields = errors
      .filter((e) => e.required && e.severity === 'critical')
      .map((e) => e.field);

    const isValid = errors.length === 0;

    this.logger.log(
      `Edital validation result: valid=${isValid}, errors=${errors.length}, warnings=${warnings.length}, completion=${completionPercentage}%`,
    );

    return {
      isValid,
      errors,
      warnings,
      completionPercentage,
      missingMandatoryFields,
    };
  }

  /**
   * Valida campos obrigatórios gerais aplicáveis a todas as modalidades.
   * Conforme Lei 14.133/2021 Art. 25 (caput e incisos comuns).
   *
   * Campos obrigatórios gerais:
   * - numero (identificação do edital)
   * - objeto (descrição clara do objeto)
   * - criterioJulgamento (critério de julgamento)
   * - modoDisputa (modo de disputa)
   * - organizationId (multi-tenancy)
   * - createdById (auditoria)
   *
   * @param edital Edital a validar
   * @param errors Array de erros (mutável)
   */
  private validateMandatoryGeneralFields(
    edital: Edital,
    errors: ValidationError[],
  ): void {
    // Número do edital
    if (!edital.numero || edital.numero.trim() === '') {
      errors.push({
        field: 'numero',
        message:
          'Número do edital é obrigatório (identificação única do edital)',
        required: true,
        severity: 'critical',
      });
    }

    // Objeto da licitação (Art. 25, I)
    if (!edital.objeto || edital.objeto.trim() === '') {
      errors.push({
        field: 'objeto',
        message:
          'Objeto da licitação é obrigatório (Art. 25, I - Lei 14.133/2021)',
        required: true,
        severity: 'critical',
      });
    } else if (edital.objeto.length < 20) {
      errors.push({
        field: 'objeto',
        message:
          'Objeto da licitação deve ter descrição clara e precisa (mínimo 20 caracteres)',
        required: false,
        severity: 'warning',
      });
    }

    // Critério de julgamento (Art. 25, II)
    if (!edital.criterioJulgamento) {
      errors.push({
        field: 'criterioJulgamento',
        message:
          'Critério de julgamento é obrigatório (Art. 33 - Lei 14.133/2021)',
        required: true,
        severity: 'critical',
      });
    }

    // Modo de disputa (Art. 25, III)
    if (!edital.modoDisputa) {
      errors.push({
        field: 'modoDisputa',
        message: 'Modo de disputa é obrigatório (Art. 56 - Lei 14.133/2021)',
        required: true,
        severity: 'critical',
      });
    }

    // Fundamentação legal
    if (!edital.fundamentacaoLegal || edital.fundamentacaoLegal.trim() === '') {
      errors.push({
        field: 'fundamentacaoLegal',
        message:
          'Fundamentação legal é obrigatória (base jurídica da licitação)',
        required: true,
        severity: 'critical',
      });
    }
  }

  /**
   * Valida campos obrigatórios específicos por modalidade.
   *
   * Modalidades e seus requisitos específicos:
   * - PREGAO: prazo de vigência, valor estimado, condicoes de participação
   * - CONCORRENCIA: requisitos habilitação, garantia, sanções administrativas
   * - CONCURSO: critérios de julgamento técnico, comissão julgadora
   * - LEILAO: valor mínimo, forma de pagamento
   * - DIALOGO_COMPETITIVO: etapas do diálogo, prazo para propostas
   * - DISPENSA: justificativa da dispensa (Art. 75)
   * - INEXIGIBILIDADE: justificativa da inexigibilidade (Art. 74)
   *
   * @param edital Edital a validar
   * @param errors Array de erros (mutável)
   */
  private validateMandatoryByModalidade(
    edital: Edital,
    errors: ValidationError[],
  ): void {
    // Deve ter modalidade OU tipo de contratação direta
    if (!edital.modalidade && !edital.tipoContratacaoDireta) {
      errors.push({
        field: 'modalidade',
        message:
          'Modalidade de licitação ou tipo de contratação direta é obrigatória',
        required: true,
        severity: 'critical',
      });
      return; // Não prosseguir sem modalidade/tipo
    }

    // Validações específicas por MODALIDADE DE LICITAÇÃO
    if (edital.modalidade) {
      switch (edital.modalidade) {
        case EditalModalidade.PREGAO:
          this.validatePregao(edital, errors);
          break;
        case EditalModalidade.CONCORRENCIA:
          this.validateConcorrencia(edital, errors);
          break;
        case EditalModalidade.CONCURSO:
          this.validateConcurso(edital, errors);
          break;
        case EditalModalidade.LEILAO:
          this.validateLeilao(edital, errors);
          break;
        case EditalModalidade.DIALOGO_COMPETITIVO:
          this.validateDialogoCompetitivo(edital, errors);
          break;
      }
    }

    // Validações específicas por TIPO DE CONTRATAÇÃO DIRETA
    if (edital.tipoContratacaoDireta) {
      switch (edital.tipoContratacaoDireta) {
        case EditalTipoContratacaoDireta.DISPENSA:
          this.validateDispensa(edital, errors);
          break;
        case EditalTipoContratacaoDireta.INEXIGIBILIDADE:
          this.validateInexigibilidade(edital, errors);
          break;
      }
    }
  }

  /**
   * Valida campos obrigatórios para modalidade PREGÃO.
   *
   * Pregão é a modalidade mais comum, usada para bens e serviços comuns.
   * Requisitos específicos:
   * - Prazo de vigência
   * - Valor estimado
   * - Condições de participação (especialmente ME/EPP)
   * - Data da sessão pública
   * - Sistema eletrônico
   */
  private validatePregao(edital: Edital, errors: ValidationError[]): void {
    // Prazo de vigência
    if (!edital.prazoVigencia || edital.prazoVigencia <= 0) {
      errors.push({
        field: 'prazoVigencia',
        message: 'Prazo de vigência é obrigatório para Pregão',
        required: true,
        severity: 'critical',
      });
    }

    // Valor estimado (pode ser sigiloso, mas deve estar preenchido)
    if (!edital.valorEstimado && !edital.sigiloOrcamento) {
      errors.push({
        field: 'valorEstimado',
        message:
          'Valor estimado é obrigatório para Pregão (ou marcar como sigiloso)',
        required: true,
        severity: 'critical',
      });
    }

    // Data da sessão pública
    if (!edital.dataSessaoPublica) {
      errors.push({
        field: 'dataSessaoPublica',
        message: 'Data da sessão pública é obrigatória para Pregão',
        required: true,
        severity: 'critical',
      });
    }

    // Sistema eletrônico (Pregão geralmente é eletrônico)
    if (!edital.sistemaEletronico || !edital.linkSistemaEletronico) {
      errors.push({
        field: 'sistemaEletronico',
        message:
          'Sistema eletrônico e link são obrigatórios para Pregão Eletrônico',
        required: true,
        severity: 'critical',
      });
    }

    // Condições de participação (LC 123/2006 - ME/EPP)
    if (
      !edital.condicoesParticipacao ||
      edital.condicoesParticipacao.trim() === ''
    ) {
      errors.push({
        field: 'condicoesParticipacao',
        message:
          'Condições de participação são obrigatórias (especialmente para ME/EPP)',
        required: true,
        severity: 'warning',
      });
    }
  }

  /**
   * Valida campos obrigatórios para modalidade CONCORRÊNCIA.
   *
   * Concorrência é usada para contratações de alta complexidade.
   * Requisitos específicos:
   * - Requisitos de habilitação detalhados
   * - Garantia contratual
   * - Sanções administrativas
   * - Condições de pagamento
   */
  private validateConcorrencia(
    edital: Edital,
    errors: ValidationError[],
  ): void {
    // Requisitos de habilitação (mais rigorosos)
    if (!edital.requisitosHabilitacao) {
      errors.push({
        field: 'requisitosHabilitacao',
        message: 'Requisitos de habilitação são obrigatórios para Concorrência',
        required: true,
        severity: 'critical',
      });
    }

    // Garantia contratual
    if (!edital.garantiaContratual || edital.garantiaContratual.trim() === '') {
      errors.push({
        field: 'garantiaContratual',
        message: 'Garantia contratual é obrigatória para Concorrência',
        required: true,
        severity: 'critical',
      });
    }

    // Sanções administrativas
    if (
      !edital.sancoesAdministrativas ||
      edital.sancoesAdministrativas.trim() === ''
    ) {
      errors.push({
        field: 'sancoesAdministrativas',
        message: 'Sanções administrativas são obrigatórias para Concorrência',
        required: true,
        severity: 'critical',
      });
    }

    // Condições de pagamento
    if (!edital.condicoesPagamento || edital.condicoesPagamento.trim() === '') {
      errors.push({
        field: 'condicoesPagamento',
        message: 'Condições de pagamento são obrigatórias para Concorrência',
        required: true,
        severity: 'critical',
      });
    }

    // Prazo de vigência
    if (!edital.prazoVigencia || edital.prazoVigencia <= 0) {
      errors.push({
        field: 'prazoVigencia',
        message: 'Prazo de vigência é obrigatório para Concorrência',
        required: true,
        severity: 'critical',
      });
    }
  }

  /**
   * Valida campos obrigatórios para modalidade CONCURSO.
   * Concurso é usado para escolha de trabalho técnico, científico ou artístico.
   */
  private validateConcurso(edital: Edital, errors: ValidationError[]): void {
    // Critério de julgamento (deve ser técnico)
    if (!edital.criterioJulgamento) {
      errors.push({
        field: 'criterioJulgamento',
        message: 'Critério de julgamento técnico é obrigatório para Concurso',
        required: true,
        severity: 'critical',
      });
    }

    // Requisitos de habilitação (critérios técnicos)
    if (!edital.requisitosHabilitacao) {
      errors.push({
        field: 'requisitosHabilitacao',
        message:
          'Requisitos técnicos de habilitação são obrigatórios para Concurso',
        required: true,
        severity: 'critical',
      });
    }

    // Condições de participação
    if (!edital.condicoesParticipacao) {
      errors.push({
        field: 'condicoesParticipacao',
        message: 'Condições de participação são obrigatórias para Concurso',
        required: true,
        severity: 'critical',
      });
    }
  }

  /**
   * Valida campos obrigatórios para modalidade LEILÃO.
   * Leilão é usado para venda de bens móveis inservíveis ou alienação.
   */
  private validateLeilao(edital: Edital, errors: ValidationError[]): void {
    // Valor estimado (lance mínimo)
    if (!edital.valorEstimado) {
      errors.push({
        field: 'valorEstimado',
        message: 'Valor mínimo (lance inicial) é obrigatório para Leilão',
        required: true,
        severity: 'critical',
      });
    }

    // Condições de pagamento
    if (!edital.condicoesPagamento) {
      errors.push({
        field: 'condicoesPagamento',
        message: 'Forma de pagamento é obrigatória para Leilão',
        required: true,
        severity: 'critical',
      });
    }

    // Data da sessão pública
    if (!edital.dataSessaoPublica) {
      errors.push({
        field: 'dataSessaoPublica',
        message: 'Data do leilão é obrigatória',
        required: true,
        severity: 'critical',
      });
    }

    // Local da sessão pública
    if (!edital.localSessaoPublica) {
      errors.push({
        field: 'localSessaoPublica',
        message: 'Local do leilão é obrigatório',
        required: true,
        severity: 'critical',
      });
    }
  }

  /**
   * Valida campos obrigatórios para modalidade DIÁLOGO COMPETITIVO.
   * Diálogo Competitivo é usado para inovações ou soluções complexas.
   */
  private validateDialogoCompetitivo(
    edital: Edital,
    errors: ValidationError[],
  ): void {
    // Prazos estruturados (etapas do diálogo)
    if (!edital.prazos) {
      errors.push({
        field: 'prazos',
        message:
          'Prazos das etapas do diálogo são obrigatórios para Diálogo Competitivo',
        required: true,
        severity: 'critical',
      });
    }

    // Condições de participação
    if (!edital.condicoesParticipacao) {
      errors.push({
        field: 'condicoesParticipacao',
        message:
          'Condições de participação são obrigatórias para Diálogo Competitivo',
        required: true,
        severity: 'critical',
      });
    }

    // Requisitos de habilitação
    if (!edital.requisitosHabilitacao) {
      errors.push({
        field: 'requisitosHabilitacao',
        message:
          'Requisitos de habilitação são obrigatórios para Diálogo Competitivo',
        required: true,
        severity: 'critical',
      });
    }
  }

  /**
   * Valida campos obrigatórios para DISPENSA de licitação.
   * Dispensa é contratação direta prevista no Art. 75 da Lei 14.133/2021.
   */
  private validateDispensa(edital: Edital, errors: ValidationError[]): void {
    // Fundamentação legal (hipótese de dispensa do Art. 75)
    if (!edital.fundamentacaoLegal || edital.fundamentacaoLegal.trim() === '') {
      errors.push({
        field: 'fundamentacaoLegal',
        message:
          'Fundamentação legal da dispensa é obrigatória (Art. 75 - Lei 14.133/2021)',
        required: true,
        severity: 'critical',
      });
    }

    // Justificativa da dispensa
    if (!edital.descricaoObjeto || edital.descricaoObjeto.length < 50) {
      errors.push({
        field: 'descricaoObjeto',
        message:
          'Justificativa detalhada da dispensa é obrigatória (mínimo 50 caracteres)',
        required: true,
        severity: 'critical',
      });
    }

    // Valor estimado
    if (!edital.valorEstimado) {
      errors.push({
        field: 'valorEstimado',
        message: 'Valor estimado é obrigatório para Dispensa',
        required: true,
        severity: 'critical',
      });
    }

    // Prazo de vigência
    if (!edital.prazoVigencia) {
      errors.push({
        field: 'prazoVigencia',
        message: 'Prazo de vigência é obrigatório para Dispensa',
        required: true,
        severity: 'critical',
      });
    }
  }

  /**
   * Valida campos obrigatórios para INEXIGIBILIDADE de licitação.
   * Inexigibilidade é contratação direta prevista no Art. 74 da Lei 14.133/2021.
   */
  private validateInexigibilidade(
    edital: Edital,
    errors: ValidationError[],
  ): void {
    // Fundamentação legal (hipótese de inexigibilidade do Art. 74)
    if (!edital.fundamentacaoLegal || edital.fundamentacaoLegal.trim() === '') {
      errors.push({
        field: 'fundamentacaoLegal',
        message:
          'Fundamentação legal da inexigibilidade é obrigatória (Art. 74 - Lei 14.133/2021)',
        required: true,
        severity: 'critical',
      });
    }

    // Justificativa da inexigibilidade (motivo da inviabilidade de competição)
    if (!edital.descricaoObjeto || edital.descricaoObjeto.length < 100) {
      errors.push({
        field: 'descricaoObjeto',
        message:
          'Justificativa detalhada da inexigibilidade é obrigatória, incluindo motivo da inviabilidade de competição (mínimo 100 caracteres)',
        required: true,
        severity: 'critical',
      });
    }

    // Valor estimado
    if (!edital.valorEstimado) {
      errors.push({
        field: 'valorEstimado',
        message: 'Valor estimado é obrigatório para Inexigibilidade',
        required: true,
        severity: 'critical',
      });
    }

    // Prazo de vigência
    if (!edital.prazoVigencia) {
      errors.push({
        field: 'prazoVigencia',
        message: 'Prazo de vigência é obrigatório para Inexigibilidade',
        required: true,
        severity: 'critical',
      });
    }
  }

  /**
   * Valida coerência entre modalidade e tipo de contratação direta.
   * Não pode ter ambos preenchidos simultaneamente.
   */
  private validateModalidadeCoherence(
    edital: Edital,
    errors: ValidationError[],
  ): void {
    if (edital.modalidade && edital.tipoContratacaoDireta) {
      errors.push({
        field: 'modalidade',
        message:
          'Não é possível ter modalidade de licitação e tipo de contratação direta simultaneamente',
        required: false,
        severity: 'critical',
      });
    }
  }

  /**
   * Valida prazos e datas do edital.
   *
   * Validações:
   * - Data da sessão pública no futuro
   * - Data de publicação no passado ou presente
   * - Prazo de vigência positivo
   * - Coerência entre datas
   */
  private validatePrazosAndDatas(
    edital: Edital,
    errors: ValidationError[],
    warnings: ValidationError[],
  ): void {
    const now = new Date();

    // Data da sessão pública no futuro
    if (edital.dataSessaoPublica) {
      const dataSessao = new Date(edital.dataSessaoPublica);
      if (dataSessao < now) {
        warnings.push({
          field: 'dataSessaoPublica',
          message: 'Data da sessão pública está no passado',
          required: false,
          severity: 'warning',
        });
      }
    }

    // Data de publicação no passado ou presente
    if (edital.dataPublicacao) {
      const dataPublicacao = new Date(edital.dataPublicacao);
      if (dataPublicacao > now) {
        warnings.push({
          field: 'dataPublicacao',
          message: 'Data de publicação está no futuro',
          required: false,
          severity: 'warning',
        });
      }
    }

    // Prazo de vigência positivo
    if (edital.prazoVigencia !== null && edital.prazoVigencia <= 0) {
      errors.push({
        field: 'prazoVigencia',
        message: 'Prazo de vigência deve ser maior que zero',
        required: true,
        severity: 'critical',
      });
    }

    // Coerência: data de publicação antes da sessão pública
    if (edital.dataPublicacao && edital.dataSessaoPublica) {
      const dataPublicacao = new Date(edital.dataPublicacao);
      const dataSessao = new Date(edital.dataSessaoPublica);

      if (dataPublicacao >= dataSessao) {
        errors.push({
          field: 'dataPublicacao',
          message:
            'Data de publicação deve ser anterior à data da sessão pública',
          required: false,
          severity: 'critical',
        });
      }
    }
  }

  /**
   * Valida referências a anexos obrigatórios.
   *
   * Anexos esperados:
   * - Termo de Referência
   * - Minuta de Contrato
   * - Orçamento estimado (ou declaração de sigilo)
   */
  private validateAnexos(edital: Edital, warnings: ValidationError[]): void {
    if (!edital.anexos || Object.keys(edital.anexos).length === 0) {
      warnings.push({
        field: 'anexos',
        message:
          'É recomendado incluir anexos (Termo de Referência, Minuta de Contrato, Orçamento)',
        required: false,
        severity: 'warning',
      });
    }
  }

  /**
   * Conta total de campos relevantes do Edital.
   * Usado para calcular percentual de completude.
   */
  private countTotalFields(_edital: Edital): number {
    // Lista de campos relevantes (não incluir metadados/auditoria)
    const relevantFields = [
      'numero',
      'numeroProcesso',
      'uasg',
      'objeto',
      'descricaoObjeto',
      'modalidade',
      'tipoContratacaoDireta',
      'criterioJulgamento',
      'modoDisputa',
      'condicoesParticipacao',
      'requisitosHabilitacao',
      'sancoesAdministrativas',
      'prazoVigencia',
      'possibilidadeProrrogacao',
      'dotacaoOrcamentaria',
      'fonteRecursos',
      'valorEstimado',
      'prazos',
      'dataSessaoPublica',
      'localSessaoPublica',
      'clausulas',
      'anexos',
      'fundamentacaoLegal',
      'condicoesPagamento',
      'garantiaContratual',
      'reajusteContratual',
      'localEntrega',
      'sistemaEletronico',
      'linkSistemaEletronico',
      'exclusividadeMeEpp',
      'valorLimiteMeEpp',
      'cotaReservadaMeEpp',
      'exigenciaConsorcio',
    ];

    return relevantFields.length;
  }

  /**
   * Conta campos preenchidos do Edital.
   */
  private countFilledFields(edital: Edital): number {
    let filled = 0;

    const fieldValues: Array<unknown> = [
      edital.numero,
      edital.numeroProcesso,
      edital.uasg,
      edital.objeto,
      edital.descricaoObjeto,
      edital.modalidade,
      edital.tipoContratacaoDireta,
      edital.criterioJulgamento,
      edital.modoDisputa,
      edital.condicoesParticipacao,
      edital.requisitosHabilitacao,
      edital.sancoesAdministrativas,
      edital.prazoVigencia,
      edital.possibilidadeProrrogacao,
      edital.dotacaoOrcamentaria,
      edital.fonteRecursos,
      edital.valorEstimado,
      edital.prazos,
      edital.dataSessaoPublica,
      edital.localSessaoPublica,
      edital.clausulas,
      edital.anexos,
      edital.fundamentacaoLegal,
      edital.condicoesPagamento,
      edital.garantiaContratual,
      edital.reajusteContratual,
      edital.localEntrega,
      edital.sistemaEletronico,
      edital.linkSistemaEletronico,
      edital.exclusividadeMeEpp,
      edital.valorLimiteMeEpp,
      edital.cotaReservadaMeEpp,
      edital.exigenciaConsorcio,
    ];

    for (const value of fieldValues) {
      if (this.isFieldFilled(value)) {
        filled++;
      }
    }

    return filled;
  }

  /**
   * Verifica se um campo está preenchido (não nulo/undefined/vazio).
   */
  private isFieldFilled(value: unknown): boolean {
    if (value === null || value === undefined) {
      return false;
    }
    if (typeof value === 'string' && value.trim() === '') {
      return false;
    }
    if (typeof value === 'object' && Object.keys(value).length === 0) {
      return false;
    }
    return true;
  }
}
