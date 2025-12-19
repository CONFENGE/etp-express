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
}

export function ETPEditorSidebar({
 sections,
 onGenerateAll,
 isGenerating,
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
 <Button
 onClick={onGenerateAll}
 disabled={isGenerating}
 className="w-full"
 >
 {isGenerating ? 'Gerando...' : 'Gerar Todas Seções'}
 </Button>
 </div>
 </CardContent>
 </Card>
 );
}
