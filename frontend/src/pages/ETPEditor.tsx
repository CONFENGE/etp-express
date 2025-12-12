import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams } from 'react-router-dom';
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
import { ETPEditorProgress } from '@/components/etp/ETPEditorProgress';
import { ETPEditorTabsList } from '@/components/etp/ETPEditorTabsList';
import { ETPEditorContent } from '@/components/etp/ETPEditorContent';
import { ETPEditorSidebar } from '@/components/etp/ETPEditorSidebar';
import { useETPStore } from '@/store/etpStore';
import { logger } from '@/lib/logger';
import { DemoConversionBanner } from '@/components/demo/DemoConversionBanner';
import { useDemoConversion } from '@/hooks/useDemoConversion';
import { useUnsavedChangesWarning } from '@/hooks/useUnsavedChangesWarning';
import { UnsavedChangesDialog } from '@/components/common/UnsavedChangesDialog';
import { useConfetti } from '@/hooks/useConfetti';

export function ETPEditor() {
  const { id } = useParams<{ id: string }>();
  const { currentETP, fetchETP, updateETP, isLoading } = useETPs();
  const { success, error } = useToast();
  const [activeSection, setActiveSection] = useState(1);
  const [content, setContent] = useState('');
  const [sectionTemplates, setSectionTemplates] = useState<SectionTemplate[]>(
    [],
  );
  const [templatesLoading, setTemplatesLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

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
    if (id) {
      fetchETP(id);
      // Reset confetti cooldown when loading new ETP (#597)
      resetCooldown();
    }
  }, [id, fetchETP, resetCooldown]);

  useEffect(() => {
    if (currentETP) {
      const section = currentETP.sections.find(
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
      success('Parabéns! Seu ETP está 100% completo! 🎉');

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

    setIsSaving(true);
    try {
      await updateETP(id, {
        sections: currentETP.sections.map((s) =>
          s.sectionNumber === activeSection ? { ...s, content } : s,
        ),
      });
      // Reset dirty state after successful save (#610)
      setLastSavedContent(content);
      success('Seção salva com sucesso!');
    } catch {
      error('Erro ao salvar seção');
    } finally {
      setIsSaving(false);
    }
  }, [currentETP, id, updateETP, activeSection, content, success, error]);

  const handleGenerateAll = async () => {
    // Generate all sections sequentially
    // For MVP, show message that this is still in development
    success('Funcionalidade em desenvolvimento');
  };

  const handleGenerateSection = async (sectionNumber: number) => {
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
  };

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

  // Transformar templates em formato para TabsList e Content
  const sectionsForTabs = sectionTemplates.map((template) => ({
    id: String(template.number),
    title: String(template.number),
    completed: false, // TODO: calcular baseado em currentETP.sections
  }));

  const sectionsForContent = sectionTemplates.map((template) => ({
    number: template.number,
    title: template.title,
    description: template.description,
    content: content,
    isRequired: template.isRequired,
  }));

  const sectionsForSidebar = sectionTemplates.map((template) => ({
    id: String(template.number),
    title: template.title,
    completed: false, // TODO: calcular baseado em currentETP.sections
  }));

  // Handle PDF export with demo conversion trigger (#475) and AbortController (#603)
  const handleExportPDF = async () => {
    if (!id) return;

    // Cancel any previous export operation
    if (exportAbortControllerRef.current) {
      exportAbortControllerRef.current.abort();
    }

    exportAbortControllerRef.current = new AbortController();
    const { signal } = exportAbortControllerRef.current;

    setIsExporting(true);
    try {
      const { exportPDF } = useETPStore.getState();
      const blob = await exportPDF(id, { signal });

      // Check if request was aborted before proceeding
      if (signal.aborted) return;

      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${currentETP.title || 'ETP'}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

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
      setIsExporting(false);
      exportAbortControllerRef.current = null;
    }
  };

  // Handle DOCX export (#551) with AbortController (#603)
  const handleExportDocx = async () => {
    if (!id) return;

    // Cancel any previous export operation
    if (exportAbortControllerRef.current) {
      exportAbortControllerRef.current.abort();
    }

    exportAbortControllerRef.current = new AbortController();
    const { signal } = exportAbortControllerRef.current;

    setIsExporting(true);
    try {
      const { exportDocx } = useETPStore.getState();
      const blob = await exportDocx(id, { signal });

      // Check if request was aborted before proceeding
      if (signal.aborted) return;

      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${currentETP.title || 'ETP'}.docx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

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
      setIsExporting(false);
      exportAbortControllerRef.current = null;
    }
  };

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
          isSaving={isSaving}
          isExporting={isExporting}
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
    </MainLayout>
  );
}
