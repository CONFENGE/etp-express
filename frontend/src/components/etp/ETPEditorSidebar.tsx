import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface Section {
  id: string;
  title: string;
  completed: boolean;
}

interface ETPEditorSidebarProps {
  sections: Section[];
  onGenerateAll: () => void;
  isGenerating: boolean;
  isGenerateAllDisabled?: boolean;
}

export function ETPEditorSidebar({
  sections,
  onGenerateAll,
  isGenerating,
  isGenerateAllDisabled = true,
}: ETPEditorSidebarProps) {
  const completedCount = sections.filter((s) => s.completed).length;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Geração IA</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="text-sm text-muted-foreground">
            {completedCount}/{sections.length} seções geradas
          </div>
          <div className="relative">
            <Button
              onClick={onGenerateAll}
              disabled={isGenerating || isGenerateAllDisabled}
              className="w-full"
              variant={isGenerateAllDisabled ? 'outline' : 'default'}
              title={
                isGenerateAllDisabled
                  ? 'Funcionalidade em desenvolvimento'
                  : undefined
              }
            >
              {isGenerating ? 'Gerando...' : 'Gerar Todas Seções'}
            </Button>
            {isGenerateAllDisabled && (
              <span className="absolute -top-2 -right-2 bg-amber-500 text-white text-xs px-2 py-0.5 rounded-full font-medium">
                Em breve
              </span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
