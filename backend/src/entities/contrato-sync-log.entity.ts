import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { Contrato } from './contrato.entity';
import { Organization } from './organization.entity';

/**
 * Interface para representar um conflito detectado
 * entre dados locais e remotos (Gov.br)
 */
export interface ConflictField {
  /** Nome do campo com conflito */
  field: string;
  /** Valor armazenado localmente */
  localValue: any;
  /** Valor retornado pela API Gov.br */
  remoteValue: any;
}

/**
 * Entity ContratoSyncLog - Registro de sincronização de contratos com Gov.br
 *
 * Armazena logs de todas as operações de sincronização (push/pull)
 * e resolução de conflitos entre dados locais e remotos.
 *
 * Issue: #1677 - Implementar tratamento de conflitos de sincronização
 * Parent Issue: #1289 - Integração com Contratos Gov.br
 *
 * @see docs/integrations/contratos-gov-br-api.md
 */
@Entity('contrato_sync_logs')
export class ContratoSyncLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /**
   * Organization ID for multi-tenancy isolation.
   * Required for all sync logs.
   */
  @Column({ type: 'uuid' })
  @Index('IDX_contrato_sync_log_organizationId')
  organizationId: string;

  @ManyToOne(() => Organization)
  @JoinColumn({ name: 'organizationId' })
  organization: Organization;

  /**
   * Relacionamento com Contrato
   */
  @ManyToOne(() => Contrato, { eager: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'contratoId' })
  contrato: Contrato;

  @Column({ type: 'uuid' })
  contratoId: string;

  /**
   * Ação de sincronização executada
   * - push: Envio de contrato local para Gov.br
   * - pull: Recebimento de contrato do Gov.br
   * - conflict_resolved: Conflito detectado e resolvido
   */
  @Column({
    type: 'enum',
    enum: ['push', 'pull', 'conflict_resolved'],
  })
  action: 'push' | 'pull' | 'conflict_resolved';

  /**
   * Lista de conflitos detectados (quando action = conflict_resolved)
   * Formato: [{ field: 'valorGlobal', localValue: 100000, remoteValue: 105000 }]
   */
  @Column({ type: 'jsonb', nullable: true })
  conflicts?: ConflictField[];

  /**
   * Dados finais aplicados após resolução de conflito
   * Armazena o objeto Partial<Contrato> resultante da estratégia de resolução
   */
  @Column({ type: 'jsonb', nullable: true })
  resolution?: any;

  /**
   * Timestamp de criação do log
   */
  @CreateDateColumn()
  createdAt: Date;
}
