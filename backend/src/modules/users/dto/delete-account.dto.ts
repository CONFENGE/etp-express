import { IsString, IsNotEmpty, IsOptional, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class DeleteAccountDto {
  @ApiProperty({
    example: 'DELETE MY ACCOUNT',
    description:
      'Confirmação explícita de deleção. Deve ser exatamente "DELETE MY ACCOUNT"',
  })
  @IsString()
  @IsNotEmpty()
  confirmation: string;

  @ApiPropertyOptional({
    example: 'Não utilizo mais o sistema',
    description: 'Motivo opcional para a deleção da conta',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
