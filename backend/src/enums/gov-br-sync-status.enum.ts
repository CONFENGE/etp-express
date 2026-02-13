/**
 * Status de sincronização com Gov.br.
 * Usado em entidades que sincronizam dados com sistemas governamentais.
 *
 * Related:
 * - Issue #1675 - Sincronização com Contratos.gov.br
 * - TD-010.3 - DB-11: Extract GovBrSyncStatus enum
 */
export enum GovBrSyncStatus {
  /** Aguardando sincronização */
  PENDING = 'pending',
  /** Sincronizado com sucesso */
  SYNCED = 'synced',
  /** Erro na última tentativa de sincronização */
  ERROR = 'error',
}
