/**
 * Test Fixtures for CreateETPWizard E2E Tests
 *
 * @description Contains test data for all 5 steps of the ETP creation wizard.
 * Provides complete and minimal data sets for different test scenarios.
 *
 * @issue #1228
 * @epic #1158
 */

/**
 * Step 1 (Identification) test data
 */
export const step1Data = {
  title: `E2E Wizard Test ETP ${Date.now()}`,
  orgaoEntidade: 'Secretaria Municipal de Tecnologia',
  uasg: '123456',
  unidadeDemandante: 'Departamento de Infraestrutura de TI',
  responsavelTecnicoNome: 'Joao Silva Santos',
  responsavelTecnicoMatricula: '12345',
  dataElaboracao: new Date().toISOString().split('T')[0], // YYYY-MM-DD format
};

/**
 * Step 2 (Object and Justification) test data
 */
export const step2Data = {
  objeto:
    'Contratacao de empresa especializada em servicos de desenvolvimento e manutencao de sistemas de tecnologia da informacao',
  descricaoDetalhada:
    'O objeto compreende a prestacao de servicos tecnicos especializados em desenvolvimento, manutencao corretiva, evolutiva e adaptativa de sistemas de informacao, incluindo suporte tecnico e documentacao.',
  quantidadeEstimada: 12,
  unidadeMedida: 'Meses',
  justificativaContratacao:
    'A contratacao se faz necessaria para atender as demandas crescentes de desenvolvimento e manutencao de sistemas criticos para a administracao publica, garantindo a continuidade dos servicos essenciais prestados a populacao.',
  necessidadeAtendida:
    'Modernizacao e otimizacao dos processos administrativos internos, alem de melhor atendimento ao cidadao atraves de sistemas digitais.',
  beneficiosEsperados:
    'Reducao de custos operacionais, maior eficiencia nos processos, melhor experiencia do usuario final.',
};

/**
 * Step 3 (Technical Requirements) test data
 */
export const step3Data = {
  requisitosTecnicos:
    'A empresa contratada devera possuir equipe tecnica qualificada, com experiencia comprovada em desenvolvimento de sistemas web utilizando tecnologias modernas como React, Node.js, TypeScript e bancos de dados PostgreSQL.',
  requisitosQualificacao:
    'Certificacao ISO 9001, equipe com certificacoes AWS ou Azure, experiencia minima de 5 anos no mercado.',
  criteriosSustentabilidade:
    'Utilizacao de infraestrutura em nuvem com certificacao de energia renovavel, politicas de reducao de consumo energetico.',
  garantiaExigida: '12 meses apos entrega final do sistema',
  prazoExecucao: 365,
};

/**
 * Step 4 (Cost Estimation) test data
 */
export const step4Data = {
  valorUnitario: 25000.0,
  valorEstimado: 300000.0,
  fontePesquisaPrecos:
    'Pesquisa de mercado realizada com 3 empresas do ramo, Portal de Compras Governamentais, Painel de Precos do ME.',
  dotacaoOrcamentaria: '2024.04.122.0001.2001.3390.39',
};

/**
 * Step 5 (Risk Analysis) test data
 */
export const step5Data = {
  nivelRisco: 'MEDIO' as const,
  descricaoRiscos:
    'Riscos identificados: possibilidade de atraso na entrega por complexidade tecnica, variacao cambial que pode impactar custos de ferramentas, rotatividade de profissionais da equipe.',
  description:
    'Este ETP foi elaborado seguindo as diretrizes da IN SEGES/ME no 40/2020 e tem por objetivo subsidiar a contratacao de servicos de TI para modernizacao dos sistemas internos.',
};

/**
 * Complete ETP data - all fields filled
 */
export const completeETPData = {
  step1: step1Data,
  step2: step2Data,
  step3: step3Data,
  step4: step4Data,
  step5: step5Data,
};

/**
 * Minimal ETP data - only required fields
 */
export const minimalETPData = {
  step1: {
    title: `Minimal ETP Test ${Date.now()}`,
    orgaoEntidade: '',
    uasg: '',
    unidadeDemandante: '',
    responsavelTecnicoNome: '',
    responsavelTecnicoMatricula: '',
    dataElaboracao: '',
  },
  step2: {
    objeto: 'Contratacao minima para teste E2E automatizado', // minimum 10 chars
    descricaoDetalhada: '',
    quantidadeEstimada: undefined,
    unidadeMedida: '',
    justificativaContratacao: '',
    necessidadeAtendida: '',
    beneficiosEsperados: '',
  },
  step3: {
    requisitosTecnicos: '',
    requisitosQualificacao: '',
    criteriosSustentabilidade: '',
    garantiaExigida: '',
    prazoExecucao: undefined,
  },
  step4: {
    valorUnitario: undefined,
    valorEstimado: undefined,
    fontePesquisaPrecos: '',
    dotacaoOrcamentaria: '',
  },
  step5: {
    nivelRisco: undefined,
    descricaoRiscos: '',
    description: '',
  },
};

/**
 * Invalid ETP data - for validation testing
 */
export const invalidETPData = {
  step1: {
    // Title too short (< 5 chars)
    titleTooShort: 'Test',
    // Title too long (> 200 chars)
    titleTooLong: 'A'.repeat(201),
    // Invalid UASG (not 6 digits)
    uasgInvalid: '12345', // only 5 digits
    uasgNonNumeric: 'ABCDEF',
  },
  step2: {
    // Objeto too short (< 10 chars)
    objetoTooShort: 'Short',
    // Objeto too long (> 500 chars)
    objetoTooLong: 'A'.repeat(501),
  },
  step4: {
    // Negative values
    valorNegativo: -1000,
  },
};

/**
 * ETP data for specific test scenarios
 */
export const scenarioData = {
  /**
   * ETP for TI/Software services
   */
  tiServices: {
    step1: {
      ...step1Data,
      title: 'Contratacao de Servicos de Desenvolvimento de Software',
    },
    step2: {
      ...step2Data,
      objeto:
        'Desenvolvimento de sistema web para gestao de processos administrativos',
    },
    step3: step3Data,
    step4: {
      ...step4Data,
      valorEstimado: 500000.0,
    },
    step5: step5Data,
  },

  /**
   * ETP for Construction/Infrastructure
   */
  obras: {
    step1: {
      ...step1Data,
      title: 'Construcao de Predio Administrativo',
      orgaoEntidade: 'Secretaria de Obras e Infraestrutura',
    },
    step2: {
      objeto:
        'Construcao de edificio de 3 andares para abrigar setores administrativos',
      descricaoDetalhada:
        'Construcao de predio com area total de 2.000m2, contemplando escritorios, salas de reuniao, recepcao e areas de servico.',
      quantidadeEstimada: 1,
      unidadeMedida: 'Unidade',
      justificativaContratacao:
        'Necessidade de espaco fisico adequado para atender o crescimento das demandas administrativas do municipio.',
      necessidadeAtendida:
        'Espaco fisico adequado para servidores e atendimento ao publico.',
      beneficiosEsperados:
        'Melhoria nas condicoes de trabalho e atendimento ao cidadao.',
    },
    step3: {
      requisitosTecnicos:
        'Empresa com registro no CREA, experiencia comprovada em obras publicas.',
      requisitosQualificacao:
        'Atestados de capacidade tecnica para obras similares.',
      criteriosSustentabilidade:
        'Utilizacao de materiais ecologicos, sistema de captacao de agua da chuva.',
      garantiaExigida: '5 anos para estrutura, 2 anos para acabamentos',
      prazoExecucao: 720,
    },
    step4: {
      valorUnitario: 0,
      valorEstimado: 8000000.0,
      fontePesquisaPrecos: 'SINAPI, orcamentos de empresas especializadas.',
      dotacaoOrcamentaria: '2024.15.451.0001.1001.4490.51',
    },
    step5: {
      nivelRisco: 'ALTO' as const,
      descricaoRiscos:
        'Variacao de precos de materiais, condicoes climaticas adversas.',
      description: 'ETP para licitacao de obra de construcao civil.',
    },
  },

  /**
   * ETP for Materials/Supplies
   */
  materiais: {
    step1: {
      ...step1Data,
      title: 'Aquisicao de Material de Escritorio',
      orgaoEntidade: 'Secretaria de Administracao',
    },
    step2: {
      objeto:
        'Aquisicao de materiais de escritorio para uso nas unidades administrativas',
      descricaoDetalhada:
        'Papel A4, canetas, lapis, borrachas, grampeadores e demais materiais.',
      quantidadeEstimada: 5000,
      unidadeMedida: 'Itens diversos',
      justificativaContratacao:
        'Necessidade de reposicao de estoque para funcionamento das unidades administrativas.',
      necessidadeAtendida:
        'Suprimento de materiais essenciais para as atividades diarias.',
      beneficiosEsperados: 'Continuidade das operacoes administrativas.',
    },
    step3: {
      requisitosTecnicos:
        'Materiais de primeira qualidade, com selo do INMETRO quando aplicavel.',
      requisitosQualificacao: '',
      criteriosSustentabilidade:
        'Preferencia por materiais reciclados ou reciclaveis.',
      garantiaExigida: 'Conforme fabricante',
      prazoExecucao: 30,
    },
    step4: {
      valorUnitario: 5.0,
      valorEstimado: 25000.0,
      fontePesquisaPrecos: 'Portal de Compras, cotacoes de fornecedores.',
      dotacaoOrcamentaria: '2024.04.122.0001.2001.3390.30',
    },
    step5: {
      nivelRisco: 'BAIXO' as const,
      descricaoRiscos: 'Variacao de precos de mercado.',
      description: 'ETP para registro de precos de material de consumo.',
    },
  },
};
