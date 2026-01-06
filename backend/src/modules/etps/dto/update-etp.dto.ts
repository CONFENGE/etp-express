import {
  IsString,
  IsOptional,
  IsNumber,
  IsEnum,
  IsObject,
  MinLength,
  MaxLength,
  Matches,
  ValidateNested,
  IsDateString,
  Min,
  IsInt,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { EtpStatus, NivelRisco } from '../../../entities/etp.entity';
import { ResponsavelTecnicoDto } from './create-etp.dto';

export class UpdateEtpDto {
  @ApiPropertyOptional({
    example: 'ETP - Contratação de Serviços de TI (Atualizado)',
  })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({ example: 'Descrição atualizada do estudo técnico' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: 'Objeto atualizado da contratação' })
  @IsOptional()
  @IsString()
  objeto?: string;

  @ApiPropertyOptional({ example: '2023/001234' })
  @IsOptional()
  @IsString()
  numeroProcesso?: string;

  @ApiPropertyOptional({ example: 550000.0 })
  @IsOptional()
  @IsNumber()
  valorEstimado?: number;

  @ApiPropertyOptional({ enum: EtpStatus })
  @IsOptional()
  @IsEnum(EtpStatus)
  status?: EtpStatus;

  @ApiPropertyOptional({
    example: {
      orgao: 'Ministério da Economia',
      tags: ['TI', 'Desenvolvimento', 'Urgente'],
    },
  })
  @IsOptional()
  @IsObject()
  metadata?: {
    orgao?: string;
    unidadeRequisitante?: string;
    responsavelTecnico?: string;
    fundamentacaoLegal?: string[];
    tags?: string[];
    [key: string]: unknown;
  };

  // ============================================
  // Campos de Identificação (Issue #1223)
  // ============================================

  @ApiPropertyOptional({ example: 'Secretaria Municipal de Tecnologia' })
  @IsOptional()
  @IsString()
  @MinLength(3, { message: 'Órgão/Entidade deve ter no mínimo 3 caracteres' })
  @MaxLength(200, {
    message: 'Órgão/Entidade deve ter no máximo 200 caracteres',
  })
  orgaoEntidade?: string;

  @ApiPropertyOptional({
    example: '123456',
    description: 'Código UASG - 6 dígitos numéricos',
  })
  @IsOptional()
  @IsString()
  @Matches(/^\d{6}$/, {
    message: 'UASG deve conter exatamente 6 dígitos numéricos',
  })
  uasg?: string;

  @ApiPropertyOptional({ example: 'Departamento de Infraestrutura de TI' })
  @IsOptional()
  @IsString()
  @MaxLength(200, {
    message: 'Unidade demandante deve ter no máximo 200 caracteres',
  })
  unidadeDemandante?: string;

  @ApiPropertyOptional({
    example: { nome: 'João Silva', matricula: '12345' },
    description: 'Responsável técnico pela elaboração do ETP',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => ResponsavelTecnicoDto)
  responsavelTecnico?: ResponsavelTecnicoDto;

  @ApiPropertyOptional({
    example: '2024-01-15',
    description: 'Data de elaboração do ETP (formato ISO 8601)',
  })
  @IsOptional()
  @IsDateString(
    {},
    {
      message: 'Data de elaboração deve estar no formato ISO 8601 (YYYY-MM-DD)',
    },
  )
  dataElaboracao?: string;

  // ============================================
  // Campos de Objeto e Justificativa (Issue #1224)
  // ============================================

  @ApiPropertyOptional({
    example:
      'Contratação de empresa especializada para desenvolvimento e manutenção de sistemas web.',
    description: 'Descrição detalhada do objeto da contratação (max: 5000)',
  })
  @IsOptional()
  @IsString()
  @MaxLength(5000, {
    message: 'Descrição detalhada deve ter no máximo 5000 caracteres',
  })
  descricaoDetalhada?: string;

  @ApiPropertyOptional({
    example: 12,
    description: 'Quantidade estimada a ser contratada',
  })
  @IsOptional()
  @IsNumber()
  @Min(1, { message: 'Quantidade estimada deve ser no mínimo 1' })
  quantidadeEstimada?: number;

  @ApiPropertyOptional({
    example: 'mês',
    description: 'Unidade de medida (ex: unidade, mês, hora, m²)',
  })
  @IsOptional()
  @IsString()
  @MaxLength(50, {
    message: 'Unidade de medida deve ter no máximo 50 caracteres',
  })
  unidadeMedida?: string;

  @ApiPropertyOptional({
    example:
      'A contratação se justifica pela necessidade de modernização dos sistemas legados.',
    description:
      'Justificativa técnica e legal para a contratação (min: 50, max: 5000)',
  })
  @IsOptional()
  @IsString()
  @MinLength(50, {
    message: 'Justificativa da contratação deve ter no mínimo 50 caracteres',
  })
  @MaxLength(5000, {
    message: 'Justificativa da contratação deve ter no máximo 5000 caracteres',
  })
  justificativaContratacao?: string;

  @ApiPropertyOptional({
    example:
      'Atender à demanda de 10.000 usuários internos com sistema de gestão integrado.',
    description: 'Descrição da necessidade que será atendida (max: 3000)',
  })
  @IsOptional()
  @IsString()
  @MaxLength(3000, {
    message: 'Necessidade atendida deve ter no máximo 3000 caracteres',
  })
  necessidadeAtendida?: string;

  @ApiPropertyOptional({
    example: 'Redução de 30% no tempo de processamento de solicitações.',
    description: 'Benefícios esperados com a contratação (max: 3000)',
  })
  @IsOptional()
  @IsString()
  @MaxLength(3000, {
    message: 'Benefícios esperados deve ter no máximo 3000 caracteres',
  })
  beneficiosEsperados?: string;

  // ============================================
  // Fim dos Campos de Objeto e Justificativa
  // ============================================

  // ============================================
  // Campos de Requisitos e Riscos (Issue #1225)
  // ============================================

  @ApiPropertyOptional({
    example:
      'Sistema deve suportar 10.000 usuários simultâneos; Tempo de resposta máximo de 2 segundos.',
    description: 'Requisitos técnicos da contratação (max: 5000)',
  })
  @IsOptional()
  @IsString()
  @MaxLength(5000, {
    message: 'Requisitos técnicos deve ter no máximo 5000 caracteres',
  })
  requisitosTecnicos?: string;

  @ApiPropertyOptional({
    example:
      'Empresa deve possuir certificação ISO 9001; Equipe mínima de 5 desenvolvedores seniores.',
    description: 'Requisitos de qualificação técnica do fornecedor (max: 3000)',
  })
  @IsOptional()
  @IsString()
  @MaxLength(3000, {
    message: 'Requisitos de qualificação deve ter no máximo 3000 caracteres',
  })
  requisitosQualificacao?: string;

  @ApiPropertyOptional({
    example:
      'Utilização de materiais recicláveis; Equipamentos com certificação Energy Star.',
    description: 'Critérios de sustentabilidade ambiental (max: 2000)',
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000, {
    message: 'Critérios de sustentabilidade deve ter no máximo 2000 caracteres',
  })
  criteriosSustentabilidade?: string;

  @ApiPropertyOptional({
    example:
      'Garantia de 12 meses contra defeitos de fabricação e vícios ocultos',
    description: 'Garantia exigida na contratação (max: 500)',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500, {
    message: 'Garantia exigida deve ter no máximo 500 caracteres',
  })
  garantiaExigida?: string;

  @ApiPropertyOptional({
    example: 180,
    description: 'Prazo de execução em dias (min: 1)',
  })
  @IsOptional()
  @IsInt({ message: 'Prazo de execução deve ser um número inteiro' })
  @Min(1, { message: 'Prazo de execução deve ser no mínimo 1 dia' })
  prazoExecucao?: number;

  @ApiPropertyOptional({
    example: 'MEDIO',
    description: 'Nível de risco da contratação',
    enum: NivelRisco,
  })
  @IsOptional()
  @IsEnum(NivelRisco, {
    message: 'Nível de risco deve ser BAIXO, MEDIO ou ALTO',
  })
  nivelRisco?: NivelRisco;

  @ApiPropertyOptional({
    example: 'Risco de atraso na entrega devido à complexidade técnica.',
    description: 'Descrição detalhada dos riscos identificados (max: 3000)',
  })
  @IsOptional()
  @IsString()
  @MaxLength(3000, {
    message: 'Descrição de riscos deve ter no máximo 3000 caracteres',
  })
  descricaoRiscos?: string;

  // ============================================
  // Fim dos Campos de Requisitos e Riscos
  // ============================================

  // ============================================
  // Campos de Estimativa de Custos (Issue #1226)
  // ============================================

  @ApiPropertyOptional({
    example: 5000.0,
    description: 'Valor unitário do item/serviço (min: 0)',
  })
  @IsOptional()
  @IsNumber()
  @Min(0, { message: 'Valor unitário deve ser maior ou igual a 0' })
  valorUnitario?: number;

  @ApiPropertyOptional({
    example:
      'Painel de Preços do Governo Federal; SINAPI referência 03/2024; 3 cotações de mercado.',
    description: 'Fonte de pesquisa de preços utilizada (max: 2000)',
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000, {
    message: 'Fonte de pesquisa de preços deve ter no máximo 2000 caracteres',
  })
  fontePesquisaPrecos?: string;

  @ApiPropertyOptional({
    example: '02.031.0001.2001.339039',
    description: 'Dotação orçamentária para a contratação (max: 100)',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100, {
    message: 'Dotação orçamentária deve ter no máximo 100 caracteres',
  })
  dotacaoOrcamentaria?: string;

  // ============================================
  // Fim dos Campos de Estimativa de Custos
  // ============================================
}
