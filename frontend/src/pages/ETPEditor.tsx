import { useEffect, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
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

  // Async generation state from store (#222)
  const {
    aiGenerating,
    generationProgress,
    generationStatus,
    generateSection: storeGenerateSection,
  } = useETPStore();

  // Demo user conversion banner (#475)
  const { showBanner, triggerBanner, dismissBanner, isDemoUser } =
    useDemoConversion();

  // Track previous progress to detect ETP completion
  const previousProgressRef = useRef<number | null>(null);

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
    }
  }, [id, fetchETP]);

  useEffect(() => {
    if (currentETP) {
      const section = currentETP.sections.find(
        (s) => s.sectionNumber === activeSection,
      );
      setContent(section?.content || '');
    }
  }, [currentETP, activeSection]);

  // Trigger demo conversion banner when ETP reaches 100% completion (#475)
  useEffect(() => {
    if (!currentETP || !isDemoUser) return;

    const currentProgress = currentETP.progress;
    const previousProgress = previousProgressRef.current;

    // Detect when progress reaches 100% (completion)
    if (
      previousProgress !== null &&
      previousProgress < 100 &&
      currentProgress === 100
    ) {
      triggerBanner('etp_completion');
    }

    previousProgressRef.current = currentProgress;
  }, [currentETP?.progress, isDemoUser, triggerBanner, currentETP]);

  const handleSave = async () => {
    if (!currentETP || !id) return;

    setIsSaving(true);
    try {
      await updateETP(id, {
        sections: currentETP.sections.map((s) =>
          s.sectionNumber === activeSection ? { ...s, content } : s,
        ),
      });
      success('Seção salva com sucesso!');
    } catch {
      error('Erro ao salvar seção');
    } finally {
      setIsSaving(false);
    }
  };

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

  // Handle PDF export with demo conversion trigger (#475)
  const handleExportPDF = async () => {
    if (!id) return;

    try {
      const { exportPDF } = useETPStore.getState();
      const blob = await exportPDF(id);

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
      const message =
        err instanceof Error ? err.message : 'Erro ao exportar PDF';
      error(message);
    }
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        <ETPEditorHeader
          etpTitle={currentETP.title}
          etpDescription={currentETP.description}
          onSave={handleSave}
          onExportPDF={handleExportPDF}
          isSaving={isSaving}
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
    </MainLayout>
  );
}
