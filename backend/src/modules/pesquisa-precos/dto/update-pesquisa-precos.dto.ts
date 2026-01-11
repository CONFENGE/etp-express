import { PartialType } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { CreatePesquisaPrecosDto } from './create-pesquisa-precos.dto';
import { PesquisaPrecosStatus } from '../../../entities/pesquisa-precos.entity';

/**
 * DTO para atualizacao de Pesquisa de Precos.
 * Todos os campos sao opcionais.
 */
export class UpdatePesquisaPrecosDto extends PartialType(
  CreatePesquisaPrecosDto,
) {
  @ApiPropertyOptional({
    description: 'Status da pesquisa de precos',
    enum: PesquisaPrecosStatus,
  })
  @IsOptional()
  @IsEnum(PesquisaPrecosStatus)
  status?: PesquisaPrecosStatus;
}
