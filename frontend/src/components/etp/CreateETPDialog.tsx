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
import { ETPWizardFormData } from '@/schemas/etpWizardSchema';

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
        // Transform wizard data to API format
        const etpData = {
          title: data.title,
          description: data.description || undefined,
          objeto: data.objeto,
          status: 'draft' as const,
          progress: 0,
          // Identification fields
          orgaoEntidade: data.orgaoEntidade || undefined,
          uasg: data.uasg || undefined,
          unidadeDemandante: data.unidadeDemandante || undefined,
          responsavelTecnico: data.responsavelTecnicoNome
            ? {
                nome: data.responsavelTecnicoNome,
                matricula: data.responsavelTecnicoMatricula || undefined,
              }
            : undefined,
          dataElaboracao: data.dataElaboracao || undefined,
          // Object and Justification fields
          descricaoDetalhada: data.descricaoDetalhada || undefined,
          quantidadeEstimada: data.quantidadeEstimada || undefined,
          unidadeMedida: data.unidadeMedida || undefined,
          justificativaContratacao: data.justificativaContratacao || undefined,
          necessidadeAtendida: data.necessidadeAtendida || undefined,
          beneficiosEsperados: data.beneficiosEsperados || undefined,
          // Requirements fields
          requisitosTecnicos: data.requisitosTecnicos || undefined,
          requisitosQualificacao: data.requisitosQualificacao || undefined,
          criteriosSustentabilidade:
            data.criteriosSustentabilidade || undefined,
          garantiaExigida: data.garantiaExigida || undefined,
          prazoExecucao: data.prazoExecucao || undefined,
          // Cost fields
          valorUnitario: data.valorUnitario || undefined,
          valorEstimado: data.valorEstimado || undefined,
          fontePesquisaPrecos: data.fontePesquisaPrecos || undefined,
          dotacaoOrcamentaria: data.dotacaoOrcamentaria || undefined,
          // Risk fields
          nivelRisco: data.nivelRisco || undefined,
          descricaoRiscos: data.descricaoRiscos || undefined,
        };

        const etp = await createETP(etpData);
        markETPCreated();
        success('ETP criado com sucesso!');
        onOpenChange(false);
        navigate(`/etps/${etp.id}`);
      } catch {
        error('Erro ao criar ETP. Tente novamente.');
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
            Preencha as informacoes do Estudo Tecnico Preliminar
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
