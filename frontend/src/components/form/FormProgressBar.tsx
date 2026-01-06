import { cn } from '@/lib/utils';
import { CheckCircle2 } from 'lucide-react';

export interface FormProgressBarProps {
  /** Progress percentage (0-100) */
  progress: number;
  /** Number of filled fields */
  filledFields: number;
  /** Total number of fields */
  totalFields: number;
  /** Additional className */
  className?: string;
  /** Whether to show field count */
  showFieldCount?: boolean;
  /** Whether to show completion message */
  showCompletionMessage?: boolean;
}

/**
 * FormProgressBar component showing form completion progress.
 *
 * Features:
 * - Visual progress bar with color transitions (red → yellow → green)
 * - Optional field count display
 * - Completion celebration state
 * - Smooth animations
 * - ARIA live region for screen readers
 *
 * @example
 * ```tsx
 * const { progress, filledFields, totalFields } = useFormProgress(formState);
 *
 * <FormProgressBar
 *   progress={progress}
 *   filledFields={filledFields}
 *   totalFields={totalFields}
 * />
 * ```
 */
export function FormProgressBar({
  progress,
  filledFields,
  totalFields,
  className,
  showFieldCount = true,
  showCompletionMessage = true,
}: FormProgressBarProps) {
  // Clamp progress between 0 and 100
  const clampedProgress = Math.min(100, Math.max(0, progress));

  // Determine color based on progress
  const getProgressColor = () => {
    if (clampedProgress === 100) return 'bg-green-500';
    if (clampedProgress >= 75) return 'bg-green-400';
    if (clampedProgress >= 50) return 'bg-yellow-400';
    if (clampedProgress >= 25) return 'bg-yellow-500';
    return 'bg-orange-400';
  };

  const isComplete = clampedProgress === 100;

  return (
    <div
      className={cn('space-y-2', className)}
      role="progressbar"
      aria-valuenow={clampedProgress}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={`Progresso do formulário: ${Math.round(clampedProgress)}%`}
    >
      {/* Header with percentage and field count */}
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              'font-medium tabular-nums transition-colors',
              isComplete
                ? 'text-green-600 dark:text-green-500'
                : 'text-foreground',
            )}
          >
            {Math.round(clampedProgress)}%
          </span>
          {isComplete && (
            <CheckCircle2
              className="h-4 w-4 text-green-600 dark:text-green-500 animate-in zoom-in-50"
              aria-hidden="true"
            />
          )}
        </div>

        {showFieldCount && (
          <span className="text-xs text-muted-foreground">
            {filledFields} de {totalFields} campos preenchidos
          </span>
        )}
      </div>

      {/* Progress bar */}
      <div className="relative h-2 overflow-hidden rounded-full bg-secondary">
        <div
          className={cn(
            'h-full transition-all duration-300 ease-out rounded-full',
            getProgressColor(),
          )}
          style={{ width: `${clampedProgress}%` }}
        />
      </div>

      {/* Completion message */}
      {showCompletionMessage && isComplete && (
        <p
          className="text-xs text-green-600 dark:text-green-500 animate-in fade-in-0 slide-in-from-bottom-1"
          aria-live="polite"
        >
          Formulário completo! Revise os dados antes de salvar.
        </p>
      )}
    </div>
  );
}
