import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Contrato } from './contrato.entity';
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
   * Eager loading para facilitar acesso aos dados do contrato.
   */
  @ManyToOne(() => Contrato, { eager: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'contratoId' })
  contrato: Contrato;

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
  @ManyToOne(() => User, { eager: true })
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

  @ManyToOne(() => User, { eager: true })
  @JoinColumn({ name: 'createdById' })
  createdBy: User;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
