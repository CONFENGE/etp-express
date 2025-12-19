import { PartialType } from '@nestjs/swagger';
import { CreateOrganizationDto } from './create-organization.dto';
import { IsBoolean, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO for updating an existing organization.
 * All fields from CreateOrganizationDto are optional.
 * Adds isActive field for suspend/reactivate operations.
 */
export class UpdateOrganizationDto extends PartialType(CreateOrganizationDto) {
 @ApiProperty({
 description:
 'Organization active status. Kill Switch for blocking organization access.',
 example: true,
 required: false,
 })
 @IsBoolean()
 @IsOptional()
 isActive?: boolean;
}
