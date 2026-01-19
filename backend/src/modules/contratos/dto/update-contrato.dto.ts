import { PartialType } from '@nestjs/mapped-types';
import { CreateContratoDto } from './create-contrato.dto';

/**
 * DTO for updating an existing Contrato.
 *
 * All fields are optional - extends CreateContratoDto with partial properties.
 */
export class UpdateContratoDto extends PartialType(CreateContratoDto) {}
