import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Copy, CheckCircle2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CreateDemoUserDto, DemoUserWithPassword } from '@/store/adminStore';

const createDemoUserSchema = z.object({
  email: z
    .string()
    .min(1, 'Email é obrigatório')
    .email('Por favor insira um email válido')
    .max(255, 'Email deve ter no máximo 255 caracteres'),
  name: z
    .string()
    .min(3, 'Nome deve ter no mínimo 3 caracteres')
    .max(100, 'Nome deve ter no máximo 100 caracteres'),
  etpLimitCount: z
    .number()
    .min(1, 'Mínimo 1 ETP permitido')
    .max(100, 'Máximo 100 ETPs permitidos')
    .optional(),
});

type CreateDemoUserFormData = z.infer<typeof createDemoUserSchema>;

interface CreateDemoUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: CreateDemoUserDto) => Promise<void>;
  createdUser: DemoUserWithPassword | null;
  onCreatedUserClose: () => void;
}

/**
 * Dialog for creating a new demo user account.
 * Uses Zod validation for email format and ETP limit.
 *
 * Shows generated password ONCE only after creation.
 * Password cannot be retrieved later - user must copy it immediately.
 *
 * @security Only accessible to users with role: system_admin
 * Part of Demo User Management System (Issue #1445)
 */
export function CreateDemoUserDialog({
  open,
  onOpenChange,
  onSubmit,
  createdUser,
  onCreatedUserClose,
}: CreateDemoUserDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [passwordCopied, setPasswordCopied] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateDemoUserFormData>({
    resolver: zodResolver(createDemoUserSchema),
    defaultValues: {
      email: '',
      name: '',
      etpLimitCount: 3,
    },
  });

  const handleFormSubmit = async (data: CreateDemoUserFormData) => {
    setIsSubmitting(true);
    try {
      await onSubmit(data);
      reset();
      // Dialog stays open to show password
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      reset();
      setPasswordCopied(false);
      onCreatedUserClose();
    }
    onOpenChange(newOpen);
  };

  const handleCopyPassword = async () => {
    if (createdUser?.generatedPassword) {
      try {
        await navigator.clipboard.writeText(createdUser.generatedPassword);
        setPasswordCopied(true);
        setTimeout(() => setPasswordCopied(false), 3000);
      } catch (error) {
        console.error('Failed to copy password:', error);
      }
    }
  };

  // Show password dialog after creation
  if (createdUser) {
    return (
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Conta Demo Criada com Sucesso</DialogTitle>
            <DialogDescription>
              A senha é exibida apenas UMA VEZ. Copie-a agora e compartilhe com
              o usuário.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Alert variant="warning" className="border-amber-500 bg-amber-50">
              <AlertTitle className="text-amber-900 font-semibold">
                ⚠️ Atenção: Senha Única
              </AlertTitle>
              <AlertDescription className="text-amber-800">
                Esta senha não poderá ser recuperada. Certifique-se de copiá-la
                antes de fechar este diálogo.
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              <Label>Email</Label>
              <Input value={createdUser.email} disabled />
            </div>

            <div className="space-y-2">
              <Label>Nome</Label>
              <Input value={createdUser.name} disabled />
            </div>

            <div className="space-y-2">
              <Label>Senha Gerada</Label>
              <div className="flex gap-2">
                <Input
                  value={createdUser.generatedPassword}
                  disabled
                  className="font-mono"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={handleCopyPassword}
                  className={passwordCopied ? 'bg-green-50' : ''}
                  aria-label={passwordCopied ? 'Senha copiada' : 'Copiar senha'}
                >
                  {passwordCopied ? (
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
              {passwordCopied && (
                <p className="text-sm text-green-600">✓ Senha copiada!</p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Limite de ETPs</Label>
              <Input value={createdUser.etpLimitCount} disabled />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => handleOpenChange(false)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  // Show creation form
  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Criar Conta Demo</DialogTitle>
          <DialogDescription>
            Crie uma nova conta de teste com limite de ETPs. O sistema gerará
            uma senha automaticamente.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email *</Label>
            <Input
              id="email"
              type="email"
              placeholder="testador@example.com"
              {...register('email')}
              aria-describedby={errors.email ? 'email-error' : undefined}
            />
            {errors.email && (
              <p id="email-error" className="text-sm text-destructive">
                {errors.email.message}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="name">Nome Completo *</Label>
            <Input
              id="name"
              placeholder="João Silva"
              {...register('name')}
              aria-describedby={errors.name ? 'name-error' : undefined}
            />
            {errors.name && (
              <p id="name-error" className="text-sm text-destructive">
                {errors.name.message}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="etpLimitCount">Limite de ETPs</Label>
            <Input
              id="etpLimitCount"
              type="number"
              min={1}
              max={100}
              {...register('etpLimitCount', { valueAsNumber: true })}
              aria-describedby={
                errors.etpLimitCount ? 'etpLimitCount-error' : undefined
              }
            />
            {errors.etpLimitCount && (
              <p id="etpLimitCount-error" className="text-sm text-destructive">
                {errors.etpLimitCount.message}
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              Número máximo de ETPs que o usuário demo pode criar (padrão: 3)
            </p>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Criando...' : 'Criar Conta'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
