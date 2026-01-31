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
 * Tipo de Ocorrência conforme natureza do evento.
 */
export enum OcorrenciaTipo {
  /** Atraso na execução de serviços ou entregas */
  ATRASO = 'atraso',
  /** Falha técnica ou de qualidade na execução */
  FALHA = 'falha',
  /** Inadimplência contratual ou descumprimento de cláusulas */
  INADIMPLENCIA = 'inadimplencia',
  /** Outros tipos de ocorrências não categorizados */
  OUTRO = 'outro',
}

/**
 * Gravidade da Ocorrência conforme impacto.
 */
export enum OcorrenciaGravidade {
  /** Impacto mínimo, não afeta a execução */
  BAIXA = 'baixa',
  /** Impacto moderado, atenção necessária */
  MEDIA = 'media',
  /** Impacto alto, compromete a execução */
  ALTA = 'alta',
  /** Impacto crítico, requer ação imediata */
  CRITICA = 'critica',
}

/**
 * Status da Ocorrência conforme fluxo de resolução.
 */
export enum OcorrenciaStatus {
  /** Ocorrência registrada, aguardando análise */
  ABERTA = 'aberta',
  /** Ocorrência em análise pelo gestor/fiscal */
  EM_ANALISE = 'em_analise',
  /** Ocorrência resolvida, ação corretiva concluída */
  RESOLVIDA = 'resolvida',
  /** Ocorrência cancelada (registro equivocado) */
  CANCELADA = 'cancelada',
}

/**
 * Entity Ocorrencia - Registro de eventos, falhas e atrasos em contratos.
 *
 * Permite rastrear e documentar problemas durante a execução contratual,
 * facilitando a fiscalização e aplicação de sanções quando necessário.
 *
 * Fluxo: Fiscal registra ocorrência → Gestor analisa → Ação corretiva → Resolução
 *
 * @see Lei 14.133/2021 Art. 117 - Fiscalização de contratos
 * @see Lei 14.133/2021 Art. 156 - Sanções administrativas
 */
@Entity('ocorrencias')
export class Ocorrencia {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // ============================================
  // Relacionamento com Contrato
  // ============================================

  /**
   * ID do Contrato ao qual esta ocorrência pertence.
   */
  @Column({ type: 'uuid' })
  contratoId: string;

  /**
   * Relacionamento com Contrato.
   * Lazy loaded to prevent N+1 queries. Use explicit joins in services when needed.
   * Issue #1717 - Remove cascading eager loading
   */
  @ManyToOne(() => Contrato, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'contratoId' })
  contrato: Contrato;

  // ============================================
  // Classificação da Ocorrência
  // ============================================

  /**
   * Tipo da ocorrência.
   * Categoriza a natureza do evento registrado.
   */
  @Column({
    type: 'enum',
    enum: OcorrenciaTipo,
  })
  tipo: OcorrenciaTipo;

  /**
   * Gravidade da ocorrência.
   * Indica o nível de impacto no contrato.
   * Gravidade CRÍTICA requer ação corretiva obrigatória.
   */
  @Column({
    type: 'enum',
    enum: OcorrenciaGravidade,
  })
  gravidade: OcorrenciaGravidade;

  /**
   * Data em que a ocorrência aconteceu.
   * Registro temporal do evento (não confundir com createdAt).
   */
  @Column({ type: 'date' })
  dataOcorrencia: Date;

  // ============================================
  // Descrição e Ação Corretiva
  // ============================================

  /**
   * Descrição detalhada da ocorrência.
   * Relato completo do evento, contexto e evidências.
   * Mínimo 20 caracteres (validado na camada de serviço).
   */
  @Column({ type: 'text' })
  descricao: string;

  /**
   * Ação corretiva aplicada ou a ser aplicada.
   * Medidas tomadas para resolver a ocorrência.
   * Obrigatório para gravidade CRÍTICA.
   */
  @Column({ type: 'text', nullable: true })
  acaoCorretiva: string | null;

  /**
   * Prazo para resolução da ocorrência.
   * Data limite para conclusão da ação corretiva.
   */
  @Column({ type: 'date', nullable: true })
  prazoResolucao: Date | null;

  // ============================================
  // Status e Controle
  // ============================================

  /**
   * Status atual da ocorrência.
   * Controla o fluxo de resolução da ocorrência.
   */
  @Column({
    type: 'enum',
    enum: OcorrenciaStatus,
    default: OcorrenciaStatus.ABERTA,
  })
  status: OcorrenciaStatus;

  // ============================================
  // Responsabilidade
  // ============================================

  /**
   * ID do usuário que registrou a ocorrência.
   * Geralmente o fiscal ou gestor do contrato.
   */
  @Column({ type: 'uuid' })
  registradoPorId: string;

  /**
   * Relacionamento com usuário que registrou.
   */
  @ManyToOne(() => User)
  @JoinColumn({ name: 'registradoPorId' })
  registradoPor: User;

  // ============================================
  // Auditoria
  // ============================================

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
