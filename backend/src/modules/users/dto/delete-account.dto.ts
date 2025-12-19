import { IsString, IsNotEmpty, IsOptional, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class DeleteAccountDto {
 @ApiProperty({
 example: 'DELETE MY ACCOUNT',
 description:
 'Confirmação explícita obrigatória para deleção de conta. Deve ser exatamente "DELETE MY ACCOUNT".',
 })
 @IsString()
 @IsNotEmpty()
 confirmation: string;

 @ApiPropertyOptional({
 example: 'Não preciso mais da plataforma',
 description: 'Razão opcional para deleção da conta (máx. 500 caracteres)',
 })
 @IsOptional()
 @IsString()
 @MaxLength(500, {
 message: 'Razão não pode exceder 500 caracteres',
 })
 reason?: string;
}
