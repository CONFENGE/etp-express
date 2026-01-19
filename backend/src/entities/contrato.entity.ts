import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Edital } from './edital.entity';
import { User } from './user.entity';
import { Organization } from './organization.entity';

/**
 * Status do Contrato conforme ciclo de vida.
 * Representa as etapas desde a minuta até o encerramento.
 */
export enum ContratoStatus {
  /** Contrato em elaboração, ainda não assinado */
  MINUTA = 'minuta',
  /** Contrato assinado e vigente, mas sem execução iniciada */
  ASSINADO = 'assinado',
  /** Contrato em execução com medições/entregas em andamento */
  EM_EXECUCAO = 'em_execucao',
  /** Contrato com termo aditivo aprovado */
  ADITIVADO = 'aditivado',
  /** Execução suspensa temporariamente */
  SUSPENSO = 'suspenso',
  /** Encerrado antecipadamente por rescisão */
  RESCINDIDO = 'rescindido',
  /** Finalizado normalmente ao término da vigência */
  ENCERRADO = 'encerrado',
}

/**
 * Entity Contrato - Instrumento formal de contratação pública.
 *
 * Representa o contrato resultante de um processo licitatório ou contratação direta.
 * Gerencia o ciclo de vida completo desde a minuta até o encerramento.
 *
 * Fluxo: ETP → Termo de Referência → Edital → **Contrato**
 *
 * @see Lei 14.133/2021 Art. 90-129 - Contratos Administrativos
 * @see Lei 14.133/2021 Art. 92 - Cláusulas necessárias
 */
@Entity('contratos')
export class Contrato {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // ============================================
  // Relacionamento com documentos anteriores
  // ============================================

  /**
   * ID do Edital que originou este Contrato (opcional).
   * Um Contrato pode derivar de um Edital ou ser contratação direta.
   */
  @Column({ type: 'uuid', nullable: true })
  editalId: string | null;

  @ManyToOne(() => Edital, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'editalId' })
  edital?: Edital;

  // ============================================
  // Multi-tenancy (B2G)
  // ============================================

  /**
   * Organization ID para isolamento multi-tenant.
   */
  @Column({ type: 'uuid' })
  organizationId: string;

  @ManyToOne(() => Organization, { eager: true })
  @JoinColumn({ name: 'organizationId' })
  organization: Organization;

  // ============================================
  // Identificação do Contrato (Art. 92)
  // ============================================

  /**
   * Número do contrato.
   * Identificação única do contrato no órgão.
   * Ex: "001/2024-CONTRATO"
   */
  @Column({ type: 'varchar', length: 50 })
  numero: string;

  /**
   * Número do processo administrativo.
   * Vincula o contrato ao processo licitatório ou de contratação direta.
   * Ex: "12345.678910/2024-11"
   */
  @Column({ type: 'varchar', length: 50, nullable: true })
  numeroProcesso: string | null;

  // ============================================
  // Objeto (Art. 92, I)
  // ============================================

  /**
   * Objeto do contrato.
   * Descrição clara e precisa do que está sendo contratado.
   * Obrigatório - Art. 92 da Lei 14.133/2021
   */
  @Column({ type: 'text' })
  objeto: string;

  /**
   * Descrição detalhada do objeto.
   * Complemento opcional com especificações técnicas detalhadas.
   */
  @Column({ type: 'text', nullable: true })
  descricaoObjeto: string | null;

  // ============================================
  // Dados do Contratado (Art. 92, II)
  // ============================================

  /**
   * CNPJ do contratado.
   * Identificação fiscal da pessoa jurídica contratada.
   */
  @Column({ type: 'varchar', length: 18 })
  contratadoCnpj: string;

  /**
   * Razão social do contratado.
   * Nome empresarial completo da pessoa jurídica.
   */
  @Column({ type: 'varchar', length: 255 })
  contratadoRazaoSocial: string;

  /**
   * Nome fantasia do contratado (opcional).
   */
  @Column({ type: 'varchar', length: 255, nullable: true })
  contratadoNomeFantasia: string | null;

  /**
   * Endereço completo do contratado.
   */
  @Column({ type: 'text', nullable: true })
  contratadoEndereco: string | null;

  /**
   * Telefone do contratado.
   */
  @Column({ type: 'varchar', length: 20, nullable: true })
  contratadoTelefone: string | null;

  /**
   * Email do contratado.
   */
  @Column({ type: 'varchar', length: 255, nullable: true })
  contratadoEmail: string | null;

  // ============================================
  // Valores (Art. 92, III)
  // ============================================

  /**
   * Valor global do contrato.
   * Valor total da contratação conforme proposta vencedora.
   */
  @Column({ type: 'decimal', precision: 15, scale: 2 })
  valorGlobal: string;

  /**
   * Valor unitário (quando aplicável).
   * Preço por unidade de item/serviço contratado.
   */
  @Column({ type: 'decimal', precision: 15, scale: 2, nullable: true })
  valorUnitario: string | null;

  /**
   * Unidade de medida (quando aplicável).
   * Ex: "unidade", "metro", "hora", "mês"
   */
  @Column({ type: 'varchar', length: 50, nullable: true })
  unidadeMedida: string | null;

  /**
   * Quantidade contratada (quando aplicável).
   */
  @Column({ type: 'decimal', precision: 15, scale: 3, nullable: true })
  quantidadeContratada: string | null;

  // ============================================
  // Vigência (Art. 92, IV e V)
  // ============================================

  /**
   * Data de início da vigência.
   * Quando o contrato passa a vigorar.
   */
  @Column({ type: 'date' })
  vigenciaInicio: Date;

  /**
   * Data de término da vigência.
   * Quando o contrato expira naturalmente.
   */
  @Column({ type: 'date' })
  vigenciaFim: Date;

  /**
   * Prazo de execução em dias.
   * Duração prevista para conclusão do objeto.
   */
  @Column({ type: 'int', nullable: true })
  prazoExecucao: number | null;

  /**
   * Possibilidade de prorrogação.
   * Condições contratuais para prorrogação de vigência.
   */
  @Column({ type: 'text', nullable: true })
  possibilidadeProrrogacao: string | null;

  // ============================================
  // Gestão do Contrato (Art. 117)
  // ============================================

  /**
   * Gestor responsável pelo contrato.
   * Servidor designado para gerenciar a execução contratual (Art. 117).
   */
  @Column({ type: 'uuid' })
  gestorResponsavelId: string;

  @ManyToOne(() => User, { eager: true })
  @JoinColumn({ name: 'gestorResponsavelId' })
  gestorResponsavel: User;

  /**
   * Fiscal responsável pelo contrato.
   * Servidor designado para fiscalizar a execução (Art. 117).
   */
  @Column({ type: 'uuid' })
  fiscalResponsavelId: string;

  @ManyToOne(() => User, { eager: true })
  @JoinColumn({ name: 'fiscalResponsavelId' })
  fiscalResponsavel: User;

  // ============================================
  // Cláusulas e Condições
  // ============================================

  /**
   * Dotação orçamentária.
   * Código da dotação no orçamento público.
   * Ex: "02.031.0001.2001.339039"
   */
  @Column({ type: 'varchar', length: 100, nullable: true })
  dotacaoOrcamentaria: string | null;

  /**
   * Fonte de recursos.
   * Origem dos recursos para pagamento (ex: "Tesouro", "Próprios").
   */
  @Column({ type: 'varchar', length: 200, nullable: true })
  fonteRecursos: string | null;

  /**
   * Condições de pagamento.
   * Forma, prazo e condições para pagamento.
   */
  @Column({ type: 'text', nullable: true })
  condicoesPagamento: string | null;

  /**
   * Garantia contratual.
   * Tipo e valor da garantia prestada (caução, seguro-garantia, etc.).
   */
  @Column({ type: 'text', nullable: true })
  garantiaContratual: string | null;

  /**
   * Reajuste contratual.
   * Índice e condições para reajuste de preços.
   */
  @Column({ type: 'text', nullable: true })
  reajusteContratual: string | null;

  /**
   * Sanções administrativas aplicáveis.
   * Penalidades por inadimplemento (multas, suspensão, etc.).
   */
  @Column({ type: 'text', nullable: true })
  sancoesAdministrativas: string | null;

  /**
   * Fundamentação legal.
   * Artigos da Lei 14.133/2021 e outras normas aplicáveis.
   */
  @Column({ type: 'text', nullable: true })
  fundamentacaoLegal: string | null;

  /**
   * Local de entrega/execução.
   * Onde o objeto será entregue ou o serviço executado.
   */
  @Column({ type: 'text', nullable: true })
  localEntrega: string | null;

  /**
   * Cláusulas contratuais (estruturado).
   * Estrutura JSON com todas as cláusulas do contrato.
   */
  @Column({ type: 'jsonb', nullable: true })
  clausulas: Record<string, unknown> | null;

  // ============================================
  // Status e Controle
  // ============================================

  /**
   * Status atual do Contrato.
   */
  @Column({
    type: 'enum',
    enum: ContratoStatus,
    default: ContratoStatus.MINUTA,
  })
  status: ContratoStatus;

  /**
   * Data de assinatura do contrato.
   */
  @Column({ type: 'date', nullable: true })
  dataAssinatura: Date | null;

  /**
   * Data de publicação oficial do contrato.
   */
  @Column({ type: 'date', nullable: true })
  dataPublicacao: Date | null;

  /**
   * Referência da publicação.
   * Onde foi publicado (Diário Oficial, portal).
   */
  @Column({ type: 'varchar', length: 200, nullable: true })
  referenciaPublicacao: string | null;

  /**
   * Versão do contrato.
   * Incrementado a cada termo aditivo.
   */
  @Column({ type: 'int', default: 1 })
  versao: number;

  /**
   * Observações internas.
   * Anotações internas não publicadas no contrato.
   */
  @Column({ type: 'text', nullable: true })
  observacoesInternas: string | null;

  /**
   * Motivo de rescisão (quando status = RESCINDIDO).
   */
  @Column({ type: 'text', nullable: true })
  motivoRescisao: string | null;

  /**
   * Data de rescisão (quando status = RESCINDIDO).
   */
  @Column({ type: 'date', nullable: true })
  dataRescisao: Date | null;

  // ============================================
  // Auditoria
  // ============================================

  /**
   * Usuário que criou o Contrato.
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
