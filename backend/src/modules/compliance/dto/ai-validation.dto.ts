import { IsUUID, IsOptional, IsEnum, IsNumber, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import {
  IrregularityType,
  SeverityLevel,
  ValidationStatus,
} from '../../../entities/ai-validation-result.entity';

/**
 * DTOs para AI Validation Service
 * Issue #1291 - [IA] Validação automática similar ao ALICE/TCU
 */

export class ValidateDocumentDto {
  @IsUUID()
  @IsOptional()
  etpId?: string;

  @IsUUID()
  @IsOptional()
  editalId?: string;

  /**
   * Se true, executa validação completa incluindo verificações custosas
   */
  @IsOptional()
  deepAnalysis?: boolean;
}

export class AcknowledgeValidationDto {
  @IsEnum(ValidationStatus)
  status: ValidationStatus;

  @IsOptional()
  note?: string;
}

export class IrregularityDetectionDto {
  irregularityType: IrregularityType;
  severityLevel: SeverityLevel;
  description: string;
  evidence?: string;
  recommendation?: string;
  confidenceScore: number;
  metadata?: Record<string, any>;
  affectedField?: string;
  affectedValue?: string;
  legalReference?: string;
}

export class ValidationResultResponseDto {
  id: string;
  etpId?: string;
  editalId?: string;
  irregularityType: IrregularityType;
  severityLevel: SeverityLevel;
  status: ValidationStatus;
  description: string;
  evidence?: string;
  recommendation?: string;
  confidenceScore: number;
  metadata?: Record<string, any>;
  affectedField?: string;
  affectedValue?: string;
  legalReference?: string;
  acknowledgedBy?: string;
  acknowledgedAt?: Date;
  acknowledgeNote?: string;
  createdAt: Date;
}

export class ValidationSummaryDto {
  totalIrregularities: number;
  bySeverity: {
    info: number;
    low: number;
    medium: number;
    high: number;
    critical: number;
  };
  byType: Record<IrregularityType, number>;
  byStatus: {
    pending: number;
    acknowledged: number;
    resolved: number;
    falsePositive: number;
    acceptedRisk: number;
  };
  overallRiskScore: number; // 0-100
  recommendations: string[];
}

export class ListValidationsQueryDto {
  @IsUUID()
  @IsOptional()
  etpId?: string;

  @IsUUID()
  @IsOptional()
  editalId?: string;

  @IsEnum(IrregularityType)
  @IsOptional()
  irregularityType?: IrregularityType;

  @IsEnum(SeverityLevel)
  @IsOptional()
  severityLevel?: SeverityLevel;

  @IsEnum(ValidationStatus)
  @IsOptional()
  status?: ValidationStatus;

  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @IsOptional()
  page?: number;

  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  @IsOptional()
  limit?: number;
}

export class ValidationListResponseDto {
  data: ValidationResultResponseDto[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
