import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Etp } from './etp.entity';
import { ComplianceChecklist } from './compliance-checklist.entity';
import { User } from './user.entity';
import { ComplianceValidationResult } from '../modules/compliance/dto/compliance-validation-result.dto';

/**
 * Entity para armazenar histórico de validações de conformidade de ETPs.
 *
 * Cada vez que um ETP é validado, uma entrada é criada nesta tabela,
 * permitindo rastrear a evolução do score de conformidade ao longo do tempo.
 *
 * Issue #1264 - [Compliance-c] Criar relatório de conformidade
 */
@Entity('compliance_validation_history')
@Index('idx_validation_history_etp', ['etpId'])
@Index('idx_validation_history_date', ['validatedAt'])
export class ComplianceValidationHistory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid', { name: 'etp_id' })
  etpId: string;

  @ManyToOne(() => Etp, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'etp_id' })
  etp: Etp;

  @Column('uuid', { name: 'checklist_id' })
  checklistId: string;

  @ManyToOne(() => ComplianceChecklist)
  @JoinColumn({ name: 'checklist_id' })
  checklist: ComplianceChecklist;

  @Column('varchar', { length: 255 })
  checklistName: string;

  @Column('int')
  score: number;

  @Column('int', { name: 'minimum_score' })
  minimumScore: number;

  @Column('varchar', { length: 20 })
  status: 'APPROVED' | 'NEEDS_REVIEW' | 'REJECTED';

  @Column('int', { name: 'total_items' })
  totalItems: number;

  @Column('int', { name: 'passed_items' })
  passedItems: number;

  @Column('int', { name: 'failed_items' })
  failedItems: number;

  /**
   * Snapshot completo do resultado da validação.
   * Armazena itemResults, suggestions e categoryScores.
   */
  @Column('jsonb', { name: 'validation_snapshot' })
  validationSnapshot: Partial<ComplianceValidationResult>;

  @Column('timestamp', { name: 'validated_at' })
  validatedAt: Date;

  @Column('uuid', { name: 'validated_by_id' })
  validatedById: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'validated_by_id' })
  validatedBy: User;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
