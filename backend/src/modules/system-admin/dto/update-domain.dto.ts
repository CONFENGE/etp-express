import {
  IsString,
  IsOptional,
  IsInt,
  Min,
  Max,
  IsBoolean,
  Matches,
  IsUUID,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

/**
 * DTO for updating an authorized domain.
 * All fields are optional.
 *
 * @example
 * {
 * institutionName: 'Prefeitura Municipal de Lages',
 * maxUsers: 15,
 * isActive: true
 * }
 */
export class UpdateDomainDto {
  @ApiPropertyOptional({
    description: 'Email domain to authorize (e.g., lages.sc.gov.br)',
    example: 'lages.sc.gov.br',
  })
  @IsOptional()
  @IsString()
  @Matches(/^[a-zA-Z0-9][a-zA-Z0-9-]*(\.[a-zA-Z0-9-]+)+$/, {
    message:
      'Invalid domain format. Expected format: subdomain.domain.tld (e.g., lages.sc.gov.br)',
  })
  domain?: string;

  @ApiPropertyOptional({
    description: 'Name of the institution (for display purposes)',
    example: 'Prefeitura de Lages',
  })
  @IsOptional()
  @IsString()
  institutionName?: string;

  @ApiPropertyOptional({
    description: 'Maximum number of users allowed for this domain',
    minimum: 1,
    maximum: 100,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  maxUsers?: number;

  @ApiPropertyOptional({
    description: 'Whether this domain is active',
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({
    description: 'Organization UUID to link this domain to',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsOptional()
  @IsUUID()
  organizationId?: string;
}
