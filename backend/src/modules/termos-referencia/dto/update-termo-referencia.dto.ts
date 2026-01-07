import {
  IsString,
  IsOptional,
  IsNumber,
  IsObject,
  MinLength,
  MaxLength,
  ValidateNested,
  IsEnum,
  IsInt,
  IsBoolean,
  IsArray,
  Min,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  TermoReferenciaStatus,
  ModalidadeLicitacao,
  CriterioJulgamento,
  RegimeExecucao,
} from '../../../entities/termo-referencia.entity';
import {
  EspecificacaoTecnicaDto,
  EtapaCronogramaDto,
  ObrigacaoContratualDto,
  PenalidadeDto,
  GarantiaContratualDto,
  IndicadorDesempenhoDto,
} from './create-termo-referencia.dto';

/**
 * DTO para atualização de Termo de Referência.
 *
 * @description
 * Todos os campos são opcionais para permitir atualizações parciais (PATCH).
 *
 * @see Issue #1248 - [TR-a] Criar entity TermoReferencia e relacionamentos
 * @see Milestone M10 - Termo de Referência
 */
export class UpdateTermoReferenciaDto {
  // ============================================
  // Identificação do Documento
  // ============================================

  @ApiPropertyOptional({
    example: 'TR-2024/001',
    description: 'Número sequencial do TR',
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  numeroTR?: string;

  @ApiPropertyOptional({
    example: '23000.123456/2024-00',
    description: 'Número do processo administrativo',
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  numeroProcesso?: string;

  @ApiPropertyOptional({
    example: 'Termo de Referência para Contratação de Serviços de TI',
    description: 'Título descritivo do TR',
  })
  @IsOptional()
  @IsString()
  @MinLength(10)
  @MaxLength(500)
  titulo?: string;

  // ============================================
  // Definição do Objeto
  // ============================================

  @ApiPropertyOptional({
    example:
      'Contratação de empresa especializada para prestação de serviços...',
    description: 'Descrição detalhada do objeto',
  })
  @IsOptional()
  @IsString()
  @MinLength(50)
  @MaxLength(10000)
  objeto?: string;

  @ApiPropertyOptional({
    example: 'Serviço Comum',
    description: 'Natureza do objeto',
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  naturezaObjeto?: string;

  @ApiPropertyOptional({
    example: 'A contratação se justifica pela necessidade de modernização...',
    description: 'Justificativa da contratação',
  })
  @IsOptional()
  @IsString()
  @MaxLength(10000)
  justificativa?: string;

  // ============================================
  // Especificações Técnicas
  // ============================================

  @ApiPropertyOptional({
    type: [EspecificacaoTecnicaDto],
    description: 'Lista de especificações técnicas',
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EspecificacaoTecnicaDto)
  especificacoes?: EspecificacaoTecnicaDto[];

  @ApiPropertyOptional({
    example: 'Sistema deve suportar 10.000 usuários simultâneos...',
    description: 'Requisitos técnicos obrigatórios',
  })
  @IsOptional()
  @IsString()
  @MaxLength(10000)
  requisitosTecnicos?: string;

  @ApiPropertyOptional({
    example: 'Empresa deve possuir certificação ISO 9001...',
    description: 'Requisitos de qualificação técnica',
  })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  requisitosQualificacao?: string;

  @ApiPropertyOptional({
    example: ['NBR ISO 9001:2015', 'NBR ISO 27001:2013'],
    description: 'Normas técnicas aplicáveis',
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  normasAplicaveis?: string[];

  // ============================================
  // Valores e Quantitativos
  // ============================================

  @ApiPropertyOptional({
    example: 500000.0,
    description: 'Valor total estimado',
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  valorEstimado?: number;

  @ApiPropertyOptional({
    example: 12,
    description: 'Quantidade total',
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  quantidade?: number;

  @ApiPropertyOptional({
    example: 'mês',
    description: 'Unidade de medida',
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  unidadeMedida?: string;

  @ApiPropertyOptional({
    example: 'Painel de Preços PNCP, SINAPI 03/2024, 3 cotações de mercado',
    description: 'Metodologia de estimativa de preços',
  })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  metodologiaPrecos?: string;

  // ============================================
  // Parâmetros da Licitação
  // ============================================

  @ApiPropertyOptional({
    example: 'PREGAO',
    description: 'Modalidade de licitação',
    enum: ModalidadeLicitacao,
  })
  @IsOptional()
  @IsEnum(ModalidadeLicitacao)
  modalidade?: ModalidadeLicitacao;

  @ApiPropertyOptional({
    example: 'MENOR_PRECO',
    description: 'Critério de julgamento',
    enum: CriterioJulgamento,
  })
  @IsOptional()
  @IsEnum(CriterioJulgamento)
  criterioJulgamento?: CriterioJulgamento;

  @ApiPropertyOptional({
    example: 'EMPREITADA_PRECO_UNITARIO',
    description: 'Regime de execução',
    enum: RegimeExecucao,
  })
  @IsOptional()
  @IsEnum(RegimeExecucao)
  regimeExecucao?: RegimeExecucao;

  @ApiPropertyOptional({
    example:
      'A modalidade Pregão foi escolhida por tratar-se de serviço comum...',
    description: 'Justificativa para modalidade escolhida',
  })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  justificativaModalidade?: string;

  // ============================================
  // Prazos e Cronograma
  // ============================================

  @ApiPropertyOptional({
    example: 12,
    description: 'Prazo de vigência em meses',
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  prazoVigencia?: number;

  @ApiPropertyOptional({
    example: 180,
    description: 'Prazo de execução em dias',
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  prazoExecucao?: number;

  @ApiPropertyOptional({
    example: true,
    description: 'Permite prorrogação',
  })
  @IsOptional()
  @IsBoolean()
  permiteProrrogacao?: boolean;

  @ApiPropertyOptional({
    type: [EtapaCronogramaDto],
    description: 'Cronograma físico-financeiro',
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EtapaCronogramaDto)
  cronograma?: EtapaCronogramaDto[];

  // ============================================
  // Condições Contratuais
  // ============================================

  @ApiPropertyOptional({
    example: 'Pagamento em até 30 dias após ateste da nota fiscal',
    description: 'Forma de pagamento',
  })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  formaPagamento?: string;

  @ApiPropertyOptional({
    example: '02.031.0001.2001.339039',
    description: 'Dotação orçamentária',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  dotacaoOrcamentaria?: string;

  @ApiPropertyOptional({
    example: 'Sede da Secretaria de Tecnologia, Av. Principal, 1000',
    description: 'Local de entrega ou execução',
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  localEntrega?: string;

  @ApiPropertyOptional({
    type: GarantiaContratualDto,
    description: 'Garantia contratual exigida',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => GarantiaContratualDto)
  garantiaContratual?: GarantiaContratualDto;

  // ============================================
  // Obrigações e Responsabilidades
  // ============================================

  @ApiPropertyOptional({
    type: [ObrigacaoContratualDto],
    description: 'Lista de obrigações contratuais',
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ObrigacaoContratualDto)
  obrigacoes?: ObrigacaoContratualDto[];

  @ApiPropertyOptional({
    example: 'O contrato será gerido pelo Núcleo de Gestão de Contratos...',
    description: 'Modelo de gestão e fiscalização',
  })
  @IsOptional()
  @IsString()
  @MaxLength(10000)
  modeloGestao?: string;

  @ApiPropertyOptional({
    type: [IndicadorDesempenhoDto],
    description: 'Indicadores de desempenho',
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => IndicadorDesempenhoDto)
  indicadoresDesempenho?: IndicadorDesempenhoDto[];

  // ============================================
  // Sanções e Penalidades
  // ============================================

  @ApiPropertyOptional({
    type: [PenalidadeDto],
    description: 'Tabela de penalidades',
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PenalidadeDto)
  penalidades?: PenalidadeDto[];

  // ============================================
  // Sustentabilidade
  // ============================================

  @ApiPropertyOptional({
    example: 'Utilização de materiais recicláveis; Equipamentos Energy Star...',
    description: 'Critérios de sustentabilidade ambiental',
  })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  criteriosSustentabilidade?: string;

  // ============================================
  // Fundamentação Legal
  // ============================================

  @ApiPropertyOptional({
    example: ['Lei 14.133/2021, Art. 6º, XXIII', 'IN SEGES/ME nº 65/2021'],
    description: 'Referências legais',
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  fundamentacaoLegal?: string[];

  // ============================================
  // Status e Controle
  // ============================================

  @ApiPropertyOptional({
    example: 'in_progress',
    description: 'Status do TR',
    enum: TermoReferenciaStatus,
  })
  @IsOptional()
  @IsEnum(TermoReferenciaStatus)
  status?: TermoReferenciaStatus;

  // ============================================
  // Metadados
  // ============================================

  @ApiPropertyOptional({
    example: {
      tags: ['TI', 'Desenvolvimento'],
      observacoesInternas: 'Urgente',
    },
    description: 'Metadados adicionais',
  })
  @IsOptional()
  @IsObject()
  metadata?: {
    tags?: string[];
    observacoesInternas?: string;
    [key: string]: unknown;
  };
}
