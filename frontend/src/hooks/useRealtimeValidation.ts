import { useState, useCallback, useRef, useEffect } from 'react';

export type ValidationState = 'idle' | 'valid' | 'invalid';

interface UseRealtimeValidationOptions {
  /** Debounce delay in milliseconds (default: 500ms) */
  delay?: number;
  /** Minimum characters before validation starts */
  minLength?: number;
}

interface UseRealtimeValidationReturn {
  /** Current validation state */
  state: ValidationState;
  /** Function to validate a value */
  validate: (value: string) => void;
  /** Reset validation state to idle */
  reset: () => void;
}

/**
 * Hook for real-time field validation with debounce.
 * Provides visual feedback while user is typing.
 *
 * @param validator - Function that returns true if value is valid
 * @param options - Configuration options
 * @returns Validation state and control functions
 *
 * @example
 * const emailValidation = useRealtimeValidation(
 * (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
 * { delay: 500, minLength: 1 }
 * );
 *
 * // In component:
 * <Input
 * onChange={(e) => emailValidation.validate(e.target.value)}
 * className={cn(
 * emailValidation.state === 'valid' && 'border-green-500',
 * emailValidation.state === 'invalid' && 'border-red-500'
 * )}
 * />
 */
export function useRealtimeValidation(
  validator: (value: string) => boolean,
  options: UseRealtimeValidationOptions = {},
): UseRealtimeValidationReturn {
  const { delay = 500, minLength = 1 } = options;

  const [state, setState] = useState<ValidationState>('idle');
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const validate = useCallback(
    (value: string) => {
      // Clear any pending validation
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      // Reset to idle if value is too short
      if (value.length < minLength) {
        setState('idle');
        return;
      }

      // Debounce the validation
      timeoutRef.current = setTimeout(() => {
        const isValid = validator(value);
        setState(isValid ? 'valid' : 'invalid');
      }, delay);
    },
    [validator, delay, minLength],
  );

  const reset = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setState('idle');
  }, []);

  return { state, validate, reset };
}
