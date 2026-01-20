import { DataSource } from 'typeorm';
import { config } from 'dotenv';
import {
  EditalTemplate,
  EditalTemplateModalidade,
  EditalTemplateSecao,
  EditalTemplateClausula,
  EditalTemplateField,
} from '../entities/edital-template.entity';

config();

/**
 * Seed script for Edital templates.
 * Creates 4 base templates for different bidding modalities:
 * - PREGAO: Electronic auction (most common)
 * - CONCORRENCIA: Public bidding (large projects)
 * - DISPENSA: Direct contracting waiver
 * - INEXIGIBILIDADE: Direct contracting non-competitiveness
 *
 * Issue #1278 - [Edital-b] Templates de edital por modalidade
 * Parent: #1276 - [Edital] Modulo de Geracao de Edital - EPIC
 *
 * Usage:
 * - Development: npm run seed:edital-templates
 * - Production: npm run seed:edital-templates:prod
 */

interface EditalTemplateData {
  name: string;
  modalidade: EditalTemplateModalidade;
  description: string;
  secoes: EditalTemplateSecao[];
  clausulas: EditalTemplateClausula[];
  specificFields: EditalTemplateField[];
  legalReferences: string[];
  defaultPreambulo: string;
  defaultFundamentacaoLegal: string;
  defaultCondicoesParticipacao: string;
  defaultRequisitosHabilitacao: string;
  defaultSancoesAdministrativas: string;
  defaultCondicoesPagamento: string;
  defaultGarantiaContratual: string;
  defaultReajusteContratual: string;
  instructions: string;
}

// ==============================================================
// TEMPLATE: PREGÃO ELETRÔNICO
// ==============================================================
const TEMPLATE_PREGAO: EditalTemplateData = {
  name: 'Template de Pregão Eletrônico',
  modalidade: EditalTemplateModalidade.PREGAO,
  description:
    'Template para Pregão Eletrônico, modalidade mais comum para aquisição de bens e serviços comuns. ' +
    'Aplicável quando o critério de julgamento for menor preço ou maior desconto.',
  secoes: [
    {
      id: 'preambulo',
      nome: 'Preâmbulo',
      ordem: 1,
      textoModelo:
        'O {{orgao}}, por meio de seu Pregoeiro, designado pela Portaria nº {{numeroPortaria}}, ' +
        'torna público para conhecimento dos interessados que fará realizar licitação na modalidade ' +
        'PREGÃO ELETRÔNICO, tipo MENOR PREÇO, nos termos da Lei nº 14.133, de 1º de abril de 2021, ' +
        'e demais legislação aplicável.',
      obrigatoria: true,
      referenciaLegal: 'Lei 14.133/2021 Art. 25',
    },
    {
      id: 'objeto',
      nome: 'Do Objeto',
      ordem: 2,
      textoModelo:
        'Contratação de {{objetoDetalhado}}, conforme especificações e condições estabelecidas ' +
        'neste Edital e seus anexos.',
      obrigatoria: true,
      referenciaLegal: 'Lei 14.133/2021 Art. 25, I',
    },
    {
      id: 'condicoes_participacao',
      nome: 'Das Condições de Participação',
      ordem: 3,
      textoModelo:
        'Poderão participar desta licitação pessoas jurídicas que explorem ramo de atividade ' +
        'compatível com o objeto licitatório e que atendam aos requisitos de habilitação estabelecidos ' +
        'neste Edital.',
      obrigatoria: true,
      referenciaLegal: 'Lei 14.133/2021 Art. 25, IV',
    },
    {
      id: 'habilitacao',
      nome: 'Da Habilitação',
      ordem: 4,
      textoModelo:
        'A habilitação dos licitantes será verificada por meio da consulta aos seguintes documentos: ' +
        'habilitação jurídica, regularidade fiscal e trabalhista, qualificação econômico-financeira e ' +
        'qualificação técnica.',
      obrigatoria: true,
      referenciaLegal: 'Lei 14.133/2021 Art. 25, V',
    },
    {
      id: 'propostas',
      nome: 'Das Propostas',
      ordem: 5,
      textoModelo:
        'A proposta de preço deverá ser elaborada e enviada exclusivamente por meio do sistema ' +
        'eletrônico, até a data e hora marcadas para abertura da sessão.',
      obrigatoria: true,
      referenciaLegal: 'Lei 14.133/2021 Art. 54',
    },
    {
      id: 'julgamento',
      nome: 'Do Julgamento',
      ordem: 6,
      textoModelo:
        'O critério de julgamento será o MENOR PREÇO, observadas as especificações técnicas e os ' +
        'parâmetros mínimos de desempenho estabelecidos no Termo de Referência.',
      obrigatoria: true,
      referenciaLegal: 'Lei 14.133/2021 Art. 33, I',
    },
    {
      id: 'recursos',
      nome: 'Dos Recursos',
      ordem: 7,
      textoModelo:
        'Declarado o vencedor, o Pregoeiro abrirá prazo de 15 (quinze) minutos, durante o qual qualquer ' +
        'licitante poderá, de forma motivada, em campo próprio do sistema, manifestar sua intenção de recurso.',
      obrigatoria: true,
      referenciaLegal: 'Lei 14.133/2021 Art. 165',
    },
    {
      id: 'sancoes',
      nome: 'Das Sanções Administrativas',
      ordem: 8,
      textoModelo:
        'Pela inexecução total ou parcial do objeto, a Administração poderá aplicar à contratada as ' +
        'sanções previstas nos artigos 155 a 163 da Lei nº 14.133/2021.',
      obrigatoria: true,
      referenciaLegal: 'Lei 14.133/2021 Art. 25, VI',
    },
    {
      id: 'disposicoes_finais',
      nome: 'Das Disposições Finais',
      ordem: 9,
      textoModelo:
        'As normas disciplinadoras desta licitação serão interpretadas em favor da ampliação da ' +
        'disputa, respeitada a igualdade de oportunidade entre os licitantes, desde que não ' +
        'comprometam o interesse público, a finalidade e a segurança da contratação.',
      obrigatoria: true,
      referenciaLegal: 'Lei 14.133/2021 Art. 11',
    },
  ],
  clausulas: [
    {
      id: 'prazo_vigencia',
      titulo: 'Do Prazo de Vigência',
      textoModelo:
        'O contrato terá vigência de {{prazoVigencia}} dias, contados da data de sua assinatura, ' +
        'podendo ser prorrogado nas condições previstas na Lei nº 14.133/2021.',
      obrigatoria: true,
      referenciaLegal: 'Lei 14.133/2021 Art. 25, VII',
      categoria: 'prazo',
    },
    {
      id: 'dotacao_orcamentaria',
      titulo: 'Da Dotação Orçamentária',
      textoModelo:
        'As despesas decorrentes da presente contratação correrão à conta da dotação ' +
        'orçamentária {{dotacaoOrcamentaria}}, fonte de recursos {{fonteRecursos}}.',
      obrigatoria: true,
      referenciaLegal: 'Lei 14.133/2021 Art. 25, VIII',
      categoria: 'orcamento',
    },
    {
      id: 'valor_estimado',
      titulo: 'Do Valor Estimado',
      textoModelo:
        'O valor estimado total da contratação é de R$ {{valorEstimado}}, fundamentado ' +
        'em pesquisa de preços realizada conforme IN SEGES/ME nº 65/2021.',
      obrigatoria: true,
      referenciaLegal: 'Lei 14.133/2021 Art. 25, IX',
      categoria: 'valor',
    },
    {
      id: 'forma_pagamento',
      titulo: 'Da Forma de Pagamento',
      textoModelo:
        'O pagamento será efetuado em até {{prazoPagamento}} dias úteis após a apresentação ' +
        'da nota fiscal, devidamente atestada pela fiscalização do contrato.',
      obrigatoria: true,
      referenciaLegal: 'Lei 14.133/2021 Art. 137',
      categoria: 'pagamento',
    },
    {
      id: 'garantia_contratual',
      titulo: 'Da Garantia Contratual',
      textoModelo:
        'Será exigida garantia contratual no percentual de {{percentualGarantia}}% do valor ' +
        'do contrato, nas modalidades previstas no Art. 96 da Lei nº 14.133/2021.',
      obrigatoria: false,
      referenciaLegal: 'Lei 14.133/2021 Art. 96',
      categoria: 'garantia',
    },
  ],
  specificFields: [
    {
      name: 'uasg',
      label: 'UASG',
      type: 'text',
      required: true,
      placeholder: 'Código UASG de 6 dígitos',
      description: 'Código da Unidade Administrativa de Serviços Gerais (SISG)',
    },
    {
      name: 'sistemaEletronico',
      label: 'Sistema Eletrônico',
      type: 'select',
      required: true,
      options: [
        'Comprasnet (Gov.br)',
        'Licitações-e (BB)',
        'Portal Compras Públicas',
      ],
      defaultValue: 'Comprasnet (Gov.br)',
    },
    {
      name: 'exclusividadeMeEpp',
      label: 'Exclusivo para ME/EPP',
      type: 'boolean',
      required: false,
      defaultValue: false,
      description:
        'Licitação exclusiva para Micro e Pequenas Empresas (LC 123/2006)',
    },
    {
      name: 'sigiloOrcamento',
      label: 'Orçamento Sigiloso',
      type: 'boolean',
      required: false,
      defaultValue: false,
      description: 'Manter sigilo do orçamento estimado (Art. 34)',
    },
  ],
  legalReferences: [
    'Lei nº 14.133/2021 - Nova Lei de Licitações',
    'Lei Complementar nº 123/2006 - Estatuto da ME/EPP',
    'IN SEGES/ME nº 65/2021 - Pesquisa de Preços',
    'Decreto nº 10.024/2019 - Pregão Eletrônico',
  ],
  defaultPreambulo:
    'O {{orgao}}, CNPJ nº {{cnpjOrgao}}, por meio de seu Pregoeiro, designado pela Portaria nº {{numeroPortaria}}, ' +
    'torna público para conhecimento dos interessados que fará realizar licitação na modalidade PREGÃO ELETRÔNICO, ' +
    'tipo MENOR PREÇO, sob o regime de empreitada por preço unitário, nos termos da Lei nº 14.133/2021.',
  defaultFundamentacaoLegal:
    'A presente licitação fundamenta-se na Lei nº 14.133, de 1º de abril de 2021 (Nova Lei de Licitações e Contratos), ' +
    'no Decreto nº 10.024, de 20 de setembro de 2019 (Pregão Eletrônico), na Lei Complementar nº 123/2006 (Estatuto da ME/EPP), ' +
    'e nas normas correlatas aplicáveis à espécie.',
  defaultCondicoesParticipacao:
    'Poderão participar desta licitação pessoas jurídicas que explorem ramo de atividade compatível com o objeto licitatório, ' +
    'que atendam aos requisitos de habilitação estabelecidos neste Edital e que estejam cadastradas e habilitadas no sistema eletrônico. ' +
    'Não poderão participar empresas suspensas, impedidas ou declaradas inidôneas para licitar com a Administração Pública.',
  defaultRequisitosHabilitacao:
    'A habilitação dos licitantes será verificada por meio dos seguintes documentos: ' +
    '(a) Habilitação Jurídica: ato constitutivo, estatuto ou contrato social em vigor; ' +
    '(b) Regularidade Fiscal: certidões de regularidade com a Fazenda Federal, Estadual, Municipal, FGTS e Trabalhista; ' +
    '(c) Qualificação Econômico-Financeira: certidão negativa de falência e recuperação judicial; ' +
    '(d) Qualificação Técnica: atestados de capacidade técnica compatíveis com o objeto.',
  defaultSancoesAdministrativas:
    'Pela inexecução total ou parcial do objeto, a Administração poderá aplicar à contratada as seguintes sanções: ' +
    '(a) advertência; (b) multa de até 30% do valor do contrato; (c) impedimento de licitar e contratar com a Administração pelo prazo de até 3 anos; ' +
    '(d) declaração de inidoneidade para licitar ou contratar. As sanções observarão o disposto nos artigos 155 a 163 da Lei nº 14.133/2021.',
  defaultCondicoesPagamento:
    'O pagamento será efetuado em até 30 (trinta) dias úteis, contados do recebimento definitivo do objeto, mediante apresentação de nota fiscal ' +
    'devidamente atestada pela fiscalização do contrato. O pagamento será creditado em favor do contratado por meio de ordem bancária contra qualquer ' +
    'banco indicado, devendo para isto ficar explicitado o nome, número da agência e o número da conta corrente.',
  defaultGarantiaContratual:
    'Será exigida garantia da execução do contrato no percentual de 5% (cinco por cento) do valor contratado, a ser prestada em uma das modalidades ' +
    'previstas no Art. 96 da Lei nº 14.133/2021: caução em dinheiro, títulos da dívida pública, seguro-garantia ou fiança bancária. ' +
    'A garantia será restituída após o cumprimento integral das obrigações contratuais.',
  defaultReajusteContratual:
    'Os preços contratados serão reajustados anualmente, mediante aplicação do índice IPCA (Índice Nacional de Preços ao Consumidor Amplo), ' +
    'apurado pelo IBGE, observado o interregno mínimo de 12 (doze) meses, contados da data de apresentação da proposta, conforme disposto no Art. 137 da Lei nº 14.133/2021.',
  instructions:
    'Este template é recomendado para contratações de bens e serviços comuns com critério de menor preço. ' +
    'Antes de publicar o edital, certifique-se de: (1) preencher todos os campos obrigatórios; (2) anexar o Termo de Referência completo; ' +
    '(3) incluir a pesquisa de preços fundamentada; (4) verificar a dotação orçamentária; (5) revisar todas as cláusulas e especificações técnicas.',
};

// ==============================================================
// TEMPLATE: CONCORRÊNCIA
// ==============================================================
const TEMPLATE_CONCORRENCIA: EditalTemplateData = {
  name: 'Template de Concorrência',
  modalidade: EditalTemplateModalidade.CONCORRENCIA,
  description:
    'Template para modalidade Concorrência, utilizada para contratações de grande vulto, obras e serviços de engenharia, ' +
    'alienação de bens imóveis, concessões e outras contratações de alta complexidade.',
  secoes: [
    {
      id: 'preambulo',
      nome: 'Preâmbulo',
      ordem: 1,
      textoModelo:
        'O {{orgao}}, por meio de sua Comissão de Contratação, designada pela Portaria nº {{numeroPortaria}}, ' +
        'torna público para conhecimento dos interessados que fará realizar licitação na modalidade ' +
        'CONCORRÊNCIA, tipo {{criterioJulgamento}}, nos termos da Lei nº 14.133, de 1º de abril de 2021.',
      obrigatoria: true,
      referenciaLegal: 'Lei 14.133/2021 Art. 25',
    },
    {
      id: 'objeto',
      nome: 'Do Objeto',
      ordem: 2,
      textoModelo:
        'Contratação de {{objetoDetalhado}}, conforme especificações técnicas detalhadas no Projeto Básico/Executivo ' +
        'e demais condições estabelecidas neste Edital e seus anexos.',
      obrigatoria: true,
      referenciaLegal: 'Lei 14.133/2021 Art. 25, I',
    },
    {
      id: 'condicoes_participacao',
      nome: 'Das Condições de Participação',
      ordem: 3,
      textoModelo:
        'Poderão participar desta licitação pessoas jurídicas ou consórcios de empresas que comprovem ' +
        'qualificação técnica e capacidade econômico-financeira compatíveis com o objeto licitatório.',
      obrigatoria: true,
      referenciaLegal: 'Lei 14.133/2021 Art. 25, IV',
    },
    {
      id: 'habilitacao',
      nome: 'Da Habilitação',
      ordem: 4,
      textoModelo:
        'A habilitação dos licitantes será verificada mediante documentação relativa à habilitação jurídica, ' +
        'regularidade fiscal e trabalhista, qualificação econômico-financeira e qualificação técnica, conforme ' +
        'especificações detalhadas nesta seção.',
      obrigatoria: true,
      referenciaLegal: 'Lei 14.133/2021 Art. 25, V',
    },
    {
      id: 'propostas',
      nome: 'Das Propostas',
      ordem: 5,
      textoModelo:
        'A proposta de preços deverá conter planilha orçamentária detalhada, com composições de custos unitários, ' +
        'cronograma físico-financeiro e demais elementos exigidos neste Edital.',
      obrigatoria: true,
      referenciaLegal: 'Lei 14.133/2021 Art. 54',
    },
    {
      id: 'julgamento',
      nome: 'Do Julgamento',
      ordem: 6,
      textoModelo:
        'O critério de julgamento será {{criterioJulgamento}}, observadas as especificações técnicas, ' +
        'parâmetros de desempenho e demais condições estabelecidas no Edital e seus anexos.',
      obrigatoria: true,
      referenciaLegal: 'Lei 14.133/2021 Art. 33',
    },
    {
      id: 'recursos',
      nome: 'Dos Recursos',
      ordem: 7,
      textoModelo:
        'Dos atos da Administração decorrentes desta licitação caberão recursos nos termos dos artigos 165 a 168 ' +
        'da Lei nº 14.133/2021, no prazo de 15 (quinze) dias úteis, contados da data de publicação do ato.',
      obrigatoria: true,
      referenciaLegal: 'Lei 14.133/2021 Art. 165',
    },
    {
      id: 'sancoes',
      nome: 'Das Sanções Administrativas',
      ordem: 8,
      textoModelo:
        'Pela inexecução total ou parcial do objeto, a Administração aplicará as sanções previstas nos artigos ' +
        '155 a 163 da Lei nº 14.133/2021, garantido o direito ao contraditório e à ampla defesa.',
      obrigatoria: true,
      referenciaLegal: 'Lei 14.133/2021 Art. 25, VI',
    },
    {
      id: 'disposicoes_finais',
      nome: 'Das Disposições Finais',
      ordem: 9,
      textoModelo:
        'Os casos omissos neste Edital serão resolvidos pela Comissão de Contratação, com base na Lei nº 14.133/2021 ' +
        'e demais normas aplicáveis.',
      obrigatoria: true,
      referenciaLegal: 'Lei 14.133/2021 Art. 11',
    },
  ],
  clausulas: TEMPLATE_PREGAO.clausulas, // Reuse same clauses structure
  specificFields: [
    {
      name: 'criterioJulgamento',
      label: 'Critério de Julgamento',
      type: 'select',
      required: true,
      options: [
        'Menor Preço',
        'Melhor Técnica',
        'Técnica e Preço',
        'Maior Retorno Econômico',
      ],
      defaultValue: 'Menor Preço',
    },
    {
      name: 'permitirConsorcio',
      label: 'Permitir Consórcio',
      type: 'boolean',
      required: false,
      defaultValue: false,
    },
    {
      name: 'percentualGarantia',
      label: 'Percentual de Garantia (%)',
      type: 'number',
      required: true,
      defaultValue: 5,
      description: 'Percentual de garantia contratual (Art. 96)',
    },
  ],
  legalReferences: [
    'Lei nº 14.133/2021 - Nova Lei de Licitações',
    'Lei nº 8.666/1993 (revogada, mas referência histórica)',
    'IN SEGES/ME nº 65/2021 - Pesquisa de Preços',
    'NBR 12.721/2006 - Avaliação de custos de construção',
  ],
  defaultPreambulo: TEMPLATE_PREGAO.defaultPreambulo.replace(
    'PREGÃO ELETRÔNICO',
    'CONCORRÊNCIA',
  ),
  defaultFundamentacaoLegal: TEMPLATE_PREGAO.defaultFundamentacaoLegal,
  defaultCondicoesParticipacao:
    'Poderão participar desta licitação pessoas jurídicas que comprovem qualificação técnica e capacidade econômico-financeira ' +
    'compatíveis com o objeto. Serão admitidos consórcios de empresas, desde que atendam aos requisitos previstos no Art. 15 da Lei nº 14.133/2021.',
  defaultRequisitosHabilitacao:
    TEMPLATE_PREGAO.defaultRequisitosHabilitacao +
    ' Adicionalmente, exige-se: (e) capital social mínimo de 10% do valor estimado da contratação; ' +
    '(f) atestados de execução de serviços similares de complexidade equivalente.',
  defaultSancoesAdministrativas: TEMPLATE_PREGAO.defaultSancoesAdministrativas,
  defaultCondicoesPagamento: TEMPLATE_PREGAO.defaultCondicoesPagamento,
  defaultGarantiaContratual:
    'Será exigida garantia da execução do contrato no percentual de {{percentualGarantia}}% do valor contratado, ' +
    'a ser prestada em uma das modalidades previstas no Art. 96 da Lei nº 14.133/2021. Em obras e serviços de engenharia, ' +
    'a garantia mínima será de 5% do valor contratado.',
  defaultReajusteContratual: TEMPLATE_PREGAO.defaultReajusteContratual,
  instructions:
    'Este template é recomendado para grandes contratações, obras de engenharia e serviços de alta complexidade. ' +
    'Certifique-se de anexar Projeto Básico ou Executivo completo, pesquisa de preços fundamentada e análise de riscos. ' +
    'Para obras, utilize SINAPI/SICRO como base de preços.',
};

// ==============================================================
// TEMPLATE: DISPENSA DE LICITAÇÃO
// ==============================================================
const TEMPLATE_DISPENSA: EditalTemplateData = {
  name: 'Template de Dispensa de Licitação',
  modalidade: EditalTemplateModalidade.DISPENSA,
  description:
    'Template para contratações diretas com dispensa de licitação, conforme hipóteses previstas nos Arts. 75 a 81 da Lei 14.133/2021. ' +
    'Aplicável a contratações de pequeno valor, emergenciais, complementares, entre outras.',
  secoes: [
    {
      id: 'justificativa_dispensa',
      nome: 'Da Justificativa da Dispensa',
      ordem: 1,
      textoModelo:
        'A presente contratação fundamenta-se no Art. {{artigoDispensa}} da Lei nº 14.133/2021, ' +
        'que prevê dispensa de licitação para {{hipoeteseDispensa}}. ' +
        'Justificativa detalhada: {{justificativaDetalhada}}',
      obrigatoria: true,
      referenciaLegal: 'Lei 14.133/2021 Arts. 75-81',
    },
    {
      id: 'objeto',
      nome: 'Do Objeto',
      ordem: 2,
      textoModelo:
        'Contratação de {{objetoDetalhado}}, conforme especificações e condições estabelecidas ' +
        'no Termo de Referência e neste instrumento de contratação.',
      obrigatoria: true,
      referenciaLegal: 'Lei 14.133/2021 Art. 25, I',
    },
    {
      id: 'fundamentacao_legal',
      nome: 'Da Fundamentação Legal',
      ordem: 3,
      textoModelo:
        'A contratação direta fundamenta-se no disposto no Art. {{artigoDispensa}} da Lei nº 14.133/2021, ' +
        'observados os princípios da impessoalidade, moralidade, probidade administrativa, igualdade, ' +
        'eficiência e razoabilidade.',
      obrigatoria: true,
      referenciaLegal: 'Lei 14.133/2021 Art. 11',
    },
    {
      id: 'pesquisa_precos',
      nome: 'Da Pesquisa de Preços',
      ordem: 4,
      textoModelo:
        'O valor da contratação foi estimado com base em pesquisa de preços realizada conforme ' +
        'IN SEGES/ME nº 65/2021, sendo considerados {{numeroFontes}} fontes de consulta.',
      obrigatoria: true,
      referenciaLegal: 'IN SEGES/ME nº 65/2021',
    },
    {
      id: 'obrigacoes_partes',
      nome: 'Das Obrigações das Partes',
      ordem: 5,
      textoModelo:
        'O contratado obriga-se a fornecer/executar o objeto conforme especificado, responsabilizando-se ' +
        'integralmente por sua execução. O contratante obriga-se a efetuar o pagamento na forma e prazo estabelecidos.',
      obrigatoria: true,
      referenciaLegal: 'Lei 14.133/2021 Art. 92',
    },
  ],
  clausulas: [
    {
      id: 'valor',
      titulo: 'Do Valor',
      textoModelo:
        'O valor total da contratação é de R$ {{valorEstimado}}, fundamentado em pesquisa de preços ' +
        'realizada conforme IN SEGES/ME nº 65/2021.',
      obrigatoria: true,
      referenciaLegal: 'Lei 14.133/2021 Art. 25, IX',
      categoria: 'valor',
    },
    {
      id: 'dotacao_orcamentaria',
      titulo: 'Da Dotação Orçamentária',
      textoModelo:
        'As despesas decorrentes correrão à conta da dotação orçamentária {{dotacaoOrcamentaria}}, ' +
        'fonte de recursos {{fonteRecursos}}.',
      obrigatoria: true,
      referenciaLegal: 'Lei 14.133/2021 Art. 25, VIII',
      categoria: 'orcamento',
    },
    {
      id: 'forma_pagamento',
      titulo: 'Da Forma de Pagamento',
      textoModelo:
        'O pagamento será efetuado em até {{prazoPagamento}} dias úteis após a entrega/execução e ' +
        'apresentação de nota fiscal, devidamente atestada.',
      obrigatoria: true,
      referenciaLegal: 'Lei 14.133/2021 Art. 137',
      categoria: 'pagamento',
    },
  ],
  specificFields: [
    {
      name: 'artigoDispensa',
      label: 'Artigo da Dispensa',
      type: 'select',
      required: true,
      options: [
        'Art. 75, II - Até R$ 100 mil (obras/serviços de engenharia)',
        'Art. 75, II - Até R$ 50 mil (outras contratações)',
        'Art. 75, VIII - Emergência ou calamidade',
        'Art. 79 - Complementação de objeto',
        'Art. 74, III - Licitação deserta',
      ],
      description: 'Hipótese legal de dispensa aplicável',
    },
    {
      name: 'hipoteseDi spensa',
      label: 'Hipótese de Dispensa',
      type: 'textarea',
      required: true,
      placeholder:
        'Descreva a hipótese de dispensa aplicável (ex: contratação de valor inferior ao limite legal)',
    },
    {
      name: 'justificativaDetalhada',
      label: 'Justificativa Detalhada',
      type: 'textarea',
      required: true,
      placeholder:
        'Justifique detalhadamente a necessidade da contratação e o enquadramento legal',
    },
  ],
  legalReferences: [
    'Lei nº 14.133/2021 Arts. 75-81 - Dispensa de Licitação',
    'IN SEGES/ME nº 65/2021 - Pesquisa de Preços',
    'Lei nº 4.320/1964 - Normas de Direito Financeiro',
  ],
  defaultPreambulo:
    'O {{orgao}}, CNPJ nº {{cnpjOrgao}}, torna público que realizará contratação direta por DISPENSA DE LICITAÇÃO, ' +
    'nos termos do Art. {{artigoDispensa}} da Lei nº 14.133/2021.',
  defaultFundamentacaoLegal:
    'A contratação direta por dispensa de licitação fundamenta-se no Art. {{artigoDispensa}} da Lei nº 14.133, de 1º de abril de 2021, ' +
    'observados os princípios da impessoalidade, moralidade, probidade administrativa, igualdade e eficiência previstos no Art. 11 da mesma Lei.',
  defaultCondicoesParticipacao:
    'A contratação direta será precedida de pesquisa de preços e avaliação de propostas de, no mínimo, 3 (três) fornecedores, ' +
    'sempre que possível, conforme Art. 24, § 5º da Lei nº 14.133/2021.',
  defaultRequisitosHabilitacao:
    'O contratado deverá comprovar: (a) regularidade fiscal com a Fazenda Federal, Estadual e Municipal; ' +
    '(b) regularidade com o FGTS e a Justiça Trabalhista; (c) inexistência de impedimento para contratar com a Administração.',
  defaultSancoesAdministrativas:
    'Pela inexecução total ou parcial do objeto, a Administração aplicará as sanções previstas nos artigos 155 a 163 da Lei nº 14.133/2021, ' +
    'garantido o direito ao contraditório e à ampla defesa.',
  defaultCondicoesPagamento:
    'O pagamento será efetuado em até 30 (trinta) dias úteis após a entrega/execução do objeto e apresentação de nota fiscal, ' +
    'devidamente atestada pelo gestor do contrato.',
  defaultGarantiaContratual:
    'Não será exigida garantia contratual, ressalvadas as hipóteses de contratações de maior vulto ou risco, ' +
    'a critério da Administração.',
  defaultReajusteContratual:
    'Não haverá reajuste de preços para contratos com prazo de vigência inferior a 12 (doze) meses.',
  instructions:
    'Este template é aplicável apenas para contratações que se enquadrem nas hipóteses de dispensa previstas na Lei 14.133/2021. ' +
    'OBRIGATÓRIO: (1) fundamentar detalhadamente a hipótese de dispensa; (2) realizar pesquisa de preços com no mínimo 3 fornecedores; ' +
    '(3) justificar a escolha do contratado; (4) publicar o ato de dispensa no Portal Nacional de Contratações Públicas (PNCP).',
};

// ==============================================================
// TEMPLATE: INEXIGIBILIDADE DE LICITAÇÃO
// ==============================================================
const TEMPLATE_INEXIGIBILIDADE: EditalTemplateData = {
  name: 'Template de Inexigibilidade de Licitação',
  modalidade: EditalTemplateModalidade.INEXIGIBILIDADE,
  description:
    'Template para contratações diretas com inexigibilidade de licitação, conforme Art. 74 da Lei 14.133/2021. ' +
    'Aplicável quando há inviabilidade de competição (fornecedor exclusivo, singularidade do objeto, etc.).',
  secoes: [
    {
      id: 'justificativa_inexigibilidade',
      nome: 'Da Justificativa da Inexigibilidade',
      ordem: 1,
      textoModelo:
        'A presente contratação fundamenta-se no Art. 74 da Lei nº 14.133/2021, que prevê inexigibilidade ' +
        'de licitação quando houver inviabilidade de competição. ' +
        'Justificativa detalhada: {{justificativaDetalhada}}. ' +
        'Comprovação de exclusividade/singularidade: {{comprovanteExclusividade}}',
      obrigatoria: true,
      referenciaLegal: 'Lei 14.133/2021 Art. 74',
    },
    {
      id: 'objeto',
      nome: 'Do Objeto',
      ordem: 2,
      textoModelo:
        'Contratação de {{objetoDetalhado}}, caracterizado pela exclusividade/singularidade que inviabiliza ' +
        'a realização de processo competitivo.',
      obrigatoria: true,
      referenciaLegal: 'Lei 14.133/2021 Art. 25, I',
    },
    {
      id: 'fundamentacao_legal',
      nome: 'Da Fundamentação Legal',
      ordem: 3,
      textoModelo:
        'A contratação direta fundamenta-se no Art. 74, {{incisoInexigibilidade}} da Lei nº 14.133/2021, ' +
        'que prevê inexigibilidade de licitação quando {{hipoteseInexigibilidade}}.',
      obrigatoria: true,
      referenciaLegal: 'Lei 14.133/2021 Art. 74',
    },
    {
      id: 'comprovacao_exclusividade',
      nome: 'Da Comprovação de Exclusividade',
      ordem: 4,
      textoModelo:
        'A exclusividade/singularidade do objeto foi comprovada mediante: {{documentosComprobatorios}}. ' +
        'Declara-se a inviabilidade de competição nos termos do Art. 74 da Lei nº 14.133/2021.',
      obrigatoria: true,
      referenciaLegal: 'Lei 14.133/2021 Art. 74, § 3º',
    },
    {
      id: 'preco_compativel',
      nome: 'Da Compatibilidade de Preços',
      ordem: 5,
      textoModelo:
        'O preço foi considerado compatível com os valores praticados no mercado, conforme pesquisa de preços ' +
        'realizada e parecer técnico anexo. Valor proposto: R$ {{valorEstimado}}.',
      obrigatoria: true,
      referenciaLegal: 'Lei 14.133/2021 Art. 74, § 4º',
    },
  ],
  clausulas: TEMPLATE_DISPENSA.clausulas, // Reuse same structure
  specificFields: [
    {
      name: 'incisoInexigibilidade',
      label: 'Inciso da Inexigibilidade',
      type: 'select',
      required: true,
      options: [
        'I - Aquisição de materiais, equipamentos ou gêneros exclusivos',
        'II - Contratação de serviços técnicos profissionais especializados',
        'III - Contratação de profissional do setor artístico',
        'IV - Aquisição ou locação de imóvel para atendimento das finalidades',
      ],
      description: 'Hipótese legal de inexigibilidade aplicável',
    },
    {
      name: 'hipoteseInexigibilidade',
      label: 'Hipótese de Inexigibilidade',
      type: 'textarea',
      required: true,
      placeholder:
        'Descreva a hipótese de inexigibilidade (ex: fornecedor exclusivo de produto patenteado)',
    },
    {
      name: 'justificativaDetalhada',
      label: 'Justificativa Detalhada',
      type: 'textarea',
      required: true,
      placeholder:
        'Justifique detalhadamente a inviabilidade de competição e a necessidade da contratação',
    },
    {
      name: 'comprovanteExclusividade',
      label: 'Comprovante de Exclusividade',
      type: 'textarea',
      required: true,
      placeholder:
        'Descreva os documentos que comprovam a exclusividade (atestado de exclusividade, patente, etc.)',
    },
  ],
  legalReferences: [
    'Lei nº 14.133/2021 Art. 74 - Inexigibilidade de Licitação',
    'IN SEGES/ME nº 65/2021 - Pesquisa de Preços',
    'Lei nº 8.666/1993 Art. 25 (revogada, mas referência histórica)',
  ],
  defaultPreambulo:
    'O {{orgao}}, CNPJ nº {{cnpjOrgao}}, torna público que realizará contratação direta por INEXIGIBILIDADE DE LICITAÇÃO, ' +
    'nos termos do Art. 74, {{incisoInexigibilidade}} da Lei nº 14.133/2021.',
  defaultFundamentacaoLegal:
    'A contratação direta por inexigibilidade de licitação fundamenta-se no Art. 74, {{incisoInexigibilidade}} da Lei nº 14.133/2021, ' +
    'caracterizada pela inviabilidade de competição devido a {{hipoteseInexigibilidade}}. ' +
    'Observados os princípios da impessoalidade, moralidade, probidade administrativa e eficiência.',
  defaultCondicoesParticipacao:
    'A contratação será realizada diretamente com {{nomeContratado}}, único fornecedor capaz de atender às necessidades da Administração, ' +
    'conforme justificativa técnica e comprovação de exclusividade/singularidade anexas.',
  defaultRequisitosHabilitacao:
    'O contratado deverá comprovar: (a) capacitação técnica para execução do objeto; ' +
    '(b) regularidade fiscal com a Fazenda Federal, Estadual e Municipal; ' +
    '(c) regularidade com o FGTS e a Justiça Trabalhista; ' +
    '(d) exclusividade de fornecimento ou singularidade do objeto.',
  defaultSancoesAdministrativas:
    TEMPLATE_DISPENSA.defaultSancoesAdministrativas,
  defaultCondicoesPagamento: TEMPLATE_DISPENSA.defaultCondicoesPagamento,
  defaultGarantiaContratual: TEMPLATE_DISPENSA.defaultGarantiaContratual,
  defaultReajusteContratual: TEMPLATE_DISPENSA.defaultReajusteContratual,
  instructions:
    'Este template é aplicável APENAS quando houver inviabilidade de competição comprovada. ' +
    'OBRIGATÓRIO: (1) comprovar exclusividade/singularidade mediante documentos (atestado, patente, etc.); ' +
    '(2) justificar tecnicamente a inviabilidade de competição; (3) demonstrar compatibilidade de preços; ' +
    '(4) emitir parecer jurídico fundamentando a inexigibilidade; (5) publicar no PNCP.',
};

// ==============================================================
// MAIN SEED FUNCTION
// ==============================================================
async function seed() {
  const useSSL =
    process.env.NODE_ENV === 'production' &&
    !process.env.DATABASE_URL?.includes('localhost');

  // Production: use DATABASE_URL
  const dbConfig = process.env.DATABASE_URL
    ? {
        type: 'postgres' as const,
        url: process.env.DATABASE_URL,
        entities: [EditalTemplate],
        synchronize: false,
        logging: false,
        ssl: useSSL,
      }
    : {
        type: 'postgres' as const,
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5432'),
        username: process.env.DB_USERNAME || 'postgres',
        password: process.env.DB_PASSWORD || 'postgres',
        database: process.env.DB_DATABASE || 'etp_express',
        entities: [EditalTemplate],
        synchronize: false,
        logging: false,
        ssl: useSSL,
      };

  const dataSource = new DataSource(dbConfig);
  await dataSource.initialize();
  console.log('Database connection initialized');

  const repository = dataSource.getRepository(EditalTemplate);

  const templates = [
    TEMPLATE_PREGAO,
    TEMPLATE_CONCORRENCIA,
    TEMPLATE_DISPENSA,
    TEMPLATE_INEXIGIBILIDADE,
  ];

  for (const templateData of templates) {
    // Check if template already exists
    const existing = await repository.findOne({
      where: { modalidade: templateData.modalidade },
    });

    if (existing) {
      console.log(`Template ${templateData.name} already exists, skipping...`);
      continue;
    }

    const template = repository.create(templateData);
    await repository.save(template);
    console.log(`✅ Template ${templateData.name} created successfully!`);
  }

  await dataSource.destroy();
  console.log('🎉 Edital templates seeded successfully!');
}

// Run seed
seed().catch((error) => {
  console.error('Error seeding edital templates:', error);
  process.exit(1);
});
