import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

/**
 * Tipo de contratação para templates de ETP.
 * Issue #1161 - Templates pré-configurados por tipo
 */
export enum EtpTemplateType {
  OBRAS = 'OBRAS',
  TI = 'TI',
  SERVICOS = 'SERVICOS',
  MATERIAIS = 'MATERIAIS',
}

/**
 * Configuração de prompt de IA por seção do template.
 */
export interface TemplatePrompt {
  sectionType: string;
  systemPrompt: string;
  userPromptTemplate: string;
}

/**
 * Template pré-configurado de ETP por tipo de contratação.
 * Facilita o preenchimento com campos específicos por domínio.
 *
 * Issue #1161 - [Templates] Criar modelos pré-configurados por tipo
 */
@Entity('etp_templates')
export class EtpTemplate {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /**
   * Nome do template.
   * Ex: "Template para Obras de Engenharia"
   */
  @Column({ length: 200 })
  name: string;

  /**
   * Tipo de contratação do template.
   */
  @Column({
    type: 'enum',
    enum: EtpTemplateType,
  })
  type: EtpTemplateType;

  /**
   * Descrição detalhada do template e quando utilizá-lo.
   */
  @Column({ type: 'text' })
  description: string;

  /**
   * Campos obrigatórios para este tipo de contratação.
   * Lista de nomes de campos que devem ser preenchidos.
   */
  @Column({ type: 'jsonb' })
  requiredFields: string[];

  /**
   * Campos opcionais disponíveis para este tipo.
   */
  @Column({ type: 'jsonb' })
  optionalFields: string[];

  /**
   * Seções padrão que devem ser incluídas no ETP.
   */
  @Column({ type: 'jsonb' })
  defaultSections: string[];

  /**
   * Prompts de IA específicos para cada seção.
   */
  @Column({ type: 'jsonb' })
  prompts: TemplatePrompt[];

  /**
   * Referências legais relevantes para este tipo de contratação.
   * Ex: ["Lei 14.133/2021", "IN SEGES/ME nº 65/2021"]
   */
  @Column({ type: 'jsonb' })
  legalReferences: string[];

  /**
   * Fontes de preços preferenciais para este tipo.
   * Ex: ["SINAPI", "SICRO", "PNCP"]
   */
  @Column({ type: 'jsonb' })
  priceSourcesPreferred: string[];

  /**
   * Indica se o template está ativo e disponível para uso.
   */
  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
