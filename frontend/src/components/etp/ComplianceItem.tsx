import { AlertTriangle, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { CompliancePriority } from '@/types/compliance';

/**
 * Props for the ComplianceItem component.
 */
interface ComplianceItemProps {
  /** Requirement name/description */
  requirement: string;
  /** Suggestion for fixing the issue */
  fixSuggestion: string;
  /** Priority level (high, medium, low) */
  priority: CompliancePriority;
  /** Callback when user clicks to fix */
  onFix?: () => void;
  /** Whether the fix button is disabled */
  disabled?: boolean;
}

/**
 * Displays a single compliance issue with fix suggestion.
 *
 * Used by ComplianceScorecard to show failed items.
 *
 * Issue #1386 - [TCU-1163e] Componente indicador de conformidade no ETP Editor
 */
export function ComplianceItem({
  requirement,
  fixSuggestion,
  priority,
  onFix,
  disabled = false,
}: ComplianceItemProps) {
  const priorityStyles = {
    high: 'border-red-200 bg-red-50',
    medium: 'border-yellow-200 bg-yellow-50',
    low: 'border-gray-200 bg-gray-50',
  };

  const iconStyles = {
    high: 'text-red-500',
    medium: 'text-yellow-600',
    low: 'text-gray-500',
  };

  const priorityLabels = {
    high: 'Alta',
    medium: 'Media',
    low: 'Baixa',
  };

  return (
    <div
      className={cn(
        'flex items-start gap-3 p-3 border rounded-lg transition-colors',
        priorityStyles[priority],
      )}
      role="listitem"
    >
      <AlertTriangle
        className={cn('h-4 w-4 shrink-0 mt-0.5', iconStyles[priority])}
        aria-hidden="true"
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="font-medium text-sm text-gray-900 truncate">
            {requirement}
          </p>
          <span
            className={cn(
              'text-xs px-1.5 py-0.5 rounded shrink-0',
              priority === 'high'
                ? 'bg-red-100 text-red-700'
                : priority === 'medium'
                  ? 'bg-yellow-100 text-yellow-700'
                  : 'bg-gray-100 text-gray-600',
            )}
          >
            {priorityLabels[priority]}
          </span>
        </div>
        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
          {fixSuggestion}
        </p>
      </div>
      {onFix && (
        <Button
          size="sm"
          variant="ghost"
          onClick={onFix}
          disabled={disabled}
          className="shrink-0"
          aria-label={`Corrigir: ${requirement}`}
        >
          <span className="sr-only">Corrigir</span>
          <ArrowRight className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}
