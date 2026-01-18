import {
  Injectable,
  Logger,
  NotFoundException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  ComplianceChecklist,
  ComplianceStandard,
} from '../../entities/compliance-checklist.entity';
import {
  ComplianceChecklistItem,
  ChecklistItemType,
  ChecklistItemCategory,
} from '../../entities/compliance-checklist-item.entity';
import { Etp } from '../../entities/etp.entity';
import { EtpTemplateType } from '../../entities/etp-template.entity';
import {
  ComplianceValidationResult,
  ComplianceItemResult,
  ComplianceSuggestion,
  ComplianceScoreSummary,
  JurisprudenciaAlert,
  JurisprudenciaAlertType,
} from './dto/compliance-validation-result.dto';
import { JurisprudenciaService } from '../pageindex/services/jurisprudencia.service';

/**
 * Service para validacao de conformidade de ETPs contra checklists TCU/TCE.
 *
 * Este service implementa a logica de validacao que:
 * 1. Busca o checklist apropriado para o tipo de ETP
 * 2. Valida cada item do checklist contra os dados do ETP
 * 3. Calcula score de conformidade (0-100)
 * 4. Gera sugestoes de correcao para itens que falharam
 *
 * Issue #1383 - [TCU-1163b] Criar entity ComplianceChecklist e service de validacao
 *
 * @see TCU_REQUIREMENTS.md - Requisitos de conformidade TCU
 * @see COMMON_REJECTIONS.md - Motivos comuns de rejeicao
 */
@Injectable()
export class ComplianceValidationService {
  private readonly logger = new Logger(ComplianceValidationService.name);

  constructor(
    @InjectRepository(ComplianceChecklist)
    private readonly checklistRepository: Repository<ComplianceChecklist>,
    @InjectRepository(ComplianceChecklistItem)
    private readonly itemRepository: Repository<ComplianceChecklistItem>,
    @InjectRepository(Etp)
    private readonly etpRepository: Repository<Etp>,
    @Inject(forwardRef(() => JurisprudenciaService))
    private readonly jurisprudenciaService: JurisprudenciaService,
  ) {}

  /**
   * Valida um ETP contra o checklist de conformidade apropriado.
   *
   * @param etpId - ID do ETP a ser validado
   * @param checklistId - ID do checklist (opcional, usa padrao do tipo do ETP)
   * @param includeOptional - Se true, inclui itens OPTIONAL na validacao
   * @returns Resultado completo da validacao
   */
  async validateEtp(
    etpId: string,
    checklistId?: string,
    includeOptional: boolean = false,
  ): Promise<ComplianceValidationResult> {
    const startTime = Date.now();

    // Buscar ETP com relacionamentos
    const etp = await this.etpRepository.findOne({
      where: { id: etpId },
      relations: ['sections', 'template'],
    });

    if (!etp) {
      throw new NotFoundException(`ETP with ID ${etpId} not found`);
    }

    // Buscar checklist apropriado
    const checklist = await this.getChecklistForEtp(etp, checklistId);
    if (!checklist) {
      throw new NotFoundException(
        `No active checklist found for ETP type ${etp.templateType || 'GENERIC'}`,
      );
    }

    // Filtrar itens ativos
    let items = checklist.items.filter((item) => item.isActive);

    // Remover itens OPTIONAL se nao solicitado
    if (!includeOptional) {
      items = items.filter((item) => item.type !== ChecklistItemType.OPTIONAL);
    }

    // Validar cada item
    const itemResults: ComplianceItemResult[] = [];
    const categoryScores: Record<
      ChecklistItemCategory,
      {
        total: number;
        passed: number;
        score: number;
        maxScore: number;
      }
    > = {} as Record<
      ChecklistItemCategory,
      { total: number; passed: number; score: number; maxScore: number }
    >;

    // Inicializar scores por categoria
    for (const category of Object.values(ChecklistItemCategory)) {
      categoryScores[category] = {
        total: 0,
        passed: 0,
        score: 0,
        maxScore: 0,
      };
    }

    for (const item of items) {
      const result = this.validateItem(item, etp);
      itemResults.push(result);

      // Atualizar scores por categoria
      const catScore = categoryScores[item.category];
      catScore.total++;
      catScore.maxScore += item.weight;
      if (result.passed) {
        catScore.passed++;
        catScore.score += item.weight;
      }
    }

    // Calcular score total
    const totalWeight = items.reduce((sum, item) => sum + item.weight, 0);
    const earnedWeight = itemResults
      .filter((r) => r.passed)
      .reduce((sum, r) => sum + r.weight, 0);
    const score =
      totalWeight > 0 ? Math.round((earnedWeight / totalWeight) * 100) : 0;

    // Determinar status
    let status: 'APPROVED' | 'NEEDS_REVIEW' | 'REJECTED';
    if (score >= checklist.minimumScore) {
      status = 'APPROVED';
    } else if (score >= checklist.minimumScore - 20) {
      status = 'NEEDS_REVIEW';
    } else {
      status = 'REJECTED';
    }

    // Gerar sugestoes
    const suggestions = this.generateSuggestions(itemResults);

    // Verificar jurisprudencia (#1582)
    const jurisprudenciaAlerts = await this.checkAgainstJurisprudence(etp);

    // Ajustar status se houver alertas de conflito com jurisprudencia
    if (
      jurisprudenciaAlerts.some((a) => a.type === 'CONFLICT') &&
      status === 'APPROVED'
    ) {
      status = 'NEEDS_REVIEW';
    }

    const processingTimeMs = Date.now() - startTime;

    const result: ComplianceValidationResult = {
      etpId,
      checklistId: checklist.id,
      checklistName: checklist.name,
      score,
      minimumScore: checklist.minimumScore,
      passed: score >= checklist.minimumScore,
      status,
      totalItems: items.length,
      passedItems: itemResults.filter((r) => r.passed).length,
      failedItems: itemResults.filter((r) => !r.passed).length,
      skippedItems: checklist.items.length - items.length,
      itemResults,
      suggestions,
      jurisprudenciaAlerts,
      categoryScores,
      validatedAt: new Date(),
      processingTimeMs,
    };

    this.logger.log(
      `ETP ${etpId} validation complete: score=${score}%, status=${status}, jurisprudenciaAlerts=${jurisprudenciaAlerts.length}, time=${processingTimeMs}ms`,
    );

    return result;
  }

  /**
   * Calcula apenas o score de conformidade de um ETP.
   *
   * @param etpId - ID do ETP
   * @returns Score de 0 a 100
   */
  async calculateComplianceScore(etpId: string): Promise<number> {
    const result = await this.validateEtp(etpId);
    return result.score;
  }

  /**
   * Retorna os itens que falharam na validacao.
   *
   * @param etpId - ID do ETP
   * @returns Lista de itens que falharam
   */
  async getFailingItems(etpId: string): Promise<ComplianceChecklistItem[]> {
    const result = await this.validateEtp(etpId);
    const failedIds = result.itemResults
      .filter((r) => !r.passed)
      .map((r) => r.itemId);

    if (failedIds.length === 0) {
      return [];
    }

    return this.itemRepository.findByIds(failedIds);
  }

  /**
   * Retorna sugestoes de melhoria para um ETP.
   *
   * @param etpId - ID do ETP
   * @returns Lista de sugestoes ordenadas por prioridade
   */
  async getSuggestions(etpId: string): Promise<ComplianceSuggestion[]> {
    const result = await this.validateEtp(etpId);
    return result.suggestions;
  }

  /**
   * Retorna um resumo do score de conformidade.
   *
   * @param etpId - ID do ETP
   * @returns Resumo para exibicao no frontend
   */
  async getScoreSummary(etpId: string): Promise<ComplianceScoreSummary> {
    const result = await this.validateEtp(etpId);

    const topIssues = result.suggestions.slice(0, 3).map((s) => ({
      requirement: s.title,
      fixSuggestion: s.description,
      priority: s.priority,
    }));

    return {
      score: result.score,
      passed: result.passed,
      status: result.status,
      totalItems: result.totalItems,
      passedItems: result.passedItems,
      failedItems: result.failedItems,
      topIssues,
      jurisprudenciaAlerts: result.jurisprudenciaAlerts,
    };
  }

  /**
   * Verifica um ETP contra jurisprudencia TCE-SP/TCU.
   *
   * Busca por precedentes relevantes e gera alertas de conflito
   * quando o conteudo do ETP contradiz entendimentos consolidados.
   *
   * Issue #1582 - Integrar jurisprudencia com ComplianceService
   *
   * @param etp - ETP a ser verificado
   * @returns Lista de alertas de jurisprudencia
   */
  async checkAgainstJurisprudence(etp: Etp): Promise<JurisprudenciaAlert[]> {
    const alerts: JurisprudenciaAlert[] = [];

    try {
      // Extrair texto completo do ETP para analise
      const etpText = this.getEtpFullText(etp);

      // Verificar temas criticos de jurisprudencia
      const themesToCheck = [
        {
          query: 'ETP fundamentacao justificativa',
          field: 'justificativaContratacao',
        },
        {
          query: 'pesquisa precos valor estimado',
          field: 'fontePesquisaPrecos',
        },
        { query: 'divisao parcelamento licitacao', field: 'objeto' },
        { query: 'dispensa inexigibilidade', field: 'objeto' },
        { query: 'prazo execucao contratual', field: 'prazoExecucao' },
        {
          query: 'sustentabilidade ambiental licitacao',
          field: 'criteriosSustentabilidade',
        },
      ];

      for (const theme of themesToCheck) {
        // Buscar jurisprudencia relevante
        const searchResult = await this.jurisprudenciaService.searchByText(
          theme.query,
          { limit: 5, minConfidence: 0.5, includeContent: true },
        );

        // Analisar resultados e gerar alertas
        for (const item of searchResult.items) {
          const alert = this.analyzeJurisprudenceMatch(
            etp,
            item,
            theme.field,
            etpText,
          );

          if (alert) {
            alerts.push(alert);
          }
        }
      }

      // Ordenar por confianca (maior primeiro)
      alerts.sort((a, b) => b.confidence - a.confidence);

      // Limitar a 5 alertas mais relevantes
      return alerts.slice(0, 5);
    } catch (error) {
      // Log error but don't fail the validation
      this.logger.warn(
        `Failed to check jurisprudence for ETP ${etp.id}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      return [];
    }
  }

  /**
   * Analisa se um item de jurisprudencia e relevante para o ETP e gera alerta.
   *
   * @param etp - ETP sendo validado
   * @param item - Item de jurisprudencia encontrado
   * @param field - Campo do ETP relacionado
   * @param etpText - Texto completo do ETP
   * @returns Alerta de jurisprudencia ou null se nao relevante
   */
  private analyzeJurisprudenceMatch(
    etp: Etp,
    item: {
      id: string;
      title: string;
      tribunal: 'TCE-SP' | 'TCU';
      content?: string;
    },
    field: string,
    etpText: string,
  ): JurisprudenciaAlert | null {
    if (!item.content) {
      return null;
    }

    const fieldValue = this.getEtpFieldValue(etp, field);
    const content = item.content.toLowerCase();

    // Padroes de conflito que indicam entendimentos relevantes
    const conflictPatterns = [
      {
        pattern: /nao deve|nao pode|vedado|proibido|ilegal/i,
        type: 'CONFLICT' as JurisprudenciaAlertType,
      },
      {
        pattern: /recomenda-se|deve conter|obrigatorio|essencial/i,
        type: 'RECOMMENDATION' as JurisprudenciaAlertType,
      },
      {
        pattern: /atencao|cuidado|ressalva|observar/i,
        type: 'WARNING' as JurisprudenciaAlertType,
      },
    ];

    // Verificar se o conteudo da jurisprudencia contem padroes de orientacao
    for (const { pattern, type } of conflictPatterns) {
      if (pattern.test(content)) {
        // Verificar se o ETP menciona temas relacionados
        const etpMentionsTheme = this.hasRelatedTerms(etpText, content);

        if (etpMentionsTheme) {
          return {
            type,
            tribunal: item.tribunal,
            precedentNumber: item.title,
            summary: this.truncate(item.content, 200),
            conflictingField: field,
            conflictingValue: fieldValue
              ? this.truncate(fieldValue, 100)
              : undefined,
            suggestedCorrection: this.generateSuggestionFromJurisprudence(
              item.content,
              type,
            ),
            confidence:
              type === 'CONFLICT' ? 0.8 : type === 'RECOMMENDATION' ? 0.7 : 0.6,
          };
        }
      }
    }

    return null;
  }

  /**
   * Verifica se o texto do ETP menciona termos relacionados ao conteudo da jurisprudencia.
   */
  private hasRelatedTerms(
    etpText: string,
    jurisprudenceContent: string,
  ): boolean {
    // Extrair palavras-chave relevantes da jurisprudencia
    const keywords = [
      'etp',
      'estudo',
      'preliminar',
      'contratacao',
      'licitacao',
      'preco',
      'pesquisa',
      'estimado',
      'valor',
      'justificativa',
      'dispensa',
      'inexigibilidade',
      'parcelamento',
      'divisao',
      'sustentabilidade',
      'prazo',
      'execucao',
    ];

    // Verificar se ha intersecao de termos
    const etpLower = etpText.toLowerCase();
    const jurisLower = jurisprudenceContent.toLowerCase();

    let matchCount = 0;
    for (const keyword of keywords) {
      if (etpLower.includes(keyword) && jurisLower.includes(keyword)) {
        matchCount++;
      }
    }

    // Considerar relevante se houver pelo menos 2 termos em comum
    return matchCount >= 2;
  }

  /**
   * Gera sugestao de correcao baseada no conteudo da jurisprudencia.
   */
  private generateSuggestionFromJurisprudence(
    content: string,
    type: JurisprudenciaAlertType,
  ): string {
    const contentLower = content.toLowerCase();

    // Gerar sugestao baseada no tipo de alerta
    if (type === 'CONFLICT') {
      if (contentLower.includes('justificativa')) {
        return 'Revisar justificativa do ETP para conformidade com entendimento consolidado dos tribunais.';
      }
      if (contentLower.includes('preco') || contentLower.includes('pesquisa')) {
        return 'Verificar metodologia de pesquisa de precos conforme orientacoes do tribunal.';
      }
      if (contentLower.includes('parcel') || contentLower.includes('divis')) {
        return 'Analisar criterios de parcelamento/divisao conforme jurisprudencia aplicavel.';
      }
      return 'Revisar conteudo do ETP para adequacao ao entendimento jurisprudencial.';
    }

    if (type === 'RECOMMENDATION') {
      return 'Considerar inclusao de elementos adicionais recomendados pela jurisprudencia.';
    }

    return 'Verificar conformidade com orientacoes do tribunal antes de prosseguir.';
  }

  /**
   * Busca o checklist apropriado para um ETP.
   */
  private async getChecklistForEtp(
    etp: Etp,
    checklistId?: string,
  ): Promise<ComplianceChecklist | null> {
    if (checklistId) {
      return this.checklistRepository.findOne({
        where: { id: checklistId, isActive: true },
        relations: ['items'],
      });
    }

    // Buscar checklist padrao TCU para o tipo do ETP
    const templateType = etp.templateType || EtpTemplateType.SERVICOS;

    return this.checklistRepository.findOne({
      where: {
        templateType,
        standard: ComplianceStandard.TCU,
        isActive: true,
      },
      relations: ['items'],
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Valida um item individual do checklist contra o ETP.
   */
  private validateItem(
    item: ComplianceChecklistItem,
    etp: Etp,
  ): ComplianceItemResult {
    const result: ComplianceItemResult = {
      itemId: item.id,
      requirement: item.requirement,
      passed: false,
      type: item.type,
      category: item.category,
      weight: item.weight,
      score: 0,
      legalReference: item.legalReference ?? undefined,
    };

    // Obter campos a verificar
    const fieldsToCheck = item.etpFieldsRequired
      ? item.etpFieldsRequired.split(',').map((f) => f.trim())
      : [];

    // Se nao ha campos especificados, verificar por keywords em todo o ETP
    if (
      fieldsToCheck.length === 0 &&
      item.keywords &&
      item.keywords.length > 0
    ) {
      const allText = this.getEtpFullText(etp);
      const hasKeywords = this.checkKeywords(allText, item.keywords);
      result.passed = hasKeywords;
      result.score = hasKeywords ? item.weight : 0;
      result.fieldChecked = 'all';

      if (!hasKeywords) {
        result.failureReason = `Palavras-chave esperadas nao encontradas: ${item.keywords.slice(0, 3).join(', ')}`;
        result.fixSuggestion = item.fixSuggestion ?? undefined;
      }

      return result;
    }

    // Verificar cada campo especificado
    for (const field of fieldsToCheck) {
      const value = this.getEtpFieldValue(etp, field);
      result.fieldChecked = field;
      result.valueFound = value ? this.truncate(value, 100) : undefined;

      // Verificar se o campo tem conteudo
      if (!value || value.trim().length === 0) {
        result.failureReason = `Campo "${field}" esta vazio ou ausente`;
        result.fixSuggestion = item.fixSuggestion ?? undefined;
        return result;
      }

      // Verificar comprimento minimo
      if (item.minLength && value.length < item.minLength) {
        result.failureReason = `Campo "${field}" muito curto (${value.length} caracteres, minimo ${item.minLength})`;
        result.fixSuggestion = item.fixSuggestion ?? undefined;
        return result;
      }

      // Verificar keywords
      if (item.keywords && item.keywords.length > 0) {
        if (!this.checkKeywords(value, item.keywords)) {
          result.failureReason = `Conteudo insuficiente em "${field}" - esperado mencao a: ${item.keywords.slice(0, 3).join(', ')}`;
          result.fixSuggestion = item.fixSuggestion ?? undefined;
          return result;
        }
      }

      // Verificar regex
      if (item.validationRegex) {
        try {
          const regex = new RegExp(item.validationRegex, 'i');
          if (!regex.test(value)) {
            result.failureReason = `Campo "${field}" nao atende ao formato esperado`;
            result.fixSuggestion = item.fixSuggestion ?? undefined;
            return result;
          }
        } catch {
          this.logger.warn(
            `Invalid regex in item ${item.id}: ${item.validationRegex}`,
          );
        }
      }
    }

    // Passou em todas as verificacoes
    result.passed = true;
    result.score = item.weight;

    return result;
  }

  /**
   * Obtem o texto completo do ETP para busca de keywords.
   */
  private getEtpFullText(etp: Etp): string {
    const parts: string[] = [
      etp.title || '',
      etp.description || '',
      etp.objeto || '',
      etp.descricaoDetalhada || '',
      etp.justificativaContratacao || '',
      etp.necessidadeAtendida || '',
      etp.beneficiosEsperados || '',
      etp.requisitosTecnicos || '',
      etp.requisitosQualificacao || '',
      etp.criteriosSustentabilidade || '',
      etp.descricaoRiscos || '',
      etp.fontePesquisaPrecos || '',
    ];

    // Incluir campos dinamicos
    if (etp.dynamicFields) {
      parts.push(JSON.stringify(etp.dynamicFields));
    }

    // Incluir secoes
    if (etp.sections) {
      for (const section of etp.sections) {
        if (section.content) {
          parts.push(section.content);
        }
      }
    }

    return parts.join(' ').toLowerCase();
  }

  /**
   * Obtem o valor de um campo especifico do ETP.
   */
  private getEtpFieldValue(etp: Etp, field: string): string | null {
    // Campos diretos
    const directFields: Record<string, unknown> = {
      title: etp.title,
      description: etp.description,
      objeto: etp.objeto,
      descricaoDetalhada: etp.descricaoDetalhada,
      justificativaContratacao: etp.justificativaContratacao,
      necessidadeAtendida: etp.necessidadeAtendida,
      beneficiosEsperados: etp.beneficiosEsperados,
      requisitosTecnicos: etp.requisitosTecnicos,
      requisitosQualificacao: etp.requisitosQualificacao,
      criteriosSustentabilidade: etp.criteriosSustentabilidade,
      garantiaExigida: etp.garantiaExigida,
      descricaoRiscos: etp.descricaoRiscos,
      fontePesquisaPrecos: etp.fontePesquisaPrecos,
      dotacaoOrcamentaria: etp.dotacaoOrcamentaria,
      valorEstimado: etp.valorEstimado?.toString(),
      quantidadeEstimada: etp.quantidadeEstimada?.toString(),
      unidadeMedida: etp.unidadeMedida,
      prazoExecucao: etp.prazoExecucao?.toString(),
      nivelRisco: etp.nivelRisco,
      orgaoEntidade: etp.orgaoEntidade,
      uasg: etp.uasg,
      unidadeDemandante: etp.unidadeDemandante,
    };

    if (field in directFields) {
      const value = directFields[field];
      return typeof value === 'string' ? value : null;
    }

    // Campos dinamicos
    if (field.startsWith('dynamicFields.') && etp.dynamicFields) {
      const dynamicField = field.replace('dynamicFields.', '');
      const value = (etp.dynamicFields as Record<string, unknown>)[
        dynamicField
      ];
      return typeof value === 'string' ? value : null;
    }

    // Responsavel tecnico
    if (field === 'responsavelTecnico' && etp.responsavelTecnico) {
      return etp.responsavelTecnico.nome || null;
    }

    return null;
  }

  /**
   * Verifica se o texto contem pelo menos uma das keywords.
   */
  private checkKeywords(text: string, keywords: string[]): boolean {
    const normalizedText = text.toLowerCase();
    return keywords.some((keyword) =>
      normalizedText.includes(keyword.toLowerCase()),
    );
  }

  /**
   * Gera sugestoes de melhoria baseadas nos itens que falharam.
   */
  private generateSuggestions(
    itemResults: ComplianceItemResult[],
  ): ComplianceSuggestion[] {
    const suggestions: ComplianceSuggestion[] = [];

    const failedItems = itemResults.filter((r) => !r.passed);

    // Ordenar por tipo (MANDATORY primeiro) e peso (maior peso primeiro)
    failedItems.sort((a, b) => {
      const typeOrder = { MANDATORY: 0, RECOMMENDED: 1, OPTIONAL: 2 };
      const typeComparison = typeOrder[a.type] - typeOrder[b.type];
      if (typeComparison !== 0) return typeComparison;
      return b.weight - a.weight;
    });

    for (const item of failedItems) {
      const priority: 'high' | 'medium' | 'low' =
        item.type === ChecklistItemType.MANDATORY
          ? 'high'
          : item.type === ChecklistItemType.RECOMMENDED
            ? 'medium'
            : 'low';

      suggestions.push({
        category: item.category,
        title: item.requirement,
        description:
          item.fixSuggestion ||
          item.failureReason ||
          'Corrigir este item para melhorar conformidade',
        priority,
        field: item.fieldChecked,
        legalReference: item.legalReference,
      });
    }

    return suggestions;
  }

  /**
   * Trunca uma string para exibicao.
   */
  private truncate(str: string, maxLength: number): string {
    if (str.length <= maxLength) return str;
    return str.substring(0, maxLength - 3) + '...';
  }

  /**
   * Busca todos os checklists disponiveis.
   */
  async findAllChecklists(): Promise<ComplianceChecklist[]> {
    return this.checklistRepository.find({
      where: { isActive: true },
      order: { templateType: 'ASC', standard: 'ASC' },
    });
  }

  /**
   * Busca um checklist por ID.
   */
  async findChecklistById(id: string): Promise<ComplianceChecklist | null> {
    return this.checklistRepository.findOne({
      where: { id },
      relations: ['items'],
    });
  }

  /**
   * Busca checklists por tipo de ETP.
   */
  async findChecklistsByTemplateType(
    templateType: EtpTemplateType,
  ): Promise<ComplianceChecklist[]> {
    return this.checklistRepository.find({
      where: { templateType, isActive: true },
      relations: ['items'],
      order: { standard: 'ASC' },
    });
  }
}
