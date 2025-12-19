import * as React from 'react';
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
 <span className="text-destructive" aria-hidden="true">
 *
 </span>
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
 <p id={errorId} className="text-sm text-destructive" role="alert">
 {error}
 </p>
 )}
 </div>
 );
 },
);
FormField.displayName = 'FormField';

export { FormField };
export type { FormFieldProps };
