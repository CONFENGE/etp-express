import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
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
import { EtpTemplateType } from '../../entities/etp-template.entity';

/**
 * Interface para dados de item do checklist no seed.
 */
interface ChecklistItemData {
  requirement: string;
  description: string;
  type: ChecklistItemType;
  category: ChecklistItemCategory;
  weight: number;
  etpFieldsRequired?: string;
  sectionRequired?: string;
  keywords: string[];
  minLength?: number;
  fixSuggestion: string;
  legalReference?: string;
  rejectionCode?: string;
  order: number;
}

/**
 * Interface para dados do checklist no seed.
 */
interface ChecklistData {
  name: string;
  description: string;
  standard: ComplianceStandard;
  templateType: EtpTemplateType;
  legalBasis: string;
  minimumScore: number;
  items: ChecklistItemData[];
}

/**
 * Auto-seed service para checklists de conformidade TCU.
 * Executa no bootstrap da aplicacao e popula checklists se nao existirem.
 *
 * Issue #1384 - [TCU-1163c] Seed checklist de conformidade TCU por tipo de ETP
 * Parent: #1163 - [Conformidade] Templates baseados em modelos TCU/TCES
 *
 * Este seeder cria checklists TCU para os 4 tipos de ETP:
 * - OBRAS: 10 itens baseados em requisitos de engenharia
 * - TI: 10 itens baseados em IN SGD 94/2022
 * - SERVICOS: 9 itens baseados em IN SEGES 5/2017
 * - MATERIAIS: 8 itens baseados em requisitos gerais
 *
 * @see TCU_REQUIREMENTS.md - Requisitos de conformidade TCU
 * @see COMMON_REJECTIONS.md - Motivos comuns de rejeicao (REJ-001 a REJ-010)
 */
@Injectable()
export class ComplianceChecklistSeeder implements OnApplicationBootstrap {
  private readonly logger = new Logger(ComplianceChecklistSeeder.name);

  constructor(
    @InjectRepository(ComplianceChecklist)
    private readonly checklistRepository: Repository<ComplianceChecklist>,
    @InjectRepository(ComplianceChecklistItem)
    private readonly itemRepository: Repository<ComplianceChecklistItem>,
  ) {}

  /**
   * Chamado no bootstrap da aplicacao.
   * Popula checklists TCU se nao existirem.
   */
  async onApplicationBootstrap(): Promise<void> {
    await this.seedChecklistsIfNeeded();
  }

  /**
   * Verifica se checklists existem e faz seed se necessario.
   */
  async seedChecklistsIfNeeded(): Promise<void> {
    try {
      const count = await this.checklistRepository.count({
        where: { standard: ComplianceStandard.TCU },
      });

      if (count > 0) {
        this.logger.log(
          `TCU checklists already seeded: ${count} checklists found`,
        );
        return;
      }

      this.logger.log('No TCU checklists found, starting auto-seed...');
      await this.seedAllChecklists();
      this.logger.log('TCU checklists auto-seed completed successfully');
    } catch (error) {
      this.logger.error('Failed to auto-seed TCU checklists', error);
      // Nao lanca erro - permite app iniciar mesmo se seed falhar
    }
  }

  /**
   * Faz seed de todos os checklists TCU.
   */
  private async seedAllChecklists(): Promise<void> {
    const checklists = this.getTcuChecklists();

    for (const checklistData of checklists) {
      await this.createChecklist(checklistData);
    }
  }

  /**
   * Cria um checklist com seus itens.
   */
  private async createChecklist(data: ChecklistData): Promise<void> {
    // Verificar se ja existe
    const existing = await this.checklistRepository.findOne({
      where: {
        standard: data.standard,
        templateType: data.templateType,
      },
    });

    if (existing) {
      this.logger.debug(
        `Checklist ${data.standard} - ${data.templateType} already exists, skipping`,
      );
      return;
    }

    // Criar checklist
    const checklist = this.checklistRepository.create({
      name: data.name,
      description: data.description,
      standard: data.standard,
      templateType: data.templateType,
      legalBasis: data.legalBasis,
      minimumScore: data.minimumScore,
      version: '1.0',
      isActive: true,
    });

    const savedChecklist = await this.checklistRepository.save(checklist);

    // Criar itens
    for (const itemData of data.items) {
      const item = this.itemRepository.create({
        checklistId: savedChecklist.id,
        requirement: itemData.requirement,
        description: itemData.description,
        type: itemData.type,
        category: itemData.category,
        weight: itemData.weight,
        etpFieldsRequired: itemData.etpFieldsRequired,
        sectionRequired: itemData.sectionRequired,
        keywords: itemData.keywords,
        minLength: itemData.minLength,
        fixSuggestion: itemData.fixSuggestion,
        legalReference: itemData.legalReference,
        rejectionCode: itemData.rejectionCode,
        order: itemData.order,
        isActive: true,
      });

      await this.itemRepository.save(item);
    }

    this.logger.log(
      `Created checklist: ${data.name} with ${data.items.length} items`,
    );
  }

  /**
   * Retorna dados dos checklists TCU para os 4 tipos de ETP.
   * Baseado em TCU_REQUIREMENTS.md e COMMON_REJECTIONS.md
   */
  private getTcuChecklists(): ChecklistData[] {
    return [
      this.getObrasChecklist(),
      this.getTiChecklist(),
      this.getServicosChecklist(),
      this.getMateriaisChecklist(),
    ];
  }

  /**
   * Checklist TCU para OBRAS e Servicos de Engenharia.
   * 10 itens, pesos somando 100.
   */
  private getObrasChecklist(): ChecklistData {
    return {
      name: 'TCU - Obras e Servicos de Engenharia',
      description:
        'Checklist de conformidade TCU para contratacoes de obras e servicos de engenharia. ' +
        'Baseado na Lei 14.133/2021, IN SEGES 58/2022 e acordaos do TCU.',
      standard: ComplianceStandard.TCU,
      templateType: EtpTemplateType.OBRAS,
      legalBasis:
        'Art. 18, Lei 14.133/2021; IN SEGES 58/2022; Acordao TCU 2622/2013',
      minimumScore: 70,
      items: [
        {
          requirement: 'Descricao da necessidade da contratacao',
          description:
            'Descricao clara do problema a ser resolvido sob a perspectiva do interesse publico, ' +
            'com quantificacao do impacto e dados que fundamentem a necessidade.',
          type: ChecklistItemType.MANDATORY,
          category: ChecklistItemCategory.JUSTIFICATION,
          weight: 15,
          etpFieldsRequired: 'justificativaContratacao,necessidadeAtendida',
          sectionRequired: 'justificativa',
          keywords: ['necessidade', 'demanda', 'problema', 'interesse publico'],
          minLength: 100,
          fixSuggestion:
            'Descreva o problema especifico que a obra resolve, quantifique o impacto (custos, riscos) e demonstre o interesse publico envolvido.',
          legalReference: 'Art. 18, par. 1o, I - Lei 14.133/2021',
          rejectionCode: 'REJ-001',
          order: 1,
        },
        {
          requirement: 'Analise de alternativas de solucao',
          description:
            'Levantamento de mercado com analise de pelo menos 3 alternativas de solucao, ' +
            'com comparativo tecnico e economico e justificativa da escolha.',
          type: ChecklistItemType.MANDATORY,
          category: ChecklistItemCategory.JUSTIFICATION,
          weight: 12,
          etpFieldsRequired: 'descricaoDetalhada',
          sectionRequired: 'requisitos',
          keywords: [
            'alternativa',
            'solucao',
            'opcao',
            'comparativo',
            'viabilidade',
          ],
          minLength: 150,
          fixSuggestion:
            'Liste ao menos 3 alternativas de solucao, analise pros/contras de cada uma e justifique tecnicamente a escolha da opcao selecionada.',
          legalReference: 'Art. 18, par. 1o, V - Lei 14.133/2021',
          rejectionCode: 'REJ-002',
          order: 2,
        },
        {
          requirement: 'Estimativa de quantidades com memoria de calculo',
          description:
            'Estimativas de quantidades para a contratacao acompanhadas de memorias de calculo ' +
            'e documentos que lhes dao suporte.',
          type: ChecklistItemType.MANDATORY,
          category: ChecklistItemCategory.REQUIREMENTS,
          weight: 10,
          etpFieldsRequired: 'quantidadeEstimada,unidadeMedida',
          sectionRequired: 'requisitos',
          keywords: ['quantidade', 'volume', 'unidade', 'memoria', 'calculo'],
          fixSuggestion:
            'Detalhe as quantidades com base em levantamentos tecnicos e inclua a memoria de calculo utilizada.',
          legalReference: 'Art. 18, par. 1o, IV - Lei 14.133/2021',
          order: 3,
        },
        {
          requirement: 'Referencia de precos SINAPI/SICRO',
          description:
            'Estimativa de valor da contratacao com referencia obrigatoria a tabelas SINAPI ou SICRO, ' +
            'informando data-base e codigos utilizados.',
          type: ChecklistItemType.MANDATORY,
          category: ChecklistItemCategory.PRICING,
          weight: 15,
          etpFieldsRequired: 'fontePesquisaPrecos,valorEstimado',
          sectionRequired: 'custos',
          keywords: ['SINAPI', 'SICRO', 'preco', 'referencia', 'data-base'],
          minLength: 50,
          fixSuggestion:
            'Cite obrigatoriamente SINAPI ou SICRO como referencia de precos, informando mes/ano da tabela e codigos dos servicos.',
          legalReference:
            'Art. 23, Lei 14.133/2021; IN SEGES 65/2021; Acordao TCU 2622/2013',
          rejectionCode: 'REJ-004',
          order: 4,
        },
        {
          requirement: 'Analise de riscos com mitigacao',
          description:
            'Identificacao dos riscos da contratacao com classificacao por probabilidade/impacto ' +
            'e definicao de medidas de mitigacao.',
          type: ChecklistItemType.MANDATORY,
          category: ChecklistItemCategory.RISKS,
          weight: 10,
          etpFieldsRequired: 'descricaoRiscos,nivelRisco',
          sectionRequired: 'riscos',
          keywords: ['risco', 'mitigacao', 'contingencia', 'probabilidade'],
          minLength: 80,
          fixSuggestion:
            'Identifique riscos tecnicos e operacionais, classifique por probabilidade/impacto e defina medidas de mitigacao com responsaveis.',
          legalReference: 'Art. 18, par. 1o, XII - Lei 14.133/2021',
          rejectionCode: 'REJ-007',
          order: 5,
        },
        {
          requirement: 'ART/RRT do responsavel tecnico',
          description:
            'Identificacao do responsavel tecnico (engenheiro/arquiteto) com numero da ART ou RRT ' +
            'emitida para o projeto.',
          type: ChecklistItemType.MANDATORY,
          category: ChecklistItemCategory.DOCUMENTATION,
          weight: 8,
          etpFieldsRequired: 'responsavelTecnico',
          sectionRequired: 'identificacao',
          keywords: ['ART', 'RRT', 'CREA', 'CAU', 'responsavel', 'tecnico'],
          fixSuggestion:
            'Identifique o profissional responsavel tecnico (engenheiro/arquiteto) e cite o numero da ART ou RRT do projeto.',
          legalReference: 'Lei 5.194/1966; Lei 12.378/2010',
          rejectionCode: 'REJ-005',
          order: 6,
        },
        {
          requirement: 'Justificativa para parcelamento ou nao',
          description:
            'Justificativa explicita da decisao de parcelar ou nao parcelar o objeto da contratacao.',
          type: ChecklistItemType.MANDATORY,
          category: ChecklistItemCategory.REQUIREMENTS,
          weight: 8,
          sectionRequired: 'requisitos',
          keywords: [
            'parcelamento',
            'lote',
            'divisao',
            'interdependencia',
            'escala',
          ],
          minLength: 50,
          fixSuggestion:
            'Inclua secao especifica justificando a decisao de parcelar ou nao parcelar o objeto, citando motivos tecnicos e economicos.',
          legalReference: 'Art. 18, par. 1o, VIII - Lei 14.133/2021',
          rejectionCode: 'REJ-010',
          order: 7,
        },
        {
          requirement: 'Posicionamento conclusivo sobre viabilidade',
          description:
            'Conclusao explicita sobre a viabilidade tecnica e economica da contratacao ' +
            'e recomendacao sobre prosseguimento.',
          type: ChecklistItemType.MANDATORY,
          category: ChecklistItemCategory.CONCLUSION,
          weight: 10,
          sectionRequired: 'conclusao',
          keywords: [
            'viavel',
            'viabilidade',
            'conclusao',
            'recomenda',
            'adequado',
          ],
          minLength: 80,
          fixSuggestion:
            'Inclua posicionamento conclusivo explicito sobre viabilidade tecnica e economica, e recomendacao sobre prosseguir com Termo de Referencia.',
          legalReference: 'Art. 18, par. 1o, XIII - Lei 14.133/2021',
          rejectionCode: 'REJ-009',
          order: 8,
        },
        {
          requirement: 'Cronograma fisico-financeiro',
          description:
            'Cronograma previsto para execucao da obra com etapas, marcos e previsao de desembolso.',
          type: ChecklistItemType.RECOMMENDED,
          category: ChecklistItemCategory.REQUIREMENTS,
          weight: 6,
          etpFieldsRequired: 'prazoExecucao',
          sectionRequired: 'custos',
          keywords: ['cronograma', 'etapa', 'parcela', 'desembolso', 'prazo'],
          fixSuggestion:
            'Adicione cronograma fisico-financeiro com etapas de execucao, marcos e previsao de desembolso por periodo.',
          legalReference: 'Art. 46, Lei 14.133/2021',
          order: 9,
        },
        {
          requirement: 'Memorial descritivo dos servicos',
          description:
            'Memorial descritivo com especificacoes tecnicas dos servicos a serem executados.',
          type: ChecklistItemType.RECOMMENDED,
          category: ChecklistItemCategory.DOCUMENTATION,
          weight: 6,
          etpFieldsRequired: 'requisitosTecnicos',
          sectionRequired: 'requisitos',
          keywords: ['memorial', 'especificacao', 'descritivo', 'tecnico'],
          fixSuggestion:
            'Elabore memorial descritivo detalhando especificacoes tecnicas dos servicos de engenharia.',
          legalReference: 'Art. 6o, XXV - Lei 14.133/2021',
          order: 10,
        },
      ],
    };
  }

  /**
   * Checklist TCU para Tecnologia da Informacao.
   * 10 itens, pesos somando 100.
   */
  private getTiChecklist(): ChecklistData {
    return {
      name: 'TCU - Tecnologia da Informacao',
      description:
        'Checklist de conformidade TCU para contratacoes de TI, software e servicos de tecnologia. ' +
        'Baseado na Lei 14.133/2021, IN SGD 94/2022 e boas praticas de contratacoes de TIC.',
      standard: ComplianceStandard.TCU,
      templateType: EtpTemplateType.TI,
      legalBasis:
        'Art. 18, Lei 14.133/2021; IN SGD 94/2022; Lei 13.709/2018 (LGPD)',
      minimumScore: 70,
      items: [
        {
          requirement: 'Descricao da necessidade da contratacao',
          description:
            'Descricao clara do problema a ser resolvido sob a perspectiva do interesse publico, ' +
            'com alinhamento ao PDTIC e transformacao digital.',
          type: ChecklistItemType.MANDATORY,
          category: ChecklistItemCategory.JUSTIFICATION,
          weight: 15,
          etpFieldsRequired: 'justificativaContratacao,necessidadeAtendida',
          sectionRequired: 'justificativa',
          keywords: ['necessidade', 'demanda', 'problema', 'PDTIC', 'digital'],
          minLength: 100,
          fixSuggestion:
            'Descreva o problema especifico que a solucao de TI resolve e demonstre alinhamento com o PDTIC e estrategia de transformacao digital.',
          legalReference: 'Art. 18, par. 1o, I - Lei 14.133/2021',
          rejectionCode: 'REJ-001',
          order: 1,
        },
        {
          requirement: 'Especificacoes tecnicas detalhadas',
          description:
            'Requisitos tecnicos da solucao de forma precisa e nao restritiva a competicao.',
          type: ChecklistItemType.MANDATORY,
          category: ChecklistItemCategory.REQUIREMENTS,
          weight: 12,
          etpFieldsRequired: 'requisitosTecnicos',
          sectionRequired: 'requisitos',
          keywords: ['especificacao', 'tecnica', 'requisito', 'funcionalidade'],
          minLength: 100,
          fixSuggestion:
            'Especifique requisitos tecnicos por caracteristicas de desempenho, evitando direcionamento para marca ou fornecedor especifico.',
          legalReference: 'IN SGD 94/2022; Art. 47, Lei 14.133/2021',
          rejectionCode: 'REJ-006',
          order: 2,
        },
        {
          requirement: 'Analise de alternativas de solucao',
          description:
            'Levantamento de mercado com analise de alternativas de solucao e justificativa da escolha.',
          type: ChecklistItemType.MANDATORY,
          category: ChecklistItemCategory.JUSTIFICATION,
          weight: 10,
          sectionRequired: 'requisitos',
          keywords: ['alternativa', 'solucao', 'opcao', 'comparativo'],
          minLength: 100,
          fixSuggestion:
            'Analise diferentes solucoes de mercado (ex: desenvolvimento proprio vs. COTS vs. SaaS) e justifique a escolha.',
          legalReference: 'Art. 18, par. 1o, V - Lei 14.133/2021',
          rejectionCode: 'REJ-002',
          order: 3,
        },
        {
          requirement: 'Estimativa de precos com pesquisa de mercado',
          description:
            'Estimativa de valor da contratacao com pesquisa de mercado em pelo menos 3 fontes.',
          type: ChecklistItemType.MANDATORY,
          category: ChecklistItemCategory.PRICING,
          weight: 12,
          etpFieldsRequired: 'fontePesquisaPrecos,valorEstimado',
          sectionRequired: 'custos',
          keywords: [
            'preco',
            'valor',
            'estimativa',
            'orcamento',
            'pesquisa',
            'PNCP',
          ],
          minLength: 50,
          fixSuggestion:
            'Realize pesquisa de precos em pelo menos 3 fontes (PNCP, Banco de Precos, cotacoes) e utilize mediana para valor estimado.',
          legalReference: 'Art. 18, par. 1o, VI - Lei 14.133/2021; IN 65/2021',
          rejectionCode: 'REJ-003',
          order: 4,
        },
        {
          requirement: 'Niveis de servico (SLA)',
          description:
            'Definicao de niveis de servico com metricas objetivas de disponibilidade, tempo de resposta e penalidades.',
          type: ChecklistItemType.RECOMMENDED,
          category: ChecklistItemCategory.REQUIREMENTS,
          weight: 8,
          sectionRequired: 'requisitos',
          keywords: [
            'SLA',
            'nivel de servico',
            'disponibilidade',
            'tempo de resposta',
          ],
          fixSuggestion:
            'Defina SLAs com metricas mensuraveis: disponibilidade (ex: 99,5%), tempo de resposta para incidentes e penalidades por descumprimento.',
          legalReference: 'IN SGD 94/2022',
          order: 5,
        },
        {
          requirement: 'Requisitos de seguranca da informacao',
          description:
            'Especificacao de requisitos de seguranca: criptografia, autenticacao, auditoria e conformidade.',
          type: ChecklistItemType.RECOMMENDED,
          category: ChecklistItemCategory.REQUIREMENTS,
          weight: 8,
          sectionRequired: 'requisitos',
          keywords: ['seguranca', 'criptografia', 'autenticacao', 'auditoria'],
          fixSuggestion:
            'Especifique requisitos de seguranca: criptografia de dados, autenticacao multifator, logs de auditoria e conformidade com PNSI.',
          legalReference:
            'IN SGD 94/2022; Decreto 9.637/2018 (Politica Nacional de Seguranca da Informacao)',
          order: 6,
        },
        {
          requirement: 'Conformidade LGPD',
          description:
            'Verificacao de conformidade com LGPD se a solucao processar dados pessoais.',
          type: ChecklistItemType.RECOMMENDED,
          category: ChecklistItemCategory.REQUIREMENTS,
          weight: 8,
          sectionRequired: 'requisitos',
          keywords: ['LGPD', 'dados pessoais', 'privacidade', 'tratamento'],
          fixSuggestion:
            'Avalie se a solucao processara dados pessoais e, se positivo, inclua requisitos de conformidade LGPD e medidas de protecao.',
          legalReference: 'Lei 13.709/2018 (LGPD)',
          order: 7,
        },
        {
          requirement: 'Analise de riscos com mitigacao',
          description:
            'Identificacao dos riscos da contratacao com medidas de mitigacao.',
          type: ChecklistItemType.MANDATORY,
          category: ChecklistItemCategory.RISKS,
          weight: 8,
          etpFieldsRequired: 'descricaoRiscos,nivelRisco',
          sectionRequired: 'riscos',
          keywords: ['risco', 'mitigacao', 'contingencia'],
          minLength: 50,
          fixSuggestion:
            'Identifique riscos tecnicos (dependencia de fornecedor, obsolescencia) e de projeto (prazo, custo) com medidas de mitigacao.',
          legalReference: 'Art. 18, par. 1o, XII - Lei 14.133/2021',
          rejectionCode: 'REJ-007',
          order: 8,
        },
        {
          requirement: 'Justificativa para parcelamento ou nao',
          description:
            'Justificativa explicita da decisao de parcelar ou nao parcelar o objeto.',
          type: ChecklistItemType.MANDATORY,
          category: ChecklistItemCategory.REQUIREMENTS,
          weight: 7,
          sectionRequired: 'requisitos',
          keywords: ['parcelamento', 'lote', 'divisao'],
          minLength: 40,
          fixSuggestion:
            'Justifique a decisao de parcelar ou nao: se a solucao e integrada (nao parcelar) ou se pode ser dividida em modulos (parcelar).',
          legalReference: 'Art. 18, par. 1o, VIII - Lei 14.133/2021',
          rejectionCode: 'REJ-010',
          order: 9,
        },
        {
          requirement: 'Posicionamento conclusivo sobre viabilidade',
          description:
            'Conclusao explicita sobre viabilidade tecnica e economica e recomendacao.',
          type: ChecklistItemType.MANDATORY,
          category: ChecklistItemCategory.CONCLUSION,
          weight: 12,
          sectionRequired: 'conclusao',
          keywords: ['viavel', 'viabilidade', 'conclusao', 'recomenda'],
          minLength: 80,
          fixSuggestion:
            'Inclua posicionamento conclusivo sobre viabilidade tecnica e economica da contratacao de TI e recomendacao de prosseguimento.',
          legalReference: 'Art. 18, par. 1o, XIII - Lei 14.133/2021',
          rejectionCode: 'REJ-009',
          order: 10,
        },
      ],
    };
  }

  /**
   * Checklist TCU para Servicos Continuados.
   * 9 itens, pesos somando 100.
   */
  private getServicosChecklist(): ChecklistData {
    return {
      name: 'TCU - Servicos Continuados',
      description:
        'Checklist de conformidade TCU para contratacoes de servicos continuados com ou sem dedicacao exclusiva de mao de obra. ' +
        'Baseado na Lei 14.133/2021 e IN SEGES 5/2017.',
      standard: ComplianceStandard.TCU,
      templateType: EtpTemplateType.SERVICOS,
      legalBasis:
        'Art. 18, Lei 14.133/2021; IN SEGES 5/2017; Portaria SEGES 26.383/2023',
      minimumScore: 70,
      items: [
        {
          requirement: 'Descricao da necessidade da contratacao',
          description:
            'Descricao clara do problema a ser resolvido sob a perspectiva do interesse publico, ' +
            'considerando a natureza continuada do servico.',
          type: ChecklistItemType.MANDATORY,
          category: ChecklistItemCategory.JUSTIFICATION,
          weight: 15,
          etpFieldsRequired: 'justificativaContratacao,necessidadeAtendida',
          sectionRequired: 'justificativa',
          keywords: ['necessidade', 'demanda', 'servico', 'continuado'],
          minLength: 100,
          fixSuggestion:
            'Descreva a necessidade do servico continuado, quantificando a demanda atual e justificando por que nao pode ser realizado com recursos proprios.',
          legalReference: 'Art. 18, par. 1o, I - Lei 14.133/2021',
          rejectionCode: 'REJ-001',
          order: 1,
        },
        {
          requirement: 'Analise de alternativas de solucao',
          description:
            'Levantamento de mercado com analise de alternativas de prestacao do servico.',
          type: ChecklistItemType.MANDATORY,
          category: ChecklistItemCategory.JUSTIFICATION,
          weight: 10,
          sectionRequired: 'requisitos',
          keywords: ['alternativa', 'solucao', 'opcao', 'terceirizacao'],
          minLength: 80,
          fixSuggestion:
            'Analise alternativas: execucao direta vs. terceirizacao, diferentes modelos de contratacao (posto vs. resultado).',
          legalReference: 'Art. 18, par. 1o, V - Lei 14.133/2021',
          rejectionCode: 'REJ-002',
          order: 2,
        },
        {
          requirement: 'Estimativa de quantidades com produtividade',
          description:
            'Estimativas de quantidades baseadas em indicadores de produtividade de referencia.',
          type: ChecklistItemType.MANDATORY,
          category: ChecklistItemCategory.REQUIREMENTS,
          weight: 12,
          etpFieldsRequired: 'quantidadeEstimada,unidadeMedida',
          sectionRequired: 'requisitos',
          keywords: [
            'quantidade',
            'produtividade',
            'rendimento',
            'indicador',
            'posto',
          ],
          fixSuggestion:
            'Calcule quantidades baseadas em produtividade de referencia (ex: IN SEGES para limpeza) e dimensionamento tecnico.',
          legalReference:
            'Art. 18, par. 1o, IV - Lei 14.133/2021; IN SEGES 5/2017',
          order: 3,
        },
        {
          requirement: 'Estimativa de precos com pesquisa de mercado',
          description:
            'Estimativa de valor com pesquisa de mercado e referencia a convencoes coletivas quando aplicavel.',
          type: ChecklistItemType.MANDATORY,
          category: ChecklistItemCategory.PRICING,
          weight: 15,
          etpFieldsRequired: 'fontePesquisaPrecos,valorEstimado',
          sectionRequired: 'custos',
          keywords: [
            'preco',
            'valor',
            'estimativa',
            'convencao',
            'coletiva',
            'pesquisa',
          ],
          minLength: 50,
          fixSuggestion:
            'Realize pesquisa de precos e, para servicos com mao de obra, utilize convencao coletiva de referencia para piso salarial.',
          legalReference: 'Art. 18, par. 1o, VI - Lei 14.133/2021; IN 65/2021',
          rejectionCode: 'REJ-003',
          order: 4,
        },
        {
          requirement: 'Indicadores de desempenho (KPIs)',
          description:
            'Definicao de indicadores de desempenho mensuraveis para aferir a qualidade do servico.',
          type: ChecklistItemType.RECOMMENDED,
          category: ChecklistItemCategory.REQUIREMENTS,
          weight: 10,
          sectionRequired: 'requisitos',
          keywords: ['indicador', 'desempenho', 'KPI', 'meta', 'resultado'],
          fixSuggestion:
            'Defina KPIs objetivos para medicao da qualidade: tempo de atendimento, indice de satisfacao, taxa de resolucao.',
          legalReference: 'Art. 18, par. 1o, IX - Lei 14.133/2021',
          order: 5,
        },
        {
          requirement: 'Frequencia e horarios de execucao',
          description:
            'Definicao clara da frequencia e horarios de execucao do servico.',
          type: ChecklistItemType.RECOMMENDED,
          category: ChecklistItemCategory.REQUIREMENTS,
          weight: 6,
          sectionRequired: 'requisitos',
          keywords: ['frequencia', 'horario', 'periodicidade', 'escala'],
          fixSuggestion:
            'Especifique frequencia (diaria, semanal), horarios de execucao e escalas de trabalho quando aplicavel.',
          legalReference: 'IN SEGES 5/2017',
          order: 6,
        },
        {
          requirement: 'Analise de riscos com mitigacao',
          description:
            'Identificacao dos riscos da contratacao com medidas de mitigacao.',
          type: ChecklistItemType.MANDATORY,
          category: ChecklistItemCategory.RISKS,
          weight: 10,
          etpFieldsRequired: 'descricaoRiscos,nivelRisco',
          sectionRequired: 'riscos',
          keywords: ['risco', 'mitigacao', 'contingencia'],
          minLength: 50,
          fixSuggestion:
            'Identifique riscos trabalhistas, de descontinuidade do servico e de gestao contratual com medidas de mitigacao.',
          legalReference: 'Art. 18, par. 1o, XII - Lei 14.133/2021',
          rejectionCode: 'REJ-007',
          order: 7,
        },
        {
          requirement: 'Justificativa para parcelamento ou nao',
          description:
            'Justificativa explicita da decisao de parcelar ou nao os servicos.',
          type: ChecklistItemType.MANDATORY,
          category: ChecklistItemCategory.REQUIREMENTS,
          weight: 10,
          sectionRequired: 'requisitos',
          keywords: ['parcelamento', 'lote', 'divisao', 'agrupamento'],
          minLength: 40,
          fixSuggestion:
            'Justifique a decisao: se servicos sao interdependentes (nao parcelar) ou se podem ser contratados separadamente (parcelar).',
          legalReference: 'Art. 18, par. 1o, VIII - Lei 14.133/2021',
          rejectionCode: 'REJ-010',
          order: 8,
        },
        {
          requirement: 'Posicionamento conclusivo sobre viabilidade',
          description:
            'Conclusao explicita sobre viabilidade e adequacao da contratacao.',
          type: ChecklistItemType.MANDATORY,
          category: ChecklistItemCategory.CONCLUSION,
          weight: 12,
          sectionRequired: 'conclusao',
          keywords: ['viavel', 'viabilidade', 'conclusao', 'recomenda'],
          minLength: 80,
          fixSuggestion:
            'Inclua posicionamento conclusivo sobre viabilidade tecnica e economica da contratacao de servicos.',
          legalReference: 'Art. 18, par. 1o, XIII - Lei 14.133/2021',
          rejectionCode: 'REJ-009',
          order: 9,
        },
      ],
    };
  }

  /**
   * Checklist TCU para Aquisicao de Materiais.
   * 8 itens, pesos somando 100.
   */
  private getMateriaisChecklist(): ChecklistData {
    return {
      name: 'TCU - Aquisicao de Materiais e Bens',
      description:
        'Checklist de conformidade TCU para aquisicao de materiais permanentes e de consumo, bens e equipamentos. ' +
        'Baseado na Lei 14.133/2021 e referencias CATMAT/CATSER.',
      standard: ComplianceStandard.TCU,
      templateType: EtpTemplateType.MATERIAIS,
      legalBasis:
        'Art. 18, Lei 14.133/2021; Decreto 7.892/2013; Portaria SEGES 938/2022',
      minimumScore: 70,
      items: [
        {
          requirement: 'Descricao da necessidade da contratacao',
          description:
            'Descricao clara da necessidade de aquisicao sob a perspectiva do interesse publico.',
          type: ChecklistItemType.MANDATORY,
          category: ChecklistItemCategory.JUSTIFICATION,
          weight: 15,
          etpFieldsRequired: 'justificativaContratacao,necessidadeAtendida',
          sectionRequired: 'justificativa',
          keywords: ['necessidade', 'demanda', 'material', 'aquisicao'],
          minLength: 80,
          fixSuggestion:
            'Descreva a necessidade de aquisicao, quantificando a demanda e demonstrando por que os materiais sao essenciais.',
          legalReference: 'Art. 18, par. 1o, I - Lei 14.133/2021',
          rejectionCode: 'REJ-001',
          order: 1,
        },
        {
          requirement: 'Especificacoes tecnicas nao restritivas',
          description:
            'Especificacoes tecnicas dos materiais de forma precisa e sem direcionamento a marca.',
          type: ChecklistItemType.MANDATORY,
          category: ChecklistItemCategory.REQUIREMENTS,
          weight: 15,
          etpFieldsRequired: 'requisitosTecnicos',
          sectionRequired: 'requisitos',
          keywords: [
            'especificacao',
            'tecnica',
            'caracteristica',
            'desempenho',
          ],
          minLength: 80,
          fixSuggestion:
            'Especifique por caracteristicas de desempenho, evitando mencao a marcas. Se necessario citar marca, adicione "ou similar/equivalente".',
          legalReference: 'Art. 47, Lei 14.133/2021',
          rejectionCode: 'REJ-006',
          order: 2,
        },
        {
          requirement: 'Estimativa de quantidades com justificativa',
          description:
            'Estimativas de quantidades acompanhadas de justificativa e historico de consumo.',
          type: ChecklistItemType.MANDATORY,
          category: ChecklistItemCategory.REQUIREMENTS,
          weight: 12,
          etpFieldsRequired: 'quantidadeEstimada,unidadeMedida',
          sectionRequired: 'requisitos',
          keywords: ['quantidade', 'unidade', 'consumo', 'historico'],
          fixSuggestion:
            'Detalhe as quantidades com base em historico de consumo ou levantamento de demanda, justificando os quantitativos.',
          legalReference: 'Art. 18, par. 1o, IV - Lei 14.133/2021',
          order: 3,
        },
        {
          requirement: 'Estimativa de precos com pesquisa de mercado',
          description:
            'Estimativa de valor com pesquisa em pelo menos 3 fontes, priorizando PNCP e Painel de Precos.',
          type: ChecklistItemType.MANDATORY,
          category: ChecklistItemCategory.PRICING,
          weight: 15,
          etpFieldsRequired: 'fontePesquisaPrecos,valorEstimado',
          sectionRequired: 'custos',
          keywords: ['preco', 'valor', 'cotacao', 'PNCP', 'painel'],
          minLength: 50,
          fixSuggestion:
            'Realize pesquisa de precos em minimo 3 fontes: PNCP, Painel de Precos, cotacoes de fornecedores. Utilize mediana.',
          legalReference: 'Art. 18, par. 1o, VI - Lei 14.133/2021; IN 65/2021',
          rejectionCode: 'REJ-003',
          order: 4,
        },
        {
          requirement: 'Prazo de garantia',
          description:
            'Especificacao do prazo de garantia minimo exigido para os materiais/bens.',
          type: ChecklistItemType.RECOMMENDED,
          category: ChecklistItemCategory.REQUIREMENTS,
          weight: 8,
          etpFieldsRequired: 'garantiaExigida',
          sectionRequired: 'requisitos',
          keywords: ['garantia', 'prazo', 'cobertura'],
          fixSuggestion:
            'Especifique prazo de garantia minimo (ex: 12 meses) e cobertura (defeitos de fabricacao, assistencia tecnica).',
          legalReference: 'Art. 40, Lei 14.133/2021',
          order: 5,
        },
        {
          requirement: 'Analise de riscos',
          description:
            'Identificacao dos riscos da aquisicao com medidas de mitigacao.',
          type: ChecklistItemType.RECOMMENDED,
          category: ChecklistItemCategory.RISKS,
          weight: 10,
          etpFieldsRequired: 'descricaoRiscos',
          sectionRequired: 'riscos',
          keywords: ['risco', 'mitigacao', 'contingencia'],
          fixSuggestion:
            'Identifique riscos de fornecimento (atrasos, desabastecimento) e de qualidade com medidas de mitigacao.',
          legalReference: 'Art. 18, par. 1o, XII - Lei 14.133/2021',
          rejectionCode: 'REJ-007',
          order: 6,
        },
        {
          requirement: 'Justificativa para parcelamento ou nao',
          description:
            'Justificativa explicita da decisao de parcelar ou nao a aquisicao.',
          type: ChecklistItemType.MANDATORY,
          category: ChecklistItemCategory.REQUIREMENTS,
          weight: 10,
          sectionRequired: 'requisitos',
          keywords: ['parcelamento', 'lote', 'item', 'agrupamento'],
          minLength: 40,
          fixSuggestion:
            'Justifique a decisao de agrupar ou dividir itens em lotes, considerando economia de escala e ampliacao da competitividade.',
          legalReference: 'Art. 18, par. 1o, VIII - Lei 14.133/2021',
          rejectionCode: 'REJ-010',
          order: 7,
        },
        {
          requirement: 'Posicionamento conclusivo sobre viabilidade',
          description:
            'Conclusao explicita sobre viabilidade e adequacao da aquisicao.',
          type: ChecklistItemType.MANDATORY,
          category: ChecklistItemCategory.CONCLUSION,
          weight: 15,
          sectionRequired: 'conclusao',
          keywords: ['viavel', 'viabilidade', 'conclusao', 'recomenda'],
          minLength: 60,
          fixSuggestion:
            'Inclua posicionamento conclusivo sobre viabilidade da aquisicao e recomendacao de prosseguimento.',
          legalReference: 'Art. 18, par. 1o, XIII - Lei 14.133/2021',
          rejectionCode: 'REJ-009',
          order: 8,
        },
      ],
    };
  }
}
