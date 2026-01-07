import { PartialType } from '@nestjs/swagger';
import { CreateTemplateDto } from './create-template.dto';

/**
 * DTO para atualização de template de ETP.
 * Todos os campos são opcionais (PartialType).
 *
 * Issue #1161 - [Templates] Criar modelos pré-configurados por tipo
 */
export class UpdateTemplateDto extends PartialType(CreateTemplateDto) {}
