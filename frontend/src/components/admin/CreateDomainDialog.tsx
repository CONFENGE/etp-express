import { useState } from 'react';
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
import { CreateDomainDto } from '@/store/adminStore';

const createDomainSchema = z.object({
  domain: z
    .string()
    .min(3, 'O domínio deve ter pelo menos 3 caracteres')
    .max(253, 'O domínio deve ter no máximo 253 caracteres')
    .regex(
      /^[a-z0-9]+([-.][a-z0-9]+)*\.[a-z]{2,}$/i,
      'Digite um domínio válido (ex: exemplo.com.br)',
    ),
  institutionName: z
    .string()
    .min(3, 'O nome da instituição deve ter pelo menos 3 caracteres')
    .max(255, 'O nome da instituição deve ter no máximo 255 caracteres'),
  maxUsers: z
    .number()
    .min(1, 'Mínimo de 1 usuário')
    .max(1000, 'Máximo de 1000 usuários'),
});

type CreateDomainFormData = z.infer<typeof createDomainSchema>;

interface CreateDomainDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: CreateDomainDto) => Promise<void>;
}

/**
 * Dialog for creating a new authorized domain.
 * Uses Zod validation for domain format and max users.
 *
 * @security Only accessible to users with role: system_admin
 */
export function CreateDomainDialog({
  open,
  onOpenChange,
  onSubmit,
}: CreateDomainDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateDomainFormData>({
    resolver: zodResolver(createDomainSchema),
    defaultValues: {
      domain: '',
      institutionName: '',
      maxUsers: 10,
    },
  });

  const handleFormSubmit = async (data: CreateDomainFormData) => {
    setIsSubmitting(true);
    try {
      await onSubmit(data);
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

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Criar Domínio</DialogTitle>
          <DialogDescription>
            Adicione um novo domínio autorizado à plataforma. Usuários com
            endereços de e-mail deste domínio poderão se registrar.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="domain">Domínio</Label>
            <Input
              id="domain"
              placeholder="exemplo.com.br"
              {...register('domain')}
              aria-describedby={errors.domain ? 'domain-error' : undefined}
            />
            {errors.domain && (
              <p id="domain-error" className="text-sm text-destructive">
                {errors.domain.message}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="institutionName">Nome da Instituição</Label>
            <Input
              id="institutionName"
              placeholder="Prefeitura Municipal de Exemplo"
              {...register('institutionName')}
              aria-describedby={
                errors.institutionName ? 'institutionName-error' : undefined
              }
            />
            {errors.institutionName && (
              <p
                id="institutionName-error"
                className="text-sm text-destructive"
              >
                {errors.institutionName.message}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="maxUsers">Máximo de Usuários</Label>
            <Input
              id="maxUsers"
              type="number"
              min={1}
              max={1000}
              {...register('maxUsers', { valueAsNumber: true })}
              aria-describedby={errors.maxUsers ? 'maxUsers-error' : undefined}
            />
            {errors.maxUsers && (
              <p id="maxUsers-error" className="text-sm text-destructive">
                {errors.maxUsers.message}
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              Número máximo de usuários que podem se registrar com este domínio
            </p>
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
              {isSubmitting ? 'Criando...' : 'Criar Domínio'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
