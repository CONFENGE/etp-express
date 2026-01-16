import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
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
import {
  AutoSaveIndicator,
  type AutoSaveIndicatorProps,
} from './AutoSaveIndicator';
import { ComplianceAlertBadge } from './ComplianceAlertBadge';

// Re-export type for backwards compatibility (type-only exports are allowed)
export type { ExportState } from './export-types';

interface ETPEditorHeaderProps {
  etpTitle: string;
  etpDescription?: string;
  onSave: () => void;
  onExportPDF?: () => void;
  onExportDocx?: () => void;
  onCancelExport?: () => void;
  /**
   * Preview PDF before export (#1214)
   */
  onPreview?: () => void;
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
  /**
   * Auto-save state for visual indicator (#1169)
   */
  autoSave?: Omit<AutoSaveIndicatorProps, 'className'>;
  /**
   * Compliance alert counts for header badge (#1266)
   */
  complianceAlerts?: {
    count: number;
    countByPriority: {
      high: number;
      medium: number;
      low: number;
    };
    isValidating: boolean;
  };
}

export function ETPEditorHeader({
  etpTitle,
  etpDescription,
  onSave,
  onExportPDF,
  onExportDocx,
  onCancelExport,
  onPreview,
  isSaving = false,
  isExporting = false,
  exportState,
  isDirty = false,
  autoSave,
  complianceAlerts,
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

  // Fallback title when etpTitle is empty or undefined (#1317)
  const displayTitle = etpTitle?.trim() || 'ETP sem titulo';

  return (
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-3xl font-bold" data-testid="etp-title">
          {displayTitle}
          {isDirty && (
            <span
              className="ml-2 text-amber-500"
              title="Alteracoes nao salvas"
              aria-label="Alteracoes nao salvas"
              data-testid="unsaved-indicator"
            >
              *
            </span>
          )}
        </h1>
        {etpDescription && (
          <p className="text-muted-foreground" data-testid="etp-description">
            {etpDescription}
          </p>
        )}
        {/* Compliance Alert Badge (#1266) */}
        {complianceAlerts && (
          <ComplianceAlertBadge
            count={complianceAlerts.count}
            countByPriority={complianceAlerts.countByPriority}
            isValidating={complianceAlerts.isValidating}
            className="mt-2"
          />
        )}
      </div>
      <div className="flex gap-2">
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
              <Button
                variant="outline"
                size="sm"
                disabled={effectiveExporting}
                data-testid="export-menu-trigger"
              >
                <Download className="mr-2 h-4 w-4" />
                {effectiveExporting ? 'Exportando...' : 'Exportar'}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {/* Preview option (#1214) */}
              <DropdownMenuItem
                onClick={onPreview}
                disabled={effectiveExporting}
                data-testid="preview-button"
              >
                <Eye className="mr-2 h-4 w-4" />
                Preview
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={onExportPDF}
                disabled={effectiveExporting}
                data-testid="export-pdf-button"
              >
                <FileText className="mr-2 h-4 w-4" />
                PDF (.pdf)
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={onExportDocx}
                disabled={effectiveExporting}
                data-testid="export-docx-button"
              >
                <FileIcon className="mr-2 h-4 w-4" />
                Word (.docx)
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        <Button
          size="sm"
          onClick={onSave}
          disabled={isSaving}
          data-testid="save-button"
        >
          <Save className="mr-2 h-4 w-4" />
          {isSaving ? 'Salvando...' : 'Salvar'}
        </Button>

        {/* Auto-save indicator (#1169) */}
        {autoSave && (
          <AutoSaveIndicator
            status={autoSave.status}
            lastSavedAt={autoSave.lastSavedAt}
            isOnline={autoSave.isOnline}
            onRetry={autoSave.onRetry}
          />
        )}
      </div>
    </div>
  );
}
