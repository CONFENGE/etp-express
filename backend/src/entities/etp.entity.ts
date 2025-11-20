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

  @Column({ nullable: true })
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
    orgao?: string;
    unidadeRequisitante?: string;
    responsavelTecnico?: string;
    fundamentacaoLegal?: string[];
    tags?: string[];
    [key: string]: any;
  };

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
