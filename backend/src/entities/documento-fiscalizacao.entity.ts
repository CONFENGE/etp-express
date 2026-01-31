import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Check,
} from 'typeorm';
import { User } from './user.entity';
import { Organization } from './organization.entity';
import { Medicao } from './medicao.entity';
import { Ocorrencia } from './ocorrencia.entity';
import { Ateste } from './ateste.entity';

/**
 * Tipo de entidade à qual o documento está vinculado.
 * Kept for backward compatibility in API layer.
 * Internally mapped to explicit FK columns (medicaoId | ocorrenciaId | atesteId).
 */
export enum DocumentoFiscalizacaoTipo {
  /** Documento comprobatório de medição */
  MEDICAO = 'medicao',
  /** Documento de evidência de ocorrência */
  OCORRENCIA = 'ocorrencia',
  /** Documento relacionado a ateste */
  ATESTE = 'ateste',
}

/**
 * Entity DocumentoFiscalizacao - Documentos comprobatórios de fiscalização.
 *
 * Armazena metadados de arquivos anexados a medições, ocorrências e atestes.
 * Os arquivos físicos são armazenados no filesystem/cloud storage.
 *
 * Fluxo: Upload → Validação → Storage → Registro no banco
 *
 * Validações:
 * - Tipos permitidos: PDF, JPEG, PNG, DOCX, XLSX
 * - Tamanho máximo: 10MB por arquivo
 * - Máximo 5 arquivos por entidade
 *
 * Relacionamento Refatorado (TD-008):
 * - Anteriormente usava padrão polimórfico (tipoEntidade + entidadeId)
 * - Agora usa FKs explícitas (medicaoId | ocorrenciaId | atesteId)
 * - CHECK constraint garante exatamente uma FK não-nula
 * - Benefícios: integridade referencial, cascading deletes, melhor performance
 *
 * @see Lei 14.133/2021 Art. 117 - Fiscalização de contratos
 * @see Lei 14.133/2021 Art. 140 - Documentação da execução
 * @see Issue #1723 - TD-008: Database schema improvements & LGPD compliance
 */
@Entity('documentos_fiscalizacao')
@Check(
  'CHK_documentos_fiscalizacao_exactly_one_fk',
  `num_nonnulls("medicaoId", "ocorrenciaId", "atesteId") = 1`,
)
export class DocumentoFiscalizacao {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // ============================================
  // Multi-Tenancy (MT-04, TD-002)
  // ============================================

  /**
   * Organization that owns this document.
   * Added for multi-tenancy isolation.
   */
  @Column({ type: 'uuid' })
  organizationId: string;

  @ManyToOne(() => Organization)
  @JoinColumn({ name: 'organizationId' })
  organization: Organization;

  // ============================================
  // Vínculo com Entidade (Explicit FKs - TD-008)
  // ============================================

  /**
   * FK to Medicao (mutually exclusive with ocorrenciaId and atesteId).
   * CHECK constraint ensures exactly one FK is non-null.
   */
  @Column({ type: 'uuid', nullable: true })
  medicaoId: string | null;

  @ManyToOne(() => Medicao, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'medicaoId' })
  medicao?: Medicao;

  /**
   * FK to Ocorrencia (mutually exclusive with medicaoId and atesteId).
   * CHECK constraint ensures exactly one FK is non-null.
   */
  @Column({ type: 'uuid', nullable: true })
  ocorrenciaId: string | null;

  @ManyToOne(() => Ocorrencia, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'ocorrenciaId' })
  ocorrencia?: Ocorrencia;

  /**
   * FK to Ateste (mutually exclusive with medicaoId and ocorrenciaId).
   * CHECK constraint ensures exactly one FK is non-null.
   */
  @Column({ type: 'uuid', nullable: true })
  atesteId: string | null;

  @ManyToOne(() => Ateste, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'atesteId' })
  ateste?: Ateste;

  // ============================================
  // Metadados do Arquivo
  // ============================================

  /**
   * Nome original do arquivo conforme enviado pelo usuário.
   * Ex: "boletim-medicao-01-2024.pdf"
   */
  @Column()
  nomeArquivo: string;

  /**
   * Caminho completo do arquivo no storage.
   * Formato: contracts/{contratoId}/fiscalizacao/{tipo}/{entidadeId}/{filename}
   * Ex: "contracts/123e4567-e89b-12d3-a456-426614174000/fiscalizacao/medicao/abc-def/documento.pdf"
   */
  @Column()
  caminhoArquivo: string;

  /**
   * Tamanho do arquivo em bytes.
   * Usado para validação e auditoria de espaço.
   */
  @Column({ type: 'int' })
  tamanho: number;

  /**
   * MIME type do arquivo.
   * Ex: "application/pdf", "image/jpeg", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
   */
  @Column()
  mimeType: string;

  // ============================================
  // Responsabilidade
  // ============================================

  /**
   * ID do usuário que fez upload do documento.
   * Geralmente o fiscal ou gestor do contrato.
   */
  @Column({ type: 'uuid' })
  uploadedById: string;

  /**
   * Relacionamento com usuário que fez upload.
   */
  @ManyToOne(() => User)
  @JoinColumn({ name: 'uploadedById' })
  uploadedBy: User;

  // ============================================
  // Auditoria
  // ============================================

  /**
   * Data de upload do documento.
   * Auto-gerada pelo TypeORM.
   */
  @CreateDateColumn()
  createdAt: Date;

  // ============================================
  // Helper Methods (Backward Compatibility)
  // ============================================

  /**
   * Get the entity type (backward compatible API).
   * Maps explicit FKs to legacy enum value.
   */
  get tipoEntidade(): DocumentoFiscalizacaoTipo {
    if (this.medicaoId) return DocumentoFiscalizacaoTipo.MEDICAO;
    if (this.ocorrenciaId) return DocumentoFiscalizacaoTipo.OCORRENCIA;
    if (this.atesteId) return DocumentoFiscalizacaoTipo.ATESTE;
    throw new Error('DocumentoFiscalizacao must have exactly one FK set');
  }

  /**
   * Get the entity ID (backward compatible API).
   * Returns the non-null FK value.
   */
  get entidadeId(): string {
    return this.medicaoId || this.ocorrenciaId || this.atesteId || '';
  }

  /**
   * Set FK based on entity type (backward compatible API).
   * Used when creating/updating via old API format.
   */
  setEntidade(tipo: DocumentoFiscalizacaoTipo, entidadeId: string): void {
    // Clear all FKs first
    this.medicaoId = null;
    this.ocorrenciaId = null;
    this.atesteId = null;

    // Set the appropriate FK
    switch (tipo) {
      case DocumentoFiscalizacaoTipo.MEDICAO:
        this.medicaoId = entidadeId;
        break;
      case DocumentoFiscalizacaoTipo.OCORRENCIA:
        this.ocorrenciaId = entidadeId;
        break;
      case DocumentoFiscalizacaoTipo.ATESTE:
        this.atesteId = entidadeId;
        break;
    }
  }
}
