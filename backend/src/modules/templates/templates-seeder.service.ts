import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  EtpTemplate,
  EtpTemplateType,
  TemplatePrompt,
} from '../../entities/etp-template.entity';

/**
 * Template data for seeding.
 */
interface TemplateData {
  name: string;
  type: EtpTemplateType;
  description: string;
  requiredFields: string[];
  optionalFields: string[];
  defaultSections: string[];
  prompts: TemplatePrompt[];
  legalReferences: string[];
  priceSourcesPreferred: string[];
}

/**
 * Auto-seed service for ETP templates.
 * Runs on application bootstrap and seeds templates if none exist.
 *
 * Issue #1343 - Templates de ETP nao disponiveis no wizard de criacao
 * Root cause: seed:templates:prod was never executed in Railway production.
 * Solution: Auto-seed templates on startup when database is empty.
 */
@Injectable()
export class TemplatesSeederService implements OnApplicationBootstrap {
  private readonly logger = new Logger(TemplatesSeederService.name);

  constructor(
    @InjectRepository(EtpTemplate)
    private readonly templateRepository: Repository<EtpTemplate>,
  ) {}

  /**
   * Called on application bootstrap.
   * Seeds templates if none exist in the database.
   */
  async onApplicationBootstrap(): Promise<void> {
    await this.seedTemplatesIfNeeded();
  }

  /**
   * Check if templates exist and seed if needed.
   */
  async seedTemplatesIfNeeded(): Promise<void> {
    try {
      const count = await this.templateRepository.count();

      if (count > 0) {
        this.logger.log(`Templates already seeded: ${count} templates found`);
        return;
      }

      this.logger.log('No templates found, starting auto-seed...');
      await this.seedAllTemplates();
      this.logger.log('Auto-seed completed successfully');
    } catch (error) {
      this.logger.error('Failed to auto-seed templates', error);
      // Don't throw - allow app to start even if seeding fails
    }
  }

  /**
   * Seed all default templates.
   */
  private async seedAllTemplates(): Promise<void> {
    const templates = this.getDefaultTemplates();

    for (const templateData of templates) {
      await this.createTemplate(templateData);
    }
  }

  /**
   * Create a single template.
   */
  private async createTemplate(data: TemplateData): Promise<void> {
    const existing = await this.templateRepository.findOne({
      where: { type: data.type },
    });

    if (existing) {
      this.logger.debug(`Template ${data.type} already exists, skipping`);
      return;
    }

    const template = this.templateRepository.create({
      ...data,
      isActive: true,
    });

    await this.templateRepository.save(template);
    this.logger.log(`Created template: ${data.name}`);
  }

  /**
   * Returns the default templates data.
   * Same data as seed-templates.ts for consistency.
   */
  private getDefaultTemplates(): TemplateData[] {
    return [
      // Template OBRAS/Engenharia
      {
        name: 'Template para Obras de Engenharia',
        type: EtpTemplateType.OBRAS,
        description:
          'Template especializado para contratacao de obras de engenharia, construcao civil e reformas. ' +
          'Inclui campos especificos para ART/RRT, memorial descritivo, cronograma fisico-financeiro e ' +
          'referencias de precos SINAPI/SICRO.',
        requiredFields: [
          'objeto',
          'justificativa',
          'descricaoNecessidade',
          'requisitosContratacao',
          'memorialDescritivo',
          'cronogramaFisicoFinanceiro',
          'estimativaCusto',
          'fontePrecosReferencia',
        ],
        optionalFields: [
          'artRrt',
          'projetoBasico',
          'projetoExecutivo',
          'estudoViabilidade',
          'licencasAmbientais',
          'bdiReferencia',
          'encargosSOciais',
          'planilhaOrcamentaria',
        ],
        defaultSections: [
          'descricao_necessidade',
          'area_requisitante',
          'estimativas_quantidades',
          'levantamento_mercado',
          'descricao_solucao',
          'estimativa_custo',
          'justificativa_parcelamento',
          'contratacoes_correlatas',
          'alinhamento_planejamento',
          'resultados_esperados',
          'providencias_previas',
          'possiveis_impactos',
          'declaracao_viabilidade',
        ],
        prompts: [
          {
            sectionType: 'descricao_necessidade',
            systemPrompt:
              'Voce e um especialista em licitacoes de obras publicas. ' +
              'Ajude a descrever a necessidade da contratacao considerando aspectos tecnicos de engenharia civil.',
            userPromptTemplate:
              'Descreva a necessidade de contratacao para a obra: {{objeto}}. ' +
              'Considere o contexto institucional e a urgencia da demanda.',
          },
          {
            sectionType: 'estimativa_custo',
            systemPrompt:
              'Voce e um engenheiro especialista em orcamentos de obras publicas. ' +
              'Utilize referencias SINAPI e SICRO para estimativas.',
            userPromptTemplate:
              'Elabore uma estimativa de custo para: {{objeto}}. ' +
              'Base de referencia: {{fontePrecosReferencia}}. Quantidade: {{quantidade}}.',
          },
          {
            sectionType: 'levantamento_mercado',
            systemPrompt:
              'Voce e um especialista em contratacoes publicas de obras. ' +
              'Analise o mercado de construcao civil e empresas do setor.',
            userPromptTemplate:
              'Realize um levantamento de mercado para a contratacao de: {{objeto}}. ' +
              'Considere empresas do ramo, precos praticados e alternativas tecnicas.',
          },
        ],
        legalReferences: [
          'Lei n 14.133/2021 (Nova Lei de Licitacoes)',
          'Decreto n 10.024/2019 (Pregao Eletronico)',
          'Lei n 5.194/1966 (Regulamenta profissoes de Engenharia)',
          'Resolucao CONFEA n 1.025/2009 (ART)',
          'IN SEGES/ME n 73/2022 (Elaboracao de ETP)',
          'Acordao TCU 2.622/2013-Plenario (BDI referencial)',
        ],
        priceSourcesPreferred: ['SINAPI', 'SICRO', 'ORSE', 'PNCP'],
      },

      // Template TI/Software
      {
        name: 'Template para Contratacoes de TI',
        type: EtpTemplateType.TI,
        description:
          'Template especializado para contratacoes de tecnologia da informacao, software e servicos de TI. ' +
          'Segue as diretrizes da IN SEGES/ME n 94/2022 e inclui campos para SLA, metodologia e especificacoes tecnicas.',
        requiredFields: [
          'objeto',
          'justificativa',
          'descricaoNecessidade',
          'especificacoesTecnicas',
          'nivelServico',
          'metodologiaTrabalho',
          'requisitosSeguranca',
          'estimativaCusto',
        ],
        optionalFields: [
          'slaMetricas',
          'arquiteturaTecnica',
          'integracaoSistemas',
          'capacitacaoUsuarios',
          'suporteTecnico',
          'garantiaSoftware',
          'propriedadeIntelectual',
          'lgpdConformidade',
        ],
        defaultSections: [
          'descricao_necessidade',
          'area_requisitante',
          'estimativas_quantidades',
          'levantamento_mercado',
          'descricao_solucao',
          'estimativa_custo',
          'justificativa_parcelamento',
          'contratacoes_correlatas',
          'alinhamento_planejamento',
          'resultados_esperados',
          'providencias_previas',
          'possiveis_impactos',
          'declaracao_viabilidade',
        ],
        prompts: [
          {
            sectionType: 'descricao_necessidade',
            systemPrompt:
              'Voce e um especialista em contratacoes de TI para o setor publico. ' +
              'Ajude a descrever necessidades tecnologicas considerando a IN 94/2022.',
            userPromptTemplate:
              'Descreva a necessidade de contratacao para: {{objeto}}. ' +
              'Considere o alinhamento com o PDTIC e a transformacao digital.',
          },
          {
            sectionType: 'especificacoes_tecnicas',
            systemPrompt:
              'Voce e um arquiteto de solucoes de TI com experiencia em contratacoes publicas. ' +
              'Elabore especificacoes tecnicas precisas e nao restritivas.',
            userPromptTemplate:
              'Elabore as especificacoes tecnicas para: {{objeto}}. ' +
              'Requisitos de seguranca: {{requisitosSeguranca}}. ' +
              'Integracoes necessarias: {{integracaoSistemas}}.',
          },
          {
            sectionType: 'nivel_servico',
            systemPrompt:
              'Voce e um especialista em gestao de contratos de TI e SLA para o setor publico. ' +
              'Defina metricas objetivas e mensuraveis conforme boas praticas de contratacoes publicas.',
            userPromptTemplate:
              'Defina os niveis de servico (SLA) para: {{objeto}}. ' +
              'Considere disponibilidade, tempo de resposta e penalidades.',
          },
        ],
        legalReferences: [
          'Lei n 14.133/2021 (Nova Lei de Licitacoes)',
          'IN SEGES/ME n 94/2022 (Contratacoes de TIC)',
          'IN SGD/ME n 1/2019 (Processo de Contratacao de TI)',
          'Decreto n 10.024/2019 (Pregao Eletronico)',
          'Lei n 13.709/2018 (LGPD)',
          'Decreto n 9.637/2018 (Politica Nacional de Seguranca da Informacao)',
        ],
        priceSourcesPreferred: ['PNCP', 'Banco de Precos', 'Painel de Precos'],
      },

      // Template Servicos Continuos
      {
        name: 'Template para Servicos Continuos',
        type: EtpTemplateType.SERVICOS,
        description:
          'Template especializado para contratacao de servicos continuos com dedicacao exclusiva ' +
          'ou nao de mao de obra. Inclui campos para produtividade, fiscalizacao e calculo de postos de trabalho.',
        requiredFields: [
          'objeto',
          'justificativa',
          'descricaoNecessidade',
          'produtividade',
          'unidadeMedida',
          'frequenciaServico',
          'fiscalizacao',
          'estimativaCusto',
        ],
        optionalFields: [
          'postosTrabalho',
          'materiaisEquipamentos',
          'uniformesEPI',
          'insumos',
          'convencaoColetiva',
          'qualificacaoTecnica',
          'transicaoContratual',
          'repactuacao',
        ],
        defaultSections: [
          'descricao_necessidade',
          'area_requisitante',
          'estimativas_quantidades',
          'levantamento_mercado',
          'descricao_solucao',
          'estimativa_custo',
          'justificativa_parcelamento',
          'contratacoes_correlatas',
          'alinhamento_planejamento',
          'resultados_esperados',
          'providencias_previas',
          'possiveis_impactos',
          'declaracao_viabilidade',
        ],
        prompts: [
          {
            sectionType: 'descricao_necessidade',
            systemPrompt:
              'Voce e um especialista em contratacoes de servicos continuos para o setor publico. ' +
              'Ajude a descrever a necessidade considerando a natureza continuada do servico.',
            userPromptTemplate:
              'Descreva a necessidade de contratacao para: {{objeto}}. ' +
              'Area de atuacao: {{areaRequisitante}}. Frequencia: {{frequenciaServico}}.',
          },
          {
            sectionType: 'produtividade',
            systemPrompt:
              'Voce e um especialista em dimensionamento de servicos terceirizados para o setor publico. ' +
              'Calcule a produtividade baseada em referencias de mercado e IN SEGES para contratacoes publicas.',
            userPromptTemplate:
              'Calcule a produtividade para: {{objeto}}. ' +
              'Unidade de medida: {{unidadeMedida}}. ' +
              'Area/volume de atuacao: {{areaAtuacao}}.',
          },
          {
            sectionType: 'estimativa_custo',
            systemPrompt:
              'Voce e um especialista em planilhas de formacao de precos para servicos terceirizados no setor publico. ' +
              'Considere encargos sociais, insumos e BDI conforme IN SEGES para contratacoes publicas.',
            userPromptTemplate:
              'Elabore estimativa de custo para: {{objeto}}. ' +
              'Postos de trabalho: {{postosTrabalho}}. ' +
              'Convencao coletiva de referencia: {{convencaoColetiva}}.',
          },
        ],
        legalReferences: [
          'Lei n 14.133/2021 (Nova Lei de Licitacoes)',
          'IN SEGES/ME n 5/2017 (Contratacao de Servicos)',
          'Decreto n 10.024/2019 (Pregao Eletronico)',
          'IN SEGES/ME n 73/2022 (Elaboracao de ETP)',
          'Sumula TST n 331 (Terceirizacao)',
          'Portaria SEGES n 26.383/2023 (Planilha de Custos)',
        ],
        priceSourcesPreferred: ['PNCP', 'Convencoes Coletivas', 'MTE'],
      },

      // Template Materiais/Bens
      {
        name: 'Template para Aquisicao de Materiais e Bens',
        type: EtpTemplateType.MATERIAIS,
        description:
          'Template especializado para aquisicao de materiais permanentes e de consumo, bens e equipamentos. ' +
          'Inclui campos para especificacoes tecnicas, garantia, assistencia tecnica e referencias CATMAT/CATSER.',
        requiredFields: [
          'objeto',
          'justificativa',
          'descricaoNecessidade',
          'especificacoesTecnicas',
          'quantidade',
          'unidadeFornecimento',
          'prazoEntrega',
          'estimativaCusto',
        ],
        optionalFields: [
          'garantiaMinima',
          'assistenciaTecnica',
          'catalogo',
          'amostraTeste',
          'laudosTecnicos',
          'normasAPlicareis',
          'embalagensTransporte',
          'instalacaoTreinamento',
        ],
        defaultSections: [
          'descricao_necessidade',
          'area_requisitante',
          'estimativas_quantidades',
          'levantamento_mercado',
          'descricao_solucao',
          'estimativa_custo',
          'justificativa_parcelamento',
          'contratacoes_correlatas',
          'alinhamento_planejamento',
          'resultados_esperados',
          'providencias_previas',
          'possiveis_impactos',
          'declaracao_viabilidade',
        ],
        prompts: [
          {
            sectionType: 'descricao_necessidade',
            systemPrompt:
              'Voce e um especialista em contratacoes de materiais e bens para o setor publico. ' +
              'Ajude a descrever a necessidade de forma objetiva e justificada.',
            userPromptTemplate:
              'Descreva a necessidade de aquisicao para: {{objeto}}. ' +
              'Quantidade: {{quantidade}} {{unidadeFornecimento}}. ' +
              'Area requisitante: {{areaRequisitante}}.',
          },
          {
            sectionType: 'especificacoes_tecnicas',
            systemPrompt:
              'Voce e um especialista em especificacoes tecnicas de materiais e equipamentos para licitacoes publicas. ' +
              'Elabore descricoes precisas, objetivas e nao restritivas a competicao conforme Lei 14.133.',
            userPromptTemplate:
              'Elabore as especificacoes tecnicas para: {{objeto}}. ' +
              'Normas aplicaveis: {{normasAplicaveis}}. ' +
              'Garantia minima desejada: {{garantiaMinima}}.',
          },
          {
            sectionType: 'levantamento_mercado',
            systemPrompt:
              'Voce e um especialista em pesquisa de mercado para contratacoes publicas. ' +
              'Analise fornecedores, marcas e precos praticados no setor publico.',
            userPromptTemplate:
              'Realize levantamento de mercado para: {{objeto}}. ' +
              'Quantidade: {{quantidade}}. ' +
              'Considere CATMAT/CATSER e compras recentes em portais publicos.',
          },
        ],
        legalReferences: [
          'Lei n 14.133/2021 (Nova Lei de Licitacoes)',
          'Decreto n 10.024/2019 (Pregao Eletronico)',
          'Decreto n 7.892/2013 (Sistema de Registro de Precos)',
          'IN SEGES/ME n 73/2022 (Elaboracao de ETP)',
          'Portaria SEGES n 938/2022 (CATMAT/CATSER)',
          'Decreto n 11.462/2023 (Compras Publicas Sustentaveis)',
        ],
        priceSourcesPreferred: [
          'PNCP',
          'Painel de Precos',
          'Banco de Precos',
          'Comprasnet',
        ],
      },
    ];
  }
}
