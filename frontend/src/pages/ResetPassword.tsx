import { useState, useCallback } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  KeyRound,
  ArrowLeft,
  Loader2,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { useToast } from '@/hooks/useToast';
import { useRealtimeValidation } from '@/hooks/useRealtimeValidation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FormField } from '@/components/ui/form-field';
import { ValidationIcon } from '@/components/ui/validation-icon';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { apiHelpers } from '@/lib/api';
import { cn, isStrongPassword } from '@/lib/utils';

const resetPasswordSchema = z
  .object({
    newPassword: z
      .string()
      .min(8, 'Senha deve ter no mínimo 8 caracteres')
      .max(128, 'Senha deve ter no máximo 128 caracteres')
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>]).{8,}$/,
        'Senha deve conter: letra maiúscula, letra minúscula, número e caractere especial',
      ),
    confirmPassword: z.string().min(1, 'Confirme sua senha'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'As senhas não coincidem',
    path: ['confirmPassword'],
  });

type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;

export function ResetPassword() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const { error: showError, success } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);

  // Real-time validation
  const passwordValidator = useCallback(
    (value: string) => isStrongPassword(value),
    [],
  );
  const passwordValidation = useRealtimeValidation(passwordValidator, {
    delay: 300,
    minLength: 1,
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
  });

  const newPassword = watch('newPassword');
  const confirmPassword = watch('confirmPassword');
  const passwordsMatch =
    newPassword && confirmPassword && newPassword === confirmPassword;

  const onSubmit = async (data: ResetPasswordFormData) => {
    if (!token) {
      showError('Token inválido. Solicite uma nova redefinição de senha.');
      return;
    }

    setIsLoading(true);
    try {
      await apiHelpers.post('/auth/reset-password', {
        token,
        newPassword: data.newPassword,
      });
      setResetSuccess(true);
      success('Senha redefinida com sucesso!');
    } catch (error: unknown) {
      const errorMessage =
        (error as { message?: string })?.message ||
        'Erro ao redefinir senha. O link pode ter expirado.';
      showError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // No token provided
  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4 animate-fade-in">
        <main>
          <Card className="w-full max-w-md animate-fade-in-up">
            <CardHeader className="space-y-1 text-center">
              <div className="flex items-center justify-center mb-4">
                <div className="p-3 bg-red-100 rounded-full">
                  <AlertTriangle
                    className="h-10 w-10 text-red-600"
                    aria-hidden="true"
                  />
                </div>
              </div>
              <CardTitle className="text-2xl" data-testid="error-message">
                Link inválido
              </CardTitle>
              <CardDescription className="text-base">
                O link de redefinição de senha é inválido ou expirou. Por favor,
                solicite um novo link.
              </CardDescription>
            </CardHeader>
            <CardFooter className="flex flex-col space-y-4">
              <Link to="/forgot-password" className="w-full">
                <Button className="w-full">Solicitar novo link</Button>
              </Link>
              <Link to="/login" className="w-full">
                <Button variant="ghost" className="w-full">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Voltar para login
                </Button>
              </Link>
            </CardFooter>
          </Card>
        </main>
      </div>
    );
  }

  // Success state
  if (resetSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4 animate-fade-in">
        <main>
          <Card className="w-full max-w-md animate-fade-in-up">
            <CardHeader className="space-y-1 text-center">
              <div className="flex items-center justify-center mb-4">
                <div className="p-3 bg-green-100 rounded-full">
                  <CheckCircle2
                    className="h-10 w-10 text-green-600"
                    aria-hidden="true"
                  />
                </div>
              </div>
              <CardTitle className="text-2xl" data-testid="success-message">
                Senha redefinida!
              </CardTitle>
              <CardDescription className="text-base">
                Sua senha foi alterada com sucesso. Você já pode fazer login com
                sua nova senha.
              </CardDescription>
            </CardHeader>
            <CardFooter>
              <Button className="w-full" onClick={() => navigate('/login')}>
                Ir para login
              </Button>
            </CardFooter>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4 animate-fade-in">
      <main>
        <Card className="w-full max-w-md relative overflow-hidden animate-fade-in-up">
          {/* Loading overlay */}
          {isLoading && (
            <div
              className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-10"
              role="status"
              aria-label="Redefinindo senha"
            >
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
                <span className="text-sm font-medium text-muted-foreground">
                  Redefinindo senha...
                </span>
              </div>
            </div>
          )}
          <CardHeader className="space-y-1">
            <div className="flex items-center justify-center mb-4">
              <div className="p-3 bg-primary/10 rounded-full">
                <KeyRound
                  className="h-10 w-10 text-primary"
                  aria-hidden="true"
                />
              </div>
            </div>
            <CardTitle className="text-2xl text-center">
              Redefinir senha
            </CardTitle>
            <CardDescription className="text-center">
              Digite sua nova senha. Ela deve conter pelo menos 8 caracteres,
              incluindo letra maiúscula, minúscula, número e caractere especial.
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit(onSubmit)}>
            <CardContent className="space-y-4">
              <FormField
                id="newPassword"
                label="Nova senha"
                required
                hint="Min. 8 caracteres, maiúscula, minúscula, número e especial"
                error={errors.newPassword?.message}
              >
                <div className="relative">
                  <Input
                    id="newPassword"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Nova senha"
                    data-testid="password-input"
                    {...register('newPassword', {
                      onChange: (e) =>
                        passwordValidation.validate(e.target.value),
                    })}
                    aria-invalid={errors.newPassword ? 'true' : 'false'}
                    className={cn(
                      'pr-16 transition-colors duration-200',
                      passwordValidation.state === 'valid' &&
                        !errors.newPassword &&
                        'border-apple-green focus-visible:ring-apple-green',
                      passwordValidation.state === 'invalid' &&
                        'border-apple-red focus-visible:ring-apple-red',
                    )}
                  />
                  <ValidationIcon
                    state={passwordValidation.state}
                    className="right-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-1"
                    aria-label={
                      showPassword ? 'Ocultar senha' : 'Mostrar senha'
                    }
                    tabIndex={-1}
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5" aria-hidden="true" />
                    ) : (
                      <Eye className="h-5 w-5" aria-hidden="true" />
                    )}
                  </button>
                </div>
              </FormField>

              <FormField
                id="confirmPassword"
                label="Confirmar senha"
                required
                hint="Digite a mesma senha novamente"
                error={errors.confirmPassword?.message}
              >
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="Confirme a senha"
                    data-testid="confirm-password-input"
                    {...register('confirmPassword')}
                    aria-invalid={errors.confirmPassword ? 'true' : 'false'}
                    className={cn(
                      'pr-16 transition-colors duration-200',
                      passwordsMatch &&
                        'border-apple-green focus-visible:ring-apple-green',
                      confirmPassword &&
                        !passwordsMatch &&
                        'border-apple-red focus-visible:ring-apple-red',
                    )}
                  />
                  {confirmPassword && (
                    <ValidationIcon
                      state={passwordsMatch ? 'valid' : 'invalid'}
                      className="right-10"
                    />
                  )}
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-1"
                    aria-label={
                      showConfirmPassword ? 'Ocultar senha' : 'Mostrar senha'
                    }
                    tabIndex={-1}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-5 w-5" aria-hidden="true" />
                    ) : (
                      <Eye className="h-5 w-5" aria-hidden="true" />
                    )}
                  </button>
                </div>
              </FormField>
            </CardContent>
            <CardFooter className="flex flex-col space-y-4">
              <Button
                type="submit"
                className="w-full"
                disabled={isLoading}
                data-testid="submit-button"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Redefinindo...
                  </>
                ) : (
                  <>
                    <KeyRound className="mr-2 h-4 w-4" />
                    Redefinir senha
                  </>
                )}
              </Button>
              <Link to="/login" className="w-full">
                <Button variant="ghost" className="w-full">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Voltar para login
                </Button>
              </Link>
            </CardFooter>
          </form>
        </Card>
      </main>
    </div>
  );
}
