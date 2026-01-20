/**
 * Types para Edital (Instrumento Convocatório de Licitação)
 *
 * Baseado em Lei 14.133/2021 (Nova Lei de Licitações)
 *
 * Issue #1280 - [Edital-d] Editor de edital no frontend
 * Milestone: M14 - Geração de Edital
 */

/**
 * Modalidade de licitação conforme Lei 14.133/2021 Art. 28
 */
export enum EditalModalidade {
  PREGAO = 'PREGAO',
  CONCORRENCIA = 'CONCORRENCIA',
  CONCURSO = 'CONCURSO',
  LEILAO = 'LEILAO',
  DIALOGO_COMPETITIVO = 'DIALOGO_COMPETITIVO',
}

/**
 * Tipo de contratação direta conforme Lei 14.133/2021 Arts. 74-75
 */
export enum EditalTipoContratacaoDireta {
  INEXIGIBILIDADE = 'INEXIGIBILIDADE',
  DISPENSA = 'DISPENSA',
}

/**
 * Critério de julgamento conforme Lei 14.133/2021 Art. 33
 */
export enum EditalCriterioJulgamento {
  MENOR_PRECO = 'MENOR_PRECO',
  MAIOR_DESCONTO = 'MAIOR_DESCONTO',
  MELHOR_TECNICA = 'MELHOR_TECNICA',
  TECNICA_PRECO = 'TECNICA_PRECO',
  MAIOR_LANCE = 'MAIOR_LANCE',
  MAIOR_RETORNO_ECONOMICO = 'MAIOR_RETORNO_ECONOMICO',
}

/**
 * Modo de disputa conforme Lei 14.133/2021 Art. 56
 */
export enum EditalModoDisputa {
  ABERTO = 'ABERTO',
  FECHADO = 'FECHADO',
  ABERTO_FECHADO = 'ABERTO_FECHADO',
}

/**
 * Status do Edital com workflow de aprovação
 */
export enum EditalStatus {
  DRAFT = 'draft',
  REVIEW = 'review',
  APPROVED = 'approved',
  PUBLISHED = 'published',
  SUSPENDED = 'suspended',
  REVOKED = 'revoked',
  CLOSED = 'closed',
  ARCHIVED = 'archived',
}

/**
 * Interface principal do Edital
 */
export interface Edital {
  id: string;

  // Relacionamentos
  etpId: string | null;
  termoReferenciaId: string | null;
  pesquisaPrecosId: string | null;
  organizationId: string;

  // Identificação (Art. 25, caput)
  numero: string;
  numeroProcesso: string | null;
  uasg: string | null;

  // Objeto (Art. 25, I)
  objeto: string;
  descricaoObjeto: string | null;

  // Modalidade e Tipo (Art. 25, II e III)
  modalidade: EditalModalidade | null;
  tipoContratacaoDireta: EditalTipoContratacaoDireta | null;
  criterioJulgamento: EditalCriterioJulgamento;
  modoDisputa: EditalModoDisputa;

  // Condições de participação (Art. 25, IV)
  condicoesParticipacao: string | null;
  exclusividadeMeEpp: boolean;
  valorLimiteMeEpp: string | null;
  cotaReservadaMeEpp: string | null;
  exigenciaConsorcio: string | null;

  // Requisitos de habilitação (Art. 25, V)
  requisitosHabilitacao: Record<string, unknown> | null;

  // Sanções (Art. 25, VI)
  sancoesAdministrativas: string | null;

  // Prazo de vigência (Art. 25, VII)
  prazoVigencia: number | null;
  possibilidadeProrrogacao: string | null;

  // Dotação orçamentária (Art. 25, VIII)
  dotacaoOrcamentaria: string | null;
  fonteRecursos: string | null;

  // Valores (Art. 25, IX)
  valorEstimado: string | null;
  sigiloOrcamento: boolean;

  // Prazos do processo
  prazos: Record<string, unknown> | null;
  dataSessaoPublica: Date | null;
  localSessaoPublica: string | null;

  // Cláusulas e anexos
  clausulas: Record<string, unknown> | null;
  anexos: Record<string, unknown> | null;

  // Informações adicionais
  fundamentacaoLegal: string | null;
  condicoesPagamento: string | null;
  garantiaContratual: string | null;
  reajusteContratual: string | null;
  localEntrega: string | null;
  sistemaEletronico: string | null;
  linkSistemaEletronico: string | null;

  // Metadados e controle
  status: EditalStatus;
  versao: number;
  observacoesInternas: string | null;
  dataPublicacao: Date | null;
  referenciaPublicacao: string | null;

  // Auditoria
  createdById: string;
  approvedById: string | null;
  approvedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;

  // Relacionamentos (quando eager loaded)
  etp?: unknown;
  termoReferencia?: unknown;
  pesquisaPrecos?: unknown;
  organization?: unknown;
  createdBy?: unknown;
  approvedBy?: unknown;
  contratos?: unknown[];
}

/**
 * DTO para atualização parcial de Edital
 */
export interface UpdateEditalDto {
  numero?: string;
  numeroProcesso?: string | null;
  uasg?: string | null;
  objeto?: string;
  descricaoObjeto?: string | null;
  modalidade?: EditalModalidade | null;
  tipoContratacaoDireta?: EditalTipoContratacaoDireta | null;
  criterioJulgamento?: EditalCriterioJulgamento;
  modoDisputa?: EditalModoDisputa;
  condicoesParticipacao?: string | null;
  exclusividadeMeEpp?: boolean;
  valorLimiteMeEpp?: string | null;
  cotaReservadaMeEpp?: string | null;
  exigenciaConsorcio?: string | null;
  requisitosHabilitacao?: Record<string, unknown> | null;
  sancoesAdministrativas?: string | null;
  prazoVigencia?: number | null;
  possibilidadeProrrogacao?: string | null;
  dotacaoOrcamentaria?: string | null;
  fonteRecursos?: string | null;
  valorEstimado?: string | null;
  sigiloOrcamento?: boolean;
  prazos?: Record<string, unknown> | null;
  dataSessaoPublica?: string | null; // ISO string
  localSessaoPublica?: string | null;
  clausulas?: Record<string, unknown> | null;
  anexos?: Record<string, unknown> | null;
  fundamentacaoLegal?: string | null;
  condicoesPagamento?: string | null;
  garantiaContratual?: string | null;
  reajusteContratual?: string | null;
  localEntrega?: string | null;
  sistemaEletronico?: string | null;
  linkSistemaEletronico?: string | null;
  observacoesInternas?: string | null;
}

/**
 * Seções editáveis do Edital para o editor
 */
export interface EditalSection {
  id: string;
  title: string;
  field: keyof Edital;
  type: 'text' | 'richtext' | 'textarea' | 'number' | 'date' | 'select' | 'boolean';
  required: boolean;
  helpText?: string;
  maxLength?: number;
}

/**
 * Seções padrão do editor de Edital
 */
export const EDITAL_SECTIONS: EditalSection[] = [
  {
    id: 'identificacao',
    title: '1. Identificação',
    field: 'numero',
    type: 'text',
    required: true,
    helpText: 'Número do edital (ex: 001/2024-PREGAO)',
    maxLength: 50,
  },
  {
    id: 'objeto',
    title: '2. Objeto da Licitação',
    field: 'objeto',
    type: 'richtext',
    required: true,
    helpText: 'Descrição clara e precisa do que será contratado (Art. 25, I)',
  },
  {
    id: 'modalidade',
    title: '3. Modalidade e Critério',
    field: 'modalidade',
    type: 'select',
    required: false,
    helpText: 'Modalidade de licitação (Art. 28)',
  },
  {
    id: 'condicoes',
    title: '4. Condições de Participação',
    field: 'condicoesParticipacao',
    type: 'richtext',
    required: false,
    helpText: 'Requisitos para participar da licitação (Art. 25, IV)',
  },
  {
    id: 'habilitacao',
    title: '5. Requisitos de Habilitação',
    field: 'requisitosHabilitacao',
    type: 'richtext',
    required: false,
    helpText: 'Documentação exigida para comprovar capacidade (Art. 25, V)',
  },
  {
    id: 'sancoes',
    title: '6. Sanções Administrativas',
    field: 'sancoesAdministrativas',
    type: 'richtext',
    required: false,
    helpText: 'Penalidades por inadimplemento (Art. 25, VI)',
  },
  {
    id: 'prazos',
    title: '7. Prazos e Vigência',
    field: 'prazoVigencia',
    type: 'number',
    required: false,
    helpText: 'Prazo de vigência do contrato em dias (Art. 25, VII)',
  },
  {
    id: 'orcamento',
    title: '8. Dotação Orçamentária',
    field: 'dotacaoOrcamentaria',
    type: 'text',
    required: false,
    helpText: 'Código da dotação no orçamento público (Art. 25, VIII)',
    maxLength: 100,
  },
  {
    id: 'valores',
    title: '9. Valores',
    field: 'valorEstimado',
    type: 'text',
    required: false,
    helpText: 'Valor estimado da contratação (Art. 25, IX)',
  },
  {
    id: 'clausulas',
    title: '10. Cláusulas Contratuais',
    field: 'clausulas',
    type: 'richtext',
    required: false,
    helpText: 'Cláusulas do contrato',
  },
  {
    id: 'anexos',
    title: '11. Anexos',
    field: 'anexos',
    type: 'richtext',
    required: false,
    helpText: 'Referências a arquivos anexos (TR, projetos, minuta)',
  },
];
