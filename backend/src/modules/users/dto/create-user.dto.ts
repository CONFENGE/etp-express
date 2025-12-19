import {
 IsEmail,
 IsString,
 MinLength,
 IsOptional,
 IsEnum,
 IsDate,
 IsUUID,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserRole } from '../../../entities/user.entity';

export class CreateUserDto {
 @ApiProperty({ example: 'usuario@exemplo.gov.br' })
 @IsEmail()
 email: string;

 @ApiProperty({ example: 'SenhaSegura123!', minLength: 8 })
 @IsString()
 @MinLength(8)
 password: string;

 @ApiProperty({ example: 'João da Silva' })
 @IsString()
 name: string;

 @ApiProperty({
 example: 'org-uuid-123',
 description: 'Organization ID (Multi-Tenancy B2G - MT-02)',
 })
 @IsUUID()
 organizationId: string;

 @ApiPropertyOptional({ example: 'Analista de Contratos' })
 @IsOptional()
 @IsString()
 cargo?: string;

 @ApiPropertyOptional({ enum: UserRole, default: UserRole.USER })
 @IsOptional()
 @IsEnum(UserRole)
 role?: UserRole;

 @ApiPropertyOptional({
 example: '2024-01-15T10:30:00Z',
 description: 'Timestamp do consentimento LGPD',
 })
 @IsOptional()
 @IsDate()
 @Type(() => Date)
 lgpdConsentAt?: Date;

 @ApiPropertyOptional({
 example: '1.0.0',
 description: 'Versão dos termos LGPD aceitos',
 })
 @IsOptional()
 @IsString()
 lgpdConsentVersion?: string;

 @ApiPropertyOptional({
 example: '2024-01-15T10:30:00Z',
 description:
 'Timestamp do consentimento de transferência internacional (LGPD Art. 33)',
 })
 @IsOptional()
 @IsDate()
 @Type(() => Date)
 internationalTransferConsentAt?: Date;
}
