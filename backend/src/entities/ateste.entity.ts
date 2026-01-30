import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Medicao } from './medicao.entity';
import { User } from './user.entity';
import { Organization } from './organization.entity';

/**
 * Resultado do Ateste conforme análise do fiscal.
 */
export enum AtesteResultado {
  /** Medição aprovada integralmente sem ressalvas */
  APROVADO = 'aprovado',
  /** Aprovado com ressalvas (valor atestado diferente do medido) */
  APROVADO_COM_RESSALVAS = 'aprovado_com_ressalvas',
  /** Medição rejeitada, precisa correção */
  REJEITADO = 'rejeitado',
}

/**
 * Entity Ateste - Aprovação de medições pelo fiscal.
 *
 * Representa o registro formal de ateste de medições contratuais,
 * essencial para liberação de pagamentos e conformidade legal.
 *
 * Fluxo: Fiscal registra medição → Gestor atesta → Pagamento liberado
 *
 * Regras de Negócio:
 * - Justificativa obrigatória para rejeição/ressalvas
 * - Valor atestado não pode exceder valor medido
 * - Medição já atestada não pode ser reatestada
 * - Apenas fiscal responsável pode atestar
 *
 * @see Lei 14.133/2021 Art. 117 - Fiscalização de contratos
 * @see Lei 14.133/2021 Art. 140 - Atesto de execução
 */
@Entity('atestes')
export class Ateste {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // ============================================
  // Multi-Tenancy
  // ============================================

  /**
   * Organization ID for multi-tenancy isolation.
   * Required for all atestes.
   */
  @Column({ type: 'uuid' })
  @Index('IDX_ateste_organizationId')
  organizationId: string;

  @ManyToOne(() => Organization)
  @JoinColumn({ name: 'organizationId' })
  organization: Organization;

  // ============================================
  // Relacionamento com Medição
  // ============================================

  /**
   * ID da Medição atestada.
   * Relacionamento 1:1 - cada medição tem no máximo um ateste.
   */
  @Column({ type: 'uuid', unique: true })
  medicaoId: string;

  /**
   * Relacionamento com Medição.
   * OneToOne - uma medição possui no máximo um ateste.
   * Eager loading ativado para facilitar acesso aos dados da medição.
   */
  @OneToOne(() => Medicao, { eager: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'medicaoId' })
  medicao: Medicao;

  // ============================================
  // Responsabilidade
  // ============================================

  /**
   * ID do Fiscal que realizou o ateste.
   * Servidor responsável pela fiscalização técnica do contrato.
   */
  @Column({ type: 'uuid' })
  fiscalId: string;

  /**
   * Relacionamento com Fiscal.
   * Eager loading para facilitar identificação do responsável.
   */
  @ManyToOne(() => User, { eager: true })
  @JoinColumn({ name: 'fiscalId' })
  fiscal: User;

  // ============================================
  // Resultado do Ateste
  // ============================================

  /**
   * Resultado do ateste.
   * Define se a medição foi aprovada, aprovada com ressalvas ou rejeitada.
   */
  @Column({
    type: 'enum',
    enum: AtesteResultado,
  })
  resultado: AtesteResultado;

  /**
   * Justificativa do ateste.
   * Obrigatória para resultados REJEITADO ou APROVADO_COM_RESSALVAS.
   * Explica motivo da rejeição ou das ressalvas aplicadas.
   */
  @Column({ type: 'text', nullable: true })
  justificativa: string | null;

  // ============================================
  // Valor Atestado (quando há ressalvas)
  // ============================================

  /**
   * Valor atestado (quando diferente do medido).
   * Aplicável quando resultado = APROVADO_COM_RESSALVAS.
   * Não pode exceder o valor medido original.
   * DECIMAL(15,2) para valores de até R$ 9.999.999.999.999,99
   */
  @Column({ type: 'decimal', precision: 15, scale: 2, nullable: true })
  valorAtestado: string | null;

  // ============================================
  // Datas e Observações
  // ============================================

  /**
   * Data de realização do ateste.
   * Momento em que o fiscal formalizou a aprovação/rejeição.
   */
  @Column({ type: 'timestamp' })
  dataAteste: Date;

  /**
   * Observações adicionais sobre o ateste.
   * Notas técnicas, ressalvas operacionais, etc.
   */
  @Column({ type: 'text', nullable: true })
  observacoes: string | null;

  // ============================================
  // Auditoria
  // ============================================

  /**
   * Data de criação do registro de ateste.
   * Auto-gerada pelo TypeORM.
   */
  @CreateDateColumn()
  createdAt: Date;

  /**
   * Data de última atualização do registro.
   * Auto-gerada pelo TypeORM.
   */
  @UpdateDateColumn()
  updatedAt: Date;
}
