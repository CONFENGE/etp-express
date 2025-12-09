import { useState, FormEvent } from 'react';
import { useAuthStore } from '@/store/authStore';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { AlertCircle, CheckCircle2, Eye, EyeOff, Shield } from 'lucide-react';

/**
 * Password validation requirements.
 * Must match backend validation in change-password.dto.ts
 */
const PASSWORD_REQUIREMENTS = {
  minLength: 8,
  maxLength: 128,
  hasUppercase: /[A-Z]/,
  hasLowercase: /[a-z]/,
  hasNumber: /\d/,
  hasSpecialChar: /[!@#$%^&*(),.?":{}|<>]/,
};

interface PasswordStrength {
  score: number;
  label: string;
  color: string;
}

function validatePasswordStrength(password: string): PasswordStrength {
  let score = 0;

  if (password.length >= PASSWORD_REQUIREMENTS.minLength) score++;
  if (PASSWORD_REQUIREMENTS.hasUppercase.test(password)) score++;
  if (PASSWORD_REQUIREMENTS.hasLowercase.test(password)) score++;
  if (PASSWORD_REQUIREMENTS.hasNumber.test(password)) score++;
  if (PASSWORD_REQUIREMENTS.hasSpecialChar.test(password)) score++;

  if (score <= 2) return { score, label: 'Fraca', color: 'bg-red-500' };
  if (score <= 3) return { score, label: 'Razoável', color: 'bg-yellow-500' };
  if (score <= 4) return { score, label: 'Boa', color: 'bg-blue-500' };
  return { score, label: 'Forte', color: 'bg-green-500' };
}

function validatePassword(password: string): string[] {
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
 * Modal for mandatory password change on first login.
 * Displays when user.mustChangePassword is true.
 *
 * Features:
 * - Prevents closing until password is changed
 * - Real-time password validation
 * - Password strength indicator
 * - Accessible form with labels
 *
 * @see AuthService.changePassword for backend implementation
 */
export function PasswordChangeModal() {
  const { user, changePassword, isLoading, error, clearError } = useAuthStore();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  // Only show modal when mustChangePassword is true
  const isOpen = user?.mustChangePassword === true;

  if (!isOpen) return null;

  const passwordValidation = validatePassword(newPassword);
  const passwordStrength = validatePasswordStrength(newPassword);
  const passwordsMatch = newPassword === confirmPassword;
  const isValid =
    currentPassword.length > 0 &&
    passwordValidation.length === 0 &&
    passwordsMatch &&
    confirmPassword.length > 0;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLocalError(null);
    clearError();

    if (!isValid) {
      setLocalError('Preencha todos os campos corretamente');
      return;
    }

    try {
      await changePassword({
        oldPassword: currentPassword,
        newPassword: newPassword,
      });
      // Success - modal will close automatically since mustChangePassword will be false
    } catch {
      // Error is already set in store
    }
  }

  return (
    <Dialog open={true} onOpenChange={() => {}}>
      <DialogContent
        className="sm:max-w-md"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            <DialogTitle>Troca de Senha Obrigatória</DialogTitle>
          </div>
          <DialogDescription>
            Por segurança, você precisa trocar sua senha no primeiro acesso.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          {/* Current Password */}
          <div className="space-y-2">
            <Label htmlFor="currentPassword">Senha Atual</Label>
            <div className="relative">
              <Input
                id="currentPassword"
                type={showCurrentPassword ? 'text' : 'password'}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Digite sua senha atual"
                autoComplete="current-password"
                disabled={isLoading}
              />
              <button
                type="button"
                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                aria-label={
                  showCurrentPassword ? 'Ocultar senha' : 'Mostrar senha'
                }
              >
                {showCurrentPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>

          {/* New Password */}
          <div className="space-y-2">
            <Label htmlFor="newPassword">Nova Senha</Label>
            <div className="relative">
              <Input
                id="newPassword"
                type={showNewPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Digite sua nova senha"
                autoComplete="new-password"
                disabled={isLoading}
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                aria-label={showNewPassword ? 'Ocultar senha' : 'Mostrar senha'}
              >
                {showNewPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>

            {/* Password Strength Indicator */}
            {newPassword.length > 0 && (
              <div className="space-y-2">
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div
                      key={i}
                      className={`h-1 flex-1 rounded-full transition-colors ${
                        i <= passwordStrength.score
                          ? passwordStrength.color
                          : 'bg-gray-200'
                      }`}
                    />
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  Força:{' '}
                  <span className="font-medium">{passwordStrength.label}</span>
                </p>
              </div>
            )}

            {/* Validation Requirements */}
            {newPassword.length > 0 && passwordValidation.length > 0 && (
              <ul className="text-xs space-y-1 text-muted-foreground">
                {passwordValidation.map((error, i) => (
                  <li key={i} className="flex items-center gap-1 text-red-500">
                    <AlertCircle className="h-3 w-3" />
                    {error}
                  </li>
                ))}
              </ul>
            )}

            {newPassword.length > 0 && passwordValidation.length === 0 && (
              <p className="text-xs text-green-600 flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3" />
                Senha atende todos os requisitos
              </p>
            )}
          </div>

          {/* Confirm Password */}
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirmar Nova Senha</Label>
            <div className="relative">
              <Input
                id="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirme sua nova senha"
                autoComplete="new-password"
                disabled={isLoading}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                aria-label={
                  showConfirmPassword ? 'Ocultar senha' : 'Mostrar senha'
                }
              >
                {showConfirmPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
            {confirmPassword.length > 0 && !passwordsMatch && (
              <p className="text-xs text-red-500 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                As senhas não coincidem
              </p>
            )}
            {confirmPassword.length > 0 && passwordsMatch && (
              <p className="text-xs text-green-600 flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3" />
                Senhas coincidem
              </p>
            )}
          </div>

          {/* Error Messages */}
          {(error || localError) && (
            <div className="p-3 rounded-md bg-red-50 border border-red-200">
              <p className="text-sm text-red-700 flex items-center gap-2">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                {error || localError}
              </p>
            </div>
          )}

          {/* Submit Button */}
          <Button
            type="submit"
            className="w-full"
            disabled={!isValid || isLoading}
          >
            {isLoading ? 'Alterando...' : 'Alterar Senha'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
