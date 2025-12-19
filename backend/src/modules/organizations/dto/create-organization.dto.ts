import {
 IsString,
 IsNotEmpty,
 IsArray,
 ArrayMinSize,
 Matches,
 MinLength,
 MaxLength,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO for creating a new organization.
 * Used by OrganizationsController.create() endpoint (ADMIN only).
 */
export class CreateOrganizationDto {
 @ApiProperty({
 description: 'Organization name',
 example: 'Prefeitura de Lages',
 minLength: 3,
 maxLength: 100,
 })
 @IsString()
 @IsNotEmpty()
 @MinLength(3)
 @MaxLength(100)
 name: string;

 @ApiProperty({
 description:
 'CNPJ (Cadastro Nacional da Pessoa Jurídica) - Format: XX.XXX.XXX/XXXX-XX',
 example: '12.345.678/0001-90',
 pattern: '^\\d{2}\\.\\d{3}\\.\\d{3}/\\d{4}-\\d{2}$',
 })
 @IsString()
 @IsNotEmpty()
 @Matches(/^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$/, {
 message: 'CNPJ must be in format XX.XXX.XXX/XXXX-XX',
 })
 cnpj: string;

 @ApiProperty({
 description:
 'Whitelisted email domains for automatic organization assignment during user registration',
 example: ['lages.sc.gov.br', 'camaralages.sc.gov.br'],
 type: [String],
 minItems: 1,
 })
 @IsArray()
 @ArrayMinSize(1, { message: 'At least one domain is required' })
 @IsString({ each: true })
 domainWhitelist: string[];

 @ApiProperty({
 description: 'Stripe Customer ID for billing integration (optional)',
 example: 'cus_NffrFeUfNV2Hib',
 required: false,
 })
 @IsString()
 stripeCustomerId?: string;
}
