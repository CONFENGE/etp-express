import { memo } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Save, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router';
import {
  AutoSaveIndicator,
  type AutoSaveIndicatorProps,
} from '@/components/etp/AutoSaveIndicator';
import {
  TermoReferenciaStatus,
  TR_STATUS_LABELS,
  TR_STATUS_COLORS,
} from '@/types/termo-referencia';

/**
 * Header component for TR Editor.
 *
 * Displays TR title, status badge, save button, and auto-save indicator.
 * Follows the same pattern as ETPEditorHeader for consistency.
 *
 * @see Issue #1251 - [TR-d] Implementar editor de TR no frontend
 */

interface TREditorHeaderProps {
  /** ETP title for context display */
  etpTitle: string;
  /** Current TR status */
  status: TermoReferenciaStatus;
  /** Version number */
  versao: number;
  /** Save handler */
  onSave: () => void;
  /** Whether save is in progress */
  isSaving?: boolean;
  /** Whether there are unsaved changes */
  isDirty?: boolean;
  /** Auto-save state for visual indicator */
  autoSave?: Omit<AutoSaveIndicatorProps, 'className'>;
  /** Back navigation path (default: /etps) */
  backPath?: string;
}

export const TREditorHeader = memo(function TREditorHeader({
  etpTitle,
  status,
  versao,
  onSave,
  isSaving = false,
  isDirty = false,
  autoSave,
  backPath,
}: TREditorHeaderProps) {
  const navigate = useNavigate();

  const handleBack = () => {
    if (backPath) {
      navigate(backPath);
    } else {
      navigate(-1);
    }
  };

  const displayTitle = etpTitle?.trim() || 'TR sem titulo';
  const statusLabel = TR_STATUS_LABELS[status];
  const statusColor = TR_STATUS_COLORS[status];

  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleBack}
          data-testid="back-button"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar
        </Button>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold" data-testid="tr-title">
              Termo de Referencia
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
            <Badge className={statusColor} data-testid="status-badge">
              {statusLabel}
            </Badge>
            <Badge variant="outline" data-testid="version-badge">
              v{versao}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground" data-testid="etp-origin">
            Origem: {displayTitle}
          </p>
        </div>
      </div>
      <div className="flex gap-2">
        <Button
          size="sm"
          onClick={onSave}
          disabled={isSaving}
          data-testid="save-button"
        >
          <Save className="mr-2 h-4 w-4" />
          {isSaving ? 'Salvando...' : 'Salvar'}
        </Button>

        {/* Auto-save indicator */}
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
});
