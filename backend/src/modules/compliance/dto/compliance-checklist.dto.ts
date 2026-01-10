import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsUUID, IsBoolean, IsEnum } from 'class-validator';
import {
  ChecklistItemType,
  ChecklistItemCategory,
} from '../../../entities/compliance-checklist-item.entity';
import { ComplianceStandard } from '../../../entities/compliance-checklist.entity';
import { EtpTemplateType } from '../../../entities/etp-template.entity';

/**
 * DTO para item de checklist de conformidade.
 * Issue #1385 - [TCU-1163d] Criar endpoints REST para validacao de conformidade
 */
export class ComplianceChecklistItemDto {
  @ApiProperty({
    description: 'ID unico do item',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  id: string;

  @ApiProperty({
    description: 'Nome do requisito',
    example: 'Justificativa da necessidade da contratacao',
  })
  requirement: string;

  @ApiProperty({
    description: 'Descricao detalhada do requisito',
    example:
      'O ETP deve conter justificativa clara e detalhada da necessidade...',
  })
  description: string;

  @ApiProperty({
    description: 'Tipo do item: MANDATORY, RECOMMENDED ou OPTIONAL',
    enum: ChecklistItemType,
    example: ChecklistItemType.MANDATORY,
  })
  type: ChecklistItemType;

  @ApiProperty({
    description: 'Categoria do item',
    enum: ChecklistItemCategory,
    example: ChecklistItemCategory.JUSTIFICATION,
  })
  category: ChecklistItemCategory;

  @ApiProperty({
    description: 'Peso do item no calculo do score (1-100)',
    example: 15,
  })
  weight: number;

  @ApiProperty({
    description: 'Referencia legal do requisito',
    example: 'Art. 18, par. 1o, I - Lei 14.133/2021',
    nullable: true,
  })
  legalReference?: string;

  @ApiProperty({
    description: 'Sugestao de como corrigir quando o item falha',
    example: 'Inclua uma justificativa detalhada explicando por que...',
    nullable: true,
  })
  fixSuggestion?: string;
}

/**
 * DTO para checklist de conformidade completo.
 */
export class ComplianceChecklistDto {
  @ApiProperty({
    description: 'ID unico do checklist',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  id: string;

  @ApiProperty({
    description: 'Nome do checklist',
    example: 'TCU - Servicos',
  })
  name: string;

  @ApiProperty({
    description: 'Descricao do checklist',
    example:
      'Checklist de conformidade TCU para ETPs de contratacao de servicos',
    nullable: true,
  })
  description?: string;

  @ApiProperty({
    description: 'Padrao de conformidade',
    enum: ComplianceStandard,
    example: ComplianceStandard.TCU,
  })
  standard: ComplianceStandard;

  @ApiProperty({
    description: 'Tipo de ETP ao qual o checklist se aplica',
    enum: EtpTemplateType,
    example: EtpTemplateType.SERVICOS,
  })
  templateType: EtpTemplateType;

  @ApiProperty({
    description: 'Fundamentacao legal do checklist',
    example: 'Art. 18, Lei 14.133/2021; IN SEGES 58/2022',
    nullable: true,
  })
  legalBasis?: string;

  @ApiProperty({
    description: 'Versao do checklist',
    example: '1.0',
  })
  version: string;

  @ApiProperty({
    description: 'Score minimo para aprovacao (0-100)',
    example: 70,
  })
  minimumScore: number;

  @ApiProperty({
    description: 'Itens do checklist',
    type: [ComplianceChecklistItemDto],
    required: false,
  })
  items?: ComplianceChecklistItemDto[];
}

/**
 * Query params para filtrar checklists.
 */
export class ComplianceChecklistQueryDto {
  @ApiProperty({
    description: 'Filtrar por tipo de template',
    enum: EtpTemplateType,
    required: false,
  })
  @IsOptional()
  @IsEnum(EtpTemplateType)
  templateType?: EtpTemplateType;

  @ApiProperty({
    description: 'Filtrar por padrao de conformidade',
    enum: ComplianceStandard,
    required: false,
  })
  @IsOptional()
  @IsEnum(ComplianceStandard)
  standard?: ComplianceStandard;
}

/**
 * Query params para validacao de ETP.
 */
export class ValidateEtpQueryDto {
  @ApiProperty({
    description:
      'ID do checklist a usar (opcional - usa checklist padrao do tipo do ETP)',
    required: false,
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  @IsOptional()
  @IsUUID()
  checklistId?: string;

  @ApiProperty({
    description: 'Se true, inclui itens OPTIONAL na validacao',
    required: false,
    default: false,
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  includeOptional?: boolean;
}
