import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsDateString,
  IsNumber,
  IsUUID,
  IsOptional,
  IsEmail,
  Length,
  Min,
  Max,
  Matches,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ContratoStatus } from '../../../entities/contrato.entity';

/**
 * DTO for creating a new Contrato.
 *
 * Validates all required fields per Lei 14.133/2021 Art. 92.
 */
export class CreateContratoDto {
  // ============================================
  // Relationships
  // ============================================

  @IsUUID()
  @IsOptional()
  editalId?: string;

  @IsUUID()
  @IsNotEmpty()
  organizationId: string;

  // ============================================
  // Identification
  // ============================================

  @IsString()
  @IsNotEmpty()
  @Length(1, 50)
  numero: string;

  @IsString()
  @IsOptional()
  @Length(1, 50)
  numeroProcesso?: string;

  // ============================================
  // Object
  // ============================================

  @IsString()
  @IsNotEmpty()
  @Length(10, 5000)
  objeto: string;

  @IsString()
  @IsOptional()
  @Length(10, 10000)
  descricaoObjeto?: string;

  // ============================================
  // Contracted party data
  // ============================================

  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$/, {
    message: 'CNPJ must be in format XX.XXX.XXX/XXXX-XX',
  })
  contratadoCnpj: string;

  @IsString()
  @IsNotEmpty()
  @Length(1, 255)
  contratadoRazaoSocial: string;

  @IsString()
  @IsOptional()
  @Length(1, 255)
  contratadoNomeFantasia?: string;

  @IsString()
  @IsOptional()
  contratadoEndereco?: string;

  @IsString()
  @IsOptional()
  @Matches(/^\(\d{2}\)\s?\d{4,5}-\d{4}$/, {
    message: 'Telefone must be in format (XX) XXXXX-XXXX or (XX) XXXX-XXXX',
  })
  contratadoTelefone?: string;

  @IsEmail()
  @IsOptional()
  contratadoEmail?: string;

  // ============================================
  // Values
  // ============================================

  @IsNumber()
  @Min(0.01)
  @Type(() => Number)
  valorGlobal: number;

  @IsNumber()
  @IsOptional()
  @Min(0.01)
  @Type(() => Number)
  valorUnitario?: number;

  @IsString()
  @IsOptional()
  @Length(1, 50)
  unidadeMedida?: string;

  @IsNumber()
  @IsOptional()
  @Min(0.01)
  @Type(() => Number)
  quantidadeContratada?: number;

  // ============================================
  // Validity period
  // ============================================

  @IsDateString()
  @IsNotEmpty()
  vigenciaInicio: string;

  @IsDateString()
  @IsNotEmpty()
  vigenciaFim: string;

  @IsNumber()
  @IsOptional()
  @Min(1)
  @Max(3650) // Max 10 years
  @Type(() => Number)
  prazoExecucao?: number;

  @IsString()
  @IsOptional()
  possibilidadeProrrogacao?: string;

  // ============================================
  // Contract management
  // ============================================

  @IsUUID()
  @IsNotEmpty()
  gestorResponsavelId: string;

  @IsUUID()
  @IsNotEmpty()
  fiscalResponsavelId: string;

  // ============================================
  // Clauses and conditions
  // ============================================

  @IsString()
  @IsOptional()
  @Length(1, 100)
  dotacaoOrcamentaria?: string;

  @IsString()
  @IsOptional()
  @Length(1, 200)
  fonteRecursos?: string;

  @IsString()
  @IsOptional()
  condicoesPagamento?: string;

  @IsString()
  @IsOptional()
  garantiaContratual?: string;

  @IsString()
  @IsOptional()
  reajusteContratual?: string;

  @IsString()
  @IsOptional()
  sancoesAdministrativas?: string;

  @IsString()
  @IsOptional()
  fundamentacaoLegal?: string;

  @IsString()
  @IsOptional()
  localEntrega?: string;

  @IsOptional()
  clausulas?: Record<string, unknown>;

  // ============================================
  // Status and control
  // ============================================

  @IsEnum(ContratoStatus)
  @IsOptional()
  status?: ContratoStatus;

  @IsDateString()
  @IsOptional()
  dataAssinatura?: string;

  @IsDateString()
  @IsOptional()
  dataPublicacao?: string;

  @IsString()
  @IsOptional()
  @Length(1, 200)
  referenciaPublicacao?: string;

  @IsNumber()
  @IsOptional()
  @Min(1)
  @Type(() => Number)
  versao?: number;

  @IsString()
  @IsOptional()
  observacoesInternas?: string;

  @IsString()
  @IsOptional()
  motivoRescisao?: string;

  @IsDateString()
  @IsOptional()
  dataRescisao?: string;

  @IsUUID()
  @IsNotEmpty()
  createdById: string;
}
