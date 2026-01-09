import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router';
import { MainLayout } from '@/components/layout/MainLayout';
import { Breadcrumb } from '@/components/ui/breadcrumb';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CreateETPWizard } from '@/components/etp/wizard';
import { useETPs } from '@/hooks/useETPs';
import { useToast } from '@/hooks/useToast';
import { useOnboardingTasks } from '@/hooks/useOnboardingTasks';
import { ETPWizardFormData } from '@/schemas/etpWizardSchema';

/**
 * CreateETPPage - Full-page wizard for creating new ETPs
 *
 * This page provides the complete ETP creation workflow using the
 * multi-step CreateETPWizard component. Unlike the modal-based
 * CreateETPDialog, this gives users more screen real estate for
 * filling out the comprehensive ETP form.
 *
 * @remarks
 * Route: /etps/new
 * This route MUST be defined before /etps/:id in the router to avoid
 * "new" being interpreted as an ETP ID.
 *
 * @see CreateETPWizard for the wizard component
 * @see CreateETPDialog for the modal-based alternative
 */
export function CreateETPPage() {
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
          // Note: status and progress are automatically set by the backend
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
    [createETP, markETPCreated, success, error, navigate],
  );

  const handleCancel = useCallback(() => {
    navigate('/etps');
  }, [navigate]);

  return (
    <MainLayout>
      <div className="space-y-6">
        <Breadcrumb
          items={[{ label: 'ETPs', href: '/etps' }, { label: 'Novo ETP' }]}
        />

        <Card>
          <CardHeader>
            <CardTitle>Criar Novo ETP</CardTitle>
          </CardHeader>
          <CardContent>
            <CreateETPWizard
              onSubmit={handleSubmit}
              onCancel={handleCancel}
              isLoading={isLoading}
            />
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
