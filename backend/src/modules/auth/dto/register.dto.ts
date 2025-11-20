import {
  IsEmail,
  IsString,
  MinLength,
  IsOptional,
  IsBoolean,
  IsNotEmpty,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RegisterDto {
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

  @ApiPropertyOptional({ example: 'Ministério da Economia' })
  @IsOptional()
  @IsString()
  orgao?: string;

  @ApiPropertyOptional({ example: 'Analista de Contratos' })
  @IsOptional()
  @IsString()
  cargo?: string;

  @ApiProperty({
    example: true,
    description: 'Consentimento LGPD obrigatório para uso do sistema',
  })
  @IsBoolean({ message: 'Consentimento LGPD deve ser booleano' })
  @IsNotEmpty({ message: 'Consentimento LGPD é obrigatório' })
  lgpdConsent: boolean;
}
