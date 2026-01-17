import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useETPs } from '@/hooks/useETPs';
import { useToast } from '@/hooks/useToast';
import { useOnboardingTasks } from '@/hooks/useOnboardingTasks';
import { CreateETPWizard } from './wizard';
import {
  ETPWizardFormData,
  transformWizardDataToPayload,
} from '@/schemas/etpWizardSchema';

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

  const handleSubmit = useCallback(
    async (data: ETPWizardFormData) => {
      setIsLoading(true);
      try {
        // Transform wizard data to API format (Issue #1530 - flat → nested)
        const etpData = transformWizardDataToPayload(data);

        const etp = await createETP(etpData);
        markETPCreated();
        success('ETP criado com sucesso!');
        onOpenChange(false);
        navigate(`/etps/${etp.id}`);
      } catch (err: unknown) {
        // Extract detailed error message from API response
        const errorMessage =
          (err as { message?: string })?.message ||
          'Erro ao criar ETP. Tente novamente.';
        error(errorMessage);
      } finally {
        setIsLoading(false);
      }
    },
    [createETP, markETPCreated, success, error, onOpenChange, navigate],
  );

  const handleCancel = useCallback(() => {
    onOpenChange(false);
  }, [onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle>Criar Novo ETP</DialogTitle>
          <DialogDescription>
            Preencha as informações do Estudo Técnico Preliminar
          </DialogDescription>
        </DialogHeader>

        <CreateETPWizard
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          isLoading={isLoading}
        />
      </DialogContent>
    </Dialog>
  );
}
