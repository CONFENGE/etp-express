/**
 * PNCP API Types
 *
 * Type definitions for Portal Nacional de Contratações Públicas API.
 * Based on Manual das APIs de Consultas PNCP v1.0
 *
 * @module modules/gov-api/pncp/types
 * @see https://pncp.gov.br/api/consulta/swagger-ui/index.html
 */

/**
 * PNCP Modalidade de Contratação
 */
export enum PncpModalidade {
 LEILAO_ELETRONICO = 1,
 DIALOGO_COMPETITIVO = 2,
 CONCURSO = 3,
 CONCORRENCIA_ELETRONICA = 4,
 CONCORRENCIA_PRESENCIAL = 5,
 PREGAO_ELETRONICO = 6,
 PREGAO_PRESENCIAL = 7,
 DISPENSA_LICITACAO = 8,
 INEXIGIBILIDADE = 9,
 MANIFESTACAO_INTERESSE = 10,
 PRE_QUALIFICACAO = 11,
 CREDENCIAMENTO = 12,
 LEILAO_PRESENCIAL = 13,
}

/**
 * PNCP Situação da Contratação
 */
export enum PncpSituacaoContratacao {
 DIVULGADA = 1,
 REVOGADA = 2,
 ANULADA = 3,
 SUSPENSA = 4,
}

/**
 * PNCP Categoria do Processo
 */
export enum PncpCategoriaProcesso {
 CESSAO = 1,
 COMPRAS = 2,
 INFORMATICA_TIC = 3,
 INTERNACIONAL = 4,
 LOCACAO_IMOVEIS = 5,
 MAO_DE_OBRA = 6,
 OBRAS = 7,
 SERVICOS = 8,
 SERVICOS_ENGENHARIA = 9,
 SERVICOS_SAUDE = 10,
 ALIENACAO_BENS = 11,
}

/**
 * PNCP Modo de Disputa
 */
export enum PncpModoDisputa {
 ABERTO = 1,
 FECHADO = 2,
 ABERTO_FECHADO = 3,
 DISPENSA_COM_DISPUTA = 4,
 NAO_SE_APLICA = 5,
 FECHADO_ABERTO = 6,
}

/**
 * PNCP Critério de Julgamento
 */
export enum PncpCriterioJulgamento {
 MENOR_PRECO = 1,
 MAIOR_DESCONTO = 2,
 TECNICA_E_PRECO = 4,
 MAIOR_LANCE = 5,
 MAIOR_RETORNO_ECONOMICO = 6,
 NAO_SE_APLICA = 7,
 MELHOR_TECNICA = 8,
 CONTEUDO_ARTISTICO = 9,
}

/**
 * Órgão/Entidade from PNCP response
 */
export interface PncpOrgaoEntidade {
 cnpj: string;
 razaoSocial: string;
 esferaId?: string;
 poderId?: string;
}

/**
 * Unidade from PNCP response
 */
export interface PncpUnidade {
 ufNome: string;
 ufSigla: string;
 municipioNome?: string;
 codigoIbge?: string;
 codigoUnidade: string;
 nomeUnidade: string;
}

/**
 * Contratação (procurement) from PNCP API
 * Based on Serviço Consultar Contratações por Data de Publicação
 */
export interface PncpContratacao {
 /** Número de Controle PNCP da Contratação */
 numeroControlePNCP: string;
 /** Data de publicação no PNCP */
 dataPublicacaoPncp: string;
 /** Data de inclusão no PNCP */
 dataInclusao: string;
 /** Data da última atualização */
 dataAtualizacao?: string;
 /** Ano da contratação */
 anoCompra: number;
 /** Número sequencial da contratação */
 sequencialCompra: number;
 /** Código da modalidade de contratação */
 modalidadeId: number;
 /** Nome da modalidade de contratação */
 modalidadeNome: string;
 /** Código do modo de disputa */
 modoDisputaId?: number;
 /** Nome do modo de disputa */
 modoDisputaNome?: string;
 /** Código da situação da contratação */
 situacaoCompraId: number;
 /** Nome da situação da contratação */
 situacaoCompraNome: string;
 /** Objeto da contratação */
 objetoCompra: string;
 /** Informação complementar */
 informacaoComplementar?: string;
 /** Valor total estimado */
 valorTotalEstimado?: number;
 /** Valor total homologado */
 valorTotalHomologado?: number;
 /** Data de abertura da proposta */
 dataAberturaProposta?: string;
 /** Data de encerramento da proposta */
 dataEncerramentoProposta?: string;
 /** SRP (Sistema de Registro de Preços) */
 srp: boolean;
 /** Link sistema de origem */
 linkSistemaOrigem?: string;
 /** Código do critério de julgamento */
 criterioJulgamentoId?: number;
 /** Nome do critério de julgamento */
 criterioJulgamentoNome?: string;
 /** Órgão/Entidade */
 orgaoEntidade: PncpOrgaoEntidade;
 /** Unidade */
 unidadeOrgao: PncpUnidade;
 /** Amparo legal */
 amparoLegal?: {
 codigo: number;
 nome: string;
 descricao: string;
 };
 /** Número do processo */
 numeroCompra?: string;
 /** Usuário que publicou */
 usuarioNome?: string;
}

/**
 * Contrato from PNCP API
 * Based on Serviço Consultar Contratos por Data de Publicação
 */
export interface PncpContrato {
 /** Número de Controle PNCP do Contrato */
 numeroControlePNCP: string;
 /** Data de publicação no PNCP */
 dataPublicacaoPncp: string;
 /** Data de vigência inicial */
 dataVigenciaInicio: string;
 /** Data de vigência final */
 dataVigenciaFim: string;
 /** Data de assinatura */
 dataAssinatura: string;
 /** Ano do contrato */
 anoContrato: number;
 /** Número sequencial do contrato */
 sequencialContrato: number;
 /** Número do contrato */
 numeroContratoEmpenho: string;
 /** Tipo de contrato */
 tipoContratoId: number;
 /** Nome do tipo de contrato */
 tipoContratoNome: string;
 /** Objeto do contrato */
 objetoContrato: string;
 /** Valor inicial */
 valorInicial: number;
 /** Valor global */
 valorGlobal?: number;
 /** Número do processo */
 numeroProcesso?: string;
 /** Órgão/Entidade */
 orgaoEntidade: PncpOrgaoEntidade;
 /** Unidade */
 unidadeOrgao: PncpUnidade;
 /** Fornecedor */
 fornecedor?: {
 cpfCnpj: string;
 nomeRazaoSocial: string;
 tipo?: string;
 };
 /** Contratação origem */
 contratacaoOrigemNumeroControlePNCP?: string;
 /** Informações complementares */
 informacaoComplementar?: string;
}

/**
 * Ata de Registro de Preços from PNCP API
 * Based on Serviço Consultar Atas de Registro de Preço por Período de Vigência
 */
export interface PncpAta {
 /** Número de Controle PNCP da Ata */
 numeroControlePNCP: string;
 /** Número da ata */
 numeroAta: string;
 /** Ano da ata */
 anoAta: number;
 /** Sequencial da ata */
 sequencialAta: number;
 /** Data de publicação no PNCP */
 dataPublicacaoPncp: string;
 /** Data de vigência inicial */
 dataVigenciaInicio: string;
 /** Data de vigência final */
 dataVigenciaFim: string;
 /** Data de assinatura */
 dataAssinatura: string;
 /** Valor total */
 valorTotal?: number;
 /** Órgão/Entidade */
 orgaoEntidade: PncpOrgaoEntidade;
 /** Unidade */
 unidadeOrgao: PncpUnidade;
 /** Contratação origem */
 contratacao?: {
 numeroControlePNCP: string;
 objetoCompra: string;
 modalidadeNome: string;
 };
}

/**
 * PNCP API paginated response wrapper
 */
export interface PncpPaginatedResponse<T> {
 /** Data array */
 data: T[];
 /** Total de registros encontrados */
 totalRegistros: number;
 /** Total de páginas */
 totalPaginas: number;
 /** Número da página atual (1-indexed) */
 numeroPagina: number;
 /** Páginas restantes */
 paginasRestantes: number;
 /** Indica se data está vazio */
 empty: boolean;
}

/**
 * PNCP search parameters for contratações
 */
export interface PncpContratacaoSearchParams {
 /** Data inicial de publicação (YYYYMMDD) */
 dataInicial: string;
 /** Data final de publicação (YYYYMMDD) */
 dataFinal: string;
 /** CNPJ do órgão (opcional) */
 cnpjOrgao?: string;
 /** Código da modalidade (opcional) */
 codigoModalidadeContratacao?: number;
 /** UF do órgão (opcional) */
 ufOrgao?: string;
 /** Código da situação (opcional) */
 codigoSituacaoCompra?: number;
 /** Página (1-indexed) */
 pagina?: number;
 /** Tamanho da página (max 500) */
 tamanhoPagina?: number;
}

/**
 * PNCP search parameters for contratos
 */
export interface PncpContratoSearchParams {
 /** Data inicial de publicação (YYYYMMDD) */
 dataInicial: string;
 /** Data final de publicação (YYYYMMDD) */
 dataFinal: string;
 /** CNPJ do órgão (opcional) */
 cnpjOrgao?: string;
 /** Página (1-indexed) */
 pagina?: number;
 /** Tamanho da página (max 500) */
 tamanhoPagina?: number;
}

/**
 * PNCP search parameters for atas
 */
export interface PncpAtaSearchParams {
 /** Data inicial de vigência (YYYYMMDD) */
 dataInicial: string;
 /** Data final de vigência (YYYYMMDD) */
 dataFinal: string;
 /** CNPJ do órgão (opcional) */
 cnpjOrgao?: string;
 /** Página (1-indexed) */
 pagina?: number;
 /** Tamanho da página (max 500) */
 tamanhoPagina?: number;
}

/**
 * Mapping from PNCP modalidade code to human-readable name
 */
export const PNCP_MODALIDADE_NAMES: Record<number, string> = {
 1: 'Leilão - Eletrônico',
 2: 'Diálogo Competitivo',
 3: 'Concurso',
 4: 'Concorrência - Eletrônica',
 5: 'Concorrência - Presencial',
 6: 'Pregão - Eletrônico',
 7: 'Pregão - Presencial',
 8: 'Dispensa de Licitação',
 9: 'Inexigibilidade',
 10: 'Manifestação de Interesse',
 11: 'Pré-qualificação',
 12: 'Credenciamento',
 13: 'Leilão - Presencial',
};

/**
 * Mapping from PNCP situação code to human-readable name
 */
export const PNCP_SITUACAO_NAMES: Record<number, string> = {
 1: 'Divulgada no PNCP',
 2: 'Revogada',
 3: 'Anulada',
 4: 'Suspensa',
};

/**
 * Mapping from PNCP categoria code to human-readable name
 */
export const PNCP_CATEGORIA_NAMES: Record<number, string> = {
 1: 'Cessão',
 2: 'Compras',
 3: 'Informática (TIC)',
 4: 'Internacional',
 5: 'Locação Imóveis',
 6: 'Mão de Obra',
 7: 'Obras',
 8: 'Serviços',
 9: 'Serviços de Engenharia',
 10: 'Serviços de Saúde',
 11: 'Alienação de bens móveis/imóveis',
};
