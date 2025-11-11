import {
  IsEmail,
  IsString,
  MinLength,
  IsOptional,
  IsEnum,
} from 'class-validator';
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

  @ApiPropertyOptional({ example: 'Ministério da Economia' })
  @IsOptional()
  @IsString()
  orgao?: string;

  @ApiPropertyOptional({ example: 'Analista de Contratos' })
  @IsOptional()
  @IsString()
  cargo?: string;

  @ApiPropertyOptional({ enum: UserRole, default: UserRole.USER })
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;
}
