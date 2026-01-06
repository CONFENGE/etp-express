import { useMemo } from 'react';
import type {
  FieldValues,
  UseFormWatch,
  FieldErrors,
  Path,
} from 'react-hook-form';

export interface FormProgressResult {
  /** Progress percentage (0-100) */
  progress: number;
  /** Number of fields with values */
  filledFields: number;
  /** Total number of tracked fields */
  totalFields: number;
  /** Whether all required fields are filled */
  isComplete: boolean;
  /** Number of fields with errors */
  errorCount: number;
}

export interface UseFormProgressOptions<T extends FieldValues> {
  /** Watch function from react-hook-form */
  watch: UseFormWatch<T>;
  /** Form errors from react-hook-form */
  errors?: FieldErrors<T>;
  /** Field names to track (if not provided, tracks all fields) */
  fieldNames: Path<T>[];
  /** Required field names */
  requiredFields?: Path<T>[];
}

/**
 * Hook to calculate form completion progress.
 *
 * Works with react-hook-form to track filled fields and calculate
 * overall form progress percentage.
 *
 * @example
 * ```tsx
 * const { register, watch, formState: { errors } } = useForm<FormData>();
 *
 * const { progress, filledFields, totalFields } = useFormProgress({
 *   watch,
 *   errors,
 *   fieldNames: ['title', 'description', 'objeto'],
 *   requiredFields: ['title', 'objeto'],
 * });
 *
 * <FormProgressBar progress={progress} filledFields={filledFields} totalFields={totalFields} />
 * ```
 */
export function useFormProgress<T extends FieldValues>({
  watch,
  errors,
  fieldNames,
  requiredFields = [],
}: UseFormProgressOptions<T>): FormProgressResult {
  // Watch all specified fields
  const watchedValues = watch(fieldNames as readonly Path<T>[]);

  return useMemo(() => {
    let filledCount = 0;
    let requiredFilledCount = 0;

    // Count filled fields
    fieldNames.forEach((fieldName, index) => {
      const value = Array.isArray(watchedValues)
        ? watchedValues[index]
        : watchedValues;

      const isFilled = isFieldFilled(value);

      if (isFilled) {
        filledCount++;
        if (requiredFields.includes(fieldName)) {
          requiredFilledCount++;
        }
      }
    });

    const totalFields = fieldNames.length;
    const progress = totalFields > 0 ? (filledCount / totalFields) * 100 : 0;

    // Check if all required fields are filled
    const isComplete =
      requiredFields.length === 0 ||
      requiredFilledCount === requiredFields.length;

    // Count errors
    const errorCount = errors ? Object.keys(errors).length : 0;

    return {
      progress,
      filledFields: filledCount,
      totalFields,
      isComplete,
      errorCount,
    };
  }, [watchedValues, fieldNames, requiredFields, errors]);
}

/**
 * Determines if a field value is considered "filled"
 */
function isFieldFilled(value: unknown): boolean {
  if (value === null || value === undefined) {
    return false;
  }

  if (typeof value === 'string') {
    return value.trim().length > 0;
  }

  if (typeof value === 'number') {
    return !isNaN(value);
  }

  if (typeof value === 'boolean') {
    return true; // Booleans are always "filled"
  }

  if (Array.isArray(value)) {
    return value.length > 0;
  }

  if (typeof value === 'object') {
    return Object.keys(value).length > 0;
  }

  return Boolean(value);
}
