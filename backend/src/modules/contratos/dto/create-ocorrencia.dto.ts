import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsNotEmpty,
  IsString,
  MinLength,
  IsDateString,
  IsOptional,
} from 'class-validator';
import {
  OcorrenciaTipo,
  OcorrenciaGravidade,
} from '../../../entities/ocorrencia.entity';

/**
 * DTO para criação de Ocorrência.
 *
 * **Validações:**
 * - Tipo obrigatório (atraso, falha, inadimplência, outro)
 * - Gravidade obrigatória (baixa, média, alta, crítica)
 * - Data da ocorrência obrigatória
 * - Descrição obrigatória com mínimo 20 caracteres
 * - Ação corretiva opcional (mas obrigatória na service se gravidade CRÍTICA)
 * - Prazo de resolução opcional
 *
 * **Issue #1642** - [FISC-1286b] Create Ocorrencia entity and CRUD endpoints
 */
export class CreateOcorrenciaDto {
  @ApiProperty({
    description: 'Tipo da ocorrência',
    enum: OcorrenciaTipo,
    example: OcorrenciaTipo.ATRASO,
  })
  @IsEnum(OcorrenciaTipo, {
    message: 'Tipo deve ser: atraso, falha, inadimplencia ou outro',
  })
  @IsNotEmpty({ message: 'Tipo é obrigatório' })
  tipo: OcorrenciaTipo;

  @ApiProperty({
    description: 'Gravidade da ocorrência',
    enum: OcorrenciaGravidade,
    example: OcorrenciaGravidade.MEDIA,
  })
  @IsEnum(OcorrenciaGravidade, {
    message: 'Gravidade deve ser: baixa, media, alta ou critica',
  })
  @IsNotEmpty({ message: 'Gravidade é obrigatória' })
  gravidade: OcorrenciaGravidade;

  @ApiProperty({
    description: 'Data em que a ocorrência aconteceu (formato ISO 8601)',
    example: '2026-01-23',
  })
  @IsDateString(
    {},
    { message: 'Data da ocorrência deve estar no formato ISO 8601' },
  )
  @IsNotEmpty({ message: 'Data da ocorrência é obrigatória' })
  dataOcorrencia: Date;

  @ApiProperty({
    description: 'Descrição detalhada da ocorrência (mínimo 20 caracteres)',
    example:
      'Atraso de 5 dias na entrega do lote 3 de materiais conforme cronograma aprovado. Contratada justificou por problemas logísticos com fornecedor.',
    minLength: 20,
  })
  @IsString({ message: 'Descrição deve ser um texto' })
  @MinLength(20, { message: 'Descrição deve ter no mínimo 20 caracteres' })
  @IsNotEmpty({ message: 'Descrição é obrigatória' })
  descricao: string;

  @ApiPropertyOptional({
    description:
      'Ação corretiva aplicada ou a ser aplicada (obrigatória para gravidade CRÍTICA)',
    example:
      'Notificação formal ao contratado com prazo de 48h para regularização sob pena de aplicação de multa.',
  })
  @IsOptional()
  @IsString({ message: 'Ação corretiva deve ser um texto' })
  acaoCorretiva?: string;

  @ApiPropertyOptional({
    description: 'Prazo para resolução da ocorrência (formato ISO 8601)',
    example: '2026-01-30',
  })
  @IsOptional()
  @IsDateString(
    {},
    { message: 'Prazo de resolução deve estar no formato ISO 8601' },
  )
  prazoResolucao?: Date;
}
