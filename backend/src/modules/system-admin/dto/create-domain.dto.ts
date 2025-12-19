import {
 IsString,
 IsNotEmpty,
 IsOptional,
 IsInt,
 Min,
 Max,
 Matches,
 IsUUID,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * DTO for creating a new authorized domain.
 *
 * @example
 * {
 * domain: 'lages.sc.gov.br',
 * institutionName: 'Prefeitura de Lages',
 * maxUsers: 10,
 * organizationId: '123e4567-e89b-12d3-a456-426614174000'
 * }
 */
export class CreateDomainDto {
 @ApiProperty({
 description: 'Email domain to authorize (e.g., lages.sc.gov.br)',
 example: 'lages.sc.gov.br',
 })
 @IsString()
 @IsNotEmpty()
 @Matches(/^[a-zA-Z0-9][a-zA-Z0-9-]*(\.[a-zA-Z0-9-]+)+$/, {
 message:
 'Invalid domain format. Expected format: subdomain.domain.tld (e.g., lages.sc.gov.br)',
 })
 domain: string;

 @ApiProperty({
 description: 'Name of the institution (for display purposes)',
 example: 'Prefeitura de Lages',
 })
 @IsString()
 @IsNotEmpty()
 institutionName: string;

 @ApiPropertyOptional({
 description: 'Maximum number of users allowed for this domain',
 default: 10,
 minimum: 1,
 maximum: 100,
 })
 @IsOptional()
 @IsInt()
 @Min(1)
 @Max(100)
 maxUsers?: number;

 @ApiPropertyOptional({
 description: 'Organization UUID to link this domain to',
 example: '123e4567-e89b-12d3-a456-426614174000',
 })
 @IsOptional()
 @IsUUID()
 organizationId?: string;
}
