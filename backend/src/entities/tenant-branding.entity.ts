import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  JoinColumn,
} from 'typeorm';
import { Organization } from './organization.entity';

/**
 * TenantBranding entity for White-Label customization (#1294).
 * Allows organizations to customize the visual appearance of the platform.
 *
 * Features:
 * - Custom logo URL
 * - Brand colors (primary, secondary, accent)
 * - Custom domain/subdomain support
 * - Custom footer text
 * - Preview mode support
 *
 * @example
 * {
 *   id: '123e4567-e89b-12d3-a456-426614174000',
 *   organizationId: 'org-uuid',
 *   logoUrl: 'https://cdn.etp-express.com.br/logos/prefeitura-lages.png',
 *   primaryColor: '#0066cc',
 *   secondaryColor: '#f5f5f7',
 *   accentColor: '#ff9500',
 *   customDomain: 'lages.etp-express.com.br',
 *   footerText: '© 2026 Prefeitura de Lages - Todos os direitos reservados',
 *   isActive: true
 * }
 */
@Entity('tenant_brandings')
export class TenantBranding {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /**
   * One-to-one relationship with Organization.
   * Each organization can have one branding configuration.
   */
  @OneToOne(() => Organization, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organizationId' })
  organization: Organization;

  @Column({ type: 'uuid' })
  organizationId: string;

  /**
   * URL to the organization's logo.
   * Displayed in the header replacing the default ETP Express logo.
   * Recommended size: 200x60px (transparent PNG).
   */
  @Column({ type: 'varchar', nullable: true })
  logoUrl: string | null;

  /**
   * Primary brand color in HEX format.
   * Used for buttons, links, and primary UI elements.
   * Must meet WCAG AA contrast requirements (4.5:1).
   *
   * @example '#0066cc'
   */
  @Column({ type: 'varchar', length: 7, nullable: true })
  primaryColor: string | null;

  /**
   * Secondary brand color in HEX format.
   * Used for backgrounds, secondary elements.
   *
   * @example '#f5f5f7'
   */
  @Column({ type: 'varchar', length: 7, nullable: true })
  secondaryColor: string | null;

  /**
   * Accent brand color in HEX format.
   * Used for highlights, badges, and special UI elements.
   *
   * @example '#ff9500'
   */
  @Column({ type: 'varchar', length: 7, nullable: true })
  accentColor: string | null;

  /**
   * Custom domain or subdomain for the organization.
   * Format: subdomain.etp-express.com.br or custom.gov.br
   *
   * @example 'lages.etp-express.com.br'
   */
  @Column({ type: 'varchar', nullable: true, unique: true })
  customDomain: string | null;

  /**
   * Custom footer text.
   * Replaces the default ETP Express footer.
   *
   * @example '© 2026 Prefeitura de Lages - Todos os direitos reservados'
   */
  @Column({ type: 'text', nullable: true })
  footerText: string | null;

  /**
   * Whether this branding configuration is active.
   * If false, the default ETP Express branding is used.
   *
   * @default true
   */
  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
