import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { useParams } from 'react-router';
import { MainLayout } from '@/components/layout/MainLayout';
import { Breadcrumb } from '@/components/ui/breadcrumb';
import { Tabs } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
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
import { SimilarContractsPanel } from '@/components/search/SimilarContractsPanel';
import { useETPStore } from '@/store/etpStore';
import { logger } from '@/lib/logger';
import { DemoConversionBanner } from '@/components/demo/DemoConversionBanner';
import { useDemoConversion } from '@/hooks/useDemoConversion';
import { useUnsavedChangesWarning } from '@/hooks/useUnsavedChangesWarning';
import { UnsavedChangesDialog } from '@/components/common/UnsavedChangesDialog';
import { useConfetti } from '@/hooks/useConfetti';

export function ETPEditor() {
  const { id } = useParams<{ id: string }>();
  const { currentETP, fetchETP, isLoading } = useETPs();
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

  // Async generation state from store (#222)
  const {
    aiGenerating,
    generationProgress,
    generationStatus,
    generateSection: storeGenerateSection,
    cancelGeneration,
    dataSourceStatus,
    // Similar contracts (#1048)
    similarContracts,
    similarContractsLoading,
    fetchSimilarContracts,
    clearSimilarContracts,
  } = useETPStore();

  // Demo user conversion banner (#475)
  const { showBanner, triggerBanner, dismissBanner, isDemoUser } =
    useDemoConversion();

  // Confetti celebration for ETP completion (#597)
  const { celebrate, resetCooldown } = useConfetti();

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
    // Guard against the literal string "undefined" which can occur
    // when navigation happens before route params are ready (#1103)
    if (id && id !== 'undefined') {
      fetchETP(id);
      // Reset confetti cooldown when loading new ETP (#597)
      resetCooldown();
      // Clear similar contracts when loading new ETP (#1048)
      clearSimilarContracts();
    }
  }, [id, fetchETP, resetCooldown, clearSimilarContracts]);

  // Fetch similar contracts when ETP loads (#1048)
  useEffect(() => {
    if (currentETP?.description || currentETP?.title) {
      // Use description or title as search query
      const searchQuery = currentETP.description || currentETP.title || '';
      if (searchQuery.length >= 10) {
        fetchSimilarContracts(searchQuery);
      }
    }
  }, [
    currentETP?.id,
    currentETP?.description,
    currentETP?.title,
    fetchSimilarContracts,
  ]);

  useEffect(() => {
    if (currentETP) {
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

    // Find the current section to get its ID (#1046)
    const section = currentETP.sections?.find(
      (s) => s.sectionNumber === activeSection,
    );
    if (!section?.id) {
      error('Seção não encontrada');
      return;
    }

    setIsSaving(true);
    try {
      // Use PATCH /sections/:id endpoint instead of updateETP with sections array
      // The backend UpdateEtpDto doesn't accept 'sections' field (#1046)
      const { updateSection } = useETPStore.getState();
      await updateSection(id, section.id, { content });

      // Reset dirty state after successful save (#610)
      setLastSavedContent(content);
      success('Seção salva com sucesso!');
    } catch {
      error('Erro ao salvar seção');
    } finally {
      setIsSaving(false);
    }
  }, [currentETP, id, activeSection, content, success, error]);

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

          // Trigger demo conversion banner after successful AI generation (#475)
          triggerBanner('ai_generation');
        }
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Erro ao gerar seção';
        error(message);
      }
    },
    [id, storeGenerateSection, success, triggerBanner, error],
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
  const sectionsForTabs = useMemo(
    () =>
      sectionTemplates.map((template) => ({
        id: String(template.number),
        title: String(template.number),
        completed: false, // TODO: calcular baseado em currentETP.sections
      })),
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

      const blob = await exportPDF(id, { signal });

      clearInterval(progressInterval);

      // Check if request was aborted before proceeding
      if (signal.aborted) return;

      // Update progress: downloading (80-100%)
      setExportState((s) => ({ ...s, progress: 90, stage: 'downloading' }));

      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${currentETP.title || 'ETP'}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      setExportState((s) => ({ ...s, progress: 100 }));

      success('PDF exportado com sucesso!');

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
  }, [id, currentETP, success, triggerBanner, error]);

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

      const blob = await exportDocx(id, { signal });

      clearInterval(progressInterval);

      // Check if request was aborted before proceeding
      if (signal.aborted) return;

      // Update progress: downloading (80-100%)
      setExportState((s) => ({ ...s, progress: 90, stage: 'downloading' }));

      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${currentETP.title || 'ETP'}.docx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      setExportState((s) => ({ ...s, progress: 100 }));

      success('DOCX exportado com sucesso!');

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
  }, [id, currentETP, success, triggerBanner, error]);

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
          isSaving={isSaving}
          exportState={exportState}
          isDirty={isDirty}
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

            {/* Similar contracts panel (#1048) */}
            {similarContractsLoading ? (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">
                    Contratações Similares
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-5/6" />
                </CardContent>
              </Card>
            ) : (
              <SimilarContractsPanel contracts={similarContracts} />
            )}
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
    </MainLayout>
  );
}
