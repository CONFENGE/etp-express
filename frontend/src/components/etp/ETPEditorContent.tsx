import { memo, useCallback, ChangeEvent, useMemo } from 'react';
import { TabsContent } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Sparkles, Loader2 } from 'lucide-react';
import { GenerationStatus, DataSourceStatusInfo } from '@/types/etp';
import { getStatusMessage } from '@/lib/polling';
import { DataSourceStatus } from '@/components/common/DataSourceStatus';
import { SearchStatus, SourceStatus } from '@/types/search';

interface Section {
  number: number;
  title: string;
  description: string;
  content: string;
  isRequired: boolean;
}

interface ETPEditorContentProps {
  sections: Section[];
  currentContent: string;
  onContentChange: (content: string) => void;
  onGenerateSection?: (sectionNumber: number) => void;
  isGenerating?: boolean;
  generationProgress?: number;
  generationStatus?: GenerationStatus;
  /** Data source status from last generation (#756) */
  dataSourceStatus?: DataSourceStatusInfo | null;
  /** Callback when retry button is clicked */
  onRetryDataSource?: () => void;
}

// Memoized component to prevent unnecessary re-renders (#457)
export const ETPEditorContent = memo(function ETPEditorContent({
  sections,
  currentContent,
  onContentChange,
  onGenerateSection,
  isGenerating = false,
  generationProgress = 0,
  generationStatus = 'idle',
  dataSourceStatus,
  onRetryDataSource,
}: ETPEditorContentProps) {
  // Memoized handler to extract value from event (#457)
  const handleContentChange = useCallback(
    (e: ChangeEvent<HTMLTextAreaElement>) => {
      onContentChange(e.target.value);
    },
    [onContentChange],
  );

  // Convert DataSourceStatusInfo to DataSourceStatus component props (#756)
  const convertedDataSourceStatus = useMemo(() => {
    if (!dataSourceStatus) return null;

    // Map string status to SearchStatus enum
    const statusMap: Record<string, SearchStatus> = {
      SUCCESS: SearchStatus.SUCCESS,
      PARTIAL: SearchStatus.PARTIAL,
      SERVICE_UNAVAILABLE: SearchStatus.SERVICE_UNAVAILABLE,
      RATE_LIMITED: SearchStatus.RATE_LIMITED,
      TIMEOUT: SearchStatus.TIMEOUT,
    };

    const sources: SourceStatus[] = dataSourceStatus.sources.map((s) => ({
      name: s.name,
      status: statusMap[s.status] || SearchStatus.SERVICE_UNAVAILABLE,
      error: s.error,
      latencyMs: s.latencyMs,
      resultCount: s.resultCount,
    }));

    return {
      status:
        statusMap[dataSourceStatus.status] || SearchStatus.SERVICE_UNAVAILABLE,
      sources,
    };
  }, [dataSourceStatus]);

  // Show data source status only after generation completes and if not SUCCESS (#756)
  const shouldShowDataSourceStatus =
    generationStatus === 'completed' &&
    convertedDataSourceStatus &&
    convertedDataSourceStatus.status !== SearchStatus.SUCCESS;

  return (
    <>
      {sections.map((section) => (
        <TabsContent
          key={section.number}
          value={String(section.number)}
          className="space-y-4 mt-6"
        >
          <div>
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold">{section.title}</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {section.description}
                </p>
                {section.isRequired && (
                  <Badge variant="destructive" className="mt-2">
                    Obrigatória
                  </Badge>
                )}
              </div>
              {onGenerateSection && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onGenerateSection(section.number)}
                  disabled={isGenerating}
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Gerando...
                    </>
                  ) : (
                    <>
                      <Sparkles className="mr-2 h-4 w-4" />
                      Gerar Sugestao
                    </>
                  )}
                </Button>
              )}
            </div>

            {/* Progress indicator during generation */}
            {isGenerating && (
              <div className="mb-4 p-4 bg-muted rounded-lg space-y-3">
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  <span className="text-sm font-medium">
                    {getStatusMessage(generationStatus, generationProgress)}
                  </span>
                </div>
                <Progress value={generationProgress} className="h-2" />
                <p className="text-xs text-muted-foreground text-right">
                  {generationProgress}% concluído
                </p>
              </div>
            )}

            {/* Data source status alert after generation (#756) */}
            {shouldShowDataSourceStatus && convertedDataSourceStatus && (
              <DataSourceStatus
                status={convertedDataSourceStatus.status}
                sources={convertedDataSourceStatus.sources}
                onRetry={onRetryDataSource}
                className="mb-4"
              />
            )}

            <div className="space-y-4">
              <div>
                <Label>Conteúdo</Label>
                <Textarea
                  value={currentContent}
                  onChange={handleContentChange}
                  placeholder={`Digite o conteúdo da seção ${section.title}...`}
                  className="min-h-[300px] mt-2"
                  disabled={isGenerating}
                  data-testid="etp-content-textarea"
                />
              </div>
            </div>
          </div>
        </TabsContent>
      ))}
    </>
  );
});
