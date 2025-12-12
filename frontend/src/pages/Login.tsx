import { useState, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ClipboardList, LogIn, Eye, EyeOff, Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
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
import { APP_NAME, getAuthErrorMessage } from '@/lib/constants';
import { cn, isValidEmail } from '@/lib/utils';

const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'A senha deve ter no mínimo 6 caracteres'),
});

type LoginFormData = z.infer<typeof loginSchema>;

export function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const { error: showError, success } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Real-time validation hooks
  const emailValidator = useCallback(
    (value: string) => isValidEmail(value),
    [],
  );
  const passwordValidator = useCallback(
    (value: string) => value.length >= 6,
    [],
  );
  const emailValidation = useRealtimeValidation(emailValidator, {
    delay: 500,
    minLength: 1,
  });
  const passwordValidation = useRealtimeValidation(passwordValidator, {
    delay: 500,
    minLength: 1,
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true);
    try {
      await login(data);
      success('Login realizado com sucesso!');
      navigate('/dashboard');
    } catch (error) {
      showError(getAuthErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4 animate-fade-in">
      <main>
        <Card className="w-full max-w-md relative overflow-hidden opacity-0 animate-fade-in-up [animation-delay:200ms]">
          {/* Loading overlay */}
          {isLoading && (
            <div
              className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-10 transition-opacity duration-200"
              role="status"
              aria-label="Autenticando"
            >
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
                <span className="text-sm font-medium text-muted-foreground">
                  Autenticando...
                </span>
              </div>
            </div>
          )}
          <CardHeader className="space-y-1">
            <div className="flex items-center justify-center mb-4">
              <div className="p-3 bg-primary/10 rounded-full opacity-0 animate-scale-fade-in [animation-delay:400ms]">
                <ClipboardList
                  className="h-10 w-10 text-primary"
                  aria-hidden="true"
                />
              </div>
            </div>
            <CardTitle className="text-2xl text-center opacity-0 animate-fade-in-up [animation-delay:500ms]">
              {APP_NAME}
            </CardTitle>
            <CardDescription className="text-center opacity-0 animate-fade-in-up [animation-delay:600ms]">
              Entre com suas credenciais para acessar o sistema
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit(onSubmit)}>
            <CardContent className="space-y-4">
              <div className="opacity-0 animate-fade-in-up [animation-delay:700ms]">
                <FormField
                  id="email"
                  label="Email"
                  required
                  hint="Use seu email institucional"
                  error={errors.email?.message}
                >
                  <div className="relative">
                    <Input
                      id="email"
                      type="email"
                      placeholder="seu@email.com"
                      {...register('email', {
                        onChange: (e) =>
                          emailValidation.validate(e.target.value),
                      })}
                      aria-invalid={errors.email ? 'true' : 'false'}
                      aria-describedby={
                        errors.email ? 'email-error' : 'email-hint'
                      }
                      className={cn(
                        'pr-10 transition-colors duration-200',
                        emailValidation.state === 'valid' &&
                          !errors.email &&
                          'border-apple-green focus-visible:ring-apple-green',
                        emailValidation.state === 'invalid' &&
                          'border-apple-red focus-visible:ring-apple-red',
                      )}
                    />
                    <ValidationIcon state={emailValidation.state} />
                  </div>
                </FormField>
              </div>

              <div className="opacity-0 animate-fade-in-up [animation-delay:800ms]">
                <FormField
                  id="password"
                  label="Senha"
                  required
                  hint="Minimo 6 caracteres"
                  error={errors.password?.message}
                >
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      {...register('password', {
                        onChange: (e) =>
                          passwordValidation.validate(e.target.value),
                      })}
                      aria-invalid={errors.password ? 'true' : 'false'}
                      className={cn(
                        'pr-16 transition-colors duration-200',
                        passwordValidation.state === 'valid' &&
                          !errors.password &&
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
              </div>
            </CardContent>
            <CardFooter className="flex flex-col space-y-4">
              <div className="w-full opacity-0 animate-fade-in-up [animation-delay:900ms]">
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Entrando...
                    </>
                  ) : (
                    <>
                      <LogIn className="mr-2 h-4 w-4" />
                      Entrar
                    </>
                  )}
                </Button>
              </div>
              <p className="text-sm text-center text-muted-foreground opacity-0 animate-fade-in [animation-delay:1000ms]">
                Não tem uma conta?{' '}
                <Link to="/register" className="text-primary underline">
                  Cadastre-se
                </Link>
              </p>
              <p className="text-xs text-center text-muted-foreground opacity-0 animate-fade-in [animation-delay:1100ms]">
                <Link to="/privacy" className="underline">
                  Política de Privacidade
                </Link>
              </p>
            </CardFooter>
          </form>
        </Card>
      </main>
    </div>
  );
}
