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

/**
 * Template-specific dynamic fields data for E2E tests
 * Issue #1241 - E2E tests for template-based ETP creation
 */
export const templateDynamicFieldsData = {
  /**
   * OBRAS template dynamic fields
   */
  OBRAS: {
    artRrt: 'ART-2024-001234567',
    memorialDescritivo:
      'Memorial descritivo completo para construcao de edificio de 3 andares com area total de 2000m2, incluindo especificacoes de materiais, acabamentos e sistemas prediais',
    cronogramaFisicoFinanceiro:
      'Fase 1: Fundacao (30 dias) - R$ 200.000\nFase 2: Estrutura (60 dias) - R$ 500.000\nFase 3: Acabamento (90 dias) - R$ 300.000',
    bdiReferencia: 25.5,
    projetoBasico: 'Projeto basico aprovado pelo CREA sob numero 2024/001',
    licencasAmbientais:
      'Licenca previa LP-2024-001 emitida pelo IBAMA em 15/03/2024',
  },

  /**
   * TI template dynamic fields
   */
  TI: {
    especificacoesTecnicas:
      'Sistema web responsivo desenvolvido em React e Node.js, com suporte a 10.000 usuarios simultaneos, tempo de resposta menor que 2 segundos, banco de dados PostgreSQL',
    nivelServico:
      'Disponibilidade 99.9%, Tempo de resposta para incidentes criticos menor que 4 horas, Backup diario com retencao de 30 dias',
    metodologiaTrabalho: 'agil',
    requisitosSeguranca:
      'Conformidade com ISO 27001, criptografia AES-256 para dados em repouso, TLS 1.3 para dados em transito, autenticacao multifator obrigatoria',
    integracaoSistemas:
      'Integracao via API REST com sistema de RH (SAP), SSO via SAML 2.0 com Active Directory',
    lgpdConformidade:
      'Consentimento explicito para coleta de dados pessoais, direito ao esquecimento implementado, DPO designado',
  },

  /**
   * SERVICOS template dynamic fields
   */
  SERVICOS: {
    produtividade:
      '100 m2/dia por servente para limpeza de pisos ceramicos, 50 m2/dia para limpeza de vidros externos',
    postosTrabalho: 15,
    frequenciaServico: 'Segunda a sexta, 8h as 18h, sabados das 8h as 12h',
    indicadoresDesempenho:
      'Taxa de satisfacao maior que 90%\nTempo de resposta para chamados menor que 4 horas\nAbsenteismo menor que 5%',
    uniformesEpi:
      'Uniforme completo (camisa, calca, sapato antiderrapante), luvas latex, mascara PFF2, oculos de protecao',
    convencaoColetiva:
      'Sindicato dos Trabalhadores em Limpeza e Conservacao de Sao Paulo - SINDELSERV',
  },

  /**
   * MATERIAIS template dynamic fields
   */
  MATERIAIS: {
    especificacoesTecnicas:
      'Notebook corporativo: Processador Intel Core i7 12a geracao ou superior, 16GB RAM DDR4 3200MHz, SSD NVMe 512GB, tela IPS 15.6 polegadas Full HD, webcam HD integrada',
    garantiaMinima:
      '36 meses contra defeitos de fabricacao com atendimento on-site',
    assistenciaTecnica:
      'Assistencia tecnica em ate 48 horas uteis para chamados em horario comercial, cobertura nacional on-site',
    catalogo: 'CATMAT 449052 - Microcomputador portatil notebook',
    normasAplicaveis:
      'ABNT NBR IEC 60950-1 (Seguranca), Energy Star (Eficiencia energetica), INMETRO',
    instalacaoTreinamento:
      'Instalacao e configuracao inicial inclusa no fornecimento, treinamento de 4 horas para ate 20 usuarios finais',
  },
};

/**
 * Template names as displayed in the UI
 */
export const templateNames = {
  OBRAS: 'Template para Obras de Engenharia',
  TI: 'Template para Contratacoes de TI',
  SERVICOS: 'Template para Servicos Continuos',
  MATERIAIS: 'Template para Aquisicao de Materiais e Bens',
};

/**
 * Template type labels as displayed in the UI
 */
export const templateTypeLabels = {
  OBRAS: 'Obras e Engenharia',
  TI: 'Tecnologia da Informacao',
  SERVICOS: 'Servicos Continuos',
  MATERIAIS: 'Materiais e Bens',
};
