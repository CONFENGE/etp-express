import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from './user.entity';
import { Etp } from './etp.entity';

export enum AuditAction {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  GENERATE = 'generate',
  EXPORT = 'export',
  VERSION = 'version',
  STATUS_CHANGE = 'status_change',
  USER_DATA_EXPORT = 'user_data_export',
  ACCOUNT_DELETION_SOFT = 'account_deletion_soft',
  ACCOUNT_DELETION_HARD = 'account_deletion_hard',
  ACCOUNT_DELETION_CANCELLED = 'account_deletion_cancelled',
  // LGPD-compliant authentication events (Art. 37 - registro das operações)
  LOGIN = 'login',
  LOGOUT = 'logout',
  LOGIN_FAILED = 'login_failed',
  // LGPD-compliant personal data access events (Art. 50 - boas práticas)
  PROFILE_VIEW = 'profile_view',
  PROFILE_UPDATE = 'profile_update',
  PASSWORD_CHANGE = 'password_change',
  DATA_ACCESS = 'data_access',
}

@Entity('audit_logs')
export class AuditLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'enum',
    enum: AuditAction,
  })
  action: AuditAction;

  @Column()
  entityType: string;

  @Column({ nullable: true })
  entityId: string;

  @Column({ type: 'jsonb', nullable: true })
  changes: {
    before?: unknown;
    after?: unknown;
    metadata?: unknown;
  };

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ nullable: true })
  ipAddress: string;

  @Column({ nullable: true })
  userAgent: string;

  @ManyToOne(() => User, (user) => user.auditLogs, { eager: true })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'user_id' })
  userId: string;

  @ManyToOne(() => Etp, (etp) => etp.auditLogs, { nullable: true })
  @JoinColumn({ name: 'etp_id' })
  etp: Etp;

  @Column({ name: 'etp_id', nullable: true })
  etpId: string;

  @CreateDateColumn()
  createdAt: Date;
}
