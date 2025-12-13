import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Progress } from '@/components/ui/progress';
import {
  Save,
  Download,
  Eye,
  FileText,
  FileIcon,
  X,
  Loader2,
} from 'lucide-react';
import type { ExportState } from './export-types';

// Re-export type for backwards compatibility (type-only exports are allowed)
export type { ExportState } from './export-types';

interface ETPEditorHeaderProps {
  etpTitle: string;
  etpDescription?: string;
  onSave: () => void;
  onExportPDF?: () => void;
  onExportDocx?: () => void;
  onCancelExport?: () => void;
  isSaving?: boolean;
  /**
   * @deprecated Use exportState instead
   */
  isExporting?: boolean;
  /**
   * Export state with progress tracking (#612)
   */
  exportState?: ExportState;
  /**
   * Whether there are unsaved changes (#610)
   */
  isDirty?: boolean;
}

export function ETPEditorHeader({
  etpTitle,
  etpDescription,
  onSave,
  onExportPDF,
  onExportDocx,
  onCancelExport,
  isSaving = false,
  isExporting = false,
  exportState,
  isDirty = false,
}: ETPEditorHeaderProps) {
  // Use exportState if provided, otherwise fall back to legacy isExporting
  const effectiveExporting = exportState?.isExporting ?? isExporting;

  const getStageLabel = (
    stage: ExportState['stage'],
    format: 'pdf' | 'docx' | null,
  ): string => {
    const formatLabel = format === 'docx' ? 'DOCX' : 'PDF';
    switch (stage) {
      case 'preparing':
        return 'Preparando...';
      case 'generating':
        return `Gerando ${formatLabel}...`;
      case 'downloading':
        return 'Baixando...';
      default:
        return 'Exportando...';
    }
  };

  return (
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-3xl font-bold">
          {etpTitle}
          {isDirty && (
            <span
              className="ml-2 text-amber-500"
              title="Alterações não salvas"
              aria-label="Alterações não salvas"
            >
              *
            </span>
          )}
        </h1>
        {etpDescription && (
          <p className="text-muted-foreground">{etpDescription}</p>
        )}
      </div>
      <div className="flex gap-2">
        <Button variant="outline" size="sm">
          <Eye className="mr-2 h-4 w-4" />
          Visualizar
        </Button>

        {/* Export Progress UI (#612) */}
        {exportState?.isExporting ? (
          <div className="flex items-center gap-3 min-w-[200px]">
            <div className="flex-1 space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  {getStageLabel(exportState.stage, exportState.format)}
                </span>
                <span className="text-muted-foreground">
                  {exportState.progress}%
                </span>
              </div>
              <Progress value={exportState.progress} className="h-2" />
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onCancelExport}
              className="h-8 w-8 p-0"
              title="Cancelar exportação"
              aria-label="Cancelar exportação"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" disabled={effectiveExporting}>
                <Download className="mr-2 h-4 w-4" />
                {effectiveExporting ? 'Exportando...' : 'Exportar'}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={onExportPDF}
                disabled={effectiveExporting}
              >
                <FileText className="mr-2 h-4 w-4" />
                PDF (.pdf)
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={onExportDocx}
                disabled={effectiveExporting}
              >
                <FileIcon className="mr-2 h-4 w-4" />
                Word (.docx)
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        <Button size="sm" onClick={onSave} disabled={isSaving}>
          <Save className="mr-2 h-4 w-4" />
          {isSaving ? 'Salvando...' : 'Salvar'}
        </Button>
      </div>
    </div>
  );
}
