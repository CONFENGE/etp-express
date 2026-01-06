import * as React from 'react';
import { CheckCircle2, AlertCircle, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Label } from '@/components/ui/label';

export type FormFieldStatus = 'idle' | 'valid' | 'error' | 'warning';

export interface FormFieldProps {
  /** Field label text */
  label: string;
  /** Field name for aria-describedby linking */
  name: string;
  /** Error message to display */
  error?: string;
  /** Warning message to display */
  warning?: string;
  /** Whether field has been validated as correct */
  isValid?: boolean;
  /** Whether field is required */
  required?: boolean;
  /** Character count configuration */
  charCount?: {
    current: number;
    max: number;
  };
  /** Help text to display below the field */
  helpText?: string;
  /** Additional className for the wrapper */
  className?: string;
  /** Field input element */
  children: React.ReactNode;
}

/**
 * FormField component providing visual feedback states for form inputs.
 *
 * Features:
 * - Visual states: idle (neutral), valid (green), error (red), warning (yellow)
 * - ARIA labels for accessibility (aria-invalid, aria-describedby)
 * - Character counter for text fields
 * - Required field indicator
 *
 * @example
 * ```tsx
 * <FormField
 *   label="Título"
 *   name="title"
 *   required
 *   error={errors.title?.message}
 *   isValid={!errors.title && touchedFields.title}
 * >
 *   <Input {...register('title')} />
 * </FormField>
 * ```
 */
export function FormField({
  label,
  name,
  error,
  warning,
  isValid,
  required,
  charCount,
  helpText,
  className,
  children,
}: FormFieldProps) {
  // Determine field status
  const status: FormFieldStatus = error
    ? 'error'
    : warning
      ? 'warning'
      : isValid
        ? 'valid'
        : 'idle';

  // Generate unique IDs for ARIA
  const errorId = `${name}-error`;
  const helpTextId = `${name}-help`;

  // Character count styling
  const charCountPercentage = charCount
    ? (charCount.current / charCount.max) * 100
    : 0;
  const isNearLimit = charCountPercentage >= 80;
  const isOverLimit = charCountPercentage > 100;

  return (
    <div className={cn('space-y-2', className)}>
      {/* Label with required indicator */}
      <div className="flex items-center justify-between">
        <Label
          htmlFor={name}
          className={cn(
            'text-sm font-medium',
            status === 'error' && 'text-destructive',
            status === 'valid' && 'text-green-600 dark:text-green-500',
          )}
        >
          {label}
          {required && (
            <span
              className="ml-1 text-destructive"
              aria-label="campo obrigatório"
            >
              *
            </span>
          )}
        </Label>

        {/* Status icon */}
        {status !== 'idle' && (
          <span className="flex items-center gap-1 text-xs">
            {status === 'valid' && (
              <CheckCircle2
                className="h-4 w-4 text-green-600 dark:text-green-500"
                aria-hidden="true"
              />
            )}
            {status === 'error' && (
              <AlertCircle
                className="h-4 w-4 text-destructive"
                aria-hidden="true"
              />
            )}
            {status === 'warning' && (
              <AlertTriangle
                className="h-4 w-4 text-yellow-600 dark:text-yellow-500"
                aria-hidden="true"
              />
            )}
          </span>
        )}
      </div>

      {/* Input wrapper with visual state borders */}
      <div
        className={cn(
          'relative rounded-md transition-all duration-150',
          status === 'error' &&
            '[&>input]:border-destructive [&>input]:focus-visible:ring-destructive [&>textarea]:border-destructive [&>textarea]:focus-visible:ring-destructive [&>select]:border-destructive',
          status === 'valid' &&
            '[&>input]:border-green-500 [&>input]:focus-visible:ring-green-500 [&>textarea]:border-green-500 [&>textarea]:focus-visible:ring-green-500 [&>select]:border-green-500',
          status === 'warning' &&
            '[&>input]:border-yellow-500 [&>input]:focus-visible:ring-yellow-500 [&>textarea]:border-yellow-500 [&>textarea]:focus-visible:ring-yellow-500 [&>select]:border-yellow-500',
        )}
      >
        {React.Children.map(children, (child) => {
          if (React.isValidElement(child)) {
            return React.cloneElement(
              child as React.ReactElement<{
                'aria-invalid'?: boolean;
                'aria-describedby'?: string;
              }>,
              {
                'aria-invalid': status === 'error' ? true : undefined,
                'aria-describedby':
                  [error ? errorId : null, helpText ? helpTextId : null]
                    .filter(Boolean)
                    .join(' ') || undefined,
              },
            );
          }
          return child;
        })}
      </div>

      {/* Messages and character count */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-h-[1.25rem]">
          {/* Error message */}
          {error && (
            <p
              id={errorId}
              className="text-xs text-destructive animate-in fade-in-0 slide-in-from-top-1"
              role="alert"
            >
              {error}
            </p>
          )}

          {/* Warning message */}
          {warning && !error && (
            <p
              className="text-xs text-yellow-600 dark:text-yellow-500 animate-in fade-in-0 slide-in-from-top-1"
              role="status"
            >
              {warning}
            </p>
          )}

          {/* Help text */}
          {helpText && !error && !warning && (
            <p id={helpTextId} className="text-xs text-muted-foreground">
              {helpText}
            </p>
          )}
        </div>

        {/* Character counter */}
        {charCount && (
          <span
            className={cn(
              'text-xs tabular-nums transition-colors',
              isOverLimit
                ? 'text-destructive font-medium'
                : isNearLimit
                  ? 'text-yellow-600 dark:text-yellow-500'
                  : 'text-muted-foreground',
            )}
            aria-live="polite"
            aria-atomic="true"
          >
            {charCount.current}/{charCount.max}
          </span>
        )}
      </div>
    </div>
  );
}
