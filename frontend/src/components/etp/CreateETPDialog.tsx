import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate } from 'react-router';
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
import { Textarea } from '@/components/ui/textarea';
import { useETPs } from '@/hooks/useETPs';
import { useToast } from '@/hooks/useToast';
import { useFormProgress } from '@/hooks/useFormProgress';
import { useOnboardingTasks } from '@/hooks/useOnboardingTasks';
import { FormField } from '@/components/form/FormField';
import { FormProgressBar } from '@/components/form/FormProgressBar';

const TITLE_MIN_LENGTH = 5;
const TITLE_MAX_LENGTH = 200;
const DESCRIPTION_MAX_LENGTH = 1000;

const etpSchema = z.object({
  title: z
    .string()
    .min(
      TITLE_MIN_LENGTH,
      `O título deve ter no mínimo ${TITLE_MIN_LENGTH} caracteres`,
    )
    .max(
      TITLE_MAX_LENGTH,
      `O título deve ter no máximo ${TITLE_MAX_LENGTH} caracteres`,
    ),
  description: z
    .string()
    .max(
      DESCRIPTION_MAX_LENGTH,
      `A descrição deve ter no máximo ${DESCRIPTION_MAX_LENGTH} caracteres`,
    )
    .optional()
    .or(z.literal('')),
});

type ETPFormData = z.infer<typeof etpSchema>;

interface CreateETPDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateETPDialog({ open, onOpenChange }: CreateETPDialogProps) {
  const navigate = useNavigate();
  const { createETP } = useETPs();
  const { success, error } = useToast();
  const { markETPCreated } = useOnboardingTasks();
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, touchedFields, isValid },
    reset,
    watch,
  } = useForm<ETPFormData>({
    resolver: zodResolver(etpSchema),
    mode: 'onBlur', // Validate on blur for real-time feedback
    reValidateMode: 'onChange', // Re-validate on change after first blur
    defaultValues: {
      title: '',
      description: '',
    },
  });

  // Track form progress
  const { progress, filledFields, totalFields } = useFormProgress({
    watch,
    errors,
    fieldNames: ['title', 'description'],
    requiredFields: ['title'],
  });

  // Watch values for character counting
  const titleValue = watch('title') || '';
  const descriptionValue = watch('description') || '';

  const onSubmit = async (data: ETPFormData) => {
    setIsLoading(true);
    try {
      const etp = await createETP({
        title: data.title,
        description: data.description,
        status: 'draft',
        progress: 0,
      });
      markETPCreated();
      success('ETP criado com sucesso!');
      reset();
      onOpenChange(false);
      navigate(`/etps/${etp.id}`);
    } catch {
      error('Erro ao criar ETP. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle dialog close with reset
  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      reset();
    }
    onOpenChange(isOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Criar Novo ETP</DialogTitle>
          <DialogDescription>
            Crie um novo Estudo Técnico Preliminar
          </DialogDescription>
        </DialogHeader>

        {/* Progress bar */}
        <FormProgressBar
          progress={progress}
          filledFields={filledFields}
          totalFields={totalFields}
          showCompletionMessage={false}
          className="pt-2"
        />

        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="space-y-4 py-4">
            {/* Title field with real-time validation */}
            <FormField
              label="Título"
              name="title"
              required
              error={errors.title?.message}
              isValid={
                !errors.title &&
                touchedFields.title &&
                titleValue.length >= TITLE_MIN_LENGTH
              }
              charCount={{
                current: titleValue.length,
                max: TITLE_MAX_LENGTH,
              }}
              helpText="Título descritivo do Estudo Técnico Preliminar"
            >
              <Input
                id="title"
                placeholder="Ex: Contratação de Serviços de TI"
                {...register('title')}
              />
            </FormField>

            {/* Description field with character count */}
            <FormField
              label="Descrição"
              name="description"
              error={errors.description?.message}
              isValid={
                !errors.description &&
                touchedFields.description &&
                descriptionValue.length > 0
              }
              charCount={{
                current: descriptionValue.length,
                max: DESCRIPTION_MAX_LENGTH,
              }}
              helpText="Descrição breve do ETP (opcional)"
            >
              <Textarea
                id="description"
                placeholder="Descrição breve do ETP..."
                rows={3}
                {...register('description')}
              />
            </FormField>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={isLoading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading || !isValid}>
              {isLoading ? 'Criando...' : 'Criar ETP'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
