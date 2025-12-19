import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Mail, ArrowLeft, Loader2, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FormField } from '@/components/ui/form-field';
import {
 Card,
 CardContent,
 CardDescription,
 CardFooter,
 CardHeader,
 CardTitle,
} from '@/components/ui/card';
import { apiHelpers } from '@/lib/api';

const forgotPasswordSchema = z.object({
 email: z.string().email('Email invalido'),
});

type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;

export function ForgotPassword() {
 const [isLoading, setIsLoading] = useState(false);
 const [emailSent, setEmailSent] = useState(false);

 const {
 register,
 handleSubmit,
 formState: { errors },
 getValues,
 } = useForm<ForgotPasswordFormData>({
 resolver: zodResolver(forgotPasswordSchema),
 });

 const onSubmit = async (data: ForgotPasswordFormData) => {
 setIsLoading(true);
 try {
 await apiHelpers.post('/auth/forgot-password', { email: data.email });
 setEmailSent(true);
 } catch {
 // Always show success for security (prevent email enumeration)
 // Backend also returns success regardless of email existence
 setEmailSent(true);
 } finally {
 setIsLoading(false);
 }
 };

 if (emailSent) {
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
 <CardTitle className="text-2xl">Verifique seu email</CardTitle>
 <CardDescription className="text-base">
 Se o email{' '}
 <span className="font-medium text-foreground">
 {getValues('email')}
 </span>{' '}
 existir em nossa base, voce recebera instrucoes para redefinir
 sua senha.
 </CardDescription>
 </CardHeader>
 <CardContent className="space-y-4">
 <div className="bg-muted p-4 rounded-lg text-sm text-muted-foreground">
 <p className="mb-2">
 <strong>Nao recebeu o email?</strong>
 </p>
 <ul className="list-disc list-inside space-y-1">
 <li>Verifique sua pasta de spam</li>
 <li>Confirme se digitou o email correto</li>
 <li>Aguarde alguns minutos e tente novamente</li>
 </ul>
 </div>
 </CardContent>
 <CardFooter className="flex flex-col space-y-4">
 <Button
 variant="outline"
 className="w-full"
 onClick={() => setEmailSent(false)}
 >
 Tentar outro email
 </Button>
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

 return (
 <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4 animate-fade-in">
 <main>
 <Card className="w-full max-w-md relative overflow-hidden animate-fade-in-up">
 {/* Loading overlay */}
 {isLoading && (
 <div
 className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-10"
 role="status"
 aria-label="Enviando"
 >
 <div className="flex flex-col items-center gap-3">
 <Loader2 className="h-10 w-10 animate-spin text-primary" />
 <span className="text-sm font-medium text-muted-foreground">
 Enviando...
 </span>
 </div>
 </div>
 )}
 <CardHeader className="space-y-1">
 <div className="flex items-center justify-center mb-4">
 <div className="p-3 bg-primary/10 rounded-full">
 <Mail className="h-10 w-10 text-primary" aria-hidden="true" />
 </div>
 </div>
 <CardTitle className="text-2xl text-center">
 Esqueceu sua senha?
 </CardTitle>
 <CardDescription className="text-center">
 Digite seu email para receber instrucoes de recuperacao
 </CardDescription>
 </CardHeader>
 <form onSubmit={handleSubmit(onSubmit)}>
 <CardContent className="space-y-4">
 <FormField
 id="email"
 label="Email"
 required
 hint="Use o email cadastrado na sua conta"
 error={errors.email?.message}
 >
 <Input
 id="email"
 type="email"
 placeholder="seu@email.com"
 {...register('email')}
 aria-invalid={errors.email ? 'true' : 'false'}
 aria-describedby={errors.email ? 'email-error' : 'email-hint'}
 />
 </FormField>
 </CardContent>
 <CardFooter className="flex flex-col space-y-4">
 <Button type="submit" className="w-full" disabled={isLoading}>
 {isLoading ? (
 <>
 <Loader2 className="mr-2 h-4 w-4 animate-spin" />
 Enviando...
 </>
 ) : (
 <>
 <Mail className="mr-2 h-4 w-4" />
 Enviar instrucoes
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
