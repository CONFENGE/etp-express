import {
 Entity,
 PrimaryGeneratedColumn,
 Column,
 CreateDateColumn,
 UpdateDateColumn,
 OneToMany,
} from 'typeorm';
import { User } from './user.entity';
import { Etp } from './etp.entity';

/**
 * Organization entity for Multi-Tenancy B2G (Business-to-Government).
 * Represents a government organization (municipality, state agency, etc.)
 * that uses the ETP Express platform.
 *
 * Column-based isolation: organizationId is used to isolate data between organizations.
 *
 * @example
 * {
 * id: '123e4567-e89b-12d3-a456-426614174000',
 * name: 'Prefeitura de Lages',
 * cnpj: '12.345.678/0001-90',
 * domainWhitelist: ['lages.sc.gov.br', 'camaralages.sc.gov.br'],
 * isActive: true,
 * stripeCustomerId: 'cus_...'
 * }
 */
@Entity('organizations')
export class Organization {
 @PrimaryGeneratedColumn('uuid')
 id: string;

 /**
 * Organization name (e.g., "Prefeitura de Lages").
 */
 @Column()
 name: string;

 /**
 * CNPJ (Cadastro Nacional da Pessoa Jurídica) - unique identifier for Brazilian organizations.
 * Format: XX.XXX.XXX/XXXX-XX (14 digits).
 * Must be unique and validated at service layer.
 */
 @Column({ unique: true })
 cnpj: string;

 /**
 * Whitelisted email domains for automatic organization assignment during registration.
 * Used in AuthService.register to match user email domains to organizations.
 *
 * @example ['lages.sc.gov.br', 'camaralages.sc.gov.br']
 *
 * PostgreSQL text[] (array of strings).
 * Indexed with GIN for efficient domain lookup.
 */
 @Column('text', { array: true })
 domainWhitelist: string[];

 /**
 * Organization active status.
 * Kill Switch: When false, users from this organization are blocked (403 Forbidden).
 * Used by TenantGuard middleware (MT-04).
 *
 * @default true
 */
 @Column({ default: true })
 isActive: boolean;

 /**
 * Stripe Customer ID for billing integration.
 * Nullable for organizations without active subscription.
 */
 @Column({ type: 'varchar', nullable: true })
 stripeCustomerId: string | null;

 @CreateDateColumn()
 createdAt: Date;

 @UpdateDateColumn()
 updatedAt: Date;

 /**
 * Users belonging to this organization (MT-02 #355).
 * One organization can have many users.
 */
 @OneToMany(() => User, (user) => user.organization)
 users: User[];

 /**
 * ETPs belonging to this organization (MT-05 #358).
 * One organization can have many ETPs.
 * Column-based isolation: Ensures data is scoped to organization.
 */
 @OneToMany(() => Etp, (etp) => etp.organization)
 etps: Etp[];
}
