import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsDate, IsString, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * DTO for creating a new Medicao (Contract Measurement).
 *
 * **Validations:**
 * - Período deve ter início e fim definidos
 * - Valor medido deve ser positivo
 * - Descrição e observações são opcionais
 *
 * **Issue #1641** - [FISC-1286a] Create Medicao entity and CRUD endpoints
 *
 * @see Lei 14.133/2021 Art. 117 - Fiscalização de contratos
 */
export class CreateMedicaoDto {
  @ApiProperty({
    description: 'Data de início do período medido',
    example: '2024-01-01',
    type: Date,
  })
  @IsNotEmpty({ message: 'Data de início é obrigatória' })
  @Type(() => Date)
  @IsDate({ message: 'Data de início inválida' })
  periodoInicio: Date;

  @ApiProperty({
    description: 'Data de término do período medido',
    example: '2024-01-31',
    type: Date,
  })
  @IsNotEmpty({ message: 'Data de término é obrigatória' })
  @Type(() => Date)
  @IsDate({ message: 'Data de término inválida' })
  periodoFim: Date;

  @ApiProperty({
    description:
      'Valor dos serviços/entregas executados no período (em string DECIMAL)',
    example: '15000.50',
    type: String,
  })
  @IsNotEmpty({ message: 'Valor medido é obrigatório' })
  @IsString()
  valorMedido: string;

  @ApiProperty({
    description: 'Descrição detalhada do que foi executado',
    example:
      'Instalação de 50 pontos de rede estruturada conforme especificação técnica',
    required: false,
  })
  @IsOptional()
  @IsString()
  descricao?: string;

  @ApiProperty({
    description: 'Observações adicionais sobre a medição',
    example: 'Execução realizada conforme cronograma. Sem pendências.',
    required: false,
  })
  @IsOptional()
  @IsString()
  observacoes?: string;
}
