import {
  IsEmail,
  IsNotEmpty,
  IsString,
  IsOptional,
  MinLength,
  MaxLength,
} from 'class-validator';

/**
 * DTO for creating a demo user account.
 * Part of Demo User Management System (Issue #1440).
 */
export class CreateDemoUserDto {
  /**
   * Real email address of the demo user.
   * Used for account access and password recovery.
   */
  @IsEmail({}, { message: 'Email deve ser um endereço válido' })
  @IsNotEmpty({ message: 'Email é obrigatório' })
  email: string;

  /**
   * Full name of the demo user.
   */
  @IsString({ message: 'Nome deve ser uma string' })
  @IsNotEmpty({ message: 'Nome é obrigatório' })
  @MinLength(2, { message: 'Nome deve ter pelo menos 2 caracteres' })
  @MaxLength(100, { message: 'Nome deve ter no máximo 100 caracteres' })
  name: string;

  /**
   * Optional job title/position.
   */
  @IsOptional()
  @IsString({ message: 'Cargo deve ser uma string' })
  @MaxLength(100, { message: 'Cargo deve ter no máximo 100 caracteres' })
  cargo?: string;
}
