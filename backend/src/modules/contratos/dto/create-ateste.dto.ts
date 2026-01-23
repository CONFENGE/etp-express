import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsEnum,
  IsString,
  IsOptional,
  ValidateIf,
  IsDate,
} from 'class-validator';
import { Type } from 'class-transformer';
import { AtesteResultado } from '../../../entities/ateste.entity';

/**
 * DTO for creating a new Ateste (Measurement Attestation).
 *
 * **Business Rules:**
 * - Justificativa is mandatory for REJEITADO or APROVADO_COM_RESSALVAS
 * - valorAtestado is only applicable for APROVADO_COM_RESSALVAS
 * - valorAtestado cannot exceed valorMedido from the Medicao
 * - Only the responsible inspector (fiscal) can attest
 * - Each Medicao can have at most one Ateste
 *
 * **Issue #1643** - [FISC-1286c] Create Ateste entity and approval workflow
 *
 * @see Lei 14.133/2021 Art. 117 - Contract Inspection
 * @see Lei 14.133/2021 Art. 140 - Execution Attestation
 */
export class CreateAtesteDto {
  @ApiProperty({
    description: 'Resultado do ateste da medição',
    enum: AtesteResultado,
    example: AtesteResultado.APROVADO,
    enumName: 'AtesteResultado',
  })
  @IsNotEmpty({ message: 'Resultado do ateste é obrigatório' })
  @IsEnum(AtesteResultado, {
    message:
      'Resultado deve ser: aprovado, aprovado_com_ressalvas ou rejeitado',
  })
  resultado: AtesteResultado;

  @ApiProperty({
    description:
      'Justificativa do ateste (obrigatória para rejeição ou ressalvas)',
    example:
      'Valor atestado inferior ao medido devido a inconformidade na qualidade dos serviços executados',
    required: false,
  })
  @ValidateIf(
    (dto) =>
      dto.resultado === AtesteResultado.REJEITADO ||
      dto.resultado === AtesteResultado.APROVADO_COM_RESSALVAS,
  )
  @IsNotEmpty({
    message:
      'Justificativa é obrigatória para rejeição ou aprovação com ressalvas',
  })
  @IsString()
  justificativa?: string;

  @ApiProperty({
    description:
      'Valor atestado (aplicável quando resultado = APROVADO_COM_RESSALVAS)',
    example: '14500.00',
    required: false,
    type: String,
  })
  @ValidateIf((dto) => dto.resultado === AtesteResultado.APROVADO_COM_RESSALVAS)
  @IsNotEmpty({
    message: 'Valor atestado é obrigatório para aprovação com ressalvas',
  })
  @IsString()
  valorAtestado?: string;

  @ApiProperty({
    description: 'Data de realização do ateste',
    example: '2024-02-05T14:30:00Z',
    type: Date,
  })
  @IsNotEmpty({ message: 'Data do ateste é obrigatória' })
  @Type(() => Date)
  @IsDate({ message: 'Data do ateste inválida' })
  dataAteste: Date;

  @ApiProperty({
    description: 'Observações adicionais sobre o ateste',
    example: 'Ateste realizado conforme vistoria técnica in loco',
    required: false,
  })
  @IsOptional()
  @IsString()
  observacoes?: string;
}
