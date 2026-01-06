import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { User } from './user.entity';
import { Organization } from './organization.entity';
import { EtpSection } from './etp-section.entity';
import { EtpVersion } from './etp-version.entity';
import { AuditLog } from './audit-log.entity';

export enum EtpStatus {
  DRAFT = 'draft',
  IN_PROGRESS = 'in_progress',
  REVIEW = 'review',
  COMPLETED = 'completed',
  ARCHIVED = 'archived',
}

@Entity('etps')
export class Etp {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column()
  objeto: string;

  @Column({ type: 'varchar', nullable: true })
  numeroProcesso: string;

  @Column({ type: 'decimal', precision: 15, scale: 2, nullable: true })
  valorEstimado: number;

  // ============================================
  // Campos de Identificação (Issue #1223)
  // ============================================

  /**
   * Órgão/Entidade requisitante.
   * Ex: "Secretaria Municipal de Tecnologia"
   */
  @Column({ type: 'varchar', length: 200, nullable: true })
  orgaoEntidade: string;

  /**
   * Código UASG (Unidade Administrativa de Serviços Gerais).
   * Formato: 6 dígitos numéricos. Ex: "123456"
   */
  @Column({ type: 'varchar', length: 6, nullable: true })
  uasg: string;

  /**
   * Unidade demandante dentro do órgão.
   * Ex: "Departamento de Infraestrutura de TI"
   */
  @Column({ type: 'varchar', length: 200, nullable: true })
  unidadeDemandante: string;

  /**
   * Responsável técnico pela elaboração do ETP.
   * Armazena nome e matrícula (opcional).
   */
  @Column({ type: 'jsonb', nullable: true })
  responsavelTecnico: {
    nome: string;
    matricula?: string;
  };

  /**
   * Data de elaboração do ETP.
   */
  @Column({ type: 'date', nullable: true })
  dataElaboracao: Date;

  // ============================================
  // Fim dos Campos de Identificação
  // ============================================

  // ============================================
  // Campos de Objeto e Justificativa (Issue #1224)
  // ============================================

  /**
   * Descrição detalhada do objeto da contratação.
   * Complementa o campo 'objeto' com informações técnicas específicas.
   * Max: 5000 caracteres.
   */
  @Column({ type: 'text', nullable: true })
  descricaoDetalhada: string;

  /**
   * Quantidade estimada a ser contratada.
   * Ex: 100 (unidades), 12 (meses), etc.
   */
  @Column({ type: 'decimal', precision: 15, scale: 2, nullable: true })
  quantidadeEstimada: number;

  /**
   * Unidade de medida para a quantidade.
   * Ex: "unidade", "mês", "hora", "m²", etc.
   */
  @Column({ type: 'varchar', length: 50, nullable: true })
  unidadeMedida: string;

  /**
   * Justificativa técnica e legal para a contratação.
   * Campo obrigatório para ETPs completos.
   * Min: 50, Max: 5000 caracteres.
   */
  @Column({ type: 'text', nullable: true })
  justificativaContratacao: string;

  /**
   * Descrição da necessidade que será atendida pela contratação.
   * Ex: "Modernização dos sistemas legados para suporte a 10.000 usuários"
   */
  @Column({ type: 'text', nullable: true })
  necessidadeAtendida: string;

  /**
   * Benefícios esperados com a contratação.
   * Ex: "Redução de 30% no tempo de processamento de solicitações"
   */
  @Column({ type: 'text', nullable: true })
  beneficiosEsperados: string;

  // ============================================
  // Fim dos Campos de Objeto e Justificativa
  // ============================================

  @Column({
    type: 'enum',
    enum: EtpStatus,
    default: EtpStatus.DRAFT,
  })
  status: EtpStatus;

  @Column({ type: 'jsonb', nullable: true })
  metadata: {
    unidadeRequisitante?: string;
    responsavelTecnico?: string;
    fundamentacaoLegal?: string[];
    tags?: string[];
    [key: string]: unknown;
  };

  /**
   * Organization ID (Multi-Tenancy B2G - MT-05).
   * Foreign key to organizations table.
   * NOT NULL - every ETP must belong to an organization.
   *
   * Column-based isolation: Ensures ETPs are scoped to a single organization.
   * Used by EtpsService to filter queries and enforce cross-tenant isolation.
   */
  @Column({ type: 'uuid' })
  organizationId: string;

  /**
   * Organization relation (Multi-Tenancy B2G - MT-05).
   * Eager loaded for quick access to organization data.
   */
  @ManyToOne(() => Organization, { eager: true })
  @JoinColumn({ name: 'organizationId' })
  organization: Organization;

  @Column({ default: 1 })
  currentVersion: number;

  @Column({ type: 'float', default: 0 })
  completionPercentage: number;

  @ManyToOne(() => User, (user) => user.etps, {
    eager: true,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'created_by' })
  createdBy: User;

  @Column({ name: 'created_by' })
  createdById: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => EtpSection, (section) => section.etp, { cascade: true })
  sections: EtpSection[];

  @OneToMany(() => EtpVersion, (version) => version.etp, { cascade: true })
  versions: EtpVersion[];

  @OneToMany(() => AuditLog, (log) => log.etp)
  auditLogs: AuditLog[];
}
