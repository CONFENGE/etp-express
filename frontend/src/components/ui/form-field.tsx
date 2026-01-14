import * as React from 'react';
import { AlertCircle } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

interface FormFieldProps {
  id: string;
  label: string;
  required?: boolean;
  hint?: string;
  error?: string;
  children: React.ReactNode;
  className?: string;
}

/**
 * FormField component for consistent form field layout with required indicators and helper text.
 * Supports accessibility via aria-describedby linking hint/error text to form controls.
 */
const FormField = React.forwardRef<HTMLDivElement, FormFieldProps>(
  ({ id, label, required = false, hint, error, children, className }, ref) => {
    const hintId = `${id}-hint`;
    const errorId = `${id}-error`;

    return (
      <div ref={ref} className={cn('space-y-2', className)}>
        <Label htmlFor={id} className="flex items-center gap-1">
          {label}
          {required && (
            <>
              <span className="text-destructive" aria-hidden="true">
                *
              </span>
              <span className="sr-only">(obrigatório)</span>
            </>
          )}
        </Label>
        {React.Children.map(children, (child) => {
          if (React.isValidElement(child)) {
            const describedBy = error ? errorId : hint ? hintId : undefined;
            return React.cloneElement(child as React.ReactElement, {
              'aria-describedby': describedBy,
            });
          }
          return child;
        })}
        {hint && !error && (
          <p id={hintId} className="text-xs text-muted-foreground">
            {hint}
          </p>
        )}
        {error && (
          <p id={errorId} className="error-message text-sm text-destructive flex items-center gap-1" role="alert">
            <AlertCircle className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
            <span>{error}</span>
          </p>
        )}
      </div>
    );
  },
);
FormField.displayName = 'FormField';

export { FormField };
export type { FormFieldProps };
