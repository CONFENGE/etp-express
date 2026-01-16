/**
 * TR Version types for version history feature
 * @see #1253 - [TR-f] Versionamento e historico de TR
 */

export interface TrVersionSnapshot {
  objeto: string;
  fundamentacaoLegal: string | null;
  descricaoSolucao: string | null;
  requisitosContratacao: string | null;
  modeloExecucao: string | null;
  modeloGestao: string | null;
  criteriosSelecao: string | null;
  valorEstimado: number | null;
  dotacaoOrcamentaria: string | null;
  prazoVigencia: number | null;
  obrigacoesContratante: string | null;
  obrigacoesContratada: string | null;
  sancoesPenalidades: string | null;
  cronograma: Record<string, unknown> | null;
  especificacoesTecnicas: Record<string, unknown> | null;
  localExecucao: string | null;
  garantiaContratual: string | null;
  condicoesPagamento: string | null;
  subcontratacao: string | null;
  status: string;
}

export interface TrVersion {
  id: string;
  versionNumber: number;
  snapshot: TrVersionSnapshot;
  changeLog?: string;
  createdByName?: string;
  termoReferenciaId: string;
  createdAt: string;
}

export interface TrVersionComparisonResult {
  version1: {
    id: string;
    versionNumber: number;
    createdAt: string;
  };
  version2: {
    id: string;
    versionNumber: number;
    createdAt: string;
  };
  differences: Record<string, { old: unknown; new: unknown }>;
  disclaimer: string;
}

export interface TrVersionsResponse {
  data: TrVersion[];
  disclaimer: string;
}

export interface TrVersionResponse {
  data: TrVersion;
  disclaimer: string;
}

export interface RestoreTrVersionResponse {
  data: unknown;
  message: string;
  disclaimer: string;
}
