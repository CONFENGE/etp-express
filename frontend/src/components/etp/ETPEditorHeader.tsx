import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Save, Download, Eye, FileText, FileIcon } from 'lucide-react';

interface ETPEditorHeaderProps {
  etpTitle: string;
  etpDescription?: string;
  onSave: () => void;
  onExportPDF?: () => void;
  onExportDocx?: () => void;
  isSaving?: boolean;
  isExporting?: boolean;
}

export function ETPEditorHeader({
  etpTitle,
  etpDescription,
  onSave,
  onExportPDF,
  onExportDocx,
  isSaving = false,
  isExporting = false,
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
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" disabled={isExporting}>
              <Download className="mr-2 h-4 w-4" />
              {isExporting ? 'Exportando...' : 'Exportar'}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onExportPDF} disabled={isExporting}>
              <FileText className="mr-2 h-4 w-4" />
              PDF (.pdf)
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onExportDocx} disabled={isExporting}>
              <FileIcon className="mr-2 h-4 w-4" />
              Word (.docx)
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <Button size="sm" onClick={onSave} disabled={isSaving}>
          <Save className="mr-2 h-4 w-4" />
          {isSaving ? 'Salvando...' : 'Salvar'}
        </Button>
      </div>
    </div>
  );
}
