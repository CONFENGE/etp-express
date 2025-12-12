import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ClipboardList, UserPlus, Eye, EyeOff, Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/useToast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { FormField } from '@/components/ui/form-field';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { APP_NAME } from '@/lib/constants';
import { InternationalTransferModal } from '@/components/legal/InternationalTransferModal';
import { UnauthorizedDomainModal } from '@/components/modals/UnauthorizedDomainModal';

const registerSchema = z
  .object({
    name: z.string().min(3, 'O nome deve ter no mínimo 3 caracteres'),
    email: z.string().email('Email inválido'),
    password: z.string().min(6, 'A senha deve ter no mínimo 6 caracteres'),
    confirmPassword: z.string(),
    lgpdConsent: z.literal(true, {
      errorMap: () => ({
        message: 'Você deve aceitar os termos de uso e política de privacidade',
      }),
    }),
    internationalTransferConsent: z.literal(true, {
      errorMap: () => ({
        message: 'Você deve aceitar a transferência internacional de dados',
      }),
    }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'As senhas não coincidem',
    path: ['confirmPassword'],
  });

type RegisterFormData = z.infer<typeof registerSchema>;

export function Register() {
  const navigate = useNavigate();
  const { register: registerUser } = useAuth();
  const { error: showError, success } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [showUnauthorizedModal, setShowUnauthorizedModal] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [unauthorizedEmail, setUnauthorizedEmail] = useState<string>('');

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      internationalTransferConsent: false as unknown as true,
    },
  });

  const internationalTransferConsent = watch('internationalTransferConsent');

  const handleTransferAccept = () => {
    setValue('internationalTransferConsent', true, { shouldValidate: true });
    setShowTransferModal(false);
  };

  const handleTransferDecline = () => {
    setValue('internationalTransferConsent', false as unknown as true, {
      shouldValidate: true,
    });
    setShowTransferModal(false);
  };

  const onSubmit = async (data: RegisterFormData) => {
    setIsLoading(true);
    try {
      await registerUser({
        name: data.name,
        email: data.email,
        password: data.password,
        lgpdConsent: data.lgpdConsent,
        internationalTransferConsent: data.internationalTransferConsent,
      });
      success('Cadastro realizado com sucesso!');
      navigate('/dashboard');
    } catch (error: unknown) {
      // Handle unauthorized domain error (400)
      if (
        error &&
        typeof error === 'object' &&
        'statusCode' in error &&
        error.statusCode === 400 &&
        'message' in error &&
        typeof error.message === 'string' &&
        (error.message.includes('domain') ||
          error.message.includes('domínio') ||
          error.message.includes('not authorized') ||
          error.message.includes('não autorizado'))
      ) {
        setUnauthorizedEmail(data.email);
        setShowUnauthorizedModal(true);
      } else {
        showError(
          error instanceof Error
            ? error.message
            : 'Erro ao cadastrar. Tente novamente.',
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <main>
        <Card className="w-full max-w-md relative overflow-hidden">
          {/* Loading overlay */}
          {isLoading && (
            <div
              className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-10 transition-opacity duration-200"
              role="status"
              aria-label="Cadastrando"
            >
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
                <span className="text-sm font-medium text-muted-foreground">
                  Cadastrando...
                </span>
              </div>
            </div>
          )}
          <CardHeader className="space-y-1">
            <div className="flex items-center justify-center mb-4">
              <div className="p-3 bg-primary/10 rounded-full">
                <ClipboardList
                  className="h-10 w-10 text-primary"
                  aria-hidden="true"
                />
              </div>
            </div>
            <CardTitle className="text-2xl text-center">{APP_NAME}</CardTitle>
            <CardDescription className="text-center">
              Crie sua conta para começar
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit(onSubmit)}>
            <CardContent className="space-y-4">
              <FormField
                id="name"
                label="Nome"
                required
                hint="Seu nome completo"
                error={errors.name?.message}
              >
                <Input
                  id="name"
                  placeholder="Seu nome completo"
                  {...register('name')}
                  aria-invalid={errors.name ? 'true' : 'false'}
                />
              </FormField>

              <FormField
                id="email"
                label="Email"
                required
                hint="Use seu email institucional. Apenas dominios autorizados podem se cadastrar."
                error={errors.email?.message}
              >
                <Input
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
                  {...register('email')}
                  aria-invalid={errors.email ? 'true' : 'false'}
                />
              </FormField>

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
                    {...register('password')}
                    aria-invalid={errors.password ? 'true' : 'false'}
                    className="pr-10"
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
                label="Confirmar Senha"
                required
                hint="Repita a senha"
                error={errors.confirmPassword?.message}
              >
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    {...register('confirmPassword')}
                    aria-invalid={errors.confirmPassword ? 'true' : 'false'}
                    className="pr-10"
                  />
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

              <div className="flex items-start space-x-2 pt-2">
                <Checkbox
                  id="lgpdConsent"
                  onCheckedChange={(checked: boolean | 'indeterminate') => {
                    const event = {
                      target: {
                        name: 'lgpdConsent',
                        value: checked === true,
                      },
                    };
                    register('lgpdConsent').onChange(event);
                  }}
                  aria-invalid={errors.lgpdConsent ? 'true' : 'false'}
                />
                <div className="grid gap-1.5 leading-none">
                  <Label
                    htmlFor="lgpdConsent"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    Aceito os{' '}
                    <Link to="/terms" className="text-primary underline">
                      termos de uso
                    </Link>{' '}
                    e{' '}
                    <Link to="/privacy" className="text-primary underline">
                      política de privacidade
                    </Link>
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Ao marcar esta opção, você concorda com o tratamento de seus
                    dados pessoais conforme a Lei Geral de Proteção de Dados
                    (LGPD).
                  </p>
                  {errors.lgpdConsent && (
                    <p className="text-sm text-destructive">
                      {errors.lgpdConsent.message}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-start space-x-2 pt-2">
                <Checkbox
                  id="internationalTransferConsent"
                  checked={internationalTransferConsent === true}
                  onCheckedChange={(checked: boolean | 'indeterminate') => {
                    if (checked) {
                      setShowTransferModal(true);
                    } else {
                      setValue(
                        'internationalTransferConsent',
                        false as unknown as true,
                        { shouldValidate: true },
                      );
                    }
                  }}
                  aria-invalid={
                    errors.internationalTransferConsent ? 'true' : 'false'
                  }
                />
                <div className="grid gap-1.5 leading-none">
                  <Label
                    htmlFor="internationalTransferConsent"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    Aceito a transferência internacional de dados
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Seus dados serão processados em servidores nos EUA (Railway,
                    OpenAI, Perplexity) conforme LGPD Art. 33.{' '}
                    <button
                      type="button"
                      onClick={() => setShowTransferModal(true)}
                      className="text-primary underline"
                    >
                      Saiba mais
                    </button>
                  </p>
                  {errors.internationalTransferConsent && (
                    <p className="text-sm text-destructive">
                      {errors.internationalTransferConsent.message}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex flex-col space-y-4">
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Cadastrando...
                  </>
                ) : (
                  <>
                    <UserPlus className="mr-2 h-4 w-4" />
                    Cadastrar
                  </>
                )}
              </Button>
              <p className="text-sm text-center text-muted-foreground">
                Já tem uma conta?{' '}
                <Link to="/login" className="text-primary underline">
                  Entre
                </Link>
              </p>
            </CardFooter>
          </form>
        </Card>
      </main>

      <InternationalTransferModal
        open={showTransferModal}
        onAccept={handleTransferAccept}
        onDecline={handleTransferDecline}
      />

      <UnauthorizedDomainModal
        open={showUnauthorizedModal}
        onClose={() => setShowUnauthorizedModal(false)}
        email={unauthorizedEmail}
      />
    </div>
  );
}
