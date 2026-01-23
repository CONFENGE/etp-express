import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsString,
  MinLength,
  IsDateString,
  IsOptional,
} from 'class-validator';
import {
  OcorrenciaTipo,
  OcorrenciaGravidade,
  OcorrenciaStatus,
} from '../../../entities/ocorrencia.entity';

/**
 * DTO para atualização de Ocorrência.
 *
 * Todos os campos são opcionais - atualiza apenas o que for fornecido.
 *
 * **Validações:**
 * - Tipo opcional (atraso, falha, inadimplência, outro)
 * - Gravidade opcional (baixa, média, alta, crítica)
 * - Status opcional (aberta, em_analise, resolvida, cancelada)
 * - Data da ocorrência opcional
 * - Descrição opcional com mínimo 20 caracteres se fornecida
 * - Ação corretiva opcional
 * - Prazo de resolução opcional
 *
 * **Issue #1642** - [FISC-1286b] Create Ocorrencia entity and CRUD endpoints
 */
export class UpdateOcorrenciaDto {
  @ApiPropertyOptional({
    description: 'Tipo da ocorrência',
    enum: OcorrenciaTipo,
    example: OcorrenciaTipo.ATRASO,
  })
  @IsOptional()
  @IsEnum(OcorrenciaTipo, {
    message: 'Tipo deve ser: atraso, falha, inadimplencia ou outro',
  })
  tipo?: OcorrenciaTipo;

  @ApiPropertyOptional({
    description: 'Gravidade da ocorrência',
    enum: OcorrenciaGravidade,
    example: OcorrenciaGravidade.ALTA,
  })
  @IsOptional()
  @IsEnum(OcorrenciaGravidade, {
    message: 'Gravidade deve ser: baixa, media, alta ou critica',
  })
  gravidade?: OcorrenciaGravidade;

  @ApiPropertyOptional({
    description: 'Status da ocorrência',
    enum: OcorrenciaStatus,
    example: OcorrenciaStatus.EM_ANALISE,
  })
  @IsOptional()
  @IsEnum(OcorrenciaStatus, {
    message: 'Status deve ser: aberta, em_analise, resolvida ou cancelada',
  })
  status?: OcorrenciaStatus;

  @ApiPropertyOptional({
    description: 'Data em que a ocorrência aconteceu (formato ISO 8601)',
    example: '2026-01-23',
  })
  @IsOptional()
  @IsDateString(
    {},
    { message: 'Data da ocorrência deve estar no formato ISO 8601' },
  )
  dataOcorrencia?: Date;

  @ApiPropertyOptional({
    description: 'Descrição detalhada da ocorrência (mínimo 20 caracteres)',
    example:
      'Atraso de 7 dias confirmado após nova análise. Contratada apresentou documentação comprobatória.',
    minLength: 20,
  })
  @IsOptional()
  @IsString({ message: 'Descrição deve ser um texto' })
  @MinLength(20, { message: 'Descrição deve ter no mínimo 20 caracteres' })
  descricao?: string;

  @ApiPropertyOptional({
    description: 'Ação corretiva aplicada ou a ser aplicada',
    example:
      'Aplicada multa de 0,5% do valor contratado conforme cláusula penal.',
  })
  @IsOptional()
  @IsString({ message: 'Ação corretiva deve ser um texto' })
  acaoCorretiva?: string;

  @ApiPropertyOptional({
    description: 'Prazo para resolução da ocorrência (formato ISO 8601)',
    example: '2026-02-05',
  })
  @IsOptional()
  @IsDateString(
    {},
    { message: 'Prazo de resolução deve estar no formato ISO 8601' },
  )
  prazoResolucao?: Date;
}
