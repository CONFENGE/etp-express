import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { FileText, UserPlus } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/useToast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
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
    } catch (error) {
      showError(
        error instanceof Error
          ? error.message
          : 'Erro ao cadastrar. Tente novamente.',
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <div className="flex items-center justify-center mb-4">
            <FileText className="h-12 w-12 text-primary" />
          </div>
          <CardTitle className="text-2xl text-center">{APP_NAME}</CardTitle>
          <CardDescription className="text-center">
            Crie sua conta para começar
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit(onSubmit)}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome</Label>
              <Input
                id="name"
                placeholder="Seu nome completo"
                {...register('name')}
                aria-invalid={errors.name ? 'true' : 'false'}
              />
              {errors.name && (
                <p className="text-sm text-destructive">
                  {errors.name.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="seu@email.com"
                {...register('email')}
                aria-invalid={errors.email ? 'true' : 'false'}
              />
              {errors.email && (
                <p className="text-sm text-destructive">
                  {errors.email.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                {...register('password')}
                aria-invalid={errors.password ? 'true' : 'false'}
              />
              {errors.password && (
                <p className="text-sm text-destructive">
                  {errors.password.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirmar Senha</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="••••••••"
                {...register('confirmPassword')}
                aria-invalid={errors.confirmPassword ? 'true' : 'false'}
              />
              {errors.confirmPassword && (
                <p className="text-sm text-destructive">
                  {errors.confirmPassword.message}
                </p>
              )}
            </div>

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
                  <Link to="/terms" className="text-primary hover:underline">
                    termos de uso
                  </Link>{' '}
                  e{' '}
                  <Link to="/privacy" className="text-primary hover:underline">
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
                    className="text-primary hover:underline"
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
                <>Cadastrando...</>
              ) : (
                <>
                  <UserPlus className="mr-2 h-4 w-4" />
                  Cadastrar
                </>
              )}
            </Button>
            <p className="text-sm text-center text-muted-foreground">
              Já tem uma conta?{' '}
              <Link to="/login" className="text-primary hover:underline">
                Entre
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>

      <InternationalTransferModal
        open={showTransferModal}
        onAccept={handleTransferAccept}
        onDecline={handleTransferDecline}
      />
    </div>
  );
}
