import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Contrato } from './contrato.entity';
import { Organization } from './organization.entity';
import { User } from './user.entity';

/**
 * Status da Medição conforme fluxo de aprovação.
 */
export enum MedicaoStatus {
  /** Medição criada, aguardando ateste do fiscal */
  PENDENTE = 'pendente',
  /** Medição aprovada pelo fiscal após ateste */
  APROVADA = 'aprovada',
  /** Medição rejeitada pelo fiscal, precisa correção */
  REJEITADA = 'rejeitada',
}

/**
 * Entity Medicao - Registro de entregas/serviços executados em contratos.
 *
 * Representa o registro formal de medição de execução contratual,
 * utilizado para acompanhamento de entregas e geração de pagamentos.
 *
 * Fluxo: Fiscal registra medição → Gestor atesta → Pagamento liberado
 *
 * @see Lei 14.133/2021 Art. 117 - Fiscalização de contratos
 */
@Entity('medicoes')
export class Medicao {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // ============================================
  // Relacionamento com Contrato
  // ============================================

  /**
   * ID do Contrato ao qual esta medição pertence.
   */
  @Column({ type: 'uuid' })
  contratoId: string;

  /**
   * Relacionamento com Contrato.
   * Lazy loaded to prevent N+1 queries. Use explicit joins in services when needed.
   * Issue #1717 - Remove cascading eager loading
   */
  @ManyToOne(() => Contrato, (contrato) => contrato.medicoes, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'contratoId' })
  contrato: Contrato;

  // ============================================
  // Multi-tenancy (B2G)
  // ============================================

  /**
   * Organization ID para isolamento multi-tenant.
   * Nullable for backward compatibility with existing records.
   * Populated from parent Contrato.organizationId on creation.
   */
  @Column({ type: 'uuid', nullable: true })
  @Index('idx_medicao_organization_id')
  organizationId: string | null;

  /**
   * Organization relation (Multi-Tenancy).
   * Lazy loaded to prevent N+1 queries.
   */
  @ManyToOne(() => Organization, { nullable: true })
  @JoinColumn({ name: 'organizationId' })
  organization: Organization | null;

  // ============================================
  // Identificação da Medição
  // ============================================

  /**
   * Número sequencial da medição.
   * Auto-incrementado dentro do escopo do contrato.
   * Ex: 1ª medição, 2ª medição, etc.
   */
  @Column({ type: 'int' })
  numero: number;

  // ============================================
  // Período de Execução
  // ============================================

  /**
   * Data de início do período medido.
   * Início do período de execução dos serviços/entregas.
   */
  @Column({ type: 'date' })
  periodoInicio: Date;

  /**
   * Data de término do período medido.
   * Fim do período de execução dos serviços/entregas.
   */
  @Column({ type: 'date' })
  periodoFim: Date;

  // ============================================
  // Valores
  // ============================================

  /**
   * Valor medido neste período.
   * Valor dos serviços/entregas executados no período.
   * DECIMAL(15,2) para suportar valores de até R$ 9.999.999.999.999,99
   */
  @Column({ type: 'decimal', precision: 15, scale: 2 })
  valorMedido: string;

  // ============================================
  // Descrição e Detalhamento
  // ============================================

  /**
   * Descrição detalhada do que foi executado.
   * Opcional - permite detalhar entregas, serviços realizados, etc.
   */
  @Column({ type: 'text', nullable: true })
  descricao: string | null;

  /**
   * Observações adicionais sobre a medição.
   * Anotações internas, ressalvas, notas técnicas, etc.
   */
  @Column({ type: 'text', nullable: true })
  observacoes: string | null;

  // ============================================
  // Status e Aprovação
  // ============================================

  /**
   * Status atual da medição.
   * Controla o fluxo de aprovação da medição.
   */
  @Column({
    type: 'enum',
    enum: MedicaoStatus,
    default: MedicaoStatus.PENDENTE,
  })
  status: MedicaoStatus;

  /**
   * ID do Fiscal responsável pela medição.
   * Fiscal designado para registrar e aprovar medições (Art. 117).
   */
  @Column({ type: 'uuid' })
  fiscalResponsavelId: string;

  /**
   * Relacionamento com Fiscal responsável.
   */
  @ManyToOne(() => User)
  @JoinColumn({ name: 'fiscalResponsavelId' })
  fiscalResponsavel: User;

  /**
   * Data do ateste da medição.
   * Quando a medição foi aprovada/rejeitada pelo fiscal.
   */
  @Column({ type: 'timestamp', nullable: true })
  dataAteste: Date | null;

  // ============================================
  // Auditoria
  // ============================================

  /**
   * Usuário que criou a medição.
   * Geralmente o fiscal responsável pela fiscalização.
   */
  @Column({ type: 'uuid' })
  createdById: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'createdById' })
  createdBy: User;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
