import { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { MainLayout } from '@/components/layout/MainLayout';
import { Breadcrumb } from '@/components/ui/breadcrumb';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CreateETPWizard } from '@/components/etp/wizard';
import { useETPs } from '@/hooks/useETPs';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/useToast';
import { useOnboardingTasks } from '@/hooks/useOnboardingTasks';
import {
  ETPWizardFormData,
  transformWizardDataToPayload,
} from '@/schemas/etpWizardSchema';

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
  const { user } = useAuth();
  const { createETP } = useETPs();
  const { success, error } = useToast();
  const { markETPCreated } = useOnboardingTasks();
  const [isLoading, setIsLoading] = useState(false);

  // Redirect blocked demo users to dashboard (#1446)
  useEffect(() => {
    if (user?.isDemoBlocked) {
      error('Limite de ETPs atingido. Você não pode criar novos ETPs.');
      navigate('/dashboard', { replace: true });
    }
  }, [user?.isDemoBlocked, navigate, error]);

  const handleSubmit = useCallback(
    async (data: ETPWizardFormData) => {
      setIsLoading(true);
      try {
        // Transform wizard data to API format (Issue #1530 - flat → nested)
        const etpData = transformWizardDataToPayload(data);

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
