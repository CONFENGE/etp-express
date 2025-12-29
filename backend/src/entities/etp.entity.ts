import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  VersionColumn,
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

  /**
   * Optimistic locking version for concurrent update detection (Issue #1059).
   * Automatically incremented by TypeORM on each save operation.
   * Used to detect conflicts when multiple users edit the same ETP.
   * Client must send the current version in PUT/PATCH requests.
   * If version mismatch occurs, returns 409 Conflict.
   */
  @VersionColumn()
  version: number;

  @OneToMany(() => EtpSection, (section) => section.etp, { cascade: true })
  sections: EtpSection[];

  @OneToMany(() => EtpVersion, (version) => version.etp, { cascade: true })
  versions: EtpVersion[];

  @OneToMany(() => AuditLog, (log) => log.etp)
  auditLogs: AuditLog[];
}
