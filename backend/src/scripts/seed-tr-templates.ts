import { DataSource } from 'typeorm';
import { config } from 'dotenv';
import {
  TermoReferenciaTemplate,
  TrTemplateType,
  TrTemplatePrompt,
  TrTemplateField,
} from '../entities/termo-referencia-template.entity';

config();

/**
 * Seed script for Termo de Referencia templates.
 * Creates 4 base templates for different procurement types:
 * - OBRAS: Engineering and construction projects
 * - TI: IT/Software acquisitions
 * - SERVICOS: Continuous services
 * - MATERIAIS: Materials and goods
 *
 * Issue #1250 - [TR-c] Criar templates de TR por categoria
 * Parent: #1247 - [TR] Modulo de Termo de Referencia - EPIC
 *
 * Usage:
 * - Development: npm run seed:tr-templates
 * - Production: npm run seed:tr-templates:prod
 */

interface TrTemplateData {
  name: string;
  type: TrTemplateType;
  description: string;
  specificFields: TrTemplateField[];
  defaultSections: string[];
  prompts: TrTemplatePrompt[];
  legalReferences: string[];
  defaultFundamentacaoLegal: string;
  defaultModeloExecucao: string;
  defaultModeloGestao: string;
  defaultCriteriosSelecao: string;
  defaultObrigacoesContratante: string;
  defaultObrigacoesContratada: string;
  defaultSancoesPenalidades: string;
}

const TR_TEMPLATES_DATA: TrTemplateData[] = [
  // Template OBRAS/Engenharia
  {
    name: 'Template de TR para Obras de Engenharia',
    type: TrTemplateType.OBRAS,
    description:
      'Template especializado para Termos de Referencia de obras de engenharia, ' +
      'construcao civil e reformas. Inclui campos especificos para ART/RRT, memorial descritivo, ' +
      'cronograma fisico-financeiro e referencias de precos SINAPI/SICRO.',
    specificFields: [
      {
        name: 'artRrt',
        label: 'ART/RRT',
        type: 'text',
        required: true,
        placeholder: 'Numero da Anotacao de Responsabilidade Tecnica',
      },
      {
        name: 'memorialDescritivo',
        label: 'Memorial Descritivo',
        type: 'textarea',
        required: true,
        placeholder: 'Descricao detalhada da obra conforme projeto basico',
      },
      {
        name: 'cronogramaFisicoFinanceiro',
        label: 'Cronograma Fisico-Financeiro',
        type: 'textarea',
        required: true,
        placeholder: 'Etapas, prazos e desembolsos previstos',
      },
      {
        name: 'bdiReferencia',
        label: 'BDI de Referencia (%)',
        type: 'number',
        required: true,
        placeholder: 'Percentual de BDI conforme TCU',
        defaultValue: 25,
      },
      {
        name: 'fontePrecosReferencia',
        label: 'Fonte de Precos',
        type: 'select',
        required: true,
        options: ['SINAPI', 'SICRO', 'ORSE', 'Composicao Propria'],
        defaultValue: 'SINAPI',
      },
      {
        name: 'licencasNecessarias',
        label: 'Licencas Necessarias',
        type: 'textarea',
        required: false,
        placeholder: 'Licencas ambientais, alvaras, etc.',
      },
    ],
    defaultSections: [
      'objeto',
      'fundamentacao_legal',
      'descricao_solucao',
      'memorial_descritivo',
      'cronograma_execucao',
      'requisitos_contratacao',
      'modelo_execucao',
      'modelo_gestao',
      'criterios_selecao',
      'valor_estimado',
      'dotacao_orcamentaria',
      'obrigacoes_contratante',
      'obrigacoes_contratada',
      'sancoes_penalidades',
      'local_execucao',
      'garantia_contratual',
    ],
    prompts: [
      {
        sectionType: 'memorial_descritivo',
        systemPrompt:
          'Voce e um engenheiro civil especialista em elaboracao de Termos de Referencia para obras publicas. ' +
          'Elabore memoriais descritivos tecnicos conforme as normas da ABNT e legislacao vigente.',
        userPromptTemplate:
          'Elabore o memorial descritivo para a obra: {{objeto}}. ' +
          'Considere o projeto basico e as especificacoes tecnicas fornecidas. ' +
          'Inclua materiais, tecnicas construtivas e normas aplicaveis.',
      },
      {
        sectionType: 'cronograma_execucao',
        systemPrompt:
          'Voce e um especialista em planejamento de obras publicas. ' +
          'Elabore cronogramas fisico-financeiros detalhados e realistas.',
        userPromptTemplate:
          'Elabore o cronograma fisico-financeiro para: {{objeto}}. ' +
          'Prazo total: {{prazoVigencia}} dias. ' +
          'Valor estimado: R$ {{valorEstimado}}. ' +
          'Divida em etapas com marcos de medicao.',
      },
      {
        sectionType: 'requisitos_contratacao',
        systemPrompt:
          'Voce e um especialista em licitacoes de obras publicas. ' +
          'Defina requisitos de qualificacao tecnica conforme Lei 14.133/2021.',
        userPromptTemplate:
          'Defina os requisitos de qualificacao tecnica e economico-financeira para: {{objeto}}. ' +
          'Considere a complexidade da obra e o valor estimado de R$ {{valorEstimado}}.',
      },
    ],
    legalReferences: [
      'Lei n 14.133/2021 (Nova Lei de Licitacoes)',
      'Decreto n 10.024/2019 (Pregao Eletronico)',
      'Lei n 5.194/1966 (Regulamenta profissoes de Engenharia)',
      'Resolucao CONFEA n 1.025/2009 (ART)',
      'IN SEGES/ME n 73/2022 (Elaboracao de ETP)',
      'Acordao TCU 2.622/2013-Plenario (BDI referencial)',
      'NBR 15575 (Desempenho de edificacoes)',
    ],
    defaultFundamentacaoLegal:
      'Lei 14.133/2021 (Nova Lei de Licitacoes e Contratos Administrativos); ' +
      'IN SEGES/ME n 5/2017 (Execucao de Obras e Servicos de Engenharia); ' +
      'Decreto n 7.983/2013 (Regras para elaboracao de orcamento de obras); ' +
      'Resolucao CONFEA n 1.025/2009 (ART).',
    defaultModeloExecucao:
      'Execucao indireta, sob regime de empreitada por preco unitario, conforme projeto basico aprovado. ' +
      'A contratada devera seguir rigorosamente as especificacoes tecnicas do memorial descritivo, ' +
      'cronograma fisico-financeiro e planilha orcamentaria anexos. ' +
      'As medicoes serao realizadas mensalmente, mediante apresentacao de boletim de medicao (BM) ' +
      'acompanhado de relatorio fotografico e ART/RRT de execucao.',
    defaultModeloGestao:
      'O contrato sera gerido por engenheiro designado pela Administracao, com atribuicoes de:\n' +
      'a) Acompanhar e fiscalizar a execucao conforme projeto e especificacoes;\n' +
      'b) Realizar medicoes mensais e atestar os servicos executados;\n' +
      'c) Verificar conformidade com normas tecnicas ABNT aplicaveis;\n' +
      'd) Aprovar materiais e equipamentos antes da aplicacao;\n' +
      'e) Emitir ordens de servico e de paralisacao quando necessario;\n' +
      'f) Manter diario de obra atualizado.',
    defaultCriteriosSelecao:
      'Menor preco global, conforme art. 33 da Lei 14.133/2021. ' +
      'Sera considerado vencedor o licitante que apresentar a proposta mais vantajosa, ' +
      'com preco igual ou inferior ao orcamento estimado pela Administracao. ' +
      'O julgamento sera por preco global, considerando todos os itens da planilha orcamentaria.',
    defaultObrigacoesContratante:
      'a) Fornecer o projeto executivo completo e aprovado;\n' +
      'b) Disponibilizar acesso ao local da obra;\n' +
      'c) Realizar as medicoes e pagamentos conforme cronograma;\n' +
      'd) Designar engenheiro fiscal para acompanhamento;\n' +
      'e) Comunicar alteracoes de projeto com antecedencia;\n' +
      'f) Aprovar materiais e etapas conforme especificacoes.',
    defaultObrigacoesContratada:
      'a) Executar a obra conforme projeto, especificacoes e normas tecnicas;\n' +
      'b) Fornecer ART/RRT de execucao e dos profissionais envolvidos;\n' +
      'c) Manter engenheiro responsavel tecnico no canteiro;\n' +
      'd) Cumprir cronograma fisico-financeiro aprovado;\n' +
      'e) Apresentar ensaios e laudos tecnicos quando solicitado;\n' +
      'f) Garantir a qualidade dos materiais aplicados;\n' +
      'g) Manter o canteiro organizado e em conformidade com normas de seguranca;\n' +
      'h) Reparar defeitos identificados no periodo de garantia.',
    defaultSancoesPenalidades:
      'Conforme art. 155 da Lei 14.133/2021, a contratada estara sujeita a:\n' +
      'a) Advertencia, por escrito, para faltas leves;\n' +
      'b) Multa moratoria de 0,3% por dia de atraso, limitada a 10% do valor do contrato;\n' +
      'c) Multa compensatoria de 10% a 30% sobre o valor do contrato por inexecucao;\n' +
      'd) Impedimento de licitar e contratar por ate 3 anos;\n' +
      'e) Declaracao de inidoneidade para fraude comprovada.\n\n' +
      'A aplicacao das sancoes nao exclui a responsabilidade civil por danos causados.',
  },

  // Template TI/Software
  {
    name: 'Template de TR para Contratacoes de TI',
    type: TrTemplateType.TI,
    description:
      'Template especializado para Termos de Referencia de contratacoes de tecnologia da informacao, ' +
      'software e servicos de TI. Segue as diretrizes da IN SEGES/ME n 94/2022 e inclui campos para ' +
      'SLA, metodologia de desenvolvimento e especificacoes de seguranca.',
    specificFields: [
      {
        name: 'nivelServico',
        label: 'Nivel de Servico (SLA)',
        type: 'textarea',
        required: true,
        placeholder:
          'Definir metricas de disponibilidade, tempo de resposta, etc.',
      },
      {
        name: 'metodologiaTrabalho',
        label: 'Metodologia de Trabalho',
        type: 'select',
        required: true,
        options: ['Agile/Scrum', 'Waterfall', 'DevOps', 'ITIL', 'Hibrida'],
      },
      {
        name: 'requisitosSeguranca',
        label: 'Requisitos de Seguranca',
        type: 'textarea',
        required: true,
        placeholder: 'Conformidade LGPD, criptografia, controle de acesso',
      },
      {
        name: 'integracaoSistemas',
        label: 'Integracoes Necessarias',
        type: 'textarea',
        required: false,
        placeholder: 'Sistemas que deverao ser integrados',
      },
      {
        name: 'capacitacaoUsuarios',
        label: 'Capacitacao de Usuarios',
        type: 'textarea',
        required: false,
        placeholder: 'Treinamentos necessarios',
      },
      {
        name: 'garantiaSoftware',
        label: 'Garantia e Suporte',
        type: 'text',
        required: true,
        placeholder: 'Periodo de garantia e suporte tecnico',
        defaultValue: '12 meses',
      },
    ],
    defaultSections: [
      'objeto',
      'fundamentacao_legal',
      'descricao_solucao',
      'especificacoes_tecnicas',
      'nivel_servico',
      'requisitos_contratacao',
      'modelo_execucao',
      'modelo_gestao',
      'criterios_selecao',
      'valor_estimado',
      'dotacao_orcamentaria',
      'obrigacoes_contratante',
      'obrigacoes_contratada',
      'sancoes_penalidades',
      'seguranca_informacao',
      'propriedade_intelectual',
    ],
    prompts: [
      {
        sectionType: 'especificacoes_tecnicas',
        systemPrompt:
          'Voce e um arquiteto de solucoes de TI especialista em contratacoes publicas. ' +
          'Elabore especificacoes tecnicas precisas e nao restritivas a competicao.',
        userPromptTemplate:
          'Elabore as especificacoes tecnicas para: {{objeto}}. ' +
          'Requisitos de seguranca: {{requisitosSeguranca}}. ' +
          'Integracoes necessarias: {{integracaoSistemas}}.',
      },
      {
        sectionType: 'nivel_servico',
        systemPrompt:
          'Voce e um especialista em gestao de contratos de TI e SLA para o setor publico. ' +
          'Defina metricas objetivas e mensuraveis conforme IN 94/2022.',
        userPromptTemplate:
          'Defina os niveis de servico (SLA) para: {{objeto}}. ' +
          'Considere disponibilidade minima, tempo de resposta para incidentes e penalidades por descumprimento.',
      },
      {
        sectionType: 'seguranca_informacao',
        systemPrompt:
          'Voce e um especialista em seguranca da informacao com conhecimento em LGPD e normas ISO 27001. ' +
          'Defina requisitos de seguranca para contratacoes de TI no setor publico.',
        userPromptTemplate:
          'Elabore os requisitos de seguranca da informacao para: {{objeto}}. ' +
          'Considere conformidade LGPD, classificacao de dados e controles de acesso.',
      },
    ],
    legalReferences: [
      'Lei n 14.133/2021 (Nova Lei de Licitacoes)',
      'IN SEGES/ME n 94/2022 (Contratacoes de TIC)',
      'IN SGD/ME n 1/2019 (Processo de Contratacao de TI)',
      'Decreto n 10.024/2019 (Pregao Eletronico)',
      'Lei n 13.709/2018 (LGPD)',
      'Decreto n 9.637/2018 (Politica Nacional de Seguranca da Informacao)',
      'ISO/IEC 27001 (Gestao de Seguranca da Informacao)',
    ],
    defaultFundamentacaoLegal:
      'Lei 14.133/2021 (Nova Lei de Licitacoes e Contratos Administrativos); ' +
      'IN SEGES/ME n 94/2022 (Contratacoes de Solucoes de TIC); ' +
      'IN SGD/ME n 1/2019 (Processo de Contratacao de TI); ' +
      'Lei n 13.709/2018 (Lei Geral de Protecao de Dados).',
    defaultModeloExecucao:
      'Execucao indireta, sob regime de empreitada por preco global, com entregas parciais conforme cronograma acordado. ' +
      'A metodologia de trabalho sera {{metodologiaTrabalho}}, com sprints/entregas quinzenais ou mensais. ' +
      'As entregas serao validadas mediante teste de aceite pelo requisitante antes da homologacao. ' +
      'O pagamento sera realizado por etapa entregue e aceita.',
    defaultModeloGestao:
      'O contrato sera gerido por equipe tecnica designada, composta por:\n' +
      'a) Gestor do Contrato: responsavel pela administracao do contrato;\n' +
      'b) Fiscal Tecnico: responsavel pela validacao tecnica das entregas;\n' +
      'c) Fiscal Requisitante: representante da area de negocio.\n\n' +
      'Reunioes de acompanhamento serao realizadas semanalmente, com registro em ata. ' +
      'A medicao dos niveis de servico sera realizada mensalmente atraves de ferramenta de monitoramento.',
    defaultCriteriosSelecao:
      'Menor preco global, conforme art. 33 da Lei 14.133/2021. ' +
      'Sera exigida prova de conceito (POC) dos 3 primeiros colocados, como criterio de aceitabilidade. ' +
      'A prova de conceito devera demonstrar as funcionalidades essenciais do sistema.',
    defaultObrigacoesContratante:
      'a) Fornecer acesso aos sistemas e informacoes necessarias a execucao;\n' +
      'b) Disponibilizar ambiente de homologacao para testes;\n' +
      'c) Designar equipe tecnica para validacao das entregas;\n' +
      'd) Comunicar requisitos e alteracoes com antecedencia;\n' +
      'e) Efetuar os pagamentos conforme cronograma de entregas.',
    defaultObrigacoesContratada:
      'a) Executar os servicos conforme especificacoes tecnicas;\n' +
      'b) Cumprir os niveis de servico acordados (SLA);\n' +
      'c) Manter sigilo sobre dados e informacoes acessados;\n' +
      'd) Garantir conformidade com a LGPD;\n' +
      'e) Fornecer documentacao tecnica completa;\n' +
      'f) Realizar transferencia de conhecimento ao final do contrato;\n' +
      'g) Disponibilizar suporte tecnico durante a vigencia da garantia;\n' +
      'h) Manter equipe tecnica qualificada durante toda a execucao.',
    defaultSancoesPenalidades:
      'Conforme art. 155 da Lei 14.133/2021 e IN 94/2022:\n' +
      'a) Advertencia, por escrito, para faltas leves;\n' +
      'b) Multa moratoria de 0,5% por dia de atraso, limitada a 15% do valor do contrato;\n' +
      'c) Glosa de 2% a 10% do valor mensal por descumprimento de SLA:\n' +
      '   - Disponibilidade abaixo de 99%: glosa de 2%\n' +
      '   - Disponibilidade abaixo de 95%: glosa de 5%\n' +
      '   - Disponibilidade abaixo de 90%: glosa de 10%\n' +
      'd) Impedimento de licitar e contratar por ate 3 anos;\n' +
      'e) Declaracao de inidoneidade para fraude ou vazamento de dados.',
  },

  // Template Servicos Continuos
  {
    name: 'Template de TR para Servicos Continuos',
    type: TrTemplateType.SERVICOS,
    description:
      'Template especializado para Termos de Referencia de servicos continuos com ou sem dedicacao ' +
      'exclusiva de mao de obra. Inclui campos para produtividade, calculo de postos de trabalho, ' +
      'fiscalizacao e referencias de convencoes coletivas.',
    specificFields: [
      {
        name: 'produtividade',
        label: 'Produtividade de Referencia',
        type: 'textarea',
        required: true,
        placeholder: 'Metricas de produtividade por categoria de servico',
      },
      {
        name: 'postosTrabalho',
        label: 'Quantidade de Postos',
        type: 'number',
        required: true,
        placeholder: 'Numero de postos de trabalho',
      },
      {
        name: 'frequenciaServico',
        label: 'Frequencia do Servico',
        type: 'select',
        required: true,
        options: ['Diario', 'Semanal', 'Quinzenal', 'Mensal', 'Sob Demanda'],
      },
      {
        name: 'convencaoColetiva',
        label: 'Convencao Coletiva de Referencia',
        type: 'text',
        required: true,
        placeholder: 'Sindicato e data-base',
      },
      {
        name: 'materiaisEquipamentos',
        label: 'Materiais e Equipamentos',
        type: 'textarea',
        required: false,
        placeholder: 'Materiais e equipamentos a serem fornecidos',
      },
      {
        name: 'uniformesEPI',
        label: 'Uniformes e EPIs',
        type: 'textarea',
        required: false,
        placeholder: 'Descricao dos uniformes e EPIs exigidos',
      },
    ],
    defaultSections: [
      'objeto',
      'fundamentacao_legal',
      'descricao_solucao',
      'produtividade',
      'dimensionamento',
      'requisitos_contratacao',
      'modelo_execucao',
      'modelo_gestao',
      'criterios_selecao',
      'valor_estimado',
      'dotacao_orcamentaria',
      'obrigacoes_contratante',
      'obrigacoes_contratada',
      'sancoes_penalidades',
      'transicao_contratual',
      'repactuacao',
    ],
    prompts: [
      {
        sectionType: 'produtividade',
        systemPrompt:
          'Voce e um especialista em dimensionamento de servicos terceirizados para o setor publico. ' +
          'Calcule a produtividade baseada em referencias de mercado e IN SEGES.',
        userPromptTemplate:
          'Calcule a produtividade de referencia para: {{objeto}}. ' +
          'Area de atuacao: {{areaAtuacao}} m2. ' +
          'Frequencia: {{frequenciaServico}}.',
      },
      {
        sectionType: 'dimensionamento',
        systemPrompt:
          'Voce e um especialista em planilhas de custos de servicos terceirizados para o setor publico. ' +
          'Dimensione a equipe necessaria para contratacoes conforme produtividade e area de atuacao.',
        userPromptTemplate:
          'Dimensione a equipe para: {{objeto}}. ' +
          'Produtividade de referencia: {{produtividade}}. ' +
          'Considere turnos, folgas e substituicoes.',
      },
      {
        sectionType: 'repactuacao',
        systemPrompt:
          'Voce e um especialista em reequilibrio economico-financeiro de contratos publicos. ' +
          'Defina clausulas de repactuacao conforme legislacao vigente.',
        userPromptTemplate:
          'Elabore clausulas de repactuacao para contrato de: {{objeto}}. ' +
          'Convencao coletiva: {{convencaoColetiva}}. ' +
          'Valor estimado mensal: R$ {{valorMensal}}.',
      },
    ],
    legalReferences: [
      'Lei n 14.133/2021 (Nova Lei de Licitacoes)',
      'IN SEGES/ME n 5/2017 (Contratacao de Servicos)',
      'Decreto n 10.024/2019 (Pregao Eletronico)',
      'IN SEGES/ME n 73/2022 (Elaboracao de ETP)',
      'Sumula TST n 331 (Terceirizacao)',
      'Portaria SEGES n 26.383/2023 (Planilha de Custos)',
      'IN SLTI n 2/2008 (Contratacao de Servicos)',
    ],
    defaultFundamentacaoLegal:
      'Lei 14.133/2021 (Nova Lei de Licitacoes e Contratos Administrativos); ' +
      'IN SEGES/ME n 5/2017 (Contratacao de Servicos sob regime de execucao indireta); ' +
      'Portaria SEGES n 26.383/2023 (Modelo de Planilha de Custos); ' +
      'Convencao Coletiva de Trabalho da categoria.',
    defaultModeloExecucao:
      'Execucao continuada, com dedicacao exclusiva de mao de obra, conforme produtividade minima estabelecida. ' +
      'O servico sera prestado de segunda a sexta-feira, das 07h as 17h, ou conforme escala definida. ' +
      'A contratada devera manter os postos de trabalho permanentemente ocupados durante o horario de prestacao. ' +
      'A cobertura de faltas sera obrigatoria no prazo maximo de 2 horas.',
    defaultModeloGestao:
      'O contrato sera gerido por equipe de fiscalizacao composta por:\n' +
      'a) Gestor do Contrato: responsavel pela administracao do contrato;\n' +
      'b) Fiscal Tecnico: responsavel pela verificacao da execucao;\n' +
      'c) Fiscal Administrativo: responsavel pela conferencia documental.\n\n' +
      'A fiscalizacao realizara checklist diario de conferencia dos postos. ' +
      'Reunioes mensais de avaliacao serao realizadas com registro em ata.',
    defaultCriteriosSelecao:
      'Menor preco global anual, conforme art. 33 da Lei 14.133/2021. ' +
      'Sera considerada vencedora a proposta com menor valor global anual, ' +
      'desde que atenda aos requisitos de exequibilidade conforme art. 59, par. 4 da Lei 14.133.',
    defaultObrigacoesContratante:
      'a) Disponibilizar local adequado para a prestacao dos servicos;\n' +
      'b) Fornecer agua, energia e instalacoes sanitarias;\n' +
      'c) Designar fiscal para acompanhamento diario;\n' +
      'd) Comunicar irregularidades para correcao imediata;\n' +
      'e) Efetuar os pagamentos conforme cronograma.',
    defaultObrigacoesContratada:
      'a) Selecionar e contratar os funcionarios conforme CLT;\n' +
      'b) Fornecer uniformes e EPIs adequados;\n' +
      'c) Manter os postos permanentemente ocupados;\n' +
      'd) Substituir funcionarios em caso de falta em ate 2 horas;\n' +
      'e) Pagar salarios e beneficios em dia;\n' +
      'f) Recolher encargos trabalhistas e previdenciarios;\n' +
      'g) Apresentar documentacao trabalhista mensalmente;\n' +
      'h) Fornecer materiais e equipamentos de qualidade.',
    defaultSancoesPenalidades:
      'Conforme art. 155 da Lei 14.133/2021:\n' +
      'a) Advertencia, por escrito, para faltas leves;\n' +
      'b) Multa de 0,3% do valor mensal por posto descoberto por dia;\n' +
      'c) Multa de 1% do valor mensal por descumprimento de clausula contratual;\n' +
      'd) Multa de 5% do valor do contrato por atraso no pagamento de funcionarios;\n' +
      'e) Impedimento de licitar e contratar por ate 3 anos;\n' +
      'f) Rescisao contratual em caso de inadimplencia trabalhista reiterada.',
  },

  // Template Materiais/Bens
  {
    name: 'Template de TR para Aquisicao de Materiais e Bens',
    type: TrTemplateType.MATERIAIS,
    description:
      'Template especializado para Termos de Referencia de aquisicao de materiais permanentes e de consumo, ' +
      'bens e equipamentos. Inclui campos para especificacoes tecnicas, garantia, assistencia tecnica ' +
      'e referencias CATMAT/CATSER.',
    specificFields: [
      {
        name: 'especificacoesTecnicas',
        label: 'Especificacoes Tecnicas',
        type: 'textarea',
        required: true,
        placeholder:
          'Descricao detalhada do material/bem com caracteristicas tecnicas',
      },
      {
        name: 'unidadeFornecimento',
        label: 'Unidade de Fornecimento',
        type: 'text',
        required: true,
        placeholder: 'Unidade, Caixa, Pacote, etc.',
      },
      {
        name: 'prazoEntrega',
        label: 'Prazo de Entrega (dias)',
        type: 'number',
        required: true,
        placeholder: 'Prazo maximo em dias corridos',
        defaultValue: 30,
      },
      {
        name: 'garantiaMinima',
        label: 'Garantia Minima',
        type: 'text',
        required: true,
        placeholder: 'Periodo de garantia exigido',
        defaultValue: '12 meses',
      },
      {
        name: 'assistenciaTecnica',
        label: 'Assistencia Tecnica',
        type: 'textarea',
        required: false,
        placeholder: 'Requisitos de assistencia tecnica, se aplicavel',
      },
      {
        name: 'normasAplicaveis',
        label: 'Normas Tecnicas Aplicaveis',
        type: 'textarea',
        required: false,
        placeholder: 'NBR, INMETRO, certificacoes exigidas',
      },
    ],
    defaultSections: [
      'objeto',
      'fundamentacao_legal',
      'descricao_solucao',
      'especificacoes_tecnicas',
      'requisitos_contratacao',
      'modelo_execucao',
      'modelo_gestao',
      'criterios_selecao',
      'valor_estimado',
      'dotacao_orcamentaria',
      'obrigacoes_contratante',
      'obrigacoes_contratada',
      'sancoes_penalidades',
      'local_entrega',
      'garantia',
    ],
    prompts: [
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
        sectionType: 'garantia',
        systemPrompt:
          'Voce e um especialista em clausulas de garantia e assistencia tecnica para contratacoes publicas. ' +
          'Defina termos de garantia equilibrados e conforme praticas de mercado.',
        userPromptTemplate:
          'Elabore as clausulas de garantia para: {{objeto}}. ' +
          'Periodo minimo: {{garantiaMinima}}. ' +
          'Assistencia tecnica: {{assistenciaTecnica}}.',
      },
      {
        sectionType: 'local_entrega',
        systemPrompt:
          'Voce e um especialista em logistica de aquisicoes publicas. ' +
          'Defina requisitos de entrega, embalagem e transporte adequados.',
        userPromptTemplate:
          'Defina as condicoes de entrega para: {{objeto}}. ' +
          'Quantidade: {{quantidade}} {{unidadeFornecimento}}. ' +
          'Prazo: {{prazoEntrega}} dias.',
      },
    ],
    legalReferences: [
      'Lei n 14.133/2021 (Nova Lei de Licitacoes)',
      'Decreto n 10.024/2019 (Pregao Eletronico)',
      'Decreto n 7.892/2013 (Sistema de Registro de Precos)',
      'IN SEGES/ME n 73/2022 (Elaboracao de ETP)',
      'Portaria SEGES n 938/2022 (CATMAT/CATSER)',
      'Decreto n 11.462/2023 (Compras Publicas Sustentaveis)',
      'Lei n 12.305/2010 (Politica Nacional de Residuos Solidos)',
    ],
    defaultFundamentacaoLegal:
      'Lei 14.133/2021 (Nova Lei de Licitacoes e Contratos Administrativos); ' +
      'Decreto n 11.462/2023 (Aquisicao de Bens e Contratacao de Servicos); ' +
      'Decreto n 7.892/2013 (Sistema de Registro de Precos); ' +
      'IN SEGES/ME n 73/2022 (Elaboracao de ETP).',
    defaultModeloExecucao:
      'Fornecimento parcelado, conforme demanda do orgao contratante, mediante ordem de fornecimento. ' +
      'A entrega devera ser realizada no prazo maximo de {{prazoEntrega}} dias corridos, ' +
      'contados do recebimento da ordem de fornecimento. ' +
      'Os materiais/bens deverao ser entregues em embalagem original, com nota fiscal e certificado de garantia.',
    defaultModeloGestao:
      'O contrato sera gerido por servidor designado, com atribuicoes de:\n' +
      'a) Emitir ordens de fornecimento conforme demanda;\n' +
      'b) Conferir os materiais/bens no momento da entrega;\n' +
      'c) Recusar itens em desacordo com as especificacoes;\n' +
      'd) Atestar as notas fiscais para fins de pagamento;\n' +
      'e) Acompanhar o cumprimento da garantia.',
    defaultCriteriosSelecao:
      'Menor preco por item, conforme art. 33 da Lei 14.133/2021. ' +
      'Sera considerado vencedor de cada item o licitante que apresentar o menor preco unitario, ' +
      'desde que atenda integralmente as especificacoes tecnicas exigidas.',
    defaultObrigacoesContratante:
      'a) Emitir ordens de fornecimento com antecedencia adequada;\n' +
      'b) Receber e conferir os materiais/bens entregues;\n' +
      'c) Comunicar defeitos ou nao conformidades;\n' +
      'd) Efetuar os pagamentos no prazo estabelecido;\n' +
      'e) Fornecer local adequado para entrega.',
    defaultObrigacoesContratada:
      'a) Entregar os materiais/bens conforme especificacoes;\n' +
      'b) Cumprir o prazo de entrega estabelecido;\n' +
      'c) Substituir itens defeituosos ou em desacordo;\n' +
      'd) Fornecer garantia conforme especificado;\n' +
      'e) Prestar assistencia tecnica quando aplicavel;\n' +
      'f) Manter as condicoes de habilitacao durante a vigencia;\n' +
      'g) Arcar com custos de frete e seguro ate o local de entrega.',
    defaultSancoesPenalidades:
      'Conforme art. 155 da Lei 14.133/2021:\n' +
      'a) Advertencia, por escrito, para faltas leves;\n' +
      'b) Multa moratoria de 0,5% por dia de atraso na entrega, limitada a 10%;\n' +
      'c) Multa compensatoria de 10% sobre o valor da ordem de fornecimento por inexecucao;\n' +
      'd) Impedimento de licitar e contratar por ate 3 anos;\n' +
      'e) Declaracao de inidoneidade para fraude comprovada.\n\n' +
      'A recusa injustificada em assinar o contrato ou retirar a nota de empenho ' +
      'caracteriza descumprimento da obrigacao assumida.',
  },
];

async function seedTrTemplates(): Promise<void> {
  console.log('Starting TR templates seed script...');
  console.log(`Templates to seed: ${TR_TEMPLATES_DATA.length}`);

  // Determine SSL configuration based on environment
  const useSSL =
    process.env.PGSSLMODE !== 'disable' &&
    process.env.NODE_ENV === 'production';

  const dataSource = new DataSource({
    type: 'postgres',
    url: process.env.DATABASE_URL,
    entities: [TermoReferenciaTemplate],
    synchronize: false,
    logging: false,
    ssl: useSSL,
  });

  try {
    await dataSource.initialize();
    console.log('Database connection established');

    const templateRepository = dataSource.getRepository(
      TermoReferenciaTemplate,
    );

    const results = await Promise.all(
      TR_TEMPLATES_DATA.map((templateData) =>
        createOrUpdateTrTemplate(templateRepository, templateData),
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

async function createOrUpdateTrTemplate(
  repository: ReturnType<DataSource['getRepository']>,
  data: TrTemplateData,
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
export { TR_TEMPLATES_DATA, seedTrTemplates, createOrUpdateTrTemplate };

// Run seed only when executed directly (not when imported)
if (require.main === module) {
  seedTrTemplates()
    .then(() => {
      console.log('\nAll done!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\nFatal error:', error);
      process.exit(1);
    });
}
