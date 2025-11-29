import { TabsContent } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sparkles } from 'lucide-react';

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
}

export function ETPEditorContent({
  sections,
  currentContent,
  onContentChange,
  onGenerateSection,
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
                >
                  <Sparkles className="mr-2 h-4 w-4" />
                  Gerar com IA
                </Button>
              )}
            </div>

            <div className="space-y-4">
              <div>
                <Label>Conteúdo</Label>
                <Textarea
                  value={currentContent}
                  onChange={(e) => onContentChange(e.target.value)}
                  placeholder={`Digite o conteúdo da seção ${section.title}...`}
                  className="min-h-[300px] mt-2"
                />
              </div>
            </div>
          </div>
        </TabsContent>
      ))}
    </>
  );
}
