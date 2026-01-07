import { DataSource } from 'typeorm';
import { config } from 'dotenv';
import {
  EtpTemplate,
  EtpTemplateType,
  TemplatePrompt,
} from '../entities/etp-template.entity';

config();

/**
 * Seed script for ETP templates.
 * Creates 4 base templates for different procurement types:
 * - OBRAS: Engineering and construction projects
 * - TI: IT/Software acquisitions
 * - SERVICOS: Continuous services
 * - MATERIAIS: Materials and goods
 *
 * Issue #1236 - [TMPL-1161b] Seed 4 base templates
 * Part of Epic #1161 - Templates pré-configurados por tipo
 *
 * Usage:
 * - Development: npm run seed:templates
 * - Production: npm run seed:templates:prod
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

const TEMPLATES_DATA: TemplateData[] = [
  // Template OBRAS/Engenharia
  {
    name: 'Template para Obras de Engenharia',
    type: EtpTemplateType.OBRAS,
    description:
      'Template especializado para contratação de obras de engenharia, construção civil e reformas. ' +
      'Inclui campos específicos para ART/RRT, memorial descritivo, cronograma físico-financeiro e ' +
      'referências de preços SINAPI/SICRO.',
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
      'possíveis_impactos',
      'declaracao_viabilidade',
    ],
    prompts: [
      {
        sectionType: 'descricao_necessidade',
        systemPrompt:
          'Você é um especialista em licitações de obras públicas. ' +
          'Ajude a descrever a necessidade da contratação considerando aspectos técnicos de engenharia civil.',
        userPromptTemplate:
          'Descreva a necessidade de contratação para a obra: {{objeto}}. ' +
          'Considere o contexto institucional e a urgência da demanda.',
      },
      {
        sectionType: 'estimativa_custo',
        systemPrompt:
          'Você é um engenheiro especialista em orçamentos de obras públicas. ' +
          'Utilize referências SINAPI e SICRO para estimativas.',
        userPromptTemplate:
          'Elabore uma estimativa de custo para: {{objeto}}. ' +
          'Base de referência: {{fontePrecosReferencia}}. Quantidade: {{quantidade}}.',
      },
      {
        sectionType: 'levantamento_mercado',
        systemPrompt:
          'Você é um especialista em contratações públicas de obras. ' +
          'Analise o mercado de construção civil e empresas do setor.',
        userPromptTemplate:
          'Realize um levantamento de mercado para a contratação de: {{objeto}}. ' +
          'Considere empresas do ramo, preços praticados e alternativas técnicas.',
      },
    ],
    legalReferences: [
      'Lei nº 14.133/2021 (Nova Lei de Licitações)',
      'Decreto nº 10.024/2019 (Pregão Eletrônico)',
      'Lei nº 5.194/1966 (Regulamenta profissões de Engenharia)',
      'Resolução CONFEA nº 1.025/2009 (ART)',
      'IN SEGES/ME nº 73/2022 (Elaboração de ETP)',
      'Acórdão TCU 2.622/2013-Plenário (BDI referencial)',
    ],
    priceSourcesPreferred: ['SINAPI', 'SICRO', 'ORSE', 'PNCP'],
  },

  // Template TI/Software
  {
    name: 'Template para Contratações de TI',
    type: EtpTemplateType.TI,
    description:
      'Template especializado para contratações de tecnologia da informação, software e serviços de TI. ' +
      'Segue as diretrizes da IN SEGES/ME nº 94/2022 e inclui campos para SLA, metodologia e especificações técnicas.',
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
      'possíveis_impactos',
      'declaracao_viabilidade',
    ],
    prompts: [
      {
        sectionType: 'descricao_necessidade',
        systemPrompt:
          'Você é um especialista em contratações de TI para o setor público. ' +
          'Ajude a descrever necessidades tecnológicas considerando a IN 94/2022.',
        userPromptTemplate:
          'Descreva a necessidade de contratação para: {{objeto}}. ' +
          'Considere o alinhamento com o PDTIC e a transformação digital.',
      },
      {
        sectionType: 'especificacoes_tecnicas',
        systemPrompt:
          'Você é um arquiteto de soluções de TI com experiência em contratações públicas. ' +
          'Elabore especificações técnicas precisas e não restritivas.',
        userPromptTemplate:
          'Elabore as especificações técnicas para: {{objeto}}. ' +
          'Requisitos de segurança: {{requisitosSeguranca}}. ' +
          'Integrações necessárias: {{integracaoSistemas}}.',
      },
      {
        sectionType: 'nivel_servico',
        systemPrompt:
          'Você é um especialista em gestão de contratos de TI e SLA para o setor público. ' +
          'Defina métricas objetivas e mensuráveis conforme boas práticas de contratações públicas.',
        userPromptTemplate:
          'Defina os níveis de serviço (SLA) para: {{objeto}}. ' +
          'Considere disponibilidade, tempo de resposta e penalidades.',
      },
    ],
    legalReferences: [
      'Lei nº 14.133/2021 (Nova Lei de Licitações)',
      'IN SEGES/ME nº 94/2022 (Contratações de TIC)',
      'IN SGD/ME nº 1/2019 (Processo de Contratação de TI)',
      'Decreto nº 10.024/2019 (Pregão Eletrônico)',
      'Lei nº 13.709/2018 (LGPD)',
      'Decreto nº 9.637/2018 (Política Nacional de Segurança da Informação)',
    ],
    priceSourcesPreferred: ['PNCP', 'Banco de Preços', 'Painel de Preços'],
  },

  // Template Serviços Contínuos
  {
    name: 'Template para Serviços Contínuos',
    type: EtpTemplateType.SERVICOS,
    description:
      'Template especializado para contratação de serviços contínuos com dedicação exclusiva ' +
      'ou não de mão de obra. Inclui campos para produtividade, fiscalização e cálculo de postos de trabalho.',
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
      'possíveis_impactos',
      'declaracao_viabilidade',
    ],
    prompts: [
      {
        sectionType: 'descricao_necessidade',
        systemPrompt:
          'Você é um especialista em contratações de serviços contínuos para o setor público. ' +
          'Ajude a descrever a necessidade considerando a natureza continuada do serviço.',
        userPromptTemplate:
          'Descreva a necessidade de contratação para: {{objeto}}. ' +
          'Área de atuação: {{areaRequisitante}}. Frequência: {{frequenciaServico}}.',
      },
      {
        sectionType: 'produtividade',
        systemPrompt:
          'Você é um especialista em dimensionamento de serviços terceirizados para o setor público. ' +
          'Calcule a produtividade baseada em referências de mercado e IN SEGES para contratações públicas.',
        userPromptTemplate:
          'Calcule a produtividade para: {{objeto}}. ' +
          'Unidade de medida: {{unidadeMedida}}. ' +
          'Área/volume de atuação: {{areaAtuacao}}.',
      },
      {
        sectionType: 'estimativa_custo',
        systemPrompt:
          'Você é um especialista em planilhas de formação de preços para serviços terceirizados no setor público. ' +
          'Considere encargos sociais, insumos e BDI conforme IN SEGES para contratações públicas.',
        userPromptTemplate:
          'Elabore estimativa de custo para: {{objeto}}. ' +
          'Postos de trabalho: {{postosTrabalho}}. ' +
          'Convenção coletiva de referência: {{convencaoColetiva}}.',
      },
    ],
    legalReferences: [
      'Lei nº 14.133/2021 (Nova Lei de Licitações)',
      'IN SEGES/ME nº 5/2017 (Contratação de Serviços)',
      'Decreto nº 10.024/2019 (Pregão Eletrônico)',
      'IN SEGES/ME nº 73/2022 (Elaboração de ETP)',
      'Súmula TST nº 331 (Terceirização)',
      'Portaria SEGES nº 26.383/2023 (Planilha de Custos)',
    ],
    priceSourcesPreferred: ['PNCP', 'Convenções Coletivas', 'MTE'],
  },

  // Template Materiais/Bens
  {
    name: 'Template para Aquisição de Materiais e Bens',
    type: EtpTemplateType.MATERIAIS,
    description:
      'Template especializado para aquisição de materiais permanentes e de consumo, bens e equipamentos. ' +
      'Inclui campos para especificações técnicas, garantia, assistência técnica e referências CATMAT/CATSER.',
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
      'possíveis_impactos',
      'declaracao_viabilidade',
    ],
    prompts: [
      {
        sectionType: 'descricao_necessidade',
        systemPrompt:
          'Você é um especialista em contratações de materiais e bens para o setor público. ' +
          'Ajude a descrever a necessidade de forma objetiva e justificada.',
        userPromptTemplate:
          'Descreva a necessidade de aquisição para: {{objeto}}. ' +
          'Quantidade: {{quantidade}} {{unidadeFornecimento}}. ' +
          'Área requisitante: {{areaRequisitante}}.',
      },
      {
        sectionType: 'especificacoes_tecnicas',
        systemPrompt:
          'Você é um especialista em especificações técnicas de materiais e equipamentos para licitações públicas. ' +
          'Elabore descrições precisas, objetivas e não restritivas à competição conforme Lei 14.133.',
        userPromptTemplate:
          'Elabore as especificações técnicas para: {{objeto}}. ' +
          'Normas aplicáveis: {{normasAplicaveis}}. ' +
          'Garantia mínima desejada: {{garantiaMinima}}.',
      },
      {
        sectionType: 'levantamento_mercado',
        systemPrompt:
          'Você é um especialista em pesquisa de mercado para contratações públicas. ' +
          'Analise fornecedores, marcas e preços praticados no setor público.',
        userPromptTemplate:
          'Realize levantamento de mercado para: {{objeto}}. ' +
          'Quantidade: {{quantidade}}. ' +
          'Considere CATMAT/CATSER e compras recentes em portais públicos.',
      },
    ],
    legalReferences: [
      'Lei nº 14.133/2021 (Nova Lei de Licitações)',
      'Decreto nº 10.024/2019 (Pregão Eletrônico)',
      'Decreto nº 7.892/2013 (Sistema de Registro de Preços)',
      'IN SEGES/ME nº 73/2022 (Elaboração de ETP)',
      'Portaria SEGES nº 938/2022 (CATMAT/CATSER)',
      'Decreto nº 11.462/2023 (Compras Públicas Sustentáveis)',
    ],
    priceSourcesPreferred: [
      'PNCP',
      'Painel de Preços',
      'Banco de Preços',
      'Comprasnet',
    ],
  },
];

async function seedTemplates(): Promise<void> {
  console.log('Starting ETP templates seed script...');
  console.log(`Templates to seed: ${TEMPLATES_DATA.length}`);

  // Determine SSL configuration based on environment
  const useSSL =
    process.env.PGSSLMODE !== 'disable' &&
    process.env.NODE_ENV === 'production';

  const dataSource = new DataSource({
    type: 'postgres',
    url: process.env.DATABASE_URL,
    entities: [EtpTemplate],
    synchronize: false,
    logging: false,
    ssl: useSSL,
  });

  try {
    await dataSource.initialize();
    console.log('Database connection established');

    const templateRepository = dataSource.getRepository(EtpTemplate);

    const results = await Promise.all(
      TEMPLATES_DATA.map((templateData) =>
        createOrUpdateTemplate(templateRepository, templateData),
      ),
    );

    console.log('\n=== Seed Summary ===');
    results.forEach((result) => {
      console.log(`  ${result.name}: ${result.status}`);
    });

    const created = results.filter((r) => r.status.includes('Created')).length;
    const updated = results.filter((r) => r.status.includes('Updated')).length;
    const skipped = results.filter((r) => r.status.includes('Skipped')).length;

    console.log(
      `\nTotal: ${created} created, ${updated} updated, ${skipped} skipped`,
    );
    console.log('Seed completed successfully!');
  } catch (error) {
    console.error('Error during seed:', error);
    throw error;
  } finally {
    await dataSource.destroy();
    console.log('Database connection closed');
  }
}

interface SeedResult {
  name: string;
  status: string;
}

async function createOrUpdateTemplate(
  repository: ReturnType<DataSource['getRepository']>,
  data: TemplateData,
): Promise<SeedResult> {
  console.log(`\nProcessing template: ${data.name}`);

  // Check if template with same type exists
  const existingTemplate = await repository.findOne({
    where: { type: data.type },
  });

  if (existingTemplate) {
    // Update existing template
    Object.assign(existingTemplate, {
      ...data,
      isActive: true,
    });

    await repository.save(existingTemplate);
    console.log(`  Template updated (ID: ${existingTemplate.id})`);

    return {
      name: data.name,
      status: `Updated (ID: ${existingTemplate.id})`,
    };
  }

  // Create new template
  const newTemplate = repository.create({
    ...data,
    isActive: true,
  });

  const saved = await repository.save(newTemplate);
  console.log(`  Template created (ID: ${saved.id})`);

  return {
    name: data.name,
    status: `Created (ID: ${saved.id})`,
  };
}

// Export for testing
export { TEMPLATES_DATA, seedTemplates, createOrUpdateTemplate };

// Run seed only when executed directly (not when imported)
if (require.main === module) {
  seedTemplates()
    .then(() => {
      console.log('\nAll done!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\nFatal error:', error);
      process.exit(1);
    });
}
