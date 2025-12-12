import { Check, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ValidationState } from '@/hooks/useRealtimeValidation';

interface ValidationIconProps {
  state: ValidationState;
  className?: string;
}

/**
 * Animated validation icon for form fields.
 * Shows checkmark for valid, alert circle for invalid.
 */
export function ValidationIcon({ state, className }: ValidationIconProps) {
  if (state === 'idle') {
    return null;
  }

  return (
    <span
      className={cn(
        'absolute right-3 top-1/2 -translate-y-1/2 animate-scale-in',
        className,
      )}
      aria-hidden="true"
    >
      {state === 'valid' ? (
        <Check
          className="h-5 w-5 text-apple-green"
          data-testid="validation-check"
        />
      ) : (
        <AlertCircle
          className="h-5 w-5 text-apple-red"
          data-testid="validation-alert"
        />
      )}
    </span>
  );
}
