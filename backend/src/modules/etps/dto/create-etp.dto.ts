import {
  IsString,
  IsOptional,
  IsNumber,
  IsObject,
  MinLength,
  MaxLength,
  Matches,
  ValidateNested,
  IsDateString,
  Min,
  IsEnum,
  IsInt,
  IsUUID,
  IsBoolean,
  IsArray,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  NivelRisco,
  ObrasDynamicFields,
  TiDynamicFields,
  ServicosDynamicFields,
  MateriaisDynamicFields,
} from '../../../entities/etp.entity';
import { EtpTemplateType } from '../../../entities/etp-template.entity';

/**
 * DTO para responsável técnico do ETP.
 * Issue #1223 - Campos de Identificação
 */
export class ResponsavelTecnicoDto {
  @ApiProperty({ example: 'João Silva' })
  @IsString()
  @MinLength(3, { message: 'Nome deve ter no mínimo 3 caracteres' })
  @MaxLength(200, { message: 'Nome deve ter no máximo 200 caracteres' })
  nome: string;

  @ApiPropertyOptional({ example: '12345' })
  @IsOptional()
  @IsString()
  @MaxLength(50, { message: 'Matrícula deve ter no máximo 50 caracteres' })
  matricula?: string;
}

export class CreateEtpDto {
  @ApiProperty({
    example: 'ETP - Contratação de Serviços de TI',
    description: 'Título do ETP (min: 5, max: 200 caracteres)',
  })
  @IsString({ message: 'Título deve ser uma string' })
  @MinLength(5, { message: 'Título deve ter no mínimo 5 caracteres' })
  @MaxLength(200, { message: 'Título deve ter no máximo 200 caracteres' })
  title: string;

  @ApiPropertyOptional({
    example: 'Estudo técnico para contratação de desenvolvimento de software',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    example:
      'Contratação de empresa especializada em desenvolvimento de sistemas web',
    description: 'Objeto da contratação (min: 10, max: 500 caracteres)',
  })
  @IsString({ message: 'Objeto deve ser uma string' })
  @MinLength(10, {
    message: 'Objeto da contratação deve ter no mínimo 10 caracteres',
  })
  @MaxLength(500, {
    message: 'Objeto da contratação deve ter no máximo 500 caracteres',
  })
  objeto: string;

  @ApiPropertyOptional({ example: '2023/001234' })
  @IsOptional()
  @IsString()
  numeroProcesso?: string;

  @ApiPropertyOptional({ example: 500000.0 })
  @IsOptional()
  @IsNumber()
  valorEstimado?: number;

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
  // Fim dos Campos de Identificação
  // ============================================

  // ============================================
  // Campos de Objeto e Justificativa (Issue #1224)
  // ============================================

  @ApiPropertyOptional({
    example:
      'Contratação de empresa especializada para desenvolvimento e manutenção de sistemas web utilizando tecnologias modernas como React, Node.js e PostgreSQL, incluindo suporte técnico e treinamento.',
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
      'A contratação se justifica pela necessidade de modernização dos sistemas legados da instituição, atualmente operando com tecnologias defasadas que comprometem a eficiência operacional e a segurança da informação.',
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
      'Atender à demanda de 10.000 usuários internos com sistema de gestão integrado, reduzindo o tempo de processamento de solicitações.',
    description: 'Descrição da necessidade que será atendida (max: 3000)',
  })
  @IsOptional()
  @IsString()
  @MaxLength(3000, {
    message: 'Necessidade atendida deve ter no máximo 3000 caracteres',
  })
  necessidadeAtendida?: string;

  @ApiPropertyOptional({
    example:
      'Redução de 30% no tempo de processamento de solicitações; Aumento de 50% na satisfação dos usuários; Economia de R$ 200.000/ano em manutenção.',
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
      'Sistema deve suportar 10.000 usuários simultâneos; Tempo de resposta máximo de 2 segundos; Disponibilidade de 99,9%; Compatibilidade com navegadores Chrome, Firefox e Edge.',
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
      'Empresa deve possuir certificação ISO 9001; Equipe mínima de 5 desenvolvedores seniores; Experiência comprovada em projetos similares nos últimos 3 anos.',
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
      'Utilização de materiais recicláveis; Equipamentos com certificação Energy Star; Descarte adequado de resíduos eletrônicos conforme PNRS.',
    description:
      'Critérios de sustentabilidade ambiental conforme IN SLTI/MP nº 01/2010 (max: 2000)',
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
    example:
      'Risco de atraso na entrega devido à complexidade técnica; Risco de dependência de fornecedor único; Risco de obsolescência tecnológica.',
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
      'Painel de Preços do Governo Federal (https://paineldeprecos.planejamento.gov.br); SINAPI referência 03/2024; 3 cotações de mercado anexas ao processo.',
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

  // ============================================
  // Campos de Template e Campos Dinâmicos (Issue #1240)
  // ============================================

  @ApiPropertyOptional({
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    description: 'ID do template utilizado para criar este ETP',
  })
  @IsOptional()
  @IsUUID('4', { message: 'Template ID deve ser um UUID válido' })
  templateId?: string;

  @ApiPropertyOptional({
    example: 'OBRAS',
    description: 'Tipo de contratação do template',
    enum: EtpTemplateType,
  })
  @IsOptional()
  @IsEnum(EtpTemplateType, {
    message: 'Tipo de template deve ser OBRAS, TI, SERVICOS ou MATERIAIS',
  })
  templateType?: EtpTemplateType;

  @ApiPropertyOptional({
    description: 'Campos dinâmicos específicos do tipo de contratação',
    example: {
      artRrt: '1234567890',
      memorialDescritivo: 'Descrição técnica da obra...',
    },
  })
  @IsOptional()
  @IsObject()
  dynamicFields?:
    | ObrasDynamicFields
    | TiDynamicFields
    | ServicosDynamicFields
    | MateriaisDynamicFields;

  // ============================================
  // Fim dos Campos de Template
  // ============================================

  @ApiPropertyOptional({
    example: {
      unidadeRequisitante: 'Secretaria de Tecnologia',
      responsavelTecnico: 'João Silva',
      tags: ['TI', 'Desenvolvimento'],
    },
  })
  @IsOptional()
  @IsObject()
  metadata?: {
    unidadeRequisitante?: string;
    responsavelTecnico?: string;
    fundamentacaoLegal?: string[];
    tags?: string[];
    [key: string]: unknown;
  };
}

// ============================================
// DTOs de Campos Dinâmicos por Template
// Issue #1240 - Implement dynamic fields based on template
// ============================================

/**
 * DTO para campos dinâmicos de OBRAS/Engenharia.
 */
export class ObrasDynamicFieldsDto implements ObrasDynamicFields {
  @ApiPropertyOptional({
    example: '1234567890',
    description: 'Número da ART ou RRT',
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  artRrt?: string;

  @ApiPropertyOptional({
    example: 'Memorial descritivo detalhado da obra...',
    description: 'Memorial descritivo da obra',
  })
  @IsOptional()
  @IsString()
  @MaxLength(10000)
  memorialDescritivo?: string;

  @ApiPropertyOptional({
    example: 'Cronograma com 12 etapas...',
    description: 'Cronograma físico-financeiro',
  })
  @IsOptional()
  @IsString()
  @MaxLength(10000)
  cronogramaFisicoFinanceiro?: string;

  @ApiPropertyOptional({
    example: 25.5,
    description: 'BDI de referência em percentual',
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  bdiReferencia?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(10000)
  projetoBasico?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(10000)
  projetoExecutivo?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  licencasAmbientais?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(10000)
  planilhaOrcamentaria?: string;
}

/**
 * DTO para campos dinâmicos de TI/Software.
 */
export class TiDynamicFieldsDto implements TiDynamicFields {
  @ApiPropertyOptional({
    example: 'Sistema deve suportar 10.000 usuários simultâneos...',
    description: 'Especificações técnicas detalhadas',
  })
  @IsOptional()
  @IsString()
  @MaxLength(10000)
  especificacoesTecnicas?: string;

  @ApiPropertyOptional({
    example: 'Disponibilidade 99,9%, tempo de resposta < 2s',
    description: 'Níveis de serviço (SLA)',
  })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  nivelServico?: string;

  @ApiPropertyOptional({
    example: 'agil',
    description: 'Metodologia de trabalho',
    enum: ['agil', 'cascata', 'hibrida'],
  })
  @IsOptional()
  @IsString()
  metodologiaTrabalho?: 'agil' | 'cascata' | 'hibrida';

  @ApiPropertyOptional({
    example: 'Conformidade com ISO 27001...',
    description: 'Requisitos de segurança da informação',
  })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  requisitosSeguranca?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  slaMetricas?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(10000)
  arquiteturaTecnica?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  integracaoSistemas?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(3000)
  lgpdConformidade?: string;
}

/**
 * DTO para campos dinâmicos de SERVICOS.
 */
export class ServicosDynamicFieldsDto implements ServicosDynamicFields {
  @ApiPropertyOptional({
    example: '100 m²/dia por servente',
    description: 'Produtividade do serviço',
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  produtividade?: string;

  @ApiPropertyOptional({
    example: 10,
    description: 'Número de postos de trabalho',
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  postosTrabalho?: number;

  @ApiPropertyOptional({
    example: 'Segunda a sexta, 8h às 18h',
    description: 'Frequência do serviço',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  frequenciaServico?: string;

  @ApiPropertyOptional({
    example: ['Taxa de satisfação > 90%', 'Tempo de resposta < 4h'],
    description: 'Indicadores de desempenho',
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  indicadoresDesempenho?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  materiaisEquipamentos?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  uniformesEpi?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  convencaoColetiva?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  transicaoContratual?: string;
}

/**
 * DTO para campos dinâmicos de MATERIAIS.
 */
export class MateriaisDynamicFieldsDto implements MateriaisDynamicFields {
  @ApiPropertyOptional({
    example: '12 meses contra defeitos de fabricação',
    description: 'Garantia mínima exigida',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  garantiaMinima?: string;

  @ApiPropertyOptional({
    example: 'Assistência técnica em até 48h úteis',
    description: 'Requisitos de assistência técnica',
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  assistenciaTecnica?: string;

  @ApiPropertyOptional({
    example: 'CATMAT 123456',
    description: 'Código CATMAT/CATSER',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  catalogo?: string;

  @ApiPropertyOptional({
    example: true,
    description: 'Se exige amostra para teste',
  })
  @IsOptional()
  @IsBoolean()
  amostraTeste?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  laudosTecnicos?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  normasAplicaveis?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  embalagensTransporte?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(3000)
  instalacaoTreinamento?: string;
}
