import { Button } from '@/components/ui/button';
import { Save, Download, Eye } from 'lucide-react';

interface ETPEditorHeaderProps {
  etpTitle: string;
  etpDescription?: string;
  onSave: () => void;
  onExportPDF?: () => void;
  isSaving?: boolean;
}

export function ETPEditorHeader({
  etpTitle,
  etpDescription,
  onSave,
  onExportPDF,
  isSaving = false,
}: ETPEditorHeaderProps) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-3xl font-bold">{etpTitle}</h1>
        {etpDescription && (
          <p className="text-muted-foreground">{etpDescription}</p>
        )}
      </div>
      <div className="flex gap-2">
        <Button variant="outline" size="sm">
          <Eye className="mr-2 h-4 w-4" />
          Visualizar
        </Button>
        <Button variant="outline" size="sm" onClick={onExportPDF}>
          <Download className="mr-2 h-4 w-4" />
          Exportar
        </Button>
        <Button size="sm" onClick={onSave} disabled={isSaving}>
          <Save className="mr-2 h-4 w-4" />
          {isSaving ? 'Salvando...' : 'Salvar'}
        </Button>
      </div>
    </div>
  );
}
