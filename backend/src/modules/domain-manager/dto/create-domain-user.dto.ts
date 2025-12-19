import { IsEmail, IsString, MinLength, IsOptional } from 'class-validator';

/**
 * DTO for creating a new user within a domain (Domain Manager operation).
 *
 * Domain Managers can create users with emails matching their domain.
 * New users are created with default password 'mudar123' and mustChangePassword=true.
 *
 * @remarks
 * Validation rules:
 * - Email must be valid and match the Domain Manager's domain
 * - Name is required and must be at least 2 characters
 * - Cargo (position) is optional
 */
export class CreateDomainUserDto {
 @IsEmail({}, { message: 'Email must be a valid email address' })
 email: string;

 @IsString()
 @MinLength(2, { message: 'Name must be at least 2 characters' })
 name: string;

 @IsOptional()
 @IsString()
 cargo?: string;
}
