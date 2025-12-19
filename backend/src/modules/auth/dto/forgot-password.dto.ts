import { IsEmail } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO for forgot password request.
 *
 * @remarks
 * Used to request a password reset email.
 * Only requires email - the system will send reset instructions
 * if the email exists, but won't reveal whether the email exists
 * for security reasons.
 *
 * @see AuthService.forgotPassword
 */
export class ForgotPasswordDto {
 @ApiProperty({
 description: 'Email address to send password reset instructions',
 example: 'usuario@exemplo.gov.br',
 })
 @IsEmail({}, { message: 'Email inválido' })
 email: string;
}
