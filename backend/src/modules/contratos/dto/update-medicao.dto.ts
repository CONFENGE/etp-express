import { PartialType } from '@nestjs/swagger';
import { CreateMedicaoDto } from './create-medicao.dto';

/**
 * DTO for updating an existing Medicao (Contract Measurement).
 *
 * All fields are optional - only provided fields will be updated.
 *
 * **Restrictions:**
 * - Only PENDENTE or REJEITADA measurements can be updated
 * - Sequential number cannot be changed
 * - Validations are re-executed for value and period
 *
 * **Issue #1641** - [FISC-1286a] Create Medicao entity and CRUD endpoints
 */
export class UpdateMedicaoDto extends PartialType(CreateMedicaoDto) {}
