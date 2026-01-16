import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router';
import { MainLayout } from '@/components/layout/MainLayout';
import { Breadcrumb } from '@/components/ui/breadcrumb';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CreatePesquisaPrecosWizard } from '@/components/pesquisa/wizard';
import { usePesquisaPrecosStore } from '@/store/pesquisaPrecosStore';
import { useToast } from '@/hooks/useToast';
import { PesquisaPrecosFormData } from '@/schemas/pesquisaPrecosSchema';

/**
 * CreatePesquisaPrecosPage - Full-page wizard for creating price research
 *
 * This page provides the complete price research workflow using the
 * multi-step CreatePesquisaPrecosWizard component.
 *
 * @remarks
 * Route: /pesquisa-precos/new
 * This route MUST be defined before /pesquisa-precos/:id in the router
 * to avoid "new" being interpreted as a pesquisa ID.
 *
 * @see CreatePesquisaPrecosWizard for the wizard component
 * @see Issue #1506 - Create base structure
 */
export function CreatePesquisaPrecosPage() {
  const navigate = useNavigate();
  const { createPesquisa } = usePesquisaPrecosStore();
  const { success, error } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = useCallback(
    async (data: PesquisaPrecosFormData) => {
      setIsLoading(true);
      try {
        // Transform wizard data to API format
        const pesquisaData = {
          etpId:
            data.baseType === 'etp' ? (data.baseId ?? undefined) : undefined,
          trId: data.baseType === 'tr' ? (data.baseId ?? undefined) : undefined,
          items: data.items,
          sources: data.selectedSources,
        };

        const pesquisa = await createPesquisa(pesquisaData);
        success('Pesquisa de precos criada com sucesso!');
        navigate(`/pesquisa-precos/${pesquisa.id}`);
      } catch (err: unknown) {
        const errorMessage =
          (err as { message?: string })?.message ||
          'Erro ao criar pesquisa de precos. Tente novamente.';
        error(errorMessage);
      } finally {
        setIsLoading(false);
      }
    },
    [createPesquisa, success, error, navigate],
  );

  const handleCancel = useCallback(() => {
    navigate('/pesquisa-precos');
  }, [navigate]);

  return (
    <MainLayout>
      <div className="space-y-6">
        <Breadcrumb
          items={[
            { label: 'Pesquisa de Precos', href: '/pesquisa-precos' },
            { label: 'Nova Pesquisa' },
          ]}
        />

        <Card>
          <CardHeader>
            <CardTitle>Nova Pesquisa de Precos</CardTitle>
          </CardHeader>
          <CardContent>
            <CreatePesquisaPrecosWizard
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
