import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
  Index,
} from 'typeorm';
import { User } from './user.entity';
import { Organization } from './organization.entity';

/**
 * AuthorizedDomain entity for M8: Gestão de Domínios Institucionais.
 *
 * Represents an authorized institutional domain with user quota and local manager.
 * This entity enables granular control over domain access, replacing the simpler
 * Organization.domainWhitelist approach.
 *
 * Features:
 * - Unique domain constraint (e.g., 'lages.sc.gov.br')
 * - Configurable max users per domain (default 10)
 * - Local domain manager assignment
 * - Organization linkage for billing/isolation
 *
 * @example
 * {
 * id: '123e4567-e89b-12d3-a456-426614174000',
 * domain: 'lages.sc.gov.br',
 * institutionName: 'Prefeitura de Lages',
 * maxUsers: 10,
 * isActive: true
 * }
 */
@Entity('authorized_domains')
@Index('IDX_authorized_domains_domain', ['domain'], { unique: true })
@Index('IDX_authorized_domains_isActive', ['isActive'])
export class AuthorizedDomain {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /**
   * Domain name (e.g., 'lages.sc.gov.br').
   * Must be unique across all authorized domains.
   */
  @Column({ unique: true })
  domain: string;

  /**
   * Institution name for display purposes.
   * E.g., 'Prefeitura de Lages', 'Câmara Municipal de Florianópolis'.
   */
  @Column()
  institutionName: string;

  /**
   * Whether this domain is active.
   * Inactive domains block user registration and login.
   */
  @Column({ default: true })
  isActive: boolean;

  /**
   * Maximum number of users allowed for this domain.
   * Default is 10 as per M8 requirements.
   */
  @Column({ default: 10 })
  maxUsers: number;

  /**
   * Domain Manager (local administrator) for this domain.
   * Can manage up to maxUsers users within their domain.
   */
  @Column({ type: 'uuid', nullable: true })
  domainManagerId: string | null;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'domainManagerId' })
  domainManager: User | null;

  /**
   * Organization this domain belongs to.
   * Used for billing and data isolation.
   */
  @Column({ type: 'uuid', nullable: true })
  organizationId: string | null;

  @ManyToOne(() => Organization, { nullable: true })
  @JoinColumn({ name: 'organizationId' })
  organization: Organization | null;

  /**
   * Users assigned to this domain.
   * Inverse side of User.authorizedDomain relationship.
   */
  @OneToMany(() => User, (user) => user.authorizedDomain)
  users: User[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
