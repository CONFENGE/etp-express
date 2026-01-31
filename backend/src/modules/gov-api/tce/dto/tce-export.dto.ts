import {
  IsEnum,
  IsString,
  IsArray,
  IsDate,
  IsNumber,
  IsOptional,
  ValidateNested,
  IsNotEmpty,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TceState, TceExportFormat } from '../interfaces/tce-api.interface';

/**
 * DTO for contract payment data
 */
export class TcePaymentDto {
  @ApiProperty({
    description: 'Payment date',
    example: '2024-01-15',
  })
  @IsDate()
  @Type(() => Date)
  paymentDate: Date;

  @ApiProperty({
    description: 'Payment value in BRL',
    example: 50000.0,
  })
  @IsNumber()
  paymentValue: number;

  @ApiProperty({
    description: 'Payment description',
    example: 'Primeira parcela',
  })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiPropertyOptional({
    description: 'Invoice number',
    example: 'NF-001234',
  })
  @IsString()
  @IsOptional()
  invoiceNumber?: string;

  @ApiPropertyOptional({
    description: 'Fiscal document number',
    example: '12345678901234567890123456789012345678901234',
  })
  @IsString()
  @IsOptional()
  fiscalDocument?: string;
}

/**
 * DTO for TCE contract export data
 */
export class TceContractDto {
  @ApiProperty({
    description: 'Contract number',
    example: 'CONT-2024-001',
  })
  @IsString()
  @IsNotEmpty()
  contractNumber: string;

  @ApiProperty({
    description: 'Contract date',
    example: '2024-01-01',
  })
  @IsDate()
  @Type(() => Date)
  contractDate: Date;

  @ApiProperty({
    description: 'Organization CNPJ',
    example: '12345678000199',
  })
  @IsString()
  @IsNotEmpty()
  organizationCnpj: string;

  @ApiProperty({
    description: 'Organization name',
    example: 'Prefeitura Municipal de São Paulo',
  })
  @IsString()
  @IsNotEmpty()
  organizationName: string;

  @ApiProperty({
    description: 'Supplier CNPJ/CPF',
    example: '98765432000188',
  })
  @IsString()
  @IsNotEmpty()
  supplierCnpj: string;

  @ApiProperty({
    description: 'Supplier name',
    example: 'Empresa Fornecedora Ltda',
  })
  @IsString()
  @IsNotEmpty()
  supplierName: string;

  @ApiProperty({
    description: 'Contract value in BRL',
    example: 100000.0,
  })
  @IsNumber()
  contractValue: number;

  @ApiProperty({
    description: 'Contract object/description',
    example: 'Aquisição de equipamentos de informática',
  })
  @IsString()
  @IsNotEmpty()
  contractObject: string;

  @ApiPropertyOptional({
    description: 'Bidding process number',
    example: 'PP-2023-123',
  })
  @IsString()
  @IsOptional()
  biddingProcessNumber?: string;

  @ApiPropertyOptional({
    description: 'Bidding modality',
    example: 'Pregão Eletrônico',
  })
  @IsString()
  @IsOptional()
  biddingModality?: string;

  @ApiPropertyOptional({
    description: 'Bidding date',
    example: '2023-12-15',
  })
  @IsDate()
  @Type(() => Date)
  @IsOptional()
  biddingDate?: Date;

  @ApiPropertyOptional({
    description: 'Contract start date',
    example: '2024-01-01',
  })
  @IsDate()
  @Type(() => Date)
  @IsOptional()
  startDate?: Date;

  @ApiPropertyOptional({
    description: 'Contract end date',
    example: '2024-12-31',
  })
  @IsDate()
  @Type(() => Date)
  @IsOptional()
  endDate?: Date;

  @ApiProperty({
    description: 'Contract status',
    example: 'active',
    enum: ['active', 'completed', 'cancelled', 'suspended'],
  })
  @IsString()
  @IsNotEmpty()
  status: 'active' | 'completed' | 'cancelled' | 'suspended';

  @ApiPropertyOptional({
    description: 'Payment records',
    type: [TcePaymentDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TcePaymentDto)
  @IsOptional()
  payments?: TcePaymentDto[];

  @ApiPropertyOptional({
    description: 'Legal basis (lei, artigo, etc.)',
    example: 'Lei 14.133/2021, Art. 75',
  })
  @IsString()
  @IsOptional()
  legalBasis?: string;

  @ApiPropertyOptional({
    description: 'Additional notes',
  })
  @IsString()
  @IsOptional()
  notes?: string;
}

/**
 * DTO for organization info
 */
export class TceOrganizationDto {
  @ApiProperty({
    description: 'Organization CNPJ',
    example: '12345678000199',
  })
  @IsString()
  @IsNotEmpty()
  cnpj: string;

  @ApiProperty({
    description: 'Organization name',
    example: 'Prefeitura Municipal de São Paulo',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    description: 'City',
    example: 'São Paulo',
  })
  @IsString()
  @IsNotEmpty()
  city: string;

  @ApiProperty({
    description: 'State',
    example: 'SP',
    enum: TceState,
  })
  @IsEnum(TceState)
  state: TceState;
}

/**
 * DTO for reporting period
 */
export class TceReportingPeriodDto {
  @ApiProperty({
    description: 'Period start date',
    example: '2024-01-01',
  })
  @IsDate()
  @Type(() => Date)
  startDate: Date;

  @ApiProperty({
    description: 'Period end date',
    example: '2024-12-31',
  })
  @IsDate()
  @Type(() => Date)
  endDate: Date;
}

/**
 * DTO for TCE export request
 */
export class TceExportRequestDto {
  @ApiProperty({
    description: 'Target state TCE',
    example: 'SP',
    enum: TceState,
  })
  @IsEnum(TceState)
  state: TceState;

  @ApiProperty({
    description: 'Export format',
    example: 'AUDESP',
    enum: TceExportFormat,
  })
  @IsEnum(TceExportFormat)
  format: TceExportFormat;

  @ApiProperty({
    description: 'Contracts to export',
    type: [TceContractDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TceContractDto)
  contracts: TceContractDto[];

  @ApiProperty({
    description: 'Reporting period',
    type: TceReportingPeriodDto,
  })
  @ValidateNested()
  @Type(() => TceReportingPeriodDto)
  reportingPeriod: TceReportingPeriodDto;

  @ApiProperty({
    description: 'Organization information',
    type: TceOrganizationDto,
  })
  @ValidateNested()
  @Type(() => TceOrganizationDto)
  organizationInfo: TceOrganizationDto;
}

/**
 * DTO for TCE connection check request
 */
export class TceConnectionCheckDto {
  @ApiProperty({
    description: 'State TCE to check',
    example: 'SP',
    enum: TceState,
  })
  @IsEnum(TceState)
  state: TceState;
}
