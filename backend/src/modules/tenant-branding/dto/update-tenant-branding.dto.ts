import { PartialType } from '@nestjs/mapped-types';
import { CreateTenantBrandingDto } from './create-tenant-branding.dto';
import { OmitType } from '@nestjs/mapped-types';

/**
 * DTO for updating a TenantBranding configuration.
 * Excludes organizationId (cannot be changed after creation).
 */
export class UpdateTenantBrandingDto extends PartialType(
  OmitType(CreateTenantBrandingDto, ['organizationId'] as const),
) {}
