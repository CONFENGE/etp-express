import {
  IsString,
  IsOptional,
  IsBoolean,
  IsUUID,
  Matches,
  MaxLength,
} from 'class-validator';

/**
 * DTO for creating a TenantBranding configuration.
 */
export class CreateTenantBrandingDto {
  @IsUUID()
  organizationId: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  logoUrl?: string;

  @IsOptional()
  @IsString()
  @Matches(/^#[0-9A-Fa-f]{6}$/, {
    message: 'primaryColor must be a valid HEX color (e.g., #0066cc)',
  })
  primaryColor?: string;

  @IsOptional()
  @IsString()
  @Matches(/^#[0-9A-Fa-f]{6}$/, {
    message: 'secondaryColor must be a valid HEX color (e.g., #f5f5f7)',
  })
  secondaryColor?: string;

  @IsOptional()
  @IsString()
  @Matches(/^#[0-9A-Fa-f]{6}$/, {
    message: 'accentColor must be a valid HEX color (e.g., #ff9500)',
  })
  accentColor?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  customDomain?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  footerText?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
