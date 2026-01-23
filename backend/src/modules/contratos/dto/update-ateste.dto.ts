import { PartialType } from '@nestjs/swagger';
import { CreateAtesteDto } from './create-ateste.dto';

/**
 * DTO for updating an Ateste (Measurement Attestation).
 *
 * Extends CreateAtesteDto with all fields optional.
 *
 * **Restriction:**
 * - Only atestes that haven't been finalized can be updated
 * - Cannot change the associated Medicao
 *
 * **Issue #1643** - [FISC-1286c] Create Ateste entity and approval workflow
 *
 * @see Lei 14.133/2021 Art. 117 - Contract Inspection
 */
export class UpdateAtesteDto extends PartialType(CreateAtesteDto) {}
