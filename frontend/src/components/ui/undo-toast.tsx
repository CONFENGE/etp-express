import * as React from 'react';
import { Undo2, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { UndoToastState } from '@/hooks/useUndoToast';

interface UndoToastProps {
  /** Toast state containing message and countdown */
  toast: UndoToastState;
  /** Handler for undo button click */
  onUndo: (id: string) => void;
  /** Handler for dismiss (X) button click */
  onDismiss: (id: string) => void;
  /** Whether the toast is being processed (undo/confirm in progress) */
  isProcessing?: boolean;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Individual undo toast notification with countdown timer and progress bar.
 * Provides visual feedback for destructive actions with an undo option.
 */
export const UndoToast = React.forwardRef<HTMLDivElement, UndoToastProps>(
  ({ toast, onUndo, onDismiss, isProcessing = false, className }, ref) => {
    const progressPercent = (toast.countdown / toast.totalDuration) * 100;

    // Determine urgency level for visual feedback
    const isUrgent = toast.countdown <= 2;

    return (
      <div
        ref={ref}
        role="alert"
        aria-live="polite"
        aria-atomic="true"
        className={cn(
          'relative overflow-hidden rounded-lg shadow-apple-lg',
          'bg-foreground text-background',
          'animate-slide-in-up',
          // Subtle shake when urgent
          isUrgent && 'animate-pulse',
          className,
        )}
        // Respect reduced motion preference
        style={{
          animationDuration: 'var(--duration-apple-slow)',
        }}
      >
        {/* Progress bar */}
        <div
          className="absolute bottom-0 left-0 h-1 bg-primary/80 transition-all duration-1000 ease-linear"
          style={{ width: `${progressPercent}%` }}
          aria-hidden="true"
        />

        <div className="flex items-center gap-3 px-4 py-3">
          {/* Message */}
          <span className="flex-1 text-sm font-medium">{toast.message}</span>

          {/* Countdown */}
          <span
            className={cn(
              'text-sm tabular-nums transition-colors',
              isUrgent
                ? 'text-destructive-foreground font-semibold'
                : 'opacity-70',
            )}
            aria-label={`${toast.countdown} segundos restantes`}
          >
            {toast.countdown}s
          </span>

          {/* Undo button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onUndo(toast.id)}
            disabled={isProcessing}
            className={cn(
              'h-8 px-3 text-sm font-medium',
              'text-primary-foreground hover:bg-white/20',
              'focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-0',
              isProcessing && 'opacity-50 cursor-not-allowed',
            )}
            aria-label="Desfazer ação"
          >
            <Undo2 className="mr-1.5 h-4 w-4" aria-hidden="true" />
            Desfazer
          </Button>

          {/* Dismiss button */}
          <button
            type="button"
            onClick={() => onDismiss(toast.id)}
            disabled={isProcessing}
            className={cn(
              'rounded-md p-1.5 opacity-70 transition-opacity',
              'hover:opacity-100 focus-visible:opacity-100',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50',
              isProcessing && 'opacity-30 cursor-not-allowed',
            )}
            aria-label="Fechar notificação"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </div>
    );
  },
);

UndoToast.displayName = 'UndoToast';

interface UndoToastContainerProps {
  /** Array of active undo toasts */
  toasts: UndoToastState[];
  /** Handler for undo button click */
  onUndo: (id: string) => void;
  /** Handler for dismiss button click */
  onDismiss: (id: string) => void;
  /** Whether any toast is being processed */
  isProcessing?: boolean;
  /** Additional CSS classes for the container */
  className?: string;
}

/**
 * Container component for rendering multiple stacked undo toasts.
 * Positioned fixed at the bottom-right of the viewport.
 */
export function UndoToastContainer({
  toasts,
  onUndo,
  onDismiss,
  isProcessing = false,
  className,
}: UndoToastContainerProps) {
  if (toasts.length === 0) return null;

  return (
    <div
      className={cn(
        'fixed bottom-4 right-4 z-[100]',
        'flex flex-col gap-2',
        'max-w-md w-full sm:w-auto',
        // Ensure minimum touch target size for mobile
        'min-w-[280px]',
        className,
      )}
      role="region"
      aria-label="Notificações de desfazer"
    >
      {toasts.map((toast) => (
        <UndoToast
          key={toast.id}
          toast={toast}
          onUndo={onUndo}
          onDismiss={onDismiss}
          isProcessing={isProcessing}
        />
      ))}
    </div>
  );
}

export default UndoToastContainer;
