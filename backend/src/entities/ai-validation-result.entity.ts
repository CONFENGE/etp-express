import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Etp } from './etp.entity';
import { Edital } from './edital.entity';

/**
 * Tipos de irregularidades detectadas pelo sistema ALICE-like
 */
export enum IrregularityType {
  SUPERFATURAMENTO = 'SUPERFATURAMENTO', // Preço muito acima do mercado
  DIRECIONAMENTO = 'DIRECIONAMENTO', // Edital direcionado para fornecedor específico
  VINCULOS_SOCIETARIOS = 'VINCULOS_SOCIETARIOS', // Vínculos suspeitos entre participantes
  FRACIONAMENTO = 'FRACIONAMENTO', // Fracionamento de despesa para evitar licitação
  PADROES_PRECO = 'PADROES_PRECO', // Padrões anormais de precificação
  ESPECIFICACAO_RESTRITIVA = 'ESPECIFICACAO_RESTRITIVA', // Especificações excessivamente restritivas
  PRAZO_INADEQUADO = 'PRAZO_INADEQUADO', // Prazo insuficiente para formulação de propostas
  AUSENCIA_JUSTIFICATIVA = 'AUSENCIA_JUSTIFICATIVA', // Falta de justificativa adequada
  DISPENSA_IRREGULAR = 'DISPENSA_IRREGULAR', // Uso inadequado de dispensa/inexigibilidade
  VALOR_INCOMPATIVEL = 'VALOR_INCOMPATIVEL', // Valor incompatível com complexidade do objeto
}

/**
 * Nível de severidade da irregularidade
 */
export enum SeverityLevel {
  INFO = 'INFO', // Informativo, sem risco significativo
  LOW = 'LOW', // Risco baixo, recomenda-se atenção
  MEDIUM = 'MEDIUM', // Risco médio, requer correção
  HIGH = 'HIGH', // Risco alto, pode ser questionado
  CRITICAL = 'CRITICAL', // Risco crítico, alta probabilidade de rejeição
}

/**
 * Status do alerta de validação
 */
export enum ValidationStatus {
  PENDING = 'PENDING', // Aguardando análise
  ACKNOWLEDGED = 'ACKNOWLEDGED', // Reconhecido pela equipe
  RESOLVED = 'RESOLVED', // Corrigido
  FALSE_POSITIVE = 'FALSE_POSITIVE', // Falso positivo
  ACCEPTED_RISK = 'ACCEPTED_RISK', // Risco aceito conscientemente
}

/**
 * Entity para armazenar resultados de validação AI (similar ao ALICE do TCU)
 *
 * Issue #1291 - [IA] Validação automática similar ao ALICE/TCU
 *
 * O robô ALICE do TCU analisa licitações com 89% de precisão.
 * Este sistema replica funcionalidades similares para detecção proativa de irregularidades.
 */
@Entity('ai_validation_results')
@Index(['etpId', 'createdAt'])
@Index(['editalId', 'createdAt'])
@Index(['irregularityType', 'severityLevel'])
@Index(['status', 'severityLevel'])
export class AiValidationResult {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', nullable: true })
  @Index()
  etpId: string | null;

  @ManyToOne(() => Etp, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'etpId' })
  etp?: Etp;

  @Column({ type: 'uuid', nullable: true })
  @Index()
  editalId: string | null;

  @ManyToOne(() => Edital, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'editalId' })
  edital?: Edital;

  @Column({
    type: 'enum',
    enum: IrregularityType,
  })
  irregularityType: IrregularityType;

  @Column({
    type: 'enum',
    enum: SeverityLevel,
  })
  severityLevel: SeverityLevel;

  @Column({
    type: 'enum',
    enum: ValidationStatus,
    default: ValidationStatus.PENDING,
  })
  status: ValidationStatus;

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'text', nullable: true })
  evidence: string | null;

  @Column({ type: 'text', nullable: true })
  recommendation: string | null;

  /**
   * Score de confiança da detecção (0-100)
   */
  @Column({ type: 'decimal', precision: 5, scale: 2 })
  confidenceScore: number;

  /**
   * Dados adicionais específicos do tipo de irregularidade
   */
  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any> | null;

  /**
   * Campo específico do documento que gerou o alerta
   */
  @Column({ type: 'varchar', length: 255, nullable: true })
  affectedField: string | null;

  /**
   * Valor encontrado que gerou o alerta
   */
  @Column({ type: 'text', nullable: true })
  affectedValue: string | null;

  /**
   * Referência legal ou normativa aplicável
   */
  @Column({ type: 'text', nullable: true })
  legalReference: string | null;

  /**
   * ID do usuário que reconheceu/resolveu o alerta
   */
  @Column({ type: 'uuid', nullable: true })
  acknowledgedBy: string | null;

  @Column({ type: 'timestamp', nullable: true })
  acknowledgedAt: Date | null;

  @Column({ type: 'text', nullable: true })
  acknowledgeNote: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
