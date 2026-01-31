/**
 * Password validation utilities shared across Login, Register, and PasswordChangeModal.
 *
 * IMPORTANT: Must match backend validation in:
 * - backend/src/modules/auth/dto/register.dto.ts
 * - backend/src/modules/auth/dto/change-password.dto.ts
 *
 * Issue #1719 - Align frontend/backend password validation
 */

/**
 * Password requirements matching backend DTO validation.
 *
 * Backend regex: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>]).{8,}$/
 */
export const PASSWORD_REQUIREMENTS = {
  minLength: 8,
  maxLength: 128,
  hasUppercase: /[A-Z]/,
  hasLowercase: /[a-z]/,
  hasNumber: /\d/,
  hasSpecialChar: /[!@#$%^&*(),.?":{}|<>]/,
} as const;

/**
 * Validates password meets all complexity requirements.
 * @param password - Password to validate
 * @returns Array of error messages, empty if valid
 */
export function validatePassword(password: string): string[] {
  const errors: string[] = [];

  if (password.length < PASSWORD_REQUIREMENTS.minLength) {
    errors.push(`Mínimo ${PASSWORD_REQUIREMENTS.minLength} caracteres`);
  }
  if (password.length > PASSWORD_REQUIREMENTS.maxLength) {
    errors.push(`Máximo ${PASSWORD_REQUIREMENTS.maxLength} caracteres`);
  }
  if (!PASSWORD_REQUIREMENTS.hasUppercase.test(password)) {
    errors.push('Pelo menos 1 letra maiúscula');
  }
  if (!PASSWORD_REQUIREMENTS.hasLowercase.test(password)) {
    errors.push('Pelo menos 1 letra minúscula');
  }
  if (!PASSWORD_REQUIREMENTS.hasNumber.test(password)) {
    errors.push('Pelo menos 1 número');
  }
  if (!PASSWORD_REQUIREMENTS.hasSpecialChar.test(password)) {
    errors.push('Pelo menos 1 caractere especial (!@#$%^&*(),.?":{}|<>)');
  }

  return errors;
}

/**
 * Checks if password meets all requirements (returns boolean).
 * @param password - Password to check
 * @returns True if valid, false otherwise
 */
export function isPasswordValid(password: string): boolean {
  return validatePassword(password).length === 0;
}

/**
 * Zod schema for password validation.
 * Use with zod's .refine() or .regex() for form validation.
 */
export const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>]).{8,}$/;

/**
 * Error message for Zod password validation.
 */
export const PASSWORD_ERROR_MESSAGE = 'Senha deve conter: letra maiúscula, letra minúscula, número e caractere especial';
