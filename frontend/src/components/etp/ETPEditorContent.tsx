import { TabsContent } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Sparkles, Loader2 } from 'lucide-react';
import { GenerationStatus } from '@/types/etp';
import { getStatusMessage } from '@/lib/polling';

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
}

export function ETPEditorContent({
  sections,
  currentContent,
  onContentChange,
  onGenerateSection,
  isGenerating = false,
  generationProgress = 0,
  generationStatus = 'idle',
}: ETPEditorContentProps) {
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
                      Gerar com IA
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

            <div className="space-y-4">
              <div>
                <Label>Conteúdo</Label>
                <Textarea
                  value={currentContent}
                  onChange={(e) => onContentChange(e.target.value)}
                  placeholder={`Digite o conteúdo da seção ${section.title}...`}
                  className="min-h-[300px] mt-2"
                  disabled={isGenerating}
                />
              </div>
            </div>
          </div>
        </TabsContent>
      ))}
    </>
  );
}
