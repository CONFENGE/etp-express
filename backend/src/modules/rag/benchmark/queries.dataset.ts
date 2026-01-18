/**
 * RAG Benchmark Query Dataset
 *
 * Contains 200 queries for benchmarking the Hybrid RAG system:
 * - 50 simple queries (expected: embeddings)
 * - 50 complex queries (expected: pageindex)
 * - 50 legal queries (expected: pageindex)
 * - 50 mixed/ambiguous queries (expected: hybrid to decide)
 *
 * @see Issue #1596 - [RAG-1542e] Criar benchmark suite para Hybrid RAG
 * @see Issue #1542 - Hybrid RAG parent issue
 */

import { BenchmarkQuery, BenchmarkQueryType } from './benchmark.types';

/**
 * Simple queries - short, factual, no legal terms.
 * Expected path: embeddings (fast semantic search)
 */
export const SIMPLE_QUERIES: BenchmarkQuery[] = [
  // Product/item queries
  {
    id: 's01',
    query: 'preco de computador',
    type: 'simple',
    expectedPath: 'embeddings',
    expectedKeywords: ['computador', 'preco'],
  },
  {
    id: 's02',
    query: 'notebook para escritorio',
    type: 'simple',
    expectedPath: 'embeddings',
    expectedKeywords: ['notebook', 'escritorio'],
  },
  {
    id: 's03',
    query: 'cadeira ergonomica',
    type: 'simple',
    expectedPath: 'embeddings',
    expectedKeywords: ['cadeira', 'ergonomica'],
  },
  {
    id: 's04',
    query: 'mesa de trabalho',
    type: 'simple',
    expectedPath: 'embeddings',
    expectedKeywords: ['mesa', 'trabalho'],
  },
  {
    id: 's05',
    query: 'monitor led 24 polegadas',
    type: 'simple',
    expectedPath: 'embeddings',
    expectedKeywords: ['monitor', 'led'],
  },
  {
    id: 's06',
    query: 'impressora laser',
    type: 'simple',
    expectedPath: 'embeddings',
    expectedKeywords: ['impressora', 'laser'],
  },
  {
    id: 's07',
    query: 'papel A4 resma',
    type: 'simple',
    expectedPath: 'embeddings',
    expectedKeywords: ['papel', 'resma'],
  },
  {
    id: 's08',
    query: 'caneta esferografica',
    type: 'simple',
    expectedPath: 'embeddings',
    expectedKeywords: ['caneta'],
  },
  {
    id: 's09',
    query: 'grampeador de mesa',
    type: 'simple',
    expectedPath: 'embeddings',
    expectedKeywords: ['grampeador'],
  },
  {
    id: 's10',
    query: 'arquivo de aco',
    type: 'simple',
    expectedPath: 'embeddings',
    expectedKeywords: ['arquivo', 'aco'],
  },

  // Service queries
  {
    id: 's11',
    query: 'servico de limpeza',
    type: 'simple',
    expectedPath: 'embeddings',
    expectedKeywords: ['servico', 'limpeza'],
  },
  {
    id: 's12',
    query: 'manutencao de ar condicionado',
    type: 'simple',
    expectedPath: 'embeddings',
    expectedKeywords: ['manutencao', 'ar condicionado'],
  },
  {
    id: 's13',
    query: 'vigilancia patrimonial',
    type: 'simple',
    expectedPath: 'embeddings',
    expectedKeywords: ['vigilancia'],
  },
  {
    id: 's14',
    query: 'servico de transporte',
    type: 'simple',
    expectedPath: 'embeddings',
    expectedKeywords: ['transporte'],
  },
  {
    id: 's15',
    query: 'consultoria tecnica',
    type: 'simple',
    expectedPath: 'embeddings',
    expectedKeywords: ['consultoria', 'tecnica'],
  },
  {
    id: 's16',
    query: 'desenvolvimento de software',
    type: 'simple',
    expectedPath: 'embeddings',
    expectedKeywords: ['desenvolvimento', 'software'],
  },
  {
    id: 's17',
    query: 'suporte tecnico de TI',
    type: 'simple',
    expectedPath: 'embeddings',
    expectedKeywords: ['suporte', 'TI'],
  },
  {
    id: 's18',
    query: 'servico de alimentacao',
    type: 'simple',
    expectedPath: 'embeddings',
    expectedKeywords: ['alimentacao'],
  },
  {
    id: 's19',
    query: 'locacao de veiculos',
    type: 'simple',
    expectedPath: 'embeddings',
    expectedKeywords: ['locacao', 'veiculos'],
  },
  {
    id: 's20',
    query: 'seguro de frota',
    type: 'simple',
    expectedPath: 'embeddings',
    expectedKeywords: ['seguro', 'frota'],
  },

  // General procurement queries
  {
    id: 's21',
    query: 'material de expediente',
    type: 'simple',
    expectedPath: 'embeddings',
    expectedKeywords: ['material', 'expediente'],
  },
  {
    id: 's22',
    query: 'equipamento de informatica',
    type: 'simple',
    expectedPath: 'embeddings',
    expectedKeywords: ['equipamento', 'informatica'],
  },
  {
    id: 's23',
    query: 'mobiliario de escritorio',
    type: 'simple',
    expectedPath: 'embeddings',
    expectedKeywords: ['mobiliario', 'escritorio'],
  },
  {
    id: 's24',
    query: 'material de construcao',
    type: 'simple',
    expectedPath: 'embeddings',
    expectedKeywords: ['material', 'construcao'],
  },
  {
    id: 's25',
    query: 'equipamento medico',
    type: 'simple',
    expectedPath: 'embeddings',
    expectedKeywords: ['equipamento', 'medico'],
  },
  {
    id: 's26',
    query: 'material hospitalar',
    type: 'simple',
    expectedPath: 'embeddings',
    expectedKeywords: ['material', 'hospitalar'],
  },
  {
    id: 's27',
    query: 'uniformes para funcionarios',
    type: 'simple',
    expectedPath: 'embeddings',
    expectedKeywords: ['uniformes'],
  },
  {
    id: 's28',
    query: 'combustivel para veiculos',
    type: 'simple',
    expectedPath: 'embeddings',
    expectedKeywords: ['combustivel', 'veiculos'],
  },
  {
    id: 's29',
    query: 'licenca de software',
    type: 'simple',
    expectedPath: 'embeddings',
    expectedKeywords: ['licenca', 'software'],
  },
  {
    id: 's30',
    query: 'servidor de dados',
    type: 'simple',
    expectedPath: 'embeddings',
    expectedKeywords: ['servidor', 'dados'],
  },

  // Price/cost queries
  {
    id: 's31',
    query: 'quanto custa um projetor',
    type: 'simple',
    expectedPath: 'embeddings',
    expectedKeywords: ['projetor', 'custo'],
  },
  {
    id: 's32',
    query: 'valor de um switch de rede',
    type: 'simple',
    expectedPath: 'embeddings',
    expectedKeywords: ['switch', 'rede'],
  },
  {
    id: 's33',
    query: 'preco medio de toner',
    type: 'simple',
    expectedPath: 'embeddings',
    expectedKeywords: ['preco', 'toner'],
  },
  {
    id: 's34',
    query: 'custo de energia solar',
    type: 'simple',
    expectedPath: 'embeddings',
    expectedKeywords: ['energia', 'solar'],
  },
  {
    id: 's35',
    query: 'valor de ar condicionado split',
    type: 'simple',
    expectedPath: 'embeddings',
    expectedKeywords: ['ar condicionado', 'split'],
  },
  {
    id: 's36',
    query: 'preco de piso vinilico',
    type: 'simple',
    expectedPath: 'embeddings',
    expectedKeywords: ['piso', 'vinilico'],
  },
  {
    id: 's37',
    query: 'custo de pintura externa',
    type: 'simple',
    expectedPath: 'embeddings',
    expectedKeywords: ['pintura', 'externa'],
  },
  {
    id: 's38',
    query: 'valor de interfone',
    type: 'simple',
    expectedPath: 'embeddings',
    expectedKeywords: ['interfone'],
  },
  {
    id: 's39',
    query: 'preco de nobreak',
    type: 'simple',
    expectedPath: 'embeddings',
    expectedKeywords: ['nobreak'],
  },
  {
    id: 's40',
    query: 'custo de camera de seguranca',
    type: 'simple',
    expectedPath: 'embeddings',
    expectedKeywords: ['camera', 'seguranca'],
  },

  // Specification queries
  {
    id: 's41',
    query: 'especificacao de roteador wifi',
    type: 'simple',
    expectedPath: 'embeddings',
    expectedKeywords: ['roteador', 'wifi'],
  },
  {
    id: 's42',
    query: 'caracteristicas de HD externo',
    type: 'simple',
    expectedPath: 'embeddings',
    expectedKeywords: ['HD', 'externo'],
  },
  {
    id: 's43',
    query: 'capacidade de memoria RAM',
    type: 'simple',
    expectedPath: 'embeddings',
    expectedKeywords: ['memoria', 'RAM'],
  },
  {
    id: 's44',
    query: 'resolucao de webcam',
    type: 'simple',
    expectedPath: 'embeddings',
    expectedKeywords: ['webcam', 'resolucao'],
  },
  {
    id: 's45',
    query: 'potencia de gerador',
    type: 'simple',
    expectedPath: 'embeddings',
    expectedKeywords: ['gerador', 'potencia'],
  },
  {
    id: 's46',
    query: 'tamanho de quadro branco',
    type: 'simple',
    expectedPath: 'embeddings',
    expectedKeywords: ['quadro branco'],
  },
  {
    id: 's47',
    query: 'dimensoes de armario',
    type: 'simple',
    expectedPath: 'embeddings',
    expectedKeywords: ['armario', 'dimensoes'],
  },
  {
    id: 's48',
    query: 'capacidade de bebedouro',
    type: 'simple',
    expectedPath: 'embeddings',
    expectedKeywords: ['bebedouro'],
  },
  {
    id: 's49',
    query: 'velocidade de impressao',
    type: 'simple',
    expectedPath: 'embeddings',
    expectedKeywords: ['impressao', 'velocidade'],
  },
  {
    id: 's50',
    query: 'autonomia de bateria',
    type: 'simple',
    expectedPath: 'embeddings',
    expectedKeywords: ['bateria', 'autonomia'],
  },
];

/**
 * Complex queries - long, multi-entity, structured.
 * Expected path: pageindex (reasoning-based search)
 */
export const COMPLEX_QUERIES: BenchmarkQuery[] = [
  // Multi-requirement queries
  {
    id: 'c01',
    query:
      'preciso de um computador com processador intel i7, 16gb de ram, ssd de 512gb e placa de video dedicada para trabalhos de design grafico',
    type: 'complex',
    expectedPath: 'pageindex',
    expectedKeywords: ['computador', 'i7', 'ram', 'ssd', 'design'],
  },
  {
    id: 'c02',
    query:
      'necessito de um sistema de videoconferencia completo com camera PTZ, microfone de mesa, caixas de som e software de gerenciamento para sala de reunioes de 20 pessoas',
    type: 'complex',
    expectedPath: 'pageindex',
    expectedKeywords: [
      'videoconferencia',
      'camera',
      'microfone',
      'sala de reunioes',
    ],
  },
  {
    id: 'c03',
    query:
      'busco servico de manutencao predial que inclua limpeza, jardinagem, manutencao eletrica e hidraulica para um predio de 5 andares com 50 salas',
    type: 'complex',
    expectedPath: 'pageindex',
    expectedKeywords: [
      'manutencao',
      'predial',
      'limpeza',
      'eletrica',
      'hidraulica',
    ],
  },
  {
    id: 'c04',
    query:
      'preciso contratar servico de desenvolvimento de sistema web com frontend em react, backend em node.js, banco de dados postgresql e hospedagem em nuvem',
    type: 'complex',
    expectedPath: 'pageindex',
    expectedKeywords: [
      'desenvolvimento',
      'react',
      'node',
      'postgresql',
      'nuvem',
    ],
  },
  {
    id: 'c05',
    query:
      'necessito de mobiliario ergonomico para 100 estacoes de trabalho incluindo mesas regulaveis, cadeiras com apoio lombar e suportes para monitor',
    type: 'complex',
    expectedPath: 'pageindex',
    expectedKeywords: [
      'mobiliario',
      'ergonomico',
      'mesas',
      'cadeiras',
      'monitor',
    ],
  },

  // Comparative queries
  {
    id: 'c06',
    query:
      'qual a diferenca entre contratacao direta e licitacao tradicional em termos de prazo, documentacao e valor limite',
    type: 'complex',
    expectedPath: 'pageindex',
    expectedKeywords: [
      'contratacao direta',
      'licitacao',
      'prazo',
      'documentacao',
      'valor',
    ],
  },
  {
    id: 'c07',
    query:
      'compare os custos de aquisicao versus locacao de veiculos para frota de 20 carros por 5 anos incluindo manutencao e seguro',
    type: 'complex',
    expectedPath: 'pageindex',
    expectedKeywords: [
      'aquisicao',
      'locacao',
      'veiculos',
      'frota',
      'manutencao',
    ],
  },
  {
    id: 'c08',
    query:
      'quais as vantagens e desvantagens de sistema de gestao on-premise versus cloud computing considerando seguranca, custo e escalabilidade',
    type: 'complex',
    expectedPath: 'pageindex',
    expectedKeywords: [
      'on-premise',
      'cloud',
      'seguranca',
      'custo',
      'escalabilidade',
    ],
  },
  {
    id: 'c09',
    query:
      'analise comparativa entre diferentes modalidades de licitacao pregao eletronico, concorrencia e tomada de precos para contratacao de obras de engenharia',
    type: 'complex',
    expectedPath: 'pageindex',
    expectedKeywords: [
      'modalidades',
      'licitacao',
      'pregao',
      'concorrencia',
      'obras',
    ],
  },
  {
    id: 'c10',
    query:
      'diferenca entre contrato de prestacao de servicos continuados e contrato por escopo definido em termos de duracao, pagamento e fiscalizacao',
    type: 'complex',
    expectedPath: 'pageindex',
    expectedKeywords: [
      'contrato',
      'servicos continuados',
      'escopo',
      'fiscalizacao',
    ],
  },

  // Process/workflow queries
  {
    id: 'c11',
    query:
      'descreva o passo a passo completo para realizar uma contratacao de servicos de TI desde o planejamento ate a assinatura do contrato',
    type: 'complex',
    expectedPath: 'pageindex',
    expectedKeywords: [
      'passo a passo',
      'contratacao',
      'TI',
      'planejamento',
      'contrato',
    ],
  },
  {
    id: 'c12',
    query:
      'qual o fluxo de aprovacao para aquisicao de equipamentos acima de 100 mil reais incluindo autorizacoes necessarias e prazos',
    type: 'complex',
    expectedPath: 'pageindex',
    expectedKeywords: [
      'fluxo',
      'aprovacao',
      'aquisicao',
      'autorizacoes',
      'prazos',
    ],
  },
  {
    id: 'c13',
    query:
      'como elaborar um termo de referencia completo para contratacao de servico de limpeza terceirizada com todos os elementos obrigatorios',
    type: 'complex',
    expectedPath: 'pageindex',
    expectedKeywords: [
      'termo de referencia',
      'limpeza',
      'terceirizada',
      'elementos obrigatorios',
    ],
  },
  {
    id: 'c14',
    query:
      'processo de fiscalizacao de contrato de obras incluindo medicoes, diario de obra, acompanhamento de cronograma e recebimento provisorio e definitivo',
    type: 'complex',
    expectedPath: 'pageindex',
    expectedKeywords: [
      'fiscalizacao',
      'obras',
      'medicoes',
      'cronograma',
      'recebimento',
    ],
  },
  {
    id: 'c15',
    query:
      'etapas para realizacao de pesquisa de precos conforme IN 65/2021 utilizando multiplas fontes e metodologia de calculo do valor estimado',
    type: 'complex',
    expectedPath: 'pageindex',
    expectedKeywords: [
      'pesquisa de precos',
      'IN 65',
      'fontes',
      'metodologia',
      'valor estimado',
    ],
  },

  // Technical specification queries
  {
    id: 'c16',
    query:
      'especificacao tecnica detalhada para datacenter tier 3 incluindo infraestrutura eletrica, climatizacao, seguranca fisica e conectividade de rede',
    type: 'complex',
    expectedPath: 'pageindex',
    expectedKeywords: [
      'datacenter',
      'tier 3',
      'infraestrutura',
      'climatizacao',
      'seguranca',
    ],
  },
  {
    id: 'c17',
    query:
      'requisitos tecnicos para sistema de gestao de documentos eletronicos com assinatura digital, workflow, versionamento e integracao via API',
    type: 'complex',
    expectedPath: 'pageindex',
    expectedKeywords: [
      'gestao de documentos',
      'assinatura digital',
      'workflow',
      'API',
    ],
  },
  {
    id: 'c18',
    query:
      'especificacoes de infraestrutura de rede para edificio de 10 andares com wifi corporativo, cabeamento estruturado cat6 e central de telefonia IP',
    type: 'complex',
    expectedPath: 'pageindex',
    expectedKeywords: [
      'infraestrutura',
      'rede',
      'wifi',
      'cabeamento',
      'telefonia IP',
    ],
  },
  {
    id: 'c19',
    query:
      'requisitos de acessibilidade para sistema web conforme WCAG 2.1 nivel AA incluindo navegacao por teclado, leitores de tela e contraste',
    type: 'complex',
    expectedPath: 'pageindex',
    expectedKeywords: [
      'acessibilidade',
      'WCAG',
      'navegacao',
      'leitores de tela',
      'contraste',
    ],
  },
  {
    id: 'c20',
    query:
      'especificacao de sistema de backup e disaster recovery com RTO de 4 horas e RPO de 1 hora para ambiente de 50 servidores virtuais',
    type: 'complex',
    expectedPath: 'pageindex',
    expectedKeywords: [
      'backup',
      'disaster recovery',
      'RTO',
      'RPO',
      'servidores',
    ],
  },

  // Budget/planning queries
  {
    id: 'c21',
    query:
      'como elaborar um estudo tecnico preliminar para contratacao de servicos de cloud computing incluindo analise de alternativas e justificativa da solucao escolhida',
    type: 'complex',
    expectedPath: 'pageindex',
    expectedKeywords: [
      'estudo tecnico',
      'cloud computing',
      'alternativas',
      'justificativa',
    ],
  },
  {
    id: 'c22',
    query:
      'metodologia para estimativa de custos de projeto de desenvolvimento de software incluindo recursos humanos, infraestrutura e licencas',
    type: 'complex',
    expectedPath: 'pageindex',
    expectedKeywords: [
      'estimativa',
      'custos',
      'desenvolvimento',
      'software',
      'recursos',
    ],
  },
  {
    id: 'c23',
    query:
      'como realizar analise de riscos para contratacao de servicos criticos de TI incluindo identificacao, avaliacao e tratamento de riscos',
    type: 'complex',
    expectedPath: 'pageindex',
    expectedKeywords: [
      'analise de riscos',
      'contratacao',
      'TI',
      'avaliacao',
      'tratamento',
    ],
  },
  {
    id: 'c24',
    query:
      'planejamento de capacidade para infraestrutura de TI considerando crescimento projetado de 20% ao ano por 5 anos',
    type: 'complex',
    expectedPath: 'pageindex',
    expectedKeywords: [
      'planejamento',
      'capacidade',
      'infraestrutura',
      'crescimento',
    ],
  },
  {
    id: 'c25',
    query:
      'elaboracao de matriz de responsabilidades RACI para gestao de contrato de outsourcing de TI com multiplos servicos',
    type: 'complex',
    expectedPath: 'pageindex',
    expectedKeywords: ['matriz', 'RACI', 'gestao', 'contrato', 'outsourcing'],
  },

  // Integration/architecture queries
  {
    id: 'c26',
    query:
      'arquitetura de integracao entre sistema ERP, sistema de compras, portal de transparencia e e-SIC usando barramento de servicos',
    type: 'complex',
    expectedPath: 'pageindex',
    expectedKeywords: [
      'arquitetura',
      'integracao',
      'ERP',
      'compras',
      'barramento',
    ],
  },
  {
    id: 'c27',
    query:
      'requisitos de interoperabilidade para sistema de gestao de pessoas integrando com eSocial, SIAPE e sistema de ponto eletronico',
    type: 'complex',
    expectedPath: 'pageindex',
    expectedKeywords: [
      'interoperabilidade',
      'gestao de pessoas',
      'eSocial',
      'SIAPE',
      'ponto',
    ],
  },
  {
    id: 'c28',
    query:
      'especificacao de API RESTful para integracao de sistema de protocolo com outros orgaos incluindo autenticacao, versionamento e documentacao',
    type: 'complex',
    expectedPath: 'pageindex',
    expectedKeywords: [
      'API',
      'REST',
      'protocolo',
      'autenticacao',
      'documentacao',
    ],
  },
  {
    id: 'c29',
    query:
      'arquitetura de microsservicos para sistema de gestao de processos administrativos com alta disponibilidade e escalabilidade horizontal',
    type: 'complex',
    expectedPath: 'pageindex',
    expectedKeywords: [
      'microsservicos',
      'gestao de processos',
      'alta disponibilidade',
      'escalabilidade',
    ],
  },
  {
    id: 'c30',
    query:
      'modelo de governanca de dados para orgao publico incluindo classificacao, qualidade, privacidade e ciclo de vida dos dados',
    type: 'complex',
    expectedPath: 'pageindex',
    expectedKeywords: [
      'governanca',
      'dados',
      'classificacao',
      'privacidade',
      'ciclo de vida',
    ],
  },

  // Compliance/security queries
  {
    id: 'c31',
    query:
      'requisitos de seguranca da informacao para sistema que processa dados pessoais sensiveis conforme LGPD incluindo criptografia, auditoria e consentimento',
    type: 'complex',
    expectedPath: 'pageindex',
    expectedKeywords: [
      'seguranca',
      'LGPD',
      'dados pessoais',
      'criptografia',
      'auditoria',
    ],
  },
  {
    id: 'c32',
    query:
      'controles de seguranca para ambiente de nuvem publica conforme framework NIST CSF incluindo identificacao, protecao, deteccao, resposta e recuperacao',
    type: 'complex',
    expectedPath: 'pageindex',
    expectedKeywords: ['seguranca', 'nuvem', 'NIST', 'controles', 'framework'],
  },
  {
    id: 'c33',
    query:
      'politica de gestao de acessos para sistema critico incluindo segregacao de funcoes, revisao periodica e acesso privilegiado',
    type: 'complex',
    expectedPath: 'pageindex',
    expectedKeywords: [
      'gestao de acessos',
      'segregacao',
      'revisao',
      'acesso privilegiado',
    ],
  },
  {
    id: 'c34',
    query:
      'plano de continuidade de negocios para area de TI incluindo analise de impacto, estrategias de recuperacao e testes periodicos',
    type: 'complex',
    expectedPath: 'pageindex',
    expectedKeywords: [
      'continuidade',
      'negocios',
      'TI',
      'impacto',
      'recuperacao',
    ],
  },
  {
    id: 'c35',
    query:
      'requisitos de auditoria para sistema financeiro incluindo trilhas de auditoria, retencao de logs e relatorios de conformidade',
    type: 'complex',
    expectedPath: 'pageindex',
    expectedKeywords: [
      'auditoria',
      'financeiro',
      'trilhas',
      'logs',
      'conformidade',
    ],
  },

  // SLA/contract queries
  {
    id: 'c36',
    query:
      'definicao de SLA para servico de help desk com niveis de severidade, tempos de resposta e resolucao, e metricas de satisfacao',
    type: 'complex',
    expectedPath: 'pageindex',
    expectedKeywords: ['SLA', 'help desk', 'severidade', 'tempos', 'metricas'],
  },
  {
    id: 'c37',
    query:
      'modelo de remuneracao variavel para contrato de desenvolvimento agil baseado em pontos de funcao e velocity da equipe',
    type: 'complex',
    expectedPath: 'pageindex',
    expectedKeywords: [
      'remuneracao',
      'variavel',
      'desenvolvimento agil',
      'pontos de funcao',
      'velocity',
    ],
  },
  {
    id: 'c38',
    query:
      'clausulas essenciais para contrato de outsourcing de datacenter incluindo SLA, penalidades, transicao e propriedade intelectual',
    type: 'complex',
    expectedPath: 'pageindex',
    expectedKeywords: [
      'clausulas',
      'outsourcing',
      'datacenter',
      'SLA',
      'penalidades',
    ],
  },
  {
    id: 'c39',
    query:
      'metricas de desempenho para contrato de servicos de rede incluindo disponibilidade, latencia, perda de pacotes e tempo de resposta a incidentes',
    type: 'complex',
    expectedPath: 'pageindex',
    expectedKeywords: [
      'metricas',
      'desempenho',
      'rede',
      'disponibilidade',
      'latencia',
    ],
  },
  {
    id: 'c40',
    query:
      'modelo de transicao de servicos de TI entre fornecedores incluindo transferencia de conhecimento, dados e operacao',
    type: 'complex',
    expectedPath: 'pageindex',
    expectedKeywords: [
      'transicao',
      'servicos',
      'TI',
      'transferencia',
      'conhecimento',
    ],
  },

  // Evaluation/selection queries
  {
    id: 'c41',
    query:
      'criterios de avaliacao tecnica para selecao de solucao de ERP incluindo funcionalidades, integracao, usabilidade e suporte',
    type: 'complex',
    expectedPath: 'pageindex',
    expectedKeywords: [
      'avaliacao tecnica',
      'ERP',
      'funcionalidades',
      'integracao',
      'suporte',
    ],
  },
  {
    id: 'c42',
    query:
      'matriz de decisao para escolha entre desenvolvimento interno, aquisicao de pacote ou contratacao de fabrica de software',
    type: 'complex',
    expectedPath: 'pageindex',
    expectedKeywords: [
      'matriz de decisao',
      'desenvolvimento',
      'aquisicao',
      'fabrica de software',
    ],
  },
  {
    id: 'c43',
    query:
      'prova de conceito para validacao de solucao de inteligencia artificial incluindo criterios de aceite, dados de teste e metricas de avaliacao',
    type: 'complex',
    expectedPath: 'pageindex',
    expectedKeywords: [
      'prova de conceito',
      'inteligencia artificial',
      'criterios',
      'metricas',
    ],
  },
  {
    id: 'c44',
    query:
      'analise de TCO para solucao de virtualizacao comparando VMware, Hyper-V e KVM para ambiente de 100 servidores por 5 anos',
    type: 'complex',
    expectedPath: 'pageindex',
    expectedKeywords: ['TCO', 'virtualizacao', 'VMware', 'Hyper-V', 'KVM'],
  },
  {
    id: 'c45',
    query:
      'benchmark de desempenho para selecao de banco de dados incluindo throughput, latencia, escalabilidade e recursos de alta disponibilidade',
    type: 'complex',
    expectedPath: 'pageindex',
    expectedKeywords: [
      'benchmark',
      'banco de dados',
      'throughput',
      'latencia',
      'escalabilidade',
    ],
  },

  // Project management queries
  {
    id: 'c46',
    query:
      'estrutura analitica de projeto para implantacao de sistema de gestao integrada incluindo fases, entregas e marcos',
    type: 'complex',
    expectedPath: 'pageindex',
    expectedKeywords: [
      'EAP',
      'estrutura analitica',
      'implantacao',
      'fases',
      'entregas',
    ],
  },
  {
    id: 'c47',
    query:
      'modelo de gestao de mudancas para projeto de transformacao digital incluindo avaliacao de impacto, comunicacao e treinamento',
    type: 'complex',
    expectedPath: 'pageindex',
    expectedKeywords: [
      'gestao de mudancas',
      'transformacao digital',
      'impacto',
      'comunicacao',
    ],
  },
  {
    id: 'c48',
    query:
      'plano de comunicacao para projeto de implantacao de novo sistema com stakeholders internos e externos',
    type: 'complex',
    expectedPath: 'pageindex',
    expectedKeywords: ['plano de comunicacao', 'implantacao', 'stakeholders'],
  },
  {
    id: 'c49',
    query:
      'criterios de aceitacao para entrega de sistema desenvolvido sob demanda incluindo testes funcionais, nao funcionais e de integracao',
    type: 'complex',
    expectedPath: 'pageindex',
    expectedKeywords: [
      'criterios de aceitacao',
      'testes',
      'funcionais',
      'integracao',
    ],
  },
  {
    id: 'c50',
    query:
      'modelo de governanca para programa de modernizacao de TI com multiplos projetos paralelos e interdependencias',
    type: 'complex',
    expectedPath: 'pageindex',
    expectedKeywords: [
      'governanca',
      'modernizacao',
      'TI',
      'projetos',
      'interdependencias',
    ],
  },
];

/**
 * Legal queries - contain legal terminology and references.
 * Expected path: pageindex (accurate legal interpretation)
 */
export const LEGAL_QUERIES: BenchmarkQuery[] = [
  // Law references
  {
    id: 'l01',
    query: 'artigo 75 da lei 14133',
    type: 'legal',
    expectedPath: 'pageindex',
    expectedKeywords: ['artigo 75', 'lei 14133', 'dispensa'],
  },
  {
    id: 'l02',
    query: 'inciso II do artigo 74 da lei 14.133/2021',
    type: 'legal',
    expectedPath: 'pageindex',
    expectedKeywords: ['inciso II', 'artigo 74', 'inexigibilidade'],
  },
  {
    id: 'l03',
    query: 'paragrafo unico do art. 95 da nova lei de licitacoes',
    type: 'legal',
    expectedPath: 'pageindex',
    expectedKeywords: ['paragrafo unico', 'art. 95', 'contrato'],
  },
  {
    id: 'l04',
    query: 'alinea a do inciso IV do artigo 75 lei 14133',
    type: 'legal',
    expectedPath: 'pageindex',
    expectedKeywords: ['alinea a', 'inciso IV', 'dispensa'],
  },
  {
    id: 'l05',
    query: 'decreto 10.024/2019 pregao eletronico',
    type: 'legal',
    expectedPath: 'pageindex',
    expectedKeywords: ['decreto 10.024', 'pregao eletronico'],
  },
  {
    id: 'l06',
    query: 'IN SEGES/ME 65/2021 pesquisa de precos',
    type: 'legal',
    expectedPath: 'pageindex',
    expectedKeywords: ['IN SEGES', '65/2021', 'pesquisa de precos'],
  },
  {
    id: 'l07',
    query: 'artigo 3 da lei 8666 principios',
    type: 'legal',
    expectedPath: 'pageindex',
    expectedKeywords: ['artigo 3', 'lei 8666', 'principios'],
  },
  {
    id: 'l08',
    query: 'lei 10520 pregao presencial e eletronico',
    type: 'legal',
    expectedPath: 'pageindex',
    expectedKeywords: ['lei 10520', 'pregao'],
  },
  {
    id: 'l09',
    query: 'lei 13303/2016 estatais regime de licitacao',
    type: 'legal',
    expectedPath: 'pageindex',
    expectedKeywords: ['lei 13303', 'estatais', 'licitacao'],
  },
  {
    id: 'l10',
    query: 'resolucao CNJ 182/2013 contratacao de TI',
    type: 'legal',
    expectedPath: 'pageindex',
    expectedKeywords: ['resolucao CNJ', '182/2013', 'TI'],
  },

  // TCU/TCE references
  {
    id: 'l11',
    query: 'sumula 247 do TCU licitacao',
    type: 'legal',
    expectedPath: 'pageindex',
    expectedKeywords: ['sumula 247', 'TCU'],
  },
  {
    id: 'l12',
    query: 'acordao 2622/2015 TCU Plenario servicos de TI',
    type: 'legal',
    expectedPath: 'pageindex',
    expectedKeywords: ['acordao 2622', 'TCU', 'TI'],
  },
  {
    id: 'l13',
    query: 'jurisprudencia TCE-SP sobre dispensa de licitacao',
    type: 'legal',
    expectedPath: 'pageindex',
    expectedKeywords: ['jurisprudencia', 'TCE-SP', 'dispensa'],
  },
  {
    id: 'l14',
    query: 'entendimento TCU sobre sobrepreco em contratos',
    type: 'legal',
    expectedPath: 'pageindex',
    expectedKeywords: ['TCU', 'sobrepreco', 'contratos'],
  },
  {
    id: 'l15',
    query: 'decisao TCU sobre fracionamento de despesas',
    type: 'legal',
    expectedPath: 'pageindex',
    expectedKeywords: ['TCU', 'fracionamento', 'despesas'],
  },
  {
    id: 'l16',
    query: 'orientacao CGU sobre gestao de riscos',
    type: 'legal',
    expectedPath: 'pageindex',
    expectedKeywords: ['CGU', 'gestao de riscos'],
  },
  {
    id: 'l17',
    query: 'parecer AGU sobre contratacao emergencial',
    type: 'legal',
    expectedPath: 'pageindex',
    expectedKeywords: ['AGU', 'contratacao emergencial'],
  },
  {
    id: 'l18',
    query: 'sumula TCE sobre aditivos contratuais',
    type: 'legal',
    expectedPath: 'pageindex',
    expectedKeywords: ['sumula', 'TCE', 'aditivos'],
  },
  {
    id: 'l19',
    query: 'entendimento TCU sobre pregao para servicos tecnicos',
    type: 'legal',
    expectedPath: 'pageindex',
    expectedKeywords: ['TCU', 'pregao', 'servicos tecnicos'],
  },
  {
    id: 'l20',
    query: 'acordao TCU sobre terceirizacao de mao de obra',
    type: 'legal',
    expectedPath: 'pageindex',
    expectedKeywords: ['acordao', 'TCU', 'terceirizacao'],
  },

  // Procurement terms
  {
    id: 'l21',
    query: 'hipoteses de dispensa de licitacao lei 14133',
    type: 'legal',
    expectedPath: 'pageindex',
    expectedKeywords: ['dispensa', 'licitacao', 'lei 14133'],
  },
  {
    id: 'l22',
    query: 'requisitos de inexigibilidade de licitacao',
    type: 'legal',
    expectedPath: 'pageindex',
    expectedKeywords: ['inexigibilidade', 'licitacao', 'requisitos'],
  },
  {
    id: 'l23',
    query: 'contratacao direta por dispensa em razao do valor',
    type: 'legal',
    expectedPath: 'pageindex',
    expectedKeywords: ['contratacao direta', 'dispensa', 'valor'],
  },
  {
    id: 'l24',
    query: 'credenciamento como forma de contratacao publica',
    type: 'legal',
    expectedPath: 'pageindex',
    expectedKeywords: ['credenciamento', 'contratacao publica'],
  },
  {
    id: 'l25',
    query: 'sistema de registro de precos ata vigencia',
    type: 'legal',
    expectedPath: 'pageindex',
    expectedKeywords: ['registro de precos', 'ata', 'vigencia'],
  },
  {
    id: 'l26',
    query: 'modalidades licitatorias da nova lei de licitacoes',
    type: 'legal',
    expectedPath: 'pageindex',
    expectedKeywords: ['modalidades', 'licitatorias', 'nova lei'],
  },
  {
    id: 'l27',
    query: 'pregao eletronico para servicos comuns de engenharia',
    type: 'legal',
    expectedPath: 'pageindex',
    expectedKeywords: ['pregao eletronico', 'servicos comuns', 'engenharia'],
  },
  {
    id: 'l28',
    query: 'dialogo competitivo lei 14133',
    type: 'legal',
    expectedPath: 'pageindex',
    expectedKeywords: ['dialogo competitivo', 'lei 14133'],
  },
  {
    id: 'l29',
    query: 'concurso para selecao de projeto tecnico',
    type: 'legal',
    expectedPath: 'pageindex',
    expectedKeywords: ['concurso', 'selecao', 'projeto tecnico'],
  },
  {
    id: 'l30',
    query: 'leilao para alienacao de bens inservveis',
    type: 'legal',
    expectedPath: 'pageindex',
    expectedKeywords: ['leilao', 'alienacao', 'bens'],
  },

  // Contract terms
  {
    id: 'l31',
    query: 'clausulas exorbitantes em contratos administrativos',
    type: 'legal',
    expectedPath: 'pageindex',
    expectedKeywords: ['clausulas exorbitantes', 'contratos administrativos'],
  },
  {
    id: 'l32',
    query: 'equilibrio economico-financeiro do contrato',
    type: 'legal',
    expectedPath: 'pageindex',
    expectedKeywords: ['equilibrio economico-financeiro', 'contrato'],
  },
  {
    id: 'l33',
    query: 'prorrogacao de contrato de servico continuado',
    type: 'legal',
    expectedPath: 'pageindex',
    expectedKeywords: ['prorrogacao', 'contrato', 'servico continuado'],
  },
  {
    id: 'l34',
    query: 'aditivo contratual limite de 25%',
    type: 'legal',
    expectedPath: 'pageindex',
    expectedKeywords: ['aditivo', 'contratual', 'limite', '25%'],
  },
  {
    id: 'l35',
    query: 'rescisao contratual por interesse publico',
    type: 'legal',
    expectedPath: 'pageindex',
    expectedKeywords: ['rescisao', 'contratual', 'interesse publico'],
  },
  {
    id: 'l36',
    query: 'aplicacao de sancoes contratuais advertencia multa suspensao',
    type: 'legal',
    expectedPath: 'pageindex',
    expectedKeywords: ['sancoes', 'advertencia', 'multa', 'suspensao'],
  },
  {
    id: 'l37',
    query: 'subcontratacao parcial do objeto contratado',
    type: 'legal',
    expectedPath: 'pageindex',
    expectedKeywords: ['subcontratacao', 'parcial', 'objeto'],
  },
  {
    id: 'l38',
    query: 'garantia contratual modalidades e percentuais',
    type: 'legal',
    expectedPath: 'pageindex',
    expectedKeywords: ['garantia', 'contratual', 'modalidades', 'percentuais'],
  },
  {
    id: 'l39',
    query: 'recebimento provisorio e definitivo do objeto',
    type: 'legal',
    expectedPath: 'pageindex',
    expectedKeywords: ['recebimento', 'provisorio', 'definitivo'],
  },
  {
    id: 'l40',
    query: 'extincao do contrato administrativo hipoteses',
    type: 'legal',
    expectedPath: 'pageindex',
    expectedKeywords: ['extincao', 'contrato', 'administrativo', 'hipoteses'],
  },

  // Compliance/audit terms
  {
    id: 'l41',
    query: 'superfaturamento e sobrepreco diferenca conceitual',
    type: 'legal',
    expectedPath: 'pageindex',
    expectedKeywords: ['superfaturamento', 'sobrepreco', 'diferenca'],
  },
  {
    id: 'l42',
    query: 'direcionamento de licitacao caracterizacao',
    type: 'legal',
    expectedPath: 'pageindex',
    expectedKeywords: ['direcionamento', 'licitacao', 'caracterizacao'],
  },
  {
    id: 'l43',
    query: 'responsabilizacao do gestor por irregularidades',
    type: 'legal',
    expectedPath: 'pageindex',
    expectedKeywords: ['responsabilizacao', 'gestor', 'irregularidades'],
  },
  {
    id: 'l44',
    query: 'jogo de planilha em licitacao de obras',
    type: 'legal',
    expectedPath: 'pageindex',
    expectedKeywords: ['jogo de planilha', 'licitacao', 'obras'],
  },
  {
    id: 'l45',
    query: 'conluio entre licitantes cartel em licitacoes',
    type: 'legal',
    expectedPath: 'pageindex',
    expectedKeywords: ['conluio', 'licitantes', 'cartel'],
  },
  {
    id: 'l46',
    query: 'improbidade administrativa em licitacoes',
    type: 'legal',
    expectedPath: 'pageindex',
    expectedKeywords: ['improbidade', 'administrativa', 'licitacoes'],
  },
  {
    id: 'l47',
    query: 'tomada de contas especial TCU',
    type: 'legal',
    expectedPath: 'pageindex',
    expectedKeywords: ['tomada de contas', 'especial', 'TCU'],
  },
  {
    id: 'l48',
    query: 'dano ao erario ressarcimento',
    type: 'legal',
    expectedPath: 'pageindex',
    expectedKeywords: ['dano ao erario', 'ressarcimento'],
  },
  {
    id: 'l49',
    query: 'prescricao de irregularidades em licitacao',
    type: 'legal',
    expectedPath: 'pageindex',
    expectedKeywords: ['prescricao', 'irregularidades', 'licitacao'],
  },
  {
    id: 'l50',
    query: 'compliance em contratacoes publicas programa de integridade',
    type: 'legal',
    expectedPath: 'pageindex',
    expectedKeywords: ['compliance', 'contratacoes', 'programa de integridade'],
  },
];

/**
 * Mixed/ambiguous queries - could go either way.
 * Expected path: hybrid (let the system decide)
 */
export const MIXED_QUERIES: BenchmarkQuery[] = [
  // Semi-technical queries
  {
    id: 'm01',
    query: 'como fazer pesquisa de preco para computador',
    type: 'mixed',
    expectedPath: 'hybrid',
    expectedKeywords: ['pesquisa de preco', 'computador'],
  },
  {
    id: 'm02',
    query: 'posso comprar direto do fornecedor sem licitar',
    type: 'mixed',
    expectedPath: 'hybrid',
    expectedKeywords: ['comprar', 'direto', 'licitar'],
  },
  {
    id: 'm03',
    query: 'valor maximo para dispensa de licitacao',
    type: 'mixed',
    expectedPath: 'hybrid',
    expectedKeywords: ['valor', 'maximo', 'dispensa'],
  },
  {
    id: 'm04',
    query: 'prazo para entrega de material de informatica',
    type: 'mixed',
    expectedPath: 'hybrid',
    expectedKeywords: ['prazo', 'entrega', 'informatica'],
  },
  {
    id: 'm05',
    query: 'como justificar a escolha de fornecedor unico',
    type: 'mixed',
    expectedPath: 'hybrid',
    expectedKeywords: ['justificar', 'fornecedor unico'],
  },
  {
    id: 'm06',
    query: 'quando usar pregao ou dispensa para TI',
    type: 'mixed',
    expectedPath: 'hybrid',
    expectedKeywords: ['pregao', 'dispensa', 'TI'],
  },
  {
    id: 'm07',
    query: 'diferenca entre servico comum e servico tecnico',
    type: 'mixed',
    expectedPath: 'hybrid',
    expectedKeywords: ['servico comum', 'servico tecnico'],
  },
  {
    id: 'm08',
    query: 'posso contratar empresa que ja prestou servico antes',
    type: 'mixed',
    expectedPath: 'hybrid',
    expectedKeywords: ['contratar', 'empresa', 'servico'],
  },
  {
    id: 'm09',
    query: 'como definir o preco de referencia para licitacao',
    type: 'mixed',
    expectedPath: 'hybrid',
    expectedKeywords: ['preco de referencia', 'licitacao'],
  },
  {
    id: 'm10',
    query: 'quantos orcamentos preciso para compra direta',
    type: 'mixed',
    expectedPath: 'hybrid',
    expectedKeywords: ['orcamentos', 'compra direta'],
  },

  // Process/procedure queries
  {
    id: 'm11',
    query: 'o que precisa constar no termo de referencia',
    type: 'mixed',
    expectedPath: 'hybrid',
    expectedKeywords: ['termo de referencia', 'constar'],
  },
  {
    id: 'm12',
    query: 'quem assina o contrato de compra',
    type: 'mixed',
    expectedPath: 'hybrid',
    expectedKeywords: ['assina', 'contrato', 'compra'],
  },
  {
    id: 'm13',
    query: 'como fiscalizar um contrato de servico',
    type: 'mixed',
    expectedPath: 'hybrid',
    expectedKeywords: ['fiscalizar', 'contrato', 'servico'],
  },
  {
    id: 'm14',
    query: 'posso prorrogar contrato de locacao de equipamento',
    type: 'mixed',
    expectedPath: 'hybrid',
    expectedKeywords: ['prorrogar', 'contrato', 'locacao'],
  },
  {
    id: 'm15',
    query: 'como aplicar multa em fornecedor que atrasou',
    type: 'mixed',
    expectedPath: 'hybrid',
    expectedKeywords: ['multa', 'fornecedor', 'atrasou'],
  },
  {
    id: 'm16',
    query: 'documentos necessarios para participar de pregao',
    type: 'mixed',
    expectedPath: 'hybrid',
    expectedKeywords: ['documentos', 'participar', 'pregao'],
  },
  {
    id: 'm17',
    query: 'como receber material comprado pela administracao',
    type: 'mixed',
    expectedPath: 'hybrid',
    expectedKeywords: ['receber', 'material', 'administracao'],
  },
  {
    id: 'm18',
    query: 'o que fazer quando fornecedor nao entrega',
    type: 'mixed',
    expectedPath: 'hybrid',
    expectedKeywords: ['fornecedor', 'nao entrega'],
  },
  {
    id: 'm19',
    query: 'posso alterar especificacao apos contratado',
    type: 'mixed',
    expectedPath: 'hybrid',
    expectedKeywords: ['alterar', 'especificacao', 'contratado'],
  },
  {
    id: 'm20',
    query: 'como cancelar uma licitacao em andamento',
    type: 'mixed',
    expectedPath: 'hybrid',
    expectedKeywords: ['cancelar', 'licitacao', 'andamento'],
  },

  // Cost/price queries
  {
    id: 'm21',
    query: 'como calcular o valor estimado da contratacao',
    type: 'mixed',
    expectedPath: 'hybrid',
    expectedKeywords: ['calcular', 'valor estimado', 'contratacao'],
  },
  {
    id: 'm22',
    query: 'posso usar preco de ata de registro como referencia',
    type: 'mixed',
    expectedPath: 'hybrid',
    expectedKeywords: ['preco', 'ata de registro', 'referencia'],
  },
  {
    id: 'm23',
    query: 'quando o preco do fornecedor esta acima do mercado',
    type: 'mixed',
    expectedPath: 'hybrid',
    expectedKeywords: ['preco', 'fornecedor', 'mercado'],
  },
  {
    id: 'm24',
    query: 'como pedir desconto ao fornecedor vencedor',
    type: 'mixed',
    expectedPath: 'hybrid',
    expectedKeywords: ['desconto', 'fornecedor', 'vencedor'],
  },
  {
    id: 'm25',
    query: 'o que considerar no custo total de propriedade',
    type: 'mixed',
    expectedPath: 'hybrid',
    expectedKeywords: ['custo total', 'propriedade'],
  },
  {
    id: 'm26',
    query: 'como reajustar preco de contrato de servico',
    type: 'mixed',
    expectedPath: 'hybrid',
    expectedKeywords: ['reajustar', 'preco', 'contrato'],
  },
  {
    id: 'm27',
    query: 'posso negociar preco depois do pregao',
    type: 'mixed',
    expectedPath: 'hybrid',
    expectedKeywords: ['negociar', 'preco', 'pregao'],
  },
  {
    id: 'm28',
    query: 'como fazer orcamento para licitacao de obras',
    type: 'mixed',
    expectedPath: 'hybrid',
    expectedKeywords: ['orcamento', 'licitacao', 'obras'],
  },
  {
    id: 'm29',
    query: 'quando usar SINAPI ou SICRO como referencia',
    type: 'mixed',
    expectedPath: 'hybrid',
    expectedKeywords: ['SINAPI', 'SICRO', 'referencia'],
  },
  {
    id: 'm30',
    query: 'como comparar precos de diferentes fornecedores',
    type: 'mixed',
    expectedPath: 'hybrid',
    expectedKeywords: ['comparar', 'precos', 'fornecedores'],
  },

  // Specification/requirement queries
  {
    id: 'm31',
    query: 'como especificar computador sem direcionar marca',
    type: 'mixed',
    expectedPath: 'hybrid',
    expectedKeywords: ['especificar', 'computador', 'marca'],
  },
  {
    id: 'm32',
    query: 'posso exigir certificacao ISO do fornecedor',
    type: 'mixed',
    expectedPath: 'hybrid',
    expectedKeywords: ['certificacao', 'ISO', 'fornecedor'],
  },
  {
    id: 'm33',
    query: 'como definir qualificacao tecnica minima',
    type: 'mixed',
    expectedPath: 'hybrid',
    expectedKeywords: ['qualificacao', 'tecnica', 'minima'],
  },
  {
    id: 'm34',
    query: 'criterios para avaliar proposta tecnica',
    type: 'mixed',
    expectedPath: 'hybrid',
    expectedKeywords: ['criterios', 'avaliar', 'proposta tecnica'],
  },
  {
    id: 'm35',
    query: 'quando exigir amostra do produto',
    type: 'mixed',
    expectedPath: 'hybrid',
    expectedKeywords: ['exigir', 'amostra', 'produto'],
  },
  {
    id: 'm36',
    query: 'como descrever servico de desenvolvimento de software',
    type: 'mixed',
    expectedPath: 'hybrid',
    expectedKeywords: ['descrever', 'servico', 'desenvolvimento'],
  },
  {
    id: 'm37',
    query: 'posso pedir garantia estendida em equipamentos',
    type: 'mixed',
    expectedPath: 'hybrid',
    expectedKeywords: ['garantia', 'estendida', 'equipamentos'],
  },
  {
    id: 'm38',
    query: 'requisitos de acessibilidade para sistema web',
    type: 'mixed',
    expectedPath: 'hybrid',
    expectedKeywords: ['requisitos', 'acessibilidade', 'sistema'],
  },
  {
    id: 'm39',
    query: 'como especificar nivel de servico SLA',
    type: 'mixed',
    expectedPath: 'hybrid',
    expectedKeywords: ['especificar', 'SLA', 'nivel de servico'],
  },
  {
    id: 'm40',
    query: 'critrios para homologacao de fornecedor',
    type: 'mixed',
    expectedPath: 'hybrid',
    expectedKeywords: ['criterios', 'homologacao', 'fornecedor'],
  },

  // General/mixed context queries
  {
    id: 'm41',
    query: 'melhores praticas para contratacao de TI no setor publico',
    type: 'mixed',
    expectedPath: 'hybrid',
    expectedKeywords: [
      'melhores praticas',
      'contratacao',
      'TI',
      'setor publico',
    ],
  },
  {
    id: 'm42',
    query: 'problemas comuns em licitacao de servicos',
    type: 'mixed',
    expectedPath: 'hybrid',
    expectedKeywords: ['problemas', 'licitacao', 'servicos'],
  },
  {
    id: 'm43',
    query: 'como evitar atrasos na entrega de projetos',
    type: 'mixed',
    expectedPath: 'hybrid',
    expectedKeywords: ['evitar', 'atrasos', 'entrega', 'projetos'],
  },
  {
    id: 'm44',
    query: 'o que avaliar na proposta de empresa de software',
    type: 'mixed',
    expectedPath: 'hybrid',
    expectedKeywords: ['avaliar', 'proposta', 'empresa', 'software'],
  },
  {
    id: 'm45',
    query: 'riscos na contratacao de servicos em nuvem',
    type: 'mixed',
    expectedPath: 'hybrid',
    expectedKeywords: ['riscos', 'contratacao', 'nuvem'],
  },
  {
    id: 'm46',
    query: 'como garantir qualidade do servico contratado',
    type: 'mixed',
    expectedPath: 'hybrid',
    expectedKeywords: ['garantir', 'qualidade', 'servico'],
  },
  {
    id: 'm47',
    query: 'vantagens e desvantagens de locacao de equipamento',
    type: 'mixed',
    expectedPath: 'hybrid',
    expectedKeywords: ['vantagens', 'desvantagens', 'locacao'],
  },
  {
    id: 'm48',
    query: 'como planejar aquisicoes para o proximo ano',
    type: 'mixed',
    expectedPath: 'hybrid',
    expectedKeywords: ['planejar', 'aquisicoes', 'proximo ano'],
  },
  {
    id: 'm49',
    query: 'tendencias em contratacoes publicas de tecnologia',
    type: 'mixed',
    expectedPath: 'hybrid',
    expectedKeywords: ['tendencias', 'contratacoes', 'tecnologia'],
  },
  {
    id: 'm50',
    query: 'sustentabilidade em compras governamentais',
    type: 'mixed',
    expectedPath: 'hybrid',
    expectedKeywords: ['sustentabilidade', 'compras', 'governamentais'],
  },
];

/**
 * Complete benchmark dataset with all 200 queries.
 */
export const BENCHMARK_DATASET: BenchmarkQuery[] = [
  ...SIMPLE_QUERIES,
  ...COMPLEX_QUERIES,
  ...LEGAL_QUERIES,
  ...MIXED_QUERIES,
];

/**
 * Get queries by type.
 *
 * @param type - Query type to filter
 * @returns Array of queries of the specified type
 */
export function getQueriesByType(type: BenchmarkQueryType): BenchmarkQuery[] {
  switch (type) {
    case 'simple':
      return SIMPLE_QUERIES;
    case 'complex':
      return COMPLEX_QUERIES;
    case 'legal':
      return LEGAL_QUERIES;
    case 'mixed':
      return MIXED_QUERIES;
    default:
      return [];
  }
}

/**
 * Get a subset of the dataset for quick testing.
 *
 * @param queriesPerType - Number of queries per type (default: 5)
 * @returns Subset of the benchmark dataset
 */
export function getTestSubset(queriesPerType = 5): BenchmarkQuery[] {
  return [
    ...SIMPLE_QUERIES.slice(0, queriesPerType),
    ...COMPLEX_QUERIES.slice(0, queriesPerType),
    ...LEGAL_QUERIES.slice(0, queriesPerType),
    ...MIXED_QUERIES.slice(0, queriesPerType),
  ];
}

/**
 * Get random queries from the dataset.
 *
 * @param count - Number of queries to select
 * @returns Array of randomly selected queries
 */
export function getRandomQueries(count: number): BenchmarkQuery[] {
  const shuffled = [...BENCHMARK_DATASET].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}
