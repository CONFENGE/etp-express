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

/**
 * Nível de risco da contratação.
 * Issue #1225 - Campos de Requisitos e Riscos
 */
export enum NivelRisco {
  BAIXO = 'BAIXO',
  MEDIO = 'MEDIO',
  ALTO = 'ALTO',
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

  // ============================================
  // Campos de Identificação (Issue #1223)
  // ============================================

  /**
   * Órgão/Entidade requisitante.
   * Ex: "Secretaria Municipal de Tecnologia"
   */
  @Column({ type: 'varchar', length: 200, nullable: true })
  orgaoEntidade: string;

  /**
   * Código UASG (Unidade Administrativa de Serviços Gerais).
   * Formato: 6 dígitos numéricos. Ex: "123456"
   */
  @Column({ type: 'varchar', length: 6, nullable: true })
  uasg: string;

  /**
   * Unidade demandante dentro do órgão.
   * Ex: "Departamento de Infraestrutura de TI"
   */
  @Column({ type: 'varchar', length: 200, nullable: true })
  unidadeDemandante: string;

  /**
   * Responsável técnico pela elaboração do ETP.
   * Armazena nome e matrícula (opcional).
   */
  @Column({ type: 'jsonb', nullable: true })
  responsavelTecnico: {
    nome: string;
    matricula?: string;
  };

  /**
   * Data de elaboração do ETP.
   */
  @Column({ type: 'date', nullable: true })
  dataElaboracao: Date;

  // ============================================
  // Fim dos Campos de Identificação
  // ============================================

  // ============================================
  // Campos de Objeto e Justificativa (Issue #1224)
  // ============================================

  /**
   * Descrição detalhada do objeto da contratação.
   * Complementa o campo 'objeto' com informações técnicas específicas.
   * Max: 5000 caracteres.
   */
  @Column({ type: 'text', nullable: true })
  descricaoDetalhada: string;

  /**
   * Quantidade estimada a ser contratada.
   * Ex: 100 (unidades), 12 (meses), etc.
   */
  @Column({ type: 'decimal', precision: 15, scale: 2, nullable: true })
  quantidadeEstimada: number;

  /**
   * Unidade de medida para a quantidade.
   * Ex: "unidade", "mês", "hora", "m²", etc.
   */
  @Column({ type: 'varchar', length: 50, nullable: true })
  unidadeMedida: string;

  /**
   * Justificativa técnica e legal para a contratação.
   * Campo obrigatório para ETPs completos.
   * Min: 50, Max: 5000 caracteres.
   */
  @Column({ type: 'text', nullable: true })
  justificativaContratacao: string;

  /**
   * Descrição da necessidade que será atendida pela contratação.
   * Ex: "Modernização dos sistemas legados para suporte a 10.000 usuários"
   */
  @Column({ type: 'text', nullable: true })
  necessidadeAtendida: string;

  /**
   * Benefícios esperados com a contratação.
   * Ex: "Redução de 30% no tempo de processamento de solicitações"
   */
  @Column({ type: 'text', nullable: true })
  beneficiosEsperados: string;

  // ============================================
  // Fim dos Campos de Objeto e Justificativa
  // ============================================

  // ============================================
  // Campos de Requisitos e Riscos (Issue #1225)
  // ============================================

  /**
   * Requisitos técnicos da contratação.
   * Especificações técnicas mínimas do objeto.
   * Max: 5000 caracteres.
   */
  @Column({ type: 'text', nullable: true })
  requisitosTecnicos: string;

  /**
   * Requisitos de qualificação técnica do fornecedor.
   * Ex: Certificações, experiência comprovada, equipe mínima.
   * Max: 3000 caracteres.
   */
  @Column({ type: 'text', nullable: true })
  requisitosQualificacao: string;

  /**
   * Critérios de sustentabilidade ambiental.
   * Conforme IN SLTI/MP nº 01/2010 e legislação ambiental.
   * Max: 2000 caracteres.
   */
  @Column({ type: 'text', nullable: true })
  criteriosSustentabilidade: string;

  /**
   * Garantia exigida na contratação.
   * Ex: "Garantia de 12 meses contra defeitos de fabricação"
   * Max: 500 caracteres.
   */
  @Column({ type: 'varchar', length: 500, nullable: true })
  garantiaExigida: string;

  /**
   * Prazo de execução em dias.
   * Tempo estimado para conclusão do objeto.
   * Min: 1 dia.
   */
  @Column({ type: 'int', nullable: true })
  prazoExecucao: number;

  /**
   * Nível de risco da contratação.
   * BAIXO, MEDIO ou ALTO.
   */
  @Column({
    type: 'enum',
    enum: NivelRisco,
    nullable: true,
  })
  nivelRisco: NivelRisco;

  /**
   * Descrição detalhada dos riscos identificados.
   * Inclui riscos técnicos, operacionais e de mercado.
   * Max: 3000 caracteres.
   */
  @Column({ type: 'text', nullable: true })
  descricaoRiscos: string;

  // ============================================
  // Fim dos Campos de Requisitos e Riscos
  // ============================================

  // ============================================
  // Campos de Estimativa de Custos (Issue #1226)
  // ============================================

  /**
   * Valor unitário do item/serviço.
   * Usado para cálculo do valor estimado total.
   * Precision: 15 dígitos, 2 casas decimais.
   */
  @Column({ type: 'decimal', precision: 15, scale: 2, nullable: true })
  valorUnitario: number;

  /**
   * Fonte de pesquisa de preços utilizada.
   * Ex: "SINAPI", "SICRO", "Painel de Preços", "Cotações de mercado".
   * Descrição detalhada das fontes consultadas.
   * Max: 2000 caracteres.
   */
  @Column({ type: 'text', nullable: true })
  fontePesquisaPrecos: string;

  /**
   * Dotação orçamentária para a contratação.
   * Código da dotação no orçamento público.
   * Ex: "02.031.0001.2001.339039"
   * Max: 100 caracteres.
   */
  @Column({ type: 'varchar', length: 100, nullable: true })
  dotacaoOrcamentaria: string;

  // ============================================
  // Fim dos Campos de Estimativa de Custos
  // ============================================

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

  @OneToMany(() => EtpSection, (section) => section.etp, { cascade: true })
  sections: EtpSection[];

  @OneToMany(() => EtpVersion, (version) => version.etp, { cascade: true })
  versions: EtpVersion[];

  @OneToMany(() => AuditLog, (log) => log.etp)
  auditLogs: AuditLog[];
}
