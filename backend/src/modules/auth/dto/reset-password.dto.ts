import { IsString, MinLength, MaxLength, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO for password reset request.
 *
 * @remarks
 * Used to reset password using a valid reset token.
 * Token is received via email and expires after 1 hour.
 * New password must meet complexity requirements.
 *
 * Password requirements:
 * - Minimum 8 characters
 * - Maximum 128 characters
 * - At least one uppercase letter
 * - At least one lowercase letter
 * - At least one number
 * - At least one special character (!@#$%^&*(),.?":{}|<>)
 *
 * @see AuthService.resetPassword
 */
export class ResetPasswordDto {
 @ApiProperty({
 description: 'Password reset token received via email',
 example: 'a1b2c3d4e5f6...',
 })
 @IsString({ message: 'Token é obrigatório' })
 @MinLength(1, { message: 'Token é obrigatório' })
 token: string;

 @ApiProperty({
 description:
 'New password with complexity requirements: min 8 chars, uppercase, lowercase, number, special char',
 example: 'NewSecurePass456!',
 })
 @IsString()
 @MinLength(8, { message: 'Senha deve ter no mínimo 8 caracteres' })
 @MaxLength(128, { message: 'Senha deve ter no máximo 128 caracteres' })
 @Matches(
 /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>]).{8,}$/,
 {
 message:
 'Senha deve conter: letra maiúscula, letra minúscula, número e caractere especial',
 },
 )
 newPassword: string;
}
