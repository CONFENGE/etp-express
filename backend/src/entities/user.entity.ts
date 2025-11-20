import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { Exclude } from 'class-transformer';
import { Etp } from './etp.entity';
import { AuditLog } from './audit-log.entity';

export enum UserRole {
  ADMIN = 'admin',
  USER = 'user',
  VIEWER = 'viewer',
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column()
  @Exclude()
  password: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  orgao: string;

  @Column({ nullable: true })
  cargo: string;

  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.USER,
  })
  role: UserRole;

  @Column({ default: true })
  isActive: boolean;

  @Column({ type: 'timestamp', nullable: true })
  lastLoginAt: Date;

  /**
   * Timestamp when user consented to LGPD terms.
   * Required for LGPD Art. 7º, I compliance.
   */
  @Column({ type: 'timestamp', nullable: true })
  lgpdConsentAt: Date;

  /**
   * Version of LGPD terms accepted by user.
   * Enables audit trail per LGPD Art. 8º, §4º.
   */
  @Column({ nullable: true })
  lgpdConsentVersion: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => Etp, (etp) => etp.createdBy)
  etps: Etp[];

  @OneToMany(() => AuditLog, (log) => log.user)
  auditLogs: AuditLog[];
}
