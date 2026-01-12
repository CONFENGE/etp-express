import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Exclude } from 'class-transformer';
import { Etp } from './etp.entity';
import { AuditLog } from './audit-log.entity';
import { Organization } from './organization.entity';
import { AuthorizedDomain } from './authorized-domain.entity';

/**
 * User roles for hierarchical access control (M8: Gestão de Domínios Institucionais).
 *
 * Hierarchy:
 * - SYSTEM_ADMIN: Global master administrator (can manage all domains)
 * - DOMAIN_MANAGER: Local domain manager (can manage up to 10 users in their domain)
 * - ADMIN: Organization admin (existing role)
 * - USER: Regular user (existing role)
 * - VIEWER: Read-only user (existing role)
 * - DEMO: Demonstration user (isolated data, daily reset)
 */
export enum UserRole {
  SYSTEM_ADMIN = 'system_admin',
  DOMAIN_MANAGER = 'domain_manager',
  ADMIN = 'admin',
  USER = 'user',
  VIEWER = 'viewer',
  DEMO = 'demo',
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

  /**
   * Organization ID (Multi-Tenancy B2G - MT-02).
   * Foreign key to organizations table.
   * NOT NULL - every user must belong to an organization.
   */
  @Column({ type: 'uuid' })
  organizationId: string;

  /**
   * Organization relation (Multi-Tenancy B2G - MT-02).
   * Lazy loaded - use explicit JOINs when organization data is needed.
   * @see UsersService.findOneWithOrganization() for queries that need organization
   */
  @ManyToOne(() => Organization)
  @JoinColumn({ name: 'organizationId' })
  organization?: Organization;

  @Column({ type: 'varchar', nullable: true })
  cargo: string | null;

  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.USER,
  })
  role: UserRole;

  @Column({ default: true })
  isActive: boolean;

  /**
   * Flag indicating user must change password on next login.
   * Required for M8: Domain management - new users created by Domain Managers
   * must change their initial password.
   */
  @Column({ default: false })
  mustChangePassword: boolean;

  @Column({ type: 'timestamp', nullable: true })
  lastLoginAt: Date | null;

  /**
   * Timestamp when user consented to LGPD terms.
   * Required for LGPD Art. 7º, I compliance.
   */
  @Column({ type: 'timestamp', nullable: true })
  lgpdConsentAt: Date | null;

  /**
   * Version of LGPD terms accepted by user.
   * Enables audit trail per LGPD Art. 8º, §4º.
   */
  @Column({ type: 'varchar', nullable: true })
  lgpdConsentVersion: string | null;

  /**
   * Timestamp when user consented to international data transfer.
   * Required for LGPD Art. 33 compliance (USA servers: Railway, OpenAI, Exa).
   */
  @Column({ type: 'timestamp', nullable: true })
  internationalTransferConsentAt: Date | null;

  /**
   * Timestamp when user requested account deletion (soft delete).
   * Required for LGPD Art. 18, VI compliance (direito de exclusão).
   * Account will be permanently deleted after 30 days (hard delete).
   */
  @Column({ type: 'timestamp', nullable: true })
  deletedAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => Etp, (etp) => etp.createdBy)
  etps: Etp[];

  @OneToMany(() => AuditLog, (log) => log.user)
  auditLogs: AuditLog[];

  /**
   * Authorized Domain this user belongs to (M8: Gestão de Domínios Institucionais).
   * Users are assigned to domains for quota management and local administration.
   */
  @Column({ type: 'uuid', nullable: true })
  authorizedDomainId: string | null;

  @ManyToOne(() => AuthorizedDomain, (domain) => domain.users, {
    nullable: true,
  })
  @JoinColumn({ name: 'authorizedDomainId' })
  authorizedDomain: AuthorizedDomain | null;

  /**
   * Maximum number of ETPs a demo user can create.
   * Only applies to users with role DEMO.
   * Null for non-demo users (unlimited).
   * Default is 3 for demo users.
   */
  @Column({ type: 'int', default: 3, nullable: true })
  etpLimitCount: number | null;
}
