import {
  IsEmail,
  IsString,
  MinLength,
  MaxLength,
  Matches,
  IsOptional,
  IsBoolean,
  IsNotEmpty,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RegisterDto {
  @ApiProperty({ example: 'usuario@exemplo.gov.br' })
  @IsEmail()
  email: string;

  @ApiProperty({
    example: 'SenhaSegura123!',
    description:
      'Senha com requisitos de complexidade: mín 8 chars, maiúscula, minúscula, número, caractere especial',
    minLength: 8,
    maxLength: 128,
  })
  @IsString()
  @MinLength(8, { message: 'Senha deve ter no mínimo 8 caracteres' })
  @MaxLength(128, { message: 'Senha deve ter no máximo 128 caracteres' })
  @Matches(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>]).{8,}$/,
    {
      message:
        'Senha deve conter: letra maiúscula, letra minúscula, número e caractere especial',
    },
  )
  password: string;

  @ApiProperty({ example: 'João da Silva' })
  @IsString()
  name: string;

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

  @ApiProperty({
    example: true,
    description:
      'Consentimento para transferência internacional de dados (LGPD Art. 33)',
  })
  @IsBoolean({
    message: 'Consentimento de transferência internacional deve ser booleano',
  })
  @IsNotEmpty({
    message: 'Consentimento de transferência internacional é obrigatório',
  })
  internationalTransferConsent: boolean;
}
