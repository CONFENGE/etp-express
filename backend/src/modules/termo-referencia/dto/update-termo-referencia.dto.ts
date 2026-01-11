import { PartialType, OmitType } from '@nestjs/swagger';
import { CreateTermoReferenciaDto } from './create-termo-referencia.dto';
import { IsEnum, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { TermoReferenciaStatus } from '../../../entities/termo-referencia.entity';

/**
 * DTO para atualizacao de Termo de Referencia.
 * Todos os campos sao opcionais exceto etpId que nao pode ser alterado.
 */
export class UpdateTermoReferenciaDto extends PartialType(
  OmitType(CreateTermoReferenciaDto, ['etpId'] as const),
) {
  @ApiPropertyOptional({
    description: 'Status do Termo de Referencia',
    enum: TermoReferenciaStatus,
    example: TermoReferenciaStatus.REVIEW,
  })
  @IsOptional()
  @IsEnum(TermoReferenciaStatus)
  status?: TermoReferenciaStatus;
}
