import { IsString, MinLength, IsOptional, IsBoolean } from 'class-validator';

/**
 * DTO for updating a user within a domain (Domain Manager operation).
 *
 * Domain Managers can update user details but not email or role.
 * Only name, cargo (position), and active status can be modified.
 */
export class UpdateDomainUserDto {
 @IsOptional()
 @IsString()
 @MinLength(2, { message: 'Name must be at least 2 characters' })
 name?: string;

 @IsOptional()
 @IsString()
 cargo?: string;

 @IsOptional()
 @IsBoolean()
 isActive?: boolean;
}
