import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from './user.entity';
import { Organization } from './organization.entity';

/**
 * Tipo de entidade à qual o documento está vinculado.
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
 * @see Lei 14.133/2021 Art. 117 - Fiscalização de contratos
 * @see Lei 14.133/2021 Art. 140 - Documentação da execução
 */
@Entity('documentos_fiscalizacao')
export class DocumentoFiscalizacao {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // ============================================
  // Multi-Tenancy
  // ============================================

  /**
   * Organization ID for multi-tenancy isolation.
   * Required for all documentos de fiscalização.
   */
  @Column({ type: 'uuid' })
  @Index('IDX_documento_fiscalizacao_organizationId')
  organizationId: string;

  @ManyToOne(() => Organization)
  @JoinColumn({ name: 'organizationId' })
  organization: Organization;

  // ============================================
  // Vínculo com Entidade
  // ============================================

  /**
   * Tipo da entidade à qual este documento pertence.
   * Define se é documento de medicao, ocorrencia ou ateste.
   */
  @Column({
    type: 'enum',
    enum: DocumentoFiscalizacaoTipo,
  })
  tipoEntidade: DocumentoFiscalizacaoTipo;

  /**
   * ID da entidade (UUID da medicao/ocorrencia/ateste).
   * Relacionamento polimórfico - não usa FK direta.
   */
  @Column({ type: 'uuid' })
  entidadeId: string;

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
   * Eager loading para facilitar auditoria.
   */
  @ManyToOne(() => User, { eager: true })
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
}
