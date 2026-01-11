import { useEffect, useState, useCallback, useMemo } from 'react';
import { useParams } from 'react-router';
import { MainLayout } from '@/components/layout/MainLayout';
import { Breadcrumb } from '@/components/ui/breadcrumb';
import { Tabs } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useTR } from '@/hooks/useTR';
import { useToast } from '@/hooks/useToast';
import { useAutoSave } from '@/hooks/useAutoSave';
import { useUnsavedChangesWarning } from '@/hooks/useUnsavedChangesWarning';
import { LoadingState } from '@/components/common/LoadingState';
import { UnsavedChangesDialog } from '@/components/common/UnsavedChangesDialog';
import {
  TREditorHeader,
  TREditorProgress,
  TREditorTabsList,
  TREditorContent,
  TREditorSidebar,
} from '@/components/tr';
import {
  TermoReferencia,
  TR_SECTION_TEMPLATES,
  UpdateTermoReferenciaDto,
  calculateTRProgress,
} from '@/types/termo-referencia';
import { logger } from '@/lib/logger';

/**
 * Termo de Referencia Editor Page.
 *
 * Main page for editing a TR. Follows the same patterns as ETPEditor
 * for consistency in UX and code structure.
 *
 * Features:
 * - Tab-based section navigation
 * - Auto-save with 30s debounce
 * - Unsaved changes warning
 * - Progress tracking
 * - Status badge display
 *
 * @see Issue #1251 - [TR-d] Implementar editor de TR no frontend
 * @see Parent: #1247 - [TR] Modulo de Termo de Referencia - EPIC
 */
export function TermoReferenciaEditor() {
  const { id } = useParams<{ id: string }>();
  const { currentTR, fetchTR, updateTR, isLoading, error } = useTR();
  const { success, error: toastError } = useToast();

  // Local state for tracking field changes
  const [localTR, setLocalTR] = useState<TermoReferencia | null>(null);
  const [activeSection, setActiveSection] = useState(1);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSavedTR, setLastSavedTR] = useState<TermoReferencia | null>(null);

  // Calculate if there are unsaved changes
  const isDirty = useMemo(() => {
    if (!localTR || !lastSavedTR) return false;
    return JSON.stringify(localTR) !== JSON.stringify(lastSavedTR);
  }, [localTR, lastSavedTR]);

  // Unsaved changes warning
  const { isBlocking, proceed, reset } = useUnsavedChangesWarning({ isDirty });

  // Load TR on mount
  useEffect(() => {
    if (id) {
      fetchTR(id);
    }
  }, [id, fetchTR]);

  // Sync currentTR to local state when loaded
  useEffect(() => {
    if (currentTR) {
      setLocalTR(currentTR);
      setLastSavedTR(currentTR);
    }
  }, [currentTR]);

  // Handler for field changes
  const handleFieldChange = useCallback(
    (field: keyof TermoReferencia, value: string | number) => {
      setLocalTR((prev) => {
        if (!prev) return prev;
        return { ...prev, [field]: value };
      });
    },
    [],
  );

  // Save function for manual and auto-save
  const performSave = useCallback(async () => {
    if (!localTR || !id) return;

    const updateData: UpdateTermoReferenciaDto = {
      objeto: localTR.objeto,
      fundamentacaoLegal: localTR.fundamentacaoLegal,
      descricaoSolucao: localTR.descricaoSolucao,
      requisitosContratacao: localTR.requisitosContratacao,
      modeloExecucao: localTR.modeloExecucao,
      modeloGestao: localTR.modeloGestao,
      criteriosSelecao: localTR.criteriosSelecao,
      valorEstimado: localTR.valorEstimado,
      dotacaoOrcamentaria: localTR.dotacaoOrcamentaria,
      prazoVigencia: localTR.prazoVigencia,
      obrigacoesContratante: localTR.obrigacoesContratante,
      obrigacoesContratada: localTR.obrigacoesContratada,
      sancoesPenalidades: localTR.sancoesPenalidades,
      localExecucao: localTR.localExecucao,
      garantiaContratual: localTR.garantiaContratual,
      condicoesPagamento: localTR.condicoesPagamento,
      subcontratacao: localTR.subcontratacao,
    };

    await updateTR(id, updateData);
    setLastSavedTR(localTR);
  }, [localTR, id, updateTR]);

  // Auto-save setup
  const autoSave = useAutoSave(JSON.stringify(localTR), {
    delay: 30000, // 30 seconds
    enabled: Boolean(localTR && id && isDirty),
    onSave: performSave,
    onSuccess: () => {
      logger.info('Auto-save TR completed', { trId: id });
    },
    onError: (err) => {
      toastError('Erro no salvamento automatico');
      logger.error('Auto-save TR failed', { error: err, trId: id });
    },
  });

  // Manual save handler
  const handleSave = useCallback(async () => {
    if (!localTR || !id) return;

    setIsSaving(true);
    try {
      await performSave();
      success('Termo de Referencia salvo com sucesso!');
    } catch {
      toastError('Erro ao salvar Termo de Referencia');
    } finally {
      setIsSaving(false);
    }
  }, [localTR, id, performSave, success, toastError]);

  // Check if a section field is filled
  const isSectionFilled = useCallback(
    (field: keyof TermoReferencia): boolean => {
      if (!localTR) return false;
      const value = localTR[field];
      if (typeof value === 'string') return value.trim().length > 0;
      if (typeof value === 'number') return value > 0;
      return Boolean(value);
    },
    [localTR],
  );

  // Calculate progress
  const progress = useMemo(() => {
    if (!localTR) return 0;
    return calculateTRProgress(localTR);
  }, [localTR]);

  // Error state
  if (error) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <h2 className="text-xl font-semibold text-destructive">Erro</h2>
            <p className="text-muted-foreground mt-2">{error}</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  // Loading state
  if (isLoading || !localTR) {
    return (
      <MainLayout>
        <LoadingState message="Carregando Termo de Referencia..." />
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Breadcrumb Navigation */}
        <Breadcrumb
          items={[
            { label: 'ETPs', href: '/etps' },
            {
              label: localTR.etp?.title || 'ETP',
              href: `/etps/${localTR.etpId}`,
            },
            { label: 'Termo de Referencia' },
          ]}
        />

        {/* Header with status and actions */}
        <TREditorHeader
          etpTitle={localTR.etp?.title || 'ETP'}
          status={localTR.status}
          versao={localTR.versao}
          onSave={handleSave}
          isSaving={isSaving}
          isDirty={isDirty}
          autoSave={{
            status: autoSave.status,
            lastSavedAt: autoSave.lastSavedAt,
            isOnline: autoSave.isOnline,
            onRetry: autoSave.retry,
          }}
          backPath={`/etps/${localTR.etpId}`}
        />

        {/* Progress bar */}
        <TREditorProgress progress={progress} />

        {/* Main content area */}
        <div className="grid lg:grid-cols-4 gap-6">
          {/* Editor Card */}
          <Card className="lg:col-span-3">
            <CardHeader>
              <CardTitle>Secoes do Termo de Referencia</CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs
                value={String(activeSection)}
                onValueChange={(v) => setActiveSection(Number(v))}
              >
                <TREditorTabsList
                  sections={TR_SECTION_TEMPLATES}
                  isSectionFilled={isSectionFilled}
                />
                <TREditorContent
                  sections={TR_SECTION_TEMPLATES}
                  currentTR={localTR}
                  onFieldChange={handleFieldChange}
                />
              </Tabs>
            </CardContent>
          </Card>

          {/* Sidebar */}
          <TREditorSidebar
            sections={TR_SECTION_TEMPLATES}
            activeSection={activeSection}
            onSectionClick={setActiveSection}
            currentTR={localTR}
          />
        </div>
      </div>

      {/* Unsaved changes warning dialog */}
      <UnsavedChangesDialog
        open={isBlocking}
        onConfirm={proceed}
        onCancel={reset}
      />
    </MainLayout>
  );
}
