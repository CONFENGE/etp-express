import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CreateDomainUserDto } from '@/store/managerStore';

interface CreateUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: CreateDomainUserDto) => Promise<void>;
  domainSuffix: string;
  quotaAvailable: number;
}

/**
 * Dialog for creating a new domain user.
 * Uses Zod validation for email (same domain) and name.
 *
 * Design: Apple Human Interface Guidelines
 * - Clean form layout with clear labels
 * - Inline validation messages
 * - Loading state feedback
 *
 * @security
 * - Email must match domain suffix
 * - Only accessible to users with role: domain_manager
 */
export function CreateUserDialog({
  open,
  onOpenChange,
  onSubmit,
  domainSuffix,
  quotaAvailable,
}: CreateUserDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const createUserSchema = z.object({
    email: z
      .string()
      .email('Digite um endereço de e-mail válido')
      .refine(
        (email) => email.endsWith(`@${domainSuffix}`),
        `O e-mail deve ser do domínio @${domainSuffix}`,
      ),
    name: z
      .string()
      .min(2, 'O nome deve ter pelo menos 2 caracteres')
      .max(100, 'O nome deve ter no máximo 100 caracteres'),
    cargo: z
      .string()
      .max(100, 'O cargo deve ter no máximo 100 caracteres')
      .optional(),
  });

  type CreateUserFormData = z.infer<typeof createUserSchema>;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateUserFormData>({
    resolver: zodResolver(createUserSchema),
    defaultValues: {
      email: '',
      name: '',
      cargo: '',
    },
  });

  useEffect(() => {
    if (!open) {
      reset();
    }
  }, [open, reset]);

  const handleFormSubmit = async (data: CreateUserFormData) => {
    setIsSubmitting(true);
    try {
      await onSubmit({
        email: data.email,
        name: data.name,
        cargo: data.cargo || undefined,
      });
      reset();
      onOpenChange(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      reset();
    }
    onOpenChange(newOpen);
  };

  const isQuotaExhausted = quotaAvailable <= 0;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Criar Usuário</DialogTitle>
          <DialogDescription>
            Adicione um novo usuário ao seu domínio. Ele receberá um e-mail com
            instruções para configurar sua conta.
          </DialogDescription>
        </DialogHeader>
        {isQuotaExhausted ? (
          <div className="py-6 text-center">
            <p className="text-sm text-destructive">
              Você atingiu a cota de usuários do seu domínio.
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              Entre em contato com o administrador para aumentar a cota.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome Completo</Label>
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
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder={`user@${domainSuffix}`}
                {...register('email')}
                aria-describedby={errors.email ? 'email-error' : 'email-hint'}
              />
              {errors.email ? (
                <p id="email-error" className="text-sm text-destructive">
                  {errors.email.message}
                </p>
              ) : (
                <p id="email-hint" className="text-xs text-muted-foreground">
                  Deve ser um e-mail do domínio @{domainSuffix}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="cargo">Cargo (opcional)</Label>
              <Input
                id="cargo"
                placeholder="Engenheiro de Software"
                {...register('cargo')}
                aria-describedby={errors.cargo ? 'cargo-error' : undefined}
              />
              {errors.cargo && (
                <p id="cargo-error" className="text-sm text-destructive">
                  {errors.cargo.message}
                </p>
              )}
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => handleOpenChange(false)}
                disabled={isSubmitting}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Criando...' : 'Criar Usuário'}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
