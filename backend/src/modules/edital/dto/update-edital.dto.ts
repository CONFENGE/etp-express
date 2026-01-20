import {
  IsString,
  IsOptional,
  IsEnum,
  IsBoolean,
  IsNumber,
  IsObject,
} from 'class-validator';
import {
  EditalModalidade,
  EditalCriterioJulgamento,
  EditalModoDisputa,
  EditalTipoContratacaoDireta,
} from '../../../entities/edital.entity';

/**
 * DTO para atualização parcial de Edital.
 * Permite atualizar qualquer campo do edital durante a edição.
 *
 * Issue #1280 - [Edital-d] Editor de edital no frontend
 * Milestone: M14 - Geração de Edital
 */
export class UpdateEditalDto {
  @IsOptional()
  @IsString()
  numero?: string;

  @IsOptional()
  @IsString()
  numeroProcesso?: string | null;

  @IsOptional()
  @IsString()
  uasg?: string | null;

  @IsOptional()
  @IsString()
  objeto?: string;

  @IsOptional()
  @IsString()
  descricaoObjeto?: string | null;

  @IsOptional()
  @IsEnum(EditalModalidade)
  modalidade?: EditalModalidade | null;

  @IsOptional()
  @IsEnum(EditalTipoContratacaoDireta)
  tipoContratacaoDireta?: EditalTipoContratacaoDireta | null;

  @IsOptional()
  @IsEnum(EditalCriterioJulgamento)
  criterioJulgamento?: EditalCriterioJulgamento;

  @IsOptional()
  @IsEnum(EditalModoDisputa)
  modoDisputa?: EditalModoDisputa;

  @IsOptional()
  @IsString()
  condicoesParticipacao?: string | null;

  @IsOptional()
  @IsBoolean()
  exclusividadeMeEpp?: boolean;

  @IsOptional()
  @IsString()
  valorLimiteMeEpp?: string | null;

  @IsOptional()
  @IsString()
  cotaReservadaMeEpp?: string | null;

  @IsOptional()
  @IsString()
  exigenciaConsorcio?: string | null;

  @IsOptional()
  @IsObject()
  requisitosHabilitacao?: Record<string, unknown> | null;

  @IsOptional()
  @IsString()
  sancoesAdministrativas?: string | null;

  @IsOptional()
  @IsNumber()
  prazoVigencia?: number | null;

  @IsOptional()
  @IsString()
  possibilidadeProrrogacao?: string | null;

  @IsOptional()
  @IsString()
  dotacaoOrcamentaria?: string | null;

  @IsOptional()
  @IsString()
  fonteRecursos?: string | null;

  @IsOptional()
  @IsString()
  valorEstimado?: string | null;

  @IsOptional()
  @IsBoolean()
  sigiloOrcamento?: boolean;

  @IsOptional()
  @IsObject()
  prazos?: Record<string, unknown> | null;

  @IsOptional()
  @IsString()
  dataSessaoPublica?: string | null; // ISO string para Date

  @IsOptional()
  @IsString()
  localSessaoPublica?: string | null;

  @IsOptional()
  @IsObject()
  clausulas?: Record<string, unknown> | null;

  @IsOptional()
  @IsObject()
  anexos?: Record<string, unknown> | null;

  @IsOptional()
  @IsString()
  fundamentacaoLegal?: string | null;

  @IsOptional()
  @IsString()
  condicoesPagamento?: string | null;

  @IsOptional()
  @IsString()
  garantiaContratual?: string | null;

  @IsOptional()
  @IsString()
  reajusteContratual?: string | null;

  @IsOptional()
  @IsString()
  localEntrega?: string | null;

  @IsOptional()
  @IsString()
  sistemaEletronico?: string | null;

  @IsOptional()
  @IsString()
  linkSistemaEletronico?: string | null;

  @IsOptional()
  @IsString()
  observacoesInternas?: string | null;
}
