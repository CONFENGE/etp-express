import { IsString, MinLength, MaxLength, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO for password change request.
 *
 * @remarks
 * Used for changing user password, either voluntary or mandatory (first login).
 * Enforces password complexity requirements for security.
 *
 * Password requirements:
 * - Minimum 8 characters
 * - Maximum 128 characters
 * - At least one uppercase letter
 * - At least one lowercase letter
 * - At least one number
 * - At least one special character (!@#$%^&*(),.?":{}|<>)
 *
 * @see AuthService.changePassword
 */
export class ChangePasswordDto {
 @ApiProperty({
 description: 'Current password for validation',
 example: 'OldPassword123!',
 })
 @IsString()
 @MinLength(1, { message: 'Senha atual é obrigatória' })
 oldPassword: string;

 @ApiProperty({
 description:
 'New password with complexity requirements: min 8 chars, uppercase, lowercase, number, special char',
 example: 'NewSecurePass456!',
 })
 @IsString()
 @MinLength(8, { message: 'Nova senha deve ter no mínimo 8 caracteres' })
 @MaxLength(128, { message: 'Nova senha deve ter no máximo 128 caracteres' })
 @Matches(
 /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>]).{8,}$/,
 {
 message:
 'Nova senha deve conter: letra maiúscula, letra minúscula, número e caractere especial',
 },
 )
 newPassword: string;
}
