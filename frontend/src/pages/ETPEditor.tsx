import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { useParams } from 'react-router';
import { MainLayout } from '@/components/layout/MainLayout';
import { Breadcrumb } from '@/components/ui/breadcrumb';
import { Tabs } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useETPs } from '@/hooks/useETPs';
import { useToast } from '@/hooks/useToast';
import { LoadingState } from '@/components/common/LoadingState';
import { type SectionTemplate } from '@/types/etp';
import { loadSectionTemplates } from '@/lib/section-templates';
import { ETPEditorHeader } from '@/components/etp/ETPEditorHeader';
import {
  type ExportState,
  initialExportState,
} from '@/components/etp/export-types';
import { ETPEditorProgress } from '@/components/etp/ETPEditorProgress';
import { ETPEditorTabsList } from '@/components/etp/ETPEditorTabsList';
import { ETPEditorContent } from '@/components/etp/ETPEditorContent';
import { ETPEditorSidebar } from '@/components/etp/ETPEditorSidebar';
import { VersionHistory } from '@/components/etp/VersionHistory';
import { ExportPreviewModal } from '@/components/etp/ExportPreviewModal';
import { useETPStore } from '@/store/etpStore';
import { logger } from '@/lib/logger';
import { DemoConversionBanner } from '@/components/demo/DemoConversionBanner';
import { useDemoConversion } from '@/hooks/useDemoConversion';
import { useUnsavedChangesWarning } from '@/hooks/useUnsavedChangesWarning';
import { UnsavedChangesDialog } from '@/components/common/UnsavedChangesDialog';
import { useConfetti } from '@/hooks/useConfetti';
import { useAutoSave } from '@/hooks/useAutoSave';
import { useETPPreview } from '@/hooks/useETPPreview';
import { useOnboardingTasks } from '@/hooks/useOnboardingTasks';

export function ETPEditor() {
  const { id } = useParams<{ id: string }>();
  const { currentETP, fetchETP, updateSection, isLoading } = useETPs();
  const { success, error } = useToast();
  const [activeSection, setActiveSection] = useState(1);
  const [content, setContent] = useState('');
  const [sectionTemplates, setSectionTemplates] = useState<SectionTemplate[]>(
    [],
  );
  const [templatesLoading, setTemplatesLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  // Export state with progress tracking (#612)
  const [exportState, setExportState] =
    useState<ExportState>(initialExportState);

  // Unsaved changes tracking (#610)
  const [lastSavedContent, setLastSavedContent] = useState<string>('');
  const isDirty = content !== lastSavedContent;
  const { isBlocking, proceed, reset } = useUnsavedChangesWarning({ isDirty });

  // Auto-save functionality (#1169)
  const performAutoSave = useCallback(async () => {
    if (!currentETP || !id) return;

    // Find the current section to get its ID (#1314)
    const currentSection = currentETP.sections?.find(
      (s) => s.sectionNumber === activeSection,
    );
    if (!currentSection?.id) return;

    await updateSection(id, currentSection.id, { content });
    setLastSavedContent(content);
  }, [currentETP, id, updateSection, activeSection, content]);

  const autoSave = useAutoSave(content, {
    delay: 30000, // 30 seconds as specified in issue
    enabled: Boolean(currentETP && id && isDirty),
    onSave: performAutoSave,
    onSuccess: () => {
      // Subtle notification for auto-save (not using toast to avoid interruption)
      logger.info('Auto-save completed', { etpId: id, section: activeSection });
    },
    onError: (err) => {
      error('Erro no salvamento automático');
      logger.error('Auto-save failed', { error: err, etpId: id });
    },
  });

  // Async generation state from store (#222)
  const {
    aiGenerating,
    generationProgress,
    generationStatus,
    generateSection: storeGenerateSection,
    cancelGeneration,
    dataSourceStatus,
  } = useETPStore();

  // Demo user conversion banner (#475)
  const { showBanner, triggerBanner, dismissBanner, isDemoUser } =
    useDemoConversion();

  // Confetti celebration for ETP completion (#597)
  const { celebrate, resetCooldown } = useConfetti();

  // Export preview modal (#1214)
  const preview = useETPPreview({ etpId: id || '' });

  // Onboarding task tracking (#1213)
  const { markSuggestionGenerated, markETPExported } = useOnboardingTasks();

  // Track previous progress to detect ETP completion
  const previousProgressRef = useRef<number | null>(null);

  // AbortController for export operations (#603)
  const exportAbortControllerRef = useRef<AbortController | null>(null);

  // Cleanup: abort export operations on unmount (#603)
  useEffect(() => {
    return () => {
      if (exportAbortControllerRef.current) {
        exportAbortControllerRef.current.abort();
      }
    };
  }, []);

  // Cleanup: cancel AI generation polling on unmount (#611)
  useEffect(() => {
    return () => {
      cancelGeneration();
    };
  }, [cancelGeneration]);

  useEffect(() => {
    const loadTemplates = async () => {
      try {
        const templates = await loadSectionTemplates();
        setSectionTemplates(templates);
      } catch (err) {
        error('Erro ao carregar templates de seções');
        logger.error('Failed to load section templates', err);
      } finally {
        setTemplatesLoading(false);
      }
    };

    loadTemplates();
  }, [error]);

  useEffect(() => {
    if (id) {
      fetchETP(id);
      // Reset confetti cooldown when loading new ETP (#597)
      resetCooldown();
    }
  }, [id, fetchETP, resetCooldown]);

  useEffect(() => {
    if (currentETP) {
      // Defensive coding: handle undefined sections array (#1194)
      const section = currentETP.sections?.find(
        (s) => s.sectionNumber === activeSection,
      );
      const sectionContent = section?.content || '';
      setContent(sectionContent);
      // Reset dirty state when loading new content (#610)
      setLastSavedContent(sectionContent);
    }
  }, [currentETP, activeSection]);

  // Trigger celebration and demo conversion banner when ETP reaches 100% completion (#475, #597)
  useEffect(() => {
    if (!currentETP) return;

    const currentProgress = currentETP.progress;
    const previousProgress = previousProgressRef.current;

    // Detect when progress reaches 100% (completion)
    if (
      previousProgress !== null &&
      previousProgress < 100 &&
      currentProgress === 100
    ) {
      // Confetti celebration for all users (#597)
      celebrate();

      // Success toast
      success('Parabéns! Seu ETP está 100% completo!');

      // Demo user conversion banner (#475)
      if (isDemoUser) {
        triggerBanner('etp_completion');
      }
    }

    previousProgressRef.current = currentProgress;
  }, [
    currentETP?.progress,
    isDemoUser,
    triggerBanner,
    currentETP,
    celebrate,
    success,
  ]);

  const handleSave = useCallback(async () => {
    if (!currentETP || !id) return;

    // Find the current section to get its ID (#1314)
    const currentSection = currentETP.sections?.find(
      (s) => s.sectionNumber === activeSection,
    );
    if (!currentSection?.id) {
      error('Seção não encontrada');
      return;
    }

    setIsSaving(true);
    try {
      // Use updateSection instead of updateETP to call PATCH /sections/:id (#1314)
      await updateSection(id, currentSection.id, { content });
      // Reset dirty state after successful save (#610)
      setLastSavedContent(content);
      success('Seção salva com sucesso!');
    } catch {
      error('Erro ao salvar seção');
    } finally {
      setIsSaving(false);
    }
  }, [currentETP, id, updateSection, activeSection, content, success, error]);

  const handleGenerateAll = useCallback(async () => {
    // Generate all sections sequentially
    // For MVP, show message that this is still in development
    success('Funcionalidade em desenvolvimento');
  }, [success]);

  const handleGenerateSection = useCallback(
    async (sectionNumber: number) => {
      if (!id) return;

      try {
        const result = await storeGenerateSection({
          etpId: id,
          sectionNumber,
        });

        if (result?.content) {
          setContent(result.content);
          success('Seção gerada com sucesso!');

          // Mark onboarding task as completed (#1213)
          markSuggestionGenerated();

          // Trigger demo conversion banner after successful AI generation (#475)
          triggerBanner('ai_generation');
        }
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Erro ao gerar seção';
        error(message);
      }
    },
    [
      id,
      storeGenerateSection,
      success,
      markSuggestionGenerated,
      triggerBanner,
      error,
    ],
  );

  // Handle cancel export (#612) - must be before early return
  const handleCancelExport = useCallback(() => {
    if (exportAbortControllerRef.current) {
      exportAbortControllerRef.current.abort();
      setExportState(initialExportState);
      success('Exportação cancelada');
    }
  }, [success]);

  // Memoized computed values for tabs, content, and sidebar (#457)
  // Fix: Show section title in tabs instead of just number (#1345)
  const sectionsForTabs = useMemo(
    () =>
      sectionTemplates.map((template) => {
        // Extract short title for tab display: "I - Necessidade da Contratação" → "I - Necessidade"
        // Split by " - " and take first two words of the second part
        const parts = template.title.split(' - ');
        const romanNumeral = parts[0] || String(template.number);
        const titlePart = parts[1] || '';
        // Take first word of title part for compact display
        const shortTitle = titlePart.split(' ')[0] || '';
        const tabTitle = shortTitle
          ? `${romanNumeral} - ${shortTitle}`
          : romanNumeral;

        return {
          id: String(template.number),
          title: tabTitle,
          fullTitle: template.title, // Full title for tooltip (#1345)
          completed: false, // TODO: calcular baseado em currentETP.sections
        };
      }),
    [sectionTemplates],
  );

  const sectionsForContent = useMemo(
    () =>
      sectionTemplates.map((template) => ({
        number: template.number,
        title: template.title,
        description: template.description,
        content: content,
        isRequired: template.isRequired,
      })),
    [sectionTemplates, content],
  );

  const sectionsForSidebar = useMemo(
    () =>
      sectionTemplates.map((template) => ({
        id: String(template.number),
        title: template.title,
        completed: false, // TODO: calcular baseado em currentETP.sections
      })),
    [sectionTemplates],
  );

  // Handle PDF export with demo conversion trigger (#475), AbortController (#603), and progress (#612)
  const handleExportPDF = useCallback(async () => {
    if (!id || !currentETP) return;

    // Cancel any previous export operation
    if (exportAbortControllerRef.current) {
      exportAbortControllerRef.current.abort();
    }

    exportAbortControllerRef.current = new AbortController();
    const { signal } = exportAbortControllerRef.current;

    // Start export with progress tracking (#612)
    setExportState({
      isExporting: true,
      progress: 0,
      stage: 'preparing',
      format: 'pdf',
    });

    try {
      // Update progress: preparing (0-10%)
      setExportState((s) => ({ ...s, progress: 10, stage: 'generating' }));

      const { exportPDF } = useETPStore.getState();

      // Simulate progress during generation (10-80%)
      const progressInterval = setInterval(() => {
        setExportState((s) => {
          if (s.progress < 80 && s.stage === 'generating') {
            return { ...s, progress: Math.min(s.progress + 10, 80) };
          }
          return s;
        });
      }, 500);

      const result = await exportPDF(id, { signal });

      clearInterval(progressInterval);

      // Check if request was aborted before proceeding
      if (signal.aborted) return;

      // Update progress: downloading (80-100%)
      setExportState((s) => ({ ...s, progress: 90, stage: 'downloading' }));

      // Create download link using filename from backend (#1154)
      const url = window.URL.createObjectURL(result.blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = result.filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      setExportState((s) => ({ ...s, progress: 100 }));

      success('PDF exportado com sucesso!');

      // Mark onboarding task as completed (#1213)
      markETPExported();

      // Trigger demo conversion banner after PDF export (#475)
      triggerBanner('pdf_export');
    } catch (err) {
      // Silently handle aborted requests (#603)
      if (
        err instanceof Error &&
        (err.name === 'AbortError' || err.name === 'CanceledError')
      ) {
        return;
      }
      const message =
        err instanceof Error ? err.message : 'Erro ao exportar PDF';
      error(message);
    } finally {
      setExportState(initialExportState);
      exportAbortControllerRef.current = null;
    }
  }, [id, currentETP, success, markETPExported, triggerBanner, error]);

  // Handle DOCX export (#551) with AbortController (#603) and progress (#612)
  const handleExportDocx = useCallback(async () => {
    if (!id || !currentETP) return;

    // Cancel any previous export operation
    if (exportAbortControllerRef.current) {
      exportAbortControllerRef.current.abort();
    }

    exportAbortControllerRef.current = new AbortController();
    const { signal } = exportAbortControllerRef.current;

    // Start export with progress tracking (#612)
    setExportState({
      isExporting: true,
      progress: 0,
      stage: 'preparing',
      format: 'docx',
    });

    try {
      // Update progress: preparing (0-10%)
      setExportState((s) => ({ ...s, progress: 10, stage: 'generating' }));

      const { exportDocx } = useETPStore.getState();

      // Simulate progress during generation (10-80%)
      const progressInterval = setInterval(() => {
        setExportState((s) => {
          if (s.progress < 80 && s.stage === 'generating') {
            return { ...s, progress: Math.min(s.progress + 10, 80) };
          }
          return s;
        });
      }, 500);

      const result = await exportDocx(id, { signal });

      clearInterval(progressInterval);

      // Check if request was aborted before proceeding
      if (signal.aborted) return;

      // Update progress: downloading (80-100%)
      setExportState((s) => ({ ...s, progress: 90, stage: 'downloading' }));

      // Create download link using filename from backend (#1154)
      const url = window.URL.createObjectURL(result.blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = result.filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      setExportState((s) => ({ ...s, progress: 100 }));

      success('DOCX exportado com sucesso!');

      // Mark onboarding task as completed (#1213)
      markETPExported();

      // Trigger demo conversion banner after export
      triggerBanner('pdf_export');
    } catch (err) {
      // Silently handle aborted requests (#603)
      if (
        err instanceof Error &&
        (err.name === 'AbortError' || err.name === 'CanceledError')
      ) {
        return;
      }
      const message =
        err instanceof Error ? err.message : 'Erro ao exportar DOCX';
      error(message);
    } finally {
      setExportState(initialExportState);
      exportAbortControllerRef.current = null;
    }
  }, [id, currentETP, success, markETPExported, triggerBanner, error]);

  // Early return for loading state - all hooks must be called before this
  if (isLoading || !currentETP || templatesLoading) {
    return (
      <MainLayout>
        <LoadingState
          message={
            templatesLoading ? 'Carregando templates...' : 'Carregando ETP...'
          }
        />
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
            { label: currentETP.title || 'Editor' },
          ]}
        />

        <ETPEditorHeader
          etpTitle={currentETP.title}
          etpDescription={currentETP.description}
          onSave={handleSave}
          onExportPDF={handleExportPDF}
          onExportDocx={handleExportDocx}
          onCancelExport={handleCancelExport}
          onPreview={preview.openPreview}
          isSaving={isSaving}
          exportState={exportState}
          isDirty={isDirty}
          autoSave={{
            status: autoSave.status,
            lastSavedAt: autoSave.lastSavedAt,
            isOnline: autoSave.isOnline,
            onRetry: autoSave.retry,
          }}
        />

        <ETPEditorProgress progress={currentETP.progress} />

        <div className="grid lg:grid-cols-4 gap-6">
          <Card className="lg:col-span-3">
            <CardHeader>
              <CardTitle>Seções do ETP</CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs
                value={String(activeSection)}
                onValueChange={(v) => setActiveSection(Number(v))}
              >
                <ETPEditorTabsList sections={sectionsForTabs} />
                <ETPEditorContent
                  sections={sectionsForContent}
                  currentContent={content}
                  onContentChange={setContent}
                  onGenerateSection={handleGenerateSection}
                  isGenerating={aiGenerating}
                  generationProgress={generationProgress}
                  generationStatus={generationStatus}
                  dataSourceStatus={dataSourceStatus}
                  onRetryDataSource={() => handleGenerateSection(activeSection)}
                />
              </Tabs>
            </CardContent>
          </Card>

          <div className="space-y-4">
            <ETPEditorSidebar
              sections={sectionsForSidebar}
              onGenerateAll={handleGenerateAll}
              isGenerating={aiGenerating}
            />

            {/* Version History (#1162) */}
            {id && (
              <VersionHistory
                etpId={id}
                currentVersion={currentETP.currentVersion}
                onVersionRestored={() => id && fetchETP(id)}
              />
            )}

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">
                  Contratações Similares
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">
                  Nenhuma contratação similar encontrada ainda.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Demo conversion CTA banner (#475) */}
      {showBanner && <DemoConversionBanner onClose={dismissBanner} />}

      {/* Unsaved changes warning dialog (#610) */}
      <UnsavedChangesDialog
        open={isBlocking}
        onConfirm={proceed}
        onCancel={reset}
      />

      {/* Export preview modal (#1214) */}
      <ExportPreviewModal
        open={preview.isOpen}
        onOpenChange={(open) => !open && preview.closePreview()}
        pdfBlob={preview.pdfBlob}
        isLoading={preview.isLoading}
        error={preview.error}
        onRetry={preview.retry}
        onDownload={handleExportPDF}
      />
    </MainLayout>
  );
}
